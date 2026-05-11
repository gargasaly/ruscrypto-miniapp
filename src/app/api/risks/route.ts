import {
  dateFromKey,
  btcRiskFallback,
  getImpactLabel,
  getMainRisk,
  manualRiskCalendar,
  normalizeRiskEvents,
  toDateKey,
  trackedRiskAssets,
  type RiskApiResponse,
  type RiskAssetConfidence,
  type RiskCategory,
  type RiskEvent,
  type RiskImpact,
  type RiskMarketRelevance,
  type RiskSourceState,
} from "@/lib/riskCalendar";

export const revalidate = 0;
export const dynamic = "force-dynamic";

type UnknownRecord = Record<string, unknown>;
type SourceStatus = "ok" | "failed" | "partial" | "skipped";

type FetchJsonResult = {
  data: unknown | null;
  error: string | null;
};

type SourceFetchResult = {
  events: RiskEvent[];
  normalizedSamples?: NormalizedSample[];
  rawCount: number;
  reason?: string;
  sampleTitles?: string[];
  status?: SourceStatus;
};

type SourceTask = {
  enabled: boolean;
  load?: () => Promise<SourceFetchResult>;
  name: string;
  reason?: string;
  requestRange?: string;
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
  requestRange?: string;
};

type NormalizedSample = {
  title: string;
  source: string | null;
  originalCoins: string[];
  resolvedAffectedAssets: string[];
  assetConfidence: RiskAssetConfidence;
  originalImpact: string | null;
  calculatedImpact: RiskImpact;
  marketRelevance: RiskMarketRelevance;
  reason: string;
};

type RiskDebug = {
  now: string;
  rangeStart: string;
  rangeEnd: string;
  env: {
    ALPHAVANTAGE_API_KEY: boolean;
    COINMARKETCAL_API_KEY: boolean;
    CRYPTORANK_API_KEY: boolean;
    FMP_API_KEY: boolean;
    FRED_API_KEY: boolean;
    MESSARI_API_KEY: boolean;
    MOBULA_API_KEY: boolean;
    TRADING_ECONOMICS_KEY: boolean;
  };
  sources: RiskSourceDebug[];
  normalizedSamples: NormalizedSample[];
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
  macroCoverage: {
    blsReturnedEvents: number;
    fedReturnedEvents: number;
    fallbackMacroEventsAdded: number;
    fredReturnedEvents: number;
    fmpReturnedEvents: number;
    highMacroEventsInCalendar: number;
    mediumMacroEventsInCalendar: number;
    missingExpectedMacroEvents: string[];
    treasuryReturnedEvents: number;
  };
};

type RiskApiDebugResponse = RiskApiResponse & {
  debug?: RiskDebug;
};

const trackedAssetSet = new Set<string>(trackedRiskAssets);
const localFallbackAssets = ["ALTS"];
const fallbackAssets = ["BTC", "ETH", "ALTS"];
const allowedImpacts: RiskImpact[] = ["high", "medium", "low"];
const allowedCategories: RiskCategory[] = ["macro", "crypto", "token"];
const majorTokenSet = new Set([
  "BTC",
  "ETH",
  "SOL",
  "BNB",
  "XRP",
  "AVAX",
  "NEAR",
  "LINK",
  "AAVE",
  "TON",
  "SUI",
  "TAO",
  "RENDER",
  "ONDO",
]);

const macroWhyItMatters =
  "Макро-событие может изменить ожидания по ставкам, DXY, доходностям US Treasuries и risk-on/risk-off настроению. Для BTC/ETH это важно через ликвидность и аппетит к риску.";
const macroPositiveScenario =
  "Мягкие данные или снижение инфляционного давления обычно поддерживают risk-on и могут помочь BTC/ETH удержать уровни.";
const macroNegativeScenario =
  "Жёсткие данные или рост инфляционных ожиданий могут усилить давление через доллар, доходности и снижение аппетита к риску.";

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

const assetTextAliases: Record<string, string> = {
  AAVE: "AAVE",
  AVALANCHE: "AVAX",
  AVAX: "AVAX",
  BINANCE: "BNB",
  BITCOIN: "BTC",
  BNB: "BNB",
  BTC: "BTC",
  CHAINLINK: "LINK",
  ETH: "ETH",
  ETHEREUM: "ETH",
  HYPE: "HYPE",
  HYPERLIQUID: "HYPE",
  JUP: "JUP",
  LINK: "LINK",
  NEAR: "NEAR",
  ONDO: "ONDO",
  PENDLE: "PENDLE",
  RENDER: "RENDER",
  RNDR: "RENDER",
  SOL: "SOL",
  SOLANA: "SOL",
  SUI: "SUI",
  TAO: "TAO",
  TON: "TON",
  TONCOIN: "TON",
  UNI: "UNI",
  UNISWAP: "UNI",
  XRP: "XRP",
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

  for (const key of ["body", "data", "events", "release_dates", "result", "items", "rows"]) {
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

function readTime(value: string | null, explicitTime?: string | null) {
  if (explicitTime && /^\d{1,2}:\d{2}/.test(explicitTime)) {
    return explicitTime.slice(0, 5).padStart(5, "0");
  }

  if (!value) {
    return undefined;
  }

  const match = value.match(/[T\s](\d{2}:\d{2})/);

  return match?.[1];
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

function isDateInNextHours(date: string, now: Date, hours: number) {
  const start = startOfLocalDay(now);
  const end = new Date(now);
  end.setHours(end.getHours() + hours);
  const parsed = dateFromKey(date);

  return parsed >= start && parsed <= end;
}

function safeFetchError(error: unknown) {
  if (!(error instanceof Error)) {
    return "request-failed";
  }

  if (error.name === "AbortError") {
    return "request-timeout";
  }

  if (error.name === "TypeError") {
    return "network-or-request-failed";
  }

  return error.name || "request-failed";
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
      error: safeFetchError(error),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchText(url: URL, init?: RequestInit): Promise<FetchJsonResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        accept: "text/html,application/xhtml+xml,text/plain",
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        data: null,
        error: `http-${response.status}`,
      };
    }

    return {
      data: await response.text(),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: safeFetchError(error),
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

function normalizeSourceAssetSymbol(value: string | null) {
  if (!value) {
    return null;
  }

  const cleaned = value
    .trim()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9.-]/gi, " ")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-");
  const aliased = assetAliases[cleaned] ?? cleaned;

  if (!/^[A-Z0-9.-]{2,15}$/.test(aliased)) {
    return null;
  }

  return aliased;
}

function readOriginalCoins(record: UnknownRecord) {
  const originalCoins: string[] = [];
  const candidates = [record.coins, record.currencies, record.assets, record.tokens];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) {
      continue;
    }

    for (const item of candidate) {
      if (typeof item === "string" && item.trim()) {
        originalCoins.push(item.trim());
      }

      if (isRecord(item)) {
        const value = stringFrom(
          item,
          ["symbol", "ticker", "code", "name", "slug"],
        );

        if (value) {
          originalCoins.push(value);
        }
      }
    }
  }

  const fallbackSymbol = stringFrom(record, ["symbol", "ticker", "asset", "coin", "slug"]);

  if (fallbackSymbol) {
    originalCoins.push(fallbackSymbol);
  }

  return [...new Set(originalCoins)];
}

