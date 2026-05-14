import type { TokenCard } from "@/lib/content";

export type UnlockConfidence = "high" | "medium" | "low" | "unknown";
export type UnlockProviderStatus =
  | "base-asset"
  | "cache-hit"
  | "calendar-hint"
  | "conflict"
  | "exact"
  | "failed"
  | "manual-check"
  | "no-future-unlocks"
  | "not-found"
  | "partial"
  | "recent-unlock"
  | "recent-unlock-hint"
  | "skipped"
  | "summary-only"
  | "supply-only"
  | "ok";

export type UnlockSourceDebug = {
  enabled: boolean;
  fieldsReceived: string[];
  name: string;
  rawCount: number;
  reason?: string;
  sample: unknown;
  sampleTitles?: string[];
  status: "failed" | "ok" | "partial" | "skipped";
};

export type TokenUnlockData = {
  allocations: UnlockAllocation[];
  circulatingSupplyPercent: number | null;
  confidence: UnlockConfidence;
  explanation: string;
  isAvailable: boolean;
  label: string;
  lockedPercent: number | null;
  manualCheckUrls: Array<{
    label: string;
    url: string;
  }>;
  allocationName: string | null;
  allocationBreakdown: UnlockAllocationBreakdown[];
  comparedSources: string[];
  conflicts: string[];
  lockedPercentage: number | null;
  maxSupply: number | null;
  nextUnlockAmount: number | null;
  nextUnlockAmountUsd: number | null;
  nextUnlockDate: string | null;
  nextUnlockMarketCapPercent: number | null;
  nextUnlockPercent: number | null;
  provider: string;
  providerStatus: UnlockProviderStatus;
  rawTitle?: string | null;
  sourceUrl: string | null;
  releasedPercentage: number | null;
  tbdLockedAmount: number | null;
  tbdPercentage: number | null;
  tokenomistSummary: TokenomistSummary | null;
  tokenomics: TokenomicsData | null;
  totalLockedAmount: number | null;
  unlockedPercent: number | null;
  unlockedAmount: number | null;
  unlockEvents: UnlockEvent[];
  unlocksRemainingNative: number | null;
  unlocksRemainingUsd: number | null;
  untrackedAmount: number | null;
  updatedAt: string;
  vestingChart: VestingChartPoint[];
  vestingEndDate: string | null;
  warnings: string[];
};

export type UnlockProviderResult = {
  attemptsSummary: Array<{
    name: string;
    rawCount: number;
    reason?: string;
    status: string;
  }>;
  cacheStatus: "fallback" | "fresh" | "hit" | "last-good" | "saved";
  data: TokenUnlockData;
  sources: UnlockSourceDebug[];
  validation?: UnlockValidationSummary;
};

export type CryptoRankTokenMapping = {
  coingeckoId: string;
  coinglassSymbol: string;
  cryptoRankSlug: string;
  messariAssetId?: string;
  messariSlug: string;
  mobulaSymbol: string;
  symbol: string;
  tokenomistSlug: string;
};

export type VestingChartPoint = {
  cumulativeUnlockedNative: number | null;
  cumulativeUnlockedUsd: number | null;
  date: string;
  percentOfUnlocksCompleted: number | null;
  unlocksRemainingNative: number | null;
  unlocksRemainingUsd: number | null;
};

export type UnlockEvent = {
  allocationName: string | null;
  amountNative: number | null;
  amountUsd: number | null;
  date: string | null;
  percent: number | null;
  title: string;
  type: string | null;
};

export type UnlockAllocation = {
  name: string;
  percentage: number | null;
  unlockedPercent?: number | null;
};

export type UnlockAllocationBreakdown = {
  allocationName: string | null;
  amount: number | null;
  amountUsd: number | null;
  standardAllocationName: string | null;
  unlockPrecision: string | null;
};

export type TokenomistSummary = {
  circulatingSupply: number | null;
  hasBurn: boolean | null;
  hasBuyback: boolean | null;
  hasCommittedClaim: boolean | null;
  hasFundraising: boolean | null;
  hasStandardAllocation: boolean | null;
  lastUpdatedDate: string | null;
  latestFundraisingRound: string | null;
  lockedPercentage: number | null;
  marketCap: number | null;
  maxSupply: number | null;
  name: string | null;
  provider: "Tokenomist";
  providerStatus: "summary";
  releasedPercentage: number | null;
  symbol: string | null;
  tbdLockedAmount: number | null;
  tbdPercentage: number | null;
  tokenId: string | null;
  totalLockedAmount: number | null;
  unlockedAmount: number | null;
  untrackedAmount: number | null;
  websiteUrl: string | null;
};

export type TokenomicsData = {
  circulatingSupply: number | null;
  circulatingSupplyPercent: number | null;
  concentrationWarnings: string[];
  confidence: "medium" | "low" | "unknown";
  distribution: Array<{
    name: string;
    percentage: number | null;
  }>;
  hasBurn?: boolean | null;
  hasBuyback?: boolean | null;
  hasCommittedClaim?: boolean | null;
  hasFundraising?: boolean | null;
  latestFundraisingRound?: string | null;
  lockedPercentage?: number | null;
  maxSupply: number | null;
  provider: string;
  providerStatus: "distribution-only" | "failed" | "skipped" | "summary";
  releasedPercentage?: number | null;
  sourceUrl: string | null;
  tbdLockedAmount?: number | null;
  tbdPercentage?: number | null;
  totalSupply: number | null;
  totalLockedAmount?: number | null;
  unlockedAmount?: number | null;
  untrackedAmount?: number | null;
  websiteUrl?: string | null;
};

export type UnlockValidationSummary = {
  clean: boolean;
  conflicts: string[];
  issues: string[];
  rejectedSources: string[];
};

export type CryptoRankAttemptResult = {
  authMode: "Authorization: Bearer" | "X-Api-Key" | "api_key query";
  endpointWithoutKey: string;
  errorMessage: string | null;
  method: "GET";
  name: string;
  ok: boolean;
  rawCount: number;
  rawType: string;
  reason: string | null;
  sampleKeys: string[];
  sampleTitles: string[];
  status: number | "failed" | "skipped";
};

type CryptoRankAttemptConfig = {
  authMode: CryptoRankAttemptResult["authMode"];
  endpoint: string;
  name: string;
  params: Record<string, string>;
};

type UnknownRecord = Record<string, unknown>;

type UnlockCacheEntry = {
  data: TokenUnlockData;
  updatedAt: number;
};

type UnlockProviderFetchResult = {
  data: TokenUnlockData | null;
  source?: UnlockSourceDebug;
  sources?: UnlockSourceDebug[];
  summary?: {
    name: string;
    rawCount: number;
    reason?: string;
    status: string;
  };
  summaries?: Array<{
    name: string;
    rawCount: number;
    reason?: string;
    status: string;
  }>;
  tokenomics?: TokenomicsData | null;
};

type MessariAssetCacheEntry = {
  asset: UnknownRecord;
  updatedAt: number;
};

type TokenomistTokenListCacheEntry = {
  data: unknown;
  updatedAt: number;
};

const exactUnlockTtlMs = 12 * 60 * 60_000;
const calendarHintTtlMs = 6 * 60 * 60_000;
const fallbackUnlockTtlMs = 60 * 60_000;
const lastGoodUnlockTtlMs = 24 * 60 * 60_000;
const unlockCache = new Map<string, UnlockCacheEntry>();
const messariAssetCache = new Map<string, MessariAssetCacheEntry>();
const messariAssetTtlMs = 24 * 60 * 60_000;
const tokenomistTokenListCache = new Map<string, TokenomistTokenListCacheEntry>();
const tokenomistTokenListTtlMs = 12 * 60 * 60_000;

export const cryptoRankTokenMap: Record<string, CryptoRankTokenMapping> = {
  AAVE: {
    coingeckoId: "aave",
    coinglassSymbol: "AAVE",
    cryptoRankSlug: "aave",
    messariSlug: "aave",
    mobulaSymbol: "AAVE",
    symbol: "AAVE",
    tokenomistSlug: "aave",
  },
  AVAX: {
    coingeckoId: "avalanche-2",
    coinglassSymbol: "AVAX",
    cryptoRankSlug: "avalanche",
    messariAssetId: "2db6b38a-681a-4514-9d67-691e319597ee",
    messariSlug: "avalanche",
    mobulaSymbol: "AVAX",
    symbol: "AVAX",
    tokenomistSlug: "avalanche-2",
  },
  BNB: {
    coingeckoId: "binancecoin",
    coinglassSymbol: "BNB",
    cryptoRankSlug: "bnb",
    messariSlug: "bnb",
    mobulaSymbol: "BNB",
    symbol: "BNB",
    tokenomistSlug: "bnb",
  },
  BTC: {
    coingeckoId: "bitcoin",
    coinglassSymbol: "BTC",
    cryptoRankSlug: "bitcoin",
    messariSlug: "bitcoin",
    mobulaSymbol: "BTC",
    symbol: "BTC",
    tokenomistSlug: "bitcoin",
  },
  ENA: {
    coingeckoId: "ethena",
    coinglassSymbol: "ENA",
    cryptoRankSlug: "ethena",
    messariSlug: "ethena",
    mobulaSymbol: "ENA",
    symbol: "ENA",
    tokenomistSlug: "ethena",
  },
  ETH: {
    coingeckoId: "ethereum",
    coinglassSymbol: "ETH",
    cryptoRankSlug: "ethereum",
    messariSlug: "ethereum",
    mobulaSymbol: "ETH",
    symbol: "ETH",
    tokenomistSlug: "ethereum",
  },
  HYPE: {
    coingeckoId: "hyperliquid",
    coinglassSymbol: "HYPE",
    cryptoRankSlug: "hyperliquid",
    messariSlug: "hyperliquid",
    mobulaSymbol: "HYPE",
    symbol: "HYPE",
    tokenomistSlug: "hyperliquid",
  },
  JUP: {
    coingeckoId: "jupiter-exchange-solana",
    coinglassSymbol: "JUP",
    cryptoRankSlug: "jupiter",
    messariSlug: "jupiter",
    mobulaSymbol: "JUP",
    symbol: "JUP",
    tokenomistSlug: "jupiter-exchange-solana",
  },
  LINK: {
    coingeckoId: "chainlink",
    coinglassSymbol: "LINK",
    cryptoRankSlug: "chainlink",
    messariSlug: "chainlink",
    mobulaSymbol: "LINK",
    symbol: "LINK",
    tokenomistSlug: "chainlink",
  },
  NEAR: {
    coingeckoId: "near",
    coinglassSymbol: "NEAR",
    cryptoRankSlug: "near-protocol",
    messariSlug: "near",
    mobulaSymbol: "NEAR",
    symbol: "NEAR",
    tokenomistSlug: "near",
  },
  ONDO: {
    coingeckoId: "ondo-finance",
    coinglassSymbol: "ONDO",
    cryptoRankSlug: "ondo-finance",
    messariSlug: "ondo",
    mobulaSymbol: "ONDO",
    symbol: "ONDO",
    tokenomistSlug: "ondo-finance",
  },
  PENDLE: {
    coingeckoId: "pendle",
    coinglassSymbol: "PENDLE",
    cryptoRankSlug: "pendle",
    messariSlug: "pendle",
    mobulaSymbol: "PENDLE",
    symbol: "PENDLE",
    tokenomistSlug: "pendle",
  },
  RENDER: {
    coingeckoId: "render-token",
    coinglassSymbol: "RENDER",
    cryptoRankSlug: "render-token",
    messariSlug: "render",
    mobulaSymbol: "RENDER",
    symbol: "RENDER",
    tokenomistSlug: "render-token",
  },
  SOL: {
    coingeckoId: "solana",
    coinglassSymbol: "SOL",
    cryptoRankSlug: "solana",
    messariSlug: "solana",
    mobulaSymbol: "SOL",
    symbol: "SOL",
    tokenomistSlug: "solana",
  },
  SUI: {
    coingeckoId: "sui",
    coinglassSymbol: "SUI",
    cryptoRankSlug: "sui",
    messariAssetId: "78c4b0c5-8cbe-4f05-b639-0eb942e86dd5",
    messariSlug: "sui",
    mobulaSymbol: "SUI",
    symbol: "SUI",
    tokenomistSlug: "sui",
  },
  TAO: {
    coingeckoId: "bittensor",
    coinglassSymbol: "TAO",
    cryptoRankSlug: "bittensor",
    messariSlug: "bittensor",
    mobulaSymbol: "TAO",
    symbol: "TAO",
    tokenomistSlug: "bittensor",
  },
  TON: {
    coingeckoId: "the-open-network",
    coinglassSymbol: "TON",
    cryptoRankSlug: "toncoin",
    messariSlug: "toncoin",
    mobulaSymbol: "TON",
    symbol: "TON",
    tokenomistSlug: "toncoin",
  },
  UNI: {
    coingeckoId: "uniswap",
    coinglassSymbol: "UNI",
    cryptoRankSlug: "uniswap",
    messariSlug: "uniswap",
    mobulaSymbol: "UNI",
    symbol: "UNI",
    tokenomistSlug: "uniswap",
  },
  XRP: {
    coingeckoId: "ripple",
    coinglassSymbol: "XRP",
    cryptoRankSlug: "ripple",
    messariSlug: "xrp",
    mobulaSymbol: "XRP",
    symbol: "XRP",
    tokenomistSlug: "xrp",
  },
};

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

  for (const key of [
    "data",
    "body",
    "result",
    "items",
    "rows",
    "assets",
    "unlocks",
    "vesting",
    "allocations",
    "events",
    "unlockEvents",
    "totalDailySnapshots",
    "dailySnapshots",
    "distribution",
  ]) {
    const nested = value[key];

    if (Array.isArray(nested)) {
      return nested;
    }

    if (isRecord(nested)) {
      const nestedRows = arrayPayload(nested);

      if (nestedRows.length > 0) {
        return nestedRows;
      }
    }
  }

  return [];
}

function numberFrom(value: unknown) {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(/[$,%\s,]/g, ""))
        : NaN;

  return Number.isFinite(number) ? number : null;
}

