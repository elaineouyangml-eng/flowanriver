
import {
  hashVerificationToken
} from "../../_lib/letters-crypto.js";

const headers = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy":
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
};

const messages = {
  en: {
    confirmTitle: "A Letter to Your Future Self",
    confirmDescription:
      "Your letter is ready. Please confirm your email, and it will find its way back to you on the day you chose.",
    confirmButton: "Confirm & Seal My Letter",
    successTitle: "Your Letter Is Sealed",
    successDescription:
      "Your email has been confirmed. Your letter is safely sealed, waiting for the day you meet again.",
    expiredTitle: "Link Expired or Already Used",
    expiredDescription:
      "This confirmation link is no longer available. If you haven't confirmed your letter, please return to Flowanriver.",
    invalidTitle: "Invalid Link",
    invalidDescription:
      "This confirmation link is not valid.",
    unavailableTitle: "Temporarily Unavailable",
    unavailableDescription: "Please try again later.",
    requestTitle: "Invalid Request",
    requestDescription:
      "The confirmation could not be processed.",
    errorTitle: "Something Went Wrong",
    errorDescription:
      "We couldn't confirm your letter. Please try again.",
    back: "Letters to the Future"
  },

  zh: {
    confirmTitle: "一封写给未来自己的信",
    confirmDescription:
      "你的信已经准备好了。请确认邮箱，它会在你选择的日子重新来到你身边。",
    confirmButton: "确认并封存",
    successTitle: "你的信，已封存",
    successDescription:
      "邮箱确认成功。你的信已经妥善封存，等待与你再次相逢的那一天。",
    expiredTitle: "确认链接已失效或已使用",
    expiredDescription:
      "此确认链接已无法使用。如果你还没有确认信件，请返回 Flowanriver 重新提交。",
    invalidTitle: "无效的确认链接",
    invalidDescription: "这条邮箱确认链接无效。",
    unavailableTitle: "暂时无法使用",
    unavailableDescription: "请稍后再试。",
    requestTitle: "请求无效",
    requestDescription: "暂时无法处理这次确认请求。",
    errorTitle: "出现了一点问题",
    errorDescription: "目前无法确认这封信，请稍后重试。",
    back: "写给未来的自己"
  },

  ko: {
    confirmTitle: "미래의 나에게 쓰는 편지",
    confirmDescription:
      "편지가 준비되었습니다. 이메일 주소를 확인하면 선택하신 날에 편지가 다시 당신을 찾아갑니다.",
    confirmButton: "확인하고 편지 봉인하기",
    successTitle: "편지가 봉인되었습니다",
    successDescription:
      "이메일 인증이 완료되었습니다. 편지는 안전하게 보관되며, 다시 만날 날을 기다립니다.",
    expiredTitle: "만료되었거나 이미 사용된 링크",
    expiredDescription:
      "이 확인 링크는 더 이상 사용할 수 없습니다. 아직 편지를 확인하지 않으셨다면 Flowanriver에서 다시 제출해 주세요.",
    invalidTitle: "유효하지 않은 링크",
    invalidDescription:
      "올바르지 않은 이메일 확인 링크입니다.",
    unavailableTitle: "일시적으로 이용할 수 없습니다",
    unavailableDescription: "잠시 후 다시 시도해 주세요.",
    requestTitle: "잘못된 요청",
    requestDescription:
      "확인 요청을 처리할 수 없습니다.",
    errorTitle: "문제가 발생했습니다",
    errorDescription:
      "편지를 확인하지 못했습니다. 다시 시도해 주세요.",
    back: "미래의 나에게 쓰는 편지"
  },

  vi: {
    confirmTitle: "Lá thư gửi đến tương lai",
    confirmDescription:
      "Lá thư của bạn đã sẵn sàng. Hãy xác nhận địa chỉ email để lá thư quay về bên bạn vào ngày đã chọn.",
    confirmButton: "Xác nhận và niêm phong lá thư",
    successTitle: "Lá thư đã được niêm phong",
    successDescription:
      "Email của bạn đã được xác nhận. Lá thư được lưu giữ an toàn và chờ đến ngày gặp lại bạn.",
    expiredTitle: "Liên kết đã hết hạn hoặc đã sử dụng",
    expiredDescription:
      "Liên kết xác nhận này không còn khả dụng. Nếu bạn chưa xác nhận lá thư, vui lòng quay lại Flowanriver để gửi lại.",
    invalidTitle: "Liên kết không hợp lệ",
    invalidDescription:
      "Liên kết xác nhận email này không hợp lệ.",
    unavailableTitle: "Tạm thời không khả dụng",
    unavailableDescription: "Vui lòng thử lại sau.",
    requestTitle: "Yêu cầu không hợp lệ",
    requestDescription:
      "Không thể xử lý yêu cầu xác nhận.",
    errorTitle: "Đã xảy ra lỗi",
    errorDescription:
      "Không thể xác nhận lá thư. Vui lòng thử lại.",
    back: "Lá thư gửi đến tương lai"
  },

  fil: {
    confirmTitle: "Liham para sa Hinaharap",
    confirmDescription:
      "Handa na ang iyong liham. Kumpirmahin ang iyong email upang matanggap mo ito sa araw na pinili mo.",
    confirmButton: "Kumpirmahin at Selyuhan ang Liham",
    successTitle: "Naselyuhan na ang Iyong Liham",
    successDescription:
      "Nakumpirma na ang iyong email. Ligtas na nakaimbak ang liham at naghihintay sa araw ng inyong muling pagkikita.",
    expiredTitle: "Nag-expire o Nagamit na ang Link",
    expiredDescription:
      "Hindi na magagamit ang confirmation link na ito. Kung hindi mo pa nakumpirma ang liham, bumalik sa Flowanriver at isumite itong muli.",
    invalidTitle: "Hindi Wastong Link",
    invalidDescription:
      "Hindi wasto ang email confirmation link na ito.",
    unavailableTitle: "Pansamantalang Hindi Magagamit",
    unavailableDescription: "Pakisubukang muli mamaya.",
    requestTitle: "Hindi Wastong Request",
    requestDescription:
      "Hindi maproseso ang confirmation request.",
    errorTitle: "May Nangyaring Problema",
    errorDescription:
      "Hindi namin makumpirma ang liham. Pakisubukang muli.",
    back: "Liham para sa Hinaharap"
  },

  ja: {
    confirmTitle: "未来の自分への手紙",
    confirmDescription:
      "手紙の準備が整いました。メールアドレスを確認すると、あなたが選んだ日に手紙が届くよう予約されます。",
    confirmButton: "確認して手紙を封じる",
    successTitle: "手紙を封じました",
    successDescription:
      "メールアドレスの確認が完了しました。手紙は大切に保管され、再びあなたに届く日を待っています。",
    expiredTitle: "リンクの有効期限が切れているか、使用済みです",
    expiredDescription:
      "この確認リンクは使用できません。まだ手紙の確認が完了していない場合は、Flowanriverに戻って再度送信してください。",
    invalidTitle: "無効なリンク",
    invalidDescription:
      "このメール確認リンクは無効です。",
    unavailableTitle: "現在ご利用いただけません",
    unavailableDescription:
      "しばらくしてからもう一度お試しください。",
    requestTitle: "無効なリクエスト",
    requestDescription:
      "確認リクエストを処理できませんでした。",
    errorTitle: "問題が発生しました",
    errorDescription:
      "手紙を確認できませんでした。もう一度お試しください。",
    back: "未来の自分へ手紙を"
  }
};

