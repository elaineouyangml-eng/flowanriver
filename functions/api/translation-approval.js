
import { TRANSLATION_CONFIG } from "../_lib/translation-config.js";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BLOCK = /^block-\d+$/;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex"
    }
  });
}

async function hashText(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes
  );

  return [...new Uint8Array(digest)]
    .map(n => n.toString(16).padStart(2, "0"))
    .join("");
}

export async function onRequestPost({ request, env }) {
  if (!env.TRANSLATE_TEST_TOKEN) {
    return json({ error: "Access not configured" }, 503);
  }

  const token = request.headers.get("X-Translate-Test-Token");

  if (!token || token !== env.TRANSLATE_TEST_TOKEN) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (!env.TRANSLATIONS || !env.ASSETS) {
    return json({ error: "Required binding unavailable" }, 503);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { article, id, action } = body ?? {};

  if (
    typeof article !== "string" ||
    article.length > 100 ||
    !SLUG.test(article) ||
    typeof id !== "string" ||
    !BLOCK.test(id) ||
    !["approve", "revoke"].includes(action)
  ) {
    return json({ error: "Invalid input" }, 400);
  }

  try {
    const articleUrl = new URL(
      `/posts/${article}/index.json`,
      request.url
    );

    const response = await env.ASSETS.fetch(
      new Request(articleUrl.toString())
    );

    if (!response.ok) {
      return json({ error: "Article unavailable" }, 404);
    }

    const source = await response.json();

    if (
      source.article !== `/posts/${article}/` ||
      !Array.isArray(source.blocks)
    ) {
      return json({ error: "Invalid article source" }, 502);
    }

    const block = source.blocks.find(
      item => item && item.id === id
    );

    if (!block || typeof block.text !== "string") {
      return json({ error: "Block not found" }, 404);
    }

    const originalHash = await hashText(block.text);

    const editKey =
      `translation-edit:${article}:` +
      `${TRANSLATION_CONFIG.targetLanguage}:` +
      `${id}:${originalHash}`;

    const edited = await env.TRANSLATIONS.get(
      editKey,
      "json"
    );

    if (
      !edited ||
      edited.original !== block.text ||
      typeof edited.translated !== "string" ||
      !edited.translated.trim()
    ) {
      return json({
        error: "A saved human-edited draft is required"
      }, 409);
    }

    const translatedHash = await hashText(
      edited.translated
    );

    // Approval is attached to this exact text version.
    const approvalKey =
      `translation-approval:${article}:` +
      `${TRANSLATION_CONFIG.targetLanguage}:` +
      `${id}:${originalHash}`;

    const existing = await env.TRANSLATIONS.get(
      approvalKey,
      "json"
    );

    // Do not allow an old review action to affect changed text.
    if (
      typeof body.original !== "string" ||
      typeof body.translated !== "string" ||
      body.original !== block.text ||
      body.translated !== edited.translated
    ) {
      return json({
        error: "Translation changed. Reload before reviewing."
      }, 409);
    }

    const approved = action === "approve";

    const record = {
      article,
      id,
      originalHash,
      translatedHash,
      approved,
      status: approved ? "approved" : "edited_draft",
      reviewedAt: new Date().toISOString()
    };

    await env.TRANSLATIONS.put(
      approvalKey,
      JSON.stringify(record)
    );

    return json({
      success: true,
      article,
      id,
      approved,
      status: record.status,
      previousApproved: Boolean(
        existing?.approved &&
        existing.translatedHash === translatedHash
      ),
      published: false
    });

  } catch {
    return json({
      error: "Approval operation unavailable"
    }, 502);
  }
}

export function onRequestGet() {
  return json({
    status: "ready",
    mode: "private-translation-approval",
    message: "POST requires authentication."
  });
}