function stringFrom(record: UnknownRecord | null | undefined, keys: string[]): string | null {
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }

    if (isRecord(value)) {
      const nestedValue = stringFrom(value, ["en", "ru", "text", "title", "name", "url", "link"]);

      if (nestedValue) {
        return nestedValue;
      }
    }
  }

  return null;
}

function normalizeDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  const match = value.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);

  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function sampleKeys(value: unknown) {
  const record = Array.isArray(value) ? value.find(isRecord) : value;

  return isRecord(record) ? Object.keys(record).slice(0, 12) : [];
}

function sampleTitles(value: unknown) {
  return arrayPayload(value)
    .filter(isRecord)
    .map((record) => stringFrom(record, ["title", "name", "event", "caption"]) ?? "unlock")
    .slice(0, 5);
}

function fieldsReceived(value: unknown) {
  if (!isRecord(value)) {
    return [];
  }

  return Object.entries(value)
    .filter(([, fieldValue]) => fieldValue !== null && fieldValue !== undefined)
    .map(([key]) => key)
    .slice(0, 12);
}

function rawCount(value: unknown) {
  const rows = arrayPayload(value);

  if (rows.length > 0) {
    return rows.length;
  }

  return isRecord(value) ? 1 : 0;
}

async function fetchJson(
  url: URL,
  init?: RequestInit,
  timeoutMs = 8_000,
): Promise<{
  data: unknown | null;
  error: string | null;
  responseStatus: number | null;
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
      return {
        data: null,
        error: `http-${response.status}`,
        responseStatus: response.status,
      };
    }

    return {
      data: await response.json(),
      error: null,
      responseStatus: response.status,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.name : "request-failed",
      responseStatus: null,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export function resolveCryptoRankToken({
  coingeckoId,
  slug,
  symbol,
}: {
  coingeckoId?: string | null;
  slug?: string | null;
  symbol?: string | null;
}) {
  const normalizedSymbol = symbol?.trim().toUpperCase();
  const normalizedId = coingeckoId?.trim().toLowerCase();
  const normalizedSlug = slug?.trim().toLowerCase();

  return (
    (normalizedSymbol ? cryptoRankTokenMap[normalizedSymbol] : null) ??
    Object.values(cryptoRankTokenMap).find(
      (token) =>
        token.coingeckoId === normalizedId ||
        token.cryptoRankSlug === normalizedSlug,
    ) ??
    {
      coingeckoId: normalizedId ?? normalizedSlug ?? normalizedSymbol?.toLowerCase() ?? "unknown",
      coinglassSymbol: normalizedSymbol ?? "TOKEN",
      cryptoRankSlug: normalizedSlug ?? normalizedId ?? normalizedSymbol?.toLowerCase() ?? "unknown",
      messariSlug: normalizedSlug ?? normalizedId ?? normalizedSymbol?.toLowerCase() ?? "unknown",
      mobulaSymbol: normalizedSymbol ?? "TOKEN",
      symbol: normalizedSymbol ?? "TOKEN",
      tokenomistSlug: normalizedSlug ?? normalizedId ?? normalizedSymbol?.toLowerCase() ?? "unknown",
    }
  );
}

function manualCheckUrls(mapping: CryptoRankTokenMapping) {
  return [
    {
      label: "CryptoRank",
      url: `https://cryptorank.io/price/${mapping.cryptoRankSlug}/vesting`,
    },
    {
      label: "Token Unlocks",
      url: "https://token.unlocks.app/",
    },
    {
      label: "Tokenomist",
      url: `https://tokenomist.ai/${mapping.tokenomistSlug}`,
    },
    {
      label: "Messari",
      url: `https://messari.io/token-unlocks/${mapping.messariSlug}`,
    },
    {
      label: "CoinGlass",
      url: `https://www.coinglass.com/coin/${mapping.coinglassSymbol}`,
    },
  ];
}

function unlockRiskFromData(data: TokenUnlockData) {
  const marketCapPercent = data.nextUnlockMarketCapPercent;
  const unlockPercent = data.nextUnlockPercent;
  const comparablePercent = marketCapPercent ?? unlockPercent;

  if (data.confidence === "high" && comparablePercent !== null) {
    if (comparablePercent > 2) {
      return "high";
    }

    if (comparablePercent >= 0.5) {
      return "medium";
    }

    return "low";
  }

  if (data.confidence === "medium") {
    return "medium";
  }

  return "unknown";
}

function makeUnlockData(
  input: Omit<
    TokenUnlockData,
    | "allocations"
    | "allocationName"
    | "allocationBreakdown"
    | "comparedSources"
    | "conflicts"
    | "lockedPercentage"
    | "maxSupply"
    | "nextUnlockAmountUsd"
    | "releasedPercentage"
    | "tbdLockedAmount"
    | "tbdPercentage"
    | "tokenomistSummary"
    | "tokenomics"
    | "totalLockedAmount"
    | "unlockedAmount"
    | "unlockEvents"
    | "unlocksRemainingNative"
    | "unlocksRemainingUsd"
    | "untrackedAmount"
    | "updatedAt"
    | "vestingChart"
    | "vestingEndDate"
    | "warnings"
  > &
    Partial<
      Pick<
        TokenUnlockData,
        | "allocations"
        | "allocationName"
        | "allocationBreakdown"
        | "comparedSources"
        | "conflicts"
        | "lockedPercentage"
        | "maxSupply"
        | "nextUnlockAmountUsd"
        | "releasedPercentage"
        | "tbdLockedAmount"
        | "tbdPercentage"
        | "tokenomistSummary"
        | "tokenomics"
        | "totalLockedAmount"
        | "unlockedAmount"
        | "unlockEvents"
        | "unlocksRemainingNative"
        | "unlocksRemainingUsd"
        | "untrackedAmount"
        | "vestingChart"
        | "vestingEndDate"
      >
    > & {
      warnings?: string[];
    },
): TokenUnlockData {
  return {
    ...input,
    allocations: input.allocations ?? [],
    allocationName: input.allocationName ?? null,
    allocationBreakdown: input.allocationBreakdown ?? [],
    comparedSources: input.comparedSources ?? [],
    conflicts: input.conflicts ?? [],
    lockedPercentage: input.lockedPercentage ?? null,
    maxSupply: input.maxSupply ?? null,
    nextUnlockAmountUsd: input.nextUnlockAmountUsd ?? null,
    releasedPercentage: input.releasedPercentage ?? null,
    tbdLockedAmount: input.tbdLockedAmount ?? null,
    tbdPercentage: input.tbdPercentage ?? null,
    tokenomistSummary: input.tokenomistSummary ?? null,
    tokenomics: input.tokenomics ?? null,
    totalLockedAmount: input.totalLockedAmount ?? null,
    unlockedAmount: input.unlockedAmount ?? null,
    unlockEvents: input.unlockEvents ?? [],
    unlocksRemainingNative: input.unlocksRemainingNative ?? null,
    unlocksRemainingUsd: input.unlocksRemainingUsd ?? null,
    untrackedAmount: input.untrackedAmount ?? null,
    updatedAt: new Date().toISOString(),
    vestingChart: input.vestingChart ?? [],
    vestingEndDate: input.vestingEndDate ?? null,
    warnings: input.warnings ?? [],
  };
}

function baseAssetRule(mapping: CryptoRankTokenMapping) {
  if (mapping.symbol !== "BTC" && mapping.symbol !== "ETH") {
    return null;
  }

  return makeUnlockData({
    circulatingSupplyPercent: null,
    confidence: "high",
    explanation:
      mapping.symbol === "BTC"
        ? "У BTC нет стандартного графика vesting unlock как у новых токенов. Важнее смотреть эмиссию, майнеров, ETF-потоки и ликвидность."
        : "У ETH нет стандартного графика vesting unlock как у новых токенов. Важнее смотреть эмиссию, стейкинг/разблокировки, LST/LRT и рыночное предложение.",
    isAvailable: true,
    label: "Классических vesting unlocks нет",
    lockedPercent: null,
    manualCheckUrls: manualCheckUrls(mapping),
    nextUnlockAmount: null,
    nextUnlockDate: null,
    nextUnlockMarketCapPercent: null,
    nextUnlockPercent: null,
    provider: "base-asset-rule",
    providerStatus: "exact",
    sourceUrl: null,
    unlockedPercent: null,
  });
}

function sourceDebug(
  input: Omit<UnlockSourceDebug, "fieldsReceived" | "sample"> & {
    fieldsReceived?: string[];
    sample?: unknown;
  },
): UnlockSourceDebug {
  return {
    fieldsReceived: input.fieldsReceived ?? [],
    sample: input.sample ?? null,
    ...input,
  };
}

function symbolMatchesRecord(row: UnknownRecord, mapping: CryptoRankTokenMapping) {
  const symbol = stringFrom(row, [
    "symbol",
    "ticker",
    "asset",
    "currency",
    "token",
    "coin",
  ]);
  const slug = stringFrom(row, ["slug", "key", "coinKey", "id", "name", "asset_slug"]);

  if (symbol && symbol.toUpperCase() !== mapping.symbol) {
    return false;
  }

  if (!symbol && slug) {
    const normalizedSlug = slug.toLowerCase();

    return (
      normalizedSlug === mapping.cryptoRankSlug ||
      normalizedSlug === mapping.coingeckoId ||
      normalizedSlug === mapping.messariSlug ||
      normalizedSlug === mapping.tokenomistSlug ||
      normalizedSlug === mapping.symbol.toLowerCase()
    );
  }

  return true;
}

function parseGenericUnlockPayload({
  mapping,
  payload,
  provider,
  sourceUrl,
}: {
  mapping: CryptoRankTokenMapping;
  payload: unknown;
  provider: string;
  sourceUrl: string | null;
}) {
  const rows = arrayPayload(payload).filter(isRecord);
  const candidates = rows.length > 0 ? rows : isRecord(payload) ? [payload] : [];
  const row = candidates.find((item) => symbolMatchesRecord(item, mapping)) ?? candidates[0];

  if (!row) {
    return null;
  }

  if (!symbolMatchesRecord(row, mapping)) {
    return null;
  }

  const nextUnlockDate = normalizeDate(
    stringFrom(row, [
      "nextUnlockDate",
      "next_unlock_date",
      "unlockDate",
      "unlock_date",
      "date",
      "timestamp",
      "vestingDate",
      "next_release_date",
      "releaseDate",
    ]),
  );
  const nextUnlockPercent = numberFrom(
    row.nextUnlockPercent ??
      row.next_unlock_percent ??
      row.unlockPercent ??
      row.unlock_percent ??
      row.percent ??
      row.percentage ??
      row.percentage_of_supply,
  );
  const nextUnlockMarketCapPercent = numberFrom(
    row.nextUnlockMarketCapPercent ??
      row.next_unlock_market_cap_percent ??
      row.marketCapPercent ??
      row.market_cap_percent ??
      row.market_cap_percentage,
  );
  const nextUnlockAmount = numberFrom(
    row.nextUnlockAmount ??
      row.next_unlock_amount ??
      row.amount ??
      row.unlockAmount ??
      row.unlock_amount ??
      row.tokens ??
      row.value,
  );
  const nextUnlockAmountUsd = numberFrom(
    row.nextUnlockAmountUsd ??
      row.next_unlock_amount_usd ??
      row.amountUsd ??
      row.amount_usd ??
      row.valueUsd ??
      row.value_usd ??
      row.usdValue,
  );
  const unlockedPercent = numberFrom(
    row.unlockedPercent ?? row.unlocked_percent ?? row.unlocked,
  );
  const lockedPercent = numberFrom(row.lockedPercent ?? row.locked_percent ?? row.locked);
  const allocationName = stringFrom(row, [
    "allocation",
    "allocationName",
    "allocation_name",
    "round",
    "category",
    "type",
  ]);

  if (
    nextUnlockDate === null &&
    nextUnlockPercent === null &&
    nextUnlockMarketCapPercent === null &&
    nextUnlockAmount === null &&
    nextUnlockAmountUsd === null &&
    unlockedPercent === null &&
    lockedPercent === null
  ) {
    return null;
  }

  const hasScheduleDetail =
    nextUnlockAmount !== null ||
    nextUnlockAmountUsd !== null ||
    nextUnlockPercent !== null ||
    nextUnlockMarketCapPercent !== null ||
    unlockedPercent !== null ||
    lockedPercent !== null;
  const confidence: UnlockConfidence = hasScheduleDetail ? "high" : "medium";

  return makeUnlockData({
    allocationName,
    circulatingSupplyPercent: null,
    confidence,
    explanation:
      confidence === "high"
        ? `${provider} вернул unlock/vesting-данные. Сверь размер события с официальными материалами проекта перед крупным решением.`
        : `${provider} вернул частичные unlock-данные. Дату можно использовать как ориентир, но размер и процент нужно проверить вручную.`,
    isAvailable: true,
    label:
      confidence === "high"
        ? "Точные unlock-данные найдены"
        : "Unlock-данные найдены частично",
    lockedPercent,
    manualCheckUrls: manualCheckUrls(mapping),
    nextUnlockAmount,
    nextUnlockAmountUsd,
    nextUnlockDate,
    nextUnlockMarketCapPercent,
    nextUnlockPercent,
    provider,
    providerStatus: confidence === "high" ? "exact" : "partial",
    sourceUrl,
    unlockedPercent,
    warnings: confidence === "high" ? [] : ["Источник не подтвердил размер unlock."],
  });
}

function unwrapRecord(value: unknown): UnknownRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  if (isRecord(value.data)) {
    return value.data;
  }

  if (isRecord(value.body)) {
    return value.body;
  }

  if (isRecord(value.result)) {
    return value.result;
  }

  return value;
}

function dateFromValue(value: unknown) {
  return normalizeDate(typeof value === "number" ? new Date(value).toISOString() : value);
}

function isFutureOrToday(date: string | null) {
  return date !== null && date >= dateKey(new Date());
}

function isRecentPast(date: string | null) {
  if (!date) {
    return false;
  }

  const today = new Date(`${dateKey(new Date())}T00:00:00.000Z`).getTime();
  const value = new Date(`${date}T00:00:00.000Z`).getTime();

  return Number.isFinite(value) && value < today && today - value <= 7 * 24 * 60 * 60_000;
}