function readStructuredAssets(record: UnknownRecord) {
  return [
    ...new Set(
      readOriginalCoins(record)
        .map((coin) => normalizeAssetSymbol(coin) ?? normalizeSourceAssetSymbol(coin))
        .filter((asset): asset is string => Boolean(asset)),
    ),
  ];
}

function readTextAssets(text: string) {
  const found = new Set<string>();
  const normalizedText = text.toUpperCase();

  for (const [alias, symbol] of Object.entries(assetTextAliases)) {
    if (symbol === "BTC" || symbol === "ETH") {
      continue;
    }

    if (new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(normalizedText)) {
      found.add(symbol);
    }
  }

  return [...found];
}

function normalizeAffectedAssets(assets: string[]) {
  return assets.length > 0 ? assets : localFallbackAssets;
}

function inferMacroImpact(text: string): RiskImpact {
  const normalized = text.toLowerCase();

  if (
    /core cpi|cpi|core pce|pce|fomc|interest rate|rate decision|fed interest|fed rate|powell|non farm|nonfarm|nfp|unemployment|gdp|treasury refunding/.test(
      normalized,
    )
  ) {
    return "high";
  }

  if (
    /ppi|retail sales|pmi|consumer sentiment|jobless claims|durable goods|industrial production|ism|inflation expectations|fed member|treasury|auction/.test(
      normalized,
    )
  ) {
    return "medium";
  }

  return "low";
}

function isMarketWideCryptoEvent(text: string) {
  return /spot etf|etf|sec\b|lawsuit|regulat|ban\b|approval|rejection|hack|exploit|bridge exploit|liquidation cascade|global crypto regulation|bitcoin conference|token2049|consensus|fomc|cpi|pce|gdp|unemployment|nonfarm payroll|non farm payroll|fed\b/.test(
    text.toLowerCase(),
  );
}

function isLocalEvent(text: string) {
  return /community call|community ama|korean ama|ama\b|x space|twitter space|telegram ama|announcement|open beta|arcade opens|minor release|minor integration|nft mint|giveaway|bitmart listing|gate listing|mexc listing|small exchange listing|audit|forum|local conference|kbcc/.test(
    text.toLowerCase(),
  );
}

function isListingEvent(text: string) {
  return /listing|listed|bitmart|gate\b|mexc|binance|coinbase/.test(text.toLowerCase());
}

function isEthSpecificEvent(text: string) {
  const normalized = text.toLowerCase();

  return /\bethereum\b/.test(normalized) || /^eth\b/.test(normalized);
}

function isSyntheticBtcProduct(text: string) {
  return /wrapped btc|wrapped bitcoin|strkbtc|btc launch|bitcoin launch|btc event/.test(
    text.toLowerCase(),
  );
}

function resolveAffectedAssets({
  category,
  categoryText = "",
  record,
  title,
}: {
  category: RiskCategory;
  categoryText?: string;
  record?: UnknownRecord;
  title: string;
}) {
  if (category === "macro") {
    return {
      assets: fallbackAssets,
      assetConfidence: "exact" as const,
      originalCoins: [] as string[],
      reason: "macro-market-wide",
    };
  }

  const text = `${title} ${categoryText}`;

  if (isMarketWideCryptoEvent(text)) {
    return {
      assets: fallbackAssets,
      assetConfidence: "exact" as const,
      originalCoins: record ? readOriginalCoins(record) : [],
      reason: "market-wide-keyword",
    };
  }

  const originalCoins = record ? readOriginalCoins(record) : [];
  const structuredAssets = record ? readStructuredAssets(record) : [];

  if (structuredAssets.length > 0) {
    return {
      assets: structuredAssets,
      assetConfidence: "exact" as const,
      originalCoins,
      reason: "source-coin-symbol",
    };
  }

  if (/\bbitcoin\b/i.test(text) && !isSyntheticBtcProduct(text)) {
    return {
      assets: ["BTC"],
      assetConfidence: "inferred" as const,
      originalCoins,
      reason: "explicit-bitcoin-text",
    };
  }

  if (isEthSpecificEvent(text)) {
    return {
      assets: ["ETH"],
      assetConfidence: "inferred" as const,
      originalCoins,
      reason: "explicit-ethereum-text",
    };
  }

  const textAssets = readTextAssets(text);

  if (textAssets.length > 0) {
    return {
      assets: textAssets,
      assetConfidence: "inferred" as const,
      originalCoins,
      reason: "tracked-token-text",
    };
  }

  return {
    assets: localFallbackAssets,
    assetConfidence: "unknown" as const,
    originalCoins,
    reason: "no-specific-token",
  };
}

function resolveMarketRelevance({
  affectedAssets,
  category,
  categoryText = "",
  title,
}: {
  affectedAssets: string[];
  category: RiskCategory;
  categoryText?: string;
  title: string;
}): RiskMarketRelevance {
  const text = `${title} ${categoryText}`;

  if (category === "macro" || isMarketWideCryptoEvent(text)) {
    return "market-wide";
  }

  if (/forum|conference/.test(text.toLowerCase()) && affectedAssets.some((asset) => trackedAssetSet.has(asset))) {
    return "watchlist-token";
  }

  if (isLocalEvent(text)) {
    return "local";
  }

  if (affectedAssets.some((asset) => majorTokenSet.has(asset))) {
    return "major-token";
  }

  if (affectedAssets.some((asset) => trackedAssetSet.has(asset))) {
    return "watchlist-token";
  }

  if (affectedAssets.includes("ALTS")) {
    return "unknown";
  }

  return "local";
}

function marketRelevanceLabel(relevance: RiskMarketRelevance) {
  if (relevance === "market-wide") {
    return "рынок";
  }

  if (relevance === "major-token") {
    return "крупный токен";
  }

  if (relevance === "watchlist-token") {
    return "watchlist";
  }

  if (relevance === "local") {
    return "локальное";
  }

  return "неизвестно";
}

function marketRelevanceForAssets(assets: string[]): RiskMarketRelevance {
  if (assets.some((asset) => majorTokenSet.has(asset))) {
    return "major-token";
  }

  if (assets.some((asset) => trackedAssetSet.has(asset))) {
    return "watchlist-token";
  }

  return "unknown";
}

