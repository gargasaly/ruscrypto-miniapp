import { btcRiskFallback, type RiskEvent, type RiskImpact } from "@/lib/riskCalendar";
import type {
  BtcDistantMajorResistance,
  BtcLevelAction,
  BtcLevelResponse,
  BtcLevelZone,
} from "@/lib/btcLevel";
import {
  readHomeLiveState,
  writeHomeLiveState,
  type HomeLiveStatePayload,
} from "@/lib/homeLive/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type HomeLiveTone = "green" | "red" | "yellow";
type HomeLiveDataStatus = "fallback" | "partial" | "ready";
type HomeLiveLevelType =
  | "major_resistance"
  | "near_resistance"
  | "neutral"
  | "resistance_above"
  | "support";

type UnknownRecord = Record<string, unknown>;

type PricePoint = {
  change24h?: number | null;
  price?: number | null;
  source?: string;
  updatedAt?: string;
};

type PricesResponse = {
  cacheStatus?: string;
  prices?: Record<string, PricePoint>;
  updatedAt?: string;
};

type RisksResponse = {
  cacheOnly?: boolean;
  cacheStatus?: "fallback" | "hit" | "last-good" | "miss" | "refresh-ok" | string;
  events?: RiskEvent[];
  mainRisk?: RiskEvent;
  updatedAt?: string;
  sources?: {
    macro?: string;
    crypto?: string;
    unlocks?: string;
  };
};

type HomeSnapshotResponse = {
  btc?: {
    change24h?: number | null;
    price?: number | null;
  };
  btcChange24h?: number | null;
  btcLevel?: {
    currentPrice?: number | null;
    majorResistance?: {
      high?: number | null;
      label?: string | null;
      low?: number | null;
    };
  };
  btcPrice?: number | null;
  mainRisk?: RiskEvent;
  updatedAt?: string;
};

type ImportantHomeEvent = {
  affectedAssets: string[];
  category: string;
  impact: RiskImpact;
  time: string | null;
  title: string;
};

const HOME_TIMEZONE = "Europe/Moscow";
const HOME_DISTANT_MAJOR_RESISTANCE = {
  high: 82_000,
  label: "$80,000–82,000",
  low: 80_000,
};
const LEVEL_MODEL_VERSION = "btc-level-v2" as const;
const HOME_PRICE_TIMEOUT_MS = 1_500;
const HOME_RISK_CACHE_TIMEOUT_MS = 1_200;
const HOME_LEVEL_TIMEOUT_MS = 2_500;
const HIGH_EVENT_DIGEST_WINDOW_MINUTES = 120;

type TimedFetchResult<T> = {
  error: string | null;
  ms: number;
  ok: boolean;
  value: T | null;
};

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