function compactVestingChart(points: VestingChartPoint[]) {
  if (points.length <= 90) {
    return points;
  }

  const step = Math.ceil(points.length / 90);

  return points.filter((_, index) => index % step === 0).slice(0, 90);
}

function normalizeMessariAsset(payload: unknown, mapping: CryptoRankTokenMapping) {
  const rows = arrayPayload(payload).filter(isRecord);
  const candidates = rows.length > 0 ? rows : unwrapRecord(payload) ? [unwrapRecord(payload)!] : [];

  return (
    candidates.find((asset) => {
      const symbol = stringFrom(asset, ["symbol", "ticker"]);
      const slug = stringFrom(asset, ["slug", "assetSlug"]);
      const id = stringFrom(asset, ["id", "assetId"]);

      return (
        symbol?.toUpperCase() === mapping.symbol ||
        slug?.toLowerCase() === mapping.messariSlug ||
        id === mapping.messariAssetId
      );
    }) ?? null
  );
}

function normalizeMessariAllocations(payload: unknown): UnlockAllocation[] {
  return arrayPayload(payload)
    .filter(isRecord)
    .map((allocation) => ({
      name:
        stringFrom(allocation, [
          "allocationRecipient",
          "recipient",
          "name",
          "label",
          "allocation",
        ]) ?? "Allocation",
      percentage: numberFrom(
        allocation.percentOfTotalSupply ??
          allocation.percentOfSupply ??
          allocation.percentage ??
          allocation.percent,
      ),
      unlockedPercent: numberFrom(
        allocation.percentOfUnlocksCompleted ??
          allocation.unlockedPercent ??
          allocation.unlocked_percent,
      ),
    }))
    .slice(0, 20);
}

function normalizeMessariEvents(payload: unknown): UnlockEvent[] {
  return arrayPayload(payload)
    .filter(isRecord)
    .map((event) => {
      const allocations = Array.isArray(event.allocations)
        ? event.allocations.filter(isRecord)
        : [];
      const firstAllocation = allocations[0] ?? null;
      const allocationName =
        stringFrom(event, ["allocationRecipient", "allocation", "allocationName"]) ??
        (firstAllocation
          ? stringFrom(firstAllocation, ["allocationRecipient", "recipient", "name"])
          : null);
      const amountNative =
        numberFrom(event.amountNative ?? event.unlockAmountNative ?? event.cliffAmountNative) ??
        (firstAllocation
          ? numberFrom(
              firstAllocation.amountNative ??
                firstAllocation.unlockAmountNative ??
                firstAllocation.cliffAmountNative,
            )
          : null);
      const amountUsd =
        numberFrom(event.amountUSD ?? event.amountUsd ?? event.unlockAmountUSD) ??
        (firstAllocation
          ? numberFrom(
              firstAllocation.amountUSD ??
                firstAllocation.amountUsd ??
                firstAllocation.unlockAmountUSD,
            )
          : null);
      const percent =
        numberFrom(
          event.percentOfTotalAllocation ??
            event.percentOfAllocation ??
            event.percentOfSupply ??
            event.percentage,
        ) ??
        (firstAllocation
          ? numberFrom(
              firstAllocation.percentOfTotalAllocation ??
                firstAllocation.percentOfAllocation ??
                firstAllocation.percentOfSupply ??
                firstAllocation.percentage,
            )
          : null);

      return {
        allocationName,
        amountNative,
        amountUsd,
        date: dateFromValue(event.timestamp ?? event.date ?? event.unlockDate ?? event.startTime),
        percent,
        title:
          stringFrom(event, ["title", "name", "eventType", "type"]) ??
          (allocationName ? `${allocationName} unlock` : "Unlock event"),
        type: stringFrom(event, ["eventType", "type", "category"]),
      };
    })
    .filter((event) => event.date !== null);
}

function normalizeMessariVestingChart(payload: unknown) {
  const root = unwrapRecord(payload);
  const snapshots =
    root && Array.isArray(root.totalDailySnapshots) ? root.totalDailySnapshots : arrayPayload(payload);
  const points = snapshots
    .filter(isRecord)
    .map((snapshot) => ({
      cumulativeUnlockedNative: numberFrom(snapshot.cumulativeUnlockedNative),
      cumulativeUnlockedUsd: numberFrom(
        snapshot.cumulativeUnlockedUSD ?? snapshot.cumulativeUnlockedUsd,
      ),
      date: dateFromValue(snapshot.timestamp ?? snapshot.date) ?? "",
      percentOfUnlocksCompleted: numberFrom(snapshot.percentOfUnlocksCompleted),
      unlocksRemainingNative: numberFrom(snapshot.unlocksRemainingNative),
      unlocksRemainingUsd: numberFrom(snapshot.unlocksRemainingUSD ?? snapshot.unlocksRemainingUsd),
    }))
    .filter((point) => point.date);

  return {
    allocations: normalizeMessariAllocations(root?.allocations ?? []),
    projectedEndDate: dateFromValue(root?.projectedEndDate ?? root?.vestingEndDate ?? root?.endTime),
    vestingChart: compactVestingChart(points),
  };
}

function normalizeDistribution(payload: unknown) {
  const root = unwrapRecord(payload);
  const values = [
    root?.distribution,
    root?.allocations,
    root?.tokenomics,
    root?.launchpad,
    root?.vesting,
  ];
  const rows = values.flatMap((value) => arrayPayload(value)).filter(isRecord);

  return rows
    .map((row) => ({
      name:
        stringFrom(row, ["name", "label", "allocation", "recipient", "allocationRecipient"]) ??
        "Allocation",
      percentage: numberFrom(row.percentage ?? row.percent ?? row.value ?? row.share),
    }))
    .filter((row) => row.percentage !== null)
    .slice(0, 20);
}

function buildConcentrationWarnings(distribution: TokenomicsData["distribution"]) {
  const privateLike = distribution
    .filter((item) => /private|seed|strategic|investor/i.test(item.name))
    .reduce((sum, item) => sum + (item.percentage ?? 0), 0);
  const warnings: string[] = [];

  distribution.forEach((item) => {
    const value = item.percentage ?? 0;

    if (/team/i.test(item.name) && value >= 10) {
      warnings.push("Team allocation >= 10% — проверь vesting и cliff.");
    }

    if (/foundation/i.test(item.name) && value >= 10) {
      warnings.push("Foundation allocation >= 10% — проверь правила распределения.");
    }

    if (/staking|rewards/i.test(item.name) && value >= 20) {
      warnings.push("Большая доля staking/rewards — это не sell-risk само по себе, но влияет на эмиссию.");
    }
  });

  if (privateLike >= 10) {
    warnings.push("Private/Seed/Strategic суммарно >= 10% — нужна ручная проверка unlocks.");
  }

  return [...new Set(warnings)];
}

function parseCryptoRankUnlockPayload(
  payload: unknown,
  mapping: CryptoRankTokenMapping,
) {
  const rows = arrayPayload(payload).filter(isRecord);
  const candidates = rows.length > 0 ? rows : isRecord(payload) ? [payload] : [];
  const row =
    candidates.find((item) => {
      const rowSymbol = stringFrom(item, ["symbol", "ticker", "asset", "currency"]);
      const rowSlug = stringFrom(item, ["slug", "key", "coinKey", "name"]);

      return (
        rowSymbol?.toUpperCase() === mapping.symbol ||
        rowSlug?.toLowerCase() === mapping.cryptoRankSlug ||
        rowSlug?.toLowerCase() === mapping.coingeckoId
      );
    }) ?? candidates[0];

  if (!row) {
    return null;
  }

  const nextUnlockDate = normalizeDate(
    stringFrom(row, [
      "nextUnlockDate",
      "next_unlock_date",
      "unlockDate",
      "unlock_date",
      "date",
      "vestingDate",
    ]),
  );
  const nextUnlockPercent = numberFrom(
    row.nextUnlockPercent ??
      row.next_unlock_percent ??
      row.unlockPercent ??
      row.unlock_percent ??
      row.percent ??
      row.percentage,
  );
  const nextUnlockMarketCapPercent = numberFrom(
    row.nextUnlockMarketCapPercent ??
      row.next_unlock_market_cap_percent ??
      row.marketCapPercent ??
      row.market_cap_percent,
  );
  const nextUnlockAmount = numberFrom(
    row.nextUnlockAmount ?? row.next_unlock_amount ?? row.amount ?? row.unlockAmount,
  );
  const nextUnlockAmountUsd = numberFrom(
    row.nextUnlockAmountUsd ??
      row.next_unlock_amount_usd ??
      row.amountUsd ??
      row.amount_usd ??
      row.valueUsd ??
      row.value_usd,
  );
  const unlockedPercent = numberFrom(
    row.unlockedPercent ?? row.unlocked_percent ?? row.unlocked,
  );
  const lockedPercent = numberFrom(row.lockedPercent ?? row.locked_percent ?? row.locked);
  const allocationName = stringFrom(row, [
    "allocation",
    "allocationName",
    "allocation_name",
    "round",
    "category",
  ]);

  if (
    nextUnlockDate === null &&
    nextUnlockPercent === null &&
    nextUnlockMarketCapPercent === null &&
    nextUnlockAmount === null &&
    nextUnlockAmountUsd === null &&
    unlockedPercent === null &&
    lockedPercent === null
  ) {
    return null;
  }

  return makeUnlockData({
    allocationName,
    circulatingSupplyPercent: null,
    confidence: "high",
    explanation:
      "CryptoRank вернул точные unlock/vesting-данные. Всё равно сверяй размер события с официальными источниками проекта.",
    isAvailable: true,
    label:
      nextUnlockPercent !== null || nextUnlockMarketCapPercent !== null
        ? "Точные unlock-данные найдены"
        : "Unlock-данные найдены частично",
    lockedPercent,
    manualCheckUrls: manualCheckUrls(mapping),
    nextUnlockAmount,
    nextUnlockAmountUsd,
    nextUnlockDate,
    nextUnlockMarketCapPercent,
    nextUnlockPercent,
    provider: "CryptoRank",
    providerStatus: "exact",
    sourceUrl: `https://cryptorank.io/price/${mapping.cryptoRankSlug}/vesting`,
    unlockedPercent,
  });
}

async function fetchCryptoRankExactUnlocks(
  mapping: CryptoRankTokenMapping,
  apiKey?: string | null,
  enabled = true,
) {
  if (!enabled || !apiKey) {
    return {
      data: null,
      source: sourceDebug({
        enabled: false,
        name: "CryptoRank unlocks",
        rawCount: 0,
        reason: enabled ? "no-api-key" : "disabled",
        status: "skipped",
      }),
      summary: {
        name: "CryptoRank unlocks",
        rawCount: 0,
        reason: enabled ? "no-api-key" : "disabled",
        status: "skipped",
      },
    };
  }

  const url = new URL("https://api.cryptorank.io/v2/currencies/unlocks");
  url.searchParams.set("symbols", mapping.symbol);
  url.searchParams.set("key", mapping.cryptoRankSlug);
  url.searchParams.set("slug", mapping.cryptoRankSlug);

  const { data, error } = await fetchJson(url, {
    headers: {
      "X-Api-Key": apiKey,
    },
  });
  const parsed = error ? null : parseCryptoRankUnlockPayload(data, mapping);
  const count = rawCount(data);

  return {
    data: parsed,
    source: sourceDebug({
      enabled: true,
      fieldsReceived: sampleKeys(data),
      name: "CryptoRank unlocks",
      rawCount: count,
      reason: error ?? (parsed ? undefined : "no-unlock-data"),
      sample: {
        keys: sampleKeys(data),
      },
      sampleTitles: sampleTitles(data),
      status: parsed ? "ok" : "failed",
    }),
    summary: {
      name: "CryptoRank unlocks",
      rawCount: count,
      reason: error ?? (parsed ? undefined : "no-unlock-data"),
      status: parsed ? "ok" : "failed",
    },
  };
}

async function fetchMobulaUnlocks(mapping: CryptoRankTokenMapping, apiKey?: string | null) {
  if (!apiKey) {
    return {
      data: null,
      tokenomics: null,
      source: sourceDebug({
        enabled: false,
        name: "Mobula tokenomics",
        rawCount: 0,
        reason: "no-api-key",
        status: "skipped",
      }),
      summary: {
        name: "Mobula tokenomics",
        rawCount: 0,
        reason: "no-api-key",
        status: "skipped",
      },
    };
  }

  const url = new URL("https://api.mobula.io/api/1/metadata");
  url.searchParams.set("asset", mapping.mobulaSymbol);

  const { data, error } = await fetchJson(url, {
    headers: {
      Authorization: apiKey,
    },
  });
  const root = unwrapRecord(data);
  const distribution = error ? [] : normalizeDistribution(data);
  const circulatingSupply = numberFrom(root?.circulating_supply ?? root?.circulatingSupply);
  const totalSupply = numberFrom(root?.total_supply ?? root?.totalSupply);
  const maxSupply = numberFrom(root?.max_supply ?? root?.maxSupply);
  const supplyBase = totalSupply ?? maxSupply;
  const circulatingSupplyPercent =
    circulatingSupply !== null && supplyBase !== null && supplyBase > 0
      ? (circulatingSupply / supplyBase) * 100
      : null;
  const tokenomics: TokenomicsData | null = error
    ? null
    : {
        circulatingSupply,
        circulatingSupplyPercent,
        concentrationWarnings: buildConcentrationWarnings(distribution),
        confidence: distribution.length > 0 ? "medium" : "low",
        distribution,
        maxSupply,
        provider: "Mobula",
        providerStatus: distribution.length > 0 || circulatingSupplyPercent !== null ? "distribution-only" : "failed",
        sourceUrl: `https://mobula.io/asset/${mapping.mobulaSymbol.toLowerCase()}`,
        totalSupply,
      };
  const count = rawCount(data);

  return {
    data: null,
    tokenomics,
    source: sourceDebug({
      enabled: true,
      fieldsReceived: sampleKeys(data),
      name: "Mobula tokenomics",
      rawCount: count,
      reason: error ?? (tokenomics?.providerStatus === "failed" ? "no-tokenomics-data" : undefined),
      sample: { keys: sampleKeys(data) },
      sampleTitles: sampleTitles(data),
      status: tokenomics?.providerStatus === "failed" || error ? "failed" : "ok",
    }),
    summary: {
      name: "Mobula tokenomics",
      rawCount: count,
      reason: error ?? (tokenomics?.providerStatus === "failed" ? "no-tokenomics-data" : undefined),
      status: tokenomics?.providerStatus === "failed" || error ? "failed" : "ok",
    },
  };
}

