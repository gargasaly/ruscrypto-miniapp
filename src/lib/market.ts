import { buildCoinGeckoUrl, getCoinGeckoHeaders } from "@/lib/coingecko";

export type MarketCoin = {
  id: string;
  symbol: string;
  name: string;
  image: string | null;
  current_price: number | null;
  price_change_percentage_24h: number | null;
  market_cap: number | null;
  total_volume: number | null;
};

export type MarketResponse = {
  coins: MarketCoin[];
  updatedAt: string;
  error?: string;
};

export const marketCoinIds = [
  "bitcoin",
  "ethereum",
  "binancecoin",
  "chainlink",
  "hyperliquid",
  "solana",
  "aave",
  "ripple",
  "render-token",
  "sui",
  "bittensor",
  "the-open-network",
  "ondo-finance",
  "uniswap",
  "jupiter-exchange-solana",
  "pendle",
  "ethena",
  "avalanche-2",
  "near",
  "morpho",
  "arbitrum",
  "optimism",
  "sky",
  "syrup",
  "aerodrome-finance",
  "sei-network",
  "lido-dao",
  "jito-governance-token",
  "pyth-network",
] as const;

const MARKET_CACHE_TTL_MS = 60_000;

let marketCache:
  | {
      expiresAt: number;
      response: MarketResponse;
    }
  | null = null;

function coinGeckoMarketsUrl(ids: readonly string[] = marketCoinIds) {
  return buildCoinGeckoUrl("/coins/markets", {
    ids: ids.join(","),
    order: "market_cap_desc",
    page: "1",
    per_page: "50",
    price_change_percentage: "24h",
    sparkline: "false",
    vs_currency: "usd",
  });
}

export function normalizeMarketCoin(coin: Partial<MarketCoin>): MarketCoin {
  return {
    id: String(coin.id ?? ""),
    symbol: String(coin.symbol ?? ""),
    name: String(coin.name ?? ""),
    image: typeof coin.image === "string" ? coin.image : null,
    current_price:
      typeof coin.current_price === "number" ? coin.current_price : null,
    price_change_percentage_24h:
      typeof coin.price_change_percentage_24h === "number"
        ? coin.price_change_percentage_24h
        : null,
    market_cap: typeof coin.market_cap === "number" ? coin.market_cap : null,
    total_volume:
      typeof coin.total_volume === "number" ? coin.total_volume : null,
  };
}

export async function fetchMarketData({
  forceRefresh = false,
}: {
  forceRefresh?: boolean;
} = {}): Promise<MarketResponse> {
  if (!forceRefresh && marketCache && marketCache.expiresAt > Date.now()) {
    return marketCache.response;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(coinGeckoMarketsUrl(), {
      headers: getCoinGeckoHeaders(),
      next: {
        revalidate: 60,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      if (marketCache) {
        return {
          ...marketCache.response,
          error: `CoinGecko вернул ошибку ${response.status}. Показаны последние доступные рыночные данные.`,
        };
      }

      return {
        coins: [],
        error: `CoinGecko вернул ошибку ${response.status}`,
        updatedAt: new Date().toISOString(),
      };
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      if (marketCache) {
        return {
          ...marketCache.response,
          error: "CoinGecko вернул неожиданный формат. Показаны последние доступные рыночные данные.",
        };
      }

      return {
        coins: [],
        error: "CoinGecko вернул неожиданный формат данных",
        updatedAt: new Date().toISOString(),
      };
    }

    const payload: MarketResponse = {
      coins: data.map((coin) => normalizeMarketCoin(coin)),
      updatedAt: new Date().toISOString(),
    };

    marketCache = {
      expiresAt: Date.now() + MARKET_CACHE_TTL_MS,
      response: payload,
    };

    return payload;
  } catch {
    if (marketCache) {
      return {
        ...marketCache.response,
        error: "Не удалось обновить рынок. Показаны последние доступные рыночные данные.",
      };
    }

    return {
      coins: [],
      error: "Не удалось получить рыночные данные",
      updatedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
