import { toFiniteNumber } from "@/lib/formatters";

export type TokenChecklistRiskLevel = "low" | "medium" | "medium-high" | "high" | "unknown";
export type TokenUnlockConfidence = "high" | "medium" | "low" | "unknown";

export type TokenChecklistFactor = {
  label: string;
  level: TokenChecklistRiskLevel;
  text: string;
};

export type TokenChecklistScore = {
  badges: string[];
  factors: TokenChecklistFactor[];
  riskLevel: TokenChecklistRiskLevel;
  score: number;
  scoreBreakdown: Array<{
    delta: number;
    factor: string;
    reason: string;
  }>;
  verdictText: string;
  verdictTitle: string;
};

export type TokenChecklistMarket = {
  ath: number | null;
  athChangePercentage: number | null;
  circulatingSupply: number | null;
  currentPrice: number | null;
  distanceFromAth: number | null;
  image: string | null;
  marketCap: number | null;
  maxSupply: number | null;
  priceChange24h: number | null;
  priceChange7d: number | null;
  priceChange30d: number | null;
  totalSupply: number | null;
  totalVolume: number | null;
};

export type TokenTechnicalSummary = {
  ema20: number | null;
  ema50: number | null;
  near30dHighPercent: number | null;
  near90dHighPercent: number | null;
  nearLow?: number | null;
  priceVsSma20Percent: number | null;
  priceVsSma50Percent: number | null;
  rsi14: number | null;
  sma20: number | null;
  sma50: number | null;
  zoneLabel: string;
};

export type TokenVolumeSummary = {
  benchmarkRatioPercent: number | null;
  label: string;
  volumeToMarketCap: number | null;
};

export type TokenLiquiditySummary = {
  benchmarkRatioPercent: number | null;
  cexPairs: number | null;
  dexPairs: number | null;
  isApproximate: boolean;
  label: string;
  tickerCount: number | null;
  trustedTickerCount: number | null;
};

export type TokenUnlockSummary = {
  circulatingSupplyPercent?: number | null;
  confidence?: TokenUnlockConfidence;
  lockedPercentage?: number | null;
  lockedPercent: number | null;
  nextUnlockAmount: number | null;
  nextUnlockAmountUsd?: number | null;
  nextUnlockDate: string | null;
  nextUnlockMarketCapPercent?: number | null;
  nextUnlockPercent: number | null;
  note: string;
  provider?: string;
  providerStatus?: string;
  risk: TokenChecklistRiskLevel;
  source: string;
  tbdPercentage?: number | null;
  unlockedPercent: number | null;
};

export type TokenProjectSummary = {
  projectSummaryRu: string;
  sectorRiskRu: string;
  sectorRu: string;
};

