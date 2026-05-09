import { marketCoinIds, type MarketCoin, type MarketResponse } from "@/lib/market";

export const revalidate = 60;

const coinGeckoUrl = new URL("https://api.coingecko.com/api/v3/coins/markets");
coinGeckoUrl.searchParams.set("vs_currency", "usd");
coinGeckoUrl.searchParams.set("ids", marketCoinIds.join(","));
coinGeckoUrl.searchParams.set("order", "market_cap_desc");
coinGeckoUrl.searchParams.set("per_page", "50");
coinGeckoUrl.searchParams.set("page", "1");
coinGeckoUrl.searchParams.set("sparkline", "false");
coinGeckoUrl.searchParams.set("price_change_percentage", "24h");

function normalizeCoin(coin: Partial<MarketCoin>): MarketCoin {
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

export async function GET() {
  try {
    const response = await fetch(coinGeckoUrl, {
      headers: {
        accept: "application/json",
      },
      next: {
        revalidate: 60,
      },
    });

    if (!response.ok) {
      const payload: MarketResponse = {
        coins: [],
        error: `CoinGecko вернул ошибку ${response.status}`,
        updatedAt: new Date().toISOString(),
      };

      return Response.json(payload, { status: 502 });
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      const payload: MarketResponse = {
        coins: [],
        error: "CoinGecko вернул неожиданный формат данных",
        updatedAt: new Date().toISOString(),
      };

      return Response.json(payload, { status: 502 });
    }

    const payload: MarketResponse = {
      coins: data.map((coin) => normalizeCoin(coin)),
      updatedAt: new Date().toISOString(),
    };

    return Response.json(payload);
  } catch {
    const payload: MarketResponse = {
      coins: [],
      error: "Не удалось получить рыночные данные",
      updatedAt: new Date().toISOString(),
    };

    return Response.json(payload, { status: 502 });
  }
}
