import { btcLevelFallback, type BtcLevelResponse } from "@/lib/btcLevel";
import { btcRiskFallback, type RiskEvent } from "@/lib/riskCalendar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type HomeActionStatus = "Можно покупать" | "Покупать частями" | "Не лезть";
type HomeSnapshotCacheStatus = "fallback" | "hit" | "last-good" | "miss" | "refresh-ok";
type HomeSnapshotBufferStatus = "fresh" | "stale" | "lastGood" | "refreshed" | "missing";
type HomeSnapshotPriceSource = "raw" | "snapshot" | "btcLevel" | "lastGood" | "missing";
type UnknownRecord = Record<string, unknown>;

type HomeSnapshotAction = {
  reason: string;
  status: HomeActionStatus;
  tone: "green" | "red" | "yellow";
  whatToWait: string;
};

type HomeSnapshotCacheMeta = {
  servedAt: string;
  generatedAt: string;
  updatedAt: string;
  bufferStatus: HomeSnapshotBufferStatus;
  ageSeconds: number | null;
  freshTtlSeconds: number;
  staleTtlSeconds: number;
  lastGoodTtlSeconds: number;
  source: "fallback" | "refresh" | "server-cache" | "last-good";
};

type HomeSnapshotPriceMeta = {
  hasPrice: boolean;
  priceSource: HomeSnapshotPriceSource;
  hasChange24h: boolean;
  changeSource: Exclude<HomeSnapshotPriceSource, "btcLevel">;
};

type HomeSnapshotResponse = {
  action: HomeSnapshotAction;
  actionReason: string;
  btc: {
    change24h: number | null;
    price: number | null;
    symbol: "BTC";
  };
  btcLevel: BtcLevelResponse;
  btcChange24h: number | null;
  btcPrice: number | null;
  cacheMeta: HomeSnapshotCacheMeta;
  cacheStatus: HomeSnapshotCacheStatus;
  mainRisk: RiskEvent;
  ok: boolean;
  priceMeta: HomeSnapshotPriceMeta;
  sources?: Record<string, string>;
  updatedAt: string;
  whatToWait: string;
};

type HomeSnapshotCacheEntry = {
  payload: Omit<HomeSnapshotResponse, "cacheMeta" | "cacheStatus">;
  updatedAt: number;
};

const HOME_MAJOR_RESISTANCE = {
  center: 81_000,
  high: 82_000,
  label: "$80,000–82,000",
  low: 80_000,
};
const HOME_BUY_REASON =
  "Крупных BTC-рисков сейчас нет. Вход допустим, лучше частями и без плечей.";
const HOME_PARTIAL_BUY_REASON =
  "BTC без сильного перегрева и без крупных событий риска, но рядом с сильным сопротивлением $80,000–82,000. Вход возможен небольшой частью, без полной загрузки и без плечей.";
const HOME_NO_ENTRY_REASON = "Риск входа повышен. Лучше дождаться спокойной зоны.";
const HOME_WAITING_HINT =
  "Следить за зоной $80,000–82,000 и не заходить всей суммой перед сопротивлением.";
const HOME_BTC_LEVEL_EXPLANATION =
  "Это сильная зона, где рынок может начать фиксировать прибыль. Пока BTC рядом с ней, безопаснее входить частями.";
const HOME_SNAPSHOT_FRESH_TTL_SECONDS = 4 * 60 * 60;
const HOME_SNAPSHOT_STALE_TTL_SECONDS = 12 * 60 * 60;
const HOME_SNAPSHOT_LAST_GOOD_TTL_SECONDS = 24 * 60 * 60;
const HOME_SNAPSHOT_TTL_MS = HOME_SNAPSHOT_FRESH_TTL_SECONDS * 1000;
const HOME_SNAPSHOT_LAST_GOOD_TTL_MS = HOME_SNAPSHOT_LAST_GOOD_TTL_SECONDS * 1000;
const HOME_SNAPSHOT_CACHE_HEADERS =
  "public, s-maxage=14400, stale-while-revalidate=43200";

