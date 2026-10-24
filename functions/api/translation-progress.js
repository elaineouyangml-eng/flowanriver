
import { TRANSLATION_CONFIG } from "../_lib/translation-config.js";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    data
  );

  return Array.from(new Uint8Array(digest))
    .map(value => value.toString(16).padStart(2, "0"))
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
    return json({ error: "Bindings unavailable" }, 503);
  }

  const url = new URL(request.url);
  const article = url.searchParams.get("article");

  if (
    !article ||
    article.length > 100 ||
    !SLUG.test(article)
  ) {
    return json({ error: "Invalid article slug" }, 400);
  }

  try {
    const sourceUrl = new URL(
      `/posts/${article}/index.json`,
      request.url
    );

    const response = await env.ASSETS.fetch(
      new Request(sourceUrl.toString())
    );

    if (!response.ok) {
      return json({ error: "Article unavailable" }, 404);
    }

    const source = await response.json();

    if (
      source.article !== `/posts/${article}/` ||
      !Array.isArray(source.blocks)
    ) {
      return json({ error: "Invalid article data" }, 502);
    }

    const counts = {
      total: source.blocks.length,
      approved: 0,
      edited: 0,
      machineTranslated: 0,
      untranslated: 0,
      noTranslationRequired: 0
    };

    const pending = [];

    for (const block of source.blocks) {
      if (
        !block ||
        typeof block.id !== "string" ||
        typeof block.text !== "string"
      ) {
        counts.untranslated++;
        pending.push({
          id: block?.id ?? null,
          reason: "invalid_source"
        });
        continue;
      }

      const originalHash = await hashText(block.text);
      const lang = TRANSLATION_CONFIG.targetLanguage;

      const machineKey =
        `translation:${article}:${lang}:` +
        `batch-${TRANSLATION_CONFIG.cacheVersion}:` +
        `${block.id}:${originalHash}`;

      const editKey =
        `translation-edit:${article}:${lang}:` +
        `${block.id}:${originalHash}`;

      const approvalKey =
        `translation-approval:${article}:${lang}:` +
        `${block.id}:${originalHash}`;

      const [machine, edited, approval] = await Promise.all([
        env.TRANSLATIONS.get(machineKey, "json"),
        env.TRANSLATIONS.get(editKey, "json"),
        env.TRANSLATIONS.get(approvalKey, "json")
      ]);

      const hasMachine = Boolean(
        machine &&
        machine.original === block.text &&
        typeof machine.translated === "string" &&
        machine.translated.trim()
      );

      const hasEdit = Boolean(
        edited &&
        edited.original === block.text &&
        typeof edited.translated === "string" &&
        edited.translated.trim()
      );

      let isApproved = false;

      if (
        hasEdit &&
        approval?.approved === true &&
        approval.originalHash === originalHash
      ) {
        const currentHash = await hashText(
          edited.translated
        );

        isApproved =
          approval.translatedHash === currentHash;
      }

      if (isApproved) {
        counts.approved++;
      } else if (hasEdit) {
        counts.edited++;
      } else if (hasMachine) {
        counts.machineTranslated++;
      } else if (block.translate === false) {
        counts.noTranslationRequired++;
      } else {
        counts.untranslated++;
        pending.push({
          id: block.id,
          reason: "not_translated"
        });
      }
    }

    return json({
      article,
      language: TRANSLATION_CONFIG.targetLanguage,
      counts,
      pending,
      reviewComplete:
        counts.untranslated === 0 &&
        counts.machineTranslated === 0 &&
        counts.edited === 0,
      published: false
    });

  } catch {
    return json({
      error: "Unable to calculate translation progress"
    }, 502);
  }
}

export function onRequestGet() {
  return json({
    status: "ready",
    mode: "protected-translation-progress",
    message: "POST requires authentication."
  });
}
