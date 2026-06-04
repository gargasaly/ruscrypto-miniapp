import {
  btcLevelFallback,
  type BtcDistantMajorResistance,
  type BtcLevelAction,
  type BtcLevelConfidence,
  type BtcLevelResponse,
  type BtcLevelStrength,
  type BtcLevelZone,
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

type OhlcInterval = "4h" | "1d";
type OhlcProvider = "binance" | "coinbase" | "kraken";
type OhlcStatus =
  | "error"
  | "last_good"
  | "pending"
  | "provider_failed"
  | "ready"
  | "timeout";

type OhlcProviderDebug = {
  candles?: number;
  elapsedMs: number;
  error?: string;
  interval: OhlcInterval;
  ok: boolean;
  provider: OhlcProvider | string;
  status?: number;
  urlHost: string;
};

type LevelSide = "resistance" | "support";

type LevelSource =
  | "1d_swing_high"
  | "1d_swing_low"
  | "4h_swing_high"
  | "4h_swing_low"
  | "ema20"
  | "ema50"
  | "ema200"
  | "previous_day_high"
  | "previous_day_low"
  | "previous_month_high"
  | "previous_month_low"
  | "previous_week_high"
  | "previous_week_low"
  | "lost_support_flip_day"
  | "lost_support_flip_week"
  | "lost_support_flip_month"
  | "round_level_cluster"
  | "round_level_1000"
  | "round_level_2500"
  | "round_level_5000"
  | "round_level_10000";

type LevelCandidate = {
  baseScore: number;
  level: number;
  side: LevelSide;
  source: LevelSource;
  time?: number;
  volume?: number;
};

type InternalZone = BtcLevelZone & {
  hasStructuralSource: boolean;
  latestTime: number | null;
  onlyWeakRoundLevel: boolean;
  side: LevelSide;
  supportFlipOnly: boolean;
  touchVolumes: number[];
  touches: number;
};

type BtcLevelDebug = {
  cacheStatus: "fallback" | "hit" | "last-good" | "refresh-ok";
  currentPrice: number | null;
  levelState: NonNullable<BtcLevelResponse["levelState"]>;
  meta: NonNullable<BtcLevelResponse["meta"]>;
  activeSupportZone: BtcLevelZone | null;
  minorResistance: BtcLevelZone | null;
  nearestResistance: BtcLevelZone | null;
  nearestSupport: BtcLevelZone | null;
  providerDebug: OhlcProviderDebug[];
  riskRewardSupport: BtcLevelZone | null;
  riskRewardRatio: number | null;
  supportState: NonNullable<BtcLevelResponse["supportState"]>;
  zones: Array<{
    distancePercent: number | null;
    label?: string;
    score: number;
    side: LevelSide;
    sources: string[];
    strength: BtcLevelStrength;
  }>;
};

type BtcLevelBuildResult = {
  debug: BtcLevelDebug;
  payload: BtcLevelResponse;
};

type BtcLevelCacheEntry = BtcLevelBuildResult & {
  updatedAtMs: number;
};

type OhlcMetaPatch = {
  candleSource: OhlcProvider | "last_good" | null;
  elapsedMs: number;
  fallbackUsed: boolean;
  ohlcStatus: OhlcStatus;
  providerAttemptsCount: number;
};

const BTC_LEVEL_CACHE_TTL_MS = 15 * 60_000;
const BTC_LEVEL_LAST_GOOD_TTL_MS = 6 * 60 * 60_000;
const LEVEL_MODEL_VERSION = "btc-level-v2" as const;
const MANUAL_MAJOR_RESISTANCE = {
  label: "$80,000–82,000",
  lower: 80_000,
  upper: 82_000,
};
const MIN_HEADLINE_ZONE_SCORE = 35;
const ROUND_ONLY_SCORE_CAP = 24;
const SUPPORT_FLIP_SCORE_CAP = 60;
const OHLC_TIMEOUT_MS = 1_800;
const MIN_CANDLES_4H = 80;
const MIN_CANDLES_1D = 90;

let btcLevelCache: BtcLevelCacheEntry | null = null;
let lastGoodBtcLevel: BtcLevelCacheEntry | null = null;

function numberFrom(value: unknown) {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(/,/g, ""))
        : NaN;

  return Number.isFinite(number) ? number : null;
}

function elapsedMs(startedAt: number) {
  return Math.max(1, Date.now() - startedAt);
}

function safeUrlHost(url: URL) {
  return `${url.host}${url.pathname}`;
}

function sanitizeFetchError(error: unknown) {
  if (error instanceof Error) {
    return error.name === "AbortError" ? "timeout" : error.message.slice(0, 120);
  }

  return "unknown-error";
}

async function fetchJsonWithDebug({
  headers,
  interval,
  provider,
  timeoutMs = OHLC_TIMEOUT_MS,
  url,
}: {
  headers?: HeadersInit;
  interval: OhlcInterval;
  provider: OhlcProvider;
  timeoutMs?: number;
  url: URL;
}) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "ruscrypto-miniapp/1.0",
        ...(headers ?? {}),
      },
      next: {
        revalidate: 900,
      },
      signal: controller.signal,
    });
    const debug: OhlcProviderDebug = {
      elapsedMs: elapsedMs(startedAt),
      interval,
      ok: response.ok,
      provider,
      status: response.status,
      urlHost: safeUrlHost(url),
    };

    if (!response.ok) {
      return {
        debug: {
          ...debug,
          error: `http-${response.status}`,
        },
        payload: null,
      };
    }

    return {
      debug,
      payload: (await response.json()) as unknown,
    };
  } catch (error) {
    return {
      debug: {
        elapsedMs: elapsedMs(startedAt),
        error: sanitizeFetchError(error),
        interval,
        ok: false,
        provider,
        urlHost: safeUrlHost(url),
      } satisfies OhlcProviderDebug,
      payload: null,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeCandles(candles: Array<Candle | null>) {
  return candles
    .filter((candle): candle is Candle => {
      if (!candle) {
        return false;
      }

      return (
        Number.isFinite(candle.time) &&
        Number.isFinite(candle.open) &&
        Number.isFinite(candle.high) &&
        Number.isFinite(candle.low) &&
        Number.isFinite(candle.close) &&
        Number.isFinite(candle.volume) &&
        candle.time > 0 &&
        candle.open > 0 &&
        candle.high >= candle.low &&
        candle.close > 0
      );
    })
    .sort((left, right) => left.time - right.time);
}

function parseBinanceKlines(payload: unknown): Candle[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return normalizeCandles(
    payload.map((row) => {
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
    }),
  );
}

function parseCoinbaseCandles(payload: unknown): Candle[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return normalizeCandles(
    payload.map((row) => {
      if (!Array.isArray(row)) {
        return null;
      }

      const time = numberFrom(row[0]);
      const low = numberFrom(row[1]);
      const high = numberFrom(row[2]);
      const open = numberFrom(row[3]);
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
        time: time * 1000,
        volume,
      };
    }),
  );
}

function parseKrakenCandles(payload: unknown): Candle[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return [];
  }

  const result = (payload as Record<string, unknown>).result;

  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return [];
  }

  const rows =
    Object.entries(result as Record<string, unknown>).find(([key, value]) =>
      key !== "last" && Array.isArray(value),
    )?.[1] ?? null;

  if (!Array.isArray(rows)) {
    return [];
  }

  return normalizeCandles(
    rows.map((row) => {
      if (!Array.isArray(row)) {
        return null;
      }

      const time = numberFrom(row[0]);
      const open = numberFrom(row[1]);
      const high = numberFrom(row[2]);
      const low = numberFrom(row[3]);
      const close = numberFrom(row[4]);
      const volume = numberFrom(row[6]);

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
        time: time * 1000,
        volume,
      };
    }),
  );
}

