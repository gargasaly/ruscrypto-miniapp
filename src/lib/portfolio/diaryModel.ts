export type PortfolioDiaryCategory = "ai" | "core" | "satellite";

export type PortfolioRangeStatus = "above_range" | "below_range" | "in_range";

export type PortfolioDiaryAsset = {
  actionHint?: string;
  category: PortfolioDiaryCategory;
  categoryLabel: string;
  groupId?: "ai-block";
  groupLabel?: string;
  groupMaxWeight?: number;
  groupMinWeight?: number;
  groupTargetWeight?: number;
  maxWeight: number;
  minWeight: number;
  name: string;
  role: "core" | "satellite";
  symbol: string;
  targetWeight: number;
  thesis: string;
};

export type PortfolioDiaryExcludedAsset = {
  action: string;
  reason: string;
  symbol: string;
};

export type PortfolioDiaryWatchlistAsset = {
  note?: string;
  symbol: string;
};

export const portfolioModelVersion = "2026-06-23-risk-off-2028" as const;

export const portfolioModelMeta = {
  horizon: "до 2028",
  marketMode: "риск-офф",
  versionDate: "23.06.2026",
} as const;

export const portfolioDiaryModel: readonly PortfolioDiaryAsset[] = [
  {
    category: "core",
    categoryLabel: "Core",
    maxWeight: 33,
    minWeight: 28,
    name: "Bitcoin",
    role: "core",
    symbol: "BTC",
    targetWeight: 30,
    thesis: "Оборона, ETF-спрос, якорь портфеля.",
  },
  {
    category: "core",
    categoryLabel: "Core",
    maxWeight: 23,
    minWeight: 17,
    name: "Ethereum",
    role: "core",
    symbol: "ETH",
    targetWeight: 20,
    thesis: "Settlement-слой, но слабее BTC в риск-офф режиме.",
  },
  {
    category: "core",
    categoryLabel: "Core",
    maxWeight: 11,
    minWeight: 6,
    name: "Solana",
    role: "core",
    symbol: "SOL",
    targetWeight: 8.5,
    thesis: "Alpenglow Q3 2026 и ядро L1-экспозиции.",
  },
  {
    category: "satellite",
    categoryLabel: "Satellite",
    maxWeight: 8,
    minWeight: 4,
    name: "Aave",
    role: "satellite",
    symbol: "AAVE",
    targetWeight: 6,
    thesis: "Постоянный выкуп около $50M/год и V4.",
  },
  {
    category: "satellite",
    categoryLabel: "Satellite",
    maxWeight: 8,
    minWeight: 4,
    name: "Hyperliquid",
    role: "satellite",
    symbol: "HYPE",
    targetWeight: 6,
    thesis: "Сильный buyback, но разлоки нужно проверять 6-го числа.",
  },
  {
    category: "core",
    categoryLabel: "Core",
    maxWeight: 6.5,
    minWeight: 4,
    name: "Chainlink",
    role: "core",
    symbol: "LINK",
    targetWeight: 5,
    thesis: "Инфраструктура с медленным, но реальным value capture.",
  },
  {
    category: "satellite",
    categoryLabel: "Satellite",
    maxWeight: 6.5,
    minWeight: 3.5,
    name: "Uniswap",
    role: "satellite",
    symbol: "UNI",
    targetWeight: 5,
    thesis: "Fee switch + сжигание могут дать re-rate.",
  },
  {
    category: "core",
    categoryLabel: "Core",
    maxWeight: 4,
    minWeight: 2,
    name: "BNB",
    role: "core",
    symbol: "BNB",
    targetWeight: 3,
    thesis: "Проект живой, но есть регуляторный навес MiCA/Binance.",
  },
  {
    category: "ai",
    categoryLabel: "AI-блок",
    groupId: "ai-block",
    groupLabel: "TAO + RENDER",
    groupMaxWeight: 5,
    groupMinWeight: 1.5,
    groupTargetWeight: 3,
    maxWeight: 5,
    minWeight: 1.5,
    name: "Bittensor",
    role: "satellite",
    symbol: "TAO",
    targetWeight: 2,
    thesis: "Часть AI-блока: supply-cap 21M, но впереди разводнение.",
  },
  {
    category: "ai",
    categoryLabel: "AI-блок",
    groupId: "ai-block",
    groupLabel: "TAO + RENDER",
    groupMaxWeight: 5,
    groupMinWeight: 1.5,
    groupTargetWeight: 3,
    maxWeight: 5,
    minWeight: 1.5,
    name: "Render",
    role: "satellite",
    symbol: "RENDER",
    targetWeight: 1,
    thesis: "Часть AI-блока: меньше supply-навеса, но слабее захват выручки.",
  },
  {
    category: "satellite",
    categoryLabel: "Satellite",
    maxWeight: 4,
    minWeight: 1.25,
    name: "Ethena",
    role: "satellite",
    symbol: "ENA",
    targetWeight: 2.5,
    thesis: "Катализатор fee switch Q3 2026.",
  },
  {
    category: "satellite",
    categoryLabel: "Satellite",
    maxWeight: 4,
    minWeight: 1.25,
    name: "Jupiter",
    role: "satellite",
    symbol: "JUP",
    targetWeight: 2.5,
    thesis: "Net-zero эмиссия и выкуп.",
  },
  {
    category: "satellite",
    categoryLabel: "Satellite",
    maxWeight: 3.5,
    minWeight: 1,
    name: "Pendle",
    role: "satellite",
    symbol: "PENDLE",
    targetWeight: 2,
    thesis: "Инфраструктура доходности и выкуп.",
  },
  {
    category: "satellite",
    categoryLabel: "Satellite",
    maxWeight: 2.5,
    minWeight: 0.75,
    name: "Sky",
    role: "satellite",
    symbol: "SKY",
    targetWeight: 1.5,
    thesis: "Выручка реальна, но buyback уже снижали, добавлять осторожно.",
  },
] as const;

