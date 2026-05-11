import {
  btcLevelFallback,
  type BtcLevelConfidence,
  type BtcLevelResponse,
  type BtcLevelType,
} from "@/lib/btcLevel";

export const revalidate = 900;
export const dynamic = "force-dynamic";

type Candle = {
  close: number;
  high: number;
  low: number;
  open: number;
  time: number;
  volume: number;
};

type LevelCandidate = {
  level: number;
  recency: number;
  source: "average" | "swing" | "volume";
  volume: number;
};

type ScoredLevelCandidate = {
  candidate: LevelCandidate;
  distancePercent: number;
  score: number;
};

type BtcLevelDebug = {
  atr14: number | null;
  cacheStatus: "fallback" | "hit" | "last-good" | "miss" | "refresh-ok";
  candidateZones: Array<{
    distancePercent: number;
    label: string;
    level: number;
    score: number;
    source: LevelCandidate["source"];
  }>;
  confidence: BtcLevelConfidence;
  currentPrice: number | null;
  selectedZone: {
    distancePercent: number | null;
    label: string;
    score: number | null;
    type: BtcLevelType;
  };
  sma20: number | null;
  sma50: number | null;
  source: NonNullable<BtcLevelResponse["source"]>;
};

type BtcLevelBuildResult = {
  debug: BtcLevelDebug;
  payload: BtcLevelResponse;
};

type BtcLevelCacheEntry = BtcLevelBuildResult & {
  updatedAtMs: number;
};

const BTC_LEVEL_CACHE_TTL_MS = 15 * 60_000;
const BTC_LEVEL_LAST_GOOD_TTL_MS = 6 * 60 * 60_000;
let btcLevelCache: BtcLevelCacheEntry | null = null;
let lastGoodBtcLevel: BtcLevelCacheEntry | null = null;

function numberFrom(value: unknown) {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  return Number.isFinite(number) ? number : null;
}

async function fetchJson(url: URL) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
      },
      next: {
        revalidate: 900,
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

function parseBinanceKlines(payload: unknown): Candle[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((row) => {
      if (!Array.isArray(row)) {
        return null;
      }

      const time = numberFrom(row[0]);
      const open = numberFrom(row[1]);
      const high = numberFrom(row[2]);
      const low = numberFrom(row[3]);
      const close = numberFrom(row[4]);
      const volume = numberFrom(row[5]);

      if (
        time === null ||
        open === null ||
        high === null ||
        low === null ||
        close === null ||
        volume === null
      ) {
        return null;
      }

      return {
        close,
        high,
        low,
        open,
        time,
        volume,
      };
    })
    .filter((candle): candle is Candle => candle !== null);
}

async function fetchBinanceCandles(interval: "4h" | "1d", limit: number) {
  const url = new URL("https://api.binance.com/api/v3/klines");
  url.searchParams.set("symbol", "BTCUSDT");
  url.searchParams.set("interval", interval);
  url.searchParams.set("limit", String(limit));

  return parseBinanceKlines(await fetchJson(url));
}

async function fetchCoinGeckoCandles() {
  const url = new URL("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart");
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("days", "180");
  url.searchParams.set("interval", "daily");

  const payload = await fetchJson(url);

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const prices = Array.isArray(record.prices) ? record.prices : [];
  const volumes = Array.isArray(record.total_volumes) ? record.total_volumes : [];

  return prices
    .map((row, index) => {
      if (!Array.isArray(row)) {
        return null;
      }

      const time = numberFrom(row[0]);
      const close = numberFrom(row[1]);
      const volumeRow = Array.isArray(volumes[index]) ? volumes[index] : null;
      const volume = volumeRow ? numberFrom(volumeRow[1]) : 0;

      if (time === null || close === null) {
        return null;
      }

      return {
        close,
        high: close,
        low: close,
        open: close,
        time,
        volume: volume ?? 0,
      };
    })
    .filter((candle): candle is Candle => candle !== null);
}

async function fetchCurrentBtcPrice() {
  const url = new URL("https://api.coingecko.com/api/v3/coins/markets");
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("ids", "bitcoin");
  url.searchParams.set("sparkline", "false");

  const payload = await fetchJson(url);

  if (!Array.isArray(payload) || !payload[0] || typeof payload[0] !== "object") {
    return null;
  }

  return numberFrom((payload[0] as Record<string, unknown>).current_price);
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculateSma(values: number[], period: number) {
  if (values.length < period) {
    return null;
  }

  return average(values.slice(-period));
}

function calculateAtr(candles: Candle[], period = 14) {
  if (candles.length <= period) {
    return null;
  }

  const ranges = candles.slice(1).map((candle, index) => {
    const previousClose = candles[index].close;

    return Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previousClose),
      Math.abs(candle.low - previousClose),
    );
  });

  return average(ranges.slice(-period));
}

