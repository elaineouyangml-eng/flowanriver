
const MODEL = "@cf/meta/m2m100-1.2b";

// First-stage test: Pi Network article only.
const ARTICLE = {
  slug: "pi-network-seven-years-original-vision",
  version: "v1",
  blocks: [
    {
      id: "title",
      text: "Pi Network: Seven Years Later, Is Its Original Vision Taking Shape?"
    },
    {
      id: "intro-1",
      text: "In 2019, when Pi Network first launched, it took a different approach from many cryptocurrency projects. Users did not need expensive mining equipment or extensive knowledge of blockchain technology. By participating through a mobile application, they could begin earning PI."
    },
    {
      id: "intro-2",
      text: "This accessible model helped Pi Network build a large global community, but it also made the project one of the more controversial experiments in the cryptocurrency industry."
    }
  ]
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.TRANSLATE_TEST_TOKEN) {
    return json({ error: "Test access not configured" }, 503);
  }

  const token = request.headers.get("X-Translate-Test-Token");

  if (!token || token !== env.TRANSLATE_TEST_TOKEN) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (!env.AI || !env.TRANSLATIONS) {
    return json({ error: "AI or KV binding unavailable" }, 503);
  }

  const cacheKey =
    `translation:${ARTICLE.slug}:zh:${ARTICLE.version}`;

  try {
    const cached = await env.TRANSLATIONS.get(cacheKey, "json");

    if (cached && Array.isArray(cached.blocks)) {
      return json({
        ...cached,
        cached: true
      });
    }

    const translatedBlocks = [];

    for (const block of ARTICLE.blocks) {
      const result = await env.AI.run(MODEL, {
        text: block.text,
        source_lang: "en",
        target_lang: "zh"
      });

      if (
        !result ||
        typeof result.translated_text !== "string" ||
        !result.translated_text.trim()
      ) {
        return json({ error: "Invalid translation response" }, 502);
      }

      translatedBlocks.push({
        id: block.id,
        original: block.text,
        translated: result.translated_text
      });
    }

    const payload = {
      article: ARTICLE.slug,
      version: ARTICLE.version,
      source_lang: "en",
      target_lang: "zh",
      blocks: translatedBlocks,
      machine_translated: true,
      test: true
    };

    await env.TRANSLATIONS.put(
      cacheKey,
      JSON.stringify(payload)
    );

    return json({
      ...payload,
      cached: false
    });
  } catch (error) {
    return json({
      error: "Translation or KV service unavailable"
    }, 502);
  }
}

export function onRequestGet() {
  return json({
    status: "ready",
    mode: "protected-article-translation-test",
    article: ARTICLE.slug,
    message: "POST requires authentication."
  });
}
