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
] as const;