export type TokenChecklistCalculationInput = {
  liquidity: TokenLiquiditySummary;
  market: TokenChecklistMarket;
  marketRisk?: {
    level: "high" | "medium" | "none";
    title: string | null;
  };
  project: TokenProjectSummary;
  technical: TokenTechnicalSummary;
  unlocks: TokenUnlockSummary;
  volume: TokenVolumeSummary;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function finiteOrNull(value: unknown) {
  const number = toFiniteNumber(value);

  return Number.isFinite(number) ? number : null;
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function isNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function calculateSma(values: number[], period: number) {
  if (values.length < period) {
    return null;
  }

  return average(values.slice(-period));
}

export function calculateEma(values: number[], period: number) {
  if (values.length < period) {
    return null;
  }

  const multiplier = 2 / (period + 1);
  let ema = average(values.slice(0, period));

  if (ema === null) {
    return null;
  }

  for (const value of values.slice(period)) {
    ema = value * multiplier + ema * (1 - multiplier);
  }

  return ema;
}

export function calculateRsi(values: number[], period = 14) {
  if (values.length <= period) {
    return null;
  }

  const changes = values.slice(1).map((value, index) => value - values[index]);
  const recentChanges = changes.slice(-period);
  const gains = recentChanges.map((change) => (change > 0 ? change : 0));
  const losses = recentChanges.map((change) => (change < 0 ? Math.abs(change) : 0));
  const averageGain = average(gains);
  const averageLoss = average(losses);

  if (averageGain === null || averageLoss === null) {
    return null;
  }

  if (averageLoss === 0) {
    return 100;
  }

  const relativeStrength = averageGain / averageLoss;

  return 100 - 100 / (1 + relativeStrength);
}

export function buildTechnicalSummary(prices: number[]) {
  const cleanPrices = prices.map(finiteOrNull).filter((value): value is number => value !== null);
  const currentPrice = cleanPrices.at(-1) ?? null;
  const last30 = cleanPrices.slice(-30);
  const last90 = cleanPrices.slice(-90);
  const high30 = last30.length > 0 ? Math.max(...last30) : null;
  const high90 = last90.length > 0 ? Math.max(...last90) : null;
  const sma20 = calculateSma(cleanPrices, 20);
  const sma50 = calculateSma(cleanPrices, 50);
  const rsi14 = calculateRsi(cleanPrices, 14);

  const priceVsSma20Percent =
    currentPrice !== null && sma20 ? ((currentPrice - sma20) / sma20) * 100 : null;
  const priceVsSma50Percent =
    currentPrice !== null && sma50 ? ((currentPrice - sma50) / sma50) * 100 : null;
  const near30dHighPercent =
    currentPrice !== null && high30 ? ((currentPrice - high30) / high30) * 100 : null;
  const near90dHighPercent =
    currentPrice !== null && high90 ? ((currentPrice - high90) / high90) * 100 : null;

  let zoneLabel = "Техническая картина оценивается по доступной истории цены";

  if (rsi14 !== null) {
    if (rsi14 > 70) {
      zoneLabel = "RSI показывает перегретую зону";
    } else if (rsi14 >= 55) {
      zoneLabel = "Зона умеренно горячая";
    } else if (rsi14 >= 40) {
      zoneLabel = "Зона ближе к нейтральной";
    } else if (rsi14 < 35) {
      zoneLabel = "Цена выглядит охлаждённой относительно последних движений";
    }
  }

  return {
    ema20: calculateEma(cleanPrices, 20),
    ema50: calculateEma(cleanPrices, 50),
    near30dHighPercent,
    near90dHighPercent,
    priceVsSma20Percent,
    priceVsSma50Percent,
    rsi14,
    sma20,
    sma50,
    zoneLabel,
  } satisfies TokenTechnicalSummary;
}

export function buildVolumeSummary(marketCap: unknown, volume24h: unknown) {
  const cap = finiteOrNull(marketCap);
  const volume = finiteOrNull(volume24h);
  const volumeToMarketCap = cap && volume !== null ? volume / cap : null;

  let label = "Объем пока без явного вывода";

  if (volumeToMarketCap !== null) {
    if (volumeToMarketCap > 0.1) {
      label = "Высокий оборот";
    } else if (volumeToMarketCap >= 0.03) {
      label = "Нормальный оборот";
    } else if (volumeToMarketCap >= 0.01) {
      label = "Оборот слабоват";
    } else {
      label = "Низкий оборот";
    }
  }

  const benchmark =
    cap === null ? null : cap > 10_000_000_000 ? 0.05 : cap > 1_000_000_000 ? 0.03 : 0.02;

  return {
    benchmarkRatioPercent:
      volumeToMarketCap !== null && benchmark ? (volumeToMarketCap / benchmark) * 100 : null,
    label,
    volumeToMarketCap,
  } satisfies TokenVolumeSummary;
}

export function calculateTokenEntryScore(
  data: TokenChecklistCalculationInput,
): TokenChecklistScore {
  const factors: TokenChecklistFactor[] = [];
  const badges: string[] = [];
  const scoreBreakdown: TokenChecklistScore["scoreBreakdown"] = [];
  let score = 70;

  function addScore(factor: string, delta: number, reason: string) {
    score += delta;
    scoreBreakdown.push({ delta, factor, reason });
  }

  function addFactor(label: string, level: TokenChecklistRiskLevel, text: string) {
    factors.push({ label, level, text });
  }

  const change7d = data.market.priceChange7d;
  const change30d = data.market.priceChange30d;
  const rsi14 = data.technical.rsi14;
  const nearHigh = data.technical.near90dHighPercent ?? data.technical.near30dHighPercent;
  const nearLow = data.technical.nearLow;
  const sevenDayMove = change7d ?? 0;
  const thirtyDayMove = change30d ?? 0;
  const nearLocalHigh = isNumber(nearHigh) && nearHigh > -5;
  const moderateGrowth = sevenDayMove <= 10 && thirtyDayMove <= 25;

  if ((sevenDayMove > 35 && nearLocalHigh) || thirtyDayMove > 80 || (rsi14 ?? 0) > 80) {
    addScore("Pump risk", -30, "Сильный рост или RSI выше 80");
    badges.push("сильный рост");
    addFactor(
      "Памп-риск",
      "high",
      "Актив выглядит сильно разогретым относительно последних движений.",
    );
  } else if (sevenDayMove > 20 || thirtyDayMove > 50 || ((rsi14 ?? 0) > 75 && nearLocalHigh)) {
    addScore("Pump risk", -18, "Заметный рост за 7/30 дней");
    badges.push("сильный рост");
    addFactor(
      "Памп-риск",
      "high",
      "Рост за короткий период заметный, эмоциональный риск выше обычного.",
    );
  } else if (sevenDayMove > 10 || thirtyDayMove > 25 || ((rsi14 ?? 0) >= 65 && nearLocalHigh)) {
    addScore("Pump risk", -5, "Рост есть, но без экстремального разгона");
    badges.push("горячий рынок");
    addFactor("Памп-риск", "medium", "Рост есть, но он не выглядит экстремальным.");
  } else if (change7d !== null || change30d !== null) {
    addScore("Pump risk", 8, "Нет явного сильного разгона по 7/30 дням");
    addFactor(
      "Памп-риск",
      "low",
      "По доступной динамике нет явного признака сильного разгона.",
    );
  }

  if (rsi14 !== null) {
    if (rsi14 < 45) {
      addScore("RSI", 8, `RSI ${Math.round(rsi14)} - охлажденная зона`);
    } else if (rsi14 <= 60) {
      addScore("RSI", 5, `RSI ${Math.round(rsi14)} - нейтральная зона`);
    } else if (rsi14 <= 70) {
      addScore("RSI", -5, `RSI ${Math.round(rsi14)} - умеренно горячая зона`);
    } else if (rsi14 <= 80) {
      addScore("RSI", -18, `RSI ${Math.round(rsi14)} - перегретая зона`);
      badges.push("RSI > 70");
    } else {
      addScore("RSI", -30, `RSI ${Math.round(rsi14)} - экстремально перегретая зона`);
      badges.push("RSI > 80");
    }
  }

  if (isNumber(nearHigh)) {
    if (nearHigh > -5) {
      addScore(
        "Price position",
        moderateGrowth ? -8 : -14,
        "Цена близко к локальному максимуму",
      );
    } else if (nearHigh <= -25) {
      addScore("Price position", 8, "Цена заметно ниже локального максимума");
    } else if (nearHigh <= -12) {
      addScore("Price position", 5, "Цена ниже локального максимума");
    }
  }

  if (isNumber(nearLow) && nearLow < 12) {
    addScore("Price position", 5, "Цена недалеко от локальной нижней зоны");
  }

  if (rsi14 === null) {
    addFactor(
      "Техническая зона",
      "medium",
      "Техническая зона оценивается по цене, объему и общему контексту.",
    );
  } else if (rsi14 > 70) {
    addFactor("Техническая зона", "high", "RSI выше 70 - зона выглядит перегретой.");
  } else if (rsi14 >= 60) {
    addFactor("Техническая зона", "medium", "RSI в умеренно горячей зоне.");
  } else {
    addFactor("Техническая зона", "low", data.technical.zoneLabel);
  }

  if (data.volume.volumeToMarketCap !== null) {
    if (data.volume.volumeToMarketCap < 0.01) {
      addScore("Volume", -10, "Оборот низкий относительно капитализации");
      addFactor(
        "Объем",
        "high",
        "Оборот низкий: выход из идеи может быть менее комфортным.",
      );
    } else if (data.volume.volumeToMarketCap < 0.03) {
      addScore("Volume", -4, "Оборот слабоват относительно капитализации");
      addFactor("Объем", "medium", "Оборот слабоват относительно капитализации.");
    } else if (
      data.volume.volumeToMarketCap >= 0.1 &&
      sevenDayMove <= 20 &&
      thirtyDayMove <= 50
    ) {
      addScore("Volume", 8, "Оборот высокий без экстремального пампа");
      addFactor(
        "Объем",
        "low",
        "Оборот высокий, при этом рост не выглядит экстремальным.",
      );
    } else {
      addScore("Volume", 5, "Оборот выглядит нормальным");
      addFactor("Объем", "low", data.volume.label);
    }
  }

  if (data.liquidity.benchmarkRatioPercent !== null) {
    if (data.liquidity.benchmarkRatioPercent < 45) {
      addScore("Liquidity", -10, "Ликвидность ниже ориентира");
      addFactor(
        "Ликвидность",
        "medium",
        "Оборот заметно ниже ориентира для актива такого размера.",
      );
    } else if (data.liquidity.benchmarkRatioPercent >= 70) {
      addScore("Liquidity", 5, "Ликвидность близка к нормальному ориентиру");
      addFactor(
        "Ликвидность",
        "low",
        "Оборот близок к нормальному ориентиру или выше него.",
      );
    }
  }

  if (data.marketRisk?.level === "high") {
    addScore("Macro/BTC risk", -12, "Высокий macro/BTC risk в ближайшем окне");
    badges.push("macro/BTC risk");
    addFactor(
      "Макро/BTC-фон",
      "high",
      "В ближайшие 24 часа есть событие высокого влияния. Для альтов риск резкого движения выше.",
    );
  } else if (data.marketRisk?.level === "medium") {
    addScore("Macro/BTC risk", -2, "Medium macro risk учтен мягко");
    addFactor(
      "Макро/BTC-фон",
      "medium",
      data.marketRisk.title
        ? `Есть событие среднего влияния: ${data.marketRisk.title}. Это информационный фактор.`
        : "Есть событие среднего влияния. Это информационный фактор.",
    );
  }

  const lockedPercentage = data.unlocks.lockedPercentage ?? data.unlocks.lockedPercent;
  const tbdPercentage = data.unlocks.tbdPercentage ?? null;

  if (lockedPercentage !== null) {
    if (lockedPercentage < 15) {
      addScore("Tokenomics", 2, "Заблокированная доля предложения ниже 15%");
      addFactor(
        "Токеномика",
        "low",
        "Токеномический фон выглядит умеренным по доступным данным.",
      );
    } else if (lockedPercentage <= 35) {
      addScore("Tokenomics", -3, "Заблокированная доля предложения 15-35%");
      badges.push("locked supply");
      addFactor(
        "Токеномика",
        "medium",
        "Часть предложения еще находится вне свободного обращения. Это учитывается в оценке риска.",
      );
    } else if (lockedPercentage <= 50) {
      addScore("Tokenomics", -8, "Заблокированная доля предложения 35-50%");
      badges.push("locked supply");
      addFactor(
        "Токеномика",
        "medium",
        "Доля заблокированного предложения заметная, поэтому токеномический риск учитывается в оценке.",
      );
    } else {
      addScore("Tokenomics", -15, "Заблокированная доля предложения выше 50%");
      badges.push("locked supply");
      addFactor(
        "Токеномика",
        "high",
        "Доля заблокированного предложения высокая, поэтому токеномический риск заметно влияет на оценку.",
      );
    }
  }

  if (tbdPercentage !== null && tbdPercentage > 20) {
    addScore("Tokenomics", -5, "TBD supply выше 20%");
  }

  const supplyEventPercent =
    data.unlocks.nextUnlockMarketCapPercent ?? data.unlocks.nextUnlockPercent;
  const hasRealSupplyEvent =
    (data.unlocks.providerStatus === "exact" ||
      data.unlocks.providerStatus === "recent-unlock") &&
    supplyEventPercent !== null;

  if (hasRealSupplyEvent) {
    if (supplyEventPercent > 2) {
      addScore("Supply event", -15, "Событие предложения больше 2% от market cap/allocation");
      badges.push("крупное событие предложения");
      addFactor(
        "Предложение",
        "high",
        "Есть крупное ближайшее событие предложения, оно учитывается как отдельный риск.",
      );
    } else if (supplyEventPercent >= 0.5) {
      addScore("Supply event", -8, "Событие предложения 0.5-2%");
      addFactor(
        "Предложение",
        "medium",
        "Есть умеренное событие предложения, оно учтено в оценке.",
      );
    } else {
      addScore("Supply event", -3, "Событие предложения меньше 0.5%");
    }
  }

  if (data.market.currentPrice === null) {
    addScore("Market data", -15, "Рыночная цена не вошла в расчет");
  }

  score = Math.round(clamp(score, 0, 100));

  let riskLevel: TokenChecklistRiskLevel = "medium";
  let verdictTitle = "Токен можно изучать, но без спешки";
  let verdictText =
    "По полученным данным токен интересный, но вход сейчас не идеальный: есть умеренный перегрев или рыночные риски.";

  if (score < 40) {
    riskLevel = "high";
    verdictTitle = "Вход выглядит некомфортно";
    verdictText =
      "По полученным данным вход сейчас выглядит некомфортно: риск перегрева или слабой структуры выше обычного.";
  } else if (score < 60) {
    riskLevel = "medium-high";
    verdictTitle = "Лучше не спешить";
    verdictText =
      "По полученным данным лучше не спешить: есть факторы перегрева, слабой структуры или повышенного рыночного риска.";
  } else if (score < 75) {
    riskLevel = "medium";
    verdictTitle = "Токен можно изучать, но без спешки";
    verdictText =
      "По полученным данным токен можно изучать дальше, но вход сейчас не выглядит максимально спокойным.";
  } else {
    riskLevel = "low";
    verdictTitle = "Зона выглядит комфортнее";
    verdictText =
      "По полученным данным зона выглядит достаточно комфортной для изучения без спешки.";
  }

  return {
    badges: [...new Set(badges)],
    factors,
    riskLevel,
    score,
    scoreBreakdown,
    verdictText,
    verdictTitle,
  };
}
