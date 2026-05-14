import { btcLevelFallback, type BtcLevelResponse } from "@/lib/btcLevel";
import { btcRiskFallback, type RiskEvent } from "@/lib/riskCalendar";
import { marketStatus } from "@/lib/marketStatus";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type HomeSnapshotAction = {
  reason: string;
  status: "Можно аккуратно изучать" | "Подождать" | "Не лезть";
  tone: "green" | "red" | "yellow";
  whatToWait: string;
};

type HomeSnapshotResponse = {
  action: HomeSnapshotAction;
  actionReason: string;
  btcLevel: BtcLevelResponse;
  btcPrice: number | null;
  cacheStatus: "fallback" | "hit" | "last-good" | "miss" | "refresh-ok";
  mainRisk: RiskEvent;
  ok: boolean;
  sources?: Record<string, string>;
  updatedAt: string;
  whatToWait: string;
};

type HomeSnapshotCacheEntry = {
  payload: HomeSnapshotResponse;
  updatedAt: number;
};

const HOME_SNAPSHOT_TTL_MS = 4 * 60 * 60_000;
const HOME_SNAPSHOT_LAST_GOOD_TTL_MS = 24 * 60 * 60_000;
const HOME_SNAPSHOT_CACHE_HEADERS =
  "public, s-maxage=14400, stale-while-revalidate=43200";
let homeSnapshotCache: HomeSnapshotCacheEntry | null = null;
let lastGoodHomeSnapshotCache: HomeSnapshotCacheEntry | null = null;

function isHighOrMediumBtcRisk(risk: RiskEvent) {
  if (risk.impact === "low") {
    return false;
  }

  return (
    risk.category === "macro" ||
    risk.marketRelevance === "market-wide" ||
    risk.affectedAssets.includes("BTC")
  );
}

function buildHomeAction(input: {
  btcLevel: BtcLevelResponse;
  mainRisk: RiskEvent;
}): HomeSnapshotAction {
  const levelRange = input.btcLevel.keyLevelRange || marketStatus.btcKeyLevel;
  const whatToWait = `Реакцию BTC у зоны ${levelRange}.`;
  const highBtcRisk = input.mainRisk.impact === "high" && isHighOrMediumBtcRisk(input.mainRisk);

  if (input.btcLevel.currentPrice === null) {
    return {
      reason: "Недостаточно данных для уверенного вывода.",
      status: "Подождать",
      tone: "yellow",
      whatToWait: "Обновление BTC-уровня и risk-календаря.",
    };
  }

  if (highBtcRisk) {
    return {
      reason: `Высокий риск: ${input.mainRisk.title}.`,
      status: "Не лезть",
      tone: "red",
      whatToWait,
    };
  }

  if (
    input.btcLevel.type === "resistance" &&
    input.btcLevel.distancePercent !== null &&
    input.btcLevel.distancePercent <= 2.5
  ) {
    return {
      reason: "BTC рядом с сопротивлением.",
      status: "Подождать",
      tone: "yellow",
      whatToWait,
    };
  }

  if (input.btcLevel.type === "decision-zone" || input.btcLevel.type === "pivot") {
    return {
      reason: "BTC внутри ключевой зоны.",
      status: "Подождать",
      tone: "yellow",
      whatToWait,
    };
  }

  if (input.btcLevel.type === "support" && input.btcLevel.dataQuality !== "fallback") {
    return {
      reason: "Рынок спокойнее, можно разбирать активы без спешки.",
      status: "Можно аккуратно изучать",
      tone: "green",
      whatToWait: `Удержание BTC выше зоны ${levelRange}.`,
    };
  }

  return {
    reason: "Пока рынок без уверенного направления.",
    status: "Подождать",
    tone: "yellow",
    whatToWait,
  };
}

function getCacheAgeMinutes(entry: HomeSnapshotCacheEntry | null) {
  return entry ? Math.round((Date.now() - entry.updatedAt) / 60_000) : null;
}

function withCacheStatus(
  entry: HomeSnapshotCacheEntry,
  cacheStatus: HomeSnapshotResponse["cacheStatus"],
) {
  return {
    ...entry.payload,
    cacheStatus,
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
    fetchJson<{ coins?: Array<{ id?: string; current_price?: number }> }>(`${origin}/api/market`),
  ]);

  const btcLevel =
    btcLevelResult.status === "fulfilled" ? btcLevelResult.value : btcLevelFallback;
  const mainRisk =
    risksResult.status === "fulfilled" && risksResult.value.mainRisk
      ? risksResult.value.mainRisk
      : btcRiskFallback;
  const btcPrice =
    marketResult.status === "fulfilled"
      ? (marketResult.value.coins?.find((coin) => coin.id === "bitcoin")?.current_price ?? null)
      : null;
  const action = buildHomeAction({
    btcLevel,
    mainRisk,
  });

  return {
    action,
    actionReason: action.reason,
    btcLevel,
    btcPrice,
    cacheStatus: "refresh-ok" as const,
    mainRisk,
    ok: true,
    sources: debugMode
      ? {
          btcLevel: btcLevelResult.status,
          market: marketResult.status,
          risks: risksResult.status,
        }
      : undefined,
    updatedAt: new Date().toISOString(),
    whatToWait: action.whatToWait,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const debugMode = url.searchParams.get("debug") === "1";
  const now = Date.now();

  if (!debugMode && homeSnapshotCache && now - homeSnapshotCache.updatedAt < HOME_SNAPSHOT_TTL_MS) {
    return Response.json(withCacheStatus(homeSnapshotCache, "hit"), {
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

    return Response.json(payload, {
      headers: {
        "Cache-Control": debugMode ? "no-store" : HOME_SNAPSHOT_CACHE_HEADERS,
      },
    });
  } catch (error) {
    const lastGoodAge = getCacheAgeMinutes(lastGoodHomeSnapshotCache);

    if (
      lastGoodHomeSnapshotCache &&
      now - lastGoodHomeSnapshotCache.updatedAt < HOME_SNAPSHOT_LAST_GOOD_TTL_MS
    ) {
      return Response.json(
        {
          ...withCacheStatus(lastGoodHomeSnapshotCache, "last-good"),
          sources: debugMode
            ? {
                error: error instanceof Error ? error.message : "snapshot-refresh-failed",
                lastGoodAgeMinutes: String(lastGoodAge ?? ""),
              }
            : undefined,
        },
        {
          headers: {
            "Cache-Control": debugMode ? "no-store" : HOME_SNAPSHOT_CACHE_HEADERS,
          },
        },
      );
    }

    const action = buildHomeAction({
      btcLevel: btcLevelFallback,
      mainRisk: btcRiskFallback,
    });

    return Response.json(
      {
        action,
        actionReason: action.reason,
        btcLevel: btcLevelFallback,
        btcPrice: null,
        cacheStatus: "fallback",
        mainRisk: btcRiskFallback,
        ok: true,
        sources: debugMode
          ? {
              error: error instanceof Error ? error.message : "snapshot-refresh-failed",
            }
          : undefined,
        updatedAt: new Date().toISOString(),
        whatToWait: action.whatToWait,
      } satisfies HomeSnapshotResponse,
      {
        headers: {
          "Cache-Control": debugMode ? "no-store" : HOME_SNAPSHOT_CACHE_HEADERS,
        },
      },
    );
  }
}
