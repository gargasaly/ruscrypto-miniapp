import { btcRiskFallback, type RiskEvent, type RiskImpact } from "@/lib/riskCalendar";

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
const HOME_MAJOR_RESISTANCE = {
  high: 82_000,
  label: "$80,000–82,000",
  low: 80_000,
};
const HOME_NEAR_RESISTANCE_THRESHOLD_PCT = 3;
const HOME_LIVE_TIMEOUT_MS = 2_700;
const HOME_SNAPSHOT_FALLBACK_TIMEOUT_MS = 1_200;
const HIGH_EVENT_DIGEST_WINDOW_MINUTES = 120;

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

function extractResistance(snapshot: HomeSnapshotResponse | null) {
  const resistance = snapshot?.btcLevel?.majorResistance;
  const low = numberOrNull(resistance?.low);
  const high = numberOrNull(resistance?.high);
  const label =
    typeof resistance?.label === "string" && resistance.label.trim()
      ? resistance.label
      : HOME_MAJOR_RESISTANCE.label;

  if (low !== null && high !== null) {
    return {
      high,
      label,
      low,
    };
  }

  return HOME_MAJOR_RESISTANCE;
}

function distanceToResistance(price: number | null, resistanceLow: number) {
  if (price === null || price <= 0) {
    return null;
  }

  return ((resistanceLow - price) / price) * 100;
}

function isNearResistance(price: number | null, resistance: typeof HOME_MAJOR_RESISTANCE) {
  const distance = distanceToResistance(price, resistance.low);

  if (price === null || distance === null) {
    return false;
  }

  return (
    (price >= resistance.low && price <= resistance.high) ||
    (distance >= 0 && distance <= HOME_NEAR_RESISTANCE_THRESHOLD_PCT)
  );
}

function buildLevel(price: number | null, resistance: typeof HOME_MAJOR_RESISTANCE) {
  const distancePercent = distanceToResistance(price, resistance.low);
  const nearResistance = isNearResistance(price, resistance);

  if (nearResistance) {
    return {
      distancePercent,
      label: resistance.label,
      text: "Это сильная зона, где рынок может начать фиксировать прибыль.",
      title: "Главное сопротивление BTC",
      type: "near_resistance" as HomeLiveLevelType,
    };
  }

  return {
    distancePercent,
    label: resistance.label,
    text:
      "До этой зоны ещё есть расстояние. Сейчас важнее события дня и ближайшая реакция BTC.",
    title: "Главное сопротивление выше",
    type: "resistance_above" as HomeLiveLevelType,
  };
}

function buildRiskBlock({
  importantEvents,
  riskReady,
  nowMinutes,
}: {
  importantEvents: RiskEvent[];
  nowMinutes: number;
  riskReady: boolean;
}) {
  if (!riskReady) {
    return {
      affectedAssets: ["BTC", "ETH", "ALTS"],
      category: "macro",
      description:
        "Календарь событий обновляется. До проверки важных макро-данных лучше не считать рынок спокойным.",
      impact: "medium" as RiskImpact,
      time: null,
      title: "Проверяем календарь рисков",
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

  return {
    affectedAssets: ["BTC"],
    category: "macro",
    description:
      "Календарь проверен: high-событий для BTC/ETH/альтов на сегодня не найдено.",
    impact: "low" as RiskImpact,
    time: "день",
    title: "Крупных BTC-рисков нет",
  };
}

function buildAction({
  change24h,
  importantEvents,
  level,
  priceReady,
  riskReady,
  nowMinutes,
}: {
  change24h: number | null;
  importantEvents: RiskEvent[];
  level: ReturnType<typeof buildLevel>;
  nowMinutes: number;
  priceReady: boolean;
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

  if (level.type === "near_resistance") {
    return {
      reason:
        "BTC близко к сильному сопротивлению. Вход возможен небольшой частью, без полной загрузки и без плечей.",
      status: "Покупать частями",
      tone: "yellow" as HomeLiveTone,
      whatToWait: "Следить за реакцией у зоны $80,000–82,000.",
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
      "Крупных событий риска сейчас нет. Вход допустим, лучше частями и без плечей.",
    status: "Можно покупать",
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const computedAt = new Date();
  const localDate = formatLocalDate(computedAt);
  const localMinutes = getLocalMinutes(computedAt);
  const origin = url.origin;
  const [pricesResult, risksResult] = await Promise.allSettled([
    fetchJsonWithTimeout<PricesResponse>(`${origin}/api/prices?symbols=BTC`, HOME_LIVE_TIMEOUT_MS),
    fetchJsonWithTimeout<RisksResponse>(`${origin}/api/risks`, HOME_LIVE_TIMEOUT_MS),
  ]);
  const pricePayload = pricesResult.status === "fulfilled" ? pricesResult.value : null;
  const riskPayload = risksResult.status === "fulfilled" ? risksResult.value : null;
  const riskReady = Array.isArray(riskPayload?.events);
  let snapshotPayload: HomeSnapshotResponse | null = null;

  if (pricesResult.status !== "fulfilled" || !riskReady) {
    try {
      snapshotPayload = await fetchJsonWithTimeout<HomeSnapshotResponse>(
        `${origin}/api/home-snapshot`,
        HOME_SNAPSHOT_FALLBACK_TIMEOUT_MS,
      );
    } catch {
      snapshotPayload = null;
    }
  }

  const price = extractPrice(pricePayload, snapshotPayload);
  const priceReady = price.price !== null;
  const events = riskPayload?.events ?? [];
  const todayEvents = events.filter((event) => event.date === localDate);
  const importantEvents = sortImportantEvents(
    todayEvents.filter((event) => isImportantHomeEvent(event, localDate)),
    localMinutes,
  );
  const resistance = extractResistance(snapshotPayload);
  const level = buildLevel(price.price, resistance);
  const action = buildAction({
    change24h: price.change24h,
    importantEvents,
    level,
    nowMinutes: localMinutes,
    priceReady,
    riskReady,
  });
  const mainRisk = buildRiskBlock({
    importantEvents,
    nowMinutes: localMinutes,
    riskReady,
  });
  const levelReady = priceReady;
  const actionReady = priceReady && riskReady;
  const dataStatus: HomeLiveDataStatus =
    priceReady && riskReady
      ? "ready"
      : snapshotPayload
        ? "fallback"
        : "partial";

  return Response.json(
    {
      action,
      dataStatus,
      importantEvents: importantEvents.slice(0, 2).map(toImportantEvent),
      level,
      mainRisk,
      meta: {
        actionReady,
        calendarSource: riskPayload?.sources?.macro ?? "unknown",
        calendarUpdatedAt: riskPayload?.updatedAt ?? null,
        computedAt: computedAt.toISOString(),
        highEventsTodayCount: importantEvents.length,
        levelReady,
        localDate,
        priceReady,
        riskReady,
        snapshotFallbackUsed: snapshotPayload !== null,
        timezone: HOME_TIMEZONE,
        todayEventsCount: todayEvents.length,
      },
      ok: true,
      price: {
        change24h: price.change24h,
        source: price.source,
        symbol: "BTC",
        updatedAt: price.updatedAt,
        value: price.price,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
