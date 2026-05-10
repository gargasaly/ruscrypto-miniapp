import {
  dateFromKey,
  getImpactLabel,
  getMainRisk,
  manualRiskCalendar,
  normalizeRiskEvents,
  toDateKey,
  trackedRiskAssets,
  type RiskApiResponse,
  type RiskCategory,
  type RiskEvent,
  type RiskImpact,
  type RiskSourceState,
} from "@/lib/riskCalendar";

export const revalidate = 0;
export const dynamic = "force-dynamic";

type UnknownRecord = Record<string, unknown>;
type SourceStatus = "ok" | "failed" | "skipped";

type FetchJsonResult = {
  data: unknown | null;
  error: string | null;
};

type SourceFetchResult = {
  events: RiskEvent[];
  rawCount: number;
  reason?: string;
  sampleTitles?: string[];
};

type SourceTask = {
  enabled: boolean;
  load?: () => Promise<SourceFetchResult>;
  name: string;
  reason?: string;
};

type RiskSourceDebug = {
  name: string;
  enabled: boolean;
  status: SourceStatus;
  reason: string | null;
  rawCount: number;
  normalizedCount: number;
  filteredOutCount: number;
  sampleTitles: string[];
};

type RiskDebug = {
  now: string;
  rangeStart: string;
  rangeEnd: string;
  env: {
    COINMARKETCAL_API_KEY: boolean;
    CRYPTORANK_API_KEY: boolean;
    TRADING_ECONOMICS_KEY: boolean;
    MESSARI_API_KEY: boolean;
    MOBULA_API_KEY: boolean;
  };
  sources: RiskSourceDebug[];
  filters: {
    dateRange: string;
    allowedImpacts: RiskImpact[];
    allowedCategories: RiskCategory[];
    timezone: string;
  };
  final: {
    totalNormalizedEvents: number;
    totalCalendarEvents: number;
    fallbackDaysCount: number;
  };
};

type RiskApiDebugResponse = RiskApiResponse & {
  debug?: RiskDebug;
};

const trackedAssetSet = new Set<string>(trackedRiskAssets);
const fallbackAssets = ["BTC", "ETH", "ALTS"];
const allowedImpacts: RiskImpact[] = ["high", "medium", "low"];
const allowedCategories: RiskCategory[] = ["macro", "crypto", "token"];

const assetAliases: Record<string, string> = {
  AVALANCHE: "AVAX",
  BINARYX: "BNB",
  BITCOIN: "BTC",
  BITTENSOR: "TAO",
  CHAINLINK: "LINK",
  ETHEREUM: "ETH",
  HYPERLIQUID: "HYPE",
  NEAR: "NEAR",
  "NEAR-PROTOCOL": "NEAR",
  RENDER: "RENDER",
  "RENDER-TOKEN": "RENDER",
  RNDR: "RENDER",
  RIPPLE: "XRP",
  SOLANA: "SOL",
  "THE-OPEN-NETWORK": "TON",
  TONCOIN: "TON",
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringFrom(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return null;
}

function localizedString(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (!isRecord(value)) {
    return null;
  }

  return stringFrom(value, ["ru", "en", "title", "name", "caption"]);
}

function arrayPayload(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (!isRecord(value)) {
    return [];
  }

  for (const key of ["body", "data", "events", "result", "items", "rows"]) {
    const nested = value[key];

    if (Array.isArray(nested)) {
      return nested;
    }
  }

  return [];
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next;
}

function startOfLocalDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);

  return next;
}

function normalizeEventDate(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }

  const numeric = Number(trimmed);

  if (Number.isFinite(numeric)) {
    const timestamp = numeric > 10_000_000_000 ? numeric : numeric * 1000;
    const date = new Date(timestamp);

    return Number.isNaN(date.getTime()) ? null : toDateKey(date);
  }

  const parsed = new Date(trimmed);

  return Number.isNaN(parsed.getTime()) ? null : toDateKey(parsed);
}

function getCalendarRange(now: Date) {
  const start = startOfLocalDay(now);
  const endExclusive = addDays(start, 7);
  const endInclusive = addDays(start, 6);

  return {
    endExclusive,
    endInclusive,
    rangeEnd: toDateKey(endInclusive),
    rangeStart: toDateKey(start),
    start,
  };
}

