
import {
  encryptLetter,
  hashVerificationToken
} from "../../_lib/letters-crypto.js";

const FROM_EMAIL =
  "Flowanriver Letters <contact@flowanriver.com>";

const encoder = new TextEncoder();

const reply = (message, status = 200) =>
  new Response(JSON.stringify({ message }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });

// Six-language support.
// Reject unsupported language codes rather than
// silently assigning another language.
function normalizeLanguage(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");

  if (raw === "en" || raw.startsWith("en-")) return "en";
  if (raw === "zh" || raw.startsWith("zh-")) return "zh";
  if (raw === "ko" || raw.startsWith("ko-")) return "ko";
  if (raw === "vi" || raw.startsWith("vi-")) return "vi";
  if (raw === "ja" || raw.startsWith("ja-")) return "ja";

  if (
    raw === "fil" ||
    raw.startsWith("fil-") ||
    raw === "tl" ||
    raw.startsWith("tl-")
  ) {
    return "fil";
  }

  return null;
}

const confirmationTemplates = {
  en: {
    subject: "Flowanriver | Confirm Your Future Letter",
    intro: "Your letter is almost ready to be sealed.",
    action: "Please confirm your email within 24 hours:",
    ignore: "If you did not request this, simply ignore this email.",
    privacy:
      "Your email is used only for verification and future letter delivery.\nThere is no automatic subscription or marketing.",
    success:
      "Confirmation email submitted. Please check your inbox."
  },

  zh: {
    subject: "Flowanriver｜请确认你的未来来信",
    intro: "你的信已经写好，只差最后一步确认。",
    action: "请在24小时内打开以下链接，确认你的邮箱：",
    ignore: "如果这不是你本人提交的，请忽略这封邮件。",
    privacy:
      "你的邮箱只用于验证和未来寄信。\n我们不会自动订阅你，也不会发送营销邮件。",
    success: "确认邮件已提交发送，请检查邮箱。"
  },

  ko: {
    subject: "Flowanriver | 미래의 편지를 확인해 주세요",
    intro: "미래의 자신에게 보내는 편지가 거의 준비되었습니다.",
    action: "24시간 이내에 아래 링크를 열어 이메일 주소를 확인해 주세요:",
    ignore:
      "직접 신청하지 않으셨다면 이 이메일을 무시하셔도 됩니다.",
    privacy:
      "이메일 주소는 본인 확인과 예약된 편지 발송에만 사용됩니다.\n자동 구독이나 광고성 이메일은 발송하지 않습니다.",
    success: "확인 이메일을 발송 요청했습니다. 받은편지함을 확인해 주세요."
  },

  vi: {
    subject: "Flowanriver | Xác nhận lá thư gửi đến tương lai",
    intro: "Lá thư gửi đến tương lai của bạn gần như đã sẵn sàng.",
    action:
      "Vui lòng mở liên kết dưới đây trong vòng 24 giờ để xác nhận địa chỉ email:",
    ignore:
      "Nếu bạn không gửi yêu cầu này, bạn có thể bỏ qua email.",
    privacy:
      "Email của bạn chỉ được dùng để xác nhận và gửi lá thư đã hẹn.\nChúng tôi không tự động đăng ký hay gửi email quảng cáo.",
    success:
      "Đã gửi yêu cầu email xác nhận. Vui lòng kiểm tra hộp thư."
  },

  fil: {
    subject: "Flowanriver | Kumpirmahin ang Iyong Liham",
    intro:
      "Halos handa nang maipadala sa hinaharap ang iyong liham.",
    action:
      "Buksan ang link sa ibaba sa loob ng 24 oras upang kumpirmahin ang iyong email:",
    ignore:
      "Kung hindi ikaw ang nagsumite nito, maaari mong balewalain ang email na ito.",
    privacy:
      "Gagamitin lamang ang iyong email para sa kumpirmasyon at paghahatid ng nakaiskedyul na liham.\nWalang awtomatikong subscription o marketing email.",
    success:
      "Naisumite na ang confirmation email. Pakitingnan ang iyong inbox."
  },

  ja: {
    subject: "Flowanriver | 未来への手紙をご確認ください",
    intro: "未来の自分への手紙は、あと一歩で準備完了です。",
    action:
      "24時間以内に以下のリンクを開き、メールアドレスを確認してください。",
    ignore:
      "この手紙に心当たりがない場合は、メールを無視してください。",
    privacy:
      "メールアドレスは本人確認と予約した手紙の配信にのみ使用します。\n自動的な購読登録や広告メールの送信は行いません。",
    success:
      "確認メールの送信を受け付けました。受信トレイをご確認ください。"
  }
};

function confirmationEmail(language, url) {
  const template = confirmationTemplates[language];

  return {
    subject: template.subject,
    text: `${template.intro}

${template.action}

${url}

${template.ignore}

${template.privacy}

Flowanriver
https://flowanriver.com/letters/`
  };
}

// IP rate limiting:
// Five requests per IP per fixed hour.
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

export async function onRequestPost({ request, env }) {
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

  // Parse input.
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

  // Restrict administrative testing to the configured email.
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

  // Preserve the selected language in D1.
  const language = normalizeLanguage(
    data?.language
  );

  const turnstileToken = String(
    data?.turnstileToken ?? ""
  );

  if (!language) {
    return reply("Unsupported language.", 400);
  }

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
  maxDate.setUTCFullYear(
    maxDate.getUTCFullYear() + 10
  );

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

  // Verify Cloudflare Turnstile.
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

  // IP rate limit.
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

  // Email cooldown: 15 minutes.
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

  // Generate verification token.
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

  // Encrypt letter with the configured AES key.
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

  // Save pending letter to D1.
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

  // Build confirmation URL.
  const verifyUrl = new URL(
    "/api/letters/verify",
    "https://flowanriver.com"
  );

  verifyUrl.searchParams.set("id", id);
  verifyUrl.searchParams.set("token", rawToken);

  const confirmation = confirmationEmail(
    language,
    verifyUrl.toString()
  );

  // Send confirmation through Resend.
  try {
    const sent = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key":
            `letters-confirm-${id}`
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [email],
          subject: confirmation.subject,
          text: confirmation.text
        })
      }
    );

    if (!sent.ok) {
      // Pending record remains for safe cleanup.
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
    confirmationTemplates[language].success
  );
}

export function onRequestGet() {
  return reply("Method not allowed.", 405);
}
