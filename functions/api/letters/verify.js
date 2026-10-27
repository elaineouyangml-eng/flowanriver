
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

function page(title, description, button = "", fields = "") {
  return `<!DOCTYPE html>
<html lang="en">
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
  font-family: Georgia, serif;
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
h1 { font-size: 30px; line-height: 1.3; }
p { font-size: 17px; line-height: 1.8; }
button {
  background: #617969;
  color: white;
  padding: 14px 32px;
  border: 0;
  border-radius: 30px;
  font-size: 16px;
  cursor: pointer;
}
a { color: #435c4d; }
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
<p><a href="/letters/">Letters to the Future</a></p>
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

// Visiting the link does not consume the token.
export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const token = url.searchParams.get("token");

  if (!validParams(id, token)) {
    return html(page(
      "Invalid link",
      "This confirmation link is not valid."
    ), 400);
  }

  // Values are restricted to safe ASCII before insertion.
  const fields = `
<input type="hidden" name="id" value="${id}">
<input type="hidden" name="token" value="${token}">`;

  return html(page(
    "A letter to your future self",
    "Your letter is almost ready. Confirm your email to seal it until the day you chose.",
    "Confirm My Letter",
    fields
  ));
}

// Only the explicit confirmation consumes the token.
export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    return html(page(
      "Temporarily unavailable",
      "Please try again later."
    ), 503);
  }

  const length = Number(
    request.headers.get("Content-Length") || 0
  );

  if (length > 4096) {
    return html(page(
      "Invalid request",
      "The request could not be processed."
    ), 413);
  }

  let id, token;

  try {
    const data = await request.formData();
    id = data.get("id");
    token = data.get("token");
  } catch {
    return html(page(
      "Invalid request",
      "The confirmation could not be processed."
    ), 400);
  }

  if (
    typeof id !== "string" ||
    typeof token !== "string" ||
    !validParams(id, token)
  ) {
    return html(page(
      "Invalid link",
      "This confirmation link is not valid."
    ), 400);
  }

  const hash = await hashVerificationToken(token);
  const now = new Date().toISOString();

  try {
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
    `).bind(now, id, hash, now).run();

    if (result.meta?.changes !== 1) {
      return html(page(
        "Link expired or already used",
        "This link is no longer available. If you have not confirmed your letter, please return to Flowanriver."
      ), 400);
    }

    return html(page(
      "Your letter is sealed",
      "Your email has been confirmed. Your letter is safely scheduled for its chosen date."
    ));
  } catch {
    return html(page(
      "Something went wrong",
      "We couldn't confirm your letter. Please try again."
    ), 503);
  }
}