function calculateRiskImpact({
  affectedAssets,
  categoryText = "",
  marketRelevance,
  title,
}: {
  affectedAssets: string[];
  categoryText?: string;
  marketRelevance: RiskMarketRelevance;
  title: string;
}): RiskImpact {
  const text = `${title} ${categoryText}`.toLowerCase();

  if (isLocalEvent(text)) {
    return "low";
  }

  if (
    /etf|spot etf|sec\b|regulat|lawsuit|court|major exploit|bridge exploit|hack|liquidation cascade|global crypto regulation/.test(
      text,
    )
  ) {
    return "high";
  }

  if (/hard fork|major upgrade/.test(text) && affectedAssets.some((asset) => asset === "BTC" || asset === "ETH")) {
    return "high";
  }

  if (
    /(binance|coinbase).*(listing|list)|listing.*(binance|coinbase)/.test(text) &&
    marketRelevance === "major-token"
  ) {
    return "high";
  }

  if (isListingEvent(text) && /bitmart|gate\b|mexc|small exchange/.test(text)) {
    return "low";
  }

  if (marketRelevance === "unknown" || marketRelevance === "local") {
    return "low";
  }

  if (
    /network upgrade|mainnet|testnet|governance|vote|partnership|product launch|launch|upgrade|listing/.test(
      text,
    )
  ) {
    return "medium";
  }

  if (marketRelevance === "major-token" || marketRelevance === "watchlist-token") {
    return "medium";
  }

  return "low";
}

function cryptoWhyItMatters({
  affectedAssets,
  marketRelevance,
  title,
}: {
  affectedAssets: string[];
  marketRelevance: RiskMarketRelevance;
  title: string;
}) {
  const text = title.toLowerCase();

  if (marketRelevance === "market-wide") {
    return "Рыночное событие может изменить общий риск по BTC/ETH и альтам, особенно если оно связано с ETF, регуляторами или крупной инфраструктурой.";
  }

  if (isListingEvent(text)) {
    return "Листинг может дать локальную волатильность конкретному токену, но не является рыночным событием для BTC/ETH.";
  }

  if (/ama|community|x space|telegram/.test(text)) {
    return "Community-событие полезно для внимания к проекту, но редко влияет на широкий рынок.";
  }

  if (affectedAssets.includes("ETH")) {
    return "Событие связано с экосистемой Ethereum и может влиять на интерес к ETH/связанным проектам, но масштаб зависит от значимости события.";
  }

  if (marketRelevance === "local" || marketRelevance === "unknown") {
    return "Локальное событие проекта. Может повлиять на интерес к конкретному токену, но обычно не меняет общий риск по BTC/ETH.";
  }

  return "Событие связано с конкретным активом из watchlist. Влияние обычно локальное и зависит от масштаба новости.";
}

function cryptoWhatIsIt(title: string) {
  const text = title.toLowerCase();

  if (isListingEvent(text)) {
    return "Листинг — добавление токена на биржу или торговую площадку.";
  }

  if (/ama|community call|x space|telegram/.test(text)) {
    return "AMA/community call — встреча команды проекта с аудиторией.";
  }

  if (/mainnet|testnet|network upgrade|upgrade|migration/.test(text)) {
    return "Техническое обновление сети или запуск новой версии.";
  }

  if (/unlock/.test(text)) {
    return "Unlock — разблокировка ранее замороженных токенов.";
  }

  return "Событие проекта — новость или активность, связанная с конкретной экосистемой.";
}

