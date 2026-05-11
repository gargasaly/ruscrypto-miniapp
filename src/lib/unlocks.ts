import type { TokenCard } from "@/lib/content";

export type UnlockConfidence = "high" | "medium" | "low" | "unknown";
export type UnlockProviderStatus =
  | "base-asset"
  | "cache-hit"
  | "calendar-hint"
  | "failed"
  | "manual-check"
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
  nextUnlockAmount: number | null;
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
};

export type CryptoRankTokenMapping = {
  coingeckoId: string;
  cryptoRankSlug: string;
  symbol: string;
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
    symbol: "AAVE",
  },
  AVAX: {
    coingeckoId: "avalanche-2",
    cryptoRankSlug: "avalanche",
    symbol: "AVAX",
  },
  BNB: {
    coingeckoId: "binancecoin",
    cryptoRankSlug: "bnb",
    symbol: "BNB",
  },
  BTC: {
    coingeckoId: "bitcoin",
    cryptoRankSlug: "bitcoin",
    symbol: "BTC",
  },
  ENA: {
    coingeckoId: "ethena",
    cryptoRankSlug: "ethena",
    symbol: "ENA",
  },
  ETH: {
    coingeckoId: "ethereum",
    cryptoRankSlug: "ethereum",
    symbol: "ETH",
  },
  HYPE: {
    coingeckoId: "hyperliquid",
    cryptoRankSlug: "hyperliquid",
    symbol: "HYPE",
  },
  JUP: {
    coingeckoId: "jupiter-exchange-solana",
    cryptoRankSlug: "jupiter",
    symbol: "JUP",
  },
  LINK: {
    coingeckoId: "chainlink",
    cryptoRankSlug: "chainlink",
    symbol: "LINK",
  },
  NEAR: {
    coingeckoId: "near",
    cryptoRankSlug: "near-protocol",
    symbol: "NEAR",
  },
  ONDO: {
    coingeckoId: "ondo-finance",
    cryptoRankSlug: "ondo-finance",
    symbol: "ONDO",
  },
  PENDLE: {
    coingeckoId: "pendle",
    cryptoRankSlug: "pendle",
    symbol: "PENDLE",
  },
  RENDER: {
    coingeckoId: "render-token",
    cryptoRankSlug: "render-token",
    symbol: "RENDER",
  },
  SOL: {
    coingeckoId: "solana",
    cryptoRankSlug: "solana",
    symbol: "SOL",
  },
  SUI: {
    coingeckoId: "sui",
    cryptoRankSlug: "sui",
    symbol: "SUI",
  },
  TAO: {
    coingeckoId: "bittensor",
    cryptoRankSlug: "bittensor",
    symbol: "TAO",
  },
  TON: {
    coingeckoId: "the-open-network",
    cryptoRankSlug: "toncoin",
    symbol: "TON",
  },
  UNI: {
    coingeckoId: "uniswap",
    cryptoRankSlug: "uniswap",
    symbol: "UNI",
  },
  XRP: {
    coingeckoId: "ripple",
    cryptoRankSlug: "ripple",
    symbol: "XRP",
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
      symbol: normalizedSymbol ?? "TOKEN",
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
  input: Omit<TokenUnlockData, "updatedAt" | "warnings"> & {
    warnings?: string[];
  },
): TokenUnlockData {
  return {
    ...input,
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
    providerStatus: "base-asset",
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
  const unlockedPercent = numberFrom(
    row.unlockedPercent ?? row.unlocked_percent ?? row.unlocked,
  );
  const lockedPercent = numberFrom(row.lockedPercent ?? row.locked_percent ?? row.locked);

  if (
    nextUnlockDate === null &&
    nextUnlockPercent === null &&
    nextUnlockMarketCapPercent === null &&
    nextUnlockAmount === null &&
    unlockedPercent === null &&
    lockedPercent === null
  ) {
    return null;
  }

  return makeUnlockData({
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
    nextUnlockDate,
    nextUnlockMarketCapPercent,
    nextUnlockPercent,
    provider: "CryptoRank",
    providerStatus: "ok",
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
        : "CoinGecko supply fallback",
    providerStatus:
      circulatingSupplyPercent === null ? "manual-check" : "supply-only",
    sourceUrl: null,
    unlockedPercent: null,
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

function ttlForUnlockData(data: TokenUnlockData) {
  if (data.confidence === "high") {
    return exactUnlockTtlMs;
  }

  if (data.confidence === "medium") {
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
        providerStatus: "cache-hit" as const,
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

export async function getTokenUnlockData({
  coinMarketCalApiKey,
  cryptoRankApiKey,
  details,
  marketRecord,
  token,
}: {
  coinMarketCalApiKey?: string | null;
  cryptoRankApiKey?: string | null;
  details: UnknownRecord | null;
  marketRecord: UnknownRecord | null;
  token: Pick<TokenCard, "coingeckoId" | "ticker">;
}): Promise<UnlockProviderResult> {
  const mapping = resolveCryptoRankToken({
    coingeckoId: token.coingeckoId,
    symbol: token.ticker,
  });
  const cached = cachedUnlock(mapping.symbol);

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