let homeSnapshotCache: HomeSnapshotCacheEntry | null = null;
let lastGoodHomeSnapshotCache: HomeSnapshotCacheEntry | null = null;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberOrNull(value: unknown) {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(/,/g, ""))
        : NaN;

  return Number.isFinite(number) ? number : null;
}

function isInformationalMediaRisk(risk: RiskEvent) {
  const text = [
    risk.title,
    risk.description,
    risk.source,
    risk.whatIsIt,
    risk.marketRelevance,
    risk.marketRelevanceLabel,
    risk.category,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const hasMediaSignal =
    /hackernoon|media|publication|content|article|community|ama\b|x space|twitter space|webinar|meetup|generic conference|\bconference\b/.test(
      text,
    );
  const hasHardDriver =
    /fed|fomc|cpi|ppi|pce|nfp|unemployment|etf|sec\b|court|lawsuit|regulat|large token unlock|major network upgrade|geopolitical|oil|risk-off/.test(
      text,
    );

  return hasMediaSignal && !hasHardDriver;
}

function isHomeEligibleBtcRisk(risk: RiskEvent) {
  if (risk.impact === "low" || isInformationalMediaRisk(risk)) {
    return false;
  }

  return (
    risk.category === "macro" ||
    risk.marketRelevance === "market-wide" ||
    risk.affectedAssets.includes("BTC")
  );
}

function mainRiskForHome(risk: RiskEvent) {
  return isHomeEligibleBtcRisk(risk) ? risk : btcRiskFallback;
}

function isNearMajorResistance(price: number | null) {
  if (price === null) {
    return true;
  }

  return price >= 77_000 && price <= HOME_MAJOR_RESISTANCE.high;
}

function toHomeBtcLevel(rawLevel: BtcLevelResponse, btcPrice: number | null): BtcLevelResponse {
  const currentPrice = rawLevel.currentPrice ?? btcPrice;
  const distancePercent =
    currentPrice && currentPrice > 0
      ? ((HOME_MAJOR_RESISTANCE.low - currentPrice) / currentPrice) * 100
      : null;

  return {
    ...rawLevel,
    aboveScenario:
      "Закрепление выше $82,000 покажет, что покупатели готовы пройти сильное сопротивление.",
    bearishScenario:
      "Пока BTC ниже $80,000–82,000, безопаснее входить частями и не перегружать позицию.",
    belowScenario:
      "Пока BTC ниже $80,000–82,000, безопаснее входить частями и не перегружать позицию.",
    bullishScenario:
      "Закрепление выше $82,000 покажет, что покупатели готовы пройти сильное сопротивление.",
    confidence: rawLevel.confidence === "low" ? "medium" : rawLevel.confidence,
    currentPrice,
    distancePercent: distancePercent === null ? null : Math.abs(distancePercent),
    explanation: HOME_BTC_LEVEL_EXPLANATION,
    keyLevel: HOME_MAJOR_RESISTANCE.center,
    keyLevelRange: HOME_MAJOR_RESISTANCE.label,
    levelLabel: HOME_MAJOR_RESISTANCE.label,
    nextResistance: null,
    type: "major_resistance",
  };
}

function readRecordNumber(record: UnknownRecord | null, keys: string[]) {
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const number = numberOrNull(record[key]);

    if (number !== null) {
      return number;
    }
  }

  return null;
}

function readNestedRecord(record: UnknownRecord | null, key: string) {
  const value = record?.[key];

  return isRecord(value) ? value : null;
}

function extractRawBtcFromMarket(payload: unknown) {
  if (!isRecord(payload)) {
    return {
      change24h: null,
      price: null,
    };
  }

  const coins = Array.isArray(payload.coins) ? payload.coins.filter(isRecord) : [];
  const bitcoin =
    coins.find((coin) => coin.id === "bitcoin") ??
    coins.find((coin) => String(coin.symbol ?? "").toUpperCase() === "BTC") ??
    null;

  if (!bitcoin) {
    return {
      change24h: null,
      price: null,
    };
  }

  return {
    change24h: readRecordNumber(bitcoin, [
      "price_change_percentage_24h",
      "priceChange24h",
      "change24h",
    ]),
    price: readRecordNumber(bitcoin, ["current_price", "currentPrice", "price"]),
  };
}

