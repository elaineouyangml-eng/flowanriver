
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
        throw new Error("读取失败：" + response.status);
      }

      const data = await response.json();

      if (!Array.isArray(data.results)) {
        throw new Error("翻译数据格式不正确");
      }

      blocks.push(...data.results);

      if (data.complete) return blocks;

      if (
        !Number.isInteger(data.next_start) ||
        data.next_start <= start
      ) {
        throw new Error("分页数据异常");
      }

      start = data.next_start;
    }

    throw new Error("文章超出读取限制");
  }

  function convertBlock(block, warnings) {
    const original = String(block.original || "").trim();
    const translated = String(block.translated || "").trim();
    const id = block.id || "unknown";

    if (["image", "code", "html"].includes(block.type)) {
      return original;
    }

    if (block.type === "list" || block.type === "quote") {
      warnings.push(id + "：请人工检查列表或引用");
      return (
        "<!-- TODO: 检查 " + id + " -->\n" +
        original
      );
    }

    if (!translated) {
      warnings.push(id + "：缺少中文译文");
      return (
        "<!-- TODO: 翻译 " + id + " -->\n" +
        original
      );
    }

    if (original.includes("](") && !translated.includes("](")) {
      warnings.push(id + "：原文链接需要恢复");
      return (
        "<!-- TODO: 检查链接 " + id + " -->\n" +
        original + "\n\n" + translated
      );
    }

    if (block.type === "heading") {
      const level = original.startsWith("### ")
        ? "### "
        : "## ";

      return level + translated.replace(/^#{1,6}\s+/, "");
    }

    if (original.includes("**") && !translated.includes("**")) {
      warnings.push(id + "：请检查加粗格式");
    }

    return translated;
  }

  button.addEventListener("click", async () => {
    const slug = articleInput.value.trim();
    const token = tokenInput.value;

    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
      !token
    ) {
      alert("请填写文章 Slug 和测试密钥。");
      return;
    }

    button.disabled = true;
    button.textContent = "正在导出……";

    try {
      const blocks = await loadBlocks(slug, token);
      const warnings = [];

      const body = blocks
        .map(block => convertBlock(block, warnings))
        .filter(Boolean)
        .join("\n\n");

      const markdown = [
        "---",
        "title: \"中文标题待审核\"",
        "draft: true",
        "---",
        "",
        "<!-- 发布前请检查标题、日期、正文及原文链接 -->",
        "",
        body,
        "",
        "<!--",
        "人工检查：",
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
      link.download = slug + ".zh.md";

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);

      alert(
        "草稿已导出。\n" +
        "区块：" + blocks.length + "\n" +
        "需要人工检查：" + warnings.length +
        "\n\n文件仍为 draft: true，尚未公开发布。"
      );
    } catch (error) {
      alert("导出失败：" + error.message);
    } finally {
      button.disabled = false;
      button.textContent = "导出中文 Markdown";
    }
  });
})();
