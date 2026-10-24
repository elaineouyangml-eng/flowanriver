
import { validateTranslation } from "../_lib/translation-validator.js";

const DEFAULT_ARTICLE = "pi-network-seven-years-original-vision";
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REVIEW_BATCH = 10;

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
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return [...new Uint8Array(digest)]
    .map(n => n.toString(16).padStart(2, "0"))
    .join("");
}

export async function onRequestPost({ request, env }) {
  if (!env.TRANSLATE_TEST_TOKEN) {
    return json({ error: "Review access not configured" }, 503);
  }

  const token = request.headers.get("X-Translate-Test-Token");

  if (!token || token !== env.TRANSLATE_TEST_TOKEN) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (!env.TRANSLATIONS || !env.ASSETS) {
    return json({ error: "Required binding unavailable" }, 503);
  }

  const url = new URL(request.url);
  const article =
    url.searchParams.get("article") ?? DEFAULT_ARTICLE;
  const rawStart = url.searchParams.get("start") ?? "0";

  if (article.length > 100 || !SLUG_PATTERN.test(article)) {
    return json({ error: "Invalid article slug" }, 400);
  }

  if (!/^(0|[1-9]\d{0,3})$/.test(rawStart)) {
    return json({ error: "Invalid start index" }, 400);
  }

  const start = Number(rawStart);

  try {
    const articleUrl = new URL(
      `/posts/${article}/index.json`,
      request.url
    );

    const response = await env.ASSETS.fetch(
      new Request(articleUrl.toString())
    );

    if (!response.ok) {
      return json({ error: "Article source unavailable" }, 404);
    }

    const data = await response.json();

    if (
      data.article !== `/posts/${article}/` ||
      !Array.isArray(data.blocks)
    ) {
      return json({ error: "Invalid article source" }, 502);
    }

    const blocks = data.blocks.slice(
      start,
      start + REVIEW_BATCH
    );

    const results = [];

    for (const block of blocks) {
      if (
        !block ||
        typeof block.id !== "string" ||
        typeof block.text !== "string"
      ) {
        results.push({
          status: "invalid_source",
          needsReview: true
        });
        continue;
      }

      const hash = await hashText(block.text);

      const key =
        `translation:${article}:${TRANSLATION_CONFIG.targetLanguage}:batch-${TRANSLATION_CONFIG.cacheVersion}:${block.id}:${hash}`;

      const cached = await env.TRANSLATIONS.get(key, "json");

      const translated =
        cached &&
        cached.original === block.text &&
        typeof cached.translated === "string" &&
        cached.translated.trim()
          ? cached.translated
          : null;

      
      const validation = validateTranslation(
        block.text,
        translated
      );

      results.push({
        id: block.id,
        type: block.type,
        original: block.text,
        translated,
        status: translated ? "ready_for_review" : "not_translated",
        needsReview:
          Boolean(block.needsReview) ||
          validation.needsReview,
        translate: block.translate === true,
        validation: {
          valid: validation.valid,
          warnings: validation.warnings
        }
      });

    }

    return json({
      article,
      language: TRANSLATION_CONFIG.targetLanguage,
      start,
      next_start: start + blocks.length,
      total: data.blocks.length,
      complete: start + blocks.length >= data.blocks.length,
      approved: false,
      published: false,
      results
    });
  } catch {
    return json({ error: "Review service unavailable" }, 502);
  }
}

export function onRequestGet() {
  return json({
    status: "ready",
    mode: "private-translation-review",
    message: "POST requires authentication."
  });
}
