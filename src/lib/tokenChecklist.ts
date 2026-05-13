import { toFiniteNumber } from "@/lib/formatters";

export type TokenChecklistRiskLevel = "low" | "medium" | "high" | "unknown";
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

  let zoneLabel = "Данных мало — нужна ручная проверка";

  if (rsi14 !== null) {
    if (rsi14 > 70) {
      zoneLabel = "RSI показывает перегретую зону";
    } else if (rsi14 >= 55) {
      zoneLabel = "Зона умеренно горячая";
    } else if (rsi14 >= 40) {
      zoneLabel = "Зона ближе к нейтральной";
    } else if (rsi14 < 35) {
      zoneLabel = "Цена выглядит охлаждённой, но нужна проверка тренда";
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

  let label = "Данных по объёму недостаточно";

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
  let score = 64;
  let unknownWeight = 0;
  let hasHighRisk = false;

  const change7d = data.market.priceChange7d;
  const change30d = data.market.priceChange30d;

  if (change7d === null && change30d === null) {
    unknownWeight += 1;
    factors.push({
      label: "Памп-риск",
      level: "unknown",
      text: "Не хватает динамики за 7/30 дней — нужна ручная проверка графика.",
    });
  } else if ((change7d ?? 0) > 20 || (change30d ?? 0) > 50) {
    score -= 22;
    hasHighRisk = true;
    badges.push("сильный рост");
    factors.push({
      label: "Памп-риск",
      level: "high",
      text: "Актив уже заметно вырос за короткий период, эмоциональный риск выше обычного.",
    });
  } else if ((change7d ?? 0) > 10 || (change30d ?? 0) > 25) {
    score -= 10;
    badges.push("горячий рынок");
    factors.push({
      label: "Памп-риск",
      level: "medium",
      text: "Рост есть, но он не выглядит экстремальным. Всё равно стоит сверить уровни и объём.",
    });
  } else {
    score += 4;
    factors.push({
      label: "Памп-риск",
      level: "low",
      text: "По доступной динамике нет явного признака сильного разгона.",
    });
  }

  if (data.technical.rsi14 === null) {
    unknownWeight += 1;
    factors.push({
      label: "Техническая зона",
      level: "unknown",
      text: "Недостаточно исторических данных для RSI и средних.",
    });
  } else if (data.technical.rsi14 > 70) {
    score -= 16;
    hasHighRisk = true;
    badges.push("RSI > 70");
    factors.push({
      label: "Техническая зона",
      level: "high",
      text: "RSI выше 70 — зона выглядит перегретой.",
    });
  } else if (data.technical.rsi14 >= 55) {
    score -= 6;
    factors.push({
      label: "Техническая зона",
      level: "medium",
      text: "RSI в умеренно горячей зоне, лучше не торопиться с выводами.",
    });
  } else {
    score += 4;
    factors.push({
      label: "Техническая зона",
      level: "low",
      text: data.technical.zoneLabel,
    });
  }

  if (data.volume.volumeToMarketCap === null) {
    unknownWeight += 1;
    factors.push({
      label: "Объём",
      level: "unknown",
      text: "Объём к капитализации недоступен.",
    });
  } else if (data.volume.volumeToMarketCap < 0.01) {
    score -= 14;
    hasHighRisk = true;
    factors.push({
      label: "Объём",
      level: "high",
      text: "Оборот низкий: выход из идеи может быть менее комфортным.",
    });
  } else if (data.volume.volumeToMarketCap < 0.03) {
    score -= 6;
    factors.push({
      label: "Объём",
      level: "medium",
      text: "Оборот слабоват относительно капитализации.",
    });
  } else {
    score += 6;
    factors.push({
      label: "Объём",
      level: "low",
      text: data.volume.label,
    });
  }

  if (data.liquidity.benchmarkRatioPercent === null) {
    unknownWeight += 1;
    factors.push({
      label: "Ликвидность",
      level: "unknown",
      text: "Ликвидность оценена приблизительно, точных данных по стаканам нет.",
    });
  } else if (data.liquidity.benchmarkRatioPercent < 45) {
    score -= 10;
    factors.push({
      label: "Ликвидность",
      level: "medium",
      text: "Оборот заметно ниже ориентира для актива такого размера.",
    });
  } else {
    score += 3;
    factors.push({
      label: "Ликвидность",
      level: "low",
      text: "Оборот близок к нормальному ориентиру или выше него.",
    });
  }

  const unlockComparablePercent =
    data.unlocks.nextUnlockMarketCapPercent ?? data.unlocks.nextUnlockPercent;

  if (data.unlocks.providerStatus === "conflict") {
    score -= 18;
    hasHighRisk = true;
    badges.push("unlocks расходятся");
    factors.push({
      label: "Unlocks",
      level: "high",
      text: "Источники по unlocks расходятся. Нужна ручная проверка, итоговую оценку нельзя считать уверенной.",
    });
  } else if (data.unlocks.confidence === "high" && data.unlocks.provider === "base-asset-rule") {
    score += 2;
    factors.push({
      label: "Unlocks",
      level: "low",
      text: "Классического vesting unlock нет. Для базового актива важнее смотреть эмиссию, стейкинг/разблокировки, ETF-потоки и рыночное предложение.",
    });
  } else if (data.unlocks.providerStatus === "no-future-unlocks") {
    score += 2;
    factors.push({
      label: "Unlocks",
      level: "low",
      text: "Источник не нашёл будущих vesting unlocks в выбранном окне.",
    });
  } else if (data.unlocks.confidence === "high" && unlockComparablePercent !== null) {
    if (unlockComparablePercent > 2) {
      score -= 20;
      hasHighRisk = true;
      badges.push("крупный unlock");
      factors.push({
        label: "Unlocks",
        level: "high",
        text: "Есть точные unlock-данные: ближайшая разблокировка выглядит крупной относительно рынка. Давление предложения нужно проверить особенно внимательно.",
      });
    } else if (unlockComparablePercent >= 0.5) {
      score -= 9;
      factors.push({
        label: "Unlocks",
        level: "medium",
        text: "Есть точные unlock-данные: размер ближайшей разблокировки умеренный, но его лучше учитывать в сценарии.",
      });
    } else {
      score += 2;
      factors.push({
        label: "Unlocks",
        level: "low",
        text: "По точным unlock-данным ближайшая разблокировка не выглядит крупной.",
      });
    }
  } else if (
    data.unlocks.providerStatus === "calendar-hint" ||
    data.unlocks.providerStatus === "recent-unlock-hint" ||
    data.unlocks.confidence === "medium"
  ) {
    score -= 8;
    badges.push("unlock event");
    factors.push({
      label: "Unlocks",
      level: "medium",
      text: "Есть ближайшее unlock-событие в календаре, но размер нужно проверить вручную.",
    });
  } else if (data.unlocks.confidence === "low") {
    unknownWeight += 1;
    score -= 3;
    factors.push({
      label: "Unlocks",
      level: "unknown",
      text: "Точного графика unlocks нет, есть только оценка supply. Это не заменяет проверку vesting.",
    });
  } else if (data.unlocks.risk === "unknown") {
    unknownWeight += 1;
    score -= 4;
    badges.push("unlocks неизвестны");
    factors.push({
      label: "Unlocks",
      level: "unknown",
      text: data.unlocks.note,
    });
  } else if (data.unlocks.risk === "high") {
    score -= 20;
    hasHighRisk = true;
    factors.push({
      label: "Unlocks",
      level: "high",
      text: "В ближайшее время есть крупная разблокировка — давление предложения может вырасти.",
    });
  } else if (data.unlocks.risk === "medium") {
    score -= 9;
    factors.push({
      label: "Unlocks",
      level: "medium",
      text: "Есть умеренный unlock-риск, его лучше проверить перед решением.",
    });
  } else {
    score += 3;
    factors.push({
      label: "Unlocks",
      level: "low",
      text: "По доступным данным ближайший unlock не выглядит крупным.",
    });
  }

  score = Math.round(clamp(score - unknownWeight * 2, 0, 100));

  if (data.unlocks.providerStatus === "supply-only") {
    score = Math.min(score, 75);
  }

  if (data.unlocks.providerStatus === "conflict") {
    score = Math.min(score, 62);
  }

  let riskLevel: TokenChecklistRiskLevel = "medium";
  let verdictTitle = "Можно изучать дальше, но без спешки";
  let verdictText =
    "Данные не выглядят критично, но итог зависит от уровней, новостей и общей фазы рынка.";

  if (unknownWeight >= 4 || data.market.currentPrice === null) {
    riskLevel = "unknown";
    verdictTitle = "Данных недостаточно — нужна ручная проверка";
    verdictText =
      "Часть данных недоступна, поэтому оценка приблизительная. Сначала проверь график, unlocks, новости и ликвидность вручную.";
  } else if (score < 42 || hasHighRisk) {
    riskLevel = "high";
    verdictTitle =
      data.technical.rsi14 !== null && data.technical.rsi14 > 70
        ? "Цена выглядит перегретой"
        : "Риск входа сейчас повышенный";
    verdictText =
      "Главный риск — некомфортная зона, сильный рост или слабая ликвидность. Спокойнее дождаться более понятной картины.";
  } else if (score < 68) {
    riskLevel = "medium";
    verdictTitle = "Токен интересный, но цена сейчас кусается";
    verdictText =
      "Идею можно разбирать глубже, но зона не выглядит максимально спокойной. Нужны уровни, сценарий и проверка событий.";
  } else {
    riskLevel = "low";
    verdictTitle = "Можно изучать дальше";
    verdictText =
      "По доступным данным нет явного красного флага, но это не отменяет ручную проверку графика, unlocks и новостей.";
  }

  return {
    badges,
    factors,
    riskLevel,
    score,
    verdictText,
    verdictTitle,
  };
}