function affectedTokenNote(assets: string[], marketRelevance: RiskMarketRelevance) {
  if (marketRelevance === "market-wide") {
    return "Событие относится к широкому рынку и может влиять на BTC/ETH через общий риск.";
  }

  if (assets.length === 1 && assets[0] !== "ALTS") {
    if (trackedAssetSet.has(assets[0])) {
      return `Событие относится к токену ${assets[0]}. Влияние зависит от масштаба события.`;
    }

    return `Событие относится к токену ${assets[0]}. Он не входит в основной watchlist приложения, поэтому влияние считается локальным.`;
  }

  if (marketRelevance === "local") {
    return "Влияние локальное: только на конкретный проект или сектор.";
  }

  return "Токен не удалось определить автоматически, поэтому событие помечено как ALTS.";
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
  affectedTokenNote,
  assetConfidence,
  category,
  date,
  id,
  impact,
  marketRelevance,
  description,
  negativeScenario,
  positiveScenario,
  source,
  sourceType,
  sourceUrl,
  status = "auto",
  time,
  title,
  url,
  whatIsIt,
  whyItMatters,
}: {
  affectedAssets: string[];
  affectedTokenNote?: string;
  assetConfidence?: RiskAssetConfidence;
  category: RiskCategory;
  date: string;
  description?: string;
  id: string;
  impact: RiskImpact;
  marketRelevance?: RiskMarketRelevance;
  negativeScenario?: string;
  positiveScenario?: string;
  source?: string;
  sourceType?: RiskEvent["sourceType"];
  sourceUrl?: string;
  status?: RiskEvent["status"];
  time?: string;
  title: string;
  url?: string;
  whatIsIt?: string;
  whyItMatters: string;
}): RiskEvent {
  return {
    affectedAssets: normalizeAffectedAssets(affectedAssets),
    affectedTokenNote,
    assetConfidence,
    category,
    date,
    description: description ?? whyItMatters,
    id,
    impact,
    impactLabel: getImpactLabel(impact),
    marketRelevance,
    marketRelevanceLabel: marketRelevance
      ? marketRelevanceLabel(marketRelevance)
      : undefined,
    negativeScenario,
    positiveScenario,
    source,
    sourceType,
    sourceUrl,
    status,
    time,
    title,
    url: url ?? sourceUrl,
    whatIsIt,
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

type MacroDescription = {
  impact: RiskImpact;
  negativeScenario: string;
  positiveScenario: string;
  whatIsIt: string;
  whyItMatters: string;
};

function macroDescriptionForTitle(title: string): MacroDescription | null {
  const group = macroCoverageKey(title);

  if (group === "cpi" || group === "pce") {
    return {
      impact: "high",
      negativeScenario:
        "Инфляция выше ожиданий может усилить доллар и доходности, что давит на риск-активы.",
      positiveScenario:
        "Инфляция ниже ожиданий обычно поддерживает risk-on и может помочь BTC/ETH.",
      whatIsIt:
        group === "cpi"
          ? "CPI — индекс потребительской инфляции США."
          : "PCE — инфляционный показатель, на который внимательно смотрит ФРС.",
      whyItMatters:
        "Один из главных инфляционных релизов. Влияет на ожидания по ставкам ФРС, DXY, доходности и аппетит к риску.",
    };
  }

  if (group === "ppi") {
    return {
      impact: "high",
      negativeScenario: "Сильный PPI может поддержать доллар и доходности.",
      positiveScenario: "Слабый PPI снижает инфляционные опасения.",
      whatIsIt: "PPI — индекс цен производителей, опережающий инфляционный индикатор.",
      whyItMatters: "Может подсказать будущую динамику потребительской инфляции.",
    };
  }

  if (group === "employment") {
    return {
      impact: "high",
      negativeScenario:
        "Слишком сильные данные могут давить на BTC через доллар и доходности.",
      positiveScenario: "Умеренное охлаждение рынка труда обычно поддерживает risk-on.",
      whatIsIt: "Данные по занятости показывают состояние рынка труда США.",
      whyItMatters: "Сильный рынок труда может удерживать ФРС от смягчения политики.",
    };
  }

  if (group === "jobless") {
    return {
      impact: "medium",
      negativeScenario: "Слишком сильный рынок труда может удерживать ФРС жёсткой.",
      positiveScenario:
        "Умеренно слабые данные могут поддержать ожидания смягчения ФРС.",
      whatIsIt: "Initial Jobless Claims — недельные заявки на пособие по безработице.",
      whyItMatters: "Показывает скорость охлаждения или устойчивости рынка труда.",
    };
  }

  if (group === "retail-sales") {
    return {
      impact: "medium",
      negativeScenario: "Сильные данные могут давить на risk-on.",
      positiveScenario: "Мягкие данные могут ослабить давление ставок.",
      whatIsIt: "Retail Sales показывает динамику потребительских расходов.",
      whyItMatters:
        "Сильное потребление может поддерживать инфляцию и жёсткие ожидания по ставкам.",
    };
  }

  if (group === "industrial-production") {
    return {
      impact: "medium",
      negativeScenario: "Сильные данные могут поддержать доллар и доходности.",
      positiveScenario: "Умеренное охлаждение может поддержать ожидания мягкой политики.",
      whatIsIt:
        "Промпроизводство показывает состояние промышленности, добычи и коммунального сектора.",
      whyItMatters:
        "Помогает оценить силу экономики и риск инфляционного давления.",
    };
  }

  if (group === "budget") {
    return {
      impact: "medium",
      negativeScenario:
        "Сильный дефицит может усилить опасения по долговому рынку и давить на risk-on.",
      positiveScenario: "Спокойный дефицит снижает давление на доходности.",
      whatIsIt: "Monthly Treasury Statement показывает баланс федерального бюджета США.",
      whyItMatters:
        "Фискальный фон влияет на ожидания по заимствованиям, ликвидности и доходностям.",
    };
  }

  if (group === "fed-rate") {
    return {
      impact: "high",
      negativeScenario: "Жёсткая риторика давит на BTC/ETH и альты.",
      positiveScenario: "Мягкая риторика поддерживает risk-on.",
      whatIsIt: "Событие связано с политикой ФРС и ожиданиями по ставкам.",
      whyItMatters:
        "Риторика ФРС напрямую влияет на доллар, доходности и аппетит к риску.",
    };
  }

  if (group === "import-export-prices") {
    return {
      impact: "low",
      negativeScenario: "Выше ожиданий — риск роста инфляционного фона.",
      positiveScenario: "Слабее ожиданий — меньше инфляционного давления.",
      whatIsIt:
        "Индексы импортных и экспортных цен показывают внешнее ценовое давление.",
      whyItMatters: "Могут дополнять инфляционную картину, но обычно слабее CPI/PPI.",
    };
  }

  if (
    [
      "adp",
      "consumer-sentiment",
      "durable-goods",
      "empire-state",
      "gdp",
      "housing-starts",
      "ism-pmi",
      "jolts",
    ].includes(group)
  ) {
    return {
      impact: group === "gdp" ? "high" : "medium",
      negativeScenario: "Жёсткие данные могут усилить давление на BTC.",
      positiveScenario: "Мягкие данные обычно поддерживают риск-активы.",
      whatIsIt: "Макроэкономическое событие.",
      whyItMatters:
        "Может влиять на ожидания по ставкам, доллару, доходностям и risk-on/risk-off.",
    };
  }

  return null;
}

function macroRiskEvent({
  date,
  id,
  source,
  sourceType = "api",
  sourceUrl,
  status = "auto",
  time,
  title,
}: {
  date: string;
  id: string;
  source: string;
  sourceType?: RiskEvent["sourceType"];
  sourceUrl?: string;
  status?: RiskEvent["status"];
  time?: string;
  title: string;
}) {
  const description = macroDescriptionForTitle(title);

  if (!description) {
    return null;
  }

  return riskEvent({
    affectedAssets: fallbackAssets,
    affectedTokenNote: "Для BTC/ETH это важно через ликвидность и risk-on/risk-off.",
    assetConfidence: "exact",
    category: "macro",
    date,
    id,
    impact: description.impact,
    marketRelevance: "market-wide",
    negativeScenario: description.negativeScenario,
    positiveScenario: description.positiveScenario,
    source,
    sourceType,
    sourceUrl,
    status,
    time,
    title,
    whatIsIt: description.whatIsIt,
    whyItMatters: description.whyItMatters,
  });
}

async function fetchFredReleaseCalendar(apiKey: string, now: Date): Promise<SourceFetchResult> {
  const { rangeEnd, rangeStart } = getCalendarRange(now);
  const url = new URL("https://api.stlouisfed.org/fred/releases/dates");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("include_release_dates_with_no_data", "true");
  url.searchParams.set("limit", "1000");
  url.searchParams.set("realtime_end", rangeEnd);
  url.searchParams.set("realtime_start", rangeStart);

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
      status: "failed",
    };
  }

  const rows = arrayPayload(data).filter(isRecord);
  const events = rows
    .map((row) => {
      const title =
        stringFrom(row, ["release_name", "name", "title", "release"]) ??
        rawTitleFromRecord(row);
      const date = normalizeEventDate(stringFrom(row, ["date", "release_date"]));

      if (!date) {
        return null;
      }

      return macroRiskEvent({
        date,
        id: `fred-${slugify(title)}-${date}`,
        source: "FRED Release Calendar",
        status: "auto",
        title,
      });
    })
    .filter((event): event is RiskEvent => event !== null);

  return {
    events,
    rawCount: rows.length,
    sampleTitles: rows.map(rawTitleFromRecord).slice(0, 5),
    status: events.length > 0 ? "ok" : "partial",
  };
}

const monthNumber: Record<string, number> = {
  april: 3,
  august: 7,
  december: 11,
  february: 1,
  january: 0,
  july: 6,
  june: 5,
  march: 2,
  may: 4,
  november: 10,
  october: 9,
  september: 8,
};

