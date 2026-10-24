
(() => {
  "use strict";

  const articleInput = document.getElementById("article");
  const tokenInput = document.getElementById("token");
  const panel = document.querySelector("section.panel");

  if (!articleInput || !tokenInput || !panel) {
    return;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "查看全文翻译进度";

  const summary = document.createElement("section");
  summary.setAttribute("aria-live", "polite");

  Object.assign(summary.style, {
    background: "#ffffff",
    border: "1px solid #e8e2da",
    borderRadius: "12px",
    padding: "22px",
    marginBottom: "18px",
    whiteSpace: "pre-wrap"
  });

  summary.hidden = true;

  panel.appendChild(button);
  panel.after(summary);

  const labels = [
    ["approved", "审核通过"],
    ["edited", "人工修改待审核"],
    ["machineTranslated", "机器译文待审核"],
    ["untranslated", "尚未翻译"],
    ["noTranslationRequired", "无需机器翻译"]
  ];

  button.addEventListener("click", async () => {
    const article = articleInput.value.trim();
    const token = tokenInput.value;

    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article) ||
      article.length > 100 ||
      !token
    ) {
      summary.hidden = false;
      summary.textContent =
        "请先填写正确的文章 Slug 和测试密钥。";
      return;
    }

    button.disabled = true;
    summary.hidden = false;
    summary.textContent = "正在统计全文进度……";

    try {
      const response = await fetch(
        "/api/translation-progress?article=" +
        encodeURIComponent(article),
        {
          method: "POST",
          headers: {
            "X-Translate-Test-Token": token
          },
          cache: "no-store"
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "读取失败，HTTP " + response.status
        );
      }

      if (!data.counts ||
          !Number.isInteger(data.counts.total)) {
        throw new Error("进度数据格式不正确。");
      }

      const counts = data.counts;
      const lines = [
        "全文翻译进度",
        "",
        "文章：" + article,
        "总区块：" + counts.total,
        ""
      ];

      for (const [key, label] of labels) {
        lines.push(
          label + "：" + (counts[key] ?? 0)
        );
      }

      const pendingIds = Array.isArray(data.pending)
        ? data.pending
            .map(item => item.id)
            .filter(Boolean)
        : [];

      if (pendingIds.length) {
        lines.push("");
        lines.push(
          "尚未翻译的区块：" + pendingIds.join("、")
        );
      }

      lines.push("");
      lines.push("当前为内部审校数据，尚未公开发布。");

      summary.textContent = lines.join("\n");

    } catch (error) {
      summary.textContent =
        "进度读取失败：" +
        (error.message || "未知错误");

    } finally {
      button.disabled = false;
    }
  });
})();
