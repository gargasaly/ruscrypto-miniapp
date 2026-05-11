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
  source: "swing" | "volume" | "average";
  volume: number;
};

type ScoredLevelCandidate = {
  candidate: LevelCandidate;
  distancePercent: number;
  score: number;
};

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
  if (value <= 100) {
    return 50;
  }

  if (value <= 250) {
    return 100;
  }

  return 250;
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

function formatLevelRange(candidate: LevelCandidate, atr14: number, binSize: number, step: number) {
  const rangeHalfWidth = Math.max(binSize * 0.6, atr14 * 0.25);
  const rangeLow = roundToStep(candidate.level - rangeHalfWidth, step);
  const rangeHigh = roundToStep(candidate.level + rangeHalfWidth, step);

  return formatUsdRange(Math.min(rangeLow, rangeHigh), Math.max(rangeLow, rangeHigh));
}

function distancePercent(level: number, currentPrice: number) {
  return Math.abs(level - currentPrice) / currentPrice * 100;
}

function levelType(candidate: LevelCandidate, currentPrice: number, atr14: number, binSize: number, step: number): BtcLevelType {
  const rangeHalfWidth = Math.max(binSize * 0.6, atr14 * 0.25);
  const rangeLow = roundToStep(candidate.level - rangeHalfWidth, step);
  const rangeHigh = roundToStep(candidate.level + rangeHalfWidth, step);

  return currentPrice > rangeHigh ? "support" : currentPrice < rangeLow ? "resistance" : "pivot";
}

function findSwingCandidates(candles: Candle[]) {
  const candidates: LevelCandidate[] = [];
  const lookback = candles.slice(-180);

  for (let index = 2; index < lookback.length - 2; index += 1) {
    const candle = lookback[index];
    const left = lookback.slice(index - 2, index);
    const right = lookback.slice(index + 1, index + 3);
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
    .slice(0, 8)
    .map(([level, data]) => ({
      level,
      recency: Math.min(1, data.touches / 20),
      source: "volume" as const,
      volume: data.volume,
    }));
}

function scoreLevel(
  candidate: LevelCandidate,
  candles: Candle[],
  currentPrice: number,
  binSize: number,
  sma20: number | null,
  sma50: number | null,
) {
  const distance = Math.abs(candidate.level - currentPrice);
  const proximityScore = Math.max(0, 24 - (distance / currentPrice) * 1000);
  const touches = candles.filter(
    (candle) =>
      Math.abs(candle.high - candidate.level) <= binSize ||
      Math.abs(candle.low - candidate.level) <= binSize ||
      Math.abs(candle.close - candidate.level) <= binSize,
  ).length;
  const touchScore = Math.min(26, touches * 2.6);
  const recencyScore = candidate.recency * 16;
  const averageVolume = average(candles.map((candle) => candle.volume)) ?? 1;
  const volumeScore = Math.min(18, (candidate.volume / averageVolume) * 2);
  const averageScore =
    (sma20 && Math.abs(candidate.level - sma20) <= binSize ? 8 : 0) +
    (sma50 && Math.abs(candidate.level - sma50) <= binSize ? 8 : 0);
  const sourceScore = candidate.source === "volume" ? 8 : 5;

  return proximityScore + touchScore + recencyScore + volumeScore + averageScore + sourceScore;
}

function buildBtcLevel(candles: Candle[]): BtcLevelResponse {
  const currentPrice = candles.at(-1)?.close ?? null;

  if (currentPrice === null || candles.length < 30) {
    return {
      ...btcLevelFallback,
      updatedAt: new Date().toISOString(),
    };
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
  const candidates = [
    ...findSwingCandidates(candles),
    ...findVolumeCandidates(candles, binSize),
    ...averageCandidates,
  ];
  const scoredCandidates: ScoredLevelCandidate[] = candidates
    .map((candidate) => ({
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
  let nextSupport = supports[0]
    ? formatLevelRange(supports[0].candidate, atr14, binSize, step)
    : null;
  let nextResistance = resistances[0]
    ? formatLevelRange(resistances[0].candidate, atr14, binSize, step)
    : null;
  const closeCandidates = scoredCandidates.filter((item) => item.distancePercent <= 7);
  const significantCloseCandidates = closeCandidates.filter((item) => item.score >= 32);
  const veryCloseSignificantCandidates = significantCloseCandidates.filter(
    (item) => item.distancePercent <= 3,
  );
  const best =
    (veryCloseSignificantCandidates.length > 0
      ? veryCloseSignificantCandidates
      : significantCloseCandidates.length > 0
        ? significantCloseCandidates
        : closeCandidates)
      .sort((left, right) => left.distancePercent - right.distancePercent || right.score - left.score)[0] ??
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
  const distinctFromBest = (item: ScoredLevelCandidate) =>
    Math.abs(item.candidate.level - best.candidate.level) > binSize * 0.5;
  const nextSupportCandidate = supports.find(distinctFromBest);
  const nextResistanceCandidate = resistances.find(distinctFromBest);

  nextSupport = nextSupportCandidate
    ? formatLevelRange(nextSupportCandidate.candidate, atr14, binSize, step)
    : null;
  nextResistance = nextResistanceCandidate
    ? formatLevelRange(nextResistanceCandidate.candidate, atr14, binSize, step)
    : null;

  const type = levelType(best.candidate, currentPrice, atr14, binSize, step);
  const confidence: BtcLevelConfidence =
    best.score > 70 && best.distancePercent <= 5
      ? "high"
      : best.score > 48 && best.distancePercent <= 7
        ? "medium"
        : "low";
  const dataQuality =
    scoredCandidates.length === 0 ? "fallback" : best.score === 0 ? "partial" : "full";
  const isPivotFallback = best.score === 0;

  return {
    bearishScenario:
      type === "resistance"
        ? "Отбой от зоны оставляет риск движения к ближайшей поддержке."
        : "Потеря зоны повышает риск движения к следующей поддержке.",
    bullishScenario:
      type === "support"
        ? "Удержание зоны помогает снизить давление продавцов."
        : "Закрепление выше зоны снижает давление продавцов.",
    confidence,
    currentPrice,
    dataQuality,
    distancePercent: Math.round(best.distancePercent * 10) / 10,
    explanation:
      isPivotFallback
        ? "Ближайшие сильные зоны находятся слишком далеко от текущей цены, поэтому показан рабочий pivot около рынка."
        : "Зона выбрана по совпадению локальных разворотов, объёма, средних и близости к текущей цене.",
    keyLevel: Math.round(best.candidate.level),
    keyLevelRange: formatLevelRange(best.candidate, atr14, binSize, step),
    nextResistance,
    nextSupport,
    type,
    updatedAt: new Date().toISOString(),
  };
}

export async function GET() {
  const [candles4h, candles1d] = await Promise.all([
    fetchBinanceCandles("4h", 720),
    fetchBinanceCandles("1d", 180),
  ]);
  const sourceCandles =
    candles4h.length >= 80 ? candles4h : candles1d.length >= 30 ? candles1d : await fetchCoinGeckoCandles();
  const payload = buildBtcLevel(sourceCandles);

  return Response.json(payload, {
    headers: {
      "Cache-Control": "s-maxage=900, stale-while-revalidate=60",
    },
  });
}
