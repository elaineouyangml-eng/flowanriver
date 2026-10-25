
/*
 * FlowAnRiver Chinese Translation Publisher
 *
 * Server-side endpoint.
 * Publishing is disabled until authentication,
 * content validation and GitHub integration
 * are configured.
 */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex"
    }
  });
}

export async function onRequestPost() {
  return json({
    error: "Publishing is not configured yet."
  }, 503);
}

export function onRequestGet() {
  return json({
    status: "not_configured",
    publishing_enabled: false
  });
}