function roundStep(value: number) {
  return value <= 150 ? 50 : 100;
}

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

function formatUsdRange(low: number, high: number) {
  const formatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });

  return `$${formatter.format(low)}–${formatter.format(high)}`;
}

function zoneHalfWidth(level: number, atr14: number) {
  return Math.max(level * 0.004, atr14 * 0.35);
}

function formatLevelRange(candidate: LevelCandidate, atr14: number, step: number) {
  const rangeHalfWidth = zoneHalfWidth(candidate.level, atr14);
  const rangeLow = roundToStep(candidate.level - rangeHalfWidth, step);
  const rangeHigh = roundToStep(candidate.level + rangeHalfWidth, step);

  return formatUsdRange(Math.min(rangeLow, rangeHigh), Math.max(rangeLow, rangeHigh));
}

function distancePercent(level: number, currentPrice: number) {
  return (Math.abs(level - currentPrice) / currentPrice) * 100;
}

function levelType(
  candidate: LevelCandidate,
  currentPrice: number,
  atr14: number,
  step: number,
): BtcLevelType {
  const rangeHalfWidth = zoneHalfWidth(candidate.level, atr14);
  const rangeLow = roundToStep(candidate.level - rangeHalfWidth, step);
  const rangeHigh = roundToStep(candidate.level + rangeHalfWidth, step);

  return currentPrice > rangeHigh
    ? "support"
    : currentPrice < rangeLow
      ? "resistance"
      : "decision-zone";
}

function findSwingCandidates(candles: Candle[]) {
  const candidates: LevelCandidate[] = [];
  const lookback = candles.slice(-180);

  for (let index = 3; index < lookback.length - 3; index += 1) {
    const candle = lookback[index];
    const left = lookback.slice(index - 3, index);
    const right = lookback.slice(index + 1, index + 4);
    const recency = index / lookback.length;

    if (
      left.every((item) => candle.high >= item.high) &&
      right.every((item) => candle.high >= item.high)
    ) {
      candidates.push({
        level: candle.high,
        recency,
        source: "swing",
        volume: candle.volume,
      });
    }

    if (
      left.every((item) => candle.low <= item.low) &&
      right.every((item) => candle.low <= item.low)
    ) {
      candidates.push({
        level: candle.low,
        recency,
        source: "swing",
        volume: candle.volume,
      });
    }
  }

  return candidates;
}

function findVolumeCandidates(candles: Candle[], binSize: number) {
  const bins = new Map<number, { touches: number; volume: number }>();

  for (const candle of candles.slice(-180)) {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    const level = roundToStep(typicalPrice, binSize);
    const current = bins.get(level) ?? { touches: 0, volume: 0 };

    current.touches += 1;
    current.volume += candle.volume;
    bins.set(level, current);
  }

  return [...bins.entries()]
    .sort((left, right) => right[1].volume - left[1].volume)
    .slice(0, 10)
    .map(([level, data]) => ({
      level,
      recency: Math.min(1, data.touches / 20),
      source: "volume" as const,
      volume: data.volume,
    }));
}

