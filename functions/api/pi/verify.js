
export async function onRequestPost({ request }) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  };

  const hostname = new URL(request.url).hostname;

  // Enable verification on Testnet only for now.
  if (hostname !== "test.flowanriver.com") {
    return new Response(
      JSON.stringify({ error: "Environment not enabled" }),
      { status: 403, headers }
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 400, headers }
    );
  }

  const token = body?.accessToken;

  if (
    typeof token !== "string" ||
    token.length < 10 ||
    token.length > 4096
  ) {
    return new Response(
      JSON.stringify({ error: "Invalid access token" }),
      { status: 400, headers }
    );
  }

  try {
    const piResponse = await fetch(
      "https://api.minepi.com/v2/me",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json"
        },
        signal: AbortSignal.timeout(10000)
      }
    );

    if (!piResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Pi identity not verified" }),
        { status: 401, headers }
      );
    }

    const user = await piResponse.json();

    if (
      typeof user.uid !== "string" ||
      !user.uid
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid Pi user" }),
        { status: 502, headers }
      );
    }

    return new Response(
      JSON.stringify({
        verified: true,
        user: {
          uid: user.uid,
          username: user.username || ""
        }
      }),
      { status: 200, headers }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Pi verification unavailable" }),
      { status: 502, headers }
    );
  }
}