function isDateInCalendarRange(date: string, now: Date) {
  const { endExclusive, start } = getCalendarRange(now);
  const parsed = dateFromKey(date);

  return parsed >= start && parsed < endExclusive;
}

async function fetchJson(url: URL, init: RequestInit): Promise<FetchJsonResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      ...init,
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        data: null,
        error: `http-${response.status}`,
      };
    }

    return {
      data: (await response.json()) as unknown,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.name : "request-failed",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeAssetSymbol(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase().replace(/\s+/g, "-");
  const aliased = assetAliases[normalized] ?? normalized;

  return trackedAssetSet.has(aliased) ? aliased : null;
}

function readAffectedAssets(record: UnknownRecord) {
  const found = new Set<string>();
  const candidates = [record.coins, record.currencies, record.assets, record.tokens];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) {
      continue;
    }

    for (const item of candidate) {
      if (typeof item === "string") {
        const symbol = normalizeAssetSymbol(item);

        if (symbol) {
          found.add(symbol);
        }
      }

      if (isRecord(item)) {
        const symbol = normalizeAssetSymbol(
          stringFrom(item, ["symbol", "ticker", "code", "name", "slug"]),
        );

        if (symbol) {
          found.add(symbol);
        }
      }
    }
  }

  const fallbackSymbol = normalizeAssetSymbol(
    stringFrom(record, ["symbol", "ticker", "asset", "coin", "slug"]),
  );

  if (fallbackSymbol) {
    found.add(fallbackSymbol);
  }

  return [...found];
}

function normalizeAffectedAssets(assets: string[]) {
  return assets.length > 0 ? assets : fallbackAssets;
}

function inferCryptoImpact(text: string): RiskImpact {
  const normalized = text.toLowerCase();

  if (
    /regulat|sec|etf|court|lawsuit|hard fork|mainnet|major upgrade|delisting|listing/.test(
      normalized,
    )
  ) {
    return "high";
  }

  if (
    /conference|ama|governance|partnership|launch|upgrade|announcement|ecosystem|airdrop/.test(
      normalized,
    )
  ) {
    return "medium";
  }

  return "low";
}

function inferMacroImpact(text: string): RiskImpact {
  const normalized = text.toLowerCase();

  if (
    /core cpi|cpi|core pce|pce|fomc|interest rate|rate decision|powell|non farm|nonfarm|unemployment|gdp/.test(
      normalized,
    )
  ) {
    return "high";
  }

  if (/inflation expectations|fed member|treasury|auction|retail sales|pmi|jobless/.test(normalized)) {
    return "medium";
  }

  return "low";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9а-яё-]/gi, "")
    .slice(0, 80);
}

function riskEvent({
  affectedAssets,
  category,
  date,
  id,
  impact,
  description,
  source,
  sourceUrl,
  status = "auto",
  time,
  title,
  url,
  whyItMatters,
}: {
  affectedAssets: string[];
  category: RiskCategory;
  date: string;
  description?: string;
  id: string;
  impact: RiskImpact;
  source?: string;
  sourceUrl?: string;
  status?: RiskEvent["status"];
  time?: string;
  title: string;
  url?: string;
  whyItMatters: string;
}): RiskEvent {
  return {
    affectedAssets: normalizeAffectedAssets(affectedAssets),
    category,
    date,
    description: description ?? whyItMatters,
    id,
    impact,
    impactLabel: getImpactLabel(impact),
    source,
    sourceUrl,
    status,
    time,
    title,
    url: url ?? sourceUrl,
    whyItMatters,
  };
}

function rawTitleFromRecord(record: UnknownRecord) {
  return (
    localizedString(record.title) ??
    stringFrom(record, ["name", "event", "caption", "Event", "Category", "category"]) ??
    "Событие"
  );
}

