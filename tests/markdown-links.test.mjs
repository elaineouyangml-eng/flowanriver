
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  splitMarkdownLinks,
  restoreMarkdownLinks
} from "../functions/_lib/markdown-links.js";

test("Preserve a Markdown link URL", () => {
  const source =
    "Read the [original whitepaper](https://minepi.com/white-paper/).";

  const parts = splitMarkdownLinks(source);

  assert.equal(parts.length, 3);
  assert.equal(parts[1].type, "link");
  assert.equal(
    parts[1].url,
    "https://minepi.com/white-paper/"
  );

  assert.equal(restoreMarkdownLinks(parts), source);
});

test("Preserve multiple links", () => {
  const source =
    "See [Pi](https://minepi.com/) and [Docs](https://example.com/docs).";

  const parts = splitMarkdownLinks(source);

  assert.equal(
    parts.filter(part => part.type === "link").length,
    2
  );

  assert.equal(restoreMarkdownLinks(parts), source);
});

test("Reject malformed Markdown links", () => {
  const source = "Read [whitepaper](https://example.com/a(b)).";

  assert.throws(
    () => splitMarkdownLinks(source),
    /Complex Markdown requires review/
  );
});
