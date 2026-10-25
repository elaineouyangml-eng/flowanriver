
(() => {
  "use strict";

  const panel = document.querySelector("section.panel");
  const articleInput = document.getElementById("article");

  if (!panel || !articleInput) return;

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "查看待翻译文章";

  const result = document.createElement("section");
  result.className = "panel";
  result.hidden = true;

  panel.appendChild(button);
  panel.after(result);

  async function getSitemap(path, visited = new Set()) {
    const url = new URL(path, location.origin);

    if (url.origin !== location.origin ||
        visited.has(url.href)) {
      return [];
    }

    visited.add(url.href);

    const response = await fetch(url.href, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("无法读取 Sitemap");
    }

    const xml = new DOMParser().parseFromString(
      await response.text(),
      "application/xml"
    );

    if (xml.querySelector("parsererror")) {
      throw new Error("Sitemap 格式错误");
    }

    const urls = Array.from(
      xml.getElementsByTagName("loc"),
      node => node.textContent.trim()
    );

    if (xml.documentElement.localName === "sitemapindex") {
      const nested = [];

      for (const item of urls) {
        nested.push(
          ...(await getSitemap(item, visited))
        );
      }

      return nested;
    }

    return urls;
  }

  function slugFromUrl(url, chinese = false) {
    try {
      const parsed = new URL(url);

      if (parsed.origin !== location.origin) {
        return null;
      }

      const pattern = chinese
        ? /^\/zh\/posts\/([a-z0-9-]+)\/$/
        : /^\/posts\/([a-z0-9-]+)\/$/;

      return parsed.pathname.match(pattern)?.[1] || null;
    } catch {
      return null;
    }
  }

  button.addEventListener("click", async () => {
    button.disabled = true;
    result.hidden = false;
    result.replaceChildren();

    const status = document.createElement("p");
    status.textContent = "正在检查文章清单……";
    result.appendChild(status);

    try {
      const urls = await getSitemap("/sitemap.xml");

      const english = new Set();
      const chinese = new Set();

      for (const url of urls) {
        const enSlug = slugFromUrl(url);
        const zhSlug = slugFromUrl(url, true);

        if (enSlug) english.add(enSlug);
        if (zhSlug) chinese.add(zhSlug);
      }

      if (english.size === 0) {
        throw new Error("未找到英文文章，请检查 Sitemap");
      }

      const pending = [...english]
        .filter(slug => !chinese.has(slug))
        .sort();

      status.textContent =
        "英文文章：" + english.size +
        " 篇；已公开中文版：" +
        [...english].filter(slug => chinese.has(slug)).length +
        " 篇；尚未公开中文版：" +
        pending.length + " 篇。";

      const note = document.createElement("p");
      note.className = "meta";
      note.textContent =
        "注意：尚未公开不代表没有 GitHub 草稿。" +
        "这里仅列出需要继续处理的文章。";
      result.appendChild(note);

      for (const slug of pending) {
        const row = document.createElement("div");
        row.style.margin = "10px 0";

        const choose = document.createElement("button");
        choose.type = "button";
        choose.textContent = "选择";

        const name = document.createElement("span");
        name.textContent = slug;

        choose.addEventListener("click", () => {
          articleInput.value = slug;
          articleInput.dispatchEvent(
            new Event("input", { bubbles: true })
          );

          window.scrollTo({
            top: 0,
            behavior: "smooth"
          });
        });

        row.append(choose, name);
        result.appendChild(row);
      }

    } catch (error) {
      status.textContent =
        "读取文章队列失败：" + error.message;
    } finally {
      button.disabled = false;
    }
  });
})();