async function fetchCoinMarketCalEvents(apiKey: string, now: Date): Promise<SourceFetchResult> {
  const url = new URL("https://developers.coinmarketcal.com/v1/events");
  url.searchParams.set("max", "100");
  url.searchParams.set("dateRangeStart", toDateKey(now));
  url.searchParams.set("dateRangeEnd", toDateKey(addDays(now, 7)));

  const { data, error } = await fetchJson(url, {
    headers: {
      accept: "application/json",
      "x-api-key": apiKey,
    },
  });

  if (error) {
    return {
      events: [],
      rawCount: 0,
      reason: error,
    };
  }

  const rows = arrayPayload(data).filter(isRecord);
  const events = rows
    .map((event) => {
      const title = rawTitleFromRecord(event);
      const date = normalizeEventDate(
        stringFrom(event, ["date_event", "date", "start_date", "created_at"]),
      );
      const affectedAssets = readAffectedAssets(event);
      const categoryText = arrayPayload(event.categories)
        .map((category) => (isRecord(category) ? localizedString(category.title) : localizedString(category)))
        .filter(Boolean)
        .join(" ");
      const impact = inferCryptoImpact(`${title} ${categoryText}`);
      const sourceUrl =
        stringFrom(event, ["source", "proof", "url", "link"]) ??
        (isRecord(event.source) ? stringFrom(event.source, ["url", "link"]) : null);

      if (!date) {
        return null;
      }

      return riskEvent({
        affectedAssets,
        category: "crypto",
        date,
        id: `coinmarketcal-${slugify(title)}-${date}`,
        impact,
        source: "CoinMarketCal",
        sourceUrl: sourceUrl ?? undefined,
        title,
        whyItMatters:
          "Событие по крипторынку может изменить ожидания участников и волатильность в затронутых активах.",
      });
    })
    .filter((event): event is RiskEvent => event !== null);

  return {
    events,
    rawCount: rows.length,
    sampleTitles: rows.map(rawTitleFromRecord).slice(0, 5),
  };
}

async function fetchTradingEconomicsEvents(apiKey: string, now: Date): Promise<SourceFetchResult> {
  const start = toDateKey(now);
  const end = toDateKey(addDays(now, 7));
  const url = new URL(
    `https://api.tradingeconomics.com/calendar/country/united%20states/${start}/${end}`,
  );
  url.searchParams.set("c", apiKey);
  url.searchParams.set("format", "json");

  const { data, error } = await fetchJson(url, {
    headers: {
      accept: "application/json",
    },
  });

  if (error) {
    return {
      events: [],
      rawCount: 0,
      reason: error,
    };
  }

  const rows = arrayPayload(data).filter(isRecord);
  const events = rows
    .map((event) => {
      const title = stringFrom(event, ["Event", "event", "Category", "category"]) ?? "Макро-событие";
      const date = normalizeEventDate(stringFrom(event, ["Date", "date"]));

      if (!date) {
        return null;
      }

      const time = stringFrom(event, ["Time", "time"]);
      const impact = inferMacroImpact(title);

      return riskEvent({
        affectedAssets: fallbackAssets,
        category: "macro",
        date,
        id: `trading-economics-${slugify(title)}-${date}`,
        impact,
        source: "Trading Economics",
        time: time ?? undefined,
        title,
        whyItMatters:
          "Макро-событие влияет на ожидания по ставке, доллар, доходности и общий режим risk-on/risk-off.",
      });
    })
    .filter((event): event is RiskEvent => event !== null);

  return {
    events,
    rawCount: rows.length,
    sampleTitles: rows.map(rawTitleFromRecord).slice(0, 5),
  };
}

function parseUnlockSchedule(schedule: unknown, asset: string, now: Date) {
  const rows = arrayPayload(schedule).filter(isRecord);

  return rows
    .map((unlock) => {
      const date = normalizeEventDate(
        stringFrom(unlock, ["date", "unlock_date", "vesting_date", "timestamp"]),
      );

      if (!date || !isDateInCalendarRange(date, now)) {
        return null;
      }

      const percentRaw = unlock.percent ?? unlock.percentage ?? unlock.unlock_percent;
      const percent =
        typeof percentRaw === "number"
          ? percentRaw
          : typeof percentRaw === "string"
            ? Number(percentRaw)
            : NaN;
      const impact: RiskImpact = !Number.isFinite(percent)
        ? "medium"
        : percent >= 5
          ? "high"
          : percent >= 1
            ? "medium"
            : "low";

      return riskEvent({
        affectedAssets: [asset],
        category: "token",
        date,
        id: `unlock-${asset}-${date}`.toLowerCase(),
        impact,
        source: "Mobula",
        title: `${asset}: token unlock`,
        whyItMatters:
          "Разблокировка увеличивает доступное предложение токена и может усилить давление, особенно на слабом рынке.",
      });
    })
    .filter((event): event is RiskEvent => event !== null);
}

