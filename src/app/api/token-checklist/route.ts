import { tokens } from "@/lib/content";
import {
  buildTechnicalSummary,
  buildVolumeSummary,
  calculateTokenEntryScore,
  type TokenChecklistMarket,
  type TokenLiquiditySummary,
  type TokenProjectSummary,
  type TokenUnlockSummary,
} from "@/lib/tokenChecklist";
import { getTokenMetadata } from "@/lib/tokenMetadata";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function arrayPayload(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (!isRecord(value)) {
    return [];
  }

  for (const key of ["data", "body", "result", "items", "tickers"]) {
    const nested = value[key];

    if (Array.isArray(nested)) {
      return nested;
    }
  }

  return [];
}

function numberFrom(value: unknown) {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  return Number.isFinite(number) ? number : null;
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

function nestedNumber(record: UnknownRecord | null, key: string) {
  if (!record) {
    return null;
  }

  const value = record[key];

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (isRecord(value)) {
    return numberFrom(value.usd);
  }

  return null;
}

async function fetchJson(url: URL) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        accept: "application/json",
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

async function fetchCoinMarket(coingeckoId: string) {
  const url = new URL("https://api.coingecko.com/api/v3/coins/markets");
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("ids", coingeckoId);
  url.searchParams.set("sparkline", "false");
  url.searchParams.set("price_change_percentage", "24h,7d,30d");

  const payload = await fetchJson(url);
  const coin = arrayPayload(payload).find(isRecord);

  return coin ?? null;
}

async function fetchCoinDetails(coingeckoId: string) {
  const url = new URL(`https://api.coingecko.com/api/v3/coins/${coingeckoId}`);
  url.searchParams.set("localization", "false");
  url.searchParams.set("tickers", "false");
  url.searchParams.set("market_data", "true");
  url.searchParams.set("community_data", "false");
  url.searchParams.set("developer_data", "false");
  url.searchParams.set("sparkline", "false");

  const payload = await fetchJson(url);

  return isRecord(payload) ? payload : null;
}

async function fetchMarketChart(coingeckoId: string) {
  const url = new URL(
    `https://api.coingecko.com/api/v3/coins/${coingeckoId}/market_chart`,
  );
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("days", "90");
  url.searchParams.set("interval", "daily");

  const payload = await fetchJson(url);

  if (!isRecord(payload)) {
    return {
      prices: [] as number[],
      volumes: [] as number[],
    };
  }

  const prices = arrayPayload(payload.prices)
    .map((row) => (Array.isArray(row) ? numberFrom(row[1]) : null))
    .filter((value): value is number => value !== null);
  const volumes = arrayPayload(payload.total_volumes)
    .map((row) => (Array.isArray(row) ? numberFrom(row[1]) : null))
    .filter((value): value is number => value !== null);

  return {
    prices,
    volumes,
  };
}

async function fetchCoinTickers(coingeckoId: string) {
  const url = new URL(`https://api.coingecko.com/api/v3/coins/${coingeckoId}/tickers`);
  url.searchParams.set("include_exchange_logo", "false");
  url.searchParams.set("depth", "false");
  url.searchParams.set("order", "volume_desc");

  const payload = await fetchJson(url);

  return arrayPayload(payload).filter(isRecord);
}

async function fetchCryptoRankUnlocks(symbol: string) {
  const apiKey = process.env.CRYPTORANK_API_KEY;

  if (!apiKey) {
    return null;
  }

  const url = new URL("https://api.cryptorank.io/v2/currencies/unlocks");
  url.searchParams.set("symbols", symbol);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        "X-Api-Key": apiKey,
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

function normalizeMarket(
  market: UnknownRecord | null,
  details: UnknownRecord | null,
): TokenChecklistMarket {
  const marketData = details && isRecord(details.market_data) ? details.market_data : null;

  return {
    ath: nestedNumber(marketData, "ath"),
    athChangePercentage: nestedNumber(marketData, "ath_change_percentage"),
    circulatingSupply:
      numberFrom(market?.circulating_supply) ??
      numberFrom(marketData?.circulating_supply),
    currentPrice: numberFrom(market?.current_price),
    image: typeof market?.image === "string" ? market.image : null,
    marketCap: numberFrom(market?.market_cap),
    maxSupply: numberFrom(marketData?.max_supply),
    priceChange24h: numberFrom(market?.price_change_percentage_24h),
    priceChange7d: numberFrom(market?.price_change_percentage_7d_in_currency),
    priceChange30d: numberFrom(market?.price_change_percentage_30d_in_currency),
    totalSupply: numberFrom(marketData?.total_supply),
    totalVolume: numberFrom(market?.total_volume),
  };
}

function normalizeProject(
  coingeckoId: string,
  details: UnknownRecord | null,
  tokenDescription: string,
): TokenProjectSummary {
  const metadata = getTokenMetadata(coingeckoId);

  if (metadata) {
    return {
      projectSummaryRu: metadata.projectSummaryRu,
      sectorRiskRu: metadata.sectorRiskRu,
      sectorRu: metadata.sectorRu,
    };
  }

  const categories = Array.isArray(details?.categories)
    ? details.categories.filter((item): item is string => typeof item === "string")
    : [];

  return {
    projectSummaryRu: tokenDescription,
    sectorRiskRu:
      "Локальной заметки по сектору нет — проверь фундамент, токеномику и новости вручную.",
    sectorRu: categories.slice(0, 2).join(" / ") || "Сектор уточняется",
  };
}

function normalizeLiquidity(
  tickers: UnknownRecord[],
  marketCap: number | null,
  totalVolume: number | null,
): TokenLiquiditySummary {
  const trustedTickerCount = tickers.filter(
    (ticker) => stringFrom(ticker, ["trust_score"]) === "green",
  ).length;
  const dexWords = /uniswap|pancake|orca|raydium|curve|balancer|sushiswap|camelot/i;
  const dexPairs = tickers.filter((ticker) => {
    const market = isRecord(ticker.market) ? stringFrom(ticker.market, ["name", "identifier"]) : null;

    return market ? dexWords.test(market) : false;
  }).length;
  const tickerCount = tickers.length;
  const cexPairs = Math.max(0, tickerCount - dexPairs);
  const volumeSummary = buildVolumeSummary(marketCap, totalVolume);

  let label = "Ликвидность оценивается приблизительно";

  if (tickerCount > 40 && trustedTickerCount > 10) {
    label = "Широкая биржевая представленность";
  } else if (tickerCount > 12) {
    label = "Биржевых пар достаточно, но качество нужно сверить";
  } else if (tickerCount > 0) {
    label = "Биржевых пар немного — нужна ручная проверка";
  }

  return {
    benchmarkRatioPercent: volumeSummary.benchmarkRatioPercent,
    cexPairs,
    dexPairs,
    isApproximate: true,
    label,
    tickerCount,
    trustedTickerCount,
  };
}

function normalizeUnlocks(
  symbol: string,
  coingeckoId: string,
  cryptoRankPayload: unknown,
): TokenUnlockSummary {
  const metadata = getTokenMetadata(coingeckoId);
  const rows = arrayPayload(cryptoRankPayload).filter(isRecord);
  const row = rows.find((item) => {
    const rowSymbol = stringFrom(item, ["symbol", "ticker", "asset"]);

    return rowSymbol?.toUpperCase() === symbol.toUpperCase();
  }) ?? rows[0];

  if (row) {
    const nextUnlockPercent = numberFrom(
      row.nextUnlockPercent ?? row.unlockPercent ?? row.unlock_percent ?? row.percentage,
    );
    const unlockedPercent = numberFrom(row.unlockedPercent ?? row.unlocked_percent);
    const lockedPercent = numberFrom(row.lockedPercent ?? row.locked_percent);
    const nextUnlockDate = stringFrom(row, [
      "nextUnlockDate",
      "unlockDate",
      "date",
      "unlock_date",
    ]);
    const nextUnlockAmount = numberFrom(
      row.nextUnlockAmount ?? row.amount ?? row.unlockAmount,
    );
    const risk =
      nextUnlockPercent === null
        ? "unknown"
        : nextUnlockPercent > 2
          ? "high"
          : nextUnlockPercent >= 0.5
            ? "medium"
            : "low";

    return {
      lockedPercent,
      nextUnlockAmount,
      nextUnlockDate,
      nextUnlockPercent,
      note:
        risk === "unknown"
          ? "Unlocks подтянуты частично — точный размер лучше проверить вручную."
          : "Unlocks получены из серверного источника.",
      risk,
      source: "CryptoRank",
      unlockedPercent,
    };
  }

  if (metadata?.unlocks) {
    return {
      lockedPercent: metadata.unlocks.lockedPercent,
      nextUnlockAmount: null,
      nextUnlockDate: metadata.unlocks.nextUnlockDate,
      nextUnlockPercent: metadata.unlocks.nextUnlockPercent,
      note: metadata.unlocks.note,
      risk:
        metadata.unlocks.nextUnlockPercent === null
          ? "unknown"
          : metadata.unlocks.nextUnlockPercent > 2
            ? "high"
            : metadata.unlocks.nextUnlockPercent >= 0.5
              ? "medium"
              : "low",
      source: "local",
      unlockedPercent: metadata.unlocks.unlockedPercent,
    };
  }

  return {
    lockedPercent: null,
    nextUnlockAmount: null,
    nextUnlockDate: null,
    nextUnlockPercent: null,
    note: "Unlocks не удалось подтянуть автоматически — проверь вручную перед входом.",
    risk: "unknown",
    source: "fallback",
    unlockedPercent: null,
  };
}

function buildPlainConclusion(
  score: ReturnType<typeof calculateTokenEntryScore>,
  project: TokenProjectSummary,
) {
  if (score.riskLevel === "unknown") {
    return [
      "Данных мало, поэтому автоматическая оценка приблизительная.",
      "Сначала стоит проверить график, unlocks, новости и ликвидность вручную.",
      `Сектор: ${project.sectorRu}.`,
    ];
  }

  if (score.riskLevel === "high") {
    return [
      "Зона выглядит некомфортной для спокойного входа.",
      "Главный риск — перегрев, слабый объём или неясные unlocks.",
      "Разумнее дождаться более понятного сценария и перепроверить уровни.",
    ];
  }

  if (score.riskLevel === "medium") {
    return [
      "Идею можно изучать дальше, но без спешки.",
      "Есть факторы, которые требуют ручной проверки: график, события и unlocks.",
      "Сценарий лучше строить от уровней и общей реакции рынка.",
    ];
  }

  return [
    "По доступным данным явных красных флагов меньше, чем обычно.",
    "Это не отменяет проверку графика, событий и токеномики.",
    "Финальный вывод лучше делать только после ручного разбора.",
  ];
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const coingeckoId = requestUrl.searchParams.get("coingeckoId")?.trim();
  const symbol = requestUrl.searchParams.get("symbol")?.trim().toUpperCase();
  const token =
    tokens.find((item) => item.coingeckoId === coingeckoId) ??
    tokens.find((item) => item.ticker.toUpperCase() === symbol);

  if (!token) {
    return Response.json(
      {
        error: "Токен не найден",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
        status: 404,
      },
    );
  }

  const [marketResult, detailsResult, chartResult, tickersResult, unlocksResult] =
    await Promise.allSettled([
      fetchCoinMarket(token.coingeckoId),
      fetchCoinDetails(token.coingeckoId),
      fetchMarketChart(token.coingeckoId),
      fetchCoinTickers(token.coingeckoId),
      fetchCryptoRankUnlocks(token.ticker),
    ]);

  const warnings: string[] = [];
  const market =
    marketResult.status === "fulfilled" ? marketResult.value : (warnings.push("market"), null);
  const details =
    detailsResult.status === "fulfilled" ? detailsResult.value : (warnings.push("details"), null);
  const chart =
    chartResult.status === "fulfilled"
      ? chartResult.value
      : (warnings.push("market_chart"), { prices: [], volumes: [] });
  const tickers =
    tickersResult.status === "fulfilled" ? tickersResult.value : (warnings.push("tickers"), []);
  const unlockPayload =
    unlocksResult.status === "fulfilled" ? unlocksResult.value : (warnings.push("unlocks"), null);

  if (!market) {
    warnings.push("market");
  }

  if (!details) {
    warnings.push("details");
  }

  if (chart.prices.length === 0) {
    warnings.push("market_chart");
  }

  if (tickers.length === 0) {
    warnings.push("tickers");
  }

  const normalizedMarket = normalizeMarket(market, details);
  const prices = chart.prices.length > 0 ? chart.prices : [];
  const technical = buildTechnicalSummary(
    prices.length > 0 && normalizedMarket.currentPrice !== null
      ? [...prices.slice(0, -1), normalizedMarket.currentPrice]
      : prices,
  );
  const volume = buildVolumeSummary(
    normalizedMarket.marketCap,
    normalizedMarket.totalVolume,
  );
  const liquidity = normalizeLiquidity(
    tickers,
    normalizedMarket.marketCap,
    normalizedMarket.totalVolume,
  );
  const unlocks = normalizeUnlocks(token.ticker, token.coingeckoId, unlockPayload);
  const project = normalizeProject(token.coingeckoId, details, token.description);
  const score = calculateTokenEntryScore({
    liquidity,
    market: normalizedMarket,
    project,
    technical,
    unlocks,
    volume,
  });
  const uniqueWarnings = [...new Set(warnings)];

  const payload = {
    partialData: uniqueWarnings.length > 0 || score.riskLevel === "unknown",
    plainConclusion: buildPlainConclusion(score, project),
    project,
    score,
    token: {
      coingeckoId: token.coingeckoId,
      logo: token.logo,
      title: token.title,
      ticker: token.ticker,
    },
    updatedAt: new Date().toISOString(),
    warnings: uniqueWarnings,
    market: normalizedMarket,
    technical,
    volume,
    liquidity,
    unlocks,
    whatToCheckManually: [
      "Официальный сайт, тикер и контракт",
      "Ближайшие unlocks и vesting",
      "Новости, апгрейды и судебные/регуляторные события",
      "Уровни на графике и реакция BTC",
      "Качество биржевой ликвидности",
    ],
  };

  return Response.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
