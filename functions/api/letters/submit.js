
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

export async function onRequestPost({ request, env }) {
  // Do not accept submissions until verification
  // and cleanup protection are ready.
  if (env.LETTERS_SUBMISSIONS_ENABLED !== "true") {
    return reply("Letters submissions are not open yet.", 503);
  }

  if (
    !env.DB ||
    !env.RESEND_API_KEY ||
    !env.LETTERS_ENCRYPTION_KEY ||
    !env.TURNSTILE_SECRET_KEY
  ) {
    return reply("Service is not configured.", 503);
  }

  const origin = request.headers.get("Origin");
  if (origin && origin !== "https://flowanriver.com") {
    return reply("Forbidden.", 403);
  }

  const size = Number(request.headers.get("Content-Length"));
  if (size > 20000) {
    return reply("Request too large.", 413);
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return reply("Invalid request.", 400);
  }

  const email = String(data?.email ?? "").trim().toLowerCase();
  const content = String(data?.content ?? "").trim();
  const date = String(data?.deliveryDate ?? "");
  const language = data?.language === "zh" ? "zh" : "en";
  const turnstileToken = String(data?.turnstileToken ?? "");

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    content.length < 1 ||
    content.length > 10000 ||
    turnstileToken.length < 1 ||
    turnstileToken.length > 2048
  ) {
    return reply("Please check your information.", 400);
  }

  const parsedDate = new Date(`${date}T00:00:00Z`);
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
    return reply("Please choose a valid future date.", 400);
  }

  // Server-side Turnstile verification
  let turnstile;
  try {
    const verification = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET_KEY,
          response: turnstileToken,
          remoteip: request.headers.get("CF-Connecting-IP")
        })
      }
    );
    if (!verification.ok) throw new Error("Turnstile unavailable");
    turnstile = await verification.json();
  } catch {
    return reply("Verification unavailable. Please try again.", 503);
  }

  if (
    !turnstile.success ||
    turnstile.hostname !== "flowanriver.com"
  ) {
    return reply("Security verification failed.", 403);
  }

  // Basic per-email cooldown
  const since = new Date(Date.now() - 15 * 60 * 1000)
    .toISOString();

  try {
    const existing = await env.DB.prepare(
      `SELECT COUNT(*) AS count FROM letters
       WHERE recipient_email = ?
       AND created_at > ?`
    ).bind(email, since).first();

    if (Number(existing?.count || 0) > 0) {
      return reply(
        "A letter was recently submitted for this email.",
        429
      );
    }
  } catch {
    return reply("Unable to check submission limits.", 503);
  }

  const id = crypto.randomUUID();
  const rawToken = Array.from(
    crypto.getRandomValues(new Uint8Array(32)),
    b => b.toString(16).padStart(2, "0")
  ).join("");

  const tokenHash = await hashVerificationToken(rawToken);
  const expires = new Date(
    Date.now() + 24 * 60 * 60 * 1000
  ).toISOString();

  let encrypted;
  try {
    encrypted = await encryptLetter(
      content,
      env.LETTERS_ENCRYPTION_KEY
    );
  } catch {
    return reply("Unable to protect your letter.", 503);
  }

  try {
    await env.DB.prepare(
      `INSERT INTO letters (
        id, recipient_email, letter_content,
        delivery_date, language,
        verification_token_hash,
        verification_expires_at,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?,
        'pending_verification')`
    ).bind(
      id, email, encrypted, date, language,
      tokenHash, expires
    ).run();
  } catch {
    return reply("Unable to save your letter.", 503);
  }

  const verifyUrl = new URL(
    "/api/letters/verify",
    "https://flowanriver.com"
  );
  verifyUrl.searchParams.set("id", id);
  verifyUrl.searchParams.set("token", rawToken);

  const subject = language === "zh"
    ? "Flowanriver｜请确认你的未来来信"
    : "Flowanriver | Confirm Your Future Letter";

  const text = language === "zh"
    ? `你的信已经写好，只差最后一步确认。\n\n请在24小时内打开以下链接，确认你的邮箱：\n${verifyUrl}\n\n如果这不是你本人提交的，请忽略这封邮件。我们不会订阅你或发送营销内容。`
    : `Your letter is almost ready to be sealed.\n\nPlease confirm your email within 24 hours:\n${verifyUrl}\n\nIf you did not request this, simply ignore this email. No subscription or marketing messages will be added.`;

  try {
    const sent = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `letters-confirm-${id}`
        },
        body: JSON.stringify({
          from: "Flowanriver Letters <contact@flowanriver.com>",
          to: [email],
          subject,
          text
        })
      }
    );

    if (!sent.ok) {
      await env.DB.prepare(
        "DELETE FROM letters WHERE id = ? AND status = 'pending_verification'"
      ).bind(id).run();
      return reply("Unable to send confirmation email.", 502);
    }
  } catch {
    // Keep this pending record for reconciliation.
    // Do not claim that the message was delivered.
    return reply("Confirmation email status is uncertain.", 503);
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