async function fetchMobulaUnlockEvents(apiKey: string, now: Date): Promise<SourceFetchResult> {
  const url = new URL("https://api.mobula.io/api/1/metadata/multi");
  url.searchParams.set("assets", trackedRiskAssets.join(","));

  const { data, error } = await fetchJson(url, {
    headers: {
      accept: "application/json",
      Authorization: apiKey,
    },
  });

  if (error) {
    return {
      events: [],
      rawCount: 0,
      reason: error,
    };
  }

  const payload = isRecord(data) ? data.data : null;
  const rows = Array.isArray(payload)
    ? payload
    : isRecord(payload)
      ? Object.values(payload)
      : [];
  const records = rows.filter(isRecord);
  const events = records.flatMap((assetData) => {
    const asset = normalizeAssetSymbol(
      stringFrom(assetData, ["symbol", "ticker", "name", "asset"]),
    );
    const schedule =
      assetData.release_schedule ??
      assetData.releaseSchedule ??
      assetData.unlocks ??
      assetData.vesting;

    return asset && schedule ? parseUnlockSchedule(schedule, asset, now) : [];
  });

  return {
    events,
    rawCount: records.length,
    sampleTitles: records
      .map((record) => stringFrom(record, ["symbol", "ticker", "name", "asset"]) ?? "unlock")
      .slice(0, 5),
  };
}

async function fetchMessariUnlockEvents(): Promise<SourceFetchResult> {
  // TODO: подключить точный Messari Token Unlocks endpoint после выбора тарифа/API.
  return {
    events: [],
    rawCount: 0,
    reason: "not-implemented",
  };
}

async function fetchCryptoRankUnlockEvents(apiKey: string, now: Date): Promise<SourceFetchResult> {
  const url = new URL("https://api.cryptorank.io/v2/currencies/unlocks");
  url.searchParams.set("symbols", trackedRiskAssets.join(","));
  url.searchParams.set("from", toDateKey(now));
  url.searchParams.set("to", toDateKey(addDays(now, 7)));

  const { data, error } = await fetchJson(url, {
    headers: {
      accept: "application/json",
      "X-Api-Key": apiKey,
    },
  });

  if (error) {
    return {
      events: [],
      rawCount: 0,
      reason: error,
    };
  }

  const rows = arrayPayload(data).filter(isRecord);
  const events = rows
    .map((unlock) => {
      const asset = normalizeAssetSymbol(
        stringFrom(unlock, ["symbol", "ticker", "asset", "coin", "name"]),
      );
      const date = normalizeEventDate(
        stringFrom(unlock, [
          "date",
          "unlockDate",
          "unlock_date",
          "nextUnlockDate",
          "vestingDate",
        ]),
      );

      if (!date) {
        return null;
      }

      const percentRaw =
        unlock.percent ??
        unlock.percentage ??
        unlock.unlockPercent ??
        unlock.unlock_percent;
      const percent =
        typeof percentRaw === "number"
          ? percentRaw
          : typeof percentRaw === "string"
            ? Number(percentRaw)
            : NaN;
      const impact: RiskImpact = !Number.isFinite(percent)
        ? "medium"
        : percent > 2
          ? "high"
          : percent >= 0.5
            ? "medium"
            : "low";
      const affectedAssets = asset ? [asset] : fallbackAssets;
      const title = `${asset ?? "Token"}: token unlock`;

      return riskEvent({
        affectedAssets,
        category: "token",
        date,
        id: `cryptorank-unlock-${asset ?? "unknown"}-${date}`.toLowerCase(),
        impact,
        source: "CryptoRank",
        sourceUrl: stringFrom(unlock, ["url", "sourceUrl"]) ?? undefined,
        title,
        whyItMatters:
          "Разблокировка увеличивает доступное предложение токена и может усилить давление, особенно если рынок слабый.",
      });
    })
    .filter((event): event is RiskEvent => event !== null);

  return {
    events,
    rawCount: rows.length,
    sampleTitles: rows
      .map((record) => stringFrom(record, ["symbol", "ticker", "asset", "coin", "name"]) ?? "unlock")
      .slice(0, 5),
  };
}

