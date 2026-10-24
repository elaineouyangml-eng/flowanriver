
import {
  TRANSLATION_REVIEW_RULES
} from "./translation-config.js";

function escaped(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractNumbers(text) {
  return text.match(/\d+(?:[.,]\d+)*/g) || [];
}

function extractURLs(text) {
  return text.match(/https?:\/\/[^\s<>)\]]+/g) || [];
}

export function validateTranslation(original, translated) {
  const warnings = [];

  if (
    typeof original !== "string" ||
    typeof translated !== "string" ||
    !translated.trim()
  ) {
    return {
      valid: false,
      needsReview: true,
      warnings: ["missing_or_invalid_translation"]
    };
  }

  for (const name of TRANSLATION_REVIEW_RULES.preserveNames) {
    const pattern = new RegExp(escaped(name), "i");

    if (pattern.test(original) && !pattern.test(translated)) {
      warnings.push(`name_not_preserved: ${name}`);
    }
  }

  if (TRANSLATION_REVIEW_RULES.preserveNumbers) {
    const sourceNumbers = extractNumbers(original);
    const targetNumbers = extractNumbers(translated);

    if (
      JSON.stringify(sourceNumbers) !==
      JSON.stringify(targetNumbers)
    ) {
      warnings.push("numbers_may_have_changed");
    }
  }

  if (TRANSLATION_REVIEW_RULES.preserveURLs) {
    const sourceURLs = extractURLs(original);
    const targetURLs = extractURLs(translated);

    if (
      JSON.stringify(sourceURLs) !==
      JSON.stringify(targetURLs)
    ) {
      warnings.push("urls_may_have_changed");
    }
  }

  // Meaning and tone cannot be reliably validated
  // using simple pattern matching.
  const requiresHumanReview = true;

  return {
    valid: warnings.length === 0,
    needsReview: requiresHumanReview || warnings.length > 0,
    warnings
  };
}
