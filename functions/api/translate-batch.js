
import {
  splitMarkdownLinks,
  restoreMarkdownLinks
} from "../_lib/markdown-links.js";

const MODEL = "@cf/meta/m2m100-1.2b";

const DEFAULT_ARTICLE = "pi-network-seven-years-original-vision";
const MAX_BATCH = 2;
const SLUG_PATTERN = /^[a-z0-9]+(?:-+[a-z0-9]+)*$/;

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

function prepareParts(block) {
  if (!block || typeof block.text !== "string") {
    return null;
  }

  if (
    block.type !== "paragraph" &&
    block.type !== "heading"
  ) {
    return null;
  }

  const text = block.text;

  if (
    !text.trim() ||
    text.length > 3000 ||
    text.includes("**") ||
    text.includes("`") ||
    text.includes("![") ||
    text.includes("<")
  ) {
    return null;
  }

  try {
    const parts = splitMarkdownLinks(text);

    // Until other Markdown structures are supported,
    // reject blocks containing unrecognized syntax.
    if (
      block.needsReview &&
      !parts.some(part => part.type === "link")
    ) {
      return null;
    }

    if (
      parts.some(part =>
        part.type === "text" &&
        /!?\[[^\]]*\]|^\s*#{1,6}\s/m.test(part.text)
      )
    ) {
      return null;
    }

    return parts;
  } catch {
    return null;
  }
}



async function translateText(env, text) {
  if (!text.trim()) return text;

  const result = await env.AI.run(MODEL, {
    text,
    source_lang: "en",
    target_lang: "zh"
  });

  if (
    typeof result?.translated_text !== "string" ||
    !result.translated_text.trim()
  ) {
    throw new Error("Invalid translation response");
  }

  return result.translated_text;
}

async function translateParts(env, parts) {
  const translatedParts = [];

  for (const part of parts) {
    if (part.type === "link") {
      const label = await translateText(env, part.label);

      translatedParts.push({
        type: "link",
        label,
        url: part.url
      });
    } else {
      translatedParts.push({
        type: "text",
        text: await translateText(env, part.text)
      });
    }
  }

  const translated = restoreMarkdownLinks(translatedParts);

  // Verify that all original URLs remain unchanged.
  const originalUrls = parts
    .filter(part => part.type === "link")
    .map(part => part.url);

  const translatedUrls = splitMarkdownLinks(translated)
    .filter(part => part.type === "link")
    .map(part => part.url);

  if (
    JSON.stringify(originalUrls) !==
    JSON.stringify(translatedUrls)
  ) {
    throw new Error("Link verification failed");
  }

  return translated;
}

export async function onRequestPost({ request, env }) {
  if (!env.TRANSLATE_TEST_TOKEN) {
    return json({ error: "Test access not configured" }, 503);
  }

  const token = request.headers.get(
    "X-Translate-Test-Token"
  );

  if (!token || token !== env.TRANSLATE_TEST_TOKEN) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (!env.AI || !env.TRANSLATIONS || !env.ASSETS) {
    return json({ error: "Required binding unavailable" }, 503);
  }

  const url = new URL(request.url);
  const rawStart = url.searchParams.get("start") ?? "0";
  
  const article = url.searchParams.get("article") ?? DEFAULT_ARTICLE;

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

    const sourceResponse = await env.ASSETS.fetch(
      new Request(articleUrl.toString())
    );

    if (!sourceResponse.ok) {
      return json({ error: "Article source unavailable" }, 502);
    }

    const articleData = await sourceResponse.json();

    if (
      articleData.article !==
        `/posts/${article}/` ||
      !Array.isArray(articleData.blocks)
    ) {
      return json({ error: "Invalid article source" }, 502);
    }

    const batch = articleData.blocks.slice(
      start,
      start + MAX_BATCH
    );

    const results = [];

    for (const block of batch) {
      const parts = prepareParts(block);

      if (!parts) {
        results.push({
          id: block.id,
          status: "needs_review"
        });
        continue;
      }

      const hash = await hashText(block.text);

      const key =
        `translation:${article}:zh:batch-v1:${block.id}:${hash}`;

      const cached = await env.TRANSLATIONS.get(key, "json");

      if (cached && typeof cached.translated === "string") {
        results.push({
          ...cached,
          status: "cached"
        });
        continue;
      }

      try {
        const translated = await translateParts(env, parts);

        const item = {
          id: block.id,
          type: block.type,
          original: block.text,
          translated,
          machine_translated: true
        };

        await env.TRANSLATIONS.put(
          key,
          JSON.stringify(item)
        );

        results.push({
          ...item,
          status: "translated"
        });
      } catch {
        results.push({
          id: block.id,
          status: "translation_failed"
        });
      }
    }

    return json({
      article,
      start,
      next_start: start + batch.length,
      total: articleData.blocks.length,
      complete: false,
      test: true,
      results
    });
  } catch {
    return json({
      error: "Batch translation unavailable"
    }, 502);
  }
}

export function onRequestGet() {
  return json({
    status: "ready",
    mode: "protected-batch-translation",
    max_batch: MAX_BATCH,
    message: "POST requires authentication."
  });
}