function groupNearbyCandidates(candidates: LevelCandidate[], currentPrice: number) {
  const threshold = currentPrice * 0.009;
  const groups: LevelCandidate[][] = [];

  for (const candidate of [...candidates].sort((left, right) => left.level - right.level)) {
    const group = groups.at(-1);
    const groupAverage = group
      ? average(group.map((item) => item.level)) ?? candidate.level
      : candidate.level;

    if (!group || Math.abs(candidate.level - groupAverage) > threshold) {
      groups.push([candidate]);
      continue;
    }

    group.push(candidate);
  }

  return groups.map((group) => {
    const totalVolume = group.reduce((sum, item) => sum + item.volume, 0);
    const weightedLevel =
      totalVolume > 0
        ? group.reduce((sum, item) => sum + item.level * item.volume, 0) / totalVolume
        : average(group.map((item) => item.level)) ?? group[0].level;
    const source: LevelCandidate["source"] = group.some((item) => item.source === "swing")
      ? "swing"
      : group.some((item) => item.source === "volume")
        ? "volume"
        : "average";

    return {
      level: weightedLevel,
      recency: Math.max(...group.map((item) => item.recency)),
      source,
      volume: totalVolume,
    };
  });
}

function scoreLevel(
  candidate: LevelCandidate,
  candles: Candle[],
  currentPrice: number,
  binSize: number,
  sma20: number | null,
  sma50: number | null,
) {
  const proximityScore = Math.max(0, 28 - distancePercent(candidate.level, currentPrice) * 5);
  const touches = candles.filter(
    (candle) =>
      Math.abs(candle.high - candidate.level) <= binSize ||
      Math.abs(candle.low - candidate.level) <= binSize ||
      Math.abs(candle.close - candidate.level) <= binSize,
  ).length;
  const touchScore = Math.min(28, touches * 2.4);
  const recencyScore = candidate.recency * 16;
  const averageVolume = average(candles.map((candle) => candle.volume)) ?? 1;
  const volumeScore = Math.min(18, (candidate.volume / averageVolume) * 1.8);
  const averageScore =
    (sma20 && Math.abs(candidate.level - sma20) <= binSize ? 8 : 0) +
    (sma50 && Math.abs(candidate.level - sma50) <= binSize ? 8 : 0);
  const sourceScore = candidate.source === "volume" ? 8 : candidate.source === "swing" ? 7 : 5;

  return proximityScore + touchScore + recencyScore + volumeScore + averageScore + sourceScore;
}

function buildCurrentPriceFallback(currentPrice: number): BtcLevelBuildResult {
  const atr14 = currentPrice * 0.012;
  const step = roundStep(currentPrice * 0.006);
  const candidate: LevelCandidate = {
    level: currentPrice,
    recency: 1,
    source: "average",
    volume: 0,
  };
  const keyLevelRange = formatLevelRange(candidate, atr14, step);
  const payload: BtcLevelResponse = {
    aboveScenario: "Выше зоны рынок получает шанс на стабилизацию.",
    bearishScenario: "Ниже зоны растёт риск движения к ближайшей поддержке.",
    belowScenario: "Ниже зоны растёт риск движения к ближайшей поддержке.",
    bullishScenario: "Выше зоны рынок получает шанс на стабилизацию.",
    confidence: "low",
    currentPrice,
    dataQuality: "fallback",
    distancePercent: 0,
    explanation:
      "Недостаточно исторических данных, уровень рассчитан приблизительно вокруг текущей цены.",
    keyLevel: Math.round(currentPrice),
    keyLevelRange,
    levelLabel: keyLevelRange,
    nextResistance: null,
    nextSupport: null,
    source: "fallback-current-price",
    type: "decision-zone",
    updatedAt: new Date().toISOString(),
  };

  return {
    debug: {
      atr14,
      cacheStatus: "fallback",
      candidateZones: [],
      confidence: "low",
      currentPrice,
      selectedZone: {
        distancePercent: 0,
        label: keyLevelRange,
        score: null,
        type: "decision-zone",
      },
      sma20: null,
      sma50: null,
      source: "fallback-current-price",
    },
    payload,
  };
}

function buildStaticFallback(): BtcLevelBuildResult {
  const payload: BtcLevelResponse = {
    ...btcLevelFallback,
    source: "fallback-static",
    updatedAt: new Date().toISOString(),
  };

  return {
    debug: {
      atr14: null,
      cacheStatus: "fallback",
      candidateZones: [],
      confidence: "low",
      currentPrice: null,
      selectedZone: {
        distancePercent: null,
        label: payload.keyLevelRange,
        score: null,
        type: payload.type,
      },
      sma20: null,
      sma50: null,
      source: "fallback-static",
    },
    payload,
  };
}

