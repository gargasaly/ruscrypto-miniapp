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
  | "partial"
  | "skipped"
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
  comparedSources: string[];
  conflicts: string[];
  nextUnlockAmount: number | null;
  nextUnlockAmountUsd: number | null;
  nextUnlockDate: string | null;
  nextUnlockMarketCapPercent: number | null;
  nextUnlockPercent: number | null;
  provider: string;
  providerStatus: UnlockProviderStatus;
  rawTitle?: string | null;
  sourceUrl: string | null;
  unlockedPercent: number | null;
  updatedAt: string;
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
  cryptoRankSlug: string;
  messariSlug: string;
  mobulaSymbol: string;
  symbol: string;
  tokenomistSlug: string;
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

const exactUnlockTtlMs = 12 * 60 * 60_000;
const calendarHintTtlMs = 6 * 60 * 60_000;
const fallbackUnlockTtlMs = 60 * 60_000;
const lastGoodUnlockTtlMs = 24 * 60 * 60_000;
const unlockCache = new Map<string, UnlockCacheEntry>();

export const cryptoRankTokenMap: Record<string, CryptoRankTokenMapping> = {
  AAVE: {
    coingeckoId: "aave",
    cryptoRankSlug: "aave",
    messariSlug: "aave",
    mobulaSymbol: "AAVE",
    symbol: "AAVE",
    tokenomistSlug: "aave",
  },
  AVAX: {
    coingeckoId: "avalanche-2",
    cryptoRankSlug: "avalanche",
    messariSlug: "avalanche",
    mobulaSymbol: "AVAX",
    symbol: "AVAX",
    tokenomistSlug: "avalanche",
  },
  BNB: {
    coingeckoId: "binancecoin",
    cryptoRankSlug: "bnb",
    messariSlug: "bnb",
    mobulaSymbol: "BNB",
    symbol: "BNB",
    tokenomistSlug: "bnb",
  },
  BTC: {
    coingeckoId: "bitcoin",
    cryptoRankSlug: "bitcoin",
    messariSlug: "bitcoin",
    mobulaSymbol: "BTC",
    symbol: "BTC",
    tokenomistSlug: "bitcoin",
  },
  ENA: {
    coingeckoId: "ethena",
    cryptoRankSlug: "ethena",
    messariSlug: "ethena",
    mobulaSymbol: "ENA",
    symbol: "ENA",
    tokenomistSlug: "ethena",
  },
  ETH: {
    coingeckoId: "ethereum",
    cryptoRankSlug: "ethereum",
    messariSlug: "ethereum",
    mobulaSymbol: "ETH",
    symbol: "ETH",
    tokenomistSlug: "ethereum",
  },
  HYPE: {
    coingeckoId: "hyperliquid",
    cryptoRankSlug: "hyperliquid",
    messariSlug: "hyperliquid",
    mobulaSymbol: "HYPE",
    symbol: "HYPE",
    tokenomistSlug: "hyperliquid",
  },
  JUP: {
    coingeckoId: "jupiter-exchange-solana",
    cryptoRankSlug: "jupiter",
    messariSlug: "jupiter",
    mobulaSymbol: "JUP",
    symbol: "JUP",
    tokenomistSlug: "jupiter",
  },
  LINK: {
    coingeckoId: "chainlink",
    cryptoRankSlug: "chainlink",
    messariSlug: "chainlink",
    mobulaSymbol: "LINK",
    symbol: "LINK",
    tokenomistSlug: "chainlink",
  },
  NEAR: {
    coingeckoId: "near",
    cryptoRankSlug: "near-protocol",
    messariSlug: "near-protocol",
    mobulaSymbol: "NEAR",
    symbol: "NEAR",
    tokenomistSlug: "near-protocol",
  },
  ONDO: {
    coingeckoId: "ondo-finance",
    cryptoRankSlug: "ondo-finance",
    messariSlug: "ondo-finance",
    mobulaSymbol: "ONDO",
    symbol: "ONDO",
    tokenomistSlug: "ondo-finance",
  },
  PENDLE: {
    coingeckoId: "pendle",
    cryptoRankSlug: "pendle",
    messariSlug: "pendle",
    mobulaSymbol: "PENDLE",
    symbol: "PENDLE",
    tokenomistSlug: "pendle",
  },
  RENDER: {
    coingeckoId: "render-token",
    cryptoRankSlug: "render-token",
    messariSlug: "render",
    mobulaSymbol: "RENDER",
    symbol: "RENDER",
    tokenomistSlug: "render-token",
  },
  SOL: {
    coingeckoId: "solana",
    cryptoRankSlug: "solana",
    messariSlug: "solana",
    mobulaSymbol: "SOL",
    symbol: "SOL",
    tokenomistSlug: "solana",
  },
  SUI: {
    coingeckoId: "sui",
    cryptoRankSlug: "sui",
    messariSlug: "sui",
    mobulaSymbol: "SUI",
    symbol: "SUI",
    tokenomistSlug: "sui",
  },
  TAO: {
    coingeckoId: "bittensor",
    cryptoRankSlug: "bittensor",
    messariSlug: "bittensor",
    mobulaSymbol: "TAO",
    symbol: "TAO",
    tokenomistSlug: "bittensor",
  },
  TON: {
    coingeckoId: "the-open-network",
    cryptoRankSlug: "toncoin",
    messariSlug: "toncoin",
    mobulaSymbol: "TON",
    symbol: "TON",
    tokenomistSlug: "toncoin",
  },
  UNI: {
    coingeckoId: "uniswap",
    cryptoRankSlug: "uniswap",
    messariSlug: "uniswap",
    mobulaSymbol: "UNI",
    symbol: "UNI",
    tokenomistSlug: "uniswap",
  },
  XRP: {
    coingeckoId: "ripple",
    cryptoRankSlug: "ripple",
    messariSlug: "xrp",
    mobulaSymbol: "XRP",
    symbol: "XRP",
    tokenomistSlug: "ripple",
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
    "unlocks",
    "vesting",
    "allocations",
    "events",
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
    | "allocationName"
    | "comparedSources"
    | "conflicts"
    | "nextUnlockAmountUsd"
    | "updatedAt"
    | "warnings"
  > &
    Partial<
      Pick<
        TokenUnlockData,
        "allocationName" | "comparedSources" | "conflicts" | "nextUnlockAmountUsd"
      >
    > & {
      warnings?: string[];
    },
): TokenUnlockData {
  return {
    ...input,
    allocationName: input.allocationName ?? null,
    comparedSources: input.comparedSources ?? [],
    conflicts: input.conflicts ?? [],
    nextUnlockAmountUsd: input.nextUnlockAmountUsd ?? null,
    updatedAt: new Date().toISOString(),
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
) {
  if (!apiKey) {
    return {
      data: null,
      source: sourceDebug({
        enabled: false,
        name: "CryptoRank unlocks",
        rawCount: 0,
        reason: "no-api-key",
        status: "skipped",
      }),
      summary: {
        name: "CryptoRank unlocks",
        rawCount: 0,
        reason: "no-api-key",
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
  const provider = "Mobula";

  if (!apiKey) {
    return {
      data: null,
      source: sourceDebug({
        enabled: false,
        name: "Mobula unlocks",
        rawCount: 0,
        reason: "no-api-key",
        status: "skipped",
      }),
      summary: {
        name: "Mobula unlocks",
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
  const parsed = error
    ? null
    : parseGenericUnlockPayload({
        mapping,
        payload: data,
        provider,
        sourceUrl: `https://mobula.io/asset/${mapping.mobulaSymbol.toLowerCase()}`,
      });
  const count = rawCount(data);

  return {
    data: parsed,
    source: sourceDebug({
      enabled: true,
      fieldsReceived: sampleKeys(data),
      name: "Mobula unlocks",
      rawCount: count,
      reason: error ?? (parsed ? undefined : "no-unlock-data"),
      sample: { keys: sampleKeys(data) },
      sampleTitles: sampleTitles(data),
      status: parsed ? "ok" : "failed",
    }),
    summary: {
      name: "Mobula unlocks",
      rawCount: count,
      reason: error ?? (parsed ? undefined : "no-unlock-data"),
      status: parsed ? "ok" : "failed",
    },
  };
}

async function fetchMessariUnlocks(mapping: CryptoRankTokenMapping, apiKey?: string | null) {
  const provider = "Messari";

  if (!apiKey) {
    return {
      data: null,
      source: sourceDebug({
        enabled: false,
        name: "Messari unlocks",
        rawCount: 0,
        reason: "no-api-key",
        status: "skipped",
      }),
      summary: {
        name: "Messari unlocks",
        rawCount: 0,
        reason: "no-api-key",
        status: "skipped",
      },
    };
  }

  const url = new URL(`https://data.messari.io/api/v1/assets/${mapping.messariSlug}/profile`);
  const { data, error } = await fetchJson(url, {
    headers: {
      "x-messari-api-key": apiKey,
    },
  });
  const parsed = error
    ? null
    : parseGenericUnlockPayload({
        mapping,
        payload: data,
        provider,
        sourceUrl: `https://messari.io/project/${mapping.messariSlug}`,
      });
  const count = rawCount(data);

  return {
    data: parsed,
    source: sourceDebug({
      enabled: true,
      fieldsReceived: sampleKeys(data),
      name: "Messari unlocks",
      rawCount: count,
      reason: error ?? (parsed ? undefined : "no-unlock-data-or-plan"),
      sample: { keys: sampleKeys(data) },
      sampleTitles: sampleTitles(data),
      status: parsed ? "ok" : "failed",
    }),
    summary: {
      name: "Messari unlocks",
      rawCount: count,
      reason: error ?? (parsed ? undefined : "no-unlock-data-or-plan"),
      status: parsed ? "ok" : "failed",
    },
  };
}

async function fetchTokenomistUnlocks(mapping: CryptoRankTokenMapping, apiKey?: string | null) {
  const provider = "Tokenomist";

  if (!apiKey) {
    return {
      data: null,
      source: sourceDebug({
        enabled: false,
        name: "Tokenomist unlocks",
        rawCount: 0,
        reason: "no-api-key",
        status: "skipped",
      }),
      summary: {
        name: "Tokenomist unlocks",
        rawCount: 0,
        reason: "no-api-key",
        status: "skipped",
      },
    };
  }

  const url = new URL(`https://api.tokenomist.ai/v1/unlocks/${mapping.tokenomistSlug}`);
  const { data, error } = await fetchJson(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
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
  url.searchParams.set("dateRangeStart", dateKey(now));
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
  const circulatingSupplyPercent =
    circulating !== null && total !== null && total > 0
      ? (circulating / total) * 100
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

  if (unlocks.nextUnlockDate && unlocks.nextUnlockDate < today) {
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
  cryptoRankApiKey,
  details,
  forceRefresh = false,
  marketRecord,
  messariApiKey,
  mobulaApiKey,
  tokenomistApiKey,
  token,
}: {
  coinMarketCalApiKey?: string | null;
  cryptoRankApiKey?: string | null;
  details: UnknownRecord | null;
  forceRefresh?: boolean;
  marketRecord: UnknownRecord | null;
  messariApiKey?: string | null;
  mobulaApiKey?: string | null;
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
  cryptoRankApiKey,
  details,
  forceRefresh = false,
  marketRecord,
  messariApiKey,
  mobulaApiKey,
  tokenomistApiKey,
  token,
}: {
  coinMarketCalApiKey?: string | null;
  cryptoRankApiKey?: string | null;
  details: UnknownRecord | null;
  forceRefresh?: boolean;
  marketRecord: UnknownRecord | null;
  messariApiKey?: string | null;
  mobulaApiKey?: string | null;
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
    fetchMobulaUnlocks(mapping, mobulaApiKey),
    fetchMessariUnlocks(mapping, messariApiKey),
    fetchTokenomistUnlocks(mapping, tokenomistApiKey),
    fetchCryptoRankExactUnlocks(mapping, cryptoRankApiKey),
    findCoinMarketCalUnlockHint(mapping, coinMarketCalApiKey),
    Promise.resolve(supplyFallback({ details, mapping, marketRecord })),
  ];
  const providerNames = [
    "Mobula unlocks",
    "Messari unlocks",
    "Tokenomist unlocks",
    "CryptoRank unlocks",
    "CoinMarketCal unlock hint",
    "CoinGecko supply fallback",
  ];
  const settled = await Promise.allSettled(providerJobs);
  const providerResults = settled.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
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
  const sources = providerResults.map((result) => result.source);
  const attemptsSummary = providerResults.map((result) => result.summary);
  const exactCandidates = providerResults
    .map((result) => result.data)
    .filter(
      (data): data is TokenUnlockData =>
        Boolean(data) &&
        (data?.providerStatus === "exact" || data?.providerStatus === "partial"),
    )
    .map((data) => ({
      data,
      validation: validateUnlockData(data, mapping, marketCap),
    }))
    .filter(({ validation }) => validation.rejectedSources.length === 0);
  const exactOnly = exactCandidates.filter(({ data }) => data.providerStatus === "exact");
  const calendarHint = providerResults.find(
    (result) => result.data?.providerStatus === "calendar-hint",
  )?.data;
  const supply = providerResults.find((result) => result.data?.providerStatus === "supply-only")
    ?.data;
  const manual = providerResults.find((result) => result.data?.providerStatus === "manual-check")
    ?.data;
  let data = exactOnly[0]?.data ?? exactCandidates[0]?.data ?? calendarHint ?? supply ?? manual;

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

  const exactData = exactOnly.map(({ data: exactDataItem }) => exactDataItem);
  const crossSourceConflicts = compareExactUnlocks(exactData);

  if (exactData.length >= 2) {
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

  const validation = validateUnlockData(data, mapping, marketCap);
  data = {
    ...data,
    conflicts: [...new Set([...data.conflicts, ...validation.conflicts])],
    warnings: [...new Set([...data.warnings, ...validation.issues])],
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
