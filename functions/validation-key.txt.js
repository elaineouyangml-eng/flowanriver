

export async function onRequestGet(context) {
  const hostname = new URL(context.request.url).hostname;

  // Pi Testnet domain verification
  if (hostname === "test.flowanriver.com") {
    const testnetKey = "cfd456d6a62da437b6b0c2f5de46ab0987d7a7349eb2305030e8e1e897972dc980e75e5c2766148475be432c515d5b154287d4c8a4089cb2f28b23ced4f6e389";

    return new Response(testnetKey, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  }

  // Other domains continue to use the existing static file
  return context.next();
}



