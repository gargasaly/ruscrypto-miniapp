export type TokenUnlockFallback = {
  nextUnlockDate: string | null;
  nextUnlockPercent: number | null;
  unlockedPercent: number | null;
  lockedPercent: number | null;
  note: string;
};

export type TokenMetadata = {
  coingeckoId: string;
  projectSummaryRu: string;
  sectorRiskRu: string;
  sectorRu: string;
  symbol: string;
  unlocks: TokenUnlockFallback | null;
};

export const tokenMetadataById: Record<string, TokenMetadata> = {
  bitcoin: {
    coingeckoId: "bitcoin",
    projectSummaryRu:
      "Bitcoin — базовый актив крипторынка и главный ориентир для оценки общего режима риска.",
    sectorRiskRu:
      "Главный риск — макро-фон, ликвидность, ETF-потоки и реакция рынка на ключевые уровни.",
    sectorRu: "Базовый актив / Store of value",
    symbol: "BTC",
    unlocks: null,
  },
  ethereum: {
    coingeckoId: "ethereum",
    projectSummaryRu:
      "Ethereum — инфраструктура для DeFi, L2, токенов и смарт-контрактов.",
    sectorRiskRu:
      "Риски связаны с конкуренцией L1/L2, комиссиями, регулированием и темпом активности в DeFi.",
    sectorRu: "Smart contracts / L1",
    symbol: "ETH",
    unlocks: null,
  },
  "the-open-network": {
    coingeckoId: "the-open-network",
    projectSummaryRu:
      "TON — экосистема вокруг Telegram, платежей и Mini Apps с фокусом на массовый UX.",
    sectorRiskRu:
      "Риск сектора — зависимость от реальной активности приложений, регуляторного фона и устойчивости спроса.",
    sectorRu: "L1 / Telegram ecosystem",
    symbol: "TON",
    unlocks: null,
  },
  "ondo-finance": {
    coingeckoId: "ondo-finance",
    projectSummaryRu:
      "Ondo — заметный RWA-проект, связанный с токенизацией финансовых инструментов.",
    sectorRiskRu:
      "RWA чувствителен к регулированию, качеству базовых активов, ставкам и доверию к инфраструктуре.",
    sectorRu: "RWA",
    symbol: "ONDO",
    unlocks: null,
  },
  ripple: {
    coingeckoId: "ripple",
    projectSummaryRu:
      "XRP — крупный платёжный актив с сильной зависимостью от новостей, юридического фона и рыночной ликвидности.",
    sectorRiskRu:
      "Риск сектора — регуляторные события, концентрация внимания вокруг новостей и резкие движения на эмоциях.",
    sectorRu: "Payments",
    symbol: "XRP",
    unlocks: null,
  },
  "render-token": {
    coingeckoId: "render-token",
    projectSummaryRu:
      "Render — DePIN/AI-проект, связанный с распределёнными вычислительными ресурсами для графики и AI-задач.",
    sectorRiskRu:
      "AI и DePIN часто двигаются волнами интереса, поэтому важно отделять реальное использование от перегретого нарратива.",
    sectorRu: "AI / DePIN",
    symbol: "RNDR",
    unlocks: null,
  },
  sui: {
    coingeckoId: "sui",
    projectSummaryRu:
      "Sui — быстрая L1-сеть с активной экосистемой, DeFi и потребительскими приложениями.",
    sectorRiskRu:
      "L1-проекты зависят от активности разработчиков, ликвидности экосистемы, unlocks и конкуренции с другими сетями.",
    sectorRu: "L1",
    symbol: "SUI",
    unlocks: null,
  },
  bittensor: {
    coingeckoId: "bittensor",
    projectSummaryRu:
      "Bittensor — AI-сеть с собственной экономикой подсетей и сложной технической моделью.",
    sectorRiskRu:
      "AI-активы волатильны: рынок быстро переоценивает ожидания, а техническую ценность сложно проверить новичку.",
    sectorRu: "AI",
    symbol: "TAO",
    unlocks: null,
  },
  solana: {
    coingeckoId: "solana",
    projectSummaryRu:
      "Solana — крупная L1-экосистема с высокой активностью, DeFi, мемкоинами и потребительскими приложениями.",
    sectorRiskRu:
      "Риски — перегрузка сети, качество приложений, концентрация ликвидности и зависимость от рыночного аппетита к риску.",
    sectorRu: "L1",
    symbol: "SOL",
    unlocks: null,
  },
  aave: {
    coingeckoId: "aave",
    projectSummaryRu:
      "Aave — один из ключевых DeFi-протоколов кредитования и займов.",
    sectorRiskRu:
      "DeFi зависит от TVL, качества залогов, ликвидаций, ставок и риска смарт-контрактов.",
    sectorRu: "DeFi lending",
    symbol: "AAVE",
    unlocks: null,
  },
  "avalanche-2": {
    coingeckoId: "avalanche-2",
    projectSummaryRu:
      "Avalanche — L1-экосистема с Subnets: отдельными сетями для приложений, кастомных правил и compliance.",
    sectorRiskRu:
      "Риск — конкуренция L1, спрос на Subnets, активность разработчиков и реальное использование подсетей.",
    sectorRu: "L1 / Subnets",
    symbol: "AVAX",
    unlocks: null,
  },
  near: {
    coingeckoId: "near",
    projectSummaryRu:
      "NEAR Protocol — L1-платформа с фокусом на chain abstraction, удобный UX и приложения без ручного выбора сети.",
    sectorRiskRu:
      "Риск — конкуренция L1, скорость adoption, качество приложений и способность упростить UX без потери безопасности.",
    sectorRu: "L1 / Chain Abstraction",
    symbol: "NEAR",
    unlocks: null,
  },
  binancecoin: {
    coingeckoId: "binancecoin",
    projectSummaryRu:
      "BNB — экосистемный актив Binance и BNB Chain, связанный с биржевой активностью и сетевыми комиссиями.",
    sectorRiskRu:
      "Главные риски — регуляторный фон вокруг бирж, зависимость от Binance и активность BNB Chain.",
    sectorRu: "Exchange ecosystem",
    symbol: "BNB",
    unlocks: null,
  },
  chainlink: {
    coingeckoId: "chainlink",
    projectSummaryRu:
      "Chainlink — инфраструктура оракулов и передачи данных для DeFi, RWA и межсетевых сценариев.",
    sectorRiskRu:
      "Инфраструктурные проекты оценивают через adoption, fees, TVS и устойчивость спроса на сервисы.",
    sectorRu: "Oracles / Infrastructure",
    symbol: "LINK",
    unlocks: null,
  },
  hyperliquid: {
    coingeckoId: "hyperliquid",
    projectSummaryRu:
      "Hyperliquid — DeFi-инфраструктура для перпетуалов и активной торговли.",
    sectorRiskRu:
      "Сектор чувствителен к волатильности, риску ликвидаций, притоку трейдеров и устойчивости протокола.",
    sectorRu: "DeFi / Perps",
    symbol: "HYPE",
    unlocks: null,
  },
  uniswap: {
    coingeckoId: "uniswap",
    projectSummaryRu:
      "Uniswap — крупный DEX-протокол для обмена токенов и ликвидности в DeFi.",
    sectorRiskRu:
      "DEX-конкуренция, регулирование, комиссии и распределение ценности между протоколом и токеном остаются ключевыми рисками.",
    sectorRu: "DeFi / DEX",
    symbol: "UNI",
    unlocks: null,
  },
  "jupiter-exchange-solana": {
    coingeckoId: "jupiter-exchange-solana",
    projectSummaryRu:
      "Jupiter — агрегатор и DeFi-инфраструктура в экосистеме Solana.",
    sectorRiskRu:
      "Риск — конкуренция внутри Solana DeFi, зависимость от оборотов, стимулов и активности пользователей.",
    sectorRu: "Solana DeFi",
    symbol: "JUP",
    unlocks: null,
  },
  pendle: {
    coingeckoId: "pendle",
    projectSummaryRu:
      "Pendle — DeFi-протокол для работы с будущей доходностью и сложными yield-инструментами.",
    sectorRiskRu:
      "Риск — сложность механики, зависимость от доходностей, ликвидности пулов и DeFi-настроения.",
    sectorRu: "DeFi yield",
    symbol: "PENDLE",
    unlocks: null,
  },
  ethena: {
    coingeckoId: "ethena",
    projectSummaryRu:
      "Ethena — инфраструктура синтетического доллара и доходности через рыночные стратегии.",
    sectorRiskRu:
      "Риск — устойчивость стратегии, funding, ликвидность, стресс на рынке и доверие к механике обеспечения.",
    sectorRu: "Stablecoin / DeFi",
    symbol: "ENA",
    unlocks: null,
  },
};

export function getTokenMetadata(coingeckoId: string) {
  return tokenMetadataById[coingeckoId] ?? null;
}
