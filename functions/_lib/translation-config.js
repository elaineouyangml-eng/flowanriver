
/*
 * FlowAnRiver translation configuration.
 * Shared settings for future article translation.
 *
 * This file contains no secrets.
 */

export const TRANSLATION_CONFIG = {
  sourceLanguage: "en",
  targetLanguage: "zh",
  maxBatchSize: 2,
  maxTextLength: 3000,
  cacheVersion: "v1",
  requireReviewBeforePublish: true,
  model: "@cf/meta/m2m100-1.2b"
};

export const TRANSLATION_TERMS = {
  "Pi Network": "Pi Network",
  "Open Network": "开放网络",
  "Enclosed Mainnet": "封闭主网",
  "Mainnet": "主网",
  "Whitepaper": "白皮书",
  "Consensus": "共识",
  "Stablecoin": "稳定币",
  "Smart Contract": "智能合约",
  "Blockchain": "区块链",
  "Tokenomics": "代币经济模型",
  "Artificial Intelligence": "人工智能",
  "Large Language Model": "大语言模型",
  "Generative AI": "生成式人工智能"
};
