import { tokens, type TokenCard } from "@/lib/content";
import {
  getFeesRawData as getCryptoIntelligenceFeesRawData,
  getGovernanceRawData as getCryptoIntelligenceGovernanceRawData,
  getProtocolRawData as getCryptoIntelligenceProtocolRawData,
  getRevenueRawData as getCryptoIntelligenceRevenueRawData,
  type CryptoIntelligenceToolName,
  type CryptoIntelligenceToolResult,
} from "@/lib/crypto-intelligence";
import {
  CHECKLIST_PRICING_PREVIEW,
  LOCKED_ALT_MESSAGE,
  decideChecklistAccess,
  isFreeChecklistSymbol,
  isPaidTestSymbol,
} from "@/lib/checklist/accessPolicy";
import { canRunChecklistForSymbol } from "@/lib/checklistAccess";
import {
  buildCoinGeckoUrl,
  getCoinGeckoEnvStatus,
  getCoinGeckoHeaders,
} from "@/lib/coingecko";
import { fetchMarketData, type MarketCoin } from "@/lib/market";
import {
  buildTechnicalSummary,
  buildVolumeSummary,
  calculatePumpRisk,
  calculateTokenEntryScore,
  calculateValueCapture,
  type TokenAnalysisSignal,
  type TokenChecklistCalculationInput,
  type TokenChecklistRiskLevel,
  type TokenLiquiditySummary,
  type TokenProjectSummary,
  type TokenUnlockSummary,
  type TokenValueCaptureSummary,
} from "@/lib/tokenChecklist";
import { getTokenMetadata } from "@/lib/tokenMetadata";
import {
  getTokenUnlockData,
  resolveCryptoRankToken,
  unlockRiskLevel,
  type TokenUnlockData,
  type UnlockProviderResult,
} from "@/lib/unlocks";
import {
  consumeOneCheck,
  getActiveChecklistResultAccess,
  getConfiguredSupabaseClient,
  getOrCreateUserSession,
  recordCheckHistory,
} from "@/lib/supabase/checks";
import { getPortfolioProStatus } from "@/lib/portfolio/proAccess";
import { validateTelegramInitData } from "@/lib/telegram/validateInitData";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SourceStatus = "ok" | "partial" | "failed" | "fallback-market-cache";
type DataQuality = "full" | "partial" | "fallback" | "last-good";
type UnknownRecord = Record<string, unknown>;
type ChecklistMarketRisk = {
  level: "high" | "medium" | "none";
  title: string | null;
};

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

type ValueCaptureRawData = {
  catalystBadge: string | null;
  catalystSource: string | null;
  catalystText: string | null;
  feeDataAvailable: boolean;
  fees30dUsd: number | null;
  fees7dUsd: number | null;
  holdersRevenue30dUsd: number | null;
  holdersRevenueDataAvailable: boolean;
  holdersRevenue7dUsd: number | null;
  protocolRevenue30dUsd: number | null;
  protocolRevenue7dUsd: number | null;
  source: string;
  tools?: Partial<Record<CryptoIntelligenceToolName, CryptoIntelligenceToolResult>>;
};

type ChecklistCacheStatus = "fallback" | "fresh" | "hit" | "last-good" | "saved";
type ChecklistResponsePath =
  | "cache-hit"
  | "cache-repair-fresh"
  | "fallback"
  | "fresh"
  | "last-good";
type CacheRejectedReason =
  | "missing-value-capture"
  | "missing-value-capture-confidence"
  | "missing-value-capture-status"
  | "schema-version-mismatch";

