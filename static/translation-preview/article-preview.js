
(() => {
  "use strict";

  const articleInput = document.getElementById("article");
  const tokenInput = document.getElementById("token");
  const panel = document.querySelector("section.panel");

  if (!articleInput || !tokenInput || !panel) return;

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "预览整篇中文";

  const preview = document.createElement("section");
  preview.hidden = true;

  Object.assign(preview.style, {
    background: "#fff",
    border: "1px solid #e8e2da",
    borderRadius: "12px",
    padding: "28px",
    marginBottom: "20px",
    lineHeight: "1.95",
    overflowWrap: "anywhere"
  });

  panel.appendChild(button);
  panel.after(preview);

  function add(tag, text, parent) {
    const node = document.createElement(tag);
    node.textContent = text;
    parent.appendChild(node);
    return node;
  }

  async function getPage(article, token, start) {
    const response = await fetch(
      "/api/translation-review?article=" +
      encodeURIComponent(article) +
      "&start=" + start,
      {
        method: "POST",
        headers: {
          "X-Translate-Test-Token": token
        },
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        "读取失败，HTTP " + response.status
      );
    }

    const data = await response.json();

    if (!Array.isArray(data.results)) {
      throw new Error("返回数据格式不正确");
    }

    return data;
  }

  async function loadFullArticle(article, token) {
    const blocks = [];
    let position = 0;

    for (let page = 0; page < 1000; page++) {
      const data = await getPage(
        article, token, position
      );

      blocks.push(...data.results);

      if (data.complete) {
        return blocks;
      }

      if (
        !Number.isInteger(data.next_start) ||
        data.next_start <= position
      ) {
        throw new Error("分页位置异常");
      }

      position = data.next_start;
    }

    throw new Error("文章超出预览限制");
  }

  button.addEventListener("click", async () => {
    const article = articleInput.value.trim();
    const token = tokenInput.value;

    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article) ||
      article.length > 100 ||
      !token
    ) {
      preview.hidden = false;
      preview.textContent =
        "请填写正确的文章 Slug 和测试密钥。";
      return;
    }

    button.disabled = true;
    preview.hidden = false;
    preview.replaceChildren();

    add("p", "正在加载全文中文草稿……", preview);

    try {
      const blocks = await loadFullArticle(
        article, token
      );

      preview.replaceChildren();

      add("h2", "中文全文阅读预览", preview);

      add(
        "p",
        "文章：" + article +
        " · 仅供内部审校，尚未公开发布",
        preview
      );

      const articleBody = document.createElement("article");
      preview.appendChild(articleBody);

      let exceptions = 0;

      for (const block of blocks) {
        if (!block || !block.id) {
          exceptions++;
          continue;
        }

        const translated =
          typeof block.translated === "string"
            ? block.translated
            : "";

        const original =
          typeof block.original === "string"
            ? block.original
            : "";

        if (block.type === "heading") {
          const heading = add(
            "h3",
            translated || "[标题待翻译] " + original,
            articleBody
          );

          heading.style.marginTop = "30px";

          if (!translated) exceptions++;
          continue;
        }

        if (
          block.type === "image" ||
          block.type === "code" ||
          block.type === "html"
        ) {
          const placeholder = add(
            "p",
            `[${block.id} · ${block.type}：` +
            "此处保留原文结构，需人工核对]",
            articleBody
          );

          placeholder.style.color = "#a15b20";
          exceptions++;
          continue;
        }

        if (block.type === "list" ||
            block.type === "quote") {
          const note = add(
            "p",
            `[${block.id}：列表或引用需要核对格式]\n` +
            (translated || original),
            articleBody
          );

          note.style.whiteSpace = "pre-wrap";
          note.style.color = "#a15b20";
          exceptions++;
          continue;
        }

        if (!translated.trim()) {
          const note = add(
            "p",
            `[${block.id} 尚未翻译] ${original}`,
            articleBody
          );

          note.style.color = "#a15b20";
          exceptions++;
          continue;
        }

        const paragraph = add(
          "p",
          translated,
          articleBody
        );

        paragraph.style.whiteSpace = "pre-wrap";
        paragraph.style.marginBottom = "20px";
      }

      const footer = add(
        "p",
        "预览完成 · 共读取 " + blocks.length +
        " 个区块 · 需特别检查 " +
        exceptions + " 处结构或缺失内容。",
        preview
      );

      footer.style.borderTop =
        "1px solid #e8e2da";

      footer.style.marginTop = "30px";
      footer.style.paddingTop = "18px";

      preview.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    } catch (error) {
      preview.replaceChildren();

      add(
        "p",
        "全文预览失败：" +
        (error.message || "未知错误"),
        preview
      );

    } finally {
      button.disabled = false;
    }
  });
})();


