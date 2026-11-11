
const COOKIE_NAME = "corner_session";
const SESSION_DAYS = 7;

async function hashToken(token) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes
  );

  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function readSessionCookie(request) {
  const cookie = request.headers.get("Cookie") || "";

  for (const part of cookie.split(";")) {
    const [name, ...value] = part.trim().split("=");

    if (name === COOKIE_NAME) {
      const token = value.join("=");

      if (/^[a-f0-9]{64}$/.test(token)) {
        return token;
      }
    }
  }

  return null;
}

export async function createCornerSession(env, userId) {
  if (!env.CORNER_DB || !userId) {
    throw new Error("Corner session unavailable");
  }

  const token = Array.from(
    crypto.getRandomValues(new Uint8Array(32)),
    b => b.toString(16).padStart(2, "0")
  ).join("");

  const tokenHash = await hashToken(token);
  const id = crypto.randomUUID();

  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 86400000
  ).toISOString();

  await env.CORNER_DB.prepare(`
    INSERT INTO corner_sessions
      (id, user_id, token_hash, expires_at)
    VALUES (?, ?, ?, ?)
  `).bind(
    id,
    userId,
    tokenHash,
    expiresAt
  ).run();

  return {
    cookie:
      `${COOKIE_NAME}=${token}; ` +
      `Path=/api/corner; ` +
      `HttpOnly; Secure; SameSite=Strict; ` +
      `Max-Age=${SESSION_DAYS * 86400}`,
    expiresAt
  };
}

export async function getCornerUser(request, env) {
  if (!env.CORNER_DB) return null;

  const token = readSessionCookie(request);
  if (!token) return null;

  const tokenHash = await hashToken(token);

  const session = await env.CORNER_DB.prepare(`
    SELECT s.user_id
    FROM corner_sessions s
    JOIN corner_users u ON u.id = s.user_id
    WHERE s.token_hash = ?
      AND s.expires_at > ?
      AND u.status = 'active'
    LIMIT 1
  `).bind(
    tokenHash,
    new Date().toISOString()
  ).first();

  return session?.user_id || null;
}

export async function revokeCornerSession(request, env) {
  const token = readSessionCookie(request);

  if (token && env.CORNER_DB) {
    const tokenHash = await hashToken(token);

    await env.CORNER_DB.prepare(`
      DELETE FROM corner_sessions
      WHERE token_hash = ?
    `).bind(tokenHash).run();
  }

  return (
    `${COOKIE_NAME}=; Path=/api/corner; ` +
    `HttpOnly; Secure; SameSite=Strict; ` +
    `Max-Age=0`
  );
}