function extractSnapshotBtcFromMarket(payload: unknown) {
  if (!isRecord(payload)) {
    return {
      change24h: null,
      price: null,
    };
  }

  const btcRecord =
    readNestedRecord(payload, "btc") ??
    readNestedRecord(readNestedRecord(payload, "market"), "btc");

  return {
    change24h:
      readRecordNumber(btcRecord, ["change24h", "priceChange24h", "price_change_percentage_24h"]) ??
      readRecordNumber(payload, ["btcChange24h"]),
    price:
      readRecordNumber(btcRecord, ["price", "currentPrice", "current_price"]) ??
      readRecordNumber(payload, ["btcPrice"]),
  };
}

function resolveBtcMarketValues({
  btcLevel,
  marketPayload,
}: {
  btcLevel: BtcLevelResponse;
  marketPayload: unknown;
}) {
  const raw = extractRawBtcFromMarket(marketPayload);
  const snapshot = extractSnapshotBtcFromMarket(marketPayload);
  const lastGood = lastGoodHomeSnapshotCache?.payload ?? null;
  const price =
    raw.price ??
    snapshot.price ??
    lastGood?.btc?.price ??
    lastGood?.btcPrice ??
    btcLevel.currentPrice ??
    null;
  const priceSource: HomeSnapshotPriceSource =
    raw.price !== null
      ? "raw"
      : snapshot.price !== null
        ? "snapshot"
        : lastGood?.btc?.price !== null && lastGood?.btc?.price !== undefined
          ? "lastGood"
          : lastGood?.btcPrice !== null && lastGood?.btcPrice !== undefined
            ? "lastGood"
            : btcLevel.currentPrice !== null
              ? "btcLevel"
              : "missing";
  const change24h =
    raw.change24h ??
    snapshot.change24h ??
    lastGood?.btc?.change24h ??
    lastGood?.btcChange24h ??
    null;
  const changeSource: HomeSnapshotPriceMeta["changeSource"] =
    raw.change24h !== null
      ? "raw"
      : snapshot.change24h !== null
        ? "snapshot"
        : lastGood?.btc?.change24h !== null && lastGood?.btc?.change24h !== undefined
          ? "lastGood"
          : lastGood?.btcChange24h !== null && lastGood?.btcChange24h !== undefined
            ? "lastGood"
            : "missing";

  return {
    btc: {
      change24h,
      price,
      symbol: "BTC" as const,
    },
    btcChange24h: change24h,
    btcPrice: price,
    priceMeta: {
      hasChange24h: change24h !== null,
      changeSource,
      hasPrice: price !== null,
      priceSource,
    },
  };
}

function buildHomeAction(input: {
  btcLevel: BtcLevelResponse;
  mainRisk: RiskEvent;
}): HomeSnapshotAction {
  const highBtcRisk = input.mainRisk.impact === "high" && isHomeEligibleBtcRisk(input.mainRisk);

  if (highBtcRisk) {
    return {
      reason: `${HOME_NO_ENTRY_REASON} Главный риск: ${input.mainRisk.title}.`,
      status: "Не лезть",
      tone: "red",
      whatToWait: HOME_WAITING_HINT,
    };
  }

  if (isNearMajorResistance(input.btcLevel.currentPrice)) {
    return {
      reason: HOME_PARTIAL_BUY_REASON,
      status: "Покупать частями",
      tone: "yellow",
      whatToWait: HOME_WAITING_HINT,
    };
  }

  return {
    reason: HOME_BUY_REASON,
    status: "Можно покупать",
    tone: "green",
    whatToWait: "Следить за BTC и не использовать плечи.",
  };
}

function getCacheAgeSeconds(entry: HomeSnapshotCacheEntry | null) {
  return entry ? Math.round((Date.now() - entry.updatedAt) / 1000) : null;
}