function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function toTwentyFourHourTime(value: string | null) {
  if (!value) {
    return undefined;
  }

  const match = value.match(/(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)/i);

  if (!match) {
    return undefined;
  }

  let hour = Number(match[1]);
  const minute = match[2];
  const period = match[3].toLowerCase();

  if (period.startsWith("p") && hour < 12) {
    hour += 12;
  }

  if (period.startsWith("a") && hour === 12) {
    hour = 0;
  }

  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function parseLooseDate(value: string) {
  const trimmed = value.trim();
  const iso = normalizeEventDate(trimmed);

  if (iso) {
    return iso;
  }

  const monthMatch = trimmed.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(20\d{2})\b/i,
  );

  if (monthMatch) {
    return toDateKey(
      new Date(Number(monthMatch[3]), monthNumber[monthMatch[1].toLowerCase()], Number(monthMatch[2])),
    );
  }

  const slashMatch = trimmed.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);

  if (slashMatch) {
    return toDateKey(
      new Date(Number(slashMatch[3]), Number(slashMatch[1]) - 1, Number(slashMatch[2])),
    );
  }

  return null;
}

function extractScheduleDates(html: string) {
  const text = htmlToText(html);
  const matches = [
    ...text.matchAll(
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s*20\d{2}\b/gi,
    ),
    ...text.matchAll(/\b\d{1,2}\/\d{1,2}\/20\d{2}\b/g),
    ...text.matchAll(/\b20\d{2}-\d{2}-\d{2}\b/g),
  ];

  return matches
    .map((match) => {
      const date = parseLooseDate(match[0]);
      const context = text.slice(Math.max(0, match.index - 160), (match.index ?? 0) + 200);
      const time = toTwentyFourHourTime(
        context.match(/\b\d{1,2}:\d{2}\s*(?:a\.?m\.?|p\.?m\.?)\b/i)?.[0] ?? null,
      );

      return date ? { date, time: time ?? undefined } : null;
    })
    .filter((item): item is { date: string; time: string | undefined } => item !== null);
}

async function fetchBlsSchedule(now: Date): Promise<SourceFetchResult> {
  const sources = [
    {
      title: "Consumer Price Index",
      url: "https://www.bls.gov/schedule/news_release/cpi.htm",
    },
    {
      title: "Producer Price Index",
      url: "https://www.bls.gov/schedule/news_release/ppi.htm",
    },
    {
      title: "Employment Situation",
      url: "https://www.bls.gov/schedule/news_release/empsit.htm",
    },
    {
      title: "Import and Export Price Indexes",
      url: "https://www.bls.gov/schedule/news_release/ximpim.htm",
    },
    {
      title: "JOLTS",
      url: "https://www.bls.gov/schedule/news_release/jolts.htm",
    },
    {
      title: "BLS Release Calendar",
      url: "https://www.bls.gov/schedule/news_release/current_year.asp",
    },
  ];
  const settled = await Promise.allSettled(
    sources.map(async (source) => {
      const { data, error } = await fetchText(new URL(source.url));

      if (error || typeof data !== "string") {
        return {
          error,
          events: [] as RiskEvent[],
          rawCount: 0,
          source,
        };
      }

      const dates = extractScheduleDates(data).filter((item) => isDateInCalendarRange(item.date, now));
      const events = dates
        .map((item) =>
          macroRiskEvent({
            date: item.date,
            id: `bls-${slugify(source.title)}-${item.date}`,
            source: "BLS Release Schedule",
            sourceType: "public-page",
            sourceUrl: source.url,
            status: "auto",
            time: item.time,
            title: source.title,
          }),
        )
        .filter((event): event is RiskEvent => event !== null);

      return {
        error: null,
        events,
        rawCount: dates.length,
        source,
      };
    }),
  );
  const results = settled.map((result, index) =>
    result.status === "fulfilled"
      ? result.value
      : {
          error: shortReason(result.reason),
          events: [] as RiskEvent[],
          rawCount: 0,
          source: sources[index],
        },
  );
  const events = results.flatMap((result) => result.events);
  const failedCount = results.filter((result) => result.error).length;

  return {
    events,
    rawCount: results.reduce((sum, result) => sum + result.rawCount, 0),
    reason: failedCount > 0 ? `${failedCount}-bls-pages-failed` : undefined,
    sampleTitles: events.length > 0
      ? events.map((event) => event.title).slice(0, 5)
      : results.map((result) => result.source.title).slice(0, 5),
    status: events.length > 0 ? (failedCount > 0 ? "partial" : "ok") : "failed",
  };
}

async function fetchFedReleasePages(now: Date): Promise<SourceFetchResult> {
  const sourceUrl = "https://www.federalreserve.gov/releases/g17/";
  const { data, error } = await fetchText(new URL(sourceUrl));

  if (error || typeof data !== "string") {
    return {
      events: [],
      rawCount: 0,
      reason: error ?? "invalid-html",
      status: "failed",
    };
  }

  const dates = extractScheduleDates(data).filter((item) => isDateInCalendarRange(item.date, now));
  const events = dates
    .map((item) =>
      macroRiskEvent({
        date: item.date,
        id: `fed-g17-industrial-production-${item.date}`,
        source: "Federal Reserve G.17",
        sourceType: "public-page",
        sourceUrl,
        status: "auto",
        time: item.time,
        title: "US Industrial Production",
      }),
    )
    .filter((event): event is RiskEvent => event !== null);

  return {
    events,
    rawCount: dates.length,
    sampleTitles: events.map((event) => event.title).slice(0, 5),
    status: events.length > 0 ? "ok" : "partial",
  };
}

async function fetchTreasuryReleaseCalendar(now: Date): Promise<SourceFetchResult> {
  const sourceUrl = "https://fiscaldata.treasury.gov/release-calendar/";
  const { data, error } = await fetchText(new URL(sourceUrl));

  if (error || typeof data !== "string") {
    return {
      events: [],
      rawCount: 0,
      reason: error ?? "invalid-html",
      status: "failed",
    };
  }

  const text = htmlToText(data);
  const hasTreasuryStatement = /monthly treasury statement|federal budget|treasury statement/i.test(text);
  const dates = hasTreasuryStatement
    ? extractScheduleDates(data).filter((item) => isDateInCalendarRange(item.date, now))
    : [];
  const events = dates
    .map((item) =>
      macroRiskEvent({
        date: item.date,
        id: `treasury-monthly-statement-${item.date}`,
        source: "Treasury Fiscal Data",
        sourceType: "public-page",
        sourceUrl,
        status: "auto",
        time: item.time,
        title: "Monthly Treasury Statement / US Federal Budget",
      }),
    )
    .filter((event): event is RiskEvent => event !== null);

  return {
    events,
    rawCount: dates.length,
    sampleTitles: events.map((event) => event.title).slice(0, 5),
    status: events.length > 0 ? "ok" : "partial",
  };
}

