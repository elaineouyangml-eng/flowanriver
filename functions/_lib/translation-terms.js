
import { TRANSLATION_TERMS } from "./translation-config.js";

/*
 * Find glossary terms in English source text.
 * Longer phrases take precedence over shorter ones.
 */

const entries = Object.entries(TRANSLATION_TERMS)
  .sort((a, b) => b[0].length - a[0].length);

function isWordCharacter(char) {
  return /[A-Za-z0-9_]/.test(char || "");
}

export function splitProtectedTerms(text) {
  if (typeof text !== "string" || !text) {
    return [];
  }

  const segments = [];
  let position = 0;
  let plainStart = 0;

  while (position < text.length) {
    let match = null;

    for (const [source, target] of entries) {
      if (
        text.slice(position, position + source.length)
          .toLowerCase() !== source.toLowerCase()
      ) {
        continue;
      }

      const before = text[position - 1] || "";
      const after = text[position + source.length] || "";

      if (
        isWordCharacter(before) ||
        isWordCharacter(after)
      ) {
        continue;
      }

      match = { source, target };
      break;
    }

    if (!match) {
      position++;
      continue;
    }

    if (position > plainStart) {
      segments.push({
        type: "text",
        value: text.slice(plainStart, position)
      });
    }

    segments.push({
      type: "term",
      source: match.source,
      value: match.target
    });

    position += match.source.length;
    plainStart = position;
  }

  if (plainStart < text.length) {
    segments.push({
      type: "text",
      value: text.slice(plainStart)
    });
  }

  return segments;
}
