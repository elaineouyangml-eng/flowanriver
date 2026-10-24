
import { TRANSLATION_CONFIG } from "../_lib/translation-config.js";
import { validateTranslation } from "../_lib/translation-validator.js";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BLOCK_PATTERN = /^block-\d+$/;

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

  const token = request.headers.get(
    "X-Translate-Test-Token"
  );

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

  const { article, id, original, translated } = body ?? {};

  if (
    typeof article !== "string" ||
    article.length > 100 ||
    !SLUG_PATTERN.test(article) ||
    typeof id !== "string" ||
    !BLOCK_PATTERN.test(id) ||
    typeof original !== "string" ||
    typeof translated !== "string" ||
    !translated.trim() ||
    translated.length > 10000
  ) {
    return json({ error: "Invalid input" }, 400);
  }

  try {
    // Read the current English article from the site.
    const articleUrl = new URL(
      `/posts/${article}/index.json`,
      request.url
    );

    const response = await env.ASSETS.fetch(
      new Request(articleUrl.toString())
    );

    if (!response.ok) {
      return json({ error: "Article not found" }, 404);
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

    if (!block) {
      return json({ error: "Block not found" }, 404);
    }

    // Prevent saving edits against outdated English text.
    if (block.text !== original) {
      return json({
        error: "English source changed. Reload before editing."
      }, 409);
    }

    const validation = validateTranslation(
      original,
      translated
    );

    // Save human edits separately from machine translations.
    const hash = await hashText(original);

    const key =
      `translation-edit:${article}:` +
      `${TRANSLATION_CONFIG.targetLanguage}:` +
      `${id}:${hash}`;

    const record = {
      article,
      id,
      original,
      translated: translated.trim(),
      status: "edited_draft",
      approved: false,
      updatedAt: new Date().toISOString()
    };

    await env.TRANSLATIONS.put(
      key,
      JSON.stringify(record)
    );

    return json({
      saved: true,
      article,
      id,
      status: "edited_draft",
      approved: false,
      validation: {
        valid: validation.valid,
        warnings: validation.warnings
      }
    });

  } catch {
    return json({
      error: "Unable to save translation draft"
    }, 502);
  }
}

export function onRequestGet() {
  return json({
    status: "ready",
    mode: "private-translation-draft-save",
    message: "POST requires authentication."
  });
}