export type PortfolioDiarySymbol = (typeof portfolioDiaryModel)[number]["symbol"];

export const portfolioDiarySymbols = portfolioDiaryModel.map((asset) => asset.symbol);

export const portfolioDiaryCategories = [
  {
    id: "core",
    label: "Core",
    maxWeight: 77.5,
    minWeight: 57,
    targetWeight: 66.5,
  },
  {
    id: "satellite",
    label: "Satellite",
    maxWeight: 36.5,
    minWeight: 15.75,
    targetWeight: 25.5,
  },
  {
    id: "ai",
    label: "AI-блок",
    maxWeight: 5,
    minWeight: 1.5,
    targetWeight: 3,
  },
] as const satisfies ReadonlyArray<{
  id: PortfolioDiaryCategory;
  label: string;
  maxWeight: number;
  minWeight: number;
  targetWeight: number;
}>;

export const stableBufferModel = {
  label: "СТЕЙБЛ-БАФФЕР",
  maxWeight: 7,
  minWeight: 3,
  targetWeight: 5,
  thesis: "Сухой порох под просадки, а не вечная парковка.",
} as const;

export const portfolioDiaryAiBlockNote =
  "TAO и RENDER объединены в небольшой AI-блок. У них разные слабые места: TAO имеет сильнее токеномику и supply-cap 21M, но впереди разводнение; RENDER почти без навеса предложения, но слабее захват выручки. Лимит блока — 5%. Если блок перерастает лимит, первым кандидатом на фиксацию считать RENDER.";

export const portfolioDiaryExcludedAssets = [
  {
    action:
      "Не докупать. Продавать в отскоки. Высвобождаемый вес направлять по коридорам в BTC, стейбл-буфер, затем UNI/AAVE/HYPE/JUP.",
    reason:
      "ONDO выводится из базовой модели: токен слабо захватывает выручку, а впереди крупный cliff-разлок около 36% обращения 18.01.2027. План — не продавать на панике, а выходить лимитками в отскок заранее до января 2027.",
    symbol: "ONDO",
  },
  {
    action: "Не докупать. Продавать в отскоки, не на дне.",
    reason:
      "SUI выводится из активной модели: у проекта остаётся длинный разлок-хвост до 2030 года, что создаёт давление для горизонта портфеля до 2028. Идея не обнуляется, но актив больше не входит в базовый портфель.",
    symbol: "SUI",
  },
  {
    action: "Не докупать. Продавать в отскоки.",
    reason:
      "AVAX выводится из активной модели: нарратив ослаб относительно SOL, ETH и L2. Без новой волны спроса вес лучше перераспределить в более сильные направления.",
    symbol: "AVAX",
  },
] as const satisfies readonly PortfolioDiaryExcludedAsset[];

export const portfolioDiaryWatchlist = [
  { symbol: "MORPHO" },
  { symbol: "SYRUP" },
  { symbol: "AERO" },
  {
    note:
      "Идея интересная, но для возврата в портфель нужны более сильные метрики выручки, активности и понятный катализатор.",
    symbol: "NEAR",
  },
  { symbol: "TON" },
  { symbol: "XRP" },
  { symbol: "SEI" },
  { symbol: "ARB" },
  { symbol: "OP" },
  { symbol: "LDO" },
  { symbol: "JTO" },
  { symbol: "PYTH" },
] as const satisfies readonly PortfolioDiaryWatchlistAsset[];

export const portfolioDiaryWatchlistDescription =
  "Watchlist — это не список покупок. Эти активы наблюдаются без автоматической докупки. Возврат или добавление в портфель возможны только после отдельного решения и улучшения метрик.";

export const portfolioDiaryOptionalHighRiskNote =
  "PUMP — опциональная high-risk ставка вместо SUI, только если пользователь явно решит. Не добавлять в базовый портфель автоматически.";

export const portfolioDiaryControlDates = [
  {
    date: "6-е число каждого месяца",
    text: "разлок HYPE, проверять Tokenomist",
  },
  {
    date: "Q3 2026",
    text: "fee switch ENA, решение нарастить или выйти",
  },
  {
    date: "18.01.2027",
    text: "cliff-разлок ONDO около 36%, выйти заранее",
  },
  {
    date: "Весна 2028",
    text: "халвинг BTC",
  },
] as const;

const modelSymbolSet = new Set<string>(portfolioDiarySymbols);

export function normalizePortfolioDiarySymbol(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

export function isPortfolioDiarySymbol(value: unknown): value is PortfolioDiarySymbol {
  return modelSymbolSet.has(normalizePortfolioDiarySymbol(value));
}

export function getPortfolioRangeStatus(
  currentWeight: number,
  minWeight: number,
  maxWeight: number,
): PortfolioRangeStatus {
  if (currentWeight < minWeight) {
    return "below_range";
  }

  if (currentWeight > maxWeight) {
    return "above_range";
  }

  return "in_range";
}

export function getPortfolioRangeActionHint(status: PortfolioRangeStatus) {
  if (status === "below_range") {
    return "Ниже коридора: кандидат на докупку, если тезис жив и рынок позволяет";
  }

  if (status === "above_range") {
    return "Выше коридора: не докупать; продажа только при перегреве, ухудшении тезиса или отдельном решении";
  }

  return "Внутри коридора: держать, без принудительных действий";
}