async function messariFetch(path: string, apiKey: string, params?: Record<string, string>) {
  const url = new URL(`https://api.messari.io${path}`);

  Object.entries(params ?? {}).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return fetchJson(url, {
    headers: {
      "X-Messari-API-Key": apiKey,
    },
  });
}

async function resolveMessariAsset(mapping: CryptoRankTokenMapping, apiKey: string) {
  const cacheKey = mapping.symbol;
  const cached = messariAssetCache.get(cacheKey);

  if (cached && Date.now() - cached.updatedAt < messariAssetTtlMs) {
    return {
      asset: cached.asset,
      source: sourceDebug({
        enabled: true,
        fieldsReceived: Object.keys(cached.asset).slice(0, 12),
        name: "Messari assets",
        rawCount: 1,
        reason: "cache-hit",
        sample: { keys: Object.keys(cached.asset).slice(0, 12) },
        status: "ok",
      }),
      summary: {
        name: "Messari assets",
        rawCount: 1,
        reason: "cache-hit",
        status: "ok",
      },
    };
  }

  if (mapping.messariAssetId) {
    const asset = {
      id: mapping.messariAssetId,
      slug: mapping.messariSlug,
      symbol: mapping.symbol,
    };

    messariAssetCache.set(cacheKey, {
      asset,
      updatedAt: Date.now(),
    });

    return {
      asset,
      source: sourceDebug({
        enabled: true,
        fieldsReceived: ["id", "slug", "symbol"],
        name: "Messari assets",
        rawCount: 1,
        reason: "mapping-asset-id",
        sample: { id: mapping.messariAssetId, symbol: mapping.symbol },
        status: "ok",
      }),
      summary: {
        name: "Messari assets",
        rawCount: 1,
        reason: "mapping-asset-id",
        status: "ok",
      },
    };
  }

  const { data, error } = await messariFetch("/token-unlocks/v1/assets", apiKey, {
    limit: "100",
    page: "1",
  });
  const asset = error ? null : normalizeMessariAsset(data, mapping);

  if (asset) {
    messariAssetCache.set(cacheKey, {
      asset,
      updatedAt: Date.now(),
    });
  }

  return {
    asset,
    source: sourceDebug({
      enabled: true,
      fieldsReceived: sampleKeys(data),
      name: "Messari assets",
      rawCount: rawCount(data),
      reason: error ?? (asset ? undefined : "asset-not-found"),
      sample: { keys: sampleKeys(data) },
      sampleTitles: sampleTitles(data),
      status: asset ? "ok" : "failed",
    }),
    summary: {
      name: "Messari assets",
      rawCount: rawCount(data),
      reason: error ?? (asset ? undefined : "asset-not-found"),
      status: asset ? "ok" : "failed",
    },
  };
}

async function fetchMessariUnlocks(mapping: CryptoRankTokenMapping, apiKey?: string | null) {
  if (!apiKey) {
    const skipped = sourceDebug({
      enabled: false,
      name: "Messari assets",
      rawCount: 0,
      reason: "no-api-key",
      status: "skipped",
    });

    return {
      data: null,
      sources: [skipped],
      summaries: [
        {
          name: "Messari assets",
          rawCount: 0,
          reason: "no-api-key",
          status: "skipped",
        },
      ],
    };
  }

  const assetResult = await resolveMessariAsset(mapping, apiKey);
  const assetId = assetResult.asset ? stringFrom(assetResult.asset, ["id", "assetId"]) : null;
  const assetSymbol = assetResult.asset ? stringFrom(assetResult.asset, ["symbol", "ticker"]) : null;

  if (!assetId) {
    return {
      data: null,
      sources: [assetResult.source],
      summaries: [assetResult.summary],
    };
  }

  if (assetSymbol && assetSymbol.toUpperCase() !== mapping.symbol) {
    const mismatch = sourceDebug({
      enabled: true,
      name: "Messari assets",
      rawCount: 1,
      reason: "Messari asset mismatch",
      sample: { assetSymbol, requested: mapping.symbol },
      status: "failed",
    });

    return {
      data: null,
      sources: [mismatch],
      summaries: [
        {
          name: "Messari assets",
          rawCount: 1,
          reason: "Messari asset mismatch",
          status: "failed",
        },
      ],
    };
  }

  const now = new Date();
  const startPast = addDays(now, -7).toISOString();
  const startToday = now.toISOString();
  const end90 = addDays(now, 90).toISOString();
  const end180 = addDays(now, 180).toISOString();
  const end365 = addDays(now, 365).toISOString();
  const [allocationsResult, eventsResult, unlocksResult, vestingResult] =
    await Promise.allSettled([
      messariFetch("/token-unlocks/v1/allocations", apiKey, { assetId }),
      messariFetch(`/token-unlocks/v1/assets/${assetId}/events`, apiKey, {
        endTime: end180,
        startTime: startPast,
      }),
      messariFetch(`/token-unlocks/v1/assets/${assetId}/unlocks`, apiKey, {
        endTime: end90,
        interval: "DAILY",
        startTime: startToday,
      }),
      messariFetch(`/token-unlocks/v1/assets/${assetId}/vesting-schedule`, apiKey, {
        endTime: end365,
        startTime: startPast,
      }),
    ]);
  const allocationPayload = allocationsResult.status === "fulfilled" ? allocationsResult.value.data : null;
  const allocationError = allocationsResult.status === "fulfilled" ? allocationsResult.value.error : "request-failed";
  const eventsPayload = eventsResult.status === "fulfilled" ? eventsResult.value.data : null;
  const eventsError = eventsResult.status === "fulfilled" ? eventsResult.value.error : "request-failed";
  const unlocksPayload = unlocksResult.status === "fulfilled" ? unlocksResult.value.data : null;
  const unlocksError = unlocksResult.status === "fulfilled" ? unlocksResult.value.error : "request-failed";
  const vestingPayload = vestingResult.status === "fulfilled" ? vestingResult.value.data : null;
  const vestingError = vestingResult.status === "fulfilled" ? vestingResult.value.error : "request-failed";
  const allocations = normalizeMessariAllocations(allocationPayload);
  const unlockEvents = normalizeMessariEvents(eventsPayload);
  const vesting = normalizeMessariVestingChart(vestingPayload);
  const nextEvent = unlockEvents.find((event) => isFutureOrToday(event.date));
  const lastVestingPoint = vesting.vestingChart.at(-1);
  const unlocksRemainingNative = lastVestingPoint?.unlocksRemainingNative ?? null;
  const unlocksRemainingUsd = lastVestingPoint?.unlocksRemainingUsd ?? null;
  const hasFutureVesting =
    (unlocksRemainingNative !== null && unlocksRemainingNative > 0) ||
    (unlocksRemainingUsd !== null && unlocksRemainingUsd > 0);
  const hasLinearUnlocks = !nextEvent && hasFutureVesting && vesting.vestingChart.length > 0;
  let providerStatus: UnlockProviderStatus = "failed";
  let confidence: UnlockConfidence = "unknown";
  let label = "Messari unlocks недоступны";
  let explanation = "Messari не вернул usable unlock/vesting data. Используем fallback ниже.";
  let isAvailable = false;

  if (nextEvent) {
    providerStatus = nextEvent.amountNative !== null || nextEvent.amountUsd !== null ? "exact" : "partial";
    confidence = providerStatus === "exact" ? "high" : "medium";
    label = providerStatus === "exact" ? "Ближайший unlock найден" : "Ближайший unlock найден частично";
    explanation =
      providerStatus === "exact"
        ? "Messari вернул ближайшее unlock-событие и размер. Всё равно сверяй крупные события с источниками проекта."
        : "Messari вернул ближайшее unlock-событие, но размер неполный. Нужна ручная сверка.";
    isAvailable = true;
  } else if (hasLinearUnlocks) {
    providerStatus = "partial";
    confidence = "medium";
    label = "Есть остаток vesting";
    explanation = "Есть остаток vesting, но ближайшее cliff-событие не найдено в выбранном окне.";
    isAvailable = true;
  } else if (vesting.vestingChart.length > 0) {
    providerStatus = "no-future-unlocks";
    confidence = "high";
    label = "Будущих vesting unlocks не найдено";
    explanation = "Messari показывает, что в выбранном окне будущих vesting unlocks не найдено.";
    isAvailable = true;
  }

  const data =
    providerStatus === "failed"
      ? null
      : makeUnlockData({
          allocations: allocations.length > 0 ? allocations : vesting.allocations,
          allocationName: nextEvent?.allocationName ?? null,
          circulatingSupplyPercent: null,
          confidence,
          explanation,
          isAvailable,
          label,
          lockedPercent: null,
          manualCheckUrls: manualCheckUrls(mapping),
          nextUnlockAmount: nextEvent?.amountNative ?? null,
          nextUnlockAmountUsd: nextEvent?.amountUsd ?? null,
          nextUnlockDate: nextEvent?.date ?? null,
          nextUnlockMarketCapPercent: null,
          nextUnlockPercent: nextEvent?.percent ?? null,
          provider: "Messari",
          providerStatus,
          sourceUrl: `https://messari.io/token-unlocks/${mapping.messariSlug}`,
          unlockedPercent:
            lastVestingPoint?.percentOfUnlocksCompleted !== null &&
            lastVestingPoint?.percentOfUnlocksCompleted !== undefined
              ? lastVestingPoint.percentOfUnlocksCompleted
              : null,
          unlockEvents,
          unlocksRemainingNative,
          unlocksRemainingUsd,
          vestingChart: vesting.vestingChart,
          vestingEndDate: vesting.projectedEndDate,
          warnings: [
            ...(eventsError ? [`Messari events: ${eventsError}`] : []),
            ...(unlocksError ? [`Messari unlocks: ${unlocksError}`] : []),
            ...(vestingError ? [`Messari vesting-schedule: ${vestingError}`] : []),
          ],
        });
  const sources = [
    assetResult.source,
    sourceDebug({
      enabled: true,
      fieldsReceived: sampleKeys(allocationPayload),
      name: "Messari allocations",
      rawCount: rawCount(allocationPayload),
      reason: allocationError ?? undefined,
      sample: { keys: sampleKeys(allocationPayload) },
      sampleTitles: sampleTitles(allocationPayload),
      status: allocationError ? "failed" : "ok",
    }),
    sourceDebug({
      enabled: true,
      fieldsReceived: sampleKeys(eventsPayload),
      name: "Messari events",
      rawCount: rawCount(eventsPayload),
      reason: eventsError ?? undefined,
      sample: { keys: sampleKeys(eventsPayload) },
      sampleTitles: sampleTitles(eventsPayload),
      status: eventsError ? "failed" : "ok",
    }),
    sourceDebug({
      enabled: true,
      fieldsReceived: sampleKeys(unlocksPayload),
      name: "Messari unlocks",
      rawCount: rawCount(unlocksPayload),
      reason: unlocksError ?? undefined,
      sample: { keys: sampleKeys(unlocksPayload) },
      sampleTitles: sampleTitles(unlocksPayload),
      status: unlocksError ? "failed" : "ok",
    }),
    sourceDebug({
      enabled: true,
      fieldsReceived: sampleKeys(vestingPayload),
      name: "Messari vesting-schedule",
      rawCount: vesting.vestingChart.length,
      reason: vestingError ?? undefined,
      sample: { keys: sampleKeys(vestingPayload), points: vesting.vestingChart.length },
      sampleTitles: sampleTitles(vestingPayload),
      status: vestingError ? "failed" : "ok",
    }),
  ];

  return {
    data,
    sources,
    summaries: sources.map((source) => ({
      name: source.name,
      rawCount: source.rawCount,
      reason: source.reason,
      status: source.status,
    })),
  };
}

function normalizedText(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function tokenomistCandidateIds(mapping: CryptoRankTokenMapping) {
  return [
    mapping.tokenomistSlug,
    mapping.coingeckoId,
    mapping.cryptoRankSlug,
    mapping.messariSlug,
    mapping.symbol.toLowerCase(),
  ].filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index);
}

async function tokenomistFetch(
  path: string,
  apiKey: string,
  params?: Record<string, string | number | null | undefined>,
) {
  const url = new URL(`https://api.tokenomist.ai${path}`);

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return fetchJson(url, {
    headers: {
      "x-api-key": apiKey,
    },
  });
}

function tokenomistRows(payload: unknown) {
  return arrayPayload(payload).filter(isRecord);
}

function tokenomistSampleTitles(payload: unknown) {
  return tokenomistRows(payload)
    .map((row) => stringFrom(row, ["tokenName", "name", "symbol", "tokenSymbol"]) ?? "token")
    .slice(0, 5);
}

function findTokenomistToken(rows: UnknownRecord[], mapping: CryptoRankTokenMapping) {
  const ids = tokenomistCandidateIds(mapping).map((value) => value.toLowerCase());
  const symbol = mapping.symbol.toUpperCase();
  const normalizedName = normalizedText(mapping.messariSlug);

  return (
    rows.find((row) => {
      const id = stringFrom(row, ["id", "tokenId"])?.toLowerCase();

      return Boolean(id && ids.includes(id));
    }) ??
    rows.find((row) => stringFrom(row, ["symbol", "tokenSymbol"])?.toUpperCase() === symbol) ??
    rows.find((row) => normalizedText(stringFrom(row, ["name", "tokenName"])) === normalizedName) ??
    null
  );
}

function percentage(part: number | null, total: number | null) {
  return part !== null && total !== null && total > 0 ? (part / total) * 100 : null;
}

