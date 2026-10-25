
/*
 * FlowAnRiver Chinese Draft Publisher
 *
 * Creates Chinese Hugo drafts in GitHub.
 * Never overwrites existing files.
 * Never publishes draft: false content.
 */

const REPO = "elaineouyangml-eng/flowanriver";
const SLUG = /^[a-z0-9]+(?:-+[a-z0-9]+)*$/;

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

function encodeBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";

  for (let i = 0; i < bytes.length; i += 4096) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, i + 4096)
    );
  }

  return btoa(binary);
}

function validMarkdown(markdown) {
  if (
    typeof markdown !== "string" ||
    markdown.length < 100 ||
    markdown.length > 200000
  ) {
    return false;
  }

  const match = markdown.match(
    /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/
  );

  if (!match) return false;

  const frontmatter = match[1];

  return (
    /^title:\s*.+$/m.test(frontmatter) &&
    /^draft:\s*true\s*$/m.test(frontmatter) &&
    !/^draft:\s*false\s*$/m.test(frontmatter)
  );
}

export async function onRequestPost({ request, env }) {
  if (
    !env.PUBLISH_ADMIN_TOKEN ||
    !env.GITHUB_PUBLISH_TOKEN
  ) {
    return json({
      error: "Publishing credentials not configured"
    }, 503);
  }

  const suppliedToken = request.headers.get(
    "X-Publish-Admin-Token"
  );

  if (
    !suppliedToken ||
    suppliedToken !== env.PUBLISH_ADMIN_TOKEN
  ) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { article, markdown } = body ?? {};

  if (
    typeof article !== "string" ||
    article.length > 100 ||
    !SLUG.test(article) ||
    !validMarkdown(markdown)
  ) {
    return json({
      error: "Invalid article or Markdown draft"
    }, 400);
  }

  if (!env.ASSETS) {
    return json({
      error: "Article source unavailable"
    }, 503);
  }

  // Confirm the English source article exists.
  const sourceUrl = new URL(
    `/posts/${article}/index.json`,
    request.url
  );

  try {
    const sourceResponse = await env.ASSETS.fetch(
      new Request(sourceUrl.toString())
    );

    if (!sourceResponse.ok) {
      return json({
        error: "English article not found"
      }, 404);
    }

    const source = await sourceResponse.json();

    if (source.article !== `/posts/${article}/`) {
      return json({
        error: "English article mismatch"
      }, 400);
    }
  } catch {
    return json({
      error: "Could not validate English source"
    }, 502);
  }

  const path = `content/posts/${article}.zh.md`;

  const githubUrl =
    `https://api.github.com/repos/${REPO}/contents/${path}`;

  try {
    const response = await fetch(githubUrl, {
      method: "PUT",
      headers: {
        "Authorization":
          `Bearer ${env.GITHUB_PUBLISH_TOKEN}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "FlowAnRiver-Publisher",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Add Chinese draft: ${article}`,
        content: encodeBase64(markdown),
        branch: "main"
      })
    });

    if (response.status === 201) {
      return json({
        success: true,
        status: "draft_created",
        article,
        path,
        published: false
      }, 201);
    }

    if (response.status === 422 || response.status === 409) {
      return json({
        error: "File may already exist or conflict"
      }, 409);
    }

    return json({
      error: "GitHub rejected the draft",
      githubStatus: response.status
    }, 502);

  } catch {
    return json({
      error: "GitHub connection failed"
    }, 502);
  }
}

export function onRequestGet() {
  return json({
    status: "ready",
    mode: "protected_draft_creation",
    publicPublishingEnabled: false
  });
}
