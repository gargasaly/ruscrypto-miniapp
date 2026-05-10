export type RiskImpact = "high" | "medium" | "low";
export type RiskCategory = "macro" | "crypto" | "token";
export type RiskSourceState = "manual" | "api" | "disabled";

export type RiskEvent = {
  id: string;
  date: string;
  time?: string;
  weekday?: string;
  readableDate?: string;
  title: string;
  category: RiskCategory;
  impact: RiskImpact;
  impactLabel: string;
  affectedAssets: string[];
  description?: string;
  source?: string;
  sourceUrl?: string;
  url?: string;
  whyItMatters: string;
  positiveScenario?: string;
  negativeScenario?: string;
  status: "manual" | "auto" | "fallback";
};

export type RiskApiResponse = {
  events: RiskEvent[];
  mainRisk: RiskEvent;
  updatedAt: string;
  sources: {
    macro: RiskSourceState;
    crypto: RiskSourceState;
    unlocks: RiskSourceState;
  };
};

export const trackedRiskAssets = [
  "BTC",
  "ETH",
  "BNB",
  "LINK",
  "HYPE",
  "SOL",
  "AAVE",
  "XRP",
  "RENDER",
  "SUI",
  "TAO",
  "TON",
  "ONDO",
  "UNI",
  "JUP",
  "PENDLE",
  "ENA",
  "AVAX",
  "NEAR",
] as const;

export const categoryLabels: Record<RiskCategory, string> = {
  crypto: "Крипто",
  macro: "Макро",
  token: "Токены",
};

export const manualRiskCalendar: RiskEvent[] = [
  {
    id: "fallback-no-major-events",
    date: "auto-today",
    time: "день",
    title: "Крупных событий нет",
    category: "macro",
    impact: "low",
    impactLabel: "🟢 Низкое влияние",
    affectedAssets: ["BTC", "ETH", "ALTS"],
    whyItMatters:
      "Рынок больше смотрит на уровни BTC, BTC.D, ETF-потоки и общую реакцию на риск.",
    positiveScenario:
      "Если BTC удерживает ключевой уровень, альты могут спокойно восстанавливаться.",
    negativeScenario:
      "Если BTC теряет поддержку, альты обычно падают сильнее.",
    status: "fallback",
  },
];

const impactPriority: Record<RiskImpact, number> = {
  high: 3,
  low: 1,
  medium: 2,
};

export function getImpactLabel(impact: RiskImpact) {
  if (impact === "high") {
    return "🔴 Высокое влияние";
  }

  if (impact === "low") {
    return "🟢 Низкое влияние";
  }

  return "🟡 Среднее влияние";
}

export function getImpactTone(impact: RiskImpact) {
  if (impact === "high") {
    return "red" as const;
  }

  if (impact === "low") {
    return "green" as const;
  }

  return "yellow" as const;
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getRiskWeekDates(now = new Date()) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() + index);

    return addDateLabels(
      {
        ...manualRiskCalendar[0],
        date: toDateKey(date),
        id: `no-major-events-${toDateKey(date)}`,
      },
      now,
    );
  });
}

export function dateFromKey(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  return new Date(year, (month || 1) - 1, day || 1);
}

function normalizeDateKey(date: string, now: Date) {
  if (date === "auto-today") {
    return toDateKey(now);
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(date)) {
    return date.slice(0, 10);
  }

  return toDateKey(now);
}

export function addDateLabels(event: RiskEvent, now = new Date()): RiskEvent {
  const date = normalizeDateKey(event.date, now);
  const parsedDate = dateFromKey(date);

  return {
    ...event,
    date,
    description: event.description ?? event.whyItMatters,
    impactLabel: event.impactLabel || getImpactLabel(event.impact),
    readableDate: new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
    }).format(parsedDate),
    url: event.url ?? event.sourceUrl,
    weekday: new Intl.DateTimeFormat("ru-RU", {
      weekday: "long",
    }).format(parsedDate),
  };
}

function timeRank(time?: string) {
  if (!time) {
    return "99:99";
  }

  return /^\d{2}:\d{2}$/.test(time) ? time : "99:99";
}

export function sortRiskEvents(events: RiskEvent[]) {
  return [...events].sort((left, right) => {
    const leftDate = dateFromKey(left.date).getTime();
    const rightDate = dateFromKey(right.date).getTime();

    if (leftDate !== rightDate) {
      return leftDate - rightDate;
    }

    const impactDiff = impactPriority[right.impact] - impactPriority[left.impact];

    if (impactDiff !== 0) {
      return impactDiff;
    }

    return timeRank(left.time).localeCompare(timeRank(right.time));
  });
}

export function dedupeRiskEvents(events: RiskEvent[]) {
  const seen = new Set<string>();

  return events.filter((event) => {
    const key = `${event.date}|${event.category}|${event.title}`.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function normalizeRiskEvents(events: RiskEvent[], now = new Date()) {
  return sortRiskEvents(dedupeRiskEvents(events.map((event) => addDateLabels(event, now))));
}

export function getFallbackRisk(now = new Date()) {
  return addDateLabels(manualRiskCalendar[0], now);
}

export function getMainRisk(events: RiskEvent[], now = new Date()) {
  const normalizedEvents = normalizeRiskEvents(events, now);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setHours(end.getHours() + 48);

  const nextEvents = normalizedEvents.filter((event) => {
    const eventDate = dateFromKey(event.date);

    return eventDate >= start && eventDate <= end;
  });

  if (nextEvents.length === 0) {
    return getFallbackRisk(now);
  }

  return [...nextEvents].sort((left, right) => {
    const impactDiff = impactPriority[right.impact] - impactPriority[left.impact];

    if (impactDiff !== 0) {
      return impactDiff;
    }

    return dateFromKey(left.date).getTime() - dateFromKey(right.date).getTime();
  })[0];
}
