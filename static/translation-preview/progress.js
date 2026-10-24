
(() => {
  "use strict";

  const articleInput = document.getElementById("article");
  const tokenInput = document.getElementById("token");
  const panel = document.querySelector("section.panel");

  if (!articleInput || !tokenInput || !panel) return;

  const progressButton = document.createElement("button");
  progressButton.type = "button";
  progressButton.textContent = "查看全文翻译进度";

  const generateButton = document.createElement("button");
  generateButton.type = "button";
  generateButton.textContent = "生成全文中文草稿";
  generateButton.disabled = true;

  const stopButton = document.createElement("button");
  stopButton.type = "button";
  stopButton.textContent = "停止翻译";
  stopButton.disabled = true;

  const summary = document.createElement("section");
  summary.setAttribute("aria-live", "polite");
  summary.hidden = true;

  Object.assign(summary.style, {
    background: "#ffffff",
    border: "1px solid #e8e2da",
    borderRadius: "12px",
    padding: "22px",
    marginBottom: "18px",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere"
  });

  panel.append(progressButton, generateButton, stopButton);
  panel.after(summary);

  let active = false;
  let stopped = false;
  let controller = null;
  let loadedArticle = "";
  let latestProgress = null;

  const labels = [
    ["approved", "审核通过"],
    ["edited", "人工修改待审核"],
    ["machineTranslated", "机器译文待审核"],
    ["untranslated", "尚未翻译"],
    ["noTranslationRequired", "无需机器翻译"]
  ];

  function credentials() {
    const article = articleInput.value.trim();
    const token = tokenInput.value;

    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article) ||
      article.length > 100 ||
      !token
    ) {
      throw new Error(
        "请先填写正确的文章 Slug 和测试密钥。"
      );
    }

    return { article, token };
  }

  function controls() {
    progressButton.disabled = active;
    generateButton.disabled =
      active ||
      !latestProgress ||
      loadedArticle !== articleInput.value.trim();

    stopButton.disabled = !active;
  }

  function show(text) {
    summary.hidden = false;
    summary.textContent = text;
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
        data.error || "请求失败，HTTP " + response.status
      );
    }

    return data;
  }

  async function readProgress(article, token, signal) {
    const data = await request(
      "/api/translation-progress?article=" +
      encodeURIComponent(article),
      token,
      signal
    );

    if (
      !data.counts ||
      !Number.isInteger(data.counts.total) ||
      !Array.isArray(data.pending)
    ) {
      throw new Error("全文进度数据格式不正确。");
    }

    return data;
  }

  function progressText(data) {
    const lines = [
      "全文翻译进度",
      "",
      "文章：" + data.article,
      "总区块：" + data.counts.total,
      ""
    ];

    for (const [key, label] of labels) {
      lines.push(
        label + "：" + (data.counts[key] ?? 0)
      );
    }

    const pending = data.pending
      .map(item => item.id)
      .filter(Boolean);

    if (pending.length) {
      lines.push("");
      lines.push("尚未翻译的区块：" + pending.join("、"));
    }

    lines.push("");
    lines.push("当前仅为内部草稿，尚未公开发布。");

    return lines.join("\n");
  }

  function remember(data, article) {
    latestProgress = data;
    loadedArticle = article;
    controls();
  }

  async function refreshProgress() {
    if (active) return;

    try {
      const { article, token } = credentials();

      progressButton.disabled = true;
      show("正在统计全文翻译进度……");

      const data = await readProgress(article, token);

      remember(data, article);
      show(progressText(data));

    } catch (error) {
      latestProgress = null;
      loadedArticle = "";
      show("读取失败：" + error.message);

    } finally {
      controls();
    }
  }

  async function generateFullDraft() {
    if (active) return;

    let auth;

    try {
      auth = credentials();
    } catch (error) {
      show(error.message);
      return;
    }

    if (
      !latestProgress ||
      loadedArticle !== auth.article
    ) {
      show("请先点击「查看全文翻译进度」。");
      return;
    }

    const confirmed = confirm(
      "将自动翻译此文章尚未完成的区块，" +
      "调用 Cloudflare Workers AI 并可能消耗额度。" +
      "已有人工修改和审核记录不会被覆盖。" +
      "确定开始吗？"
    );

    if (!confirmed) return;

    active = true;
    stopped = false;
    controller = new AbortController();
    controls();

    const { article, token } = auth;
    const failed = [];
    const attemptedBatches = new Set();
    let processed = 0;
    let finalMessage = "";

    try {
      // Use a fresh snapshot of the progress data.
      const initial = await readProgress(
        article,
        token,
        controller.signal
      );

      const starts = [];

      for (const item of initial.pending) {
        if (!/^block-\d+$/.test(item.id || "")) {
          failed.push(
            `${item.id || "未知区块"}：需要人工处理`
          );
          continue;
        }

        const index = Number(item.id.slice(6));

        // Translation endpoint processes two blocks.
        const batchStart = Math.floor(index / 2) * 2;

        if (!attemptedBatches.has(batchStart)) {
          attemptedBatches.add(batchStart);
          starts.push(batchStart);
        }
      }

      starts.sort((a, b) => a - b);

      // Each batch is attempted only once.
      for (let i = 0; i < starts.length; i++) {
        if (stopped) break;

        const batchStart = starts[i];

        show(
          "正在生成全文中文草稿……\n\n" +
          `处理批次：${i + 1} / ${starts.length}\n` +
          `当前区块：${batchStart}–${batchStart + 1}\n` +
          `已完成批次：${processed}\n` +
          `需要人工处理：${failed.length}\n\n` +
          "你可以点击「停止翻译」。"
        );

        let data;

        try {
          data = await request(
            "/api/translate-batch?article=" +
            encodeURIComponent(article) +
            "&start=" + batchStart,
            token,
            controller.signal
          );

          if (!Array.isArray(data.results)) {
            throw new Error("翻译结果格式不正确");
          }

          for (const item of data.results) {
            if (
              item.status === "needs_review" ||
              item.status === "translation_failed"
            ) {
              failed.push(
                `${item.id}：${item.status}`
              );
            }
          }

        } catch (error) {
          if (stopped || error.name === "AbortError") {
            break;
          }

          failed.push(
            `批次 ${batchStart}：${error.message}`
          );
        }

        processed++;
      }

      if (stopped) {
        finalMessage = "已停止全文翻译。";
      } else {
        finalMessage = "本次全文翻译处理结束。";
      }

    } catch (error) {
      finalMessage = stopped
        ? "已停止全文翻译。"
        : "处理已中断：" + error.message;

    } finally {
      active = false;
      controller = null;

      // Refresh progress even after stopping.
      try {
        const updated = await readProgress(article, token);
        remember(updated, article);

        show(
          finalMessage +
          "\n\n已处理批次：" + processed +
          "\n\n" +
          progressText(updated) +
          (failed.length
            ? "\n\n需要人工检查：\n" +
              failed.join("\n")
            : "") +
          "\n\n请点击「读取审校数据」查看最新译文。"
        );

      } catch (error) {
        show(
          finalMessage +
          "\n进度刷新失败：" + error.message +
          "\n已处理批次：" + processed +
          (failed.length
            ? "\n需要人工检查：\n" +
              failed.join("\n")
            : "")
        );
      }

      controls();
    }
  }

  progressButton.addEventListener(
    "click",
    refreshProgress
  );

  generateButton.addEventListener(
    "click",
    generateFullDraft
  );

  stopButton.addEventListener("click", () => {
    if (!active) return;

    stopped = true;
    stopButton.disabled = true;
    show("正在停止，不会再启动下一批翻译……");

    // Stop waiting for the current request.
    // A request already received by the server
    // might still finish and save its result.
    controller?.abort();
  });

  articleInput.addEventListener("input", () => {
    latestProgress = null;
    loadedArticle = "";
    controls();
  });

  tokenInput.addEventListener("input", () => {
    latestProgress = null;
    loadedArticle = "";
    controls();
  });

  controls();
})();
