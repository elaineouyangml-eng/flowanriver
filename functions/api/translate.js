
const MODEL = "@cf/meta/m2m100-1.2b";

const TEST_TEXT =
  "FlowAnRiver shares independent perspectives on AI, cryptocurrency, and digital technology.";

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
  // Only the site owner's private test can call Workers AI.
  if (!env.TRANSLATE_TEST_TOKEN) {
    return json({ error: "Test access not configured" }, 503);
  }

  const token = request.headers.get("X-Translate-Test-Token");

  if (!token || token !== env.TRANSLATE_TEST_TOKEN) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (!env.AI) {
    return json({ error: "Workers AI binding unavailable" }, 503);
  }

  try {
    const result = await env.AI.run(MODEL, {
      text: TEST_TEXT,
      source_lang: "en",
      target_lang: "zh"
    });

    if (!result || typeof result.translated_text !== "string") {
      return json({ error: "Invalid translation response" }, 502);
    }

    return json({
      original: TEST_TEXT,
      translated: result.translated_text,
      source_lang: "en",
      target_lang: "zh",
      test: true
    });
  } catch (error) {
    return json({ error: "Translation service unavailable" }, 502);
  }
}

export function onRequestGet() {
  return json({
    status: "ready",
    message: "Translation test endpoint. POST requires authentication."
  });
}
// Redeploy translation function after configuring Cloudflare secret.
