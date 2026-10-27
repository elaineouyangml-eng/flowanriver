
import {
  encryptLetter,
  hashVerificationToken
} from "../../_lib/letters-crypto.js";

const reply = (message, status = 200) =>
  new Response(JSON.stringify({ message }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });

const encoder = new TextEncoder();

// -------------------------------------
// IP rate limiting
// 5 requests per IP per fixed hour
// -------------------------------------

async function checkIpRateLimit(request, env) {
  const ip = request.headers.get("CF-Connecting-IP");

  if (!ip || !env.LETTERS_RATE_LIMIT_KEY) {
    throw new Error("Rate limiting unavailable");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(env.LETTERS_RATE_LIMIT_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(ip)
  );

  const identifier = Array.from(
    new Uint8Array(signature),
    byte => byte.toString(16).padStart(2, "0")
  ).join("");

  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / 3600) * 3600;

  const result = await env.DB.prepare(`
    INSERT INTO letter_rate_limits (
      identifier,
      window_start,
      request_count,
      expires_at
    )
    VALUES (?, ?, 1, ?)
    ON CONFLICT(identifier, window_start)
    DO UPDATE SET
      request_count = request_count + 1
    WHERE request_count < 5
    RETURNING request_count
  `).bind(
    identifier,
    windowStart,
    windowStart + 7200
  ).first();

  return result !== null;
}

// -------------------------------------
// Letter submission
// -------------------------------------