function buildTokenomistSummary(row: UnknownRecord | null): TokenomistSummary | null {
  if (!row) {
    return null;
  }

  const unlockedAmount = numberFrom(row.unlockedAmount);
  const totalLockedAmount = numberFrom(row.totalLockedAmount);
  const tbdLockedAmount = numberFrom(row.tbdLockedAmount);
  const untrackedAmount = numberFrom(row.untrackedAmount);
  const maxSupply = numberFrom(row.maxSupply);
  const derivedTotal =
    maxSupply ??
    [unlockedAmount, totalLockedAmount, tbdLockedAmount, untrackedAmount].reduce<number>(
      (sum, value) => sum + (value ?? 0),
      0,
    );
  const total = derivedTotal && derivedTotal > 0 ? derivedTotal : null;

  return {
    circulatingSupply: numberFrom(row.circulatingSupply),
    hasBurn: typeof row.hasBurn === "boolean" ? row.hasBurn : null,
    hasBuyback: typeof row.hasBuyback === "boolean" ? row.hasBuyback : null,
    hasCommittedClaim: typeof row.hasCommittedClaim === "boolean" ? row.hasCommittedClaim : null,
    hasFundraising: typeof row.hasFundraising === "boolean" ? row.hasFundraising : null,
    hasStandardAllocation:
      typeof row.hasStandardAllocation === "boolean" ? row.hasStandardAllocation : null,
    lastUpdatedDate: stringFrom(row, ["lastUpdatedDate"]),
    latestFundraisingRound: stringFrom(row, ["latestFundraisingRound"]),
    lockedPercentage: percentage(totalLockedAmount, total),
    marketCap: numberFrom(row.marketCap),
    maxSupply,
    name: stringFrom(row, ["name", "tokenName"]),
    provider: "Tokenomist",
    providerStatus: "summary",
    releasedPercentage: numberFrom(row.releasedPercentage) ?? percentage(unlockedAmount, total),
    symbol: stringFrom(row, ["symbol", "tokenSymbol"]),
    tbdLockedAmount,
    tbdPercentage: percentage(tbdLockedAmount, total),
    tokenId: stringFrom(row, ["id", "tokenId"]),
    totalLockedAmount,
    unlockedAmount,
    untrackedAmount,
    websiteUrl: stringFrom(row, ["websiteUrl", "url", "link"]),
  };
}

function tokenomicsFromTokenomist(summary: TokenomistSummary | null): TokenomicsData | null {
  if (!summary) {
    return null;
  }

  return {
    circulatingSupply: summary.circulatingSupply,
    circulatingSupplyPercent: percentage(summary.circulatingSupply, summary.maxSupply),
    concentrationWarnings: [],
    confidence: "medium",
    distribution: [],
    hasBurn: summary.hasBurn,
    hasBuyback: summary.hasBuyback,
    hasCommittedClaim: summary.hasCommittedClaim,
    hasFundraising: summary.hasFundraising,
    latestFundraisingRound: summary.latestFundraisingRound,
    lockedPercentage: summary.lockedPercentage,
    maxSupply: summary.maxSupply,
    provider: "Tokenomist",
    providerStatus: "summary",
    releasedPercentage: summary.releasedPercentage,
    sourceUrl: summary.websiteUrl,
    tbdLockedAmount: summary.tbdLockedAmount,
    tbdPercentage: summary.tbdPercentage,
    totalLockedAmount: summary.totalLockedAmount,
    totalSupply: summary.maxSupply,
    unlockedAmount: summary.unlockedAmount,
    untrackedAmount: summary.untrackedAmount,
    websiteUrl: summary.websiteUrl,
  };
}

async function fetchTokenomistTokenList(mapping: CryptoRankTokenMapping, apiKey: string) {
  const candidates = tokenomistCandidateIds(mapping);
  const cacheKey = candidates.join(",");
  const cached = tokenomistTokenListCache.get(cacheKey);
  let payload: unknown | null = null;
  let error: string | null = null;
  let reason: string | undefined = undefined;

  if (cached && Date.now() - cached.updatedAt < tokenomistTokenListTtlMs) {
    payload = cached.data;
    reason = "cache-hit";
  } else {
    const response = await tokenomistFetch("/v5/token/list", apiKey, {
      tokenId: candidates.join(","),
    });
    payload = response.data;
    error = response.error;

    if (!error && payload) {
      tokenomistTokenListCache.set(cacheKey, {
        data: payload,
        updatedAt: Date.now(),
      });
    }
  }

  const rows = tokenomistRows(payload);
  const token = error ? null : findTokenomistToken(rows, mapping);
  const source = sourceDebug({
    enabled: true,
    fieldsReceived: sampleKeys(payload),
    name: "Tokenomist token-list",
    rawCount: rows.length,
    reason: error ?? reason ?? (token ? undefined : "token-not-found"),
    sample: { keys: sampleKeys(payload) },
    sampleTitles: tokenomistSampleTitles(payload),
    status: token ? "ok" : error ? "failed" : "partial",
  });

  return {
    payload,
    source,
    summary: {
      name: source.name,
      rawCount: source.rawCount,
      reason: source.reason,
      status: source.status,
    },
    token,
    tokenomistSummary: buildTokenomistSummary(token),
  };
}

function allocationBreakdownFromCliff(cliff: UnknownRecord | null): UnlockAllocationBreakdown[] {
  return arrayPayload(cliff?.allocationBreakdown)
    .filter(isRecord)
    .map((item) => ({
      allocationName: stringFrom(item, ["allocationName", "name"]),
      amount: numberFrom(item.cliffAmount ?? item.amount),
      amountUsd: numberFrom(item.cliffValue ?? item.value),
      standardAllocationName: stringFrom(item, ["standardAllocationName"]),
      unlockPrecision: stringFrom(item, ["unlockPrecision"]),
    }))
    .slice(0, 20);
}

type TokenomistEvent = {
  allocationBreakdown: UnlockAllocationBreakdown[];
  allocationName: string | null;
  dataSource: string | null;
  isFuture: boolean;
  isRecent: boolean;
  latestUpdateDate: string | null;
  providerStatus: "exact" | "partial" | "recent-unlock";
  referencePrice: number | null;
  referencePriceUpdatedTime: string | null;
  tokenId: string | null;
  tokenName: string | null;
  tokenSymbol: string | null;
  totalCliffAmount: number | null;
  totalCliffValue: number | null;
  unlockDate: string | null;
  valueToMarketCap: number | null;
};

function classifyTokenomistDate(date: string | null) {
  if (!date) {
    return {
      isFuture: false,
      isRecent: false,
    };
  }

  const time = new Date(date).getTime();

  if (!Number.isFinite(time)) {
    return {
      isFuture: false,
      isRecent: false,
    };
  }

  const now = Date.now();

  return {
    isFuture: time >= now,
    isRecent: time < now && now - time <= 7 * 24 * 60 * 60_000,
  };
}

function normalizeTokenomistEvent(row: UnknownRecord, mapping: CryptoRankTokenMapping) {
  const eventRoot = isRecord(row.upcomingEvent) ? row.upcomingEvent : row;
  const cliff = isRecord(eventRoot.cliffUnlocks)
    ? eventRoot.cliffUnlocks
    : isRecord(row.cliffUnlocks)
      ? row.cliffUnlocks
      : null;
  const unlockDateRaw =
    stringFrom(eventRoot, ["unlockDate", "date"]) ??
    stringFrom(row, ["unlockDate", "date"]);
  const unlockDate = normalizeDate(unlockDateRaw) ?? null;
  const classification = classifyTokenomistDate(unlockDateRaw ?? unlockDate);
  const breakdown = allocationBreakdownFromCliff(cliff);
  const totalCliffAmount = numberFrom(
    cliff?.totalCliffAmount ?? cliff?.cliffAmount ?? eventRoot.totalCliffAmount,
  );
  const totalCliffValue = numberFrom(
    cliff?.totalCliffValue ?? cliff?.cliffValue ?? eventRoot.totalCliffValue,
  );
  const providerStatus: TokenomistEvent["providerStatus"] = classification.isRecent
    ? "recent-unlock"
    : cliff && (totalCliffAmount !== null || totalCliffValue !== null)
      ? "exact"
      : "partial";

  return {
    allocationBreakdown: breakdown,
    allocationName: breakdown.map((item) => item.allocationName).filter(Boolean).join(", ") || null,
    dataSource: stringFrom(row, ["dataSource"]) ?? stringFrom(eventRoot, ["dataSource"]),
    isFuture: classification.isFuture,
    isRecent: classification.isRecent,
    latestUpdateDate:
      stringFrom(eventRoot, ["latestUpdateDate"]) ?? stringFrom(row, ["latestUpdateDate"]),
    providerStatus,
    referencePrice: numberFrom(eventRoot.referencePrice),
    referencePriceUpdatedTime: stringFrom(eventRoot, ["referencePriceUpdatedTime"]),
    tokenId: stringFrom(row, ["tokenId"]) ?? mapping.tokenomistSlug,
    tokenName: stringFrom(row, ["tokenName", "name"]),
    tokenSymbol: stringFrom(row, ["tokenSymbol", "symbol"]) ?? mapping.symbol,
    totalCliffAmount,
    totalCliffValue,
    unlockDate,
    valueToMarketCap: numberFrom(cliff?.valueToMarketCap ?? eventRoot.valueToMarketCap),
  } satisfies TokenomistEvent;
}

function tokenomistEventMatches(row: UnknownRecord, mapping: CryptoRankTokenMapping) {
  const id = stringFrom(row, ["tokenId", "id"])?.toLowerCase();
  const symbol = stringFrom(row, ["tokenSymbol", "symbol"])?.toUpperCase();
  const name = normalizedText(stringFrom(row, ["tokenName", "name"]));
  const ids = tokenomistCandidateIds(mapping).map((value) => value.toLowerCase());

  return (
    Boolean(id && ids.includes(id)) ||
    symbol === mapping.symbol ||
    name === normalizedText(mapping.messariSlug)
  );
}

function selectTokenomistEvent(events: TokenomistEvent[]) {
  const future = events
    .filter((event) => event.isFuture && event.unlockDate)
    .sort((a, b) => String(a.unlockDate).localeCompare(String(b.unlockDate)));

  if (future[0]) {
    return future[0];
  }

  return events
    .filter((event) => event.isRecent && event.unlockDate)
    .sort((a, b) => String(b.unlockDate).localeCompare(String(a.unlockDate)))[0] ?? null;
}

async function fetchTokenomistUpcomingUnlockEvents(
  mapping: CryptoRankTokenMapping,
  apiKey: string,
) {
  const sources: UnlockSourceDebug[] = [];
  const events: TokenomistEvent[] = [];
  let lastReason: string | undefined = undefined;

  for (let page = 1; page <= 3; page += 1) {
    const { data, error } = await tokenomistFetch("/v5/unlock/events/upcoming", apiKey, {
      page,
      pageSize: 50,
    });
    const rows = tokenomistRows(data);
    const matched = rows.filter((row) => tokenomistEventMatches(row, mapping));

    events.push(...matched.map((row) => normalizeTokenomistEvent(row, mapping)));
    lastReason = error ?? undefined;
    sources.push(
      sourceDebug({
        enabled: true,
        fieldsReceived: sampleKeys(data),
        name: "Tokenomist upcoming-events",
        rawCount: rows.length,
        reason: error ?? (matched.length > 0 ? undefined : "token-not-on-page"),
        sample: { keys: sampleKeys(data), page },
        sampleTitles: tokenomistSampleTitles(data),
        status: error ? "failed" : "ok",
      }),
    );

    if (error || matched.length > 0 || rows.length < 50) {
      break;
    }
  }

  return {
    events,
    reason: lastReason,
    sources,
    summaries: sources.map((source) => ({
      name: source.name,
      rawCount: source.rawCount,
      reason: source.reason,
      status: source.status,
    })),
  };
}

async function fetchTokenomistUnlockEventsHistory(
  mapping: CryptoRankTokenMapping,
  apiKey: string,
  tokenId: string,
) {
  const sources: UnlockSourceDebug[] = [];
  const events: TokenomistEvent[] = [];
  let lastReason: string | undefined = undefined;

  for (let page = 1; page <= 3; page += 1) {
    const { data, error } = await tokenomistFetch(`/v5/unlock/events/${tokenId}`, apiKey, {
      page,
      pageSize: 50,
    });
    const rows = tokenomistRows(data);

    events.push(...rows.map((row) => normalizeTokenomistEvent(row, mapping)));
    lastReason = error ?? undefined;
    sources.push(
      sourceDebug({
        enabled: true,
        fieldsReceived: sampleKeys(data),
        name: "Tokenomist unlock-events",
        rawCount: rows.length,
        reason: error ?? undefined,
        sample: { keys: sampleKeys(data), page },
        sampleTitles: tokenomistSampleTitles(data),
        status: error ? "failed" : "ok",
      }),
    );

    if (error || rows.length < 50) {
      break;
    }
  }

  return {
    events,
    reason: lastReason,
    sources,
    summaries: sources.map((source) => ({
      name: source.name,
      rawCount: source.rawCount,
      reason: source.reason,
      status: source.status,
    })),
  };
}

function buildTokenomistUnlockEvents(events: TokenomistEvent[]): UnlockEvent[] {
  return events
    .map((event) => ({
      allocationName: event.allocationName,
      amountNative: event.totalCliffAmount,
      amountUsd: event.totalCliffValue,
      date: event.unlockDate,
      percent: event.valueToMarketCap,
      title: `${event.tokenSymbol ?? "Token"} unlock`,
      type: event.providerStatus,
    }))
    .slice(0, 30);
}