function priceMismatchPercent(left: number | null, right: number | null) {
  if (!left || !right || left <= 0 || right <= 0) {
    return null;
  }

  return Math.round((Math.abs(left - right) / left) * 1000) / 10;
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs: number) {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | null = null;

  try {
    const response = await Promise.race([
      fetch(url, {
        cache: "no-store",
        signal: controller.signal,
      }),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new Error("home-live-timeout"));
        }, timeoutMs);
      }),
    ]);

    if (!response.ok) {
      throw new Error(`http-${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function timedFetchJson<T>(
  url: string,
  timeoutMs: number,
): Promise<TimedFetchResult<T>> {
  const startedAt = Date.now();

  try {
    const value = await fetchJsonWithTimeout<T>(url, timeoutMs);

    return {
      error: null,
      ms: Date.now() - startedAt,
      ok: true,
      value,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "request-failed",
      ms: Date.now() - startedAt,
      ok: false,
      value: null,
    };
  }
}

function formatLocalDate(date: Date, timeZone = HOME_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function getLocalMinutes(date: Date, timeZone = HOME_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone,
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = Number(values.hour);
  const minute = Number(values.minute);

  return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : 0;
}

function parseEventTimeMinutes(time?: string | null) {
  if (!time) {
    return null;
  }

  const match = time.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  return hour * 60 + minute;
}

function highImpact(event: RiskEvent) {
  return (
    event.impact === "high" ||
    /высокое влияние|🔴/i.test(event.impactLabel ?? "")
  );
}

function isInformationalMediaEvent(event: RiskEvent) {
  const text = [
    event.title,
    event.description,
    event.source,
    event.whatIsIt,
    event.marketRelevance,
    event.marketRelevanceLabel,
    event.category,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const hasMediaSignal =
    /hackernoon|media|publication|content|article|community|ama\b|x space|twitter space|webinar|meetup|generic conference|\bconference\b/.test(
      text,
    );
  const hasHardDriver =
    /fed|fomc|cpi|ppi|pce|nfp|unemployment|gdp|etf|sec\b|court|lawsuit|regulat|large token unlock|major network upgrade|geopolitical|oil|risk-off/.test(
      text,
    );

  return hasMediaSignal && !hasHardDriver;
}

function affectsBtcMarket(event: RiskEvent) {
  const assets = new Set(event.affectedAssets.map((asset) => asset.toUpperCase()));
  const text = `${event.title} ${event.description ?? ""} ${event.whatIsIt ?? ""}`.toLowerCase();

  return (
    event.category === "macro" ||
    event.category === "crypto" ||
    event.marketRelevance === "market-wide" ||
    event.marketRelevance === "major-token" ||
    assets.has("BTC") ||
    assets.has("ETH") ||
    assets.has("ALTS") ||
    assets.has("MARKET") ||
    assets.has("ALL") ||
    /\bfed\b|fomc|cpi|ppi|pce|nfp|unemployment|gdp|etf|sec\b|lawsuit|regulation|risk-off|btc|bitcoin|ethereum|eth/.test(
      text,
    )
  );
}

function isImportantHomeEvent(event: RiskEvent, localDate: string) {
  return (
    event.date === localDate &&
    event.status !== "fallback" &&
    highImpact(event) &&
    affectsBtcMarket(event) &&
    !isInformationalMediaEvent(event)
  );
}

function eventStage(event: RiskEvent, nowMinutes: number) {
  const eventMinutes = parseEventTimeMinutes(event.time);

  if (eventMinutes === null) {
    return "upcoming" as const;
  }

  if (nowMinutes < eventMinutes) {
    return "upcoming" as const;
  }

  if (nowMinutes - eventMinutes <= HIGH_EVENT_DIGEST_WINDOW_MINUTES) {
    return "digest" as const;
  }

  return "passed" as const;
}

function sortImportantEvents(events: RiskEvent[], nowMinutes: number) {
  const stagePriority = {
    upcoming: 3,
    digest: 2,
    passed: 1,
  };

  return [...events].sort((left, right) => {
    const stageDiff =
      stagePriority[eventStage(right, nowMinutes)] -
      stagePriority[eventStage(left, nowMinutes)];

    if (stageDiff !== 0) {
      return stageDiff;
    }

    return (
      (parseEventTimeMinutes(left.time) ?? 24 * 60) -
      (parseEventTimeMinutes(right.time) ?? 24 * 60)
    );
  });
}

function formatEventList(events: RiskEvent[]) {
  return events
    .slice(0, 2)
    .map((event) => event.title)
    .join(" / ");
}

function extractPrice(prices: PricesResponse | null, snapshot: HomeSnapshotResponse | null) {
  const btc = prices?.prices?.BTC;
  const price =
    numberOrNull(btc?.price) ??
    numberOrNull(snapshot?.btcPrice) ??
    numberOrNull(snapshot?.btc?.price) ??
    numberOrNull(snapshot?.btcLevel?.currentPrice);
  const change24h =
    numberOrNull(btc?.change24h) ??
    numberOrNull(snapshot?.btcChange24h) ??
    numberOrNull(snapshot?.btc?.change24h);

  return {
    change24h,
    price,
    source:
      btc?.price !== null && btc?.price !== undefined
        ? btc.source ?? "prices"
        : price !== null
          ? "snapshot"
          : "missing",
    updatedAt: btc?.updatedAt ?? prices?.updatedAt ?? snapshot?.updatedAt ?? new Date().toISOString(),
  };
}

function buildFallbackDistantMajorResistance(price: number | null): BtcDistantMajorResistance {
  return {
    distancePercent:
      price && price > 0
        ? Math.round(((HOME_DISTANT_MAJOR_RESISTANCE.low - price) / price) * 1000) / 10
        : null,
    label: HOME_DISTANT_MAJOR_RESISTANCE.label,
    lower: HOME_DISTANT_MAJOR_RESISTANCE.low,
    mid: (HOME_DISTANT_MAJOR_RESISTANCE.low + HOME_DISTANT_MAJOR_RESISTANCE.high) / 2,
    source: "manual_major_zone",
    upper: HOME_DISTANT_MAJOR_RESISTANCE.high,
  };
}

function buildLevel(price: number | null, btcLevel: BtcLevelResponse | null) {
  const nearestResistance = btcLevel?.nearestResistance ?? null;
  const nearestSupport = btcLevel?.nearestSupport ?? null;
  const activeSupportZone = btcLevel?.activeSupportZone ?? null;
  const riskRewardSupport = btcLevel?.riskRewardSupport ?? null;
  const distantMajorResistance =
    btcLevel?.distantMajorResistance ?? buildFallbackDistantMajorResistance(price);
  const minorResistance = btcLevel?.minorResistance ?? null;
  const levelState = btcLevel?.levelState ?? "level_pending";
  const modelReady = btcLevel?.levelModelVersion === LEVEL_MODEL_VERSION;

  if (
    modelReady &&
    levelState === "dynamic_ready" &&
    nearestResistance &&
    nearestResistance.score >= 35 &&
    nearestResistance.strength !== "weak"
  ) {
    const nearResistance =
      typeof nearestResistance.distancePercent === "number" &&
      nearestResistance.distancePercent < 1.5;

    return {
      action: btcLevel.action,
      activeSupportZone,
      currentPrice: btcLevel.currentPrice ?? price,
      distancePercent: nearestResistance.distancePercent,
      distantMajorResistance,
      label: nearestResistance.label ?? `$${nearestResistance.lower}–${nearestResistance.upper}`,
      levelModelVersion: LEVEL_MODEL_VERSION,
      levelState,
      minorResistance,
      nearestResistance,
      nearestSupport,
      riskRewardSupport,
      riskRewardRatio: btcLevel.riskRewardRatio ?? null,
      source: btcLevel.source ?? "ohlc_dynamic",
      supportState: btcLevel.supportState,
      text:
        btcLevel.action?.text ??
        "Рабочая зона рассчитана по свежим 4H/1D свечам, ATR, EMA и ближайшим кластерам.",
      title: "Ближайшая зона BTC",
      type: nearResistance ? ("near_resistance" as HomeLiveLevelType) : ("resistance_above" as HomeLiveLevelType),
    };
  }

  return {
    action: btcLevel?.action,
    activeSupportZone,
    currentPrice: btcLevel?.currentPrice ?? price,
    distancePercent: null,
    distantMajorResistance,
    label: "Уровень уточняется",
    levelModelVersion: LEVEL_MODEL_VERSION,
    levelState: "level_pending" as const,
    minorResistance,
    nearestResistance: null,
    nearestSupport,
    riskRewardSupport,
    riskRewardRatio: btcLevel?.riskRewardRatio ?? null,
    source: btcLevel?.source ?? "level_pending",
    supportState: btcLevel?.supportState,
    text:
      "Ближайшая рабочая зона BTC уточняется по свежим данным. Дальнюю зону нельзя считать уровнем для входа.",
    title: "Ближайший уровень уточняется",
    type: "neutral" as HomeLiveLevelType,
  };
}

function buildRiskBlock({
  importantEvents,
  riskReady,
  riskPartial,
  nowMinutes,
}: {
  importantEvents: RiskEvent[];
  nowMinutes: number;
  riskPartial: boolean;
  riskReady: boolean;
}) {
  if (!riskReady) {
    return {
      affectedAssets: ["BTC", "ETH", "ALTS"],
      category: "macro",
      description:
        "Обновляем календарь рисков. До проверки важных событий не спешите с входом.",
      impact: "medium" as RiskImpact,
      time: null,
      title: "Проверяем события дня…",
    };
  }

  if (importantEvents.length > 0) {
    const sorted = sortImportantEvents(importantEvents, nowMinutes);
    const titleList = formatEventList(sorted);
    const first = sorted[0];
    const allPassed = sorted.every((event) => eventStage(event, nowMinutes) === "passed");

    return {
      affectedAssets: Array.from(new Set(sorted.flatMap((event) => event.affectedAssets))).slice(
        0,
        6,
      ),
      category: first.category,
      description: allPassed
        ? `Сегодня уже были важные события: ${titleList}. Рынок может продолжать переваривать данные через доллар, доходности и общий risk-on/risk-off фон.`
        : `Сегодня важные макро-данные: ${titleList}. Они могут повлиять на BTC, ETH и альты через доллар, доходности и общий risk-on/risk-off фон.`,
      impact: "high" as RiskImpact,
      time: first.time ?? null,
      title: allPassed ? "Важные макро-события уже были сегодня" : "Высокий макро-риск сегодня",
    };
  }

  if (riskPartial) {
    return {
      affectedAssets: ["BTC", "ETH", "ALTS"],
      category: "macro",
      description:
        "Используем последний сохранённый календарь. Если сегодня есть high-события, они будут учтены после обновления.",
      impact: "medium" as RiskImpact,
      time: null,
      title: "События обновляются",
    };
  }

  return {
    affectedAssets: ["BTC"],
    category: "macro",
    description:
      "Сегодня крупных событий риска в календаре не найдено. Рынок больше смотрит на цену BTC, уровни и общий фон.",
    impact: "low" as RiskImpact,
    time: null,
    title: "Крупных BTC-рисков нет",
  };
}

function buildAction({
  change24h,
  importantEvents,
  level,
  priceReady,
  riskReady,
  riskPartial,
  nowMinutes,
}: {
  change24h: number | null;
  importantEvents: RiskEvent[];
  level: ReturnType<typeof buildLevel>;
  nowMinutes: number;
  priceReady: boolean;
  riskPartial: boolean;
  riskReady: boolean;
}) {
  if (!priceReady || !riskReady) {
    return {
      reason:
        "Обновляем цену BTC, важные события и уровни. До загрузки данных не спешите с входом.",
      status: "Проверяю рынок…",
      tone: "yellow" as HomeLiveTone,
      whatToWait: "Дождаться полной проверки цены и календаря.",
    };
  }

  const sortedEvents = sortImportantEvents(importantEvents, nowMinutes);
  const upcomingEvents = sortedEvents.filter(
    (event) => eventStage(event, nowMinutes) === "upcoming",
  );
  const digestEvents = sortedEvents.filter((event) => eventStage(event, nowMinutes) === "digest");
  const passedEvents = sortedEvents.filter((event) => eventStage(event, nowMinutes) === "passed");
  const titleList = formatEventList(sortedEvents);

  if (riskPartial && sortedEvents.length === 0) {
    return {
      reason:
        "События дня обновляются. Используем последний сохранённый календарь, поэтому до полной проверки риска лучше не считать рынок полностью спокойным.",
      status: "Проверяю рынок…",
      tone: "yellow" as HomeLiveTone,
      whatToWait: "Дождаться обновления календаря рисков.",
    };
  }

  if (upcomingEvents.length > 0) {
    return {
      reason: `Сегодня важные события: ${formatEventList(upcomingEvents)}. Они могут резко повлиять на BTC, ETH и альты. До выхода данных безопаснее не заходить всей суммой.`,
      status: "Не входить всей суммой до данных",
      tone: "red" as HomeLiveTone,
      whatToWait: "Дождаться публикации данных и первой реакции BTC.",
    };
  }

  if (digestEvents.length > 0) {
    return {
      reason:
        "Важные данные уже вышли, но рынку нужно время на реакцию. Лучше не принимать решение по первой свече.",
      status: "Ждать реакцию рынка",
      tone: "yellow" as HomeLiveTone,
      whatToWait: "Посмотреть реакцию BTC в течение ближайших часов.",
    };
  }

  if (passedEvents.length > 0 && typeof change24h === "number" && change24h <= -3) {
    return {
      reason: `Сегодня были важные события: ${titleList}, а BTC заметно снижается за 24 часа. Лучше дождаться стабилизации реакции рынка.`,
      status: "Ждать реакцию рынка",
      tone: "yellow" as HomeLiveTone,
      whatToWait: "Дождаться замедления падения и спокойной реакции BTC.",
    };
  }

  if (typeof change24h === "number" && change24h >= 6) {
    return {
      reason:
        "BTC резко вырос за сутки. После сильного движения вход лучше делать осторожно и не всей суммой.",
      status: "Покупать частями",
      tone: "yellow" as HomeLiveTone,
      whatToWait: "Дождаться спокойной реакции после импульса.",
    };
  }

  if (level.levelState === "level_pending") {
    if (level.action?.code === "WAIT") {
      return {
        reason: level.action.text,
        status: level.action.title,
        tone: "yellow" as HomeLiveTone,
        whatToWait: "Дождаться структурного подтверждения ближайшей рабочей зоны.",
      };
    }

    return {
      reason:
        "Ближайшая зона BTC уточняется по свежим свечам. Дальнюю зону нельзя считать рабочим уровнем для входа.",
      status: "Уровень уточняется",
      tone: "yellow" as HomeLiveTone,
      whatToWait: "Дождаться расчёта ближайшей зоны поддержки и сопротивления.",
    };
  }

  if (level.action?.code === "DO_NOT_CHASE") {
    return {
      reason: level.action.text,
      status: level.action.title,
      tone: "yellow" as HomeLiveTone,
      whatToWait: "Ждать откат, закрепление или ретест рабочей зоны.",
    };
  }

  if (
    level.action?.code === "WAIT" ||
    level.action?.code === "WAIT_BREAKOUT_CONFIRMATION" ||
    level.action?.code === "WAIT_RANGE"
  ) {
    return {
      reason: level.action.text,
      status: level.action.title,
      tone: "yellow" as HomeLiveTone,
      whatToWait: "Не догонять движение и дождаться более понятной зоны.",
    };
  }

  if (level.action?.code === "DCA_SMALL") {
    return {
      reason: level.action.text,
      status: level.action.title,
      tone: "green" as HomeLiveTone,
      whatToWait: "Работать только малыми частями и без плечей.",
    };
  }

  if (passedEvents.length > 0) {
    return {
      reason:
        "Важные события дня уже прошли, но рынок может ещё переваривать данные. Если реакция BTC остаётся спокойной, вход лучше делать частями и без плечей.",
      status: "Покупать частями",
      tone: "yellow" as HomeLiveTone,
      whatToWait: "Следить, не усиливается ли реакция BTC после данных.",
    };
  }

  return {
    reason:
      "Крупных событий риска сейчас нет, BTC не у сильного сопротивления. Вход допустим, но лучше частями и без плечей.",
    status: "Можно покупать частями",
    tone: "green" as HomeLiveTone,
    whatToWait: "Следить за BTC и не использовать плечи.",
  };
}

function toImportantEvent(event: RiskEvent): ImportantHomeEvent {
  return {
    affectedAssets: event.affectedAssets,
    category: event.category,
    impact: event.impact,
    time: event.time ?? null,
    title: event.title,
  };
}

function withRuntimeMeta(
  payload: HomeLiveStatePayload,
  meta: Record<string, unknown>,
): HomeLiveStatePayload {
  return {
    ...payload,
    meta: {
      ...(payload.meta ?? {}),
      ...meta,
    },
  };
}

function elapsedMs(startedAt: number) {
  return Math.max(1, Date.now() - startedAt);
}

function withLastGoodNotice(payload: HomeLiveStatePayload): HomeLiveStatePayload {
  if (payload.mainRisk.impact === "high") {
    return {
      ...payload,
      dataStatus: "partial",
    };
  }

  return {
    ...payload,
    action: {
      reason:
        "Показываем последний сохранённый риск и обновляем события дня. До свежей проверки не считайте рынок полностью спокойным.",
      status: "Проверяю рынок…",
      tone: "yellow",
      whatToWait: "Дождаться обновления календаря рисков.",
    },
    dataStatus: "partial",
    mainRisk: {
      affectedAssets: ["BTC", "ETH", "ALTS"],
      category: "macro",
      description:
        "Показываем последний сохранённый риск. Если сегодня есть важные события, они будут учтены после обновления.",
      impact: "medium",
      time: null,
      title: "События обновляются",
    },
  };
}

export async function GET(request: Request) {
  const requestStartedAt = Date.now();
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get("refresh") === "1";
  const computedAt = new Date();
  const localDate = formatLocalDate(computedAt);
  const localMinutes = getLocalMinutes(computedAt);
  const origin = url.origin;
  const cacheReadStartedAt = Date.now();
  const cachedHomeState = readHomeLiveState();
  const cacheReadMs = Date.now() - cacheReadStartedAt;

  const cachedLevelVersion = cachedHomeState?.payload.level?.levelModelVersion;

  if (
    !forceRefresh &&
    cachedHomeState?.payload.dataStatus === "ready" &&
    cachedLevelVersion === LEVEL_MODEL_VERSION
  ) {
    const stale = !cachedHomeState.fresh || cachedHomeState.invalidated;
    const cachedPayload = stale
      ? withLastGoodNotice(cachedHomeState.payload)
      : cachedHomeState.payload;
    const payload = withRuntimeMeta(cachedPayload, {
      cacheReadMs,
      computedAt: computedAt.toISOString(),
      dataStatus: cachedPayload.dataStatus,
      homeStateAgeMs: cachedHomeState.ageMs,
      homeStateSource: stale ? "memory-lastGood" : "memory",
      localDate,
      totalMs: elapsedMs(requestStartedAt),
    });

    return Response.json(payload, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  const [pricesResult, risksResult] = await Promise.all([
    timedFetchJson<PricesResponse>(
      `${origin}/api/prices?symbols=BTC`,
      HOME_PRICE_TIMEOUT_MS,
    ),
    timedFetchJson<RisksResponse>(
      `${origin}/api/risks?cacheOnly=1`,
      HOME_RISK_CACHE_TIMEOUT_MS,
    ),
  ]);
  const pricePayload = pricesResult.ok ? pricesResult.value : null;
  const riskPayload = risksResult.ok ? risksResult.value : null;
  const rawRiskSource = riskPayload?.cacheStatus ?? (risksResult.ok ? "api" : "miss");
  const calendarEvents = Array.isArray(riskPayload?.events) ? riskPayload.events : null;
  const calendarChecked =
    risksResult.ok && calendarEvents !== null && Boolean(riskPayload?.updatedAt);
  const snapshotPayload: HomeSnapshotResponse | null = null;

  const price = extractPrice(pricePayload, snapshotPayload);
  const levelUrl = new URL(`${origin}/api/btc-level`);

  if (price.price !== null) {
    levelUrl.searchParams.set("currentPrice", String(price.price));
  }

  const btcLevelResult = await timedFetchJson<BtcLevelResponse>(
    levelUrl.toString(),
    HOME_LEVEL_TIMEOUT_MS,
  );
  const btcLevelPayload = btcLevelResult.ok ? btcLevelResult.value : null;
  const priceForLevel = numberOrNull(btcLevelPayload?.currentPrice);
  const priceMismatch = priceMismatchPercent(price.price, priceForLevel);
  const displayPrice =
    priceForLevel !== null &&
    (price.price === null || (priceMismatch !== null && priceMismatch > 0.5))
      ? {
          ...price,
          price: priceForLevel,
          source: `${btcLevelPayload?.source ?? "btc-level"}-level-price`,
        }
      : price;
  const priceReady = displayPrice.price !== null;
  const events = calendarEvents ?? [];
  const todayEvents = events.filter((event) => event.date === localDate);
  const importantEvents = sortImportantEvents(
    todayEvents.filter((event) => isImportantHomeEvent(event, localDate)),
    localMinutes,
  );
  const verifiedEmptyCalendar = calendarChecked && todayEvents.length === 0;
  const riskSource = verifiedEmptyCalendar
    ? "calendar-empty-verified"
    : calendarChecked
      ? rawRiskSource === "miss"
        ? "calendar-verified"
        : rawRiskSource
      : rawRiskSource === "miss"
        ? "miss"
        : "calendar-error";
  const riskReady = calendarChecked;
  const riskPartial = !riskReady || riskSource === "last-good";
  const level = buildLevel(displayPrice.price, btcLevelPayload);
  const action = buildAction({
    change24h: displayPrice.change24h,
    importantEvents,
    level,
    nowMinutes: localMinutes,
    priceReady,
    riskReady,
    riskPartial,
  });
  const mainRisk = buildRiskBlock({
    importantEvents,
    nowMinutes: localMinutes,
    riskReady,
    riskPartial,
  });
  const levelReady = level.levelState === "dynamic_ready";
  const actionReady = priceReady && riskReady && !riskPartial && levelReady;
  const snapshotFallbackUsed = price.source === "snapshot";
  const dataStatus: HomeLiveDataStatus =
    priceReady && riskReady && !riskPartial && levelReady
      ? "ready"
      : snapshotFallbackUsed
        ? "fallback"
        : "partial";
  const totalMs = elapsedMs(requestStartedAt);
  const computedPayload: HomeLiveStatePayload = {
    action,
    dataStatus,
    importantEvents: importantEvents.slice(0, 2).map(toImportantEvent),
    level,
    mainRisk,
    meta: {
      actionReady,
      calendarMs: risksResult.ms,
      calendarSource: riskPayload?.sources?.macro ?? "unknown",
      calendarUpdatedAt: riskPayload?.updatedAt ?? null,
      cacheReadMs,
      computedAt: computedAt.toISOString(),
      dataStatus,
      highEventsTodayCount: importantEvents.length,
      homeStateSource: "computed",
      levelMs: btcLevelResult.ms,
      levelModelVersion: level.levelModelVersion,
      levelReady,
      levelSource: level.source,
      levelState: level.levelState,
      localDate,
      priceMs: pricesResult.ms,
      priceDisplay: displayPrice.price,
      priceForLevel,
      priceMismatchPercent: priceMismatch,
      priceReady,
      priceSourceForLevel: btcLevelPayload?.source ?? "missing",
      riskMs: risksResult.ms,
      riskPartial,
      riskReady,
      riskSource,
      snapshotFallbackUsed,
      timezone: HOME_TIMEZONE,
      todayEventsCount: todayEvents.length,
      totalMs,
    },
    ok: true,
    price: {
      change24h: displayPrice.change24h,
      source: displayPrice.source,
      symbol: "BTC",
      updatedAt: displayPrice.updatedAt,
      value: displayPrice.price,
    },
  };
  const cachedAfterCompute = readHomeLiveState();
  const shouldUseLastGood =
    computedPayload.dataStatus !== "ready" &&
    cachedAfterCompute?.payload.dataStatus === "ready" &&
    cachedAfterCompute.payload.level?.levelModelVersion === LEVEL_MODEL_VERSION;
  const payload = shouldUseLastGood
    ? withRuntimeMeta(withLastGoodNotice(cachedAfterCompute.payload), {
        cacheReadMs,
        computedAt: computedAt.toISOString(),
        dataStatus: "partial",
        homeStateAgeMs: cachedAfterCompute.ageMs,
        homeStateSource: "memory-lastGood",
        localDate,
        totalMs: elapsedMs(requestStartedAt),
      })
    : computedPayload;

  writeHomeLiveState(computedPayload);

  return Response.json(
    payload,
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