function sourceState(hasKey: boolean): RiskSourceState {
  return hasKey ? "api" : "disabled";
}

function shortReason(reason: unknown) {
  if (typeof reason === "string" && reason.trim()) {
    return reason.trim().slice(0, 120);
  }

  if (reason instanceof Error) {
    return reason.message.slice(0, 120);
  }

  return "unknown-error";
}

function sourceLog(debug: RiskSourceDebug) {
  const base = `[risks] source=${debug.name.replace(/\s+/g, "")} enabled=${debug.enabled}`;

  if (debug.status === "skipped") {
    console.warn(`${base} status=skipped reason=${debug.reason ?? "skipped"}`);
    return;
  }

  if (debug.status === "failed") {
    console.warn(`${base} status=failed reason=${debug.reason ?? "failed"}`);
    return;
  }

  console.warn(
    `${base} status=ok raw=${debug.rawCount} normalized=${debug.normalizedCount} filtered=${debug.filteredOutCount}`,
  );
}

async function runSourceTask(task: SourceTask, now: Date) {
  if (!task.enabled || !task.load) {
    const debug: RiskSourceDebug = {
      enabled: task.enabled,
      filteredOutCount: 0,
      name: task.name,
      normalizedCount: 0,
      rawCount: 0,
      reason: task.reason ?? "no-api-key",
      sampleTitles: [],
      status: "skipped",
    };

    sourceLog(debug);

    return {
      debug,
      events: [] as RiskEvent[],
    };
  }

  try {
    const result = await task.load();
    const normalizedEvents = normalizeRiskEvents(result.events, now);
    const calendarEvents = normalizedEvents.filter((event) =>
      isDateInCalendarRange(event.date, now),
    );
    const filteredOutCount = Math.max(0, result.rawCount - calendarEvents.length);
    const status: SourceStatus =
      result.reason && calendarEvents.length === 0 ? "failed" : "ok";
    const debug: RiskSourceDebug = {
      enabled: true,
      filteredOutCount,
      name: task.name,
      normalizedCount: normalizedEvents.length,
      rawCount: result.rawCount,
      reason: result.reason ?? (result.rawCount === 0 ? "empty-response" : null),
      sampleTitles:
        normalizedEvents.length > 0
          ? normalizedEvents.map((event) => event.title).slice(0, 5)
          : result.sampleTitles?.slice(0, 5) ?? [],
      status,
    };

    sourceLog(debug);

    return {
      debug,
      events: status === "failed" ? [] : calendarEvents,
    };
  } catch (error) {
    const debug: RiskSourceDebug = {
      enabled: true,
      filteredOutCount: 0,
      name: task.name,
      normalizedCount: 0,
      rawCount: 0,
      reason: shortReason(error),
      sampleTitles: [],
      status: "failed",
    };

    sourceLog(debug);

    return {
      debug,
      events: [] as RiskEvent[],
    };
  }
}

function getFallbackDaysCount(events: RiskEvent[], now: Date) {
  const { start } = getCalendarRange(now);
  const datesWithRealEvents = new Set(
    events
      .filter((event) => event.status !== "fallback" && isDateInCalendarRange(event.date, now))
      .map((event) => event.date),
  );

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    return toDateKey(date);
  }).filter((date) => !datesWithRealEvents.has(date)).length;
}

function envDebug() {
  return {
    COINMARKETCAL_API_KEY: Boolean(process.env.COINMARKETCAL_API_KEY),
    CRYPTORANK_API_KEY: Boolean(process.env.CRYPTORANK_API_KEY),
    MESSARI_API_KEY: Boolean(process.env.MESSARI_API_KEY),
    MOBULA_API_KEY: Boolean(process.env.MOBULA_API_KEY),
    TRADING_ECONOMICS_KEY: Boolean(process.env.TRADING_ECONOMICS_KEY),
  };
}

