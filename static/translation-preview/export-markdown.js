
(() => {
  "use strict";

  const articleInput = document.getElementById("article");
  const tokenInput = document.getElementById("token");
  const panel = document.querySelector("section.panel");

  if (!articleInput || !tokenInput || !panel) return;

  const exportButton = document.createElement("button");
  exportButton.type = "button";
  exportButton.textContent = "导出中文 Markdown";

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.textContent = "保存中文草稿到 GitHub";

  panel.append(exportButton, saveButton);

  function getCredentials() {
    const article = articleInput.value.trim();
    const token = tokenInput.value;

    if (
      !/^[a-z0-9]+(?:-+[a-z0-9]+)*$/.test(article) ||
      article.length > 100 ||
      !token
    ) {
      throw new Error("请填写正确的文章 Slug 和翻译测试密钥。");
    }

    return { article, token };
  }

  async function loadArticle(slug) {
    const response = await fetch(
      "/posts/" + encodeURIComponent(slug) + "/index.json",
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error("无法读取英文文章资料");
    }

    const data = await response.json();

    if (
      data.article !== "/posts/" + slug + "/" ||
      !Array.isArray(data.blocks)
    ) {
      throw new Error("英文文章数据格式不正确");
    }

    if (
      typeof data.date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(data.date)
    ) {
      throw new Error("英文文章缺少有效日期");
    }

    return data;
  }

  async function loadBlocks(slug, token) {
    const blocks = [];
    let start = 0;

    for (let page = 0; page < 100; page++) {
      const response = await fetch(
        "/api/translation-review?article=" +
        encodeURIComponent(slug) +
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
          "读取翻译记录失败：" + response.status
        );
      }

      const data = await response.json();

      if (!Array.isArray(data.results)) {
        throw new Error("翻译记录格式不正确");
      }

      blocks.push(...data.results);

      if (data.complete) {
        if (blocks.length !== data.total) {
          throw new Error("翻译区块数量不一致");
        }
        return blocks;
      }

      if (
        !Number.isInteger(data.next_start) ||
        data.next_start <= start
      ) {
        throw new Error("翻译记录分页异常");
      }

      start = data.next_start;
    }

    throw new Error("文章超过读取限制");
  }

  function convertBlock(block, warnings) {
    const original = String(block.original || "").trim();
    const translated = String(block.translated || "").trim();
    const id = block.id || "unknown";

    if (["image", "code", "html"].includes(block.type)) {
      return original;
    }

    if (block.type === "list" || block.type === "quote") {
      warnings.push(id + "：列表或引用需要人工检查");
      return "<!-- TODO: 检查 " + id + " -->\n" + original;
    }

    if (!translated) {
      if (original === "---") return original;

      warnings.push(id + "：缺少中文译文");
      return "<!-- TODO: 翻译 " + id + " -->\n" + original;
    }

    if (
      original.includes("](") &&
      !translated.includes("](")
    ) {
      warnings.push(id + "：请检查原文链接");
      return (
        "<!-- TODO: 检查链接 " + id + " -->\n" +
        original + "\n\n" + translated
      );
    }

    if (block.type === "heading") {
      const level = original.startsWith("### ")
        ? "### "
        : original.startsWith("#### ")
          ? "#### "
          : "## ";

      return level + translated.replace(/^#{1,6}\s+/, "");
    }

    if (original.includes("**") &&
        !translated.includes("**")) {
      warnings.push(id + "：请检查加粗格式");
    }

    if (block.needsReview || block.validation?.needsReview) {
      warnings.push(id + "：需要检查译文");
    }

    return translated;
  }

  function yamlString(value) {
    return JSON.stringify(String(value ?? ""));
  }

  async function buildDraft(article, token) {
    const [source, blocks] = await Promise.all([
      loadArticle(article),
      loadBlocks(article, token)
    ]);

    const chineseTitle = prompt(
      "请输入中文版标题：\n英文原标题：" +
      (source.title || ""),
      ""
    );

    if (chineseTitle === null) return null;

    const title = chineseTitle.trim();

    if (!title || title.length > 200) {
      throw new Error("请填写有效的中文版标题");
    }

    const warnings = [];

    const body = blocks
      .map(block => convertBlock(block, warnings))
      .filter(Boolean)
      .join("\n\n");

    if (!body.trim()) {
      throw new Error("中文正文为空");
    }

    const tags = Array.isArray(source.tags)
      ? source.tags.filter(tag => typeof tag === "string")
      : [];

    const frontmatter = [
      "---",
      "title: " + yamlString(title),
      "date: " + source.date,
      "draft: true",
      "description: " +
        yamlString(source.description || ""),
      "tags: " + JSON.stringify(tags),
      "---",
      ""
    ];

    const markdown = [
      ...frontmatter,
      "<!-- 中文机器翻译草稿，公开发布前须检查 -->",
      "",
      body,
      "",
      "<!--",
      "原文：" +
        "https://flowanriver.com/posts/" + article + "/",
      "人工检查项目：",
      ...(warnings.length
        ? warnings
        : ["无自动检测提示；仍须人工通读"]),
      "-->",
      ""
    ].join("\n");

    return {
      markdown,
      warnings,
      count: blocks.length,
      article
    };
  }

  function downloadMarkdown(slug, markdown) {
    const blob = new Blob([markdown], {
      type: "text/markdown;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = slug + ".zh.md";

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function runButton(button, label, action) {
    if (exportButton.disabled || saveButton.disabled) return;

    exportButton.disabled = true;
    saveButton.disabled = true;
    button.textContent = "正在处理……";

    try {
      await action();
    } catch (error) {
      alert("操作失败：" + error.message);
    } finally {
      exportButton.disabled = false;
      saveButton.disabled = false;
      button.textContent = label;
    }
  }

  exportButton.addEventListener("click", () => {
    runButton(
      exportButton,
      "导出中文 Markdown",
      async () => {
        const { article, token } = getCredentials();
        const draft = await buildDraft(article, token);

        if (!draft) return;

        downloadMarkdown(article, draft.markdown);

        alert(
          "中文草稿已导出。\n" +
          "总区块：" + draft.count + "\n" +
          "待检查项目：" + draft.warnings.length +
          "\n\n仍为 draft: true，未公开发布。"
        );
      }
    );
  });

  saveButton.addEventListener("click", () => {
    runButton(
      saveButton,
      "保存中文草稿到 GitHub",
      async () => {
        const { article, token } = getCredentials();
        const draft = await buildDraft(article, token);

        if (!draft) return;

        const warningText = draft.warnings.length
          ? "\n自动检查发现 " +
            draft.warnings.length +
            " 项需要人工处理。"
          : "\n未发现自动检查提示。";

        const confirmed = confirm(
          "准备把中文版保存为 GitHub 草稿。\n" +
          "文章：" + article +
          "\n区块：" + draft.count +
          warningText +
          "\n\n这不是正式发布。" +
          "\n保存前请确认译文已检查，" +
          "且没有尚未保存的编辑内容。" +
          "\n\n是否继续？"
        );

        if (!confirmed) return;

        const adminToken = prompt(
          "请输入 PUBLISH_ADMIN_TOKEN " +
          "的密钥值：\n" +
          "不要输入 GitHub Token。"
        );

        if (adminToken === null) return;

        if (!adminToken.trim()) {
          throw new Error("未输入发布管理员密钥");
        }

        const response = await fetch(
          "/api/publish-translation",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Publish-Admin-Token": adminToken
            },
            body: JSON.stringify({
              article,
              markdown: draft.markdown
            }),
            cache: "no-store"
          }
        );

        const result = await response.json();

        if (!response.ok) {
          if (response.status === 409) {
            throw new Error(
              "GitHub 已有同名文件或发生冲突，" +
              "未覆盖原文件。"
            );
          }

          throw new Error(
            result.error ||
            "保存失败，HTTP " + response.status
          );
        }

        if (result.status !== "draft_created") {
          throw new Error("保存结果异常");
        }

        alert(
          "中文版草稿已保存到 GitHub！\n" +
          "文件：" + result.path +
          "\n\n注意：draft: true，" +
          "尚未公开发布。"
        );
      }
    );
  });
})();