const languagePaths = {
  en: "/letters/",
  zh: "/zh/letters/",
  ko: "/ko/letters/",
  vi: "/vi/letters/",
  fil: "/fil/letters/",
  ja: "/ja/letters/"
};

const htmlLanguages = {
  en: "en",
  zh: "zh-CN",
  ko: "ko-KR",
  vi: "vi-VN",
  fil: "fil-PH",
  ja: "ja-JP"
};

function normalizeLanguage(value) {
  const language = String(value || "en")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");

  if (
    language === "zh" ||
    language.startsWith("zh-")
  ) {
    return "zh";
  }

  if (
    language === "ko" ||
    language.startsWith("ko-")
  ) {
    return "ko";
  }

  if (
    language === "vi" ||
    language.startsWith("vi-")
  ) {
    return "vi";
  }

  if (
    language === "fil" ||
    language.startsWith("fil-") ||
    language === "tl" ||
    language.startsWith("tl-")
  ) {
    return "fil";
  }

  if (
    language === "ja" ||
    language.startsWith("ja-")
  ) {
    return "ja";
  }

  return "en";
}

function page(language, type, fields = "") {
  const lang = normalizeLanguage(language);
  const t = messages[lang];

  const title = t[type + "Title"];
  const description = t[type + "Description"];

  const button = type === "confirm"
    ? t.confirmButton
    : "";

  const backUrl = languagePaths[lang];
  const htmlLang = htmlLanguages[lang];

  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title} | Flowanriver</title>
<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background: #f5f1e9;
  color: #435c4d;
  font-family:
    Georgia,
    "Noto Serif",
    "Noto Serif SC",
    "Noto Serif KR",
    "Noto Serif JP",
    serif;
  display: grid;
  place-items: center;
  padding: 24px;
}

.card {
  width: 100%;
  max-width: 560px;
  background: #fffdfa;
  border: 1px solid #dce4d8;
  border-radius: 24px;
  padding: 48px 32px;
  text-align: center;
}

.brand {
  color: #718674;
  font-size: 12px;
  letter-spacing: 2px;
}

