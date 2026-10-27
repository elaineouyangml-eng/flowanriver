
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(value) {
  return Uint8Array.from(
    atob(value),
    char => char.charCodeAt(0)
  );
}

async function getEncryptionKey(secret) {
  if (!secret) {
    throw new Error("Encryption key not configured");
  }

  const raw = fromBase64(secret);

  if (raw.length !== 32) {
    throw new Error("Invalid encryption key length");
  }

  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptLetter(content, secret) {
  const key = await getEncryptionKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(content)
  );

  return JSON.stringify({
    version: 1,
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(encrypted))
  });
}

export async function decryptLetter(payload, secret) {
  const parsed = JSON.parse(payload);

  if (
    parsed.version !== 1 ||
    typeof parsed.iv !== "string" ||
    typeof parsed.data !== "string"
  ) {
    throw new Error("Unsupported encrypted letter");
  }

  const iv = fromBase64(parsed.iv);

  if (iv.length !== 12) {
    throw new Error("Invalid IV");
  }

  const key = await getEncryptionKey(secret);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    fromBase64(parsed.data)
  );

  return decoder.decode(decrypted);
}

export async function hashVerificationToken(token) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(token)
  );

  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}
