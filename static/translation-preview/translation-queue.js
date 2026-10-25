
(() => {
  "use strict";

  const panel = document.querySelector("section.panel");
  const articleInput = document.getElementById("article");
  const tokenInput = document.getElementById("token");

  if (!panel || !articleInput || !tokenInput) return;

  const MAX_ARTICLES = 3;
  const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.textContent = "查看待翻译文章";

  const result = document.createElement("section");
  result.className = "panel";
  result.hidden = true;

  panel.appendChild(openButton);
  panel.after(result);

  let selected = new Set();
  let pending = [];
  let running = false;
  let stopped = false;
  let controller = null;

  function add(tag, text, parent) {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (parent) parent.appendChild(element);
    return element;
  }

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
      throw new Error("Sitemap XML 格式错误");
    }

    const urls = Array.from(
      xml.getElementsByTagName("loc"),
      node => node.textContent.trim()
    );

    if (xml.documentElement.localName === "sitemapindex") {
      const all = [];
      for (const item of urls) {
        all.push(...await getSitemap(item, visited));
      }
      return all;
    }

    return urls;
  }

  function extractSlug(url, chinese) {
    try {
      const parsed = new URL(url);

      if (parsed.origin !== location.origin) return null;

      const pattern = chinese
        ? /^\/zh\/posts\/([a-z0-9-]+)\/$/
        : /^\/posts\/([a-z0-9-]+)\/$/;

      return parsed.pathname.match(pattern)?.[1] || null;
    } catch {
      return null;
    }
  }

  async function request(path, token, signal) {
    const response = await fetch(path, {
      method: "POST",
      headers: {
        "X-Translate-Test-Token": token
      },
      cache: "no-store",
      signal
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "请求失败：" + response.status
      );
    }

    return data;
  }

  async function translateArticle(slug, token, onProgress) {
    const signal = controller.signal;

    const progress = await request(
      "/api/translation-progress?article=" +
        encodeURIComponent(slug),
      token,
      signal
    );

    if (!Array.isArray(progress.pending)) {
      throw new Error("无法读取翻译进度");
    }

    const batches = new Set();

    for (const item of progress.pending) {
      const match = String(item.id || "")
        .match(/^block-(\d+)$/);

      if (!match) continue;

      const index = Number(match[1]);
      batches.add(Math.floor(index / 2) * 2);
    }

    const starts = [...batches].sort((a, b) => a - b);

    for (let i = 0; i < starts.length; i++) {
      if (stopped) return false;

      onProgress(
        "文章：" + slug +
        "\n翻译批次：" + (i + 1) + "/" + starts.length
      );

      const data = await request(
        "/api/translate-batch?article=" +
          encodeURIComponent(slug) +
          "&start=" + starts[i],
        token,
        signal
      );

      if (!Array.isArray(data.results)) {
        throw new Error("翻译结果格式错误");
      }

      if (data.results.some(item =>
        item.status === "translation_failed"
      )) {
        throw new Error(
          "部分区块翻译失败，请单独检查"
        );
      }
    }

    return true;
  }

  function render(englishCount, chineseCount) {
    result.replaceChildren();

    add(
      "p",
      "英文文章：" + englishCount +
      " 篇｜已公开中文版：" + chineseCount +
      " 篇｜待处理：" + pending.length + " 篇",
      result
    );

    const note = add(
      "p",
      "队列根据公开页面生成。" +
      "已有未公开 GitHub 草稿的文章也可能出现在这里。" +
      "批量操作只翻译，不覆盖草稿、不公开发布。",
      result
    );
    note.className = "meta";

    const selectAll = document.createElement("button");
    selectAll.type = "button";
    selectAll.textContent = "全选";

    const clear = document.createElement("button");
    clear.type = "button";
    clear.textContent = "取消全选";

    const run = document.createElement("button");
    run.type = "button";
    run.textContent = "翻译选中的前 3 篇";

    const stop = document.createElement("button");
    stop.type = "button";
    stop.textContent = "停止翻译";
    stop.disabled = true;

    const count = add("p", "", result);
    const controls = add("div", "", result);
    controls.append(selectAll, clear, run, stop);

    const status = add("p", "", result);
    status.style.whiteSpace = "pre-wrap";

    const list = add("div", "", result);
    const checkboxes = [];

    function update() {
      count.textContent =
        "已选择 " + selected.size + " 篇" +
        "（每次最多处理 3 篇）";

      for (const input of checkboxes) {
        input.checked = selected.has(input.value);
        input.disabled = running;
      }

      selectAll.disabled = running;
      clear.disabled = running;
      run.disabled = running || selected.size === 0;
      stop.disabled = !running;
      openButton.disabled = running;
    }

    selectAll.addEventListener("click", () => {
      selected = new Set(pending);
      update();
    });

    clear.addEventListener("click", () => {
      selected.clear();
      update();
    });

    for (const slug of pending) {
      const row = add("div", "", list);
      row.style.margin = "12px 0";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = slug;
      checkbox.style.width = "auto";
      checkbox.style.margin = "0 12px 0 0";

      const label = document.createElement("label");
      label.style.display = "inline";
      label.style.fontWeight = "normal";

      const text = document.createTextNode(slug);
      label.append(checkbox, text);

      const choose = document.createElement("button");
      choose.type = "button";
      choose.textContent = "单篇查看";
      choose.style.marginLeft = "12px";

      choose.addEventListener("click", () => {
        articleInput.value = slug;
        articleInput.dispatchEvent(
          new Event("input", { bubbles: true })
        );
        window.scrollTo({ top: 0, behavior: "smooth" });
      });

      checkbox.addEventListener("change", () => {
        if (checkbox.checked) selected.add(slug);
        else selected.delete(slug);
        update();
      });

      row.append(label, choose);
      checkboxes.push(checkbox);
    }

    run.addEventListener("click", async () => {
      if (running) return;

      const token = tokenInput.value;

      if (!token) {
        alert("请先输入 Cloudflare 翻译测试密钥");
        return;
      }

      const jobs = pending
        .filter(slug => selected.has(slug))
        .slice(0, MAX_ARTICLES);

      if (!jobs.length) return;

      if (!confirm(
        "这次将依次处理 " + jobs.length +
        " 篇文章，可能消耗 Cloudflare AI 免费额度。" +
        "\n\n不会自动保存到 GitHub 或公开发布。" +
        "\n确认开始？"
      )) return;

      running = true;
      stopped = false;
      controller = new AbortController();
      update();

      const completed = [];
      const failed = [];

      try {
        for (const slug of jobs) {
          if (stopped) break;

          status.textContent = "正在处理：" + slug;

          try {
            const finished = await translateArticle(
              slug,
              token,
              text => {
                status.textContent =
                  "正在批量翻译……\n\n" + text;
              }
            );

            if (!finished) break;

            completed.push(slug);
            selected.delete(slug);
          } catch (error) {
            if (stopped || error.name === "AbortError") {
              break;
            }

            failed.push(slug + "：" + error.message);
          }
        }
      } finally {
        running = false;
        controller = null;

        status.textContent =
          (stopped ? "已停止。" : "本批次处理结束。") +
          "\n成功完成：" + completed.length + " 篇" +
          "\n需要检查：" + failed.length + " 篇" +
          (failed.length
            ? "\n\n" + failed.join("\n")
            : "") +
          "\n\n译文保存在 Cloudflare KV 中。" +
          "\n请继续人工审核，之后再保存 GitHub 草稿。";

        update();
      }
    });

    stop.addEventListener("click", () => {
      if (!running) return;
      stopped = true;
      controller?.abort();
      status.textContent =
        "正在停止，后续文章不会继续翻译。";
    });

    update();
  }

  openButton.addEventListener("click", async () => {
    if (running) return;

    openButton.disabled = true;
    result.hidden = false;
    result.textContent = "正在读取文章队列……";

    try {
      const urls = await getSitemap("/sitemap.xml");
      const english = new Set();
      const chinese = new Set();

      for (const url of urls) {
        const en = extractSlug(url, false);
        const zh = extractSlug(url, true);

        if (en) english.add(en);
        if (zh) chinese.add(zh);
      }

      if (!english.size) {
        throw new Error("没有找到英文文章");
      }

      pending = [...english]
        .filter(slug => !chinese.has(slug))
        .sort();

      selected = new Set(
        [...selected].filter(slug => pending.includes(slug))
      );

      render(
        english.size,
        [...english].filter(slug => chinese.has(slug)).length
      );

    } catch (error) {
      result.textContent =
        "读取失败：" + error.message;
    } finally {
      if (!running) openButton.disabled = false;
    }
  });
})();
