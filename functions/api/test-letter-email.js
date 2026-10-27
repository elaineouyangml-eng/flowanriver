
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });

export async function onRequestPost({ request, env }) {
  // Only allow requests from our website
  const origin = request.headers.get("Origin");

  if (origin && origin !== "https://flowanriver.com") {
    return json({ error: "Forbidden" }, 403);
  }

  // Check configuration
  if (
    !env.RESEND_API_KEY ||
    !env.LETTERS_ADMIN_TOKEN ||
    !env.LETTERS_TEST_EMAIL
  ) {
    return json({ error: "Service not configured" }, 503);
  }

  // Check administrator authentication
  const suppliedToken = request.headers.get(
    "X-Letters-Admin-Token"
  );

  if (!suppliedToken) {
    return json({ error: "Unauthorized" }, 401);
  }

  // Constant-time comparison
  const encoder = new TextEncoder();
  const supplied = encoder.encode(suppliedToken);
  const expected = encoder.encode(
    env.LETTERS_ADMIN_TOKEN
  );

  if (supplied.length !== expected.length) {
    return json({ error: "Unauthorized" }, 401);
  }

  let difference = 0;

  for (let i = 0; i < supplied.length; i++) {
    difference |= supplied[i] ^ expected[i];
  }

  if (difference !== 0) {
    return json({ error: "Unauthorized" }, 401);
  }

  // Do not accept a recipient from the request.
  // The address is fixed in Cloudflare settings.
  const recipient = env.LETTERS_TEST_EMAIL.trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    return json({ error: "Invalid test recipient" }, 503);
  }

  try {
    const response = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "Flowanriver Letters <contact@flowanriver.com>",
          to: [recipient],
          subject: "Flowanriver Letters - Email Test",
          text:
            "Hello!\n\n" +
            "This is a test email from Flowanriver Letters.\n\n" +
            "Our email sending connection is working.\n\n" +
            "You may forget, but time will remember.\n\n" +
            "Flowanriver"
        })
      }
    );

    if (!response.ok) {
      return json(
        { error: "Email provider rejected the request" },
        502
      );
    }

    const result = await response.json();

    return json({
      success: true,
      message: "Test email accepted by Resend",
      emailId: result.id
    });
  } catch {
    return json({
      error: "Unable to contact email provider"
    }, 502);
  }
}

export function onRequestGet() {
  return json({ error: "Method not allowed" }, 405);
}