async function fetchTokenomistUnlocks(
  mapping: CryptoRankTokenMapping,
  apiKey?: string | null,
  enabled = false,
) {
  if (!enabled || !apiKey) {
    const reason = enabled ? "no-api-key" : "disabled";
    const skipped = sourceDebug({
      enabled: false,
      name: "Tokenomist token-list",
      rawCount: 0,
      reason,
      status: "skipped",
    });

    return {
      data: null,
      sources: [skipped],
      summaries: [
        {
          name: skipped.name,
          rawCount: 0,
          reason,
          status: skipped.status,
        },
      ],
    };
  }

  const tokenList = await fetchTokenomistTokenList(mapping, apiKey);
  const summary = tokenList.tokenomistSummary;
  const tokenId = summary?.tokenId ?? mapping.tokenomistSlug;

  if (!summary || !tokenId) {
    return {
      data: null,
      sources: [tokenList.source],
      summaries: [tokenList.summary],
    };
  }

  const [upcoming, history] = await Promise.all([
    fetchTokenomistUpcomingUnlockEvents(mapping, apiKey),
    fetchTokenomistUnlockEventsHistory(mapping, apiKey, tokenId),
  ]);
  const allEvents = [...upcoming.events, ...history.events];
  const selectedEvent = selectTokenomistEvent(allEvents);
  const tokenomics = tokenomicsFromTokenomist(summary);
  let providerStatus: UnlockProviderStatus = "summary-only";
  let confidence: UnlockConfidence = "medium";
  let label = "Ближайший unlock не найден, но есть данные по locked supply";
  let explanation =
    "В доступном окне ближайшее unlock-событие не найдено. Используются данные Tokenomist по locked / unlocked / TBD supply.";

  if (selectedEvent) {
    providerStatus = selectedEvent.providerStatus;
    confidence = providerStatus === "exact" ? "high" : "medium";
    label = providerStatus === "recent-unlock" ? "Недавний unlock" : "Найден ближайший unlock";
    explanation =
      providerStatus === "recent-unlock"
        ? "Unlock уже прошёл недавно, но рынок может ещё переваривать давление предложения."
        : providerStatus === "exact"
          ? "Tokenomist показывает ближайшее unlock-событие, сумму, оценку в $ и долю к капитализации."
          : "Tokenomist вернул unlock-событие, но cliffUnlocks заполнены частично.";
  }

  const data = makeUnlockData({
    allocationBreakdown: selectedEvent?.allocationBreakdown ?? [],
    allocationName: selectedEvent?.allocationName ?? null,
    circulatingSupplyPercent: tokenomics?.circulatingSupplyPercent ?? null,
    confidence,
    explanation,
    isAvailable: true,
    label,
    lockedPercent: summary.lockedPercentage,
    lockedPercentage: summary.lockedPercentage,
    manualCheckUrls: manualCheckUrls(mapping),
    maxSupply: summary.maxSupply,
    nextUnlockAmount: selectedEvent?.totalCliffAmount ?? null,
    nextUnlockAmountUsd: selectedEvent?.totalCliffValue ?? null,
    nextUnlockDate: selectedEvent?.unlockDate ?? null,
    nextUnlockMarketCapPercent: selectedEvent?.valueToMarketCap ?? null,
    nextUnlockPercent: null,
    provider: "Tokenomist",
    providerStatus,
    rawTitle: selectedEvent ? `${selectedEvent.tokenSymbol ?? mapping.symbol} unlock` : null,
    releasedPercentage: summary.releasedPercentage,
    sourceUrl: summary.websiteUrl,
    tbdLockedAmount: summary.tbdLockedAmount,
    tbdPercentage: summary.tbdPercentage,
    tokenomistSummary: summary,
    tokenomics,
    totalLockedAmount: summary.totalLockedAmount,
    unlockedAmount: summary.unlockedAmount,
    unlockedPercent: summary.releasedPercentage,
    unlockEvents: buildTokenomistUnlockEvents(allEvents),
    untrackedAmount: summary.untrackedAmount,
    warnings: [
      ...(selectedEvent && providerStatus === "partial"
        ? ["Tokenomist event без полных cliffUnlocks."]
        : []),
      ...(upcoming.reason ? [`Tokenomist upcoming-events: ${upcoming.reason}`] : []),
      ...(history.reason ? [`Tokenomist unlock-events: ${history.reason}`] : []),
    ],
  });

  return {
    data,
    sources: [tokenList.source, ...upcoming.sources, ...history.sources],
    summaries: [tokenList.summary, ...upcoming.summaries, ...history.summaries],
  };
}

async function fetchTokenomistUnlocksLegacy(
  mapping: CryptoRankTokenMapping,
  apiKey?: string | null,
  enabled = false,
) {
  const provider = "Tokenomist";

  if (!enabled || !apiKey) {
    const reason = enabled ? "no-api-key" : "disabled";

    return {
      data: null,
      source: sourceDebug({
        enabled: false,
        name: "Tokenomist unlocks",
        rawCount: 0,
        reason,
        status: "skipped",
      }),
      summary: {
        name: "Tokenomist unlocks",
        rawCount: 0,
        reason,
        status: "skipped",
      },
    };
  }

  const url = new URL(`https://api.tokenomist.ai/v5/unlock/events/${mapping.tokenomistSlug}`);
  const { data, error } = await fetchJson(url, {
    headers: {
      "x-api-key": apiKey,
    },
  });
  const parsed = error
    ? null
    : parseGenericUnlockPayload({
        mapping,
        payload: data,
        provider,
        sourceUrl: `https://tokenomist.ai/${mapping.tokenomistSlug}`,
      });
  const count = rawCount(data);

  if (parsed) {
    parsed.warnings = [
      ...parsed.warnings,
      "Tokenomist Free API может показывать ограниченное число будущих unlock events.",
    ];
  }

  return {
    data: parsed,
    source: sourceDebug({
      enabled: true,
      fieldsReceived: sampleKeys(data),
      name: "Tokenomist unlocks",
      rawCount: count,
      reason: error ?? (parsed ? undefined : "no-unlock-data"),
      sample: { keys: sampleKeys(data) },
      sampleTitles: sampleTitles(data),
      status: parsed ? "ok" : "failed",
    }),
    summary: {
      name: "Tokenomist unlocks",
      rawCount: count,
      reason: error ?? (parsed ? undefined : "no-unlock-data"),
      status: parsed ? "ok" : "failed",
    },
  };
}

function normalizeCoinGlassReason(value: unknown) {
  if (!isRecord(value)) {
    return "no-data";
  }

  const code = value.code === undefined || value.code === null ? null : String(value.code);
  const message = stringFrom(value, ["msg", "message", "error", "reason"]);

  if (code && code !== "0") {
    if (message && /upgrade\s*plan/i.test(message)) {
      return "upgrade-plan";
    }

    return message ? message.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : `coinglass-code-${code}`;
  }

  if (value.data === undefined || value.data === null) {
    return "no-data";
  }

  return null;
}

async function fetchCoinGlassUnlocks(
  mapping: CryptoRankTokenMapping,
  apiKey?: string | null,
  enabled = false,
) {
  if (!enabled || !apiKey) {
    const reason = enabled ? "no-api-key" : "disabled";

    return {
      data: null,
      source: sourceDebug({
        enabled: false,
        name: "CoinGlass unlocks",
        rawCount: 0,
        reason,
        status: "skipped",
      }),
      summary: {
        name: "CoinGlass unlocks",
        rawCount: 0,
        reason,
        status: "skipped",
      },
    };
  }

  const headers = {
    "CG-API-KEY": apiKey,
  };
  const unlockListUrl = new URL("https://open-api-v4.coinglass.com/api/coin/unlock-list");
  unlockListUrl.searchParams.set("symbol", mapping.coinglassSymbol);
  const vestingUrl = new URL("https://open-api-v4.coinglass.com/api/coin/vesting");
  vestingUrl.searchParams.set("symbol", mapping.coinglassSymbol);
  const [unlockListResult, vestingResult] = await Promise.allSettled([
    fetchJson(unlockListUrl, { headers }),
    fetchJson(vestingUrl, { headers }),
  ]);
  const unlockList =
    unlockListResult.status === "fulfilled" ? unlockListResult.value.data : null;
  const unlockListRequestError =
    unlockListResult.status === "fulfilled" ? unlockListResult.value.error : "request-failed";
  const vestingPayload = vestingResult.status === "fulfilled" ? vestingResult.value.data : null;
  const vestingRequestError =
    vestingResult.status === "fulfilled" ? vestingResult.value.error : "request-failed";
  const unlockListError = unlockListRequestError ?? normalizeCoinGlassReason(unlockList);
  const vestingError = vestingRequestError ?? normalizeCoinGlassReason(vestingPayload);
  const parsed = unlockListError
    ? null
    : parseGenericUnlockPayload({
        mapping,
        payload: unlockList,
        provider: "CoinGlass",
        sourceUrl: `https://www.coinglass.com/coin/${mapping.coinglassSymbol}`,
      });

  if (parsed) {
    parsed.provider = "CoinGlass";
    parsed.sourceUrl = `https://www.coinglass.com/coin/${mapping.coinglassSymbol}`;
    parsed.warnings = [
      ...parsed.warnings,
      ...(vestingError ? [`CoinGlass vesting: ${vestingError}`] : []),
    ];
  }

  const source = sourceDebug({
    enabled: true,
    fieldsReceived: sampleKeys(unlockList),
    name: "CoinGlass unlock-list",
    rawCount: unlockListError ? 0 : rawCount(unlockList),
    reason: unlockListError ?? (parsed ? undefined : "no-unlock-data-or-plan"),
    sample: { keys: sampleKeys(unlockList) },
    sampleTitles: sampleTitles(unlockList),
    status: parsed ? "ok" : "failed",
  });
  const vestingSource = sourceDebug({
    enabled: true,
    fieldsReceived: sampleKeys(vestingPayload),
    name: "CoinGlass vesting",
    rawCount: vestingError ? 0 : rawCount(vestingPayload),
    reason: vestingError ?? undefined,
    sample: { keys: sampleKeys(vestingPayload) },
    sampleTitles: sampleTitles(vestingPayload),
    status: vestingError ? "failed" : "ok",
  });

  return {
    data: parsed,
    sources: [source, vestingSource],
    summaries: [source, vestingSource].map((item) => ({
      name: item.name,
      rawCount: item.rawCount,
      reason: item.reason,
      status: item.status,
    })),
  };
}

function extractCoinMarketCalCoins(row: UnknownRecord) {
  const values = [
    row.currencies,
    row.coins,
    row.assets,
    row.tokens,
    row.coin,
    row.currency,
  ];
  const symbols = new Set<string>();

  for (const value of values) {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (isRecord(item)) {
          const symbol = stringFrom(item, ["symbol", "ticker", "code"]);

          if (symbol) {
            symbols.add(symbol.toUpperCase());
          }
        } else if (typeof item === "string") {
          symbols.add(item.toUpperCase());
        }
      });
    } else if (isRecord(value)) {
      const symbol = stringFrom(value, ["symbol", "ticker", "code"]);

      if (symbol) {
        symbols.add(symbol.toUpperCase());
      }
    }
  }

  return [...symbols];
}

async function findCoinMarketCalUnlockHint(
  mapping: CryptoRankTokenMapping,
  apiKey?: string | null,
) {
  if (!apiKey) {
    return {
      data: null,
      source: sourceDebug({
        enabled: false,
        name: "CoinMarketCal unlock hint",
        rawCount: 0,
        reason: "no-api-key",
        status: "skipped",
      }),
      summary: {
        name: "CoinMarketCal unlock hint",
        rawCount: 0,
        reason: "no-api-key",
        status: "skipped",
      },
    };
  }

  const now = new Date();
  const url = new URL("https://developers.coinmarketcal.com/v1/events");
  url.searchParams.set("max", "100");
  url.searchParams.set("dateRangeStart", dateKey(addDays(now, -7)));
  url.searchParams.set("dateRangeEnd", dateKey(addDays(now, 180)));

  const { data, error } = await fetchJson(url, {
    headers: {
      "x-api-key": apiKey,
    },
  });

  if (error) {
    return {
      data: null,
      source: sourceDebug({
        enabled: true,
        name: "CoinMarketCal unlock hint",
        rawCount: 0,
        reason: error,
        status: "failed",
      }),
      summary: {
        name: "CoinMarketCal unlock hint",
        rawCount: 0,
        reason: error,
        status: "failed",
      },
    };
  }

  const rows = arrayPayload(data).filter(isRecord);
  const event = rows.find((row) => {
    const title = stringFrom(row, ["title", "name", "caption"]) ?? "";
    const coins = extractCoinMarketCalCoins(row);

    return (
      coins.includes(mapping.symbol) &&
      /unlock|token unlock|cliff|vesting|token release|release/i.test(title)
    );
  });

  if (!event) {
    return {
      data: null,
      source: sourceDebug({
        enabled: true,
        fieldsReceived: rows[0] ? fieldsReceived(rows[0]) : [],
        name: "CoinMarketCal unlock hint",
        rawCount: rows.length,
        reason: "no-unlock-event",
        sample: {
          titles: sampleTitles(rows),
        },
        sampleTitles: sampleTitles(rows),
        status: "failed",
      }),
      summary: {
        name: "CoinMarketCal unlock hint",
        rawCount: rows.length,
        reason: "no-unlock-event",
        status: "failed",
      },
    };
  }

  const title = stringFrom(event, ["title", "name", "caption"]) ?? "Token unlock";
  const date = normalizeDate(
    stringFrom(event, ["date_event", "date", "start_date", "created_at"]),
  );
  const sourceUrl =
    stringFrom(event, ["source", "proof", "url", "link"]) ??
    (isRecord(event.source) ? stringFrom(event.source, ["url", "link"]) : null);
  const isRecent = isRecentPast(date);
  const unlockData = makeUnlockData({
    circulatingSupplyPercent: null,
    confidence: "medium",
    explanation:
      "CoinMarketCal показывает ближайшее событие, связанное с unlock. Размер и процент нужно проверить отдельно.",
    isAvailable: true,
    label: "Найдено событие unlock в календаре",
    lockedPercent: null,
    manualCheckUrls: manualCheckUrls(mapping),
    nextUnlockAmount: null,
    nextUnlockDate: date,
    nextUnlockMarketCapPercent: null,
    nextUnlockPercent: null,
    provider: "CoinMarketCal",
    providerStatus: "calendar-hint",
    rawTitle: title,
    sourceUrl,
    unlockedPercent: null,
  });
  unlockData.explanation = isRecent
    ? "Событие уже прошло, но рынок может ещё переваривать давление предложения."
    : "Календарь показывает unlock-событие, но размер и процент нужно проверить по точному источнику.";
  unlockData.label = isRecent ? "Недавний unlock" : "Найдено unlock-событие в календаре";
  unlockData.providerStatus = isRecent ? "recent-unlock-hint" : "calendar-hint";

  return {
    data: unlockData,
    source: sourceDebug({
      enabled: true,
      fieldsReceived: fieldsReceived(event),
      name: "CoinMarketCal unlock hint",
      rawCount: 1,
      sample: {
        title,
      },
      sampleTitles: [title],
      status: "ok",
    }),
    summary: {
      name: "CoinMarketCal unlock hint",
      rawCount: 1,
      status: "ok",
    },
  };
}