async function fetchFmpEconomicCalendar(apiKey: string, now: Date): Promise<SourceFetchResult> {
  const { rangeEnd, rangeStart } = getCalendarRange(now);
  const url = new URL("https://financialmodelingprep.com/stable/economic-calendar");
  url.searchParams.set("from", rangeStart);
  url.searchParams.set("to", rangeEnd);
  url.searchParams.set("apikey", apiKey);

  const { data, error } = await fetchJson(url, {
    headers: {
      accept: "application/json",
    },
  });

  if (error) {
    return {
      events: [],
      rawCount: 0,
      reason: error === "http-402" ? "http-402-paid-endpoint" : error,
      status: error === "http-402" ? "skipped" : "failed",
    };
  }

  const rows = arrayPayload(data).filter(isRecord);
  const events = rows
    .map((event) => {
      const rawDate = stringFrom(event, ["date", "Date", "datetime", "time"]);
      const date = normalizeEventDate(rawDate);
      const title =
        stringFrom(event, ["event", "Event", "title", "name", "indicator"]) ??
        "Макро-событие";

      if (!date) {
        return null;
      }

      const country = stringFrom(event, ["country", "Country"]);
      const titleWithCountry = country ? `${title} (${country})` : title;
      return macroRiskEvent({
        date,
        id: `fmp-${slugify(titleWithCountry)}-${date}`,
        source: "FMP Macro Calendar",
        status: "live",
        time: readTime(rawDate, stringFrom(event, ["time", "Time"])) ?? undefined,
        title: titleWithCountry,
      });
    })
    .filter((event): event is RiskEvent => event !== null);

  return {
    events,
    rawCount: rows.length,
    sampleTitles: rows.map(rawTitleFromRecord).slice(0, 5),
  };
}

// Hardcoded date-specific macro fallback was removed. Macro events now come from FRED, BLS, Fed, Treasury, FMP, or generic no-event fallback.

function macroCoverageKey(title: string) {
  const text = title.toLowerCase();

  if (/adp|ner pulse|employment estimate/.test(text)) {
    return "adp";
  }

  if (/\bcpi\b|consumer price/.test(text) && !/ppi|producer/.test(text)) {
    return "cpi";
  }

  if (/personal consumption expenditures|core pce|\bpce\b/.test(text)) {
    return "pce";
  }

  if (/treasury statement|federal budget|monthly treasury/.test(text)) {
    return "budget";
  }

  if (/\bppi\b|producer price/.test(text)) {
    return "ppi";
  }

  if (/jobless claims|initial claims/.test(text)) {
    return "jobless";
  }

  if (/employment situation|nonfarm|non-farm|payroll|unemployment rate/.test(text)) {
    return "employment";
  }

  if (/retail sales/.test(text)) {
    return "retail-sales";
  }

  if (/import.*export.*price|import price|export price/.test(text)) {
    return "import-export-prices";
  }

  if (/powell|fomc|federal funds|interest rate|rate decision|fed chair|federal reserve chair|leadership transition/.test(text)) {
    return "fed-rate";
  }

  if (/empire state|ny manufacturing/.test(text)) {
    return "empire-state";
  }

  if (/industrial production/.test(text)) {
    return "industrial-production";
  }

  if (/gross domestic product|\bgdp\b/.test(text)) {
    return "gdp";
  }

  if (/ism|pmi|purchasing managers/.test(text)) {
    return "ism-pmi";
  }

  if (/durable goods/.test(text)) {
    return "durable-goods";
  }

  if (/consumer sentiment|michigan/.test(text)) {
    return "consumer-sentiment";
  }

  if (/jolts|job openings/.test(text)) {
    return "jolts";
  }

  if (/housing starts/.test(text)) {
    return "housing-starts";
  }

  return slugify(title);
}