function buildCacheMeta({
  bufferStatus,
  entry,
  source,
}: {
  bufferStatus: HomeSnapshotBufferStatus;
  entry: HomeSnapshotCacheEntry | null;
  source: HomeSnapshotCacheMeta["source"];
}): HomeSnapshotCacheMeta {
  const servedAt = new Date().toISOString();
  const updatedAt = entry?.payload.updatedAt ?? servedAt;

  return {
    servedAt,
    generatedAt: updatedAt,
    updatedAt,
    bufferStatus,
    ageSeconds: getCacheAgeSeconds(entry),
    freshTtlSeconds: HOME_SNAPSHOT_FRESH_TTL_SECONDS,
    staleTtlSeconds: HOME_SNAPSHOT_STALE_TTL_SECONDS,
    lastGoodTtlSeconds: HOME_SNAPSHOT_LAST_GOOD_TTL_SECONDS,
    source,
  };
}

function withCacheMeta(
  entry: HomeSnapshotCacheEntry,
  cacheStatus: HomeSnapshotCacheStatus,
  bufferStatus: HomeSnapshotBufferStatus,
  source: HomeSnapshotCacheMeta["source"],
): HomeSnapshotResponse {
  const payload = entry.payload;
  const btcPrice =
    numberOrNull(payload.btcPrice) ??
    numberOrNull(payload.btc?.price) ??
    numberOrNull(payload.btcLevel.currentPrice);
  const btcChange24h = numberOrNull(payload.btcChange24h) ?? numberOrNull(payload.btc?.change24h);
  const priceMeta =
    payload.priceMeta ??
    ({
      changeSource: btcChange24h === null ? "missing" : "snapshot",
      hasChange24h: btcChange24h !== null,
      hasPrice: btcPrice !== null,
      priceSource: btcPrice === null ? "missing" : "snapshot",
    } satisfies HomeSnapshotPriceMeta);

  return {
    ...payload,
    btc: {
      change24h: btcChange24h,
      price: btcPrice,
      symbol: "BTC",
    },
    btcChange24h,
    btcPrice,
    cacheMeta: buildCacheMeta({
      bufferStatus,
      entry,
      source,
    }),
    cacheStatus,
    priceMeta,
  };
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`http-${response.status}`);
  }

  return (await response.json()) as T;
}