function supplyFallback({
  details,
  mapping,
  marketRecord,
}: {
  details: UnknownRecord | null;
  mapping: CryptoRankTokenMapping;
  marketRecord: UnknownRecord | null;
}) {
  const marketData = details && isRecord(details.market_data) ? details.market_data : null;
  const circulating =
    numberFrom(marketRecord?.circulating_supply) ??
    numberFrom(marketData?.circulating_supply);
  const total =
    numberFrom(marketRecord?.total_supply) ??
    numberFrom(marketData?.total_supply) ??
    numberFrom(marketData?.max_supply);
  const maxSupply = numberFrom(marketRecord?.max_supply) ?? numberFrom(marketData?.max_supply);
  const circulatingSupplyPercent =
    circulating !== null && total !== null && total > 0
      ? (circulating / total) * 100
      : null;
  const supplyTokenomics: TokenomicsData | null =
    circulating !== null || total !== null || maxSupply !== null
      ? {
          circulatingSupply: circulating,
          circulatingSupplyPercent,
          concentrationWarnings: [],
          confidence: "low",
          distribution: [],
          maxSupply,
          provider: "CoinGecko",
          providerStatus: "distribution-only",
          sourceUrl: `https://www.coingecko.com/en/coins/${mapping.coingeckoId}`,
          totalSupply: total,
        }
      : null;
  const data = makeUnlockData({
    circulatingSupplyPercent,
    confidence: circulatingSupplyPercent === null ? "unknown" : "low",
    explanation:
      circulatingSupplyPercent === null
        ? "Точный график vesting unlock не получен. Supply-данных тоже недостаточно, поэтому нужна ручная проверка."
        : "Точный график vesting unlock не получен. Можно оценить только долю циркулирующего предложения, но это не равно unlocked percent.",
    isAvailable: false,
    label:
      circulatingSupplyPercent === null
        ? "Unlocks нужно проверить вручную"
        : "Точных unlocks нет, доступна только оценка supply",
    lockedPercent: null,
    manualCheckUrls: manualCheckUrls(mapping),
    nextUnlockAmount: null,
    nextUnlockDate: null,
    nextUnlockMarketCapPercent: null,
    nextUnlockPercent: null,
    provider:
      circulatingSupplyPercent === null
        ? "manual-check"
        : "CoinGecko",
    providerStatus:
      circulatingSupplyPercent === null ? "manual-check" : "supply-only",
    sourceUrl:
      circulatingSupplyPercent === null
        ? null
        : `https://www.coingecko.com/en/coins/${mapping.coingeckoId}`,
    unlockedPercent: null,
    tokenomics: supplyTokenomics,
    warnings:
      circulatingSupplyPercent === null
        ? ["Точные unlocks не подтверждены автоматически."]
        : ["CoinGecko supply не является unlock schedule"],
  });

  return {
    data,
    source: sourceDebug({
      enabled: true,
      fieldsReceived: [
        circulating !== null ? "circulating_supply" : null,
        total !== null ? "total_supply_or_max_supply" : null,
      ].filter((field): field is string => field !== null),
      name: "CoinGecko supply fallback",
      rawCount: circulating !== null || total !== null ? 1 : 0,
      reason: circulatingSupplyPercent === null ? "no-supply-data" : undefined,
      sample: {
        circulating_supply: circulating,
        total_or_max_supply: total,
      },
      status: circulatingSupplyPercent === null ? "failed" : "ok",
    }),
    summary: {
      name: "CoinGecko supply fallback",
      rawCount: circulating !== null || total !== null ? 1 : 0,
      reason: circulatingSupplyPercent === null ? "no-supply-data" : undefined,
      status: circulatingSupplyPercent === null ? "failed" : "ok",
    },
  };
}

export function validateUnlockData(
  unlocks: TokenUnlockData,
  _token: CryptoRankTokenMapping,
  marketCap?: number | null,
): UnlockValidationSummary {
  const issues: string[] = [];
  const conflicts: string[] = [...unlocks.conflicts];
  const rejectedSources: string[] = [];
  const today = dateKey(new Date());

  if (
    unlocks.nextUnlockDate &&
    unlocks.nextUnlockDate < today &&
    unlocks.providerStatus !== "recent-unlock-hint"
  ) {
    issues.push("nextUnlockDate is in the past");
    rejectedSources.push(unlocks.provider);
  }

  if (unlocks.nextUnlockDate) {
    const unlockTime = new Date(`${unlocks.nextUnlockDate}T00:00:00.000Z`).getTime();
    const threeYears = 3 * 365 * 24 * 60 * 60_000;

    if (Number.isFinite(unlockTime) && unlockTime - Date.now() > threeYears) {
      issues.push("nextUnlockDate is more than 3 years ahead");
    }
  }

  for (const [name, value] of [
    ["nextUnlockAmount", unlocks.nextUnlockAmount],
    ["nextUnlockAmountUsd", unlocks.nextUnlockAmountUsd],
  ] as const) {
    if (value !== null && value < 0) {
      issues.push(`${name} is negative`);
      rejectedSources.push(unlocks.provider);
    }
  }

  for (const [name, value] of [
    ["nextUnlockPercent", unlocks.nextUnlockPercent],
    ["nextUnlockMarketCapPercent", unlocks.nextUnlockMarketCapPercent],
    ["unlockedPercent", unlocks.unlockedPercent],
    ["lockedPercent", unlocks.lockedPercent],
    ["circulatingSupplyPercent", unlocks.circulatingSupplyPercent],
  ] as const) {
    if (value !== null && (value < 0 || value > 100)) {
      issues.push(`${name} is outside 0..100`);
      rejectedSources.push(unlocks.provider);
    }
  }

  if (
    marketCap &&
    unlocks.nextUnlockAmountUsd !== null &&
    unlocks.nextUnlockAmountUsd > marketCap * 0.5
  ) {
    issues.push("nextUnlockAmountUsd is unusually large versus market cap");
  }

  return {
    clean: issues.length === 0 && conflicts.length === 0,
    conflicts,
    issues: [...new Set(issues)],
    rejectedSources: [...new Set(rejectedSources.filter(Boolean))],
  };
}

function compareExactUnlocks(results: TokenUnlockData[]) {
  const conflicts: string[] = [];

  if (results.length < 2) {
    return conflicts;
  }

  for (let index = 0; index < results.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < results.length; nextIndex += 1) {
      const current = results[index];
      const next = results[nextIndex];

      if (current.nextUnlockDate && next.nextUnlockDate) {
        const currentTime = new Date(`${current.nextUnlockDate}T00:00:00.000Z`).getTime();
        const nextTime = new Date(`${next.nextUnlockDate}T00:00:00.000Z`).getTime();
        const dayDiff = Math.abs(currentTime - nextTime) / (24 * 60 * 60_000);

        if (dayDiff > 7) {
          conflicts.push(
            `${current.provider} and ${next.provider} unlock dates differ by more than 7 days`,
          );
        }
      }

      if (current.nextUnlockAmountUsd !== null && next.nextUnlockAmountUsd !== null) {
        const max = Math.max(current.nextUnlockAmountUsd, next.nextUnlockAmountUsd);
        const min = Math.min(current.nextUnlockAmountUsd, next.nextUnlockAmountUsd);

        if (max > 0 && (max - min) / max > 0.2) {
          conflicts.push(
            `${current.provider} and ${next.provider} unlock USD amounts differ by more than 20%`,
          );
        }
      }
    }
  }

  return [...new Set(conflicts)];
}

function ttlForUnlockData(data: TokenUnlockData) {
  if (data.confidence === "high") {
    return exactUnlockTtlMs;
  }

  if (data.confidence === "medium") {
    return calendarHintTtlMs;
  }

  if (data.providerStatus === "supply-only") {
    return calendarHintTtlMs;
  }

  return fallbackUnlockTtlMs;
}

function saveUnlockCache(symbol: string, data: TokenUnlockData) {
  const key = symbol.toUpperCase();
  const existing = unlockCache.get(key);

  if (
    existing &&
    existing.data.confidence === "high" &&
    data.confidence !== "high" &&
    Date.now() - existing.updatedAt < lastGoodUnlockTtlMs
  ) {
    return;
  }

  unlockCache.set(key, {
    data,
    updatedAt: Date.now(),
  });
}

function cachedUnlock(symbol: string) {
  const entry = unlockCache.get(symbol.toUpperCase());

  if (!entry) {
    return null;
  }

  const age = Date.now() - entry.updatedAt;

  if (age <= ttlForUnlockData(entry.data)) {
    return {
      cacheStatus: "hit" as const,
      data: {
        ...entry.data,
      },
    };
  }

  if (age <= lastGoodUnlockTtlMs) {
    return {
      cacheStatus: "last-good" as const,
      data: {
        ...entry.data,
        warnings: [
          ...entry.data.warnings,
          "Показаны последние доступные unlocks.",
        ],
      },
    };
  }

  return null;
}

async function getTokenUnlockDataLegacy({
  coinMarketCalApiKey,
  coinGlassApiKey,
  coinGlassEnabled = false,
  cryptoRankApiKey,
  cryptoRankEnabled = false,
  details,
  forceRefresh = false,
  marketRecord,
  messariApiKey,
  mobulaApiKey,
  tokenomistEnabled = false,
  tokenomistApiKey,
  token,
}: {
  coinMarketCalApiKey?: string | null;
  coinGlassApiKey?: string | null;
  coinGlassEnabled?: boolean;
  cryptoRankApiKey?: string | null;
  cryptoRankEnabled?: boolean;
  details: UnknownRecord | null;
  forceRefresh?: boolean;
  marketRecord: UnknownRecord | null;
  messariApiKey?: string | null;
  mobulaApiKey?: string | null;
  tokenomistEnabled?: boolean;
  tokenomistApiKey?: string | null;
  token: Pick<TokenCard, "coingeckoId" | "ticker">;
}): Promise<UnlockProviderResult> {
  const mapping = resolveCryptoRankToken({
    coingeckoId: token.coingeckoId,
    symbol: token.ticker,
  });
  const cached = forceRefresh ? null : cachedUnlock(mapping.symbol);

  if (cached) {
    return {
      attemptsSummary: [
        {
          name: "unlock cache",
          rawCount: 1,
          status: cached.cacheStatus,
        },
      ],
      cacheStatus: cached.cacheStatus,
      data: cached.data,
      sources: [
        sourceDebug({
          enabled: true,
          name: "Unlock cache",
          rawCount: 1,
          status: "ok",
        }),
      ],
    };
  }

  const baseAsset = baseAssetRule(mapping);

  if (baseAsset) {
    saveUnlockCache(mapping.symbol, baseAsset);

    return {
      attemptsSummary: [
        {
          name: "base-asset-rule",
          rawCount: 1,
          status: "ok",
        },
      ],
      cacheStatus: "saved",
      data: baseAsset,
      sources: [
        sourceDebug({
          enabled: true,
          name: "Base asset rule",
          rawCount: 1,
          status: "ok",
        }),
      ],
    };
  }

  const cryptoRank = await fetchCryptoRankExactUnlocks(mapping, cryptoRankApiKey);

  if (cryptoRank.data) {
    saveUnlockCache(mapping.symbol, cryptoRank.data);

    return {
      attemptsSummary: [cryptoRank.summary],
      cacheStatus: "saved",
      data: cryptoRank.data,
      sources: [cryptoRank.source],
    };
  }

  const coinMarketCal = await findCoinMarketCalUnlockHint(mapping, coinMarketCalApiKey);

  if (coinMarketCal.data) {
    saveUnlockCache(mapping.symbol, coinMarketCal.data);

    return {
      attemptsSummary: [cryptoRank.summary, coinMarketCal.summary],
      cacheStatus: "saved",
      data: coinMarketCal.data,
      sources: [cryptoRank.source, coinMarketCal.source],
    };
  }

  const supply = supplyFallback({
    details,
    mapping,
    marketRecord,
  });
  const data =
    supply.data.providerStatus === "supply-only"
      ? supply.data
      : makeUnlockData({
          circulatingSupplyPercent: null,
          confidence: "unknown",
          explanation:
            "Автоматически не удалось получить точный график unlocks. Перед входом проверь CryptoRank / TokenUnlocks / официальный docs проекта.",
          isAvailable: false,
          label: "Unlocks нужно проверить вручную",
          lockedPercent: null,
          manualCheckUrls: manualCheckUrls(mapping),
          nextUnlockAmount: null,
          nextUnlockDate: null,
          nextUnlockMarketCapPercent: null,
          nextUnlockPercent: null,
          provider: "manual-check",
          providerStatus: "manual-check",
          sourceUrl: null,
          unlockedPercent: null,
          warnings: ["Точные unlocks не подтверждены автоматически."],
        });

  saveUnlockCache(mapping.symbol, data);

  return {
    attemptsSummary: [cryptoRank.summary, coinMarketCal.summary, supply.summary],
    cacheStatus: "saved",
    data,
    sources: [cryptoRank.source, coinMarketCal.source, supply.source],
  };
}

