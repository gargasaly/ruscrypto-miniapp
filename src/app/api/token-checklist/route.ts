import { tokens, type TokenCard } from "@/lib/content";
import {
  buildTechnicalSummary,
  buildVolumeSummary,
  calculateTokenEntryScore,
  type TokenChecklistCalculationInput,
  type TokenChecklistRiskLevel,
  type TokenLiquiditySummary,
  type TokenProjectSummary,
  type TokenUnlockSummary,
} from "@/lib/tokenChecklist";
import { getTokenMetadata } from "@/lib/tokenMetadata";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SourceStatus = "ok" | "partial" | "failed";
type DataQuality = "full" | "partial" | "fallback";
type UnknownRecord = Record<string, unknown>;

type SourceStatusMap = {
  chart: SourceStatus;
  details: SourceStatus;
  market: SourceStatus;
  tickers: SourceStatus;
  unlocks: SourceStatus;
};

type SourceDebug = {
  enabled: boolean;
  fieldsReceived: string[];
  name: string;
  rawCount: number;
  reason?: string;
  sample: unknown;
  status: SourceStatus | "skipped";
};

type ChecklistDebug = {
  env: {
    COINGECKO_AVAILABLE: boolean;
    CRYPTORANK_API_KEY: boolean;
    MESSARI_API_KEY: boolean;
    MOBULA_API_KEY: boolean;
  };
  missingBlocks: string[];
  requested: {
    coingeckoId: string | null;
    id: string | null;
    symbol: string | null;
  };
  resolvedToken: {
    id: string;
    name: string;
    symbol: string;
  };
  sources: SourceDebug[];
  warnings: string[];
};

type ChecklistResponse = {
  dataQuality: DataQuality;
  liquidity: {
    benchmarkPercent: number | null;
    explanation: string;
    isEstimated: boolean;
    label: string;
    score: number | null;
  };
  market: {
    ath: number | null;
    change24h: number | null;
    change30d: number | null;
    change7d: number | null;
    distanceFromAth: number | null;
    marketCap: number | null;
    price: number | null;
    volume24h: number | null;
    volumeToMarketCap: number | null;
  };
  ok: boolean;
  project: {
    sectorRiskRu: string;
    sectorRu: string;
    summaryRu: string;
  };
  sourceStatus: SourceStatusMap;
  technical: {
    nearHigh: number | null;
    nearLow: number | null;
    position: "hot" | "neutral" | "cold" | "unknown";
    pumpRisk: TokenChecklistRiskLevel;
    rsi14: number | null;
    sma20: number | null;
    sma50: number | null;
  };
  token: {
    id: string;
    image: string | null;
    name: string;
    symbol: string;
  };
  unlocks: {
    explanation: string;
    isAvailable: boolean;
    label: string;
    lockedPercent: number | null;
    nextUnlockAmount: number | null;
    nextUnlockDate: string | null;
    nextUnlockPercent: number | null;
    unlockedPercent: number | null;
  };
  updatedAt: string;
  verdict: {
    badges: string[];
    factors: Array<{
      label: string;
      level: TokenChecklistRiskLevel;
      text: string;
    }>;
    riskLevel: TokenChecklistRiskLevel;
    score: number;
    text: string;
    title: string;
  };
  volume: {
    benchmark: number | null;
    benchmarkPercent: number | null;
    explanation: string;
    label: string;
    value: number | null;
    volumeToMarketCap: number | null;
  };
  warnings: string[];
};

const SERVER_CACHE_TTL_MS = 5 * 60_000;
const serverCache = new Map<
  string,
  {
    expiresAt: number;
    response: ChecklistResponse;
  }
>();

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function arrayPayload(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (!isRecord(value)) {
    return [];
  }

  for (const key of ["data", "body", "result", "items", "tickers"]) {
    const nested = value[key];

    if (Array.isArray(nested)) {
      return nested;
    }
  }

  return [];
}

function numberFrom(value: unknown) {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  return Number.isFinite(number) ? number : null;
}

