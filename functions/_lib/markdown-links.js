
/*
 * FlowAnRiver Markdown link protection.
 * Split simple Markdown links into text and link parts.
 * URLs are never sent to the translation model.
 * Unsupported formats are rejected for manual review.
 */

export function splitMarkdownLinks(source) {
  if (typeof source !== "string") {
    throw new Error("Invalid Markdown input");
  }

  const parts = [];
  const pattern = /(\[([^\[\]\n]+)\]\((https?:\/\/[^\s()]+)\))/g;

  let offset = 0;
  let match;

  while ((match = pattern.exec(source)) !== null) {
    const before = source.slice(offset, match.index);

    if (before) {
      parts.push({ type: "text", text: before });
    }

    parts.push({
      type: "link",
      label: match[2],
      url: match[3]
    });

    offset = pattern.lastIndex;
  }

  const after = source.slice(offset);

  if (after) {
    parts.push({ type: "text", text: after });
  }

  // Reject link-like Markdown that this simple parser
  // could not safely understand.
  const remaining = parts
    .filter(part => part.type === "text")
    .map(part => part.text)
    .join("");

  if (/\]\(|!?\[[^\]]*\]\s*\[/.test(remaining)) {
    throw new Error("Complex Markdown requires review");
  }

  return parts;
}

export function restoreMarkdownLinks(parts) {
  return parts.map(part => {
    if (part.type === "link") {
      return `[${part.label}](${part.url})`;
    }

    if (part.type === "text") {
      return part.text;
    }

    throw new Error("Invalid Markdown part");
  }).join("");
}