/* Export Chinese Hugo Markdown draft */
(() => {
  "use strict";

  const articleInput = document.getElementById("article");
  const tokenInput = document.getElementById("token");
  const panel = document.querySelector("section.panel");

  if (!articleInput || !tokenInput || !panel) return;

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "导出中文 Markdown";
  panel.appendChild(button);

  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  async function loadBlocks(article, token) {
    const all = [];
    let start = 0;

    for (let page = 0; page < 100; page++) {
      const response = await fetch(
        "/api/translation-review?article=" +
        encodeURIComponent(article) +
        "&start=" + start,
        {
          method: "POST",
          headers: {
            "X-Translate-Test-Token": token
          },
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error("读取失败：" + response.status);
      }

      const data = await response.json();

      if (!Array.isArray(data.results)) {
        throw new Error("翻译数据格式不正确");
      }

      all.push(...data.results);

      if (data.complete) return all;

      if (
        !Number.isInteger(data.next_start) ||
        data.next_start <= start
      ) {
        throw new Error("翻译分页异常");
      }

      start = data.next_start;
    }

    throw new Error("文章过长，未能完整读取");
  }

  function convertBlock(block, warnings) {
    const original = String(block.original || "").trim();
    const translated = String(block.translated || "").trim();
    const id = block.id || "unknown";

    if (["image", "code", "html"].includes(block.type)) {
      return original;
    }

    if (block.type === "list" || block.type === "quote") {
      warnings.push(id + "：列表或引用需要人工翻译");
      return (
        "<!-- TODO: 请翻译并保留原文格式：" + id + " -->\n" +
        original
      );
    }

    if (!translated) {
      warnings.push(id + "：缺少中文译文");
      return (
        "<!-- TODO: 需要翻译：" + id + " -->\n" +
        original
      );
    }

    if (original.includes("](") && !translated.includes("](")) {
      warnings.push(id + "：需要恢复原文链接");
      return (
        "<!-- TODO: 请检查原文链接：" + id + " -->\n" +
        original + "\n\n" + translated
      );
    }

    if (
      original.includes("**") &&
      !translated.includes("**")
    ) {
      warnings.push(id + "：请检查加粗格式");
    }

    if (block.type === "heading") {
      warnings.push(id + "：请核对标题层级");
      return "## " + translated.replace(/^#{1,6}\s+/, "");
    }

    return translated;
  }

  button.addEventListener("click", async () => {
    const article = articleInput.value.trim();
    const token = tokenInput.value;

    if (!slugPattern.test(article) || !token) {
      alert("请先填写文章 Slug 和测试密钥。");
      return;
    }

    button.disabled = true;
    button.textContent = "正在生成 Markdown…";

    try {
      const blocks = await loadBlocks(article, token);
      const warnings = [];

      const content = blocks.map(block =>
        convertBlock(block, warnings)
      ).filter(Boolean).join("\n\n");

      const title = article.replace(/-/g, " ");

      const markdown = [
        "---",
        'title: "' + title + '（中文标题待审核）"',
        "draft: true",
        "---",
        "",
        "<!-- 中文草稿：发布前请检查标题、日期、链接和正文 -->",
        "",
        content,
        "",
        "<!--",
        "人工审核清单：",
        ...warnings,
        "-->",
        ""
      ].join("\n");

      const blob = new Blob([markdown], {
        type: "text/markdown;charset=utf-8"
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = article + ".zh.md";

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);

      alert(
        "中文 Markdown 草稿已生成。\n" +
        "区块数：" + blocks.length + "\n" +
        "待检查项目：" + warnings.length + "\n\n" +
        "注意：文件仍是 draft: true，尚未发布。"
      );
    } catch (error) {
      alert("导出失败：" + error.message);
    } finally {
      button.disabled = false;
      button.textContent = "导出中文 Markdown";
    }
  });
})();
