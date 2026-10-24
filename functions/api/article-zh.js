
const ARTICLE = "pi-network-seven-years-original-vision";
const VERSION = "v1";

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

export async function onRequestGet({ env }) {
  if (!env.TRANSLATIONS) {
    return json({ error: "Translation cache unavailable" }, 503);
  }

  const cacheKey = `translation:${ARTICLE}:zh:${VERSION}`;

  try {
    const cached = await env.TRANSLATIONS.get(cacheKey, "json");

    if (!cached || !Array.isArray(cached.blocks)) {
      return json({ error: "Translation not ready" }, 404);
    }

    return json({
      article: ARTICLE,
      language: "zh",
      machine_translated: true,
      complete: false,
      blocks: cached.blocks
    });
  } catch {
    return json({ error: "Unable to read translation" }, 502);
  }
}
