export type PortfolioDiaryCategory = "core" | "alpha" | "beta";

export type PortfolioDiaryAsset = {
  category: PortfolioDiaryCategory;
  categoryLabel: string;
  name: string;
  symbol: string;
  targetWeight: number;
};

export const portfolioDiaryModel = [
  { category: "core", categoryLabel: "Core", name: "Bitcoin", symbol: "BTC", targetWeight: 24 },
  { category: "core", categoryLabel: "Core", name: "Ethereum", symbol: "ETH", targetWeight: 20 },
  { category: "core", categoryLabel: "Core", name: "Solana", symbol: "SOL", targetWeight: 10 },
  { category: "core", categoryLabel: "Core", name: "BNB", symbol: "BNB", targetWeight: 7 },
  { category: "core", categoryLabel: "Core", name: "Chainlink", symbol: "LINK", targetWeight: 6 },
  {
    category: "alpha",
    categoryLabel: "Alpha Satellite",
    name: "Aave",
    symbol: "AAVE",
    targetWeight: 5,
  },
  {
    category: "alpha",
    categoryLabel: "Alpha Satellite",
    name: "Hyperliquid",
    symbol: "HYPE",
    targetWeight: 5,
  },
  {
    category: "alpha",
    categoryLabel: "Alpha Satellite",
    name: "Ondo",
    symbol: "ONDO",
    targetWeight: 5,
  },
  { category: "alpha", categoryLabel: "Alpha Satellite", name: "Sui", symbol: "SUI", targetWeight: 4 },
  {
    category: "alpha",
    categoryLabel: "Alpha Satellite",
    name: "Bittensor",
    symbol: "TAO",
    targetWeight: 3,
  },
  {
    category: "alpha",
    categoryLabel: "Alpha Satellite",
    name: "Uniswap",
    symbol: "UNI",
    targetWeight: 3,
  },
  {
    category: "beta",
    categoryLabel: "Beta Satellite",
    name: "Avalanche",
    symbol: "AVAX",
    targetWeight: 2,
  },
  {
    category: "beta",
    categoryLabel: "Beta Satellite",
    name: "NEAR Protocol",
    symbol: "NEAR",
    targetWeight: 2,
  },
  {
    category: "beta",
    categoryLabel: "Beta Satellite",
    name: "Jupiter",
    symbol: "JUP",
    targetWeight: 1.5,
  },
  {
    category: "beta",
    categoryLabel: "Beta Satellite",
    name: "Pendle",
    symbol: "PENDLE",
    targetWeight: 1.5,
  },
  {
    category: "beta",
    categoryLabel: "Beta Satellite",
    name: "Render",
    symbol: "RENDER",
    targetWeight: 1,
  },
] as const satisfies readonly PortfolioDiaryAsset[];

export type PortfolioDiarySymbol = (typeof portfolioDiaryModel)[number]["symbol"];

export const portfolioDiarySymbols = portfolioDiaryModel.map((asset) => asset.symbol);

export const portfolioDiaryCategories = [
  {
    id: "core",
    label: "Core",
    targetWeight: 67,
  },
  {
    id: "alpha",
    label: "Alpha Satellite",
    targetWeight: 25,
  },
  {
    id: "beta",
    label: "Beta Satellite",
    targetWeight: 8,
  },
] as const satisfies ReadonlyArray<{
  id: PortfolioDiaryCategory;
  label: string;
  targetWeight: number;
}>;

const modelSymbolSet = new Set<string>(portfolioDiarySymbols);

export function normalizePortfolioDiarySymbol(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

export function isPortfolioDiarySymbol(value: unknown): value is PortfolioDiarySymbol {
  return modelSymbolSet.has(normalizePortfolioDiarySymbol(value));
}