function buildBtcLevel(candles: Candle[]): BtcLevelBuildResult {
  const currentPrice = candles.at(-1)?.close ?? null;

  if (currentPrice === null || candles.length < 30) {
    return buildStaticFallback();
  }

  const closes = candles.map((candle) => candle.close);
  const atr14 = calculateAtr(candles) ?? currentPrice * 0.01;
  const rawBinSize = Math.max(atr14 * 0.5, currentPrice * 0.0025);
  const step = roundStep(rawBinSize);
  const binSize = Math.max(step, roundToStep(rawBinSize, step));
  const sma20 = calculateSma(closes, 20);
  const sma50 = calculateSma(closes, 50);
  const averageCandidates: LevelCandidate[] = [sma20, sma50]
    .filter((value): value is number => value !== null)
    .map((level) => ({
      level,
      recency: 1,
      source: "average" as const,
      volume: average(candles.slice(-20).map((candle) => candle.volume)) ?? 0,
    }));
  const candidates = groupNearbyCandidates(
    [
      ...findSwingCandidates(candles),
      ...findVolumeCandidates(candles, binSize),
      ...averageCandidates,
    ],
    currentPrice,
  );
  const scoredCandidates: ScoredLevelCandidate[] = candidates.map((candidate) => ({
    candidate,
    distancePercent: distancePercent(candidate.level, currentPrice),
    score: scoreLevel(candidate, candles, currentPrice, binSize, sma20, sma50),
  }));
  const supports = scoredCandidates
    .filter((item) => item.candidate.level < currentPrice)
    .sort((left, right) => left.distancePercent - right.distancePercent || right.score - left.score);
  const resistances = scoredCandidates
    .filter((item) => item.candidate.level > currentPrice)
    .sort((left, right) => left.distancePercent - right.distancePercent || right.score - left.score);
  const closeCandidates = scoredCandidates.filter((item) => item.distancePercent <= 7);
  const significantCloseCandidates = closeCandidates.filter((item) => item.score >= 30);
  const best =
    (significantCloseCandidates.length > 0 ? significantCloseCandidates : closeCandidates).sort(
      (left, right) => left.distancePercent - right.distancePercent || right.score - left.score,
    )[0] ??
    ({
      candidate: {
        level: currentPrice,
        recency: 1,
        source: "average",
        volume: average(candles.slice(-20).map((candle) => candle.volume)) ?? 0,
      },
      distancePercent: 0,
      score: 0,
    } satisfies ScoredLevelCandidate);
  const type = levelType(best.candidate, currentPrice, atr14, step);
  const distinctFromBest = (item: ScoredLevelCandidate) =>
    Math.abs(item.candidate.level - best.candidate.level) > binSize * 0.5;
  const nextSupportCandidate = supports.find(distinctFromBest);
  const nextResistanceCandidate = resistances.find(distinctFromBest);
  const nextSupport = nextSupportCandidate
    ? formatLevelRange(nextSupportCandidate.candidate, atr14, step)
    : null;
  const nextResistance = nextResistanceCandidate
    ? formatLevelRange(nextResistanceCandidate.candidate, atr14, step)
    : null;
  const confidence: BtcLevelConfidence =
    best.score > 70 && best.distancePercent <= 5
      ? "high"
      : best.score > 48 && best.distancePercent <= 7
        ? "medium"
        : "low";
  const dataQuality =
    scoredCandidates.length === 0 ? "fallback" : best.score === 0 ? "partial" : "full";
  const keyLevelRange = formatLevelRange(best.candidate, atr14, step);
  const aboveScenario =
    type === "support"
      ? "Удержание зоны снижает давление продавцов."
      : type === "resistance"
        ? "Закрепление выше зоны снижает давление продавцов."
        : "Рынок получает шанс на продолжение.";
  const belowScenario =
    type === "resistance"
      ? "Отбой сохраняет риск отката."
      : type === "support"
        ? "Потеря зоны открывает движение к следующей поддержке."
        : "Растёт риск движения к ближайшей поддержке.";
  const payload: BtcLevelResponse = {
    aboveScenario,
    bearishScenario: belowScenario,
    belowScenario,
    bullishScenario: aboveScenario,
    confidence,
    currentPrice,
    dataQuality,
    distancePercent: Math.round(best.distancePercent * 10) / 10,
    explanation:
      best.score === 0
        ? "Ближайшие сильные зоны находятся слишком далеко от текущей цены, поэтому показана рабочая зона решения около рынка."
        : "Зона выбрана по совпадению локальных разворотов, объёма, средних и близости к текущей цене.",
    keyLevel: Math.round(best.candidate.level),
    keyLevelRange,
    levelLabel: keyLevelRange,
    nextResistance,
    nextSupport,
    source: "auto-swing-sma-atr",
    type,
    updatedAt: new Date().toISOString(),
  };

  return {
    debug: {
      atr14,
      cacheStatus: "miss",
      candidateZones: scoredCandidates
        .sort((left, right) => right.score - left.score)
        .slice(0, 12)
        .map((item) => ({
          distancePercent: Math.round(item.distancePercent * 10) / 10,
          label: formatLevelRange(item.candidate, atr14, step),
          level: Math.round(item.candidate.level),
          score: Math.round(item.score),
          source: item.candidate.source,
        })),
      confidence,
      currentPrice,
      selectedZone: {
        distancePercent: Math.round(best.distancePercent * 10) / 10,
        label: keyLevelRange,
        score: Math.round(best.score),
        type,
      },
      sma20,
      sma50,
      source: "auto-swing-sma-atr",
    },
    payload,
  };
}