function minimumCandlesForInterval(interval: OhlcInterval) {
  return interval === "4h" ? MIN_CANDLES_4H : MIN_CANDLES_1D;
}

async function fetchBinanceCandles(interval: OhlcInterval, limit: number) {
  const url = new URL("https://api.binance.com/api/v3/klines");
  url.searchParams.set("symbol", "BTCUSDT");
  url.searchParams.set("interval", interval);
  url.searchParams.set("limit", String(limit));

  const result = await fetchJsonWithDebug({
    interval,
    provider: "binance",
    url,
  });
  const candles = parseBinanceKlines(result.payload).slice(-limit);

  return {
    candles,
    debug: {
      ...result.debug,
      candles: candles.length,
      ok: result.debug.ok && candles.length >= minimumCandlesForInterval(interval),
      error:
        result.debug.error ??
        (candles.length >= minimumCandlesForInterval(interval)
          ? undefined
          : `too-few-candles:${candles.length}`),
    },
  };
}

async function fetchCoinbaseCandles(interval: OhlcInterval, limit: number) {
  const granularity = interval === "4h" ? 14_400 : 86_400;
  const requestLimit = Math.min(limit, 300);
  const end = new Date();
  const start = new Date(end.getTime() - requestLimit * granularity * 1000);
  const url = new URL("https://api.exchange.coinbase.com/products/BTC-USD/candles");
  url.searchParams.set("granularity", String(granularity));
  url.searchParams.set("start", start.toISOString());
  url.searchParams.set("end", end.toISOString());

  const result = await fetchJsonWithDebug({
    interval,
    provider: "coinbase",
    url,
  });
  const candles = parseCoinbaseCandles(result.payload).slice(-limit);

  return {
    candles,
    debug: {
      ...result.debug,
      candles: candles.length,
      ok: result.debug.ok && candles.length >= minimumCandlesForInterval(interval),
      error:
        result.debug.error ??
        (candles.length >= minimumCandlesForInterval(interval)
          ? undefined
          : `too-few-candles:${candles.length}`),
    },
  };
}

async function fetchKrakenCandles(interval: OhlcInterval, limit: number) {
  const url = new URL("https://api.kraken.com/0/public/OHLC");
  url.searchParams.set("pair", "XBTUSD");
  url.searchParams.set("interval", interval === "4h" ? "240" : "1440");

  const result = await fetchJsonWithDebug({
    interval,
    provider: "kraken",
    url,
  });
  const candles = parseKrakenCandles(result.payload).slice(-limit);

  return {
    candles,
    debug: {
      ...result.debug,
      candles: candles.length,
      ok: result.debug.ok && candles.length >= minimumCandlesForInterval(interval),
      error:
        result.debug.error ??
        (candles.length >= minimumCandlesForInterval(interval)
          ? undefined
          : `too-few-candles:${candles.length}`),
    },
  };
}

async function fetchProviderCandles(provider: OhlcProvider, interval: OhlcInterval, limit: number) {
  if (provider === "coinbase") {
    return fetchCoinbaseCandles(interval, limit);
  }

  if (provider === "kraken") {
    return fetchKrakenCandles(interval, limit);
  }

  return fetchBinanceCandles(interval, limit);
}

