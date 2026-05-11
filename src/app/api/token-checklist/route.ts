import { tokens, type TokenCard } from "@/lib/content";
import { fetchMarketData, type MarketCoin } from "@/lib/market";
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
import {
  getTokenUnlockData,
  resolveCryptoRankToken,
  unlockRiskLevel,
  type TokenUnlockData,
  type UnlockProviderResult,
} from "@/lib/unlocks";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SourceStatus = "ok" | "partial" | "failed" | "fallback-market-cache";
type DataQuality = "full" | "partial" | "fallback" | "last-good";
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
  sampleTitles?: string[];
  status: SourceStatus | "skipped";
};

type ChecklistDebug = {
  cacheStatus: "fallback" | "fresh" | "hit" | "last-good" | "saved";
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
  unlocks: {
    attemptsSummary: UnlockProviderResult["attemptsSummary"];
    cacheStatus: UnlockProviderResult["cacheStatus"] | "fallback";
    confidence: TokenUnlockData["confidence"];
    manualCheckUrls: TokenUnlockData["manualCheckUrls"];
    providerStatus: TokenUnlockData["providerStatus"];
    providerUsed: string;
    requestedSymbol: string;
    resolvedCryptoRankSlug: string;
    warnings: string[];
  };
  usedLastGoodData: boolean;
  usedMarketFallback: boolean;
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
    manualCheckUrls: Array<{
      label: string;
      url: string;
    }>;
    nextUnlockAmount: number | null;
    nextUnlockDate: string | null;
    nextUnlockMarketCapPercent: number | null;
    nextUnlockPercent: number | null;
    provider: string;
    providerStatus: TokenUnlockData["providerStatus"];
    rawTitle: string | null;
    confidence: TokenUnlockData["confidence"];
    circulatingSupplyPercent: number | null;
    sourceUrl: string | null;
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

const SERVER_CACHE_TTL_MS = 15 * 60_000;
const SERVER_LAST_GOOD_TTL_MS = 24 * 60 * 60_000;
const serverCache = new Map<
  string,
  {
    response: ChecklistResponse;
    updatedAt: number;
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

async function fetchMarketFallbackCoin(coingeckoId: string) {
  const payload = await fetchMarketData();

  return payload.coins.find((coin) => coin.id === coingeckoId) ?? null;
}

function marketCoinToRecord(coin: MarketCoin | null): UnknownRecord | null {
  if (!coin) {
    return null;
  }

  return {
    current_price: coin.current_price,
    id: coin.id,
    image: coin.image,
    market_cap: coin.market_cap,
    name: coin.name,
    price_change_percentage_24h: coin.price_change_percentage_24h,
    symbol: coin.symbol,
    total_volume: coin.total_volume,
  };
}

function mergeMarketRecord(
  primary: UnknownRecord | null,
  fallback: UnknownRecord | null,
) {
  if (!primary) {
    return fallback;
  }

  if (!fallback) {
    return primary;
  }

  return {
    ...fallback,
    ...Object.fromEntries(
      Object.entries(primary).filter(([, value]) => value !== null && value !== undefined),
    ),
  };
}

function hasMarketCore(record: UnknownRecord | null) {
  return (
    numberFrom(record?.current_price) !== null ||
    numberFrom(record?.market_cap) !== null ||
    numberFrom(record?.total_volume) !== null
  );
}

function hasFullMarketCore(record: UnknownRecord | null) {
  return (
    numberFrom(record?.current_price) !== null &&
    numberFrom(record?.market_cap) !== null &&
    numberFrom(record?.total_volume) !== null
  );
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

function manualCheckLinksForToken(token: TokenCard) {
  const mapping = resolveCryptoRankToken({
    coingeckoId: token.coingeckoId,
    symbol: token.ticker,
  });

  return [
    {
      label: "CryptoRank",
      url: `https://cryptorank.io/price/${mapping.cryptoRankSlug}/vesting`,
    },
    {
      label: "Token Unlocks",
      url: "https://token.unlocks.app/",
    },
  ];
}

function fallbackUnlockData(token: TokenCard): TokenUnlockData {
  const isBaseAsset = token.ticker === "BTC" || token.ticker === "ETH";

  if (isBaseAsset) {
    return {
      circulatingSupplyPercent: null,
      confidence: "high",
      explanation:
        token.ticker === "BTC"
          ? "У BTC нет стандартного графика vesting unlock как у новых токенов. Важнее смотреть эмиссию, майнеров, ETF-потоки и ликвидность."
          : "У ETH нет стандартного графика vesting unlock как у новых токенов. Важнее смотреть эмиссию, стейкинг/разблокировки, LST/LRT и рыночное предложение.",
      isAvailable: true,
      label: "Классических vesting unlocks нет",
      lockedPercent: null,
      manualCheckUrls: manualCheckLinksForToken(token),
      nextUnlockAmount: null,
      nextUnlockDate: null,
      nextUnlockMarketCapPercent: null,
      nextUnlockPercent: null,
      provider: "base-asset-rule",
      providerStatus: "base-asset",
      rawTitle: null,
      sourceUrl: null,
      unlockedPercent: null,
      updatedAt: new Date().toISOString(),
      warnings: [],
    };
  }

  return {
    circulatingSupplyPercent: null,
    confidence: "unknown",
    explanation:
      "Автоматически не удалось получить точный график unlocks. Перед входом проверь CryptoRank / TokenUnlocks / официальный docs проекта.",
    isAvailable: false,
    label: "Unlocks нужно проверить вручную",
    lockedPercent: null,
    manualCheckUrls: manualCheckLinksForToken(token),
    nextUnlockAmount: null,
    nextUnlockDate: null,
    nextUnlockMarketCapPercent: null,
    nextUnlockPercent: null,
    provider: "manual-check",
    providerStatus: "manual-check",
    rawTitle: null,
    sourceUrl: null,
    unlockedPercent: null,
    updatedAt: new Date().toISOString(),
    warnings: ["Точные unlocks не подтверждены автоматически."],
  };
}

function buildUnlocksFromProvider(data: TokenUnlockData) {
  return {
    circulatingSupplyPercent: data.circulatingSupplyPercent,
    confidence: data.confidence,
    explanation: data.explanation,
    isAvailable: data.isAvailable,
    label: data.label,
    lockedPercent: data.lockedPercent,
    manualCheckUrls: data.manualCheckUrls,
    nextUnlockAmount: data.nextUnlockAmount,
    nextUnlockDate: data.nextUnlockDate,
    nextUnlockMarketCapPercent: data.nextUnlockMarketCapPercent,
    nextUnlockPercent: data.nextUnlockPercent,
    note: data.explanation,
    provider: data.provider,
    providerStatus: data.providerStatus,
    rawTitle: data.rawTitle ?? null,
    risk: unlockRiskLevel(data),
    source: data.provider,
    sourceUrl: data.sourceUrl,
    unlockedPercent: data.unlockedPercent,
  } satisfies TokenUnlockSummary & {
    explanation: string;
    isAvailable: boolean;
    label: string;
    manualCheckUrls: TokenUnlockData["manualCheckUrls"];
    nextUnlockMarketCapPercent: number | null;
    providerStatus: TokenUnlockData["providerStatus"];
    rawTitle: string | null;
    sourceUrl: string | null;
  };
}

function sourceStatusFromUnlock(data: TokenUnlockData): SourceStatus {
  if (data.confidence === "high") {
    return "ok";
  }

  if (data.confidence === "medium" || data.confidence === "low") {
    return "partial";
  }

  return "partial";
}

function fallbackUnlockProviderResult(
  token: TokenCard,
  reason = "provider-fallback",
): UnlockProviderResult {
  const data = fallbackUnlockData(token);

  return {
    attemptsSummary: [
      {
        name: "unlock provider fallback",
        rawCount: 0,
        reason,
        status: "fallback",
      },
    ],
    cacheStatus: "fallback",
    data: {
      ...data,
      warnings: [...data.warnings, reason],
    },
    sources: [
      {
        enabled: true,
        fieldsReceived: [],
        name: "Unlock fallback",
        rawCount: 0,
        reason,
        sample: null,
        status: "partial",
      },
    ],
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
  const unlockData = fallbackUnlockData(token);
  const unlocks = buildUnlocksFromProvider(unlockData);
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
      unlocks: sourceStatusFromUnlock(unlockData),
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
      manualCheckUrls: unlocks.manualCheckUrls,
      nextUnlockAmount: unlocks.nextUnlockAmount,
      nextUnlockDate: unlocks.nextUnlockDate,
      nextUnlockMarketCapPercent: unlocks.nextUnlockMarketCapPercent,
      nextUnlockPercent: unlocks.nextUnlockPercent,
      provider: unlocks.provider ?? "manual-check",
      providerStatus: unlocks.providerStatus ?? "manual-check",
      rawTitle: unlocks.rawTitle,
      confidence: unlocks.confidence ?? "unknown",
      circulatingSupplyPercent: unlocks.circulatingSupplyPercent ?? null,
      sourceUrl: unlocks.sourceUrl,
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
    warnings: [...new Set([...warnings, ...unlockData.warnings])],
  };
}

function dataQualityFromData({
  liquidity,
  market,
  technical,
  volume,
}: {
  liquidity: ReturnType<typeof buildLiquidity>;
  market: ReturnType<typeof buildMarket>;
  technical: ReturnType<typeof buildTechnical>;
  volume: ReturnType<typeof buildVolume>;
}) {
  if (market.currentPrice === null) {
    return "fallback" as const;
  }

  const hasTechnical =
    technical.rsi14 !== null || technical.sma20 !== null || technical.sma50 !== null;
  const hasVolume = volume.value !== null && volume.volumeToMarketCap !== null;
  const hasLiquidity =
    liquidity.score !== null || liquidity.benchmarkRatioPercent !== null;

  return hasTechnical && hasVolume && hasLiquidity ? ("full" as const) : ("partial" as const);
}

function buildResponse(
  token: TokenCard,
  values: {
    chart: { prices: number[]; volumes: number[] };
    details: UnknownRecord | null;
    market: UnknownRecord | null;
    tickers: UnknownRecord[];
    unlockData: TokenUnlockData;
  },
  sourceStatus: SourceStatusMap,
  warnings: string[],
): ChecklistResponse {
  const market = buildMarket(values.market, values.details);
  const project = buildProject(token.description, token.coingeckoId, values.details);
  const technical = buildTechnical(values.chart.prices, market.currentPrice, market);
  const volume = buildVolume(market.marketCap, market.totalVolume);
  const liquidity = buildLiquidity(values.tickers, volume.volumeToMarketCap);
  const unlocks = buildUnlocksFromProvider(values.unlockData);
  const score = calculateTokenEntryScore({
    liquidity,
    market,
    project,
    technical,
    unlocks,
    volume,
  } satisfies TokenChecklistCalculationInput);
  const dataQuality = dataQualityFromData({
    liquidity,
    market,
    technical,
    volume,
  });
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
      manualCheckUrls: unlocks.manualCheckUrls,
      nextUnlockAmount: unlocks.nextUnlockAmount,
      nextUnlockDate: unlocks.nextUnlockDate,
      nextUnlockMarketCapPercent: unlocks.nextUnlockMarketCapPercent,
      nextUnlockPercent: unlocks.nextUnlockPercent,
      provider: unlocks.provider ?? values.unlockData.provider,
      providerStatus: unlocks.providerStatus ?? values.unlockData.providerStatus,
      rawTitle: unlocks.rawTitle,
      confidence: unlocks.confidence ?? values.unlockData.confidence,
      circulatingSupplyPercent: unlocks.circulatingSupplyPercent ?? null,
      sourceUrl: unlocks.sourceUrl,
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
    warnings: [...new Set([...warnings, ...values.unlockData.warnings])],
  };
}

function withLastGoodWarning(response: ChecklistResponse) {
  return {
    ...response,
    dataQuality: "last-good" as const,
    warnings: [
      ...response.warnings,
      "Показаны последние доступные данные, свежая проверка временно недоступна.",
    ],
  } satisfies ChecklistResponse;
}

function fromFreshCache(coingeckoId: string) {
  const cached = serverCache.get(coingeckoId);

  if (!cached || Date.now() - cached.updatedAt > SERVER_CACHE_TTL_MS) {
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

function fromLastGoodCache(coingeckoId: string) {
  const cached = serverCache.get(coingeckoId);

  if (!cached || Date.now() - cached.updatedAt > SERVER_LAST_GOOD_TTL_MS) {
    return null;
  }

  return withLastGoodWarning(cached.response);
}

function saveCache(response: ChecklistResponse) {
  if (response.dataQuality === "fallback" || response.market.price === null) {
    return;
  }

  serverCache.set(response.token.id, {
    response,
    updatedAt: Date.now(),
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
  cacheStatus,
  chart,
  coingeckoId,
  details,
  id,
  market,
  marketFallback,
  response,
  symbol,
  tickers,
  token,
  unlockResult,
  usedLastGoodData,
  usedMarketFallback,
}: {
  cacheStatus: ChecklistDebug["cacheStatus"];
  chart: { prices: number[]; volumes: number[] };
  coingeckoId: string | null;
  details: UnknownRecord | null;
  id: string | null;
  market: UnknownRecord | null;
  marketFallback: UnknownRecord | null;
  response: ChecklistResponse;
  symbol: string | null;
  tickers: UnknownRecord[];
  token: TokenCard;
  unlockResult: UnlockProviderResult;
  usedLastGoodData: boolean;
  usedMarketFallback: boolean;
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
    cacheStatus,
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
        reason:
          response.sourceStatus.market === "failed"
            ? "no-market-data"
            : response.sourceStatus.market === "fallback-market-cache"
              ? "recovered-from-market-fallback"
              : undefined,
        sample: sampleForDebug(market),
        status:
          response.sourceStatus.market === "fallback-market-cache"
            ? "failed"
            : response.sourceStatus.market,
      },
      {
        enabled: true,
        fieldsReceived: receivedFields(marketFallback),
        name: "Market fallback",
        rawCount: marketFallback ? 1 : 0,
        reason: usedMarketFallback
          ? undefined
          : marketFallback
            ? "not-needed"
            : "no-market-cache",
        sample: sampleForDebug(marketFallback),
        status: usedMarketFallback ? "ok" : "skipped",
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
        enabled: true,
        fieldsReceived: [],
        name: "Unlock provider",
        rawCount: response.unlocks.isAvailable ? 1 : 0,
        reason: response.unlocks.providerStatus,
        sample: {
          confidence: response.unlocks.confidence,
          provider: response.unlocks.provider,
        },
        status: response.sourceStatus.unlocks,
      },
      ...unlockResult.sources,
    ],
    unlocks: {
      attemptsSummary: unlockResult.attemptsSummary,
      cacheStatus: unlockResult.cacheStatus,
      confidence: response.unlocks.confidence,
      manualCheckUrls: response.unlocks.manualCheckUrls,
      providerStatus: response.unlocks.providerStatus,
      providerUsed: response.unlocks.provider,
      requestedSymbol: token.ticker,
      resolvedCryptoRankSlug: resolveCryptoRankToken({
        coingeckoId: token.coingeckoId,
        symbol: token.ticker,
      }).cryptoRankSlug,
      warnings: unlockResult.data.warnings,
    },
    usedLastGoodData,
    usedMarketFallback,
    warnings: response.warnings,
  };
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const coingeckoId = requestUrl.searchParams.get("coingeckoId")?.trim();
  const id = requestUrl.searchParams.get("id")?.trim();
  const symbol = requestUrl.searchParams.get("symbol")?.trim().toUpperCase() ?? null;
  const debugMode = requestUrl.searchParams.get("debug") === "1";
  const forceRefresh = requestUrl.searchParams.get("refresh") === "1";
  const token = resolveChecklistToken({
    coingeckoId: coingeckoId ?? null,
    id: id ?? null,
    symbol,
  });

  if (!forceRefresh) {
    const cached = fromFreshCache(token.coingeckoId);

    if (cached) {
      const debug = debugMode
        ? buildDebug({
            cacheStatus: "hit",
            chart: {
              prices: [],
              volumes: [],
            },
            coingeckoId: coingeckoId ?? null,
            details: null,
            id: id ?? null,
            market: null,
            marketFallback: null,
            response: cached,
            symbol,
            tickers: [],
            token,
            unlockResult: fallbackUnlockProviderResult(token, "checklist-cache-hit"),
            usedLastGoodData: false,
            usedMarketFallback: cached.sourceStatus.market === "fallback-market-cache",
          })
        : undefined;

      return Response.json(debug ? { ...cached, debug } : cached, {
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }
  }

  const [
    marketResult,
    detailsResult,
    chartResult,
    tickersResult,
    marketFallbackResult,
  ] =
    await Promise.allSettled([
      fetchCoinMarket(token.coingeckoId),
      fetchCoinDetails(token.coingeckoId),
      fetchMarketChart(token.coingeckoId),
      fetchCoinTickers(token.coingeckoId),
      fetchMarketFallbackCoin(token.coingeckoId),
    ]);

  const directMarket = getSettledValue(marketResult, null);
  const marketFallback = marketCoinToRecord(getSettledValue(marketFallbackResult, null));
  const usedMarketFallback = !hasFullMarketCore(directMarket) && hasMarketCore(marketFallback);
  const market = mergeMarketRecord(directMarket, usedMarketFallback ? marketFallback : null);
  const details = getSettledValue(detailsResult, null);
  const chart = getSettledValue(chartResult, {
    prices: [] as number[],
    volumes: [] as number[],
  });
  const tickers = getSettledValue(tickersResult, []);
  let unlockResult = fallbackUnlockProviderResult(token, "unlock-provider-not-run");

  try {
    unlockResult = await getTokenUnlockData({
      coinMarketCalApiKey: process.env.COINMARKETCAL_API_KEY,
      cryptoRankApiKey: process.env.CRYPTORANK_API_KEY,
      details,
      marketRecord: market,
      token,
    });
  } catch (error) {
    unlockResult = fallbackUnlockProviderResult(
      token,
      error instanceof Error ? error.message : "unlock-provider-error",
    );
  }

  const sourceStatus: SourceStatusMap = {
    chart:
      chart.prices.length >= 20
        ? "ok"
        : chart.prices.length > 0
          ? "partial"
          : "failed",
    details: sourceStatusFromRecord(details, ["market_data", "categories"]),
    market: usedMarketFallback
      ? "fallback-market-cache"
      : sourceStatusFromRecord(directMarket, ["current_price", "market_cap", "total_volume"]),
    tickers: tickers.length > 0 ? "ok" : "failed",
    unlocks: sourceStatusFromUnlock(unlockResult.data),
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
      unlockData: unlockResult.data,
    },
    sourceStatus,
    warnings,
  );

  let cacheStatus: ChecklistDebug["cacheStatus"] = "fresh";
  let usedLastGoodData = false;

  if (response.dataQuality === "fallback" || response.market.price === null) {
    const cached = fromLastGoodCache(token.coingeckoId);

    if (cached) {
      response = cached;
      cacheStatus = "last-good";
      usedLastGoodData = true;
    } else {
      response = buildFallbackResponse(token, warnings);
      cacheStatus = "fallback";
    }
  } else {
    saveCache(response);
    cacheStatus = "saved";
  }

  logStatus(token.coingeckoId, response);
  const debug = debugMode
    ? buildDebug({
        cacheStatus,
        chart,
        coingeckoId: coingeckoId ?? null,
        details,
        id: id ?? null,
        market: directMarket,
        marketFallback,
        response,
        symbol,
        tickers,
      token,
      unlockResult,
      usedLastGoodData,
      usedMarketFallback,
    })
    : undefined;

  return Response.json(debug ? { ...response, debug } : response, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