async function buildSnapshot(origin: string, debugMode: boolean) {
  const [btcLevelResult, risksResult, marketResult] = await Promise.allSettled([
    fetchJson<BtcLevelResponse>(`${origin}/api/btc-level${debugMode ? "?debug=1" : ""}`),
    fetchJson<{ mainRisk?: RiskEvent }>(`${origin}/api/risks${debugMode ? "?debug=1" : ""}`),
    fetchJson<{
      coins?: Array<{
        current_price?: number;
        id?: string;
        price_change_percentage_24h?: number;
      }>;
    }>(`${origin}/api/market`),
  ]);

  const rawBtcLevel =
    btcLevelResult.status === "fulfilled" ? btcLevelResult.value : btcLevelFallback;
  const rawMainRisk =
    risksResult.status === "fulfilled" && risksResult.value.mainRisk
      ? risksResult.value.mainRisk
      : btcRiskFallback;
  const marketPayload = marketResult.status === "fulfilled" ? marketResult.value : null;
  const resolvedBtc = resolveBtcMarketValues({
    btcLevel: rawBtcLevel,
    marketPayload,
  });
  const btcLevel = toHomeBtcLevel(rawBtcLevel, resolvedBtc.btcPrice);
  const mainRisk = mainRiskForHome(rawMainRisk);
  const action = buildHomeAction({
    btcLevel,
    mainRisk,
  });

  return {
    action,
    actionReason: action.reason,
    btc: resolvedBtc.btc,
    btcLevel,
    btcChange24h: resolvedBtc.btcChange24h,
    btcPrice: resolvedBtc.btcPrice,
    mainRisk,
    ok: true,
    priceMeta: resolvedBtc.priceMeta,
    sources:
      debugMode && process.env.NODE_ENV !== "production"
        ? {
            btcLevel: btcLevelResult.status,
            market: marketResult.status,
            rawMainRisk: rawMainRisk.title,
            risks: risksResult.status,
          }
        : undefined,
    updatedAt: new Date().toISOString(),
    whatToWait: action.whatToWait,
  } satisfies HomeSnapshotCacheEntry["payload"];
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const debugMode = url.searchParams.get("debug") === "1";
  const cacheTestMode = url.searchParams.has("cachetest");
  const bypassCache = debugMode || cacheTestMode;
  const now = Date.now();

  if (!bypassCache && homeSnapshotCache && now - homeSnapshotCache.updatedAt < HOME_SNAPSHOT_TTL_MS) {
    return Response.json(withCacheMeta(homeSnapshotCache, "hit", "fresh", "server-cache"), {
      headers: {
        "Cache-Control": HOME_SNAPSHOT_CACHE_HEADERS,
      },
    });
  }

  try {
    const payload = await buildSnapshot(url.origin, debugMode);
    const entry = {
      payload,
      updatedAt: now,
    };

    homeSnapshotCache = entry;
    lastGoodHomeSnapshotCache = entry;

    return Response.json(withCacheMeta(entry, "refresh-ok", "refreshed", "refresh"), {
      headers: {
        "Cache-Control": bypassCache ? "no-store" : HOME_SNAPSHOT_CACHE_HEADERS,
      },
    });
  } catch (error) {
    if (
      lastGoodHomeSnapshotCache &&
      now - lastGoodHomeSnapshotCache.updatedAt < HOME_SNAPSHOT_LAST_GOOD_TTL_MS
    ) {
      const lastGoodAgeMs = now - lastGoodHomeSnapshotCache.updatedAt;
      const bufferStatus: HomeSnapshotBufferStatus =
        lastGoodAgeMs < (HOME_SNAPSHOT_FRESH_TTL_SECONDS + HOME_SNAPSHOT_STALE_TTL_SECONDS) * 1000
          ? "stale"
          : "lastGood";

      return Response.json(
        {
          ...withCacheMeta(lastGoodHomeSnapshotCache, "last-good", bufferStatus, "last-good"),
          sources:
            debugMode && process.env.NODE_ENV !== "production"
              ? {
                  error: error instanceof Error ? error.message : "snapshot-refresh-failed",
                  lastGoodAgeSeconds: String(getCacheAgeSeconds(lastGoodHomeSnapshotCache) ?? ""),
                }
              : undefined,
        },
        {
          headers: {
            "Cache-Control": bypassCache ? "no-store" : HOME_SNAPSHOT_CACHE_HEADERS,
          },
        },
      );
    }

    const btcLevel = toHomeBtcLevel(btcLevelFallback, null);
    const mainRisk = btcRiskFallback;
    const action = buildHomeAction({
      btcLevel,
      mainRisk,
    });
    const payload = {
      action,
      actionReason: action.reason,
      btc: {
        change24h: null,
        price: null,
        symbol: "BTC" as const,
      },
      btcLevel,
      btcChange24h: null,
      btcPrice: null,
      mainRisk,
      ok: true,
      priceMeta: {
        changeSource: "missing" as const,
        hasChange24h: false,
        hasPrice: false,
        priceSource: "missing" as const,
      },
      sources:
        debugMode && process.env.NODE_ENV !== "production"
          ? {
              error: error instanceof Error ? error.message : "snapshot-refresh-failed",
            }
          : undefined,
      updatedAt: new Date().toISOString(),
      whatToWait: action.whatToWait,
    } satisfies HomeSnapshotCacheEntry["payload"];
    const fallbackEntry = {
      payload,
      updatedAt: now,
    };

    return Response.json(withCacheMeta(fallbackEntry, "fallback", "missing", "fallback"), {
      headers: {
        "Cache-Control": bypassCache ? "no-store" : HOME_SNAPSHOT_CACHE_HEADERS,
      },
    });
  }
}