export async function getTokenUnlockData({
  coinMarketCalApiKey,
  coinGlassApiKey,
  coinGlassEnabled = false,
  cryptoRankApiKey,
  cryptoRankEnabled = false,
  details,
  forceRefresh = false,
  marketRecord,
  messariApiKey,
  mobulaApiKey,
  tokenomistEnabled = false,
  tokenomistApiKey,
  token,
}: {
  coinMarketCalApiKey?: string | null;
  coinGlassApiKey?: string | null;
  coinGlassEnabled?: boolean;
  cryptoRankApiKey?: string | null;
  cryptoRankEnabled?: boolean;
  details: UnknownRecord | null;
  forceRefresh?: boolean;
  marketRecord: UnknownRecord | null;
  messariApiKey?: string | null;
  mobulaApiKey?: string | null;
  tokenomistEnabled?: boolean;
  tokenomistApiKey?: string | null;
  token: Pick<TokenCard, "coingeckoId" | "ticker">;
}): Promise<UnlockProviderResult> {
  const mapping = resolveCryptoRankToken({
    coingeckoId: token.coingeckoId,
    symbol: token.ticker,
  });
  const marketCap = numberFrom(marketRecord?.market_cap) ?? numberFrom(marketRecord?.marketCap);
  const cached = forceRefresh ? null : cachedUnlock(mapping.symbol);

  if (cached) {
    return {
      attemptsSummary: [
        {
          name: "unlock cache",
          rawCount: 1,
          status: cached.cacheStatus,
        },
      ],
      cacheStatus: cached.cacheStatus,
      data: cached.data,
      sources: [
        sourceDebug({
          enabled: true,
          name: "Unlock cache",
          rawCount: 1,
          status: "ok",
        }),
      ],
      validation: validateUnlockData(cached.data, mapping, marketCap),
    };
  }

  const baseAsset = baseAssetRule(mapping);

  if (baseAsset) {
    saveUnlockCache(mapping.symbol, baseAsset);

    return {
      attemptsSummary: [
        {
          name: "base-asset-rule",
          rawCount: 1,
          status: "ok",
        },
      ],
      cacheStatus: "saved",
      data: baseAsset,
      sources: [
        sourceDebug({
          enabled: true,
          name: "Base asset rule",
          rawCount: 1,
          status: "ok",
        }),
      ],
      validation: validateUnlockData(baseAsset, mapping, marketCap),
    };
  }

  const providerJobs = [
    fetchTokenomistUnlocks(mapping, tokenomistApiKey, tokenomistEnabled),
    fetchCoinGlassUnlocks(mapping, coinGlassApiKey, coinGlassEnabled),
    findCoinMarketCalUnlockHint(mapping, coinMarketCalApiKey),
    Promise.resolve(supplyFallback({ details, mapping, marketRecord })),
    fetchMobulaUnlocks(mapping, mobulaApiKey),
    fetchMessariUnlocks(mapping, messariApiKey),
    fetchCryptoRankExactUnlocks(mapping, cryptoRankApiKey, cryptoRankEnabled),
  ];
  const providerNames = [
    "Tokenomist v5",
    "CoinGlass unlocks",
    "CoinMarketCal unlock hint",
    "CoinGecko supply fallback",
    "Mobula tokenomics",
    "Messari unlocks",
    "CryptoRank unlocks",
  ];
  const settled = await Promise.allSettled(providerJobs);
  const providerResults: UnlockProviderFetchResult[] = settled.map(
    (result, index): UnlockProviderFetchResult => {
    if (result.status === "fulfilled") {
      return result.value as UnlockProviderFetchResult;
    }

    const reason = result.reason instanceof Error ? result.reason.message : "provider-failed";

    return {
      data: null,
      source: sourceDebug({
        enabled: true,
        name: providerNames[index],
        rawCount: 0,
        reason,
        status: "failed",
      }),
      summary: {
        name: providerNames[index],
        rawCount: 0,
        reason,
        status: "failed",
      },
    };
  });
  const sources = providerResults.flatMap((result) =>
    Array.isArray(result.sources)
      ? result.sources
      : result.source
        ? [result.source]
        : [],
  );
  const attemptsSummary = providerResults.flatMap((result) =>
    Array.isArray(result.summaries)
      ? result.summaries
      : result.summary
        ? [result.summary]
        : [],
  );
  const tokenomistTokenomics =
    providerResults.find((result) => result.data?.provider === "Tokenomist")?.data?.tokenomics ??
    null;
  const externalTokenomics = providerResults.find((result) => result.tokenomics)?.tokenomics ?? null;
  const tokenomics =
    tokenomistTokenomics && externalTokenomics
      ? {
          ...tokenomistTokenomics,
          concentrationWarnings: [
            ...new Set([
              ...tokenomistTokenomics.concentrationWarnings,
              ...externalTokenomics.concentrationWarnings,
            ]),
          ],
          distribution:
            externalTokenomics.distribution.length > 0
              ? externalTokenomics.distribution
              : tokenomistTokenomics.distribution,
          provider: `${tokenomistTokenomics.provider} + ${externalTokenomics.provider}`,
        }
      : tokenomistTokenomics ??
        externalTokenomics ??
        providerResults.find((result) => result.data?.tokenomics)?.data?.tokenomics ??
        null;
  const tokenomistData = providerResults.find(
    (result) =>
      result.data?.provider === "Tokenomist" &&
      (result.data.providerStatus === "exact" ||
        result.data.providerStatus === "recent-unlock" ||
        result.data.providerStatus === "summary-only" ||
        result.data.providerStatus === "partial"),
  )?.data;
  const exactCandidates = providerResults
    .map((result) => result.data)
    .filter(
      (data): data is TokenUnlockData =>
        Boolean(data) &&
        data?.provider !== "Messari" &&
        (data?.providerStatus === "exact" ||
          data?.providerStatus === "partial" ||
          data?.providerStatus === "no-future-unlocks"),
    )
    .map((data) => ({
      data,
      validation: validateUnlockData(data, mapping, marketCap),
    }))
    .filter(({ validation }) => validation.rejectedSources.length === 0);
  const exactOnly = exactCandidates.filter(
    ({ data }) => data.providerStatus === "exact" || data.providerStatus === "no-future-unlocks",
  );
  const calendarHint = providerResults.find(
    (result) =>
      result.data?.providerStatus === "calendar-hint" ||
      result.data?.providerStatus === "recent-unlock-hint",
  )?.data;
  const supply = providerResults.find((result) => result.data?.providerStatus === "supply-only")
    ?.data;
  const manual = providerResults.find((result) => result.data?.providerStatus === "manual-check")
    ?.data;
  let data =
    tokenomistData ?? exactOnly[0]?.data ?? exactCandidates[0]?.data ?? calendarHint ?? supply ?? manual;

  if (!data) {
    data = makeUnlockData({
      circulatingSupplyPercent: null,
      confidence: "unknown",
      explanation:
        "Автоматически не удалось получить точный график unlocks. Перед входом проверь CryptoRank / TokenUnlocks / официальный docs проекта.",
      isAvailable: false,
      label: "Unlocks нужно проверить вручную",
      lockedPercent: null,
      manualCheckUrls: manualCheckUrls(mapping),
      nextUnlockAmount: null,
      nextUnlockDate: null,
      nextUnlockMarketCapPercent: null,
      nextUnlockPercent: null,
      provider: "manual-check",
      providerStatus: "manual-check",
      sourceUrl: null,
      unlockedPercent: null,
      warnings: ["Точные unlocks не подтверждены автоматически."],
    });
  }

  const exactData = tokenomistData
    ? [tokenomistData, ...exactOnly.map(({ data: exactDataItem }) => exactDataItem)]
    : exactOnly.map(({ data: exactDataItem }) => exactDataItem);
  const crossSourceConflicts = compareExactUnlocks(exactData);

  if (!tokenomistData && exactData.length >= 2) {
    data = {
      ...data,
      comparedSources: exactData.map((item) => item.provider),
      confidence: crossSourceConflicts.length > 0 ? "low" : "high",
      conflicts: crossSourceConflicts,
      provider:
        crossSourceConflicts.length > 0
          ? data.provider
          : exactData.map((item) => item.provider).join(" + "),
      providerStatus: crossSourceConflicts.length > 0 ? "conflict" : "exact",
      warnings: [
        ...data.warnings,
        ...(crossSourceConflicts.length > 0
          ? ["Источники расходятся — нужна ручная проверка."]
          : []),
      ],
    };
  }

  if (data.nextUnlockAmountUsd !== null && marketCap !== null && marketCap > 0) {
    data = {
      ...data,
      nextUnlockMarketCapPercent: (data.nextUnlockAmountUsd / marketCap) * 100,
    };
  }

  const validation = validateUnlockData(data, mapping, marketCap);
  data = {
    ...data,
    conflicts: [...new Set([...data.conflicts, ...validation.conflicts])],
    tokenomics: tokenomics ?? data.tokenomics,
    warnings: [
      ...new Set([
        ...data.warnings,
        ...validation.issues,
        ...((tokenomics ?? data.tokenomics)?.concentrationWarnings ?? []),
      ]),
    ],
  };

  saveUnlockCache(mapping.symbol, data);

  return {
    attemptsSummary,
    cacheStatus: "saved",
    data,
    sources,
    validation,
  };
}

function attemptEndpointWithoutKey(url: URL) {
  const clone = new URL(url);
  clone.searchParams.delete("api_key");

  return `${clone.origin}${clone.pathname}?${clone.searchParams.toString()}`;
}

async function runCryptoRankAttempt({
  apiKey,
  authMode,
  endpoint,
  name,
  params,
}: {
  apiKey: string;
  authMode: CryptoRankAttemptResult["authMode"];
  endpoint: string;
  name: string;
  params: Record<string, string>;
}): Promise<CryptoRankAttemptResult> {
  const url = new URL(endpoint);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const headers: Record<string, string> = {};

  if (authMode === "api_key query") {
    url.searchParams.set("api_key", apiKey);
  } else if (authMode === "X-Api-Key") {
    headers["X-Api-Key"] = apiKey;
  } else {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const { data, error, responseStatus } = await fetchJson(url, {
    headers,
  });
  const count = rawCount(data);

  return {
    authMode,
    endpointWithoutKey: attemptEndpointWithoutKey(url),
    errorMessage: error,
    method: "GET",
    name,
    ok: error === null,
    rawCount: count,
    rawType: Array.isArray(data) ? "array" : isRecord(data) ? "object" : typeof data,
    reason: error,
    sampleKeys: sampleKeys(data),
    sampleTitles: sampleTitles(data),
    status: responseStatus ?? "failed",
  };
}

export async function runCryptoRankDebug({
  apiKey,
  coingeckoId,
  slug,
  symbol,
}: {
  apiKey?: string | null;
  coingeckoId?: string | null;
  slug?: string | null;
  symbol?: string | null;
}) {
  const mapping = resolveCryptoRankToken({
    coingeckoId,
    slug,
    symbol,
  });

  if (!apiKey) {
    return {
      attempts: [] as CryptoRankAttemptResult[],
      bestAttempt: null,
      mapping,
      recommendation: "CRYPTORANK_API_KEY не настроен.",
    };
  }

  const attemptsConfig: CryptoRankAttemptConfig[] = [
    {
      authMode: "X-Api-Key" as const,
      endpoint: "https://api.cryptorank.io/v2/currencies/unlocks",
      name: "current v2 currencies unlocks / symbols",
      params: {
        symbols: mapping.symbol,
      },
    },
    {
      authMode: "api_key query" as const,
      endpoint: "https://api.cryptorank.io/v2/currencies/unlocks",
      name: "current v2 currencies unlocks / query key",
      params: {
        symbols: mapping.symbol,
      },
    },
    {
      authMode: "Authorization: Bearer" as const,
      endpoint: "https://api.cryptorank.io/v2/currencies/unlocks",
      name: "current v2 currencies unlocks / bearer",
      params: {
        symbols: mapping.symbol,
      },
    },
    {
      authMode: "X-Api-Key" as const,
      endpoint: "https://api.cryptorank.io/v2/currencies/token-unlock",
      name: "v2 currencies token-unlock / symbol",
      params: {
        symbol: mapping.symbol,
      },
    },
    {
      authMode: "X-Api-Key" as const,
      endpoint: "https://api.cryptorank.io/v2/currencies/token-unlocks",
      name: "v2 currencies token-unlocks / slug",
      params: {
        slug: mapping.cryptoRankSlug,
      },
    },
    {
      authMode: "X-Api-Key" as const,
      endpoint: "https://api.cryptorank.io/v2/currencies/vesting",
      name: "v2 currencies vesting / key",
      params: {
        key: mapping.cryptoRankSlug,
      },
    },
    {
      authMode: "X-Api-Key" as const,
      endpoint: "https://api.cryptorank.io/v2/token-unlocks",
      name: "v2 token-unlocks / currency",
      params: {
        currency: mapping.symbol,
      },
    },
    {
      authMode: "X-Api-Key" as const,
      endpoint: "https://api.cryptorank.io/v2/token-unlock",
      name: "v2 token-unlock / coinKey",
      params: {
        coinKey: mapping.cryptoRankSlug,
      },
    },
    {
      authMode: "X-Api-Key" as const,
      endpoint: "https://api.cryptorank.io/v1/currencies/token-unlocks",
      name: "v1 currencies token-unlocks / symbol",
      params: {
        symbol: mapping.symbol,
      },
    },
    {
      authMode: "X-Api-Key" as const,
      endpoint: "https://api.cryptorank.io/v1/currencies/token-unlock",
      name: "v1 currencies token-unlock / id",
      params: {
        id: mapping.cryptoRankSlug,
      },
    },
  ];
  const attempts: CryptoRankAttemptResult[] = [];

  for (const attempt of attemptsConfig) {
    const result = await runCryptoRankAttempt({
      apiKey,
      ...attempt,
    });
    attempts.push(result);

    if (result.ok && result.rawCount > 0) {
      break;
    }
  }

  const bestAttempt =
    attempts.find((attempt) => attempt.ok && attempt.rawCount > 0) ??
    attempts.find((attempt) => attempt.ok) ??
    attempts[0] ??
    null;
  let recommendation =
    "CryptoRank не вернул unlock-данные. В checklist будет использован fallback.";

  if (attempts.some((attempt) => attempt.rawCount > 0)) {
    recommendation =
      "Данные пришли, нужно адаптировать parser под фактический response shape.";
  } else if (attempts.every((attempt) => attempt.status === 400)) {
    recommendation =
      "CryptoRank вернул 400. Вероятно, endpoint или параметры запроса не совпадают с документацией, либо endpoint недоступен на текущем плане.";
  } else if (attempts.some((attempt) => attempt.status === 401 || attempt.status === 403)) {
    recommendation =
      "Проблема доступа: ключ неверный или endpoint недоступен на текущем плане.";
  }

  return {
    attempts,
    bestAttempt,
    mapping,
    recommendation,
  };
}

export function unlockRiskLevel(data: TokenUnlockData) {
  return unlockRiskFromData(data);
}
