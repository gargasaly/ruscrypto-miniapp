import {
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

export const revalidate = 300;
export const dynamic = "force-dynamic";

type UnknownRecord = Record<string, unknown>;

const trackedAssetSet = new Set<string>(trackedRiskAssets);

const assetAliases: Record<string, string> = {
  BINARYX: "BNB",
  BITCOIN: "BTC",
  BITTENSOR: "TAO",
  CHAINLINK: "LINK",
  ETHEREUM: "ETH",
  HYPERLIQUID: "HYPE",
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

  return stringFrom(value, ["ru", "en", "title", "name"]);
}

function arrayPayload(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (!isRecord(value)) {
    return [];
  }

  for (const key of ["body", "data", "events", "result", "items"]) {
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

async function fetchJson(url: URL, init: RequestInit) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(url, {
      ...init,
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

function normalizeAssetSymbol(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
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
    stringFrom(record, ["symbol", "ticker", "asset", "coin"]),
  );

  if (fallbackSymbol) {
    found.add(fallbackSymbol);
  }

  return [...found];
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
    /conference|ama|governance|partnership|launch|upgrade|announcement|ecosystem/.test(
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

  if (/inflation expectations|fed member|treasury/.test(normalized)) {
    return "medium";
  }

  return "low";
}

function riskEvent({
  affectedAssets,
  category,
  date,
  id,
  impact,
  source,
  sourceUrl,
  status = "auto",
  time,
  title,
  whyItMatters,
}: {
  affectedAssets: string[];
  category: RiskCategory;
  date: string;
  id: string;
  impact: RiskImpact;
  source?: string;
  sourceUrl?: string;
  status?: RiskEvent["status"];
  time?: string;
  title: string;
  whyItMatters: string;
}): RiskEvent {
  return {
    affectedAssets,
    category,
    date,
    id,
    impact,
    impactLabel: getImpactLabel(impact),
    source,
    sourceUrl,
    status,
    time,
    title,
    whyItMatters,
  };
}

async function fetchCoinMarketCalEvents(apiKey: string, now: Date) {
  const url = new URL("https://developers.coinmarketcal.com/v1/events");
  url.searchParams.set("max", "100");
  url.searchParams.set("dateRangeStart", toDateKey(now));
  url.searchParams.set("dateRangeEnd", toDateKey(addDays(now, 7)));

  const data = await fetchJson(url, {
    headers: {
      accept: "application/json",
      "x-api-key": apiKey,
    },
    next: {
      revalidate: 300,
    },
  });

  return arrayPayload(data)
    .filter(isRecord)
    .map((event) => {
      const title =
        localizedString(event.title) ??
        stringFrom(event, ["name", "event", "caption"]) ??
        "Крипто-событие";
      const date = stringFrom(event, ["date_event", "date", "start_date"]);
      const affectedAssets = readAffectedAssets(event);
      const categoryText = arrayPayload(event.categories)
        .map((category) => (isRecord(category) ? localizedString(category.title) : localizedString(category)))
        .filter(Boolean)
        .join(" ");
      const impact = inferCryptoImpact(`${title} ${categoryText}`);
      const sourceUrl =
        stringFrom(event, ["source", "proof", "url"]) ??
        stringFrom(event, ["link"]);

      if (!date || affectedAssets.length === 0) {
        return null;
      }

      return riskEvent({
        affectedAssets,
        category: "crypto",
        date: date.slice(0, 10),
        id: `coinmarketcal-${title}-${date}`.toLowerCase().replaceAll(/\s+/g, "-"),
        impact,
        source: "CoinMarketCal",
        sourceUrl: sourceUrl ?? undefined,
        title,
        whyItMatters:
          "Событие по крипторынку может изменить ожидания участников и волатильность в затронутых активах.",
      });
    })
    .filter((event): event is RiskEvent => event !== null);
}

async function fetchTradingEconomicsEvents(apiKey: string, now: Date) {
  const start = toDateKey(now);
  const end = toDateKey(addDays(now, 7));
  const url = new URL(
    `https://api.tradingeconomics.com/calendar/country/united%20states/${start}/${end}`,
  );
  url.searchParams.set("c", apiKey);
  url.searchParams.set("format", "json");

  const data = await fetchJson(url, {
    headers: {
      accept: "application/json",
    },
    next: {
      revalidate: 300,
    },
  });

  const relevantWords =
    /CPI|Core CPI|PCE|Core PCE|FOMC|Fed|Powell|Non Farm Payrolls|Nonfarm|Unemployment|GDP|Inflation Expectations|Interest Rate Decision/i;

  return arrayPayload(data)
    .filter(isRecord)
    .map((event) => {
      const title = stringFrom(event, ["Event", "event", "Category", "category"]);
      const date = stringFrom(event, ["Date", "date"]);

      if (!title || !date || !relevantWords.test(title)) {
        return null;
      }

      const impact = inferMacroImpact(title);

      return riskEvent({
        affectedAssets: ["BTC", "ETH", "ALTS"],
        category: "macro",
        date: date.slice(0, 10),
        id: `trading-economics-${title}-${date}`
          .toLowerCase()
          .replaceAll(/\s+/g, "-"),
        impact,
        source: "Trading Economics",
        title,
        whyItMatters:
          "Макро-событие влияет на ожидания по ставке, доллар, доходности и общий режим risk-on/risk-off.",
      });
    })
    .filter((event): event is RiskEvent => event !== null);
}

function parseUnlockSchedule(schedule: unknown, asset: string, now: Date) {
  const end = addDays(now, 7);

  return arrayPayload(schedule)
    .filter(isRecord)
    .map((unlock) => {
      const date = stringFrom(unlock, [
        "date",
        "unlock_date",
        "vesting_date",
        "timestamp",
      ]);

      if (!date) {
        return null;
      }

      const parsedDate = new Date(date);

      if (Number.isNaN(parsedDate.getTime()) || parsedDate < now || parsedDate > end) {
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
        date: toDateKey(parsedDate),
        id: `unlock-${asset}-${toDateKey(parsedDate)}`.toLowerCase(),
        impact,
        source: "Mobula",
        title: `${asset}: token unlock`,
        whyItMatters:
          "Разблокировка увеличивает доступное предложение токена и может усилить давление, особенно на слабом рынке.",
      });
    })
    .filter((event): event is RiskEvent => event !== null);
}

async function fetchMobulaUnlockEvents(apiKey: string, now: Date) {
  const url = new URL("https://api.mobula.io/api/1/metadata/multi");
  url.searchParams.set("assets", trackedRiskAssets.join(","));

  const data = await fetchJson(url, {
    headers: {
      accept: "application/json",
      Authorization: apiKey,
    },
    next: {
      revalidate: 300,
    },
  });

  const payload = isRecord(data) ? data.data : null;
  const rows = Array.isArray(payload)
    ? payload
    : isRecord(payload)
      ? Object.values(payload)
      : [];

  return rows
    .filter(isRecord)
    .flatMap((assetData) => {
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
}

async function fetchMessariUnlockEvents() {
  // TODO: подключить точный Messari Token Unlocks endpoint после выбора тарифа/API.
  return [] as RiskEvent[];
}

async function fetchCryptoRankUnlockEvents() {
  // TODO: подключить точный CryptoRank unlocks endpoint после выбора тарифа/API.
  return [] as RiskEvent[];
}

async function fetchTokenUnlockEvents(now: Date) {
  if (process.env.MOBULA_API_KEY) {
    return fetchMobulaUnlockEvents(process.env.MOBULA_API_KEY, now);
  }

  if (process.env.MESSARI_API_KEY) {
    return fetchMessariUnlockEvents();
  }

  if (process.env.CRYPTORANK_API_KEY) {
    return fetchCryptoRankUnlockEvents();
  }

  return [] as RiskEvent[];
}

function sourceState(hasKey: boolean): RiskSourceState {
  return hasKey ? "api" : "disabled";
}

export async function GET() {
  const now = new Date();
  const coinMarketCalKey = process.env.COINMARKETCAL_API_KEY;
  const tradingEconomicsKey = process.env.TRADING_ECONOMICS_KEY;
  const hasUnlockKey = Boolean(
    process.env.MOBULA_API_KEY ||
      process.env.MESSARI_API_KEY ||
      process.env.CRYPTORANK_API_KEY,
  );

  // Автоматические источники подключаются только при наличии API-ключей в env.
  // Без ключей приложение использует manualRiskCalendar и fallback-сценарий.
  // API-ключи нельзя хранить на клиенте.
  const [macroEvents, cryptoEvents, unlockEvents] = await Promise.all([
    tradingEconomicsKey
      ? fetchTradingEconomicsEvents(tradingEconomicsKey, now).catch(() => [])
      : Promise.resolve([]),
    coinMarketCalKey
      ? fetchCoinMarketCalEvents(coinMarketCalKey, now).catch(() => [])
      : Promise.resolve([]),
    fetchTokenUnlockEvents(now).catch(() => []),
  ]);

  const automaticEvents = [...macroEvents, ...cryptoEvents, ...unlockEvents];
  const events = normalizeRiskEvents(
    automaticEvents.length > 0 ? automaticEvents : manualRiskCalendar,
    now,
  );
  const mainRisk = getMainRisk(events, now);

  const payload: RiskApiResponse = {
    events,
    mainRisk,
    sources: {
      crypto: sourceState(Boolean(coinMarketCalKey)),
      macro: sourceState(Boolean(tradingEconomicsKey)),
      unlocks: sourceState(hasUnlockKey),
    },
    updatedAt: new Date().toISOString(),
  };

  return Response.json(payload);
}