export async function onRequestPost({ request, env }) {

  // Feature must remain disabled until
  // delivery and cleanup are ready.
  const submissionsOpen =
  env.LETTERS_SUBMISSIONS_ENABLED === "true";

const adminTestAllowed =
  env.LETTERS_TEST_MODE === "true" &&
  Boolean(env.LETTERS_ADMIN_TOKEN) &&
  request.headers.get("X-Letters-Admin-Token") ===
    env.LETTERS_ADMIN_TOKEN;

if (!submissionsOpen && !adminTestAllowed) {
  return reply(
    "Letters submissions are not open yet.",
    503
  );
}

  if (
    !env.DB ||
    !env.RESEND_API_KEY ||
    !env.LETTERS_ENCRYPTION_KEY ||
    !env.TURNSTILE_SECRET_KEY ||
    !env.LETTERS_RATE_LIMIT_KEY
  ) {
    return reply("Service is not configured.", 503);
  }

  const origin = request.headers.get("Origin");

  if (origin !== "https://flowanriver.com") {
    return reply("Forbidden.", 403);
  }

  const contentLength = Number(
    request.headers.get("Content-Length") || 0
  );

  if (
    !Number.isFinite(contentLength) ||
    contentLength > 20000
  ) {
    return reply("Request too large.", 413);
  }

  // Parse and validate input.
  let data;

  try {
    const rawBody = await request.text();

    if (encoder.encode(rawBody).byteLength > 20000) {
      return reply("Request too large.", 413);
    }

    data = JSON.parse(rawBody);
  } catch {
    return reply("Invalid request.", 400);
  }

  const email = String(
    data?.email ?? ""
  ).trim().toLowerCase();


  // Only allow the configured email during admin testing.
  if (!submissionsOpen) {
    const testEmail = String(
      env.LETTERS_TEST_EMAIL ?? ""
    ).trim().toLowerCase();

    if (!testEmail || email !== testEmail) {
      return reply(
        "Test submissions are restricted to the configured test email.",
        403
      );
    }
  }

  
  const content = String(
    data?.content ?? ""
  ).trim();

  const date = String(
    data?.deliveryDate ?? ""
  );

  const language = data?.language === "zh"
    ? "zh"
    : "en";

  const turnstileToken = String(
    data?.turnstileToken ?? ""
  );

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    content.length < 1 ||
    content.length > 10000 ||
    turnstileToken.length < 1 ||
    turnstileToken.length > 2048
  ) {
    return reply(
      "Please check your information.",
      400
    );
  }

  // Validate delivery date in UTC.
  const parsedDate = new Date(
    `${date}T00:00:00Z`
  );

  const today = new Date();

  const tomorrow = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate() + 1
  );

  const maxDate = new Date(tomorrow);
  maxDate.setUTCFullYear(maxDate.getUTCFullYear() + 10);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== date ||
    parsedDate.getTime() < tomorrow ||
    parsedDate.getTime() > maxDate.getTime()
  ) {
    return reply(
      "Please choose a valid future date.",
      400
    );
  }

  // -------------------------------------
  // Verify Cloudflare Turnstile
  // -------------------------------------

  let turnstile;

  try {
    const verification = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET_KEY,
          response: turnstileToken,
          remoteip: request.headers.get(
            "CF-Connecting-IP"
          )
        })
      }
    );

    if (!verification.ok) {
      throw new Error("Turnstile unavailable");
    }

    turnstile = await verification.json();

  } catch {
    return reply(
      "Verification unavailable. Please try again.",
      503
    );
  }

  if (
    !turnstile.success ||
    turnstile.hostname !== "flowanriver.com"
  ) {
    return reply(
      "Security verification failed.",
      403
    );
  }

  // -------------------------------------
  // IP rate limit
  // -------------------------------------

  try {
    const allowed = await checkIpRateLimit(
      request,
      env
    );

    if (!allowed) {
      return reply(
        "Too many requests. Please try again later.",
        429
      );
    }
  } catch {
    return reply(
      "Unable to process this request right now.",
      503
    );
  }

  // -------------------------------------
  // Email cooldown: 15 minutes
  // -------------------------------------

  const since = new Date(
    Date.now() - 15 * 60 * 1000
  ).toISOString();

  try {
    const existing = await env.DB.prepare(`
      SELECT COUNT(*) AS count
      FROM letters
      WHERE recipient_email = ?
        AND julianday(created_at) > julianday(?)
    `).bind(email, since).first();

    if (Number(existing?.count || 0) > 0) {
      return reply(
        "A letter was recently submitted for this email.",
        429
      );
    }
  } catch {
    return reply(
      "Unable to check submission limits.",
      503
    );
  }

  // -------------------------------------
  // Generate verification token
  // -------------------------------------

  const id = crypto.randomUUID();

  const rawToken = Array.from(
    crypto.getRandomValues(new Uint8Array(32)),
    byte => byte.toString(16).padStart(2, "0")
  ).join("");

  const tokenHash = await hashVerificationToken(
    rawToken
  );

  const expires = new Date(
    Date.now() + 24 * 60 * 60 * 1000
  ).toISOString();

  // -------------------------------------
  // Encrypt private letter
  // -------------------------------------

  let encrypted;

  try {
    encrypted = await encryptLetter(
      content,
      env.LETTERS_ENCRYPTION_KEY
    );
  } catch {
    return reply(
      "Unable to protect your letter.",
      503
    );
  }

  // -------------------------------------
  // Save pending letter to D1
  // -------------------------------------

  try {
    await env.DB.prepare(`
      INSERT INTO letters (
        id,
        recipient_email,
        letter_content,
        delivery_date,
        language,
        verification_token_hash,
        verification_expires_at,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?,
        'pending_verification')
    `).bind(
      id,
      email,
      encrypted,
      date,
      language,
      tokenHash,
      expires
    ).run();

  } catch {
    return reply(
      "Unable to save your letter.",
      503
    );
  }

  // -------------------------------------
  // Build email confirmation link
  // -------------------------------------

  const verifyUrl = new URL(
    "/api/letters/verify",
    "https://flowanriver.com"
  );

  verifyUrl.searchParams.set("id", id);
  verifyUrl.searchParams.set("token", rawToken);

  const subject = language === "zh"
    ? "Flowanriver｜请确认你的未来来信"
    : "Flowanriver | Confirm Your Future Letter";

  const emailText = language === "zh"
    ? `你的信已经写好，只差最后一步确认。

请在24小时内打开以下链接，确认你的邮箱：

${verifyUrl.toString()}

如果这不是你本人提交的，请忽略这封邮件。

你的邮箱只用于验证和未来寄信。
我们不会自动订阅你，也不会发送营销邮件。

Flowanriver`
    : `Your letter is almost ready to be sealed.

Please confirm your email within 24 hours:

${verifyUrl.toString()}

If you did not request this, simply ignore this email.

Your email is used only for verification and future letter delivery.
There is no automatic subscription or marketing.

Flowanriver`;

  // -------------------------------------
  // Send confirmation with Resend
  // -------------------------------------

  try {
    const sent = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          "Authorization":
            `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key":
            `letters-confirm-${id}`
        },
        body: JSON.stringify({
          from:
            "Flowanriver Letters <contact@flowanriver.com>",
          to: [email],
          subject,
          text: emailText
        })
      }
    );

    if (!sent.ok) {
      // Keep the pending record for safe cleanup.
      // Do not claim the email was sent.
      return reply(
        "Unable to send confirmation email.",
        502
      );
    }

  } catch {
    return reply(
      "Confirmation email status is uncertain.",
      503
    );
  }

  return reply(
    language === "zh"
      ? "确认邮件已提交发送，请检查邮箱。"
      : "Confirmation email submitted. Please check your inbox."
  );
}

export function onRequestGet() {
  return reply("Method not allowed.", 405);
}
