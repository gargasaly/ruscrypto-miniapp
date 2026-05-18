import { tokens } from "@/lib/content";
import { fetchMarketData, type MarketCoin } from "@/lib/market";

export const revalidate = 60;

type PricePoint = {
  price: number | null;
  change24h: number | null;
  updatedAt: string;
  source: "CoinGecko" | "lastGood" | "missing";
};

type PricesResponse = {
  ok: boolean;
  prices: Record<string, PricePoint>;
  requestedSymbols: string[];
  updatedAt: string;
  cacheStatus: "fresh" | "lastGood" | "missing";
  error?: string;
};

const PRICE_CACHE_TTL_MS = 60_000;
const PRICE_LAST_GOOD_TTL_MS = 30 * 60_000;
const DEFAULT_SYMBOLS = ["BTC"] as const;

const symbolToCoinGeckoId = new Map(
  tokens.map((token) => [token.ticker.toUpperCase(), token.coingeckoId]),
);

let priceResponseCache:
  | {
      cacheKey: string;
      expiresAt: number;
      response: PricesResponse;
    }
  | null = null;

const lastGoodPrices = new Map<
  string,
  {
    expiresAt: number;
    point: PricePoint;
  }
>();

function normalizeSymbols(value: string | null) {
  const source = value
    ? value
        .split(",")
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean)
    : [...DEFAULT_SYMBOLS];

  return Array.from(new Set(source)).filter((symbol) =>
    symbolToCoinGeckoId.has(symbol),
  );
}

function toPricePoint(coin: MarketCoin, updatedAt: string): PricePoint {
  return {
    change24h: coin.price_change_percentage_24h,
    price: coin.current_price,
    source: "CoinGecko",
    updatedAt,
  };
}

function saveLastGood(symbol: string, point: PricePoint) {
  if (point.price === null) {
    return;
  }

  lastGoodPrices.set(symbol, {
    expiresAt: Date.now() + PRICE_LAST_GOOD_TTL_MS,
    point,
  });
}

function readLastGood(symbol: string) {
  const entry = lastGoodPrices.get(symbol);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    lastGoodPrices.delete(symbol);
    return null;
  }

  return {
    ...entry.point,
    source: "lastGood" as const,
  };
}

function buildMissingPoint(updatedAt: string): PricePoint {
  return {
    change24h: null,
    price: null,
    source: "missing",
    updatedAt,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedSymbols = normalizeSymbols(url.searchParams.get("symbols"));
  const cacheKey = requestedSymbols.join(",");
  const now = Date.now();

  if (
    priceResponseCache &&
    priceResponseCache.cacheKey === cacheKey &&
    priceResponseCache.expiresAt > now
  ) {
    return Response.json(priceResponseCache.response, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  }

  const market = await fetchMarketData();
  const coinById = new Map(market.coins.map((coin) => [coin.id, coin]));
  const prices: Record<string, PricePoint> = {};
  let hasFreshPrice = false;
  let hasAnyPrice = false;

  for (const symbol of requestedSymbols) {
    const coinId = symbolToCoinGeckoId.get(symbol);
    const coin = coinId ? coinById.get(coinId) : undefined;
    const freshPoint =
      coin && coin.current_price !== null ? toPricePoint(coin, market.updatedAt) : null;
    const point = freshPoint ?? readLastGood(symbol) ?? buildMissingPoint(market.updatedAt);

    if (freshPoint) {
      saveLastGood(symbol, freshPoint);
      hasFreshPrice = true;
    }

    if (point.price !== null) {
      hasAnyPrice = true;
    }

    prices[symbol] = point;
  }

  const response: PricesResponse = {
    cacheStatus: hasFreshPrice ? "fresh" : hasAnyPrice ? "lastGood" : "missing",
    ok: hasAnyPrice,
    prices,
    requestedSymbols,
    updatedAt: market.updatedAt,
    ...(market.error ? { error: market.error } : {}),
  };

  priceResponseCache = {
    cacheKey,
    expiresAt: now + PRICE_CACHE_TTL_MS,
    response,
  };

  return Response.json(response, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
    status: hasAnyPrice ? 200 : 502,
  });
}