export async function GET(request: Request) {
  const now = new Date();
  const { rangeEnd, rangeStart } = getCalendarRange(now);
  const requestUrl = new URL(request.url);
  const debugMode = requestUrl.searchParams.get("debug") === "1";
  const keys = envDebug();

  // Автоматические источники подключаются только при наличии API-ключей в env.
  // Без ключей приложение использует manualRiskCalendar и fallback-сценарий.
  // API-ключи нельзя хранить на клиенте.
  const sourceTasks: SourceTask[] = [
    {
      enabled: keys.TRADING_ECONOMICS_KEY,
      load: keys.TRADING_ECONOMICS_KEY
        ? () => fetchTradingEconomicsEvents(process.env.TRADING_ECONOMICS_KEY ?? "", now)
        : undefined,
      name: "Trading Economics",
      reason: keys.TRADING_ECONOMICS_KEY ? undefined : "no-api-key",
    },
    {
      enabled: keys.COINMARKETCAL_API_KEY,
      load: keys.COINMARKETCAL_API_KEY
        ? () => fetchCoinMarketCalEvents(process.env.COINMARKETCAL_API_KEY ?? "", now)
        : undefined,
      name: "CoinMarketCal",
      reason: keys.COINMARKETCAL_API_KEY ? undefined : "no-api-key",
    },
    {
      enabled: keys.CRYPTORANK_API_KEY,
      load: keys.CRYPTORANK_API_KEY
        ? () => fetchCryptoRankUnlockEvents(process.env.CRYPTORANK_API_KEY ?? "", now)
        : undefined,
      name: "CryptoRank",
      reason: keys.CRYPTORANK_API_KEY ? undefined : "no-api-key",
    },
    {
      enabled: keys.MOBULA_API_KEY,
      load: keys.MOBULA_API_KEY
        ? () => fetchMobulaUnlockEvents(process.env.MOBULA_API_KEY ?? "", now)
        : undefined,
      name: "Mobula",
      reason: keys.MOBULA_API_KEY ? undefined : "no-api-key",
    },
    {
      enabled: keys.MESSARI_API_KEY,
      load: undefined,
      name: "Messari",
      reason: keys.MESSARI_API_KEY ? "not-implemented" : "no-api-key",
    },
  ];

  const settledSources = await Promise.allSettled(
    sourceTasks.map((task) => runSourceTask(task, now)),
  );
  const sourceOutputs = settledSources.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    const debug: RiskSourceDebug = {
      enabled: sourceTasks[index].enabled,
      filteredOutCount: 0,
      name: sourceTasks[index].name,
      normalizedCount: 0,
      rawCount: 0,
      reason: shortReason(result.reason),
      sampleTitles: [],
      status: "failed",
    };

    sourceLog(debug);

    return {
      debug,
      events: [] as RiskEvent[],
    };
  });
  const realCalendarEvents = normalizeRiskEvents(
    sourceOutputs.flatMap((output) => output.events),
    now,
  );
  const fallbackEvents = normalizeRiskEvents(manualRiskCalendar, now);
  const events = realCalendarEvents.length > 0 ? realCalendarEvents : fallbackEvents;
  const mainRisk = getMainRisk(events, now);
  const totalNormalizedEvents = sourceOutputs.reduce(
    (sum, output) => sum + output.debug.normalizedCount,
    0,
  );
  const fallbackDaysCount = getFallbackDaysCount(realCalendarEvents, now);

  console.warn(
    `[risks] final normalized=${totalNormalizedEvents} calendar=${realCalendarEvents.length} fallbackDays=${fallbackDaysCount}`,
  );

  const payload: RiskApiDebugResponse = {
    events,
    mainRisk,
    sources: {
      crypto: sourceState(keys.COINMARKETCAL_API_KEY),
      macro: sourceState(keys.TRADING_ECONOMICS_KEY),
      unlocks: sourceState(
        keys.MOBULA_API_KEY || keys.MESSARI_API_KEY || keys.CRYPTORANK_API_KEY,
      ),
    },
    updatedAt: new Date().toISOString(),
  };

  if (debugMode) {
    payload.debug = {
      env: keys,
      filters: {
        allowedCategories,
        allowedImpacts,
        dateRange: `${rangeStart}..${rangeEnd}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "local",
      },
      final: {
        fallbackDaysCount,
        totalCalendarEvents: realCalendarEvents.length,
        totalNormalizedEvents,
      },
      now: now.toISOString(),
      rangeEnd,
      rangeStart,
      sources: sourceOutputs.map((output) => output.debug),
    };
  }

  return Response.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