type ChecklistDebug = {
  buildInfo: {
    cacheSchemaVersion: string;
    valueCaptureContractVersion: string;
  };
  cacheStatus: ChecklistCacheStatus;
  cacheRejectedReason?: CacheRejectedReason;
  env: {
    COINGECKO_AVAILABLE: boolean;
    COINGECKO_API_KEY: boolean;
    COINGECKO_API_PLAN: "demo" | "pro" | "not-set";
    COINGLASS_API_KEY: boolean;
    COINGLASS_ENABLED: boolean;
    CRYPTORANK_API_KEY: boolean;
    CRYPTORANK_ENABLED: boolean;
    MESSARI_API_KEY: boolean;
    MOBULA_API_KEY: boolean;
    TOKENOMIST_API_KEY: boolean;
    TOKENOMIST_ENABLED: boolean;
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
  responsePath: ChecklistResponsePath;
  sources: SourceDebug[];
  scoreBreakdown: Array<{
    delta: number;
    factor: string;
    reason: string;
  }>;
  unlocks: {
    attemptsSummary: UnlockProviderResult["attemptsSummary"];
    cacheStatus: UnlockProviderResult["cacheStatus"] | "fallback";
    confidence: TokenUnlockData["confidence"];
    comparedSources: TokenUnlockData["comparedSources"];
    conflicts: TokenUnlockData["conflicts"];
    manualCheckUrls: TokenUnlockData["manualCheckUrls"];
    providerStatus: TokenUnlockData["providerStatus"];
    selectedProvider: string;
    providerUsed: string;
    requestedSymbol: string;
    resolvedCryptoRankSlug: string;
    tokenomicsProvider: string | null;
    validationIssues: string[];
    vestingChartPoints: number;
    warnings: string[];
  };
  usedLastGoodData: boolean;
  usedMarketFallback: boolean;
  valueCapture: {
    cacheStatus: ChecklistCacheStatus;
    confidence: TokenValueCaptureSummary["confidence"];
    fees30d: number | null;
    feesStatus: SourceStatus | "skipped";
    governanceStatus: SourceStatus | "skipped";
    holdersRevenue30d: number | null;
    holdersRevenue7d: number | null;
    protocolRevenue30d: number | null;
    protocolStatus: SourceStatus | "skipped";
    revenueStatus: SourceStatus | "skipped";
    sources: SourceDebug[];
    stale: boolean;
    status: TokenValueCaptureSummary["status"];
  };
  valueCaptureCacheRepair: boolean;
  warnings: string[];
};

type ChecklistResponse = {
  analysisSignals: TokenAnalysisSignal[];
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
    pumpRiskLabel: string;
    pumpRiskText: string;
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
    allocationName: string | null;
    allocationBreakdown: TokenUnlockData["allocationBreakdown"];
    comparedSources: string[];
    conflicts: string[];
    lockedPercentage: number | null;
    manualCheckUrls: Array<{
      label: string;
      url: string;
    }>;
    maxSupply: number | null;
    nextUnlockAmount: number | null;
    nextUnlockAmountUsd: number | null;
    nextUnlockDate: string | null;
    nextUnlockMarketCapPercent: number | null;
    nextUnlockPercent: number | null;
    provider: string;
    providerStatus: TokenUnlockData["providerStatus"];
    rawTitle: string | null;
    confidence: TokenUnlockData["confidence"];
    circulatingSupplyPercent: number | null;
    releasedPercentage: number | null;
    sourceUrl: string | null;
    tbdLockedAmount: number | null;
    tbdPercentage: number | null;
    tokenomistSummary: TokenUnlockData["tokenomistSummary"];
    tokenomics: TokenUnlockData["tokenomics"];
    totalLockedAmount: number | null;
    unlockedAmount: number | null;
    unlockedPercent: number | null;
    unlockEvents: TokenUnlockData["unlockEvents"];
    unlocksRemainingNative: number | null;
    unlocksRemainingUsd: number | null;
    untrackedAmount: number | null;
    vestingChart: TokenUnlockData["vestingChart"];
    vestingEndDate: string | null;
    allocations: TokenUnlockData["allocations"];
    warnings: string[];
  };
  updatedAt: string;
  valueCapture: TokenValueCaptureSummary;
  verdict: {
    badges: string[];
    factors: Array<{
      label: string;
      level: TokenChecklistRiskLevel;
      text: string;
    }>;
    riskLevel: TokenChecklistRiskLevel;
    score: number;
    scoreBreakdown: Array<{
      delta: number;
      factor: string;
      reason: string;
    }>;
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
const COINGECKO_MARKET_TTL_MS = 15 * 60_000;
const COINGECKO_DETAILS_TTL_MS = 12 * 60 * 60_000;
const COINGECKO_CHART_TTL_MS = 60 * 60_000;
const COINGECKO_TICKERS_TTL_MS = 60 * 60_000;
const COINGECKO_LAST_GOOD_TTL_MS = 24 * 60 * 60_000;
const CRYPTO_INTELLIGENCE_TTL_MS = 6 * 60 * 60_000;
const TOKEN_CHECKLIST_RESPONSE_SCHEMA_VERSION = "2026-07-05-value-capture-v2";
const TOKEN_CHECKLIST_VALUE_CAPTURE_CONTRACT_VERSION = "2026-07-05-v3";
const VALUE_CAPTURE_TOOL_NAMES: CryptoIntelligenceToolName[] = [
  "get_fees_raw_data",
  "get_revenue_raw_data",
  "get_governance_raw_data",
  "get_protocol_raw_data",
];
const serverCache = new Map<
  string,
  {
    response: ChecklistResponse;
    schemaVersion?: string;
    updatedAt: number;
  }
>();
const coinGeckoSourceCache = new Map<
  string,
  {
    data: unknown;
    updatedAt: number;
  }
>();

function coinGeckoCacheKey(kind: string, coingeckoId: string) {
  return `${kind}:${coingeckoId}`;
}

function saveCoinGeckoCache(kind: string, coingeckoId: string, data: unknown) {
  coinGeckoSourceCache.set(coinGeckoCacheKey(kind, coingeckoId), {
    data,
    updatedAt: Date.now(),
  });
}

function readCoinGeckoCache<T>(
  kind: string,
  coingeckoId: string,
  ttlMs: number,
): T | null {
  const entry = coinGeckoSourceCache.get(coinGeckoCacheKey(kind, coingeckoId));

  if (!entry || Date.now() - entry.updatedAt > ttlMs) {
    return null;
  }

  return entry.data as T;
}

function readCoinGeckoLastGood<T>(kind: string, coingeckoId: string): T | null {
  return readCoinGeckoCache<T>(kind, coingeckoId, COINGECKO_LAST_GOOD_TTL_MS);
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getAppOriginForInternalFetch() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/+$/, "")}`;
  }

  return "http://127.0.0.1:3000";
}

function isMarketWideRiskEvent(event: UnknownRecord) {
  const affectedAssets = Array.isArray(event.affectedAssets)
    ? event.affectedAssets.map(String)
    : [];

  return (
    event.category === "macro" ||
    event.marketRelevance === "market-wide" ||
    affectedAssets.includes("BTC")
  );
}

async function fetchChecklistMarketRisk(): Promise<ChecklistMarketRisk> {
  try {
    const response = await fetch(`${getAppOriginForInternalFetch()}/api/risks`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        level: "none",
        title: null,
      };
    }

    const data = (await response.json()) as { mainRisk?: unknown };
    const mainRisk = isRecord(data.mainRisk) ? data.mainRisk : null;

    if (!mainRisk || !isMarketWideRiskEvent(mainRisk)) {
      return {
        level: "none",
        title: null,
      };
    }

    if (mainRisk.impact === "high" || mainRisk.impact === "medium") {
      return {
        level: mainRisk.impact,
        title: typeof mainRisk.title === "string" ? mainRisk.title : null,
      };
    }
  } catch {
    return {
      level: "none",
      title: null,
    };
  }

  return {
    level: "none",
    title: null,
  };
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
  const fresh = readCoinGeckoCache<UnknownRecord>(
    "market",
    coingeckoId,
    COINGECKO_MARKET_TTL_MS,
  );

  if (fresh) {
    return fresh;
  }

  const url = buildCoinGeckoUrl("/coins/markets", {
    ids: coingeckoId,
    price_change_percentage: "24h,7d,30d",
    sparkline: "false",
    vs_currency: "usd",
  });

  const payload = await fetchJson(url, {
    headers: getCoinGeckoHeaders(),
  });

  const row = arrayPayload(payload).find(isRecord) ?? null;

  if (row) {
    saveCoinGeckoCache("market", coingeckoId, row);
    return row;
  }

  return readCoinGeckoLastGood<UnknownRecord>("market", coingeckoId);
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
  const fresh = readCoinGeckoCache<UnknownRecord>(
    "details",
    coingeckoId,
    COINGECKO_DETAILS_TTL_MS,
  );

  if (fresh) {
    return fresh;
  }

  const url = buildCoinGeckoUrl(`/coins/${coingeckoId}`, {
    community_data: "false",
    developer_data: "false",
    localization: "false",
    market_data: "true",
    sparkline: "false",
    tickers: "false",
  });

  const payload = await fetchJson(url, {
    headers: getCoinGeckoHeaders(),
  });

  if (isRecord(payload)) {
    saveCoinGeckoCache("details", coingeckoId, payload);
    return payload;
  }

  return readCoinGeckoLastGood<UnknownRecord>("details", coingeckoId);
}

async function fetchMarketChart(coingeckoId: string) {
  const fresh = readCoinGeckoCache<{ prices: number[]; volumes: number[] }>(
    "chart",
    coingeckoId,
    COINGECKO_CHART_TTL_MS,
  );

  if (fresh) {
    return fresh;
  }

  const url = buildCoinGeckoUrl(`/coins/${coingeckoId}/market_chart`, {
    days: "90",
    interval: "daily",
    vs_currency: "usd",
  });

  const payload = await fetchJson(url, {
    headers: getCoinGeckoHeaders(),
  });

  if (!isRecord(payload)) {
    return readCoinGeckoLastGood<{ prices: number[]; volumes: number[] }>(
      "chart",
      coingeckoId,
    ) ?? {
      prices: [] as number[],
      volumes: [] as number[],
    };
  }

  const chart = {
    prices: arrayPayload(payload.prices)
      .map((row) => (Array.isArray(row) ? numberFrom(row[1]) : null))
      .filter((value): value is number => value !== null),
    volumes: arrayPayload(payload.total_volumes)
      .map((row) => (Array.isArray(row) ? numberFrom(row[1]) : null))
      .filter((value): value is number => value !== null),
  };

  if (chart.prices.length > 0) {
    saveCoinGeckoCache("chart", coingeckoId, chart);
    return chart;
  }

  return readCoinGeckoLastGood<{ prices: number[]; volumes: number[] }>(
    "chart",
    coingeckoId,
  ) ?? chart;
}

async function fetchCoinTickers(coingeckoId: string) {
  const fresh = readCoinGeckoCache<UnknownRecord[]>(
    "tickers",
    coingeckoId,
    COINGECKO_TICKERS_TTL_MS,
  );

  if (fresh) {
    return fresh;
  }

  const url = buildCoinGeckoUrl(`/coins/${coingeckoId}/tickers`, {
    depth: "false",
    include_exchange_logo: "false",
    order: "volume_desc",
  });

  const tickers = arrayPayload(
    await fetchJson(url, {
      headers: getCoinGeckoHeaders(),
    }),
  ).filter(isRecord);

  if (tickers.length > 0) {
    saveCoinGeckoCache("tickers", coingeckoId, tickers);
    return tickers;
  }

  return readCoinGeckoLastGood<UnknownRecord[]>("tickers", coingeckoId) ?? tickers;
}

function cryptoIntelligenceCacheId(token: TokenCard) {
  return `${token.coingeckoId}:${token.ticker}`;
}

function cryptoIntelligenceTokenInput(token: TokenCard) {
  return {
    coingeckoId: token.coingeckoId,
    ticker: token.ticker,
    title: token.title,
  };
}

async function callCryptoIntelligenceTool(
  token: TokenCard,
  tool: CryptoIntelligenceToolName,
): Promise<CryptoIntelligenceToolResult> {
  const cacheKind = `crypto-intelligence:${tool}`;
  const cacheId = cryptoIntelligenceCacheId(token);
  const cached = readCoinGeckoCache<CryptoIntelligenceToolResult>(
    cacheKind,
    cacheId,
    CRYPTO_INTELLIGENCE_TTL_MS,
  );

  if (cached !== null) {
    return cached;
  }

  try {
    const input = cryptoIntelligenceTokenInput(token);
    const result =
      tool === "get_fees_raw_data"
        ? await getCryptoIntelligenceFeesRawData(input)
        : tool === "get_revenue_raw_data"
          ? await getCryptoIntelligenceRevenueRawData(input)
          : tool === "get_governance_raw_data"
            ? await getCryptoIntelligenceGovernanceRawData(input)
            : await getCryptoIntelligenceProtocolRawData(input);

    saveCoinGeckoCache(cacheKind, cacheId, result);

    return result;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : `crypto-intelligence-${tool}-failed`,
      ok: false,
      payload: null,
      tool,
    };
  }
}

function normalizedDataKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function numberFromAliases(record: UnknownRecord, aliases: string[]) {
  const aliasSet = new Set(aliases.map(normalizedDataKey));

  for (const [key, value] of Object.entries(record)) {
    if (!aliasSet.has(normalizedDataKey(key))) {
      continue;
    }

    const direct = numberFrom(value);

    if (direct !== null) {
      return direct;
    }

    if (isRecord(value)) {
      const nested = nestedUsdNumber(record, key);

      if (nested !== null) {
        return nested;
      }
    }
  }

  return null;
}

function collectDataRows(value: unknown, depth = 0): UnknownRecord[] {
  if (depth > 4) {
    return [];
  }

  if (Array.isArray(value)) {
    const records = value.filter(isRecord);

    if (records.length > 0) {
      return records;
    }

    return value.flatMap((item) => collectDataRows(item, depth + 1));
  }

  if (!isRecord(value)) {
    return [];
  }

  return [
    ...(
      [
        "data",
        "result",
        "results",
        "items",
        "rows",
        "chart",
        "daily",
        "fees",
        "revenue",
        "proposals",
        "governance",
        "votes",
      ] as const
    ).flatMap((key) => collectDataRows(value[key], depth + 1)),
  ];
}

function rowDateMillis(row: UnknownRecord) {
  const value =
    row.date ??
    row.day ??
    row.time ??
    row.timestamp ??
    row.datetime ??
    row.created_at ??
    row.updated_at;

  if (typeof value === "number") {
    return value > 10_000_000_000 ? value : value * 1000;
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function aliasesWithWindow(aliases: string[], days: 7 | 30) {
  return aliases.flatMap((alias) => [
    alias,
    `${alias}${days}d`,
    `${alias}_${days}d`,
    `${alias}${days}days`,
    `${days}d${alias}`,
    `total${days}d`,
    `total_${days}d`,
  ]);
}

function findWindowTotal(value: unknown, aliases: string[], days: 7 | 30, depth = 0): number | null {
  if (depth > 4 || !isRecord(value)) {
    return null;
  }

  const direct = numberFromAliases(value, aliasesWithWindow(aliases, days));

  if (direct !== null) {
    return direct;
  }

  for (const nested of Object.values(value)) {
    const result = findWindowTotal(nested, aliases, days, depth + 1);

    if (result !== null) {
      return result;
    }
  }

  return null;
}

function sumRowsByWindow(rows: UnknownRecord[], aliases: string[], days: 7 | 30) {
  const rowsWithValue = rows
    .map((row, index) => ({
      dateMillis: rowDateMillis(row),
      index,
      value: numberFromAliases(row, aliases),
    }))
    .filter((row): row is { dateMillis: number | null; index: number; value: number } => row.value !== null);

  if (rowsWithValue.length === 0) {
    return null;
  }

  const dated = rowsWithValue.filter((row): row is { dateMillis: number; index: number; value: number } =>
    row.dateMillis !== null,
  );

  if (dated.length > 0) {
    const maxDate = Math.max(...dated.map((row) => row.dateMillis));
    const cutoff = maxDate - days * 24 * 60 * 60_000;

    return dated
      .filter((row) => row.dateMillis >= cutoff)
      .reduce((sum, row) => sum + row.value, 0);
  }

  return rowsWithValue
    .sort((left, right) => left.index - right.index)
    .slice(-days)
    .reduce((sum, row) => sum + row.value, 0);
}

function extractWindowTotal(payload: unknown, aliases: string[], days: 7 | 30) {
  const direct = findWindowTotal(payload, aliases, days);

  if (direct !== null) {
    return direct;
  }

  return sumRowsByWindow(collectDataRows(payload), aliases, days);
}

function detectGovernanceCatalyst(payload: unknown) {
  const rows = collectDataRows(payload);
  const candidates = rows.length > 0 ? rows : isRecord(payload) ? [payload] : [];

  for (const row of candidates) {
    const text = [
      stringFrom(row, ["title", "name", "proposal", "summary", "body", "description"]),
      stringFrom(row, ["state", "status"]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (!/fee.?switch|buyback|revenue|holder|holders|burn/.test(text)) {
      continue;
    }

    if (!/active|live|open|voting|pending|started|ongoing/.test(text)) {
      continue;
    }

    return {
      source: stringFrom(row, ["space", "source", "url", "link"]) ?? "Snapshot",
      title:
        stringFrom(row, ["title", "name", "proposal", "summary"]) ??
        "live fee-switch/buyback proposal",
    };
  }

  return null;
}

async function fetchValueCaptureData(token: TokenCard) {
  const [feesResult, revenueResult, governanceResult, protocolResult] = await Promise.allSettled([
    callCryptoIntelligenceTool(token, "get_fees_raw_data"),
    callCryptoIntelligenceTool(token, "get_revenue_raw_data"),
    callCryptoIntelligenceTool(token, "get_governance_raw_data"),
    callCryptoIntelligenceTool(token, "get_protocol_raw_data"),
  ]);
  const feesTool = getSettledValue(feesResult, {
    error: "fees-tool-failed",
    ok: false,
    payload: null,
    tool: "get_fees_raw_data" as const,
  });
  const revenueTool = getSettledValue(revenueResult, {
    error: "revenue-tool-failed",
    ok: false,
    payload: null,
    tool: "get_revenue_raw_data" as const,
  });
  const governanceTool = getSettledValue(governanceResult, {
    error: "governance-tool-failed",
    ok: false,
    payload: null,
    tool: "get_governance_raw_data" as const,
  });
  const protocolTool = getSettledValue(protocolResult, {
    error: "protocol-tool-failed",
    ok: false,
    payload: null,
    tool: "get_protocol_raw_data" as const,
  });
  const feeAliases = [
    "fees",
    "fee",
    "dailyFees",
    "daily_fees",
    "totalFees",
    "total_fees",
    "amount",
    "value",
    "usd",
  ];
  const protocolRevenueAliases = [
    "protocolRevenue",
    "protocol_revenue",
    "dailyRevenue",
    "daily_revenue",
    "revenue",
  ];
  const holdersRevenueAliases = [
    "holdersRevenue",
    "holders_revenue",
    "dailyHoldersRevenue",
    "daily_holders_revenue",
    "tokenHolderRevenue",
    "token_holders_revenue",
    "holderRevenue",
    "holder_revenue",
  ];
  const fees7dUsd = feesTool.ok ? extractWindowTotal(feesTool.payload, feeAliases, 7) : null;
  const fees30dUsd = feesTool.ok ? extractWindowTotal(feesTool.payload, feeAliases, 30) : null;
  const protocolRevenue7dUsd = revenueTool.ok
    ? extractWindowTotal(revenueTool.payload, protocolRevenueAliases, 7)
    : null;
  const protocolRevenue30dUsd = revenueTool.ok
    ? extractWindowTotal(revenueTool.payload, protocolRevenueAliases, 30)
    : null;
  const holdersRevenue7dUsd = revenueTool.ok
    ? extractWindowTotal(revenueTool.payload, holdersRevenueAliases, 7)
    : null;
  const holdersRevenue30dUsd = revenueTool.ok
    ? extractWindowTotal(revenueTool.payload, holdersRevenueAliases, 30)
    : null;
  const catalyst = governanceTool.ok ? detectGovernanceCatalyst(governanceTool.payload) : null;

  void protocolTool;

  return {
    catalystBadge: catalyst ? "возможен fee switch" : null,
    catalystSource: catalyst?.source ?? null,
    catalystText: catalyst
      ? `В governance есть live proposal: ${catalyst.title}. Это катализатор, но не факт текущего value capture.`
      : null,
    feeDataAvailable: fees7dUsd !== null || fees30dUsd !== null,
    fees30dUsd,
    fees7dUsd,
    holdersRevenue30dUsd,
    holdersRevenueDataAvailable: holdersRevenue7dUsd !== null || holdersRevenue30dUsd !== null,
    holdersRevenue7dUsd,
    protocolRevenue30dUsd,
    protocolRevenue7dUsd,
    source: "crypto-intelligence-local",
    tools: {
      get_fees_raw_data: feesTool,
      get_governance_raw_data: governanceTool,
      get_protocol_raw_data: protocolTool,
      get_revenue_raw_data: revenueTool,
    },
  };
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

function emptyValueCaptureRawData(error = "value-capture-source-unavailable"): ValueCaptureRawData {
  return {
    catalystBadge: null,
    catalystSource: null,
    catalystText: null,
    feeDataAvailable: false,
    fees30dUsd: null,
    fees7dUsd: null,
    holdersRevenue30dUsd: null,
    holdersRevenueDataAvailable: false,
    holdersRevenue7dUsd: null,
    protocolRevenue30dUsd: null,
    protocolRevenue7dUsd: null,
    source: "crypto-intelligence-local",
    tools: Object.fromEntries(
      VALUE_CAPTURE_TOOL_NAMES.map((tool) => [
        tool,
        {
          error,
          ok: false,
          payload: null,
          tool,
        } satisfies CryptoIntelligenceToolResult,
      ]),
    ) as Partial<Record<CryptoIntelligenceToolName, CryptoIntelligenceToolResult>>,
  };
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
      "Секторный фон оценивается по доступным рыночным и проектным данным.",
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

function buildTechnical(
  prices: number[],
  currentPrice: number | null,
  market: ReturnType<typeof buildMarket>,
  symbol?: string | null,
) {
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
  let pumpRisk = calculatePumpRisk({
    change24h: market.priceChange24h,
    change7d: market.priceChange7d,
    change30d: market.priceChange30d,
    nearHigh,
    rsi14: summary.rsi14,
  });
  const isBtc = symbol?.toUpperCase() === "BTC";
  const btcHasNoPump =
    isBtc &&
    (market.priceChange24h ?? 0) < 8 &&
    (market.priceChange7d ?? 0) < 15 &&
    (market.priceChange30d ?? 0) < 35 &&
    (summary.rsi14 ?? 0) < 60;

  if (btcHasNoPump && pumpRisk.level === "medium") {
    pumpRisk = {
      labelRu: "Низкий риск",
      level: "low",
      reasons: ["BTC без заметного разгона по 24ч/7д/30д и RSI ниже 60"],
      scoreDelta: 8,
      textRu: "По доступной динамике нет явного признака сильного разгона.",
    };
  }

  return {
    ...summary,
    nearHigh,
    nearLow: Number.isFinite(nearLow) ? nearLow : null,
    position,
    pumpRisk,
  };
}

function buildVolume(marketCap: number | null, volume24h: number | null, symbol?: string | null) {
  const summary = buildVolumeSummary(marketCap, volume24h, symbol);
  const isBtc = symbol?.toUpperCase() === "BTC";
  const benchmark =
    isBtc || marketCap === null
      ? null
      : marketCap > 10_000_000_000
        ? 0.05
        : marketCap > 1_000_000_000
          ? 0.03
          : 0.02;

  return {
    benchmark,
    benchmarkPercent: summary.benchmarkRatioPercent,
    benchmarkRatioPercent: summary.benchmarkRatioPercent,
    explanation:
      summary.volumeToMarketCap === null
        ? "Не удалось сравнить объём с капитализацией."
        : isBtc
          ? "Рынок без сильного импульса. Это не критичный риск, но вход лучше делать частями, а не всей суммой сразу."
          : "Оборот показывает, насколько активно рынок торгует активом относительно его размера.",
    label: summary.label,
    value: volume24h,
    volumeToMarketCap: summary.volumeToMarketCap,
  };
}

function buildLiquidity(
  tickers: UnknownRecord[],
  volumeToMarketCap: number | null,
  symbol?: string | null,
) {
  const trustedTickerCount = tickers.filter(
    (ticker) => stringFrom(ticker, ["trust_score"]) === "green",
  ).length;
  const tickerCount = tickers.length;
  const scoreFromTickers = tickerCount > 0 ? Math.min(70, tickerCount * 2) + Math.min(30, trustedTickerCount * 3) : null;
  const isBtc = symbol?.toUpperCase() === "BTC";
  const scoreFromVolume =
    volumeToMarketCap === null
      ? null
      : isBtc
        ? volumeToMarketCap < 0.008
          ? 35
          : volumeToMarketCap < 0.015
            ? 65
            : volumeToMarketCap < 0.03
              ? 80
              : 90
        : Math.min(100, Math.round((volumeToMarketCap / 0.05) * 100));
  const score = scoreFromTickers ?? scoreFromVolume;

  return {
    benchmarkRatioPercent: scoreFromVolume,
    cexPairs: null,
    dexPairs: null,
    explanation:
      tickerCount > 0
        ? "Ликвидность оценена по числу торговых пар и trust score."
        : isBtc
          ? "Для BTC спокойный оборот не считается критичным риском."
          : "Ликвидность оценена приблизительно через оборот к капитализации.",
    isApproximate: tickerCount === 0,
    isEstimated: tickerCount === 0,
    label:
      score === null
        ? "Ликвидность оценивается осторожно"
        : score >= 75
          ? "Ликвидность выглядит комфортно"
          : score >= 45
            ? "Ликвидность средняя"
            : "Ликвидность слабая",
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
          ? "Unlocks подтянуты частично — точный размер не подтверждён, поэтому фактор учитывается осторожно."
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
      label: nextUnlockPercent === null ? "Unlocks учитываются осторожно" : "Fallback unlocks",
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
      "Unlocks временно не подтянулись автоматически, поэтому токеномический фактор учитывается осторожно.",
    isAvailable: false,
    label: "Unlocks учитываются осторожно",
    lockedPercent: null,
    nextUnlockAmount: null,
    nextUnlockDate: null,
    nextUnlockPercent: null,
    note: "Unlocks временно не подтянулись автоматически, поэтому токеномический фактор учитывается осторожно.",
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
      allocationName: null,
      allocationBreakdown: [],
      comparedSources: [],
      conflicts: [],
      lockedPercentage: null,
      manualCheckUrls: manualCheckLinksForToken(token),
      maxSupply: null,
      nextUnlockAmount: null,
      nextUnlockAmountUsd: null,
      nextUnlockDate: null,
      nextUnlockMarketCapPercent: null,
      nextUnlockPercent: null,
      provider: "base-asset-rule",
      providerStatus: "exact",
      rawTitle: null,
      releasedPercentage: null,
      sourceUrl: null,
      tbdLockedAmount: null,
      tbdPercentage: null,
      tokenomistSummary: null,
      tokenomics: null,
      totalLockedAmount: null,
      unlockedAmount: null,
      unlockedPercent: null,
      unlockEvents: [],
      unlocksRemainingNative: null,
      unlocksRemainingUsd: null,
      untrackedAmount: null,
      vestingChart: [],
      vestingEndDate: null,
      allocations: [],
      updatedAt: new Date().toISOString(),
      warnings: [],
    };
  }

  return {
    circulatingSupplyPercent: null,
    confidence: "unknown",
    explanation:
      "Автоматически не удалось получить точный график unlocks. Токеномический фактор учитывается осторожно и снижает уверенность оценки.",
    isAvailable: false,
    label: "Unlocks учитываются осторожно",
    lockedPercent: null,
    allocationName: null,
    allocationBreakdown: [],
    comparedSources: [],
    conflicts: [],
    lockedPercentage: null,
    manualCheckUrls: manualCheckLinksForToken(token),
    maxSupply: null,
    nextUnlockAmount: null,
    nextUnlockAmountUsd: null,
    nextUnlockDate: null,
    nextUnlockMarketCapPercent: null,
    nextUnlockPercent: null,
    provider: "fallback",
    providerStatus: "manual-check",
    rawTitle: null,
    releasedPercentage: null,
    sourceUrl: null,
    tbdLockedAmount: null,
    tbdPercentage: null,
    tokenomistSummary: null,
    tokenomics: null,
    totalLockedAmount: null,
    unlockedAmount: null,
    unlockedPercent: null,
    unlockEvents: [],
    unlocksRemainingNative: null,
    unlocksRemainingUsd: null,
    untrackedAmount: null,
    vestingChart: [],
    vestingEndDate: null,
    allocations: [],
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
    allocationName: data.allocationName,
    allocationBreakdown: data.allocationBreakdown,
    comparedSources: data.comparedSources,
    conflicts: data.conflicts,
    lockedPercentage: data.lockedPercentage,
    manualCheckUrls: data.manualCheckUrls,
    maxSupply: data.maxSupply,
    nextUnlockAmount: data.nextUnlockAmount,
    nextUnlockAmountUsd: data.nextUnlockAmountUsd,
    nextUnlockDate: data.nextUnlockDate,
    nextUnlockMarketCapPercent: data.nextUnlockMarketCapPercent,
    nextUnlockPercent: data.nextUnlockPercent,
    note: data.explanation,
    provider: data.provider,
    providerStatus: data.providerStatus,
    rawTitle: data.rawTitle ?? null,
    releasedPercentage: data.releasedPercentage,
    risk: unlockRiskLevel(data),
    source: data.provider,
    sourceUrl: data.sourceUrl,
    tbdLockedAmount: data.tbdLockedAmount,
    tbdPercentage: data.tbdPercentage,
    tokenomistSummary: data.tokenomistSummary,
    tokenomics: data.tokenomics,
    totalLockedAmount: data.totalLockedAmount,
    unlockedAmount: data.unlockedAmount,
    unlockedPercent: data.unlockedPercent,
    unlockEvents: data.unlockEvents,
    unlocksRemainingNative: data.unlocksRemainingNative,
    unlocksRemainingUsd: data.unlocksRemainingUsd,
    untrackedAmount: data.untrackedAmount,
    vestingChart: data.vestingChart,
    vestingEndDate: data.vestingEndDate,
    allocations: data.allocations,
    warnings: data.warnings,
  } satisfies TokenUnlockSummary & {
    allocations: TokenUnlockData["allocations"];
    allocationName: string | null;
    allocationBreakdown: TokenUnlockData["allocationBreakdown"];
    comparedSources: string[];
    conflicts: string[];
    explanation: string;
    isAvailable: boolean;
    label: string;
    lockedPercentage: number | null;
    manualCheckUrls: TokenUnlockData["manualCheckUrls"];
    maxSupply: number | null;
    nextUnlockAmountUsd: number | null;
    nextUnlockMarketCapPercent: number | null;
    providerStatus: TokenUnlockData["providerStatus"];
    rawTitle: string | null;
    releasedPercentage: number | null;
    sourceUrl: string | null;
    tbdLockedAmount: number | null;
    tbdPercentage: number | null;
    tokenomistSummary: TokenUnlockData["tokenomistSummary"];
    tokenomics: TokenUnlockData["tokenomics"];
    totalLockedAmount: number | null;
    unlockedAmount: number | null;
    unlockEvents: TokenUnlockData["unlockEvents"];
    unlocksRemainingNative: number | null;
    unlocksRemainingUsd: number | null;
    untrackedAmount: number | null;
    vestingChart: TokenUnlockData["vestingChart"];
    vestingEndDate: string | null;
    warnings: string[];
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

function valueCapturePublicStatus(summary: TokenValueCaptureSummary): string {
  if (summary.status === "unknown" && summary.confidence === "manual") {
    return summary.fees30dUsd !== null || summary.fees7dUsd !== null ? "partial" : "unknown";
  }

  return "ok";
}

function enrichValueCaptureSummary(
  summary: TokenValueCaptureSummary,
  {
    sourceStatus,
    stale,
    updatedAt,
  }: {
    sourceStatus?: string;
    stale?: boolean;
    updatedAt: string;
  },
): TokenValueCaptureSummary {
  return {
    ...summary,
    fees30d: summary.fees30dUsd ?? null,
    governanceCatalyst:
      summary.catalystBadge || summary.catalystSource || summary.catalystText
        ? {
            badge: summary.catalystBadge ?? null,
            source: summary.catalystSource ?? null,
            text: summary.catalystText ?? null,
          }
        : null,
    holdersRevenue30d: summary.holdersRevenue30dUsd ?? null,
    holdersRevenue7d: summary.holdersRevenue7dUsd ?? null,
    label: summary.badge,
    protocolRevenue30d: summary.protocolRevenue30dUsd ?? null,
    sourceStatus: sourceStatus ?? valueCapturePublicStatus(summary),
    stale: stale ?? false,
    updatedAt,
  };
}

function normalizeResponseValueCapture(
  response: ChecklistResponse,
  options: {
    sourceStatus?: string;
    stale?: boolean;
  } = {},
): ChecklistResponse {
  const runtimeResponse = response as ChecklistResponse & {
    valueCapture?: TokenValueCaptureSummary | null;
  };
  const valueCapture =
    runtimeResponse.valueCapture ??
    calculateValueCapture(emptyValueCaptureRawData("value-capture-missing-from-response"));

  return {
    ...response,
    valueCapture: enrichValueCaptureSummary(valueCapture, {
      sourceStatus: options.sourceStatus,
      stale: options.stale ?? response.dataQuality === "last-good",
      updatedAt: response.updatedAt,
    }),
  };
}

function valueCaptureCacheRejectedReason(
  response: ChecklistResponse,
  schemaVersion?: string,
): CacheRejectedReason | null {
  const runtimeResponse = response as ChecklistResponse & {
    valueCapture?: Partial<TokenValueCaptureSummary> | null;
  };

  if (!runtimeResponse.valueCapture) {
    return "missing-value-capture";
  }

  if (!runtimeResponse.valueCapture.status) {
    return "missing-value-capture-status";
  }

  if (!runtimeResponse.valueCapture.confidence) {
    return "missing-value-capture-confidence";
  }

  if (schemaVersion !== TOKEN_CHECKLIST_RESPONSE_SCHEMA_VERSION) {
    return "schema-version-mismatch";
  }

  return null;
}

function cachedEntryRejectedReason(
  coingeckoId: string,
  ttlMs: number,
): CacheRejectedReason | null {
  const cached = serverCache.get(coingeckoId);

  if (!cached || Date.now() - cached.updatedAt > ttlMs) {
    return null;
  }

  return valueCaptureCacheRejectedReason(cached.response, cached.schemaVersion);
}

function sourceStatusFromCryptoIntelligenceTool(
  result: CryptoIntelligenceToolResult | undefined,
): SourceStatus | "skipped" {
  if (!result) {
    return "skipped";
  }

  if (!result.ok) {
    return "failed";
  }

  return result.payload ? "ok" : "partial";
}

function sourceStatusFromValueCaptureRaw(raw: ValueCaptureRawData | null | undefined) {
  const statuses = VALUE_CAPTURE_TOOL_NAMES.map((tool) =>
    sourceStatusFromCryptoIntelligenceTool(raw?.tools?.[tool]),
  ).filter((status) => status !== "skipped");

  if (statuses.length === 0) {
    return undefined;
  }

  if (statuses.every((status) => status === "ok")) {
    return "ok";
  }

  if (statuses.every((status) => status === "failed")) {
    return "failed";
  }

  return "partial";
}

function buildAnalysisSignals({
  liquidity,
  marketRisk,
  symbol,
  technical,
  unlocks,
  volume,
}: {
  liquidity: ReturnType<typeof buildLiquidity>;
  marketRisk?: ChecklistMarketRisk;
  symbol?: string | null;
  technical: ReturnType<typeof buildTechnical>;
  unlocks: ReturnType<typeof buildUnlocksFromProvider>;
  volume: ReturnType<typeof buildVolume>;
}): TokenAnalysisSignal[] {
  const technicalLevel: TokenChecklistRiskLevel =
    technical.position === "hot"
      ? "high"
      : technical.position === "cold" || technical.position === "neutral"
        ? "low"
        : "medium";
  const isBtc = symbol?.toUpperCase() === "BTC";
  const volumeLevel: TokenChecklistRiskLevel =
    volume.volumeToMarketCap === null
      ? "medium"
      : isBtc
        ? volume.volumeToMarketCap < 0.008
          ? "medium"
          : "low"
        : volume.volumeToMarketCap < 0.01
          ? "high"
          : volume.volumeToMarketCap < 0.03
            ? "medium"
            : "low";
  const liquidityLevel: TokenChecklistRiskLevel =
    liquidity.score === null
      ? "medium"
      : liquidity.score < 45
        ? "medium"
        : "low";
  const lockedPercentage = unlocks.lockedPercentage ?? unlocks.lockedPercent;
  const tbdPercentage = unlocks.tbdPercentage ?? null;
  const supplyEventPercent = unlocks.nextUnlockMarketCapPercent ?? unlocks.nextUnlockPercent;
  const hasRealSupplyEvent =
    (unlocks.providerStatus === "exact" || unlocks.providerStatus === "recent-unlock") &&
    supplyEventPercent !== null;
  const tokenomicsLevel: TokenChecklistRiskLevel = hasRealSupplyEvent
    ? supplyEventPercent > 2
      ? "high"
      : supplyEventPercent >= 0.5
        ? "medium"
        : "low"
    : lockedPercentage !== null
      ? lockedPercentage > 50
        ? "high"
        : lockedPercentage >= 15 || (tbdPercentage !== null && tbdPercentage > 20)
          ? "medium"
          : "low"
      : "low";
  const tokenomicsText = hasRealSupplyEvent
    ? supplyEventPercent > 2
      ? "Есть заметное событие предложения, оно учтено как отдельный риск."
      : "Событие предложения учтено в общей оценке."
    : lockedPercentage !== null
      ? lockedPercentage >= 35
        ? "Доля заблокированного предложения заметная, поэтому токеномический риск учитывается в оценке."
        : lockedPercentage >= 15 || (tbdPercentage !== null && tbdPercentage > 20)
          ? "Часть предложения ещё находится вне свободного обращения. Это учитывается в оценке риска."
          : "Токеномический фон выглядит умеренным по полученным данным."
      : "Токеномика не добавляет заметного давления к текущему выводу.";
  const macroLevel: TokenChecklistRiskLevel =
    marketRisk?.level === "high" ? "high" : marketRisk?.level === "medium" ? "medium" : "low";
  const macroText =
    marketRisk?.level === "high"
      ? "В ближайшем окне есть high-событие по macro/BTC, поэтому риск резкого движения выше."
      : marketRisk?.level === "medium"
        ? marketRisk.title
          ? `Есть событие среднего влияния: ${marketRisk.title}. Это информационный фактор.`
          : "Есть событие среднего влияния. Это информационный фактор."
        : "High-событий по macro/BTC в ближайшем окне не видно.";

  return [
    {
      key: "pumpRisk",
      label: "Памп-риск",
      level: technical.pumpRisk.level === "unknown" ? "medium" : technical.pumpRisk.level,
      text: technical.pumpRisk.textRu,
    },
    {
      key: "technicalRisk",
      label: "Техническая зона",
      level: technicalLevel,
      text:
        technical.position === "hot"
          ? "Цена выглядит горячей относительно последних движений."
          : technical.position === "cold"
            ? "Цена выглядит охлаждённой относительно последних движений."
            : technical.position === "neutral"
              ? "Техническая зона ближе к нейтральной."
              : "Техническая зона оценивается по цене, объёму и общему контексту.",
    },
    {
      key: "volume",
      label: "Объём",
      level: volumeLevel,
      text:
        volume.volumeToMarketCap === null
          ? "Оборот не добавляет сильного вывода к текущей оценке."
          : volume.explanation,
    },
    {
      key: "liquidity",
      label: "Ликвидность",
      level: liquidityLevel,
      text: liquidity.explanation,
    },
    {
      key: "tokenomics",
      label: "Токеномика",
      level: tokenomicsLevel,
      text: tokenomicsText,
    },
    {
      key: "macro",
      label: "Макро/BTC-фон",
      level: macroLevel,
      text: macroText,
    },
  ];
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
    return `По полученным данным оценка получилась базовой. Сектор: ${project.sectorRu}. Рыночные, технические и токеномические факторы учтены в текущей оценке.`;
  }

  if (verdict.riskLevel === "high") {
    return "По полученным данным вход сейчас выглядит некомфортно: риск перегрева или слабой структуры выше обычного.";
  }

  if (verdict.riskLevel === "medium-high") {
    return "По полученным данным лучше не спешить: есть несколько факторов осторожности, которые заметно влияют на оценку.";
  }

  if (verdict.riskLevel === "medium") {
    return "По полученным данным токен можно изучать дальше, но вход сейчас не выглядит максимально спокойным.";
  }

  return "По полученным данным зона выглядит достаточно комфортной для изучения без спешки.";
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
  const technical = buildTechnical([], null, market, token.ticker);
  const volume = buildVolume(null, null, token.ticker);
  const liquidity = buildLiquidity([], null, token.ticker);
  const unlockData = fallbackUnlockData(token);
  const unlocks = buildUnlocksFromProvider(unlockData);
  const score = calculateTokenEntryScore({
    assetSymbol: token.ticker,
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
    scoreBreakdown: score.scoreBreakdown,
    text: score.verdictText,
    title: score.verdictTitle,
  };

  return {
    analysisSignals: buildAnalysisSignals({
      liquidity,
      marketRisk: { level: "none", title: null },
      symbol: token.ticker,
      technical,
      unlocks,
      volume,
    }),
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
      pumpRisk: technical.pumpRisk.level,
      pumpRiskLabel: technical.pumpRisk.labelRu,
      pumpRiskText: technical.pumpRisk.textRu,
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
      allocationName: unlocks.allocationName,
      allocationBreakdown: unlocks.allocationBreakdown,
      comparedSources: unlocks.comparedSources,
      conflicts: unlocks.conflicts,
      lockedPercentage: unlocks.lockedPercentage,
      manualCheckUrls: unlocks.manualCheckUrls,
      maxSupply: unlocks.maxSupply,
      nextUnlockAmount: unlocks.nextUnlockAmount,
      nextUnlockAmountUsd: unlocks.nextUnlockAmountUsd,
      nextUnlockDate: unlocks.nextUnlockDate,
      nextUnlockMarketCapPercent: unlocks.nextUnlockMarketCapPercent,
      nextUnlockPercent: unlocks.nextUnlockPercent,
      provider: unlocks.provider ?? "manual-check",
      providerStatus: unlocks.providerStatus ?? "manual-check",
      rawTitle: unlocks.rawTitle,
      confidence: unlocks.confidence ?? "unknown",
      circulatingSupplyPercent: unlocks.circulatingSupplyPercent ?? null,
      releasedPercentage: unlocks.releasedPercentage,
      sourceUrl: unlocks.sourceUrl,
      tbdLockedAmount: unlocks.tbdLockedAmount,
      tbdPercentage: unlocks.tbdPercentage,
      tokenomistSummary: unlocks.tokenomistSummary,
      tokenomics: unlocks.tokenomics,
      totalLockedAmount: unlocks.totalLockedAmount,
      unlockedAmount: unlocks.unlockedAmount,
      unlockedPercent: unlocks.unlockedPercent,
      unlockEvents: unlocks.unlockEvents,
      unlocksRemainingNative: unlocks.unlocksRemainingNative,
      unlocksRemainingUsd: unlocks.unlocksRemainingUsd,
      untrackedAmount: unlocks.untrackedAmount,
      vestingChart: unlocks.vestingChart,
      vestingEndDate: unlocks.vestingEndDate,
      allocations: unlocks.allocations,
      warnings: unlocks.warnings,
    },
    updatedAt: new Date().toISOString(),
    valueCapture: calculateValueCapture({
      catalystBadge: null,
      catalystSource: null,
      catalystText: null,
      feeDataAvailable: false,
      fees30dUsd: null,
      fees7dUsd: null,
      holdersRevenue30dUsd: null,
      holdersRevenueDataAvailable: false,
      holdersRevenue7dUsd: null,
      protocolRevenue30dUsd: null,
      source: "crypto-intelligence-local",
    }),
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
    marketRisk?: ChecklistMarketRisk;
    market: UnknownRecord | null;
    tickers: UnknownRecord[];
    unlockData: TokenUnlockData;
    valueCapture: TokenValueCaptureSummary;
  },
  sourceStatus: SourceStatusMap,
  warnings: string[],
): ChecklistResponse {
  const market = buildMarket(values.market, values.details);
  const project = buildProject(token.description, token.coingeckoId, values.details);
  const technical = buildTechnical(values.chart.prices, market.currentPrice, market, token.ticker);
  const volume = buildVolume(market.marketCap, market.totalVolume, token.ticker);
  const liquidity = buildLiquidity(values.tickers, volume.volumeToMarketCap, token.ticker);
  const unlocks = buildUnlocksFromProvider(values.unlockData);
  const score = calculateTokenEntryScore({
    assetSymbol: token.ticker,
    liquidity,
    market,
    marketRisk: values.marketRisk,
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
    scoreBreakdown: score.scoreBreakdown,
    text: score.verdictText,
    title: score.verdictTitle,
  };

  return {
    analysisSignals: buildAnalysisSignals({
      liquidity,
      marketRisk: values.marketRisk,
      symbol: token.ticker,
      technical,
      unlocks,
      volume,
    }),
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
      pumpRisk: technical.pumpRisk.level,
      pumpRiskLabel: technical.pumpRisk.labelRu,
      pumpRiskText: technical.pumpRisk.textRu,
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
      allocationName: unlocks.allocationName,
      allocationBreakdown: unlocks.allocationBreakdown,
      comparedSources: unlocks.comparedSources,
      conflicts: unlocks.conflicts,
      lockedPercentage: unlocks.lockedPercentage,
      manualCheckUrls: unlocks.manualCheckUrls,
      maxSupply: unlocks.maxSupply,
      nextUnlockAmount: unlocks.nextUnlockAmount,
      nextUnlockAmountUsd: unlocks.nextUnlockAmountUsd,
      nextUnlockDate: unlocks.nextUnlockDate,
      nextUnlockMarketCapPercent: unlocks.nextUnlockMarketCapPercent,
      nextUnlockPercent: unlocks.nextUnlockPercent,
      provider: unlocks.provider ?? values.unlockData.provider,
      providerStatus: unlocks.providerStatus ?? values.unlockData.providerStatus,
      rawTitle: unlocks.rawTitle,
      confidence: unlocks.confidence ?? values.unlockData.confidence,
      circulatingSupplyPercent: unlocks.circulatingSupplyPercent ?? null,
      releasedPercentage: unlocks.releasedPercentage,
      sourceUrl: unlocks.sourceUrl,
      tbdLockedAmount: unlocks.tbdLockedAmount,
      tbdPercentage: unlocks.tbdPercentage,
      tokenomistSummary: unlocks.tokenomistSummary,
      tokenomics: unlocks.tokenomics,
      totalLockedAmount: unlocks.totalLockedAmount,
      unlockedAmount: unlocks.unlockedAmount,
      unlockedPercent: unlocks.unlockedPercent,
      unlockEvents: unlocks.unlockEvents,
      unlocksRemainingNative: unlocks.unlocksRemainingNative,
      unlocksRemainingUsd: unlocks.unlocksRemainingUsd,
      untrackedAmount: unlocks.untrackedAmount,
      vestingChart: unlocks.vestingChart,
      vestingEndDate: unlocks.vestingEndDate,
      allocations: unlocks.allocations,
      warnings: unlocks.warnings,
    },
    updatedAt: new Date().toISOString(),
    valueCapture: values.valueCapture,
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
      "Показан сохранённый результат по последним полученным данным.",
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
      "Показан сохранённый результат по последним полученным данным",
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
    response: normalizeResponseValueCapture(response),
    schemaVersion: TOKEN_CHECKLIST_RESPONSE_SCHEMA_VERSION,
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
      "Локальная карточка для этого токена пока готовится. Оценка строится по доступным рыночным данным.",
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

const VALUE_CAPTURE_SOURCE_LABELS: Record<CryptoIntelligenceToolName, string> = {
  get_fees_raw_data: "DefiLlama fees",
  get_governance_raw_data: "Snapshot governance",
  get_protocol_raw_data: "DefiLlama protocol",
  get_revenue_raw_data: "DefiLlama revenue",
};

function valueCaptureToolSourceDebug(
  tool: CryptoIntelligenceToolName,
  result: CryptoIntelligenceToolResult | undefined,
  cacheStatus: ChecklistDebug["cacheStatus"],
): SourceDebug {
  const rows = result?.payload ? collectDataRows(result.payload) : [];
  const status = sourceStatusFromCryptoIntelligenceTool(result);

  return {
    enabled: true,
    fieldsReceived: receivedFields(result?.payload),
    name: VALUE_CAPTURE_SOURCE_LABELS[tool],
    rawCount: rows.length > 0 ? rows.length : result?.payload ? 1 : 0,
    reason:
      status === "skipped"
        ? `value-capture-${cacheStatus}`
        : result?.ok === false
          ? result.error ?? "source-failed"
          : undefined,
    sample: sampleForDebug(result?.payload),
    status,
  };
}

function buildValueCaptureSources(
  raw: ValueCaptureRawData | null | undefined,
  cacheStatus: ChecklistDebug["cacheStatus"],
) {
  return VALUE_CAPTURE_TOOL_NAMES.map((tool) =>
    valueCaptureToolSourceDebug(tool, raw?.tools?.[tool], cacheStatus),
  );
}

function buildValueCaptureDebug({
  cacheStatus,
  raw,
  response,
}: {
  cacheStatus: ChecklistDebug["cacheStatus"];
  raw?: ValueCaptureRawData | null;
  response: ChecklistResponse;
}): ChecklistDebug["valueCapture"] {
  const valueCapture = normalizeResponseValueCapture(response).valueCapture;
  const sources = buildValueCaptureSources(raw, cacheStatus);

  return {
    cacheStatus,
    confidence: valueCapture.confidence,
    fees30d: valueCapture.fees30d ?? valueCapture.fees30dUsd ?? null,
    feesStatus: sourceStatusFromCryptoIntelligenceTool(raw?.tools?.get_fees_raw_data),
    governanceStatus: sourceStatusFromCryptoIntelligenceTool(raw?.tools?.get_governance_raw_data),
    holdersRevenue30d:
      valueCapture.holdersRevenue30d ?? valueCapture.holdersRevenue30dUsd ?? null,
    holdersRevenue7d: valueCapture.holdersRevenue7d ?? valueCapture.holdersRevenue7dUsd ?? null,
    protocolRevenue30d:
      valueCapture.protocolRevenue30d ?? valueCapture.protocolRevenue30dUsd ?? null,
    protocolStatus: sourceStatusFromCryptoIntelligenceTool(raw?.tools?.get_protocol_raw_data),
    revenueStatus: sourceStatusFromCryptoIntelligenceTool(raw?.tools?.get_revenue_raw_data),
    sources,
    stale: valueCapture.stale ?? response.dataQuality === "last-good",
    status: valueCapture.status,
  };
}

function buildDebug({
  cacheRejectedReason,
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
  valueCaptureRaw,
  responsePath,
  valueCaptureCacheRepair,
}: {
  cacheRejectedReason?: CacheRejectedReason;
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
  valueCaptureRaw?: ValueCaptureRawData | null;
  responsePath: ChecklistResponsePath;
  valueCaptureCacheRepair: boolean;
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
    response.unlocks.providerStatus === "manual-check" ? "unlocks" : null,
  ].filter((item): item is string => item !== null);
  const coinGeckoEnv = getCoinGeckoEnvStatus();

  return {
    buildInfo: {
      cacheSchemaVersion: TOKEN_CHECKLIST_RESPONSE_SCHEMA_VERSION,
      valueCaptureContractVersion: TOKEN_CHECKLIST_VALUE_CAPTURE_CONTRACT_VERSION,
    },
    cacheStatus,
    ...(cacheRejectedReason ? { cacheRejectedReason } : {}),
    env: {
      COINGECKO_AVAILABLE:
        response.sourceStatus.market !== "failed" ||
        response.sourceStatus.details !== "failed" ||
        response.sourceStatus.chart !== "failed" ||
        response.sourceStatus.tickers !== "failed",
      COINGECKO_API_KEY: coinGeckoEnv.COINGECKO_API_KEY,
      COINGECKO_API_PLAN: coinGeckoEnv.COINGECKO_API_PLAN,
      COINGLASS_API_KEY: Boolean(process.env.COINGLASS_API_KEY),
      COINGLASS_ENABLED: process.env.COINGLASS_ENABLED === "true",
      CRYPTORANK_API_KEY: Boolean(process.env.CRYPTORANK_API_KEY),
      CRYPTORANK_ENABLED: process.env.CRYPTORANK_ENABLED === "true",
      MESSARI_API_KEY: Boolean(process.env.MESSARI_API_KEY),
      MOBULA_API_KEY: Boolean(process.env.MOBULA_API_KEY),
      TOKENOMIST_API_KEY: Boolean(process.env.TOKENOMIST_API_KEY),
      TOKENOMIST_ENABLED: process.env.TOKENOMIST_ENABLED === "true",
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
    responsePath,
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
      ...buildValueCaptureSources(valueCaptureRaw, cacheStatus),
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
    scoreBreakdown: response.verdict.scoreBreakdown,
    unlocks: {
      attemptsSummary: unlockResult.attemptsSummary,
      cacheStatus: unlockResult.cacheStatus,
      confidence: response.unlocks.confidence,
      comparedSources: response.unlocks.comparedSources,
      conflicts: response.unlocks.conflicts,
      manualCheckUrls: response.unlocks.manualCheckUrls,
      providerStatus: response.unlocks.providerStatus,
      selectedProvider: response.unlocks.provider,
      providerUsed: response.unlocks.provider,
      requestedSymbol: token.ticker,
      resolvedCryptoRankSlug: resolveCryptoRankToken({
        coingeckoId: token.coingeckoId,
        symbol: token.ticker,
      }).cryptoRankSlug,
      tokenomicsProvider: response.unlocks.tokenomics?.provider ?? null,
      validationIssues: unlockResult.validation?.issues ?? [],
      vestingChartPoints: response.unlocks.vestingChart.length,
      warnings: unlockResult.data.warnings,
    },
    usedLastGoodData,
    usedMarketFallback,
    valueCapture: buildValueCaptureDebug({
      cacheStatus,
      raw: valueCaptureRaw,
      response,
    }),
    valueCaptureCacheRepair,
    warnings: response.warnings,
  };
}

type TokenChecklistPostBody = {
  coingeckoId?: unknown;
  id?: unknown;
  initData?: unknown;
  refresh?: unknown;
  symbol?: unknown;
};

function noStoreJson(body: unknown, init?: ResponseInit) {
  return Response.json(body, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...(init?.headers ?? {}),
    },
  });
}

async function readPostBody(request: Request): Promise<TokenChecklistPostBody> {
  try {
    return (await request.json()) as TokenChecklistPostBody;
  } catch {
    return {};
  }
}

function stripDebugFromAnalysis(payload: unknown) {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const { debug: _debug, ...analysis } = payload as Record<string, unknown>;

  return analysis as ChecklistResponse & {
    ok?: boolean;
  };
}

async function runChecklistAnalysisForPost(token: TokenCard, refresh: boolean) {
  const url = new URL("http://internal.local/api/token-checklist");
  url.searchParams.set("symbol", token.ticker);
  url.searchParams.set("debug", "1");

  if (refresh) {
    url.searchParams.set("refresh", "1");
  }

  const response = await GET(new Request(url));
  const payload = stripDebugFromAnalysis(await response.json());

  return payload;
}

function isSuccessfulPaidAnalysis(
  response: (ChecklistResponse & { ok?: boolean }) | null,
): response is ChecklistResponse & { ok: true } {
  return Boolean(
    response?.ok &&
      response.dataQuality !== "fallback" &&
      response.market.price !== null &&
      response.technical.position &&
      response.verdict.title,
  );
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

  if (!canRunChecklistForSymbol(token.ticker) && !debugMode) {
    return Response.json(
      {
        ok: false,
        locked: true,
        symbol: token.ticker,
        message:
          "Для расширенной проверки нужна авторизация через Telegram и 1 попытка.",
        paymentRequired: true,
        pricingPreview: CHECKLIST_PRICING_PREVIEW,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  let cacheRejectedReason: CacheRejectedReason | undefined;
  let valueCaptureCacheRepair = false;

  if (!forceRefresh) {
    const freshCacheRejectedReason = cachedEntryRejectedReason(
      token.coingeckoId,
      SERVER_CACHE_TTL_MS,
    );

    if (freshCacheRejectedReason) {
      cacheRejectedReason = freshCacheRejectedReason;
      valueCaptureCacheRepair = true;
    } else {
      const cached = fromFreshCache(token.coingeckoId);

      if (cached) {
        const response = normalizeResponseValueCapture(cached);
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
              response,
              responsePath: "cache-hit",
              symbol,
              tickers: [],
              token,
              unlockResult: fallbackUnlockProviderResult(token, "checklist-cache-hit"),
              usedLastGoodData: false,
              usedMarketFallback: response.sourceStatus.market === "fallback-market-cache",
              valueCaptureCacheRepair: false,
            })
          : undefined;

        return Response.json(debug ? { ...response, debug } : response, {
          headers: {
            "Cache-Control": "no-store",
          },
        });
      }
    }
  }

  const [
    marketResult,
    detailsResult,
    chartResult,
    tickersResult,
    marketFallbackResult,
    marketRiskResult,
    valueCaptureRawResult,
  ] =
    await Promise.allSettled([
      fetchCoinMarket(token.coingeckoId),
      fetchCoinDetails(token.coingeckoId),
      fetchMarketChart(token.coingeckoId),
      fetchCoinTickers(token.coingeckoId),
      fetchMarketFallbackCoin(token.coingeckoId),
      fetchChecklistMarketRisk(),
      fetchValueCaptureData(token),
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
  const marketRisk = getSettledValue(marketRiskResult, {
    level: "none",
    title: null,
  } satisfies ChecklistMarketRisk);
  const valueCaptureRaw = getSettledValue(valueCaptureRawResult, {
    ...emptyValueCaptureRawData("value-capture-fetch-failed"),
  });
  const valueCapture = calculateValueCapture(valueCaptureRaw);
  let unlockResult = fallbackUnlockProviderResult(token, "unlock-provider-not-run");

  try {
    unlockResult = await getTokenUnlockData({
      coinMarketCalApiKey: process.env.COINMARKETCAL_API_KEY,
      coinGlassApiKey: process.env.COINGLASS_API_KEY,
      coinGlassEnabled: process.env.COINGLASS_ENABLED === "true",
      cryptoRankApiKey: process.env.CRYPTORANK_API_KEY,
      cryptoRankEnabled: process.env.CRYPTORANK_ENABLED === "true",
      details,
      marketRecord: market,
      messariApiKey: process.env.MESSARI_API_KEY,
      mobulaApiKey: process.env.MOBULA_API_KEY,
      tokenomistEnabled: process.env.TOKENOMIST_ENABLED === "true",
      tokenomistApiKey: process.env.TOKENOMIST_API_KEY,
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
      marketRisk,
      tickers,
      unlockData: unlockResult.data,
      valueCapture,
    },
    sourceStatus,
    warnings,
  );
  response = normalizeResponseValueCapture(response, {
    sourceStatus: sourceStatusFromValueCaptureRaw(valueCaptureRaw),
  });

  let cacheStatus: ChecklistDebug["cacheStatus"] = "fresh";
  let responsePath: ChecklistResponsePath = cacheRejectedReason ? "cache-repair-fresh" : "fresh";
  let usedLastGoodData = false;

  if (response.dataQuality === "fallback" || response.market.price === null) {
    const lastGoodRejectedReason = cachedEntryRejectedReason(
      token.coingeckoId,
      SERVER_LAST_GOOD_TTL_MS,
    );
    const cached = lastGoodRejectedReason ? null : fromLastGoodCache(token.coingeckoId);

    if (lastGoodRejectedReason) {
      cacheRejectedReason ??= lastGoodRejectedReason;
      valueCaptureCacheRepair = true;
    }

    if (cached) {
      response = cached;
      cacheStatus = "last-good";
      responsePath = "last-good";
      usedLastGoodData = true;
    } else {
      response = buildFallbackResponse(token, warnings);
      cacheStatus = "fallback";
      responsePath = "fallback";
    }
    response = normalizeResponseValueCapture(response, {
      sourceStatus: sourceStatusFromValueCaptureRaw(valueCaptureRaw),
      stale: usedLastGoodData,
    });
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
        responsePath,
        symbol,
        tickers,
        token,
        unlockResult,
        usedLastGoodData,
        usedMarketFallback,
        valueCaptureRaw,
        cacheRejectedReason,
        valueCaptureCacheRepair,
    })
    : undefined;

  return Response.json(debug ? { ...response, debug } : response, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  const body = await readPostBody(request);
  const symbol = typeof body.symbol === "string" ? body.symbol.trim().toUpperCase() : null;
  const coingeckoId = typeof body.coingeckoId === "string" ? body.coingeckoId.trim() : null;
  const id = typeof body.id === "string" ? body.id.trim() : null;
  const initData = typeof body.initData === "string" ? body.initData : "";
  const refresh = body.refresh === true;
  const token = resolveChecklistToken({
    coingeckoId,
    id,
    symbol,
  });

  if (isFreeChecklistSymbol(token.ticker)) {
    const analysis = await runChecklistAnalysisForPost(token, refresh);

    if (!analysis) {
      return noStoreJson(
        {
          ok: false,
          reason: "analysis-failed",
        },
        { status: 500 },
      );
    }

    return noStoreJson({
      ...analysis,
      access: {
        accessType: "free",
        charged: false,
        paymentRequired: false,
      },
    });
  }

  if (!isPaidTestSymbol(token.ticker)) {
    return noStoreJson({
      locked: true,
      message: LOCKED_ALT_MESSAGE,
      ok: false,
      paymentRequired: false,
      symbol: token.ticker,
    });
  }

  const validation = validateTelegramInitData(initData);

  if (!validation.ok) {
    return noStoreJson({
      locked: true,
      message: "Для расширенной проверки нужна 1 попытка. Откройте Mini App через Telegram.",
      ok: false,
      paymentRequired: true,
      pricingPreview: CHECKLIST_PRICING_PREVIEW,
      reason: validation.error,
      symbol: token.ticker,
    });
  }

  const supabase = getConfiguredSupabaseClient();

  if (!supabase.isConfigured) {
    return noStoreJson(
      {
        locked: true,
        message: "Баланс проверок временно недоступен. Попробуйте позже.",
        ok: false,
        paymentRequired: true,
        reason: supabase.reason,
        symbol: token.ticker,
      },
      { status: 503 },
    );
  }

  const session = await getOrCreateUserSession(supabase, validation.user);

  if (session.error) {
    return noStoreJson(
      {
        locked: true,
        message: "Баланс проверок временно недоступен. Попробуйте позже.",
        ok: false,
        paymentRequired: true,
        reason: session.error,
        symbol: token.ticker,
      },
      { status: 500 },
    );
  }

  const portfolioPro = await getPortfolioProStatus(supabase, validation.user);
  const effectiveIsAdmin = session.isAdmin || portfolioPro.isAdmin;

  if (!effectiveIsAdmin && portfolioPro.hasPro) {
    const analysis = await runChecklistAnalysisForPost(token, refresh);

    if (!isSuccessfulPaidAnalysis(analysis)) {
      await recordCheckHistory(supabase, {
        accessType: "error_no_charge",
        checksDelta: 0,
        dataQuality: analysis?.dataQuality ?? null,
        providerStatus: analysis?.unlocks.providerStatus ?? null,
        symbol: token.ticker,
        telegramUserId: validation.user.id,
        tokenId: token.coingeckoId,
        verdictRiskLevel: analysis?.verdict.riskLevel ?? null,
        verdictTitle: analysis?.verdict.title ?? null,
      });

      return noStoreJson(
        {
          ...(analysis ?? {}),
          chargeSkipped: true,
          message: "Данные временно недоступны. Pro-проверка не списана.",
          ok: false,
          paymentRequired: false,
          symbol: token.ticker,
        },
        { status: 503 },
      );
    }

    await recordCheckHistory(supabase, {
      accessType: "portfolio_pro",
      checksDelta: 0,
      dataQuality: analysis.dataQuality,
      providerStatus: analysis.unlocks.providerStatus,
      symbol: token.ticker,
      telegramUserId: validation.user.id,
      tokenId: token.coingeckoId,
      verdictRiskLevel: analysis.verdict.riskLevel,
      verdictTitle: analysis.verdict.title,
    });

    return noStoreJson({
      ...analysis,
      access: {
        accessType: "portfolio_pro",
        activeResult: false,
        activeResultUntil: portfolioPro.expiresAt,
        charged: false,
        isAdmin: false,
        paymentRequired: false,
        portfolioPro: true,
      },
      balance: {
        checksAvailable: "unlimited",
        checksUsed: session.balance?.checks_used ?? 0,
      },
    });
  }

  const activeResult = await getActiveChecklistResultAccess(supabase, {
    symbol: token.ticker,
    telegramUserId: validation.user.id,
  });

  if (!effectiveIsAdmin && activeResult.active) {
    const analysis = await runChecklistAnalysisForPost(token, refresh);

    if (!isSuccessfulPaidAnalysis(analysis)) {
      return noStoreJson(
        {
          ...(analysis ?? {}),
          activeResult: true,
          activeResultUntil: activeResult.activeResultUntil,
          chargeSkipped: true,
          message: "Результат уже открыт, но свежие данные временно недоступны. Попробуйте позже.",
          ok: false,
          paymentRequired: false,
          symbol: token.ticker,
        },
        { status: 503 },
      );
    }

    return noStoreJson({
      ...analysis,
      access: {
        accessType: "active_result",
        activeResult: true,
        activeResultUntil: activeResult.activeResultUntil,
        charged: false,
        isAdmin: false,
        paymentRequired: false,
      },
      activeResult: true,
      activeResultUntil: activeResult.activeResultUntil,
      balance: {
        checksAvailable: session.balance?.checks_available ?? 0,
        checksUsed: session.balance?.checks_used ?? 0,
      },
    });
  }

  const decision = decideChecklistAccess({
    balance: session.balance?.checks_available ?? 0,
    isAdmin: effectiveIsAdmin,
    symbol: token.ticker,
  });

  if (!decision.canRun) {
    return noStoreJson({
      locked: decision.locked,
      message: decision.message,
      ok: false,
      paymentRequired: decision.paymentRequired,
      pricingPreview: decision.pricingPreview,
      symbol: token.ticker,
    });
  }

  const analysis = await runChecklistAnalysisForPost(token, refresh);

  if (!isSuccessfulPaidAnalysis(analysis)) {
    await recordCheckHistory(supabase, {
      accessType: "error_no_charge",
      checksDelta: 0,
      dataQuality: analysis?.dataQuality ?? null,
      providerStatus: analysis?.unlocks.providerStatus ?? null,
      symbol: token.ticker,
      telegramUserId: validation.user.id,
      tokenId: token.coingeckoId,
      verdictRiskLevel: analysis?.verdict.riskLevel ?? null,
      verdictTitle: analysis?.verdict.title ?? null,
    });

    return noStoreJson(
      {
        ...(analysis ?? {}),
        chargeSkipped: true,
        message: "Данные временно недоступны. Проверка не списана.",
        ok: false,
        paymentRequired: false,
        symbol: token.ticker,
      },
      { status: 503 },
    );
  }

  let balanceAfter = session.balance;
  let charged = false;

  if (decision.shouldCharge) {
    const chargedBalance = await consumeOneCheck(supabase, validation.user.id);
    const chargedRow = Array.isArray(chargedBalance.data)
      ? chargedBalance.data[0]
      : chargedBalance.data;

    if (chargedBalance.error || !chargedRow) {
      return noStoreJson({
        locked: true,
        message: "Для расширенной проверки нужна 1 попытка.",
        ok: false,
        paymentRequired: true,
        pricingPreview: CHECKLIST_PRICING_PREVIEW,
        reason: chargedBalance.error ?? "no-checks-available",
        symbol: token.ticker,
      });
    }

    balanceAfter = chargedRow;
    charged = true;
  }

  await recordCheckHistory(supabase, {
    accessType: decision.accessType,
    checksDelta: charged ? -1 : 0,
    dataQuality: analysis.dataQuality,
    providerStatus: analysis.unlocks.providerStatus,
    symbol: token.ticker,
    telegramUserId: validation.user.id,
    tokenId: token.coingeckoId,
    verdictRiskLevel: analysis.verdict.riskLevel,
    verdictTitle: analysis.verdict.title,
  });
  const activeResultUntil =
    decision.accessType === "paid_balance"
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : null;

  return noStoreJson({
    ...analysis,
    access: {
      accessType: decision.accessType,
      activeResult: decision.accessType === "paid_balance",
      activeResultUntil,
      charged,
      isAdmin: effectiveIsAdmin,
      paymentRequired: false,
    },
    activeResult: decision.accessType === "paid_balance",
    activeResultUntil,
    balance: {
      checksAvailable: effectiveIsAdmin ? "unlimited" : (balanceAfter?.checks_available ?? 0),
      checksUsed: balanceAfter?.checks_used ?? session.balance?.checks_used ?? 0,
    },
  });
}