async function fetchAlphaVantageMacroContext(apiKey: string): Promise<SourceFetchResult> {
  const endpoints = [
    {
      name: "10Y Treasury Yield",
      params: {
        function: "TREASURY_YIELD",
        interval: "daily",
        maturity: "10year",
      },
    },
    {
      name: "2Y Treasury Yield",
      params: {
        function: "TREASURY_YIELD",
        interval: "daily",
        maturity: "2year",
      },
    },
    {
      name: "Unemployment",
      params: {
        function: "UNEMPLOYMENT",
      },
    },
    {
      name: "Nonfarm Payroll",
      params: {
        function: "NONFARM_PAYROLL",
      },
    },
  ];

  const settled = await Promise.allSettled(
    endpoints.map(async (endpoint) => {
      const url = new URL("https://www.alphavantage.co/query");
      Object.entries(endpoint.params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
      url.searchParams.set("apikey", apiKey);

      const { data, error } = await fetchJson(url, {
        headers: {
          accept: "application/json",
        },
      });

      if (error) {
        return {
          name: endpoint.name,
          ok: false,
          reason: error,
        };
      }

      if (
        isRecord(data) &&
        ("Note" in data || "Information" in data || "Error Message" in data)
      ) {
        return {
          name: endpoint.name,
          ok: false,
          reason: "api-limit-or-error",
        };
      }

      return {
        name: endpoint.name,
        ok: true,
        reason: null,
      };
    }),
  );
  const results = settled.map((result, index) =>
    result.status === "fulfilled"
      ? result.value
      : {
          name: endpoints[index].name,
          ok: false,
          reason: "request-failed",
        },
  );
  const okResults = results.filter((result) => result.ok);

  return {
    events: [],
    rawCount: okResults.length,
    reason:
      okResults.length === endpoints.length
        ? "macro-context-only"
        : okResults.length > 0
          ? "macro-context-partial"
          : "macro-context-unavailable",
    sampleTitles: results.map((result) => result.name).slice(0, 5),
    status:
      okResults.length === endpoints.length
        ? "ok"
        : okResults.length > 0
          ? "partial"
          : "failed",
  };
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
  const normalizedSamples: NormalizedSample[] = [];
  const events = rows
    .map((event) => {
      const title = rawTitleFromRecord(event);
      const originalImpact =
        stringFrom(event, ["impact", "importance", "rank", "hot_score"]) ??
        (typeof event.hot === "boolean" ? String(event.hot) : null);
      const date = normalizeEventDate(
        stringFrom(event, ["date_event", "date", "start_date", "created_at"]),
      );
      const categoryText = arrayPayload(event.categories)
        .map((category) => (isRecord(category) ? localizedString(category.title) : localizedString(category)))
        .filter(Boolean)
        .join(" ");
      const assetResolution = resolveAffectedAssets({
        category: "crypto",
        categoryText,
        record: event,
        title,
      });
      const marketRelevance = resolveMarketRelevance({
        affectedAssets: assetResolution.assets,
        category: "crypto",
        categoryText,
        title,
      });
      const impact = calculateRiskImpact({
        affectedAssets: assetResolution.assets,
        categoryText,
        marketRelevance,
        title,
      });
      const sourceUrl =
        stringFrom(event, ["source", "proof", "url", "link"]) ??
        (isRecord(event.source) ? stringFrom(event.source, ["url", "link"]) : null);

      if (!date) {
        return null;
      }

      normalizedSamples.push({
        assetConfidence: assetResolution.assetConfidence,
        calculatedImpact: impact,
        marketRelevance,
        originalCoins: assetResolution.originalCoins,
        originalImpact,
        reason: assetResolution.reason,
        resolvedAffectedAssets: assetResolution.assets,
        source: "CoinMarketCal",
        title,
      });

      return riskEvent({
        affectedAssets: assetResolution.assets,
        affectedTokenNote: affectedTokenNote(assetResolution.assets, marketRelevance),
        assetConfidence: assetResolution.assetConfidence,
        category: "crypto",
        date,
        id: `coinmarketcal-${slugify(title)}-${date}`,
        impact,
        marketRelevance,
        source: "CoinMarketCal",
        sourceUrl: sourceUrl ?? undefined,
        title,
        whatIsIt: cryptoWhatIsIt(title),
        whyItMatters: cryptoWhyItMatters({
          affectedAssets: assetResolution.assets,
          marketRelevance,
          title,
        }),
      });
    })
    .filter((event): event is RiskEvent => event !== null);

  return {
    events,
    normalizedSamples,
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
      const rawDate = stringFrom(event, ["Date", "date"]);
      const date = normalizeEventDate(rawDate);

      if (!date) {
        return null;
      }

      return riskEvent({
        affectedAssets: fallbackAssets,
        affectedTokenNote:
          "Для BTC/ETH это важно через ликвидность и risk-on/risk-off.",
        assetConfidence: "exact",
        category: "macro",
        date,
        id: `trading-economics-${slugify(title)}-${date}`,
        impact: inferMacroImpact(title),
        marketRelevance: "market-wide",
        negativeScenario: macroNegativeScenario,
        positiveScenario: macroPositiveScenario,
        source: "Trading Economics",
        time: readTime(rawDate, stringFrom(event, ["Time", "time"])) ?? undefined,
        title,
        whatIsIt: "Макро-событие — экономический релиз или решение регулятора.",
        whyItMatters: macroWhyItMatters,
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
        affectedTokenNote: "Важно смотреть размер unlock относительно circulating supply.",
        assetConfidence: "exact",
        category: "token",
        date,
        id: `unlock-${asset}-${date}`.toLowerCase(),
        impact,
        marketRelevance: marketRelevanceForAssets([asset]),
        source: "Mobula",
        title: `${asset}: token unlock`,
        whatIsIt: "Unlock — разблокировка ранее замороженных токенов.",
        whyItMatters:
          "Разблокировка может усилить давление предложения по конкретному токену. Важно смотреть размер unlock относительно circulating supply.",
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

async function fetchMessariEvents(): Promise<SourceFetchResult> {
  // TODO: подключить безопасный Messari crypto/news/asset endpoint после выбора тарифа/API.
  return {
    events: [],
    rawCount: 0,
    reason: "not-implemented",
    status: "partial",
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
      const affectedAssets = asset ? [asset] : localFallbackAssets;
      const marketRelevance = marketRelevanceForAssets(affectedAssets);
      const safeImpact: RiskImpact =
        !asset && impact === "high" ? "medium" : impact;
      const title = `${asset ?? "Token"}: token unlock`;

      return riskEvent({
        affectedAssets,
        affectedTokenNote:
          asset === null
            ? "Токен не удалось определить автоматически, проверь событие вручную."
            : "Важно смотреть размер unlock относительно circulating supply.",
        assetConfidence: asset ? "exact" : "unknown",
        category: "token",
        date,
        id: `cryptorank-unlock-${asset ?? "unknown"}-${date}`.toLowerCase(),
        impact: safeImpact,
        marketRelevance,
        source: "CryptoRank",
        sourceUrl: stringFrom(unlock, ["url", "sourceUrl"]) ?? undefined,
        title,
        whatIsIt: "Unlock — разблокировка ранее замороженных токенов.",
        whyItMatters:
          "Разблокировка может усилить давление предложения по конкретному токену. Важно смотреть размер unlock относительно circulating supply.",
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

function macroSourcePreference(event: RiskEvent) {
  const group = macroCoverageKey(event.title);

  if (event.source === "BLS Release Schedule" && ["cpi", "ppi", "employment", "import-export-prices", "jolts"].includes(group)) {
    return 10;
  }

  if (event.source === "Federal Reserve G.17" && group === "industrial-production") {
    return 10;
  }

  if (event.source === "Treasury Fiscal Data" && group === "budget") {
    return 10;
  }

  if (event.source === "FRED Release Calendar") {
    return 20;
  }

  if (event.source === "FMP Macro Calendar") {
    return 40;
  }

  return 30;
}

function dedupeMacroEventsBySourcePreference(events: RiskEvent[]) {
  const selected = new Map<string, RiskEvent>();
  const sorted = [...events].sort((left, right) => {
    const sourceDiff = macroSourcePreference(left) - macroSourcePreference(right);

    if (sourceDiff !== 0) {
      return sourceDiff;
    }

    return left.title.localeCompare(right.title);
  });

  for (const event of sorted) {
    if (event.category !== "macro") {
      selected.set(`${event.id}|${event.title}`, event);
      continue;
    }

    const key = `${event.date}|${macroCoverageKey(event.title)}`;

    if (!selected.has(key)) {
      selected.set(key, event);
    }
  }

  return [...selected.values()];
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

  if (debug.status === "partial") {
    console.warn(
      `${base} status=partial reason=${debug.reason ?? "partial"} raw=${debug.rawCount} normalized=${debug.normalizedCount} filtered=${debug.filteredOutCount}`,
    );
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
      requestRange: task.requestRange,
      sampleTitles: [],
      status: "skipped",
    };

    sourceLog(debug);

    return {
      debug,
      events: [] as RiskEvent[],
      normalizedSamples: [] as NormalizedSample[],
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
      result.status ??
      (result.reason && calendarEvents.length === 0 ? "failed" : "ok");
    const debug: RiskSourceDebug = {
      enabled: true,
      filteredOutCount,
      name: task.name,
      normalizedCount: normalizedEvents.length,
      rawCount: result.rawCount,
      reason: result.reason ?? (result.rawCount === 0 ? "empty-response" : null),
      requestRange: task.requestRange,
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
      normalizedSamples: result.normalizedSamples ?? [],
    };
  } catch (error) {
    const debug: RiskSourceDebug = {
      enabled: true,
      filteredOutCount: 0,
      name: task.name,
      normalizedCount: 0,
      rawCount: 0,
      reason: shortReason(error),
      requestRange: task.requestRange,
      sampleTitles: [],
      status: "failed",
    };

    sourceLog(debug);

    return {
      debug,
      events: [] as RiskEvent[],
      normalizedSamples: [] as NormalizedSample[],
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

function getRouteMainRisk(realEvents: RiskEvent[], now: Date) {
  const btcFallback = getMainRisk([btcRiskFallback], now);

  function isBtcSpecific(event: RiskEvent) {
    return event.affectedAssets.includes("BTC");
  }

  function mainRiskRank(event: RiskEvent) {
    if (event.impact === "low") {
      return 0;
    }

    if (event.category === "macro") {
      return event.impact === "high" ? 500 : 300;
    }

    if (event.marketRelevance === "market-wide") {
      return event.impact === "high" ? 450 : 280;
    }

    if (isBtcSpecific(event)) {
      return event.impact === "high" ? 430 : 250;
    }

    return 0;
  }

  const candidates = realEvents.filter(
    (event) =>
      event.status !== "fallback" &&
      isDateInNextHours(event.date, now, 48) &&
      mainRiskRank(event) > 0,
  );

  if (candidates.length === 0) {
    return btcFallback;
  }

  return [...candidates].sort((left, right) => {
    const rankDiff = mainRiskRank(right) - mainRiskRank(left);

    if (rankDiff !== 0) {
      return rankDiff;
    }

    return dateFromKey(left.date).getTime() - dateFromKey(right.date).getTime();
  })[0];
}

function envDebug() {
  return {
    ALPHAVANTAGE_API_KEY: Boolean(process.env.ALPHAVANTAGE_API_KEY),
    COINMARKETCAL_API_KEY: Boolean(process.env.COINMARKETCAL_API_KEY),
    CRYPTORANK_API_KEY: Boolean(process.env.CRYPTORANK_API_KEY),
    FMP_API_KEY: Boolean(process.env.FMP_API_KEY),
    FRED_API_KEY: Boolean(process.env.FRED_API_KEY),
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
      enabled: keys.FRED_API_KEY,
      load: keys.FRED_API_KEY
        ? () => fetchFredReleaseCalendar(process.env.FRED_API_KEY ?? "", now)
        : undefined,
      name: "FRED Release Calendar",
      reason: keys.FRED_API_KEY ? undefined : "no-api-key",
      requestRange: `${rangeStart}..${rangeEnd}`,
    },
    {
      enabled: true,
      load: () => fetchBlsSchedule(now),
      name: "BLS Release Schedule",
      requestRange: `${rangeStart}..${rangeEnd}`,
    },
    {
      enabled: true,
      load: () => fetchFedReleasePages(now),
      name: "Federal Reserve G.17",
      requestRange: `${rangeStart}..${rangeEnd}`,
    },
    {
      enabled: true,
      load: () => fetchTreasuryReleaseCalendar(now),
      name: "Treasury Fiscal Data",
      requestRange: `${rangeStart}..${rangeEnd}`,
    },
    {
      enabled: keys.FMP_API_KEY,
      load: keys.FMP_API_KEY
        ? () => fetchFmpEconomicCalendar(process.env.FMP_API_KEY ?? "", now)
        : undefined,
      name: "FMP Macro Calendar",
      reason: keys.FMP_API_KEY ? undefined : "no-api-key",
      requestRange: `${rangeStart}..${rangeEnd}`,
    },
    {
      enabled: keys.ALPHAVANTAGE_API_KEY,
      load: keys.ALPHAVANTAGE_API_KEY
        ? () => fetchAlphaVantageMacroContext(process.env.ALPHAVANTAGE_API_KEY ?? "")
        : undefined,
      name: "Alpha Vantage Macro Context",
      reason: keys.ALPHAVANTAGE_API_KEY ? undefined : "no-api-key",
    },
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
      load: keys.MESSARI_API_KEY ? fetchMessariEvents : undefined,
      name: "Messari",
      reason: keys.MESSARI_API_KEY ? "not-implemented" : "no-api-key",
    },
  ];

  const settledSources = await Promise.allSettled(
    sourceTasks.map((task) => runSourceTask(task, now)),
  );
  const baseSourceOutputs = settledSources.map((result, index) => {
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
      requestRange: sourceTasks[index].requestRange,
      sampleTitles: [],
      status: "failed",
    };

    sourceLog(debug);

    return {
      debug,
      events: [] as RiskEvent[],
      normalizedSamples: [] as NormalizedSample[],
    };
  });
  const sourceOutputs = baseSourceOutputs;
  const realCalendarEvents = normalizeRiskEvents(
    dedupeMacroEventsBySourcePreference(sourceOutputs.flatMap((output) => output.events)),
    now,
  );
  const fallbackEvents = normalizeRiskEvents(manualRiskCalendar, now);
  const events = realCalendarEvents.length > 0 ? realCalendarEvents : fallbackEvents;
  const mainRisk = getRouteMainRisk(realCalendarEvents, now);
  const totalNormalizedEvents = sourceOutputs.reduce(
    (sum, output) => sum + output.debug.normalizedCount,
    0,
  );
  const fallbackDaysCount = getFallbackDaysCount(realCalendarEvents, now);
  const sourceRawCount = (name: string) =>
    sourceOutputs.find((output) => output.debug.name === name)?.debug.rawCount ?? 0;
  const macroCoverage = {
    blsReturnedEvents: sourceRawCount("BLS Release Schedule"),
    fallbackMacroEventsAdded: 0,
    fedReturnedEvents: sourceRawCount("Federal Reserve G.17"),
    fredReturnedEvents: sourceRawCount("FRED Release Calendar"),
    fmpReturnedEvents: sourceRawCount("FMP Macro Calendar"),
    highMacroEventsInCalendar: realCalendarEvents.filter(
      (event) => event.category === "macro" && event.impact === "high",
    ).length,
    mediumMacroEventsInCalendar: realCalendarEvents.filter(
      (event) => event.category === "macro" && event.impact === "medium",
    ).length,
    missingExpectedMacroEvents: [],
    treasuryReturnedEvents: sourceRawCount("Treasury Fiscal Data"),
  };

  console.warn(
    `[risks] final normalized=${totalNormalizedEvents} calendar=${realCalendarEvents.length} fallbackDays=${fallbackDaysCount}`,
  );

  const payload: RiskApiDebugResponse = {
    events,
    mainRisk,
    sources: {
      crypto: sourceState(keys.COINMARKETCAL_API_KEY),
      macro: "api",
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
      macroCoverage,
      now: now.toISOString(),
      normalizedSamples: sourceOutputs
        .flatMap((output) => output.normalizedSamples)
        .slice(0, 20),
      rangeEnd,
      rangeStart,
      sources: sourceOutputs.map((output) => output.debug),
    };
  }

  return Response.json(payload, {
    headers: {
      "Cache-Control": debugMode ? "no-store" : "no-store",
    },
  });
}