function stringFrom(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function nestedUsdNumber(record: UnknownRecord | null, key: string) {
  if (!record) {
    return null;
  }

  const value = record[key];

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (isRecord(value)) {
    return numberFrom(value.usd);
  }

  return null;
}

async function fetchJson(url: URL, init?: RequestInit) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchCoinMarket(coingeckoId: string) {
  const url = new URL("https://api.coingecko.com/api/v3/coins/markets");
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("ids", coingeckoId);
  url.searchParams.set("sparkline", "false");
  url.searchParams.set("price_change_percentage", "24h,7d,30d");

  const payload = await fetchJson(url);

  return arrayPayload(payload).find(isRecord) ?? null;
}

async function fetchCoinDetails(coingeckoId: string) {
  const url = new URL(`https://api.coingecko.com/api/v3/coins/${coingeckoId}`);
  url.searchParams.set("localization", "false");
  url.searchParams.set("tickers", "false");
  url.searchParams.set("market_data", "true");
  url.searchParams.set("community_data", "false");
  url.searchParams.set("developer_data", "false");
  url.searchParams.set("sparkline", "false");

  const payload = await fetchJson(url);

  return isRecord(payload) ? payload : null;
}

async function fetchMarketChart(coingeckoId: string) {
  const url = new URL(
    `https://api.coingecko.com/api/v3/coins/${coingeckoId}/market_chart`,
  );
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("days", "90");
  url.searchParams.set("interval", "daily");

  const payload = await fetchJson(url);

  if (!isRecord(payload)) {
    return {
      prices: [] as number[],
      volumes: [] as number[],
    };
  }

  return {
    prices: arrayPayload(payload.prices)
      .map((row) => (Array.isArray(row) ? numberFrom(row[1]) : null))
      .filter((value): value is number => value !== null),
    volumes: arrayPayload(payload.total_volumes)
      .map((row) => (Array.isArray(row) ? numberFrom(row[1]) : null))
      .filter((value): value is number => value !== null),
  };
}

async function fetchCoinTickers(coingeckoId: string) {
  const url = new URL(`https://api.coingecko.com/api/v3/coins/${coingeckoId}/tickers`);
  url.searchParams.set("include_exchange_logo", "false");
  url.searchParams.set("depth", "false");
  url.searchParams.set("order", "volume_desc");

  return arrayPayload(await fetchJson(url)).filter(isRecord);
}

async function fetchCryptoRankUnlocks(symbol: string) {
  const apiKey = process.env.CRYPTORANK_API_KEY;

  if (!apiKey) {
    return null;
  }

  const url = new URL("https://api.cryptorank.io/v2/currencies/unlocks");
  url.searchParams.set("symbols", symbol);

  return fetchJson(url, {
    headers: {
      "X-Api-Key": apiKey,
    },
  });
}

function sourceStatusFromRecord(record: UnknownRecord | null, requiredKeys: string[]) {
  if (!record) {
    return "failed" as const;
  }

  const hasRequired = requiredKeys.some((key) => record[key] !== undefined && record[key] !== null);

  return hasRequired ? ("ok" as const) : ("partial" as const);
}

function getSettledValue<T>(result: PromiseSettledResult<T>, fallback: T) {
  return result.status === "fulfilled" ? result.value : fallback;
}

function buildProject(tokenDescription: string, coingeckoId: string, details: UnknownRecord | null) {
  const metadata = getTokenMetadata(coingeckoId);

  if (metadata) {
    return {
      projectSummaryRu: metadata.projectSummaryRu,
      sectorRiskRu: metadata.sectorRiskRu,
      sectorRu: metadata.sectorRu,
    } satisfies TokenProjectSummary;
  }

  const categories = Array.isArray(details?.categories)
    ? details.categories.filter((item): item is string => typeof item === "string")
    : [];

  return {
    projectSummaryRu: tokenDescription,
    sectorRiskRu:
      "Локальной заметки по сектору нет — проверь фундамент, токеномику и новости вручную.",
    sectorRu: categories.slice(0, 2).join(" / ") || "Сектор уточняется",
  } satisfies TokenProjectSummary;
}

function buildMarket(market: UnknownRecord | null, details: UnknownRecord | null) {
  const marketData = details && isRecord(details.market_data) ? details.market_data : null;
  const marketCap = numberFrom(market?.market_cap);
  const volume24h = numberFrom(market?.total_volume);
  const volumeToMarketCap = marketCap && volume24h !== null ? volume24h / marketCap : null;
  const ath = nestedUsdNumber(marketData, "ath");
  const currentPrice = numberFrom(market?.current_price);
  const athChangePercentage = nestedUsdNumber(marketData, "ath_change_percentage");
  const distanceFromAth =
    ath !== null && currentPrice !== null && ath > 0
      ? ((currentPrice - ath) / ath) * 100
      : athChangePercentage;

  return {
    ath,
    athChangePercentage,
    circulatingSupply:
      numberFrom(market?.circulating_supply) ??
      numberFrom(marketData?.circulating_supply),
    currentPrice,
    distanceFromAth: Number.isFinite(distanceFromAth) ? distanceFromAth : null,
    image: typeof market?.image === "string" ? market.image : null,
    marketCap,
    maxSupply: numberFrom(marketData?.max_supply),
    priceChange24h: numberFrom(market?.price_change_percentage_24h),
    priceChange7d: numberFrom(market?.price_change_percentage_7d_in_currency),
    priceChange30d: numberFrom(market?.price_change_percentage_30d_in_currency),
    totalSupply: numberFrom(marketData?.total_supply),
    totalVolume: volume24h,
    volumeToMarketCap,
  };
}

function inferPumpRisk(change24h: number | null, change7d: number | null, change30d: number | null) {
  if (change24h === null && change7d === null && change30d === null) {
    return "unknown" as const;
  }

  if ((change7d ?? 0) > 20 || (change30d ?? 0) > 50 || (change24h ?? 0) > 15) {
    return "high" as const;
  }

  if ((change7d ?? 0) > 10 || (change30d ?? 0) > 25 || (change24h ?? 0) > 8) {
    return "medium" as const;
  }

  return "low" as const;
}

function buildTechnical(prices: number[], currentPrice: number | null, market: ReturnType<typeof buildMarket>) {
  const effectivePrices =
    prices.length > 0 && currentPrice !== null ? [...prices.slice(0, -1), currentPrice] : prices;
  const summary = buildTechnicalSummary(effectivePrices);
  const nearHigh = summary.near90dHighPercent ?? summary.near30dHighPercent;
  const nearLow =
    effectivePrices.length > 0 && currentPrice !== null
      ? ((currentPrice - Math.min(...effectivePrices.slice(-90))) /
          Math.min(...effectivePrices.slice(-90))) *
        100
      : null;
  const position: ChecklistResponse["technical"]["position"] =
    summary.rsi14 === null
      ? "unknown"
      : summary.rsi14 > 70
        ? "hot"
        : summary.rsi14 < 35
          ? "cold"
          : "neutral";

  return {
    ...summary,
    nearHigh,
    nearLow: Number.isFinite(nearLow) ? nearLow : null,
    position,
    pumpRisk: inferPumpRisk(
      market.priceChange24h,
      market.priceChange7d,
      market.priceChange30d,
    ),
  };
}

function buildVolume(marketCap: number | null, volume24h: number | null) {
  const summary = buildVolumeSummary(marketCap, volume24h);
  const benchmark =
    marketCap === null ? null : marketCap > 10_000_000_000 ? 0.05 : marketCap > 1_000_000_000 ? 0.03 : 0.02;

  return {
    benchmark,
    benchmarkPercent: summary.benchmarkRatioPercent,
    benchmarkRatioPercent: summary.benchmarkRatioPercent,
    explanation:
      summary.volumeToMarketCap === null
        ? "Не удалось сравнить объём с капитализацией."
        : "Оборот сравнивается с ориентиром для размера актива.",
    label: summary.label,
    value: volume24h,
    volumeToMarketCap: summary.volumeToMarketCap,
  };
}

function buildLiquidity(tickers: UnknownRecord[], volumeToMarketCap: number | null) {
  const trustedTickerCount = tickers.filter(
    (ticker) => stringFrom(ticker, ["trust_score"]) === "green",
  ).length;
  const tickerCount = tickers.length;
  const scoreFromTickers = tickerCount > 0 ? Math.min(70, tickerCount * 2) + Math.min(30, trustedTickerCount * 3) : null;
  const scoreFromVolume =
    volumeToMarketCap === null ? null : Math.min(100, Math.round((volumeToMarketCap / 0.05) * 100));
  const score = scoreFromTickers ?? scoreFromVolume;

  return {
    benchmarkRatioPercent: scoreFromVolume,
    cexPairs: null,
    dexPairs: null,
    explanation:
      tickerCount > 0
        ? "Ликвидность оценена по числу торговых пар и trust score."
        : "Ликвидность оценена приблизительно через оборот к капитализации.",
    isApproximate: tickerCount === 0,
    isEstimated: tickerCount === 0,
    label:
      score === null
        ? "Данных по ликвидности недостаточно"
        : score >= 75
          ? "Ликвидность выглядит комфортно"
          : score >= 45
            ? "Ликвидность средняя"
            : "Ликвидность требует ручной проверки",
    score,
    tickerCount,
    trustedTickerCount,
  } satisfies TokenLiquiditySummary & {
    explanation: string;
    isEstimated: boolean;
    score: number | null;
  };
}

function buildUnlocks(symbol: string, coingeckoId: string, payload: unknown) {
  const metadata = getTokenMetadata(coingeckoId);
  const rows = arrayPayload(payload).filter(isRecord);
  const row =
    rows.find((item) => {
      const rowSymbol = stringFrom(item, ["symbol", "ticker", "asset"]);

      return rowSymbol?.toUpperCase() === symbol.toUpperCase();
    }) ?? rows[0];

  if (row) {
    const nextUnlockPercent = numberFrom(
      row.nextUnlockPercent ?? row.unlockPercent ?? row.unlock_percent ?? row.percentage,
    );

    return {
      explanation:
        nextUnlockPercent === null
          ? "Unlocks подтянуты частично — точный размер лучше проверить вручную."
          : "Unlocks получены из серверного источника.",
      isAvailable: true,
      label:
        nextUnlockPercent === null
          ? "Данные частичные"
          : nextUnlockPercent > 2
            ? "Крупный unlock-риск"
            : nextUnlockPercent >= 0.5
              ? "Умеренный unlock-риск"
              : "Низкий unlock-риск",
      lockedPercent: numberFrom(row.lockedPercent ?? row.locked_percent),
      nextUnlockAmount: numberFrom(row.nextUnlockAmount ?? row.amount ?? row.unlockAmount),
      nextUnlockDate: stringFrom(row, ["nextUnlockDate", "unlockDate", "date", "unlock_date"]),
      nextUnlockPercent,
      note: "Unlocks получены из серверного источника.",
      risk:
        nextUnlockPercent === null
          ? "unknown"
          : nextUnlockPercent > 2
            ? "high"
            : nextUnlockPercent >= 0.5
              ? "medium"
              : "low",
      source: "CryptoRank",
      unlockedPercent: numberFrom(row.unlockedPercent ?? row.unlocked_percent),
    } satisfies TokenUnlockSummary & {
      explanation: string;
      isAvailable: boolean;
      label: string;
    };
  }

  if (metadata?.unlocks) {
    const nextUnlockPercent = metadata.unlocks.nextUnlockPercent;

    return {
      explanation: metadata.unlocks.note,
      isAvailable: nextUnlockPercent !== null,
      label: nextUnlockPercent === null ? "Unlocks нужно проверить вручную" : "Fallback unlocks",
      lockedPercent: metadata.unlocks.lockedPercent,
      nextUnlockAmount: null,
      nextUnlockDate: metadata.unlocks.nextUnlockDate,
      nextUnlockPercent,
      note: metadata.unlocks.note,
      risk:
        nextUnlockPercent === null
          ? "unknown"
          : nextUnlockPercent > 2
            ? "high"
            : nextUnlockPercent >= 0.5
              ? "medium"
              : "low",
      source: "local",
      unlockedPercent: metadata.unlocks.unlockedPercent,
    } satisfies TokenUnlockSummary & {
      explanation: string;
      isAvailable: boolean;
      label: string;
    };
  }

  if (symbol.toUpperCase() === "BTC" || symbol.toUpperCase() === "ETH") {
    return {
      explanation:
        "Для этого актива нет стандартного графика vesting unlock, как у новых токенов. Важнее смотреть эмиссию, стейкинг/разблокировки и рыночное предложение.",
      isAvailable: false,
      label: "Классических unlocks нет",
      lockedPercent: null,
      nextUnlockAmount: null,
      nextUnlockDate: null,
      nextUnlockPercent: null,
      note: "Классических vesting unlocks нет.",
      risk: "low",
      source: "base-asset",
      unlockedPercent: null,
    } satisfies TokenUnlockSummary & {
      explanation: string;
      isAvailable: boolean;
      label: string;
    };
  }

  return {
    explanation:
      "Unlocks не удалось подтянуть автоматически — проверь вручную перед входом.",
    isAvailable: false,
    label: "Unlocks нужно проверить вручную",
    lockedPercent: null,
    nextUnlockAmount: null,
    nextUnlockDate: null,
    nextUnlockPercent: null,
    note: "Unlocks не удалось подтянуть автоматически — проверь вручную перед входом.",
    risk: "unknown",
    source: "fallback",
    unlockedPercent: null,
  } satisfies TokenUnlockSummary & {
    explanation: string;
    isAvailable: boolean;
    label: string;
  };
}

function buildPlainText(verdict: ChecklistResponse["verdict"], project: ChecklistResponse["project"]) {
  if (verdict.riskLevel === "unknown") {
    return `Данных недостаточно для полной оценки. Сектор: ${project.sectorRu}. Проверь график, unlocks, новости и ликвидность вручную.`;
  }

  if (verdict.riskLevel === "high") {
    return "Зона выглядит некомфортной: главный риск в перегреве, слабом объёме или неполных данных по unlocks. Лучше дождаться более понятной картины.";
  }

  if (verdict.riskLevel === "medium") {
    return "Идею можно изучать дальше, но без спешки. Нужны уровни, сценарий, проверка событий и токеномики.";
  }

  return "По доступным данным явных красных флагов меньше, чем обычно. Это не отменяет ручную проверку графика, событий и токеномики.";
}

function buildFallbackResponse(
  token: TokenCard,
  warnings: string[],
): ChecklistResponse {
  const project = buildProject(token.description, token.coingeckoId, null);
  const market = {
    ath: null,
    athChangePercentage: null,
    circulatingSupply: null,
    currentPrice: null,
    image: null,
    marketCap: null,
    maxSupply: null,
    priceChange24h: null,
    priceChange7d: null,
    priceChange30d: null,
    totalSupply: null,
    totalVolume: null,
    volumeToMarketCap: null,
    distanceFromAth: null,
  };
  const technical = buildTechnical([], null, market);
  const volume = buildVolume(null, null);
  const liquidity = buildLiquidity([], null);
  const unlocks = buildUnlocks(token.ticker, token.coingeckoId, null);
  const score = calculateTokenEntryScore({
    liquidity,
    market,
    project,
    technical,
    unlocks,
    volume,
  } satisfies TokenChecklistCalculationInput);
  const verdict = {
    badges: score.badges,
    factors: score.factors,
    riskLevel: score.riskLevel,
    score: score.score,
    text: score.verdictText,
    title: score.verdictTitle,
  };

  return {
    dataQuality: "fallback",
    liquidity: {
      benchmarkPercent: liquidity.benchmarkRatioPercent,
      explanation: liquidity.explanation,
      isEstimated: liquidity.isEstimated,
      label: liquidity.label,
      score: liquidity.score,
    },
    market: {
      ath: null,
      change24h: null,
      change30d: null,
      change7d: null,
      distanceFromAth: null,
      marketCap: null,
      price: null,
      volume24h: null,
      volumeToMarketCap: null,
    },
    ok: true,
    project: {
      sectorRiskRu: project.sectorRiskRu,
      sectorRu: project.sectorRu,
      summaryRu: project.projectSummaryRu,
    },
    sourceStatus: {
      chart: "failed",
      details: "failed",
      market: "failed",
      tickers: "failed",
      unlocks: "failed",
    },
    technical: {
      nearHigh: technical.nearHigh,
      nearLow: technical.nearLow,
      position: technical.position,
      pumpRisk: technical.pumpRisk,
      rsi14: technical.rsi14,
      sma20: technical.sma20,
      sma50: technical.sma50,
    },
    token: {
      id: token.coingeckoId,
      image: token.logo,
      name: token.title,
      symbol: token.ticker,
    },
    unlocks: {
      explanation: unlocks.explanation,
      isAvailable: unlocks.isAvailable,
      label: unlocks.label,
      lockedPercent: unlocks.lockedPercent,
      nextUnlockAmount: unlocks.nextUnlockAmount,
      nextUnlockDate: unlocks.nextUnlockDate,
      nextUnlockPercent: unlocks.nextUnlockPercent,
      unlockedPercent: unlocks.unlockedPercent,
    },
    updatedAt: new Date().toISOString(),
    verdict: {
      ...verdict,
      text: buildPlainText(verdict, {
        sectorRiskRu: project.sectorRiskRu,
        sectorRu: project.sectorRu,
        summaryRu: project.projectSummaryRu,
      }),
    },
    volume: {
      benchmark: volume.benchmark,
      benchmarkPercent: volume.benchmarkPercent,
      explanation: volume.explanation,
      label: volume.label,
      value: volume.value,
      volumeToMarketCap: volume.volumeToMarketCap,
    },
    warnings: [...new Set(warnings)],
  };
}

function dataQualityFromStatuses(status: SourceStatusMap) {
  const statuses = Object.values(status);

  if (statuses.every((value) => value === "failed")) {
    return "fallback" as const;
  }

  if (statuses.every((value) => value === "ok")) {
    return "full" as const;
  }

  return "partial" as const;
}

function buildResponse(
  token: TokenCard,
  values: {
    chart: { prices: number[]; volumes: number[] };
    details: UnknownRecord | null;
    market: UnknownRecord | null;
    tickers: UnknownRecord[];
    unlockPayload: unknown;
  },
  sourceStatus: SourceStatusMap,
  warnings: string[],
): ChecklistResponse {
  const market = buildMarket(values.market, values.details);
  const project = buildProject(token.description, token.coingeckoId, values.details);
  const technical = buildTechnical(values.chart.prices, market.currentPrice, market);
  const volume = buildVolume(market.marketCap, market.totalVolume);
  const liquidity = buildLiquidity(values.tickers, volume.volumeToMarketCap);
  const unlocks = buildUnlocks(token.ticker, token.coingeckoId, values.unlockPayload);
  const score = calculateTokenEntryScore({
    liquidity,
    market,
    project,
    technical,
    unlocks,
    volume,
  } satisfies TokenChecklistCalculationInput);
  const dataQuality = dataQualityFromStatuses(sourceStatus);
  const verdict = {
    badges: score.badges,
    factors: score.factors,
    riskLevel: score.riskLevel,
    score: score.score,
    text: score.verdictText,
    title: score.verdictTitle,
  };

  return {
    dataQuality,
    liquidity: {
      benchmarkPercent: liquidity.benchmarkRatioPercent,
      explanation: liquidity.explanation,
      isEstimated: liquidity.isEstimated,
      label: liquidity.label,
      score: liquidity.score,
    },
    market: {
      ath: market.ath,
      change24h: market.priceChange24h,
      change30d: market.priceChange30d,
      change7d: market.priceChange7d,
      distanceFromAth: market.distanceFromAth,
      marketCap: market.marketCap,
      price: market.currentPrice,
      volume24h: market.totalVolume,
      volumeToMarketCap: volume.volumeToMarketCap,
    },
    ok: true,
    project: {
      sectorRiskRu: project.sectorRiskRu,
      sectorRu: project.sectorRu,
      summaryRu: project.projectSummaryRu,
    },
    sourceStatus,
    technical: {
      nearHigh: technical.nearHigh,
      nearLow: technical.nearLow,
      position: technical.position,
      pumpRisk: technical.pumpRisk,
      rsi14: technical.rsi14,
      sma20: technical.sma20,
      sma50: technical.sma50,
    },
    token: {
      id: token.coingeckoId,
      image: market.image ?? token.logo,
      name: token.title,
      symbol: token.ticker,
    },
    unlocks: {
      explanation: unlocks.explanation,
      isAvailable: unlocks.isAvailable,
      label: unlocks.label,
      lockedPercent: unlocks.lockedPercent,
      nextUnlockAmount: unlocks.nextUnlockAmount,
      nextUnlockDate: unlocks.nextUnlockDate,
      nextUnlockPercent: unlocks.nextUnlockPercent,
      unlockedPercent: unlocks.unlockedPercent,
    },
    updatedAt: new Date().toISOString(),
    verdict: {
      ...verdict,
      text: buildPlainText(verdict, {
        sectorRiskRu: project.sectorRiskRu,
        sectorRu: project.sectorRu,
        summaryRu: project.projectSummaryRu,
      }),
    },
    volume: {
      benchmark: volume.benchmark,
      benchmarkPercent: volume.benchmarkPercent,
      explanation: volume.explanation,
      label: volume.label,
      value: volume.value,
      volumeToMarketCap: volume.volumeToMarketCap,
    },
    warnings: [...new Set(warnings)],
  };
}

function fromCache(coingeckoId: string) {
  const cached = serverCache.get(coingeckoId);

  if (!cached || cached.expiresAt < Date.now()) {
    return null;
  }

  return {
    ...cached.response,
    warnings: [
      ...cached.response.warnings,
      "Показаны последние доступные данные",
    ],
  } satisfies ChecklistResponse;
}

function saveCache(response: ChecklistResponse) {
  if (response.dataQuality === "fallback") {
    return;
  }

  serverCache.set(response.token.id, {
    expiresAt: Date.now() + SERVER_CACHE_TTL_MS,
    response,
  });
}

function logStatus(tokenId: string, response: ChecklistResponse) {
  console.info(
    `[token-checklist] ${tokenId} market=${response.sourceStatus.market} details=${response.sourceStatus.details} chart=${response.sourceStatus.chart} tickers=${response.sourceStatus.tickers} unlocks=${response.sourceStatus.unlocks} dataQuality=${response.dataQuality}`,
  );
}

function normalizeLookup(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function createFallbackToken(identifier: string): TokenCard {
  const ticker = identifier.trim().toUpperCase() || "TOKEN";

  return {
    coingeckoId: identifier.trim().toLowerCase() || "unknown",
    conclusion: "ждать",
    description:
      "Локальной карточки для этого токена пока нет. Часть данных может быть недоступна, поэтому нужна ручная проверка.",
    logo: null,
    risk: "средний",
    sector: "Уточняется",
    status: "soon",
    ticker,
    title: ticker,
    url: null,
  };
}

function resolveChecklistToken({
  coingeckoId,
  id,
  symbol,
}: {
  coingeckoId: string | null;
  id: string | null;
  symbol: string | null;
}) {
  const normalizedId = normalizeLookup(coingeckoId ?? id);
  const normalizedSymbol = normalizeLookup(symbol);
  const resolved =
    tokens.find((item) => normalizeLookup(item.coingeckoId) === normalizedId) ??
    tokens.find((item) => normalizeLookup(item.ticker) === normalizedId) ??
    tokens.find((item) => normalizeLookup(item.title) === normalizedId) ??
    tokens.find((item) => normalizeLookup(item.ticker) === normalizedSymbol) ??
    tokens.find((item) => normalizeLookup(item.coingeckoId) === normalizedSymbol);

  if (resolved) {
    return resolved;
  }

  return createFallbackToken(symbol ?? coingeckoId ?? id ?? "TOKEN");
}

function receivedFields(value: unknown) {
  if (!isRecord(value)) {
    return [];
  }

  return Object.entries(value)
    .filter(([, fieldValue]) => fieldValue !== null && fieldValue !== undefined)
    .map(([key]) => key)
    .slice(0, 12);
}

function sampleForDebug(value: unknown) {
  if (Array.isArray(value)) {
    return {
      count: value.length,
      firstFields: receivedFields(value.find(isRecord)),
    };
  }

  if (isRecord(value)) {
    return {
      fields: receivedFields(value).slice(0, 8),
    };
  }

  return null;
}

function buildDebug({
  chart,
  coingeckoId,
  details,
  id,
  market,
  response,
  symbol,
  tickers,
  token,
  unlockPayload,
}: {
  chart: { prices: number[]; volumes: number[] };
  coingeckoId: string | null;
  details: UnknownRecord | null;
  id: string | null;
  market: UnknownRecord | null;
  response: ChecklistResponse;
  symbol: string | null;
  tickers: UnknownRecord[];
  token: TokenCard;
  unlockPayload: unknown;
}): ChecklistDebug {
  const missingBlocks = [
    response.market.price === null &&
    response.market.change24h === null &&
    response.market.change7d === null &&
    response.market.change30d === null
      ? "priceAndPump"
      : null,
    response.technical.rsi14 === null &&
    response.technical.sma20 === null &&
    response.technical.sma50 === null &&
    response.technical.position === "unknown"
      ? "technicalZone"
      : null,
    !response.unlocks.isAvailable ? "unlocks" : null,
  ].filter((item): item is string => item !== null);

  return {
    env: {
      COINGECKO_AVAILABLE:
        response.sourceStatus.market !== "failed" ||
        response.sourceStatus.details !== "failed" ||
        response.sourceStatus.chart !== "failed" ||
        response.sourceStatus.tickers !== "failed",
      CRYPTORANK_API_KEY: Boolean(process.env.CRYPTORANK_API_KEY),
      MESSARI_API_KEY: Boolean(process.env.MESSARI_API_KEY),
      MOBULA_API_KEY: Boolean(process.env.MOBULA_API_KEY),
    },
    missingBlocks,
    requested: {
      coingeckoId,
      id,
      symbol,
    },
    resolvedToken: {
      id: token.coingeckoId,
      name: token.title,
      symbol: token.ticker,
    },
    sources: [
      {
        enabled: true,
        fieldsReceived: receivedFields(market),
        name: "CoinGecko markets",
        rawCount: market ? 1 : 0,
        reason: response.sourceStatus.market === "failed" ? "no-market-data" : undefined,
        sample: sampleForDebug(market),
        status: response.sourceStatus.market,
      },
      {
        enabled: true,
        fieldsReceived: receivedFields(details),
        name: "CoinGecko details",
        rawCount: details ? 1 : 0,
        reason: response.sourceStatus.details === "failed" ? "no-details" : undefined,
        sample: sampleForDebug(details),
        status: response.sourceStatus.details,
      },
      {
        enabled: true,
        fieldsReceived: ["prices", "volumes"].filter((field) =>
          field === "prices" ? chart.prices.length > 0 : chart.volumes.length > 0,
        ),
        name: "CoinGecko market_chart",
        rawCount: chart.prices.length,
        reason: response.sourceStatus.chart === "failed" ? "not-enough-chart-points" : undefined,
        sample: {
          prices: chart.prices.length,
          volumes: chart.volumes.length,
        },
        status: response.sourceStatus.chart,
      },
      {
        enabled: true,
        fieldsReceived: receivedFields(tickers[0]),
        name: "CoinGecko tickers",
        rawCount: tickers.length,
        reason: response.sourceStatus.tickers === "failed" ? "no-tickers" : undefined,
        sample: sampleForDebug(tickers),
        status: response.sourceStatus.tickers,
      },
      {
        enabled: Boolean(process.env.CRYPTORANK_API_KEY),
        fieldsReceived: receivedFields(unlockPayload),
        name: "CryptoRank unlocks",
        rawCount: arrayPayload(unlockPayload).length,
        reason: process.env.CRYPTORANK_API_KEY
          ? response.sourceStatus.unlocks === "failed"
            ? "no-unlock-data"
            : undefined
          : "no-api-key",
        sample: sampleForDebug(unlockPayload),
        status: process.env.CRYPTORANK_API_KEY ? response.sourceStatus.unlocks : "skipped",
      },
    ],
    warnings: response.warnings,
  };
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const coingeckoId = requestUrl.searchParams.get("coingeckoId")?.trim();
  const id = requestUrl.searchParams.get("id")?.trim();
  const symbol = requestUrl.searchParams.get("symbol")?.trim().toUpperCase() ?? null;
  const debugMode = requestUrl.searchParams.get("debug") === "1";
  const token = resolveChecklistToken({
    coingeckoId: coingeckoId ?? null,
    id: id ?? null,
    symbol,
  });

  const [marketResult, detailsResult, chartResult, tickersResult, unlocksResult] =
    await Promise.allSettled([
      fetchCoinMarket(token.coingeckoId),
      fetchCoinDetails(token.coingeckoId),
      fetchMarketChart(token.coingeckoId),
      fetchCoinTickers(token.coingeckoId),
      fetchCryptoRankUnlocks(token.ticker),
    ]);

  const market = getSettledValue(marketResult, null);
  const details = getSettledValue(detailsResult, null);
  const chart = getSettledValue(chartResult, {
    prices: [] as number[],
    volumes: [] as number[],
  });
  const tickers = getSettledValue(tickersResult, []);
  const unlockPayload = getSettledValue(unlocksResult, null);
  const sourceStatus: SourceStatusMap = {
    chart:
      chart.prices.length >= 20
        ? "ok"
        : chart.prices.length > 0
          ? "partial"
          : "failed",
    details: sourceStatusFromRecord(details, ["market_data", "categories"]),
    market: sourceStatusFromRecord(market, ["current_price", "market_cap", "total_volume"]),
    tickers: tickers.length > 0 ? "ok" : "failed",
    unlocks: unlockPayload ? "ok" : "failed",
  };
  const warnings = Object.entries(sourceStatus)
    .filter(([, status]) => status !== "ok")
    .map(([source, status]) => `${source}: ${status}`);

  let response = buildResponse(
    token,
    {
      chart,
      details,
      market,
      tickers,
      unlockPayload,
    },
    sourceStatus,
    warnings,
  );

  if (response.dataQuality === "fallback") {
    const cached = fromCache(token.coingeckoId);

    if (cached) {
      response = cached;
    } else {
      response = buildFallbackResponse(token, warnings);
    }
  } else {
    saveCache(response);
  }

  logStatus(token.coingeckoId, response);
  const debug = debugMode
    ? buildDebug({
        chart,
        coingeckoId: coingeckoId ?? null,
        details,
        id: id ?? null,
        market,
        response,
        symbol,
        tickers,
        token,
        unlockPayload,
      })
    : undefined;

  return Response.json(debug ? { ...response, debug } : response, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
