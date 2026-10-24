
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