h1 {
  font-size: 30px;
  line-height: 1.45;
  font-weight: 500;
}

p {
  font-size: 17px;
  line-height: 1.85;
}

button {
  background: #617969;
  color: white;
  padding: 14px 32px;
  border: 0;
  border-radius: 30px;
  font-size: 16px;
  line-height: 1.6;
  cursor: pointer;
}

button:hover {
  background: #4d6552;
}

button:focus-visible,
a:focus-visible {
  outline: 3px solid #8eaa94;
  outline-offset: 4px;
}

a {
  color: #435c4d;
  text-decoration: underline;
  text-underline-offset: 4px;
}

.back {
  margin-top: 28px;
  font-size: 14px;
}

@media (max-width: 600px) {
  .card {
    padding: 36px 22px;
  }

  h1 {
    font-size: 25px;
  }

  p {
    font-size: 15px;
  }

  button {
    max-width: 100%;
  }
}
</style>
</head>
<body>
<main class="card">
<p class="brand">✉ FLOWANRIVER</p>

<h1>${title}</h1>

<p>${description}</p>

${button
  ? `<form action="/api/letters/verify" method="POST">
${fields}
<button type="submit">${button}</button>
</form>`
  : ""}

<p class="back">
  <a href="${backUrl}">${t.back}</a>
</p>
</main>
</body>
</html>`;
}

function html(content, status = 200) {
  return new Response(content, {
    status,
    headers
  });
}

function validParams(id, token) {
  return (
    /^[0-9a-f-]{36}$/i.test(id || "") &&
    /^[0-9a-f]{64}$/i.test(token || "")
  );
}

async function getLetter(env, id) {
  if (!env.DB) {
    throw new Error("Database unavailable");
  }

  return env.DB.prepare(`
    SELECT
      language,
      status,
      verification_token_hash,
      verification_expires_at
    FROM letters
    WHERE id = ?
  `).bind(id).first();
}

// GET displays the confirmation page.
// Opening the link does not schedule the letter.
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);

  const id = url.searchParams.get("id");
  const token = url.searchParams.get("token");

  if (!validParams(id, token)) {
    return html(page("en", "invalid"), 400);
  }

  try {
    const letter = await getLetter(env, id);

    if (!letter) {
      return html(page("en", "invalid"), 400);
    }

    const language = normalizeLanguage(
      letter.language
    );

    const tokenHash = await hashVerificationToken(
      token
    );

    const expires = Date.parse(
      letter.verification_expires_at || ""
    );

    if (
      letter.status !== "pending_verification" ||
      letter.verification_token_hash !== tokenHash ||
      !Number.isFinite(expires) ||
      expires <= Date.now()
    ) {
      return html(
        page(language, "expired"),
        400
      );
    }

    // Parameters are validated before insertion
    // into the hidden confirmation form.
    const fields = `
<input
  type="hidden"
  name="id"
  value="${id}">
<input
  type="hidden"
  name="token"
  value="${token}">`;

    return html(
      page(language, "confirm", fields)
    );
  } catch {
    return html(
      page("en", "unavailable"),
      503
    );
  }
}

// POST explicitly confirms the email and schedules the letter.
export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    return html(
      page("en", "unavailable"),
      503
    );
  }

  const length = Number(
    request.headers.get("Content-Length") || 0
  );

  if (
    !Number.isFinite(length) ||
    length > 4096
  ) {
    return html(
      page("en", "request"),
      413
    );
  }

  let id;
  let token;

  try {
    const data = await request.formData();
    id = data.get("id");
    token = data.get("token");
  } catch {
    return html(
      page("en", "request"),
      400
    );
  }

  if (
    typeof id !== "string" ||
    typeof token !== "string" ||
    !validParams(id, token)
  ) {
    return html(
      page("en", "invalid"),
      400
    );
  }

  try {
    const letter = await getLetter(env, id);

    if (!letter) {
      return html(
        page("en", "invalid"),
        400
      );
    }

    const language = normalizeLanguage(
      letter.language
    );

    const tokenHash = await hashVerificationToken(
      token
    );

    const now = new Date().toISOString();

    // Atomic confirmation:
    // only a valid, unused and unexpired token
    // may schedule the letter.
    const result = await env.DB.prepare(`
      UPDATE letters
      SET
        status = 'scheduled',
        verified_at = ?,
        verification_token_hash = NULL,
        verification_expires_at = NULL
      WHERE id = ?
        AND verification_token_hash = ?
        AND status = 'pending_verification'
        AND verification_expires_at > ?
    `).bind(
      now,
      id,
      tokenHash,
      now
    ).run();

    if (result.meta?.changes !== 1) {
      return html(
        page(language, "expired"),
        400
      );
    }

    return html(
      page(language, "success")
    );
  } catch {
    return html(
      page("en", "error"),
      503
    );
  }
}