async function fetchOhlcBundle() {
  const startedAt = Date.now();
  const providerDebug: OhlcProviderDebug[] = [];
  const providers: OhlcProvider[] = ["binance", "coinbase", "kraken"];

  for (const provider of providers) {
    const [fourHour, daily] = await Promise.all([
      fetchProviderCandles(provider, "4h", 540),
      fetchProviderCandles(provider, "1d", 365),
    ]);

    providerDebug.push(fourHour.debug, daily.debug);

    if (
      fourHour.candles.length >= MIN_CANDLES_4H &&
      daily.candles.length >= MIN_CANDLES_1D
    ) {
      return {
        candleSource: provider,
        candles1d: daily.candles,
        candles4h: fourHour.candles,
        elapsedMs: elapsedMs(startedAt),
        ohlcStatus: "ready" as OhlcStatus,
        providerDebug,
      };
    }
  }

  const timedOut = providerDebug.some((item) => item.error === "timeout");

  return {
    candleSource: null,
    candles1d: [] as Candle[],
    candles4h: [] as Candle[],
    elapsedMs: elapsedMs(startedAt),
    ohlcStatus: timedOut ? ("timeout" as OhlcStatus) : ("provider_failed" as OhlcStatus),
    providerDebug,
  };
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
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

function calculateEma(values: number[], period: number) {
  if (values.length < period) {
    return null;
  }

  const multiplier = 2 / (period + 1);
  let ema = average(values.slice(0, period));

  if (ema === null) {
    return null;
  }

  for (const value of values.slice(period)) {
    ema = value * multiplier + ema * (1 - multiplier);
  }

  return ema;
}

function calculateRsi(values: number[], period = 14) {
  if (values.length <= period) {
    return null;
  }

  const changes = values.slice(1).map((value, index) => value - values[index]);
  const recent = changes.slice(-period);
  const gains = recent.map((change) => (change > 0 ? change : 0));
  const losses = recent.map((change) => (change < 0 ? Math.abs(change) : 0));
  const averageGain = average(gains) ?? 0;
  const averageLoss = average(losses) ?? 0;

  if (averageLoss === 0) {
    return averageGain > 0 ? 100 : 50;
  }

  const rs = averageGain / averageLoss;

  return 100 - 100 / (1 + rs);
}

function roundTo(value: number, step: number) {
  return Math.round(value / step) * step;
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(value);
}

function formatUsdRange(lower: number, upper: number) {
  return `$${formatUsd(lower)}–${formatUsd(upper)}`;
}

function percent(value: number | null) {
  return value === null || !Number.isFinite(value) ? null : Math.round(value * 10) / 10;
}

function strengthFromScore(score: number): BtcLevelStrength {
  if (score >= 65) {
    return "key";
  }

  if (score >= 45) {
    return "strong";
  }

  if (score >= 25) {
    return "working";
  }

  return "weak";
}

function isRoundSource(source: string) {
  return source.startsWith("round_level_");
}

function isSupportFlipSource(source: string) {
  return source.startsWith("lost_support_flip_");
}

function isStructuralResistanceSource(source: string) {
  return (
    source === "4h_swing_high" ||
    source === "1d_swing_high" ||
    source === "previous_day_high" ||
    source === "previous_week_high" ||
    source === "previous_month_high" ||
    source === "lost_support_flip_day" ||
    source === "lost_support_flip_week" ||
    source === "lost_support_flip_month" ||
    source === "ema20" ||
    source === "ema50" ||
    source === "ema200"
  );
}

function normalizeZoneSources(rawSources: LevelSource[]) {
  const hasRoundSource = rawSources.some(isRoundSource);
  const sources = rawSources.filter((source) => !isRoundSource(source));

  if (hasRoundSource) {
    sources.push("round_level_cluster");
  }

  return Array.from(new Set(sources));
}

function supportFlipSource(
  source: "previous_day_low" | "previous_month_low" | "previous_week_low",
  level: number,
  currentPrice: number,
): LevelSource {
  if (level <= currentPrice) {
    return source;
  }

  if (source === "previous_day_low") {
    return "lost_support_flip_day";
  }

  if (source === "previous_week_low") {
    return "lost_support_flip_week";
  }

  return "lost_support_flip_month";
}

function distanceToResistance(currentPrice: number, lower: number, upper: number) {
  if (currentPrice >= lower && currentPrice <= upper) {
    return 0;
  }

  return ((lower - currentPrice) / currentPrice) * 100;
}

function distanceToSupport(currentPrice: number, lower: number, upper: number) {
  if (currentPrice >= lower && currentPrice <= upper) {
    return 0;
  }

  return ((currentPrice - upper) / currentPrice) * 100;
}

function pushCandidate(
  candidates: LevelCandidate[],
  currentPrice: number,
  candidate: Omit<LevelCandidate, "side">,
) {
  if (!Number.isFinite(candidate.level) || candidate.level <= 0) {
    return;
  }

  candidates.push({
    ...candidate,
    side: candidate.level > currentPrice ? "resistance" : "support",
  });
}

function addSwingCandidates({
  baseScore,
  candles,
  candidates,
  currentPrice,
  leftRight,
  sourceHigh,
  sourceLow,
}: {
  baseScore: number;
  candles: Candle[];
  candidates: LevelCandidate[];
  currentPrice: number;
  leftRight: number;
  sourceHigh: LevelSource;
  sourceLow: LevelSource;
}) {
  for (let index = leftRight; index < candles.length - leftRight; index += 1) {
    const candle = candles[index];
    const left = candles.slice(index - leftRight, index);
    const right = candles.slice(index + 1, index + 1 + leftRight);

    if (
      candle.high > currentPrice &&
      left.every((item) => candle.high > item.high) &&
      right.every((item) => candle.high > item.high)
    ) {
      pushCandidate(candidates, currentPrice, {
        baseScore,
        level: candle.high,
        source: sourceHigh,
        time: candle.time,
        volume: candle.volume,
      });
    }

    if (
      candle.low < currentPrice &&
      left.every((item) => candle.low < item.low) &&
      right.every((item) => candle.low < item.low)
    ) {
      pushCandidate(candidates, currentPrice, {
        baseScore,
        level: candle.low,
        source: sourceLow,
        time: candle.time,
        volume: candle.volume,
      });
    }
  }
}

function addPreviousHighLowCandidates(
  candles1d: Candle[],
  candidates: LevelCandidate[],
  currentPrice: number,
) {
  const completed = candles1d.slice(0, -1);
  const previousDay = completed.at(-1);
  const previousWeek = completed.slice(-7);
  const previousMonth = completed.slice(-30);

  if (previousDay) {
    pushCandidate(candidates, currentPrice, {
      baseScore: 12,
      level: previousDay.high,
      source: "previous_day_high",
      time: previousDay.time,
      volume: previousDay.volume,
    });
    pushCandidate(candidates, currentPrice, {
      baseScore: 12,
      level: previousDay.low,
      source: supportFlipSource("previous_day_low", previousDay.low, currentPrice),
      time: previousDay.time,
      volume: previousDay.volume,
    });
  }

  if (previousWeek.length > 0) {
    const high = previousWeek.reduce((best, candle) =>
      candle.high > best.high ? candle : best,
    );
    const low = previousWeek.reduce((best, candle) =>
      candle.low < best.low ? candle : best,
    );

    pushCandidate(candidates, currentPrice, {
      baseScore: 25,
      level: high.high,
      source: "previous_week_high",
      time: high.time,
      volume: high.volume,
    });
    pushCandidate(candidates, currentPrice, {
      baseScore: 25,
      level: low.low,
      source: supportFlipSource("previous_week_low", low.low, currentPrice),
      time: low.time,
      volume: low.volume,
    });
  }

  if (previousMonth.length > 0) {
    const high = previousMonth.reduce((best, candle) =>
      candle.high > best.high ? candle : best,
    );
    const low = previousMonth.reduce((best, candle) =>
      candle.low < best.low ? candle : best,
    );

    pushCandidate(candidates, currentPrice, {
      baseScore: 35,
      level: high.high,
      source: "previous_month_high",
      time: high.time,
      volume: high.volume,
    });
    pushCandidate(candidates, currentPrice, {
      baseScore: 35,
      level: low.low,
      source: supportFlipSource("previous_month_low", low.low, currentPrice),
      time: low.time,
      volume: low.volume,
    });
  }
}

function addRoundLevelCandidates(candidates: LevelCandidate[], currentPrice: number) {
  const steps: Array<{ baseScore: number; source: LevelSource; step: number }> = [
    { baseScore: 5, source: "round_level_1000", step: 1_000 },
    { baseScore: 8, source: "round_level_2500", step: 2_500 },
    { baseScore: 15, source: "round_level_5000", step: 5_000 },
    { baseScore: 25, source: "round_level_10000", step: 10_000 },
  ];

  for (const item of steps) {
    const above =
      Math.ceil(currentPrice / item.step) * item.step <= currentPrice
        ? Math.ceil(currentPrice / item.step) * item.step + item.step
        : Math.ceil(currentPrice / item.step) * item.step;
    const below =
      Math.floor(currentPrice / item.step) * item.step >= currentPrice
        ? Math.floor(currentPrice / item.step) * item.step - item.step
        : Math.floor(currentPrice / item.step) * item.step;

    pushCandidate(candidates, currentPrice, {
      baseScore: item.baseScore,
      level: above,
      source: item.source,
    });
    pushCandidate(candidates, currentPrice, {
      baseScore: item.baseScore,
      level: below,
      source: item.source,
    });
  }
}

function addEmaCandidates({
  candidates,
  currentPrice,
  ema20,
  ema50,
  ema200,
}: {
  candidates: LevelCandidate[];
  currentPrice: number;
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
}) {
  const emaCandidates: Array<{
    baseScore: number;
    level: number | null;
    source: LevelSource;
  }> = [
    { baseScore: 8, level: ema20, source: "ema20" },
    { baseScore: 12, level: ema50, source: "ema50" },
    { baseScore: 15, level: ema200, source: "ema200" },
  ];

  for (const item of emaCandidates) {
    if (item.level !== null) {
      pushCandidate(candidates, currentPrice, {
        baseScore: item.baseScore,
        level: item.level,
        source: item.source,
      });
    }
  }
}

function groupCandidates({
  atr4h,
  candidates,
  currentPrice,
  side,
}: {
  atr4h: number;
  candidates: LevelCandidate[];
  currentPrice: number;
  side: LevelSide;
}) {
  const tolerance = Math.max(currentPrice * 0.005, atr4h * 0.5);
  const minimumHalfWidth = Math.max(100, atr4h * 0.12);
  const averageVolume =
    average(candidates.map((candidate) => candidate.volume ?? 0).filter((value) => value > 0)) ?? 0;
  const groups: LevelCandidate[][] = [];

  for (const candidate of candidates
    .filter((item) => item.side === side)
    .sort((left, right) => left.level - right.level)) {
    const group = groups.at(-1);
    const groupMid = group ? average(group.map((item) => item.level)) ?? candidate.level : null;

    if (!group || groupMid === null || Math.abs(candidate.level - groupMid) > tolerance) {
      groups.push([candidate]);
      continue;
    }

    group.push(candidate);
  }

  return groups.map<InternalZone>((group) => {
    const rawLower = Math.min(...group.map((item) => item.level));
    const rawUpper = Math.max(...group.map((item) => item.level));
    const halfWidth =
      rawUpper - rawLower < minimumHalfWidth * 2 ? minimumHalfWidth : (rawUpper - rawLower) / 2;
    const rawMid = average(group.map((item) => item.level)) ?? rawLower;
    const lower = roundTo(Math.min(rawLower, rawMid - halfWidth), 100);
    const upper = roundTo(Math.max(rawUpper, rawMid + halfWidth), 100);
    const mid = roundTo((lower + upper) / 2, 100);
    const rawSources = Array.from(new Set(group.map((item) => item.source)));
    const sources = normalizeZoneSources(rawSources);
    const roundCandidates = group.filter((item) => isRoundSource(item.source));
    const nonRoundCandidates = group.filter((item) => !isRoundSource(item.source));
    const roundBaseScore =
      roundCandidates.length > 0
        ? Math.min(10, Math.max(...roundCandidates.map((item) => item.baseScore)))
        : 0;
    const nonRoundBaseScore = nonRoundCandidates.reduce(
      (sum, item) => sum + item.baseScore,
      0,
    );
    const hasStructuralSource =
      side === "resistance"
        ? sources.some(isStructuralResistanceSource)
        : sources.some((source) => source !== "round_level_cluster");
    const roundOnly = sources.length === 1 && sources[0] === "round_level_cluster";
    const supportFlipOnly =
      side === "resistance" &&
      sources.some(isSupportFlipSource) &&
      sources.every(
        (source) => isSupportFlipSource(source) || source === "round_level_cluster",
      );
    const touchBonus =
      nonRoundCandidates.length >= 3 ? 20 : nonRoundCandidates.length >= 2 ? 10 : 0;
    const weeklyMonthlyBonus = sources.some((source) =>
      /previous_(week|month)|lost_support_flip_(week|month)/.test(source),
    )
      ? 15
      : 0;
    const roundBonus = roundCandidates.length > 0 && hasStructuralSource ? 6 : 0;
    const emaBonus = sources.some((source) => source === "ema50" || source === "ema200") ? 10 : 0;
    const touchVolumes = nonRoundCandidates
      .map((item) => item.volume ?? 0)
      .filter((value) => Number.isFinite(value) && value > 0);
    const elevatedVolume =
      averageVolume > 0 && touchVolumes.some((volume) => volume > averageVolume * 1.2);
    const volumeBonus = elevatedVolume ? 10 : 0;
    const distance =
      side === "resistance"
        ? distanceToResistance(currentPrice, lower, upper)
        : distanceToSupport(currentPrice, lower, upper);
    const distancePenalty = distance > 15 ? 20 : distance > 12 ? 10 : 0;
    const latestTime = Math.max(...group.map((item) => item.time ?? 0)) || null;
    const stalePenalty =
      latestTime && Date.now() - latestTime > 140 * 24 * 60 * 60_000 && sources.length === 1
        ? 10
        : 0;
    const rawScore = Math.max(
      0,
      Math.round(
        nonRoundBaseScore +
          roundBaseScore +
          touchBonus +
          weeklyMonthlyBonus +
          roundBonus +
          emaBonus +
          volumeBonus -
          distancePenalty -
          stalePenalty,
      ),
    );
    const hasSwingHigh = sources.some(
      (source) => source === "4h_swing_high" || source === "1d_swing_high",
    );
    const hasEma = sources.some(
      (source) => source === "ema20" || source === "ema50" || source === "ema200",
    );
    const score = roundOnly
      ? Math.min(rawScore, ROUND_ONLY_SCORE_CAP)
      : supportFlipOnly
        ? Math.min(rawScore, SUPPORT_FLIP_SCORE_CAP)
        : rawScore;

    return {
      distancePercent: percent(distance),
      hasStructuralSource,
      label: formatUsdRange(lower, upper),
      latestTime,
      lower,
      mid,
      onlyWeakRoundLevel: roundOnly,
      score,
      side,
      sources,
      strength: roundOnly
        ? score >= 25
          ? "working"
          : "weak"
        : supportFlipOnly
          ? score >= 45
            ? "strong"
            : strengthFromScore(score)
          : strengthFromScore(score),
      supportFlipOnly,
      touchVolumes,
      touches: nonRoundCandidates.length,
      upper,
    };
  });
}

function publicZone(zone: InternalZone | null): BtcLevelZone | null {
  if (!zone) {
    return null;
  }
  const score = zone.supportFlipOnly
    ? Math.min(zone.score, SUPPORT_FLIP_SCORE_CAP)
    : zone.score;
  const strength =
    zone.supportFlipOnly && zone.strength === "key" ? "strong" : zone.strength;

  return {
    distancePercent: zone.distancePercent,
    label: zone.label,
    lower: zone.lower,
    mid: zone.mid,
    score,
    sources: zone.sources,
    strength,
    upper: zone.upper,
  };
}

function findNearestResistance(zones: InternalZone[], currentPrice: number) {
  return (
    zones
      .filter(
        (zone) =>
          zone.side === "resistance" &&
          zone.score >= MIN_HEADLINE_ZONE_SCORE &&
          zone.hasStructuralSource &&
          !zone.onlyWeakRoundLevel &&
          zone.distancePercent !== null &&
          zone.distancePercent <= 15 &&
          zone.upper >= currentPrice,
      )
      .sort(
        (left, right) =>
          (left.distancePercent ?? Number.POSITIVE_INFINITY) -
            (right.distancePercent ?? Number.POSITIVE_INFINITY) ||
          right.score - left.score,
      )[0] ?? null
  );
}

function supportZones(zones: InternalZone[], currentPrice: number) {
  return (
    zones
      .filter(
        (zone) =>
          zone.side === "support" &&
          zone.score >= MIN_HEADLINE_ZONE_SCORE &&
          !zone.onlyWeakRoundLevel &&
          zone.distancePercent !== null &&
          zone.distancePercent <= 15 &&
          zone.lower <= currentPrice,
      )
      .sort(
        (left, right) =>
          (left.distancePercent ?? Number.POSITIVE_INFINITY) -
            (right.distancePercent ?? Number.POSITIVE_INFINITY) ||
          right.score - left.score,
      )
  );
}

function effectiveMinimumSupportDistance(currentPrice: number, atr4h: number) {
  return Math.max(currentPrice * 0.008, atr4h * 0.25);
}

function findNearestSupport(zones: InternalZone[], currentPrice: number) {
  return supportZones(zones, currentPrice)[0] ?? null;
}

function findActiveSupportZone({
  atr4h,
  currentPrice,
  zones,
}: {
  atr4h: number;
  currentPrice: number;
  zones: InternalZone[];
}) {
  const minimumDistance = effectiveMinimumSupportDistance(currentPrice, atr4h);

  return (
    supportZones(zones, currentPrice).find((zone) => {
      if (currentPrice >= zone.lower && currentPrice <= zone.upper) {
        return true;
      }

      return currentPrice > zone.upper && currentPrice - zone.upper < minimumDistance;
    }) ?? null
  );
}

function findRiskRewardSupport({
  atr4h,
  currentPrice,
  zones,
}: {
  atr4h: number;
  currentPrice: number;
  zones: InternalZone[];
}) {
  const minimumDistance = effectiveMinimumSupportDistance(currentPrice, atr4h);

  return (
    supportZones(zones, currentPrice).find(
      (zone) => zone.upper < currentPrice && currentPrice - zone.upper >= minimumDistance,
    ) ?? null
  );
}

function supportStateFor({
  activeSupportZone,
  currentPrice,
  riskRewardSupport,
}: {
  activeSupportZone: BtcLevelZone | null;
  currentPrice: number;
  riskRewardSupport: BtcLevelZone | null;
}): NonNullable<BtcLevelResponse["supportState"]> {
  if (activeSupportZone) {
    return currentPrice >= activeSupportZone.lower && currentPrice <= activeSupportZone.upper
      ? "inside_support_zone"
      : "near_support_zone";
  }

  return riskRewardSupport ? "above_support" : "no_support_below";
}

function findMinorResistance(zones: InternalZone[]) {
  const zone =
    zones
      .filter(
        (item) =>
          item.side === "resistance" &&
          item.score < MIN_HEADLINE_ZONE_SCORE &&
          item.distancePercent !== null &&
          item.distancePercent <= 6,
      )
      .sort(
        (left, right) =>
          (left.distancePercent ?? Number.POSITIVE_INFINITY) -
          (right.distancePercent ?? Number.POSITIVE_INFINITY),
      )[0] ?? null;

  if (!zone) {
    return null;
  }

  return {
    ...publicZone(zone)!,
    note: zone.onlyWeakRoundLevel ? "minor_round_level" : "weak_cluster",
  };
}

function buildDistantMajorResistance(currentPrice: number | null): BtcDistantMajorResistance {
  const distancePercent =
    currentPrice && currentPrice > 0
      ? percent(((MANUAL_MAJOR_RESISTANCE.lower - currentPrice) / currentPrice) * 100)
      : null;

  return {
    distancePercent,
    label: MANUAL_MAJOR_RESISTANCE.label,
    lower: MANUAL_MAJOR_RESISTANCE.lower,
    mid: (MANUAL_MAJOR_RESISTANCE.lower + MANUAL_MAJOR_RESISTANCE.upper) / 2,
    source: "manual_major_zone",
    upper: MANUAL_MAJOR_RESISTANCE.upper,
  };
}

function calculateRiskRewardRatio({
  currentPrice,
  nearestResistance,
  riskRewardSupport,
}: {
  currentPrice: number;
  nearestResistance: BtcLevelZone | null;
  riskRewardSupport: BtcLevelZone | null;
}) {
  if (!nearestResistance || !riskRewardSupport) {
    return null;
  }

  if (riskRewardSupport.upper >= currentPrice) {
    return null;
  }

  const upsideToResistance = (nearestResistance.lower - currentPrice) / currentPrice;
  const downsideToSupport = (currentPrice - riskRewardSupport.upper) / currentPrice;

  if (upsideToResistance <= 0 || downsideToSupport <= 0) {
    return null;
  }

  return Math.round((upsideToResistance / downsideToSupport) * 100) / 100;
}

function detectOverheated({
  currentPrice,
  ema20,
  nearestResistance,
  rsi,
  sevenDayChangePercent,
}: {
  currentPrice: number;
  ema20: number | null;
  nearestResistance: BtcLevelZone | null;
  rsi: number | null;
  sevenDayChangePercent: number | null;
}) {
  const reasons: string[] = [];

  if (ema20 && currentPrice > ema20 * 1.07) {
    reasons.push("BTC выше EMA20D больше чем на 7%");
  }

  if (rsi !== null && rsi > 70) {
    reasons.push("RSI daily выше 70");
  }

  if (sevenDayChangePercent !== null && sevenDayChangePercent > 11) {
    reasons.push("рост за 7 дней выше 11%");
  }

  if (
    nearestResistance &&
    nearestResistance.distancePercent !== null &&
    nearestResistance.distancePercent <= 1.5
  ) {
    reasons.push("цена подошла к ближайшему сопротивлению");
  }

  return {
    overheated: reasons.length >= 2,
    overheatedReasons: reasons,
  };
}

function findRecentlyBrokenResistance(zones: InternalZone[], currentPrice: number) {
  return (
    zones
      .filter(
        (zone) =>
          zone.side === "resistance" &&
          zone.score >= MIN_HEADLINE_ZONE_SCORE &&
          zone.upper < currentPrice &&
          ((currentPrice - zone.upper) / currentPrice) * 100 <= 1.5,
      )
      .sort((left, right) => right.upper - left.upper)[0] ?? null
  );
}

function buildLevelAction({
  activeSupportZone,
  currentPrice,
  minorResistance,
  nearestResistance,
  overheated,
  recentlyBrokenResistance,
  riskRewardSupport,
  riskRewardRatio,
  supportState,
}: {
  activeSupportZone: BtcLevelZone | null;
  currentPrice: number | null;
  minorResistance: BtcLevelZone | null;
  nearestResistance: BtcLevelZone | null;
  overheated: boolean;
  recentlyBrokenResistance: BtcLevelZone | null;
  riskRewardSupport: BtcLevelZone | null;
  riskRewardRatio: number | null;
  supportState: NonNullable<BtcLevelResponse["supportState"]>;
}): BtcLevelAction {
  if (!currentPrice) {
    return {
      code: "LEVEL_PENDING",
      reasons: ["Ближайшая рабочая зона ещё не подтверждена"],
      text: "Ближайшая зона BTC уточняется по свежим данным. Дальнюю зону нельзя считать рабочим уровнем для входа.",
      title: "Уровень уточняется",
    };
  }

  if (!nearestResistance) {
    if (
      minorResistance &&
      typeof minorResistance.distancePercent === "number" &&
      minorResistance.distancePercent <= 1.5
    ) {
      return {
        code: "WAIT",
        reasons: ["BTC рядом с психологическим уровнем без структурного подтверждения"],
        text: "BTC рядом с психологическим уровнем, но сильная рабочая зона выше. Лучше не входить крупно без подтверждения.",
        title: "Без спешки",
      };
    }

    return {
      code: "LEVEL_PENDING",
      reasons: ["Ближайшая рабочая зона ещё не подтверждена"],
      text: "Ближайшая зона BTC уточняется по свежим данным. Дальнюю зону нельзя считать рабочим уровнем для входа.",
      title: "Уровень уточняется",
    };
  }

  if (recentlyBrokenResistance) {
    return {
      code: "WAIT_BREAKOUT_CONFIRMATION",
      reasons: ["BTC пробует выйти выше рабочей зоны"],
      text: "BTC пробует выйти выше зоны. Лучше дождаться закрепления или ретеста, а не догонять свечу.",
      title: "Ждать закрепления",
    };
  }

  const resistanceDistancePercent =
    nearestResistance.distancePercent ??
    distanceToResistance(currentPrice, nearestResistance.lower, nearestResistance.upper);
  const closeToSupport =
    activeSupportZone !== null &&
    (supportState === "inside_support_zone" || supportState === "near_support_zone");

  if (closeToSupport && resistanceDistancePercent < 2) {
    return {
      code: "WAIT_RANGE",
      reasons: ["BTC рядом с поддержкой", "Ближайшее сопротивление тоже близко"],
      text: "BTC зажат между ближайшей поддержкой и сопротивлением. Лучше дождаться выхода из диапазона, отката или закрепления выше зоны.",
      title: "Ждать",
    };
  }

  if (resistanceDistancePercent < 1.5) {
    return {
      code: "DO_NOT_CHASE",
      reasons: ["BTC подошёл к ближайшей зоне сопротивления"],
      text: "BTC подошёл к ближайшей зоне сопротивления. Для новых входов лучше ждать откат, закрепление или ретест.",
      title: "Не догонять",
    };
  }

  if (resistanceDistancePercent < 4) {
    return {
      code: "WAIT",
      reasons: ["До ближайшего сопротивления небольшой запас"],
      text: "До ближайшего сопротивления есть небольшой запас, но входить крупно уже поздно. Лучше ждать откат или работать только через аккуратный DCA.",
      title: "Без спешки",
    };
  }

  if (
    resistanceDistancePercent <= 8 &&
    riskRewardRatio !== null &&
    riskRewardRatio > 1.3 &&
    !overheated
  ) {
    return {
      code: "DCA_SMALL",
      reasons: ["Есть пространство до сопротивления", "Risk/reward выше 1.3"],
      text: "До ближайшей зоны сопротивления есть пространство. Для core-активов допустим плановый DCA без агрессивного входа.",
      title: "Можно DCA малыми частями",
    };
  }

  if (!riskRewardSupport || riskRewardRatio === null || riskRewardRatio < 1 || overheated) {
    return {
      code: "WAIT",
      reasons: [
        overheated ? "BTC выглядит перегретым" : "Соотношение риска и движения слабое",
      ],
      text: "Сопротивление выше, но цена не у поддержки. Соотношение риска и движения сейчас слабое.",
      title: "Лучше ждать",
    };
  }

  return {
    code: "DCA_SMALL",
    reasons: ["Сопротивление не близко", "Risk/reward рабочий"],
    text: "До ближайшей зоны сопротивления есть пространство. Вход допустим только малыми частями и без плечей.",
    title: "Можно DCA малыми частями",
  };
}

function confidenceFromZone(zone: BtcLevelZone | null): BtcLevelConfidence {
  if (!zone) {
    return "low";
  }

  if (zone.score >= 65) {
    return "high";
  }

  if (zone.score >= 45) {
    return "medium";
  }

  return "low";
}

function buildPendingLevel({
  cacheStatus,
  currentPrice,
  metaPatch,
  providerDebug = [],
}: {
  cacheStatus: BtcLevelDebug["cacheStatus"];
  currentPrice: number | null;
  metaPatch?: OhlcMetaPatch;
  providerDebug?: OhlcProviderDebug[];
}) {
  const updatedAt = new Date().toISOString();
  const distantMajorResistance = buildDistantMajorResistance(currentPrice);
  const payload: BtcLevelResponse = {
    ...btcLevelFallback,
    activeSupportZone: null,
    currentPrice,
    distantMajorResistance,
    majorResistance: {
      high: MANUAL_MAJOR_RESISTANCE.upper,
      label: MANUAL_MAJOR_RESISTANCE.label,
      low: MANUAL_MAJOR_RESISTANCE.lower,
    },
    meta: {
      cacheTtlMinutes: 15,
      calculatedAt: updatedAt,
      candles4h: 0,
      candles1d: 0,
      candleSource: metaPatch?.candleSource ?? null,
      elapsedMs: metaPatch?.elapsedMs ?? 0,
      fallbackUsed: metaPatch?.fallbackUsed ?? false,
      levelModelVersion: LEVEL_MODEL_VERSION,
      ohlcStatus: metaPatch?.ohlcStatus ?? "pending",
      providerAttemptsCount: metaPatch?.providerAttemptsCount ?? 0,
      source: "level_pending",
    },
    riskRewardSupport: null,
    updatedAt,
    supportState: "no_support_below",
  };

  return {
    debug: {
      activeSupportZone: null,
      cacheStatus,
      currentPrice,
      levelState: "level_pending",
      meta: payload.meta!,
      minorResistance: null,
      nearestResistance: null,
      nearestSupport: null,
      providerDebug,
      riskRewardSupport: null,
      riskRewardRatio: null,
      supportState: "no_support_below",
      zones: [],
    },
    payload,
  } satisfies BtcLevelBuildResult;
}

function buildDynamicLevel({
  candles1d,
  candles4h,
  currentPrice,
}: {
  candles1d: Candle[];
  candles4h: Candle[];
  currentPrice: number;
}): BtcLevelBuildResult {
  const closes1d = candles1d.map((candle) => candle.close);
  const atr4h = calculateAtr(candles4h) ?? currentPrice * 0.008;
  const atr1d = calculateAtr(candles1d) ?? currentPrice * 0.018;
  const ema20 = calculateEma(closes1d, 20);
  const ema50 = calculateEma(closes1d, 50);
  const ema200 = calculateEma(closes1d, 200);
  const rsi = calculateRsi(closes1d, 14);
  const sevenDayAgo = closes1d.at(-8) ?? null;
  const sevenDayChangePercent =
    sevenDayAgo && sevenDayAgo > 0
      ? ((currentPrice - sevenDayAgo) / sevenDayAgo) * 100
      : null;
  const candidates: LevelCandidate[] = [];

  addSwingCandidates({
    baseScore: 18,
    candles: candles4h.slice(-540),
    candidates,
    currentPrice,
    leftRight: 3,
    sourceHigh: "4h_swing_high",
    sourceLow: "4h_swing_low",
  });
  addSwingCandidates({
    baseScore: 30,
    candles: candles1d.slice(-365),
    candidates,
    currentPrice,
    leftRight: 2,
    sourceHigh: "1d_swing_high",
    sourceLow: "1d_swing_low",
  });
  addPreviousHighLowCandidates(candles1d, candidates, currentPrice);
  addRoundLevelCandidates(candidates, currentPrice);
  addEmaCandidates({
    candidates,
    currentPrice,
    ema20,
    ema50,
    ema200,
  });

  const zones = [
    ...groupCandidates({
      atr4h,
      candidates,
      currentPrice,
      side: "resistance",
    }),
    ...groupCandidates({
      atr4h,
      candidates,
      currentPrice,
      side: "support",
    }),
  ];
  const nearestResistanceInternal = findNearestResistance(zones, currentPrice);
  const nearestSupportInternal = findNearestSupport(zones, currentPrice);
  const activeSupportZoneInternal = findActiveSupportZone({
    atr4h,
    currentPrice,
    zones,
  });
  const riskRewardSupportInternal = findRiskRewardSupport({
    atr4h,
    currentPrice,
    zones,
  });
  const recentlyBrokenResistance = publicZone(
    findRecentlyBrokenResistance(zones, currentPrice),
  );
  const nearestResistance = publicZone(nearestResistanceInternal);
  const activeSupportZone = publicZone(activeSupportZoneInternal);
  const nearestSupport = publicZone(nearestSupportInternal);
  const riskRewardSupport = publicZone(riskRewardSupportInternal);
  const minorResistance = findMinorResistance(zones);
  const distantMajorResistance = buildDistantMajorResistance(currentPrice);
  const supportState = supportStateFor({
    activeSupportZone,
    currentPrice,
    riskRewardSupport,
  });
  const riskRewardRatio = calculateRiskRewardRatio({
    currentPrice,
    nearestResistance,
    riskRewardSupport,
  });
  const { overheated, overheatedReasons } = detectOverheated({
    currentPrice,
    ema20,
    nearestResistance,
    rsi,
    sevenDayChangePercent,
  });
  const action = buildLevelAction({
    activeSupportZone,
    currentPrice,
    minorResistance,
    nearestResistance,
    overheated,
    recentlyBrokenResistance,
    riskRewardSupport,
    riskRewardRatio,
    supportState,
  });
  const levelState = nearestResistance ? "dynamic_ready" : "level_pending";
  const label = nearestResistance?.label ?? "Уровень уточняется";
  const confidence = confidenceFromZone(nearestResistance);
  const updatedAt = new Date().toISOString();
  const payload: BtcLevelResponse = {
    action,
    activeSupportZone,
    aboveScenario: nearestResistance
      ? "Закрепление выше ближайшей зоны снижает давление продавцов."
      : "Ближайшая рабочая зона уточняется.",
    bearishScenario: riskRewardSupport ?? nearestSupport
      ? "Потеря ближайшей поддержки повышает риск движения ниже."
      : "Без подтверждённой поддержки риск входа оценивается осторожнее.",
    belowScenario: riskRewardSupport ?? nearestSupport
      ? "Потеря ближайшей поддержки повышает риск движения ниже."
      : "Ближайшая поддержка уточняется.",
    bullishScenario: nearestResistance
      ? "Закрепление выше ближайшей зоны снижает давление продавцов."
      : "Ближайшая рабочая зона уточняется.",
    confidence,
    currentPrice,
    dataQuality: levelState === "dynamic_ready" ? "full" : "partial",
    distancePercent: nearestResistance?.distancePercent ?? null,
    distantMajorResistance,
    explanation: nearestResistance
      ? "Ближайшая зона рассчитана по 4H/1D swing high/low, previous high/low, EMA, ATR и кластерам круглых уровней."
      : "Ближайшая сильная зона выше цены пока не подтверждена по свежим OHLC.",
    keyLevel: nearestResistance?.mid ?? null,
    keyLevelRange: label,
    levelLabel: label,
    levelModelVersion: LEVEL_MODEL_VERSION,
    levelState,
    majorResistance: {
      high: MANUAL_MAJOR_RESISTANCE.upper,
      label: MANUAL_MAJOR_RESISTANCE.label,
      low: MANUAL_MAJOR_RESISTANCE.lower,
    },
    meta: {
      atr14_4h: Math.round(atr4h),
      atr14_1d: Math.round(atr1d),
      cacheTtlMinutes: 15,
      calculatedAt: updatedAt,
      candles4h: candles4h.length,
      candles1d: candles1d.length,
      ema20Daily: ema20 === null ? null : Math.round(ema20),
      ema50Daily: ema50 === null ? null : Math.round(ema50),
      ema200Daily: ema200 === null ? null : Math.round(ema200),
      levelModelVersion: LEVEL_MODEL_VERSION,
      overheated,
      overheatedReasons,
      rsiDaily: rsi === null ? null : Math.round(rsi * 10) / 10,
      sevenDayChangePercent: percent(sevenDayChangePercent),
      source: "ohlc_dynamic",
    },
    minorResistance,
    nearestResistance,
    nearestSupport,
    nextResistance: nearestResistance?.label ?? null,
    nextSupport: nearestSupport?.label ?? null,
    riskRewardSupport,
    riskRewardRatio,
    source: "ohlc_dynamic",
    supportState,
    type: nearestResistance ? "resistance" : "level_pending",
    updatedAt,
  };

  return {
    debug: {
      activeSupportZone,
      cacheStatus: "refresh-ok",
      currentPrice,
      levelState,
      meta: payload.meta!,
      minorResistance,
      nearestResistance,
      nearestSupport,
      providerDebug: [],
      riskRewardSupport,
      riskRewardRatio,
      supportState,
      zones: zones
        .sort((left, right) => {
          if (left.side !== right.side) {
            return left.side === "resistance" ? -1 : 1;
          }

          return (
            (left.distancePercent ?? Number.POSITIVE_INFINITY) -
              (right.distancePercent ?? Number.POSITIVE_INFINITY) ||
            right.score - left.score
          );
        })
        .slice(0, 18)
        .map((zone) => ({
          distancePercent: zone.distancePercent,
          label: zone.label,
          score: zone.supportFlipOnly
            ? Math.min(zone.score, SUPPORT_FLIP_SCORE_CAP)
            : zone.score,
          side: zone.side,
          sources: zone.sources,
          strength:
            zone.supportFlipOnly && zone.strength === "key" ? "strong" : zone.strength,
        })),
    },
    payload,
  };
}

function withDebugStatus(
  result: BtcLevelBuildResult,
  cacheStatus: BtcLevelDebug["cacheStatus"],
  providerDebug?: OhlcProviderDebug[],
) {
  return {
    debug: {
      ...result.debug,
      cacheStatus,
      providerDebug: providerDebug ?? result.debug.providerDebug,
    },
    payload: result.payload,
  };
}

function withOhlcMeta(
  result: BtcLevelBuildResult,
  metaPatch: OhlcMetaPatch,
  providerDebug?: OhlcProviderDebug[],
) {
  const meta = {
    ...(result.payload.meta ?? {}),
    ...metaPatch,
  };

  return {
    debug: {
      ...result.debug,
      meta,
      providerDebug: providerDebug ?? result.debug.providerDebug,
    },
    payload: {
      ...result.payload,
      dataQuality: metaPatch.fallbackUsed ? ("partial" as const) : result.payload.dataQuality,
      meta,
    },
  } satisfies BtcLevelBuildResult;
}

function btcLevelResponse(result: BtcLevelBuildResult, debugMode: boolean) {
  const payload = debugMode
    ? {
        ...result.payload,
        providerDebug: result.debug.providerDebug,
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
  const url = new URL(request.url);
  const debugMode = url.searchParams.get("debug") === "1";
  const currentPriceOverride =
    numberFrom(url.searchParams.get("currentPrice")) ??
    numberFrom(url.searchParams.get("priceForLevel")) ??
    numberFrom(url.searchParams.get("price"));
  const hasPriceOverride = currentPriceOverride !== null;

  if (
    btcLevelCache &&
    Date.now() - btcLevelCache.updatedAtMs < BTC_LEVEL_CACHE_TTL_MS &&
    !hasPriceOverride
  ) {
    return btcLevelResponse(withDebugStatus(btcLevelCache, "hit"), debugMode);
  }

  try {
    const ohlc = await fetchOhlcBundle();
    const { candles1d, candles4h } = ohlc;
    const currentPrice =
      currentPriceOverride ?? candles4h.at(-1)?.close ?? candles1d.at(-1)?.close ?? null;
    const providerAttemptsCount = ohlc.providerDebug.length;

    if (
      !currentPrice ||
      candles4h.length < MIN_CANDLES_4H ||
      candles1d.length < MIN_CANDLES_1D
    ) {
      if (
        lastGoodBtcLevel &&
        Date.now() - lastGoodBtcLevel.updatedAtMs < BTC_LEVEL_LAST_GOOD_TTL_MS
      ) {
        const lastGood = withOhlcMeta(
          withDebugStatus(lastGoodBtcLevel, "last-good", ohlc.providerDebug),
          {
            candleSource: "last_good",
            elapsedMs: ohlc.elapsedMs,
            fallbackUsed: true,
            ohlcStatus: "last_good",
            providerAttemptsCount,
          },
          ohlc.providerDebug,
        );

        return btcLevelResponse(lastGood, debugMode);
      }

      const pending = buildPendingLevel({
        cacheStatus: "fallback",
        currentPrice,
        metaPatch: {
          candleSource: null,
          elapsedMs: ohlc.elapsedMs,
          fallbackUsed: false,
          ohlcStatus: currentPrice ? ohlc.ohlcStatus : "pending",
          providerAttemptsCount,
        },
        providerDebug: ohlc.providerDebug,
      });

      return btcLevelResponse(pending, debugMode);
    }

    const result = withOhlcMeta(
      buildDynamicLevel({
        candles1d,
        candles4h,
        currentPrice,
      }),
      {
        candleSource: ohlc.candleSource,
        elapsedMs: ohlc.elapsedMs,
        fallbackUsed: false,
        ohlcStatus: "ready",
        providerAttemptsCount,
      },
      ohlc.providerDebug,
    );
    const cachedResult: BtcLevelCacheEntry = {
      ...withDebugStatus(result, "refresh-ok"),
      updatedAtMs: Date.now(),
    };

    if (!hasPriceOverride) {
      btcLevelCache = cachedResult;

      if (cachedResult.payload.levelState === "dynamic_ready") {
        lastGoodBtcLevel = cachedResult;
      }
    }

    return btcLevelResponse(cachedResult, debugMode);
  } catch {
    if (
      lastGoodBtcLevel &&
      Date.now() - lastGoodBtcLevel.updatedAtMs < BTC_LEVEL_LAST_GOOD_TTL_MS
    ) {
      const lastGood = withOhlcMeta(
        withDebugStatus(lastGoodBtcLevel, "last-good", []),
        {
          candleSource: "last_good",
          elapsedMs: 0,
          fallbackUsed: true,
          ohlcStatus: "last_good",
          providerAttemptsCount: 0,
        },
        [],
      );

      return btcLevelResponse(lastGood, debugMode);
    }

    const fallback = buildPendingLevel({
      cacheStatus: "fallback",
      currentPrice: currentPriceOverride ?? null,
      metaPatch: {
        candleSource: null,
        elapsedMs: 0,
        fallbackUsed: false,
        ohlcStatus: "error",
        providerAttemptsCount: 0,
      },
      providerDebug: [],
    });

    return btcLevelResponse(fallback, debugMode);
  }
}