function withDebugStatus(
  result: BtcLevelBuildResult,
  cacheStatus: BtcLevelDebug["cacheStatus"],
) {
  return {
    debug: {
      ...result.debug,
      cacheStatus,
    },
    payload: result.payload,
  };
}

function btcLevelResponse(result: BtcLevelBuildResult, debugMode: boolean) {
  const payload = debugMode
    ? {
        ...result.payload,
        debug: result.debug,
      }
    : result.payload;

  return Response.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=21600",
    },
  });
}

export async function GET(request: Request) {
  const debugMode = new URL(request.url).searchParams.get("debug") === "1";

  if (btcLevelCache && Date.now() - btcLevelCache.updatedAtMs < BTC_LEVEL_CACHE_TTL_MS) {
    return btcLevelResponse(withDebugStatus(btcLevelCache, "hit"), debugMode);
  }

  try {
    const [candles4h, candles1d] = await Promise.all([
      fetchBinanceCandles("4h", 720),
      fetchBinanceCandles("1d", 180),
    ]);
    const sourceCandles =
      candles4h.length >= 80
        ? candles4h
        : candles1d.length >= 30
          ? candles1d
          : await fetchCoinGeckoCandles();
    let result = buildBtcLevel(sourceCandles);

    if (result.payload.currentPrice === null || result.payload.source === "fallback-static") {
      const currentPrice = await fetchCurrentBtcPrice();

      if (currentPrice !== null) {
        result = buildCurrentPriceFallback(currentPrice);
      }
    }

    const cachedResult: BtcLevelCacheEntry = {
      ...withDebugStatus(result, "refresh-ok"),
      updatedAtMs: Date.now(),
    };

    btcLevelCache = cachedResult;

    if (cachedResult.payload.source !== "fallback-static") {
      lastGoodBtcLevel = cachedResult;
    }

    return btcLevelResponse(cachedResult, debugMode);
  } catch {
    if (
      lastGoodBtcLevel &&
      Date.now() - lastGoodBtcLevel.updatedAtMs < BTC_LEVEL_LAST_GOOD_TTL_MS
    ) {
      return btcLevelResponse(withDebugStatus(lastGoodBtcLevel, "last-good"), debugMode);
    }

    const currentPrice = await fetchCurrentBtcPrice();
    const fallback = currentPrice !== null
      ? buildCurrentPriceFallback(currentPrice)
      : buildStaticFallback();

    return btcLevelResponse(withDebugStatus(fallback, "fallback"), debugMode);
  }
}
