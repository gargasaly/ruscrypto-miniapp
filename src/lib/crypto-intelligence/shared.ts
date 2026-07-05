import type { CryptoIntelligenceTokenInput, ProtocolResolution } from "./types";

const CACHE_TTL_MS = 15 * 60_000;
const DEFILLAMA_API = "https://api.llama.fi";

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

export type UnknownRecord = Record<string, unknown>;

const sourceCache = new Map<string, CacheEntry>();

export function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function numberFrom(value: unknown) {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(/,/g, ""))
        : NaN;

  return Number.isFinite(number) ? number : null;
}

export function normalizeText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function slugify(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function cacheKey(url: string, init?: RequestInit) {
  return `${init?.method ?? "GET"}:${url}:${typeof init?.body === "string" ? init.body : ""}`;
}

export async function fetchJson<T>(url: string, init?: RequestInit, ttlMs = CACHE_TTL_MS): Promise<T> {
  const key = cacheKey(url, init);
  const cached = sourceCache.get(key);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        accept: "application/json",
        "user-agent": "ruscrypto-miniapp/crypto-intelligence",
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${url}`);
    }

    const payload = (await response.json()) as T;
    sourceCache.set(key, {
      expiresAt: now + ttlMs,
      value: payload,
    });

    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function defillamaUrl(path: string, params: Record<string, string | boolean | number | null | undefined> = {}) {
  const url = new URL(path.replace(/^\/+/, ""), `${DEFILLAMA_API}/`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

export function protocolUrl(slug: string) {
  return defillamaUrl(`/protocol/${encodeURIComponent(slug)}`);
}

export function feesSummaryUrl(slug: string, dataType: string) {
  return defillamaUrl(`/summary/fees/${encodeURIComponent(slug)}`, {
    dataType,
    excludeTotalDataChartBreakdown: true,
  });
}

function inputCandidates(token: CryptoIntelligenceTokenInput) {
  return [
    token.coingeckoId,
    token.ticker,
    token.title,
  ]
    .map((value) => value.trim())
    .filter(Boolean);
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function protocolMatchScore(protocol: UnknownRecord, candidate: string) {
  const normalized = normalizeText(candidate);
  const slug = slugify(candidate);
  const name = normalizeText(protocol.name);
  const protocolSlug = normalizeText(protocol.slug);
  const symbol = normalizeText(protocol.symbol);

  if (protocolSlug === slug) return 100;
  if (name === normalized) return 95;
  if (symbol === normalized) return 90;
  if (protocolSlug.startsWith(slug)) return 80;
  if (name.startsWith(normalized)) return 75;
  if (protocolSlug.includes(slug) || name.includes(normalized)) return 60;
  if (symbol.includes(normalized)) return 45;

  return 0;
}

export async function resolveProtocol(token: CryptoIntelligenceTokenInput): Promise<ProtocolResolution> {
  const protocols = await fetchJson<UnknownRecord[]>(defillamaUrl("/protocols"), undefined, 30 * 60_000);

  for (const candidate of uniqueStrings(inputCandidates(token))) {
    const matches = protocols
      .map((protocol) => ({
        matchScore: protocolMatchScore(protocol, candidate),
        protocol,
      }))
      .filter((item) => item.matchScore > 0)
      .sort(
        (left, right) =>
          right.matchScore - left.matchScore ||
          (numberFrom(right.protocol.tvl) ?? 0) - (numberFrom(left.protocol.tvl) ?? 0),
      );
    const best = matches[0]?.protocol;
    const slug = typeof best?.slug === "string" ? best.slug : null;

    if (slug) {
      return {
        input: candidate,
        matchScore: matches[0]?.matchScore ?? null,
        method: "search_protocol",
        slug,
      };
    }
  }

  const fallback = inputCandidates(token)[0] ?? token.ticker;

  return {
    input: fallback,
    matchScore: null,
    method: "fallback_slug",
    slug: slugify(fallback),
  };
}

function normalizedKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function numberFromAliases(record: UnknownRecord, aliases: string[]) {
  const aliasSet = new Set(aliases.map(normalizedKey));

  for (const [key, value] of Object.entries(record)) {
    if (!aliasSet.has(normalizedKey(key))) {
      continue;
    }

    const direct = numberFrom(value);

    if (direct !== null) {
      return direct;
    }

    if (isRecord(value)) {
      const usd = numberFrom(value.usd);

      if (usd !== null) {
        return usd;
      }
    }
  }

  return null;
}

function collectRows(value: unknown, depth = 0): UnknownRecord[] {
  if (depth > 5) {
    return [];
  }

  if (Array.isArray(value)) {
    const records = value.filter(isRecord);

    if (records.length > 0) {
      return records;
    }

    return value.flatMap((item) => collectRows(item, depth + 1));
  }

  if (!isRecord(value)) {
    return [];
  }

  return [
    ...[
      "chart",
      "daily",
      "data",
      "fees",
      "items",
      "normalized_data",
      "payload",
      "raw",
      "raw_data",
      "result",
      "results",
      "revenue",
      "rows",
      "totalDataChart",
    ].flatMap((key) => collectRows(value[key], depth + 1)),
  ];
}

function rowDateMillis(row: UnknownRecord) {
  const value =
    row.date ??
    row.day ??
    row.time ??
    row.timestamp ??
    row.datetime ??
    row.created_at ??
    row.updated_at;

  if (typeof value === "number") {
    return value > 10_000_000_000 ? value : value * 1000;
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function aliasesWithWindow(aliases: string[], days: 7 | 30) {
  return aliases.flatMap((alias) => [
    alias,
    `${alias}${days}d`,
    `${alias}_${days}d`,
    `${alias}${days}days`,
    `${days}d${alias}`,
    `total${days}d`,
    `total_${days}d`,
  ]);
}

function findWindowTotal(value: unknown, aliases: string[], days: 7 | 30, depth = 0): number | null {
  if (depth > 5 || !isRecord(value)) {
    return null;
  }

  const direct = numberFromAliases(value, aliasesWithWindow(aliases, days));

  if (direct !== null) {
    return direct;
  }

  for (const nested of Object.values(value)) {
    const result = findWindowTotal(nested, aliases, days, depth + 1);

    if (result !== null) {
      return result;
    }
  }

  return null;
}

function sumRowsByWindow(rows: UnknownRecord[], aliases: string[], days: 7 | 30) {
  const rowsWithValue = rows
    .map((row, index) => ({
      dateMillis: rowDateMillis(row),
      index,
      value: numberFromAliases(row, aliases),
    }))
    .filter((row): row is { dateMillis: number | null; index: number; value: number } => row.value !== null);

  if (rowsWithValue.length === 0) {
    return null;
  }

  const dated = rowsWithValue.filter((row): row is { dateMillis: number; index: number; value: number } =>
    row.dateMillis !== null,
  );

  if (dated.length > 0) {
    const maxDate = Math.max(...dated.map((row) => row.dateMillis));
    const cutoff = maxDate - days * 24 * 60 * 60_000;

    return dated
      .filter((row) => row.dateMillis >= cutoff)
      .reduce((sum, row) => sum + row.value, 0);
  }

  return rowsWithValue
    .sort((left, right) => left.index - right.index)
    .slice(-days)
    .reduce((sum, row) => sum + row.value, 0);
}

export function extractWindowTotal(payload: unknown, aliases: string[], days: 7 | 30) {
  const direct = findWindowTotal(payload, aliases, days);

  if (direct !== null) {
    return direct;
  }

  return sumRowsByWindow(collectRows(payload), aliases, days);
}

export function latestDailyValue(payload: unknown, aliases: string[]) {
  const rows = collectRows(payload)
    .map((row, index) => ({
      dateMillis: rowDateMillis(row),
      index,
      value: numberFromAliases(row, aliases),
    }))
    .filter((row): row is { dateMillis: number | null; index: number; value: number } => row.value !== null);

  if (rows.length === 0) {
    return null;
  }

  return rows.sort(
    (left, right) =>
      (right.dateMillis ?? right.index) - (left.dateMillis ?? left.index),
  )[0]?.value ?? null;
}
