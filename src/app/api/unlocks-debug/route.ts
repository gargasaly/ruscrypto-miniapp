import { fetchCoinGeckoJson, getCoinGeckoEnvStatus } from "@/lib/coingecko";
import { tokens, type TokenCard } from "@/lib/content";
import {
  getTokenUnlockData,
  resolveCryptoRankToken,
  type TokenUnlockData,
} from "@/lib/unlocks";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolveToken({
  coingeckoId,
  symbol,
}: {
  coingeckoId: string | null;
  symbol: string | null;
}): TokenCard {
  const normalizedSymbol = symbol?.trim().toUpperCase();
  const normalizedId = coingeckoId?.trim().toLowerCase();
  const knownToken =
    tokens.find(
      (token) =>
        token.ticker.toUpperCase() === normalizedSymbol ||
        token.coingeckoId.toLowerCase() === normalizedId,
    ) ?? null;

  if (knownToken) {
    return knownToken;
  }

  const mapping = resolveCryptoRankToken({
    coingeckoId,
    symbol,
  });

  return {
    coingeckoId: mapping.coingeckoId,
    conclusion: "ждать",
    description: "Токен найден только по техническому mapping. Нужна ручная проверка.",
    logo: null,
    risk: "средний",
    sector: "unknown",
    status: "soon",
    title: mapping.symbol,
    ticker: mapping.symbol,
    url: null,
  };
}

async function fetchDebugMarket(coingeckoId: string) {
  try {
    const rows = await fetchCoinGeckoJson<unknown[]>("/coins/markets", {
      ids: coingeckoId,
      price_change_percentage: "24h,7d,30d",
      sparkline: "false",
      vs_currency: "usd",
    });

    return rows.find(isRecord) ?? null;
  } catch {
    return null;
  }
}

async function fetchDebugDetails(coingeckoId: string) {
  try {
    const details = await fetchCoinGeckoJson<unknown>(`/coins/${coingeckoId}`, {
      community_data: "false",
      developer_data: "false",
      localization: "false",
      market_data: "true",
      sparkline: "false",
      tickers: "false",
    });

    return isRecord(details) ? details : null;
  } catch {
    return null;
  }
}

function providerStatusForSource(sourceName: string, finalUnlocks: TokenUnlockData) {
  if (sourceName.toLowerCase().includes("base asset") && finalUnlocks.provider === "base-asset-rule") {
    return finalUnlocks.providerStatus;
  }

  if (sourceName.toLowerCase().includes(finalUnlocks.provider.toLowerCase())) {
    return finalUnlocks.providerStatus;
  }

  return null;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const symbol = requestUrl.searchParams.get("symbol")?.trim().toUpperCase() ?? null;
  const coingeckoId = requestUrl.searchParams.get("coingeckoId")?.trim() ?? null;
  const token = resolveToken({
    coingeckoId,
    symbol,
  });
  const [marketResult, detailsResult] = await Promise.allSettled([
    fetchDebugMarket(token.coingeckoId),
    fetchDebugDetails(token.coingeckoId),
  ]);
  const marketRecord =
    marketResult.status === "fulfilled" && marketResult.value ? marketResult.value : null;
  const details =
    detailsResult.status === "fulfilled" && detailsResult.value ? detailsResult.value : null;
  const unlockResult = await getTokenUnlockData({
    coinMarketCalApiKey: process.env.COINMARKETCAL_API_KEY,
    cryptoRankApiKey: process.env.CRYPTORANK_API_KEY,
    details,
    forceRefresh: true,
    marketRecord,
    messariApiKey: process.env.MESSARI_API_KEY,
    mobulaApiKey: process.env.MOBULA_API_KEY,
    token,
    tokenomistApiKey: process.env.TOKENOMIST_API_KEY,
  });

  return Response.json(
    {
      cacheStatus: unlockResult.cacheStatus,
      env: {
        ...getCoinGeckoEnvStatus(),
        COINMARKETCAL_API_KEY: Boolean(process.env.COINMARKETCAL_API_KEY),
        CRYPTORANK_API_KEY: Boolean(process.env.CRYPTORANK_API_KEY),
        MESSARI_API_KEY: Boolean(process.env.MESSARI_API_KEY),
        MOBULA_API_KEY: Boolean(process.env.MOBULA_API_KEY),
        TOKENOMIST_API_KEY: Boolean(process.env.TOKENOMIST_API_KEY),
      },
      finalUnlocks: unlockResult.data,
      ok: true,
      providerResults: unlockResult.sources.map((source) => ({
        confidence: providerStatusForSource(source.name, unlockResult.data)
          ? unlockResult.data.confidence
          : null,
        enabled: source.enabled,
        normalizedCount: source.status === "ok" ? source.rawCount : 0,
        provider: source.name,
        providerStatus: providerStatusForSource(source.name, unlockResult.data),
        rawCount: source.rawCount,
        reason: source.reason ?? null,
        sampleKeys: source.fieldsReceived,
        sampleTitle: source.sampleTitles?.[0] ?? null,
        status: source.status,
        warnings:
          providerStatusForSource(source.name, unlockResult.data) !== null
            ? unlockResult.data.warnings
            : [],
      })),
      selectedProvider: unlockResult.data.provider,
      token: {
        coingeckoId: token.coingeckoId,
        cryptoRankSlug: resolveCryptoRankToken({
          coingeckoId: token.coingeckoId,
          symbol: token.ticker,
        }).cryptoRankSlug,
        name: token.title,
        symbol: token.ticker,
      },
      updatedAt: new Date().toISOString(),
      validation: unlockResult.validation ?? {
        clean: true,
        conflicts: [],
        issues: [],
        rejectedSources: [],
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
