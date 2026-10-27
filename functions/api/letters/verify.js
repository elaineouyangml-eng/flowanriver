
import {
  hashVerificationToken
} from "../../_lib/letters-crypto.js";

const headers = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy":
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
};

const messages = {
  en: {
    confirmTitle: "A Letter to Your Future Self",
    confirmDescription:
      "Your letter is ready. Please confirm your email, and it will find its way back to you on the day you chose.",
    confirmButton: "Confirm & Seal My Letter",
    successTitle: "Your Letter Is Sealed",
    successDescription:
      "Your email has been confirmed. Your letter is safely sealed, looking forward to the day you meet again.",
    expiredTitle: "Link Expired or Already Used",
    expiredDescription:
      "This confirmation link is no longer available. If you haven't confirmed your letter, please return to Flowanriver.",
    invalidTitle: "Invalid Link",
    invalidDescription:
      "This confirmation link is not valid.",
    unavailableTitle: "Temporarily Unavailable",
    unavailableDescription: "Please try again later.",
    requestTitle: "Invalid Request",
    requestDescription:
      "The confirmation could not be processed.",
    errorTitle: "Something Went Wrong",
    errorDescription:
      "We couldn't confirm your letter. Please try again.",
    back: "Letters to the Future"
  },

  zh: {
    confirmTitle: "一封写给未来自己的信",
    confirmDescription:
      "你的信已经准备好了。请确认邮箱，它会如期而至，与你相逢。",
    confirmButton: "确认并封存",
    successTitle: "你的信，已封存",
    successDescription:
      "邮箱确认成功。你的信已经妥善封存，期盼与你相逢的那一天。",
    expiredTitle: "确认链接已失效或已使用",
    expiredDescription:
      "此确认链接已无法使用。如果你还没有确认信件，请返回 Flowanriver 重新提交。",
    invalidTitle: "无效的确认链接",
    invalidDescription: "这条邮箱确认链接无效。",
    unavailableTitle: "暂时无法使用",
    unavailableDescription: "请稍后再试。",
    requestTitle: "请求无效",
    requestDescription: "暂时无法处理这次确认请求。",
    errorTitle: "出现了一点问题",
    errorDescription: "目前无法确认这封信，请稍后重试。",
    back: "写给未来的自己"
  }
};

function normalizeLanguage(language) {
  return language === "zh" ? "zh" : "en";
}

function page(language, type, fields = "") {
  const lang = normalizeLanguage(language);
  const t = messages[lang];
  const title = t[type + "Title"];
  const description = t[type + "Description"];
  const button = type === "confirm"
    ? t.confirmButton
    : "";

  return `<!DOCTYPE html>
<html lang="${lang === "zh" ? "zh-CN" : "en"}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} | Flowanriver</title>
<style>
* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  background: #f5f1e9;
  color: #435c4d;
  font-family: Georgia, "Noto Serif SC", serif;
  display: grid;
  place-items: center;
  padding: 24px;
}
.card {
  width: 100%;
  max-width: 560px;
  background: #fffdfa;
  border: 1px solid #dce4d8;
  border-radius: 24px;
  padding: 48px 32px;
  text-align: center;
}
h1 {
  font-size: 30px;
  line-height: 1.45;
  font-weight: 500;
}
p {
  font-size: 17px;
  line-height: 1.85;
}
button {
  background: #617969;
  color: white;
  padding: 14px 32px;
  border: 0;
  border-radius: 30px;
  font-size: 16px;
  cursor: pointer;
}
button:hover { background: #4d6552; }
a { color: #435c4d; }
@media (max-width: 600px) {
  .card { padding: 36px 22px; }
  h1 { font-size: 25px; }
  p { font-size: 15px; }
}
</style>
</head>
<body>
<main class="card">
<p>✉ FLOWANRIVER</p>
<h1>${title}</h1>
<p>${description}</p>
${button ? `<form action="/api/letters/verify" method="POST">
${fields}
<button type="submit">${button}</button>
</form>` : ""}
<p><a href="/letters/">${t.back}</a></p>
</main>
</body>
</html>`;
}

function html(content, status = 200) {
  return new Response(content, { status, headers });
}

function validParams(id, token) {
  return (
    /^[0-9a-f-]{36}$/i.test(id || "") &&
    /^[0-9a-f]{64}$/i.test(token || "")
  );
}

async function getLetter(env, id) {
  if (!env.DB) {
    throw new Error("Database unavailable");
  }

  return env.DB.prepare(`
    SELECT
      language,
      status,
      verification_token_hash,
      verification_expires_at
    FROM letters
    WHERE id = ?
  `).bind(id).first();
}

// Opening the link does not confirm the letter.
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const token = url.searchParams.get("token");

  if (!validParams(id, token)) {
    return html(page("en", "invalid"), 400);
  }

  try {
    const letter = await getLetter(env, id);

    if (!letter) {
      return html(page("en", "invalid"), 400);
    }

    const language = normalizeLanguage(letter.language);
    const tokenHash = await hashVerificationToken(token);
    const expires = Date.parse(
      letter.verification_expires_at || ""
    );

    if (
      letter.status !== "pending_verification" ||
      letter.verification_token_hash !== tokenHash ||
      !Number.isFinite(expires) ||
      expires <= Date.now()
    ) {
      return html(page(language, "expired"), 400);
    }

    const fields = `
<input type="hidden" name="id" value="${id}">
<input type="hidden" name="token" value="${token}">`;

    return html(page(language, "confirm", fields));
  } catch {
    return html(page("en", "unavailable"), 503);
  }
}

// Only explicit confirmation schedules the letter.
export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    return html(page("en", "unavailable"), 503);
  }

  const length = Number(
    request.headers.get("Content-Length") || 0
  );

  if (!Number.isFinite(length) || length > 4096) {
    return html(page("en", "request"), 413);
  }

  let id, token;

  try {
    const data = await request.formData();
    id = data.get("id");
    token = data.get("token");
  } catch {
    return html(page("en", "request"), 400);
  }

  if (
    typeof id !== "string" ||
    typeof token !== "string" ||
    !validParams(id, token)
  ) {
    return html(page("en", "invalid"), 400);
  }

  try {
    const letter = await getLetter(env, id);

    if (!letter) {
      return html(page("en", "invalid"), 400);
    }

    const language = normalizeLanguage(letter.language);
    const tokenHash = await hashVerificationToken(token);
    const now = new Date().toISOString();

    const result = await env.DB.prepare(`
      UPDATE letters
      SET status = 'scheduled',
          verified_at = ?,
          verification_token_hash = NULL,
          verification_expires_at = NULL
      WHERE id = ?
        AND verification_token_hash = ?
        AND status = 'pending_verification'
        AND verification_expires_at > ?
    `).bind(now, id, tokenHash, now).run();

    if (result.meta?.changes !== 1) {
      return html(page(language, "expired"), 400);
    }

    return html(page(language, "success"));
  } catch {
    return html(page("en", "error"), 503);
  }
}
