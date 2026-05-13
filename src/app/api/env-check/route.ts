export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      env: {
        ALPHAVANTAGE_API_KEY: Boolean(process.env.ALPHAVANTAGE_API_KEY),
        COINGECKO_API_KEY: Boolean(process.env.COINGECKO_API_KEY),
        COINGLASS_API_KEY: Boolean(process.env.COINGLASS_API_KEY),
        COINGLASS_ENABLED: process.env.COINGLASS_ENABLED === "true",
        COINMARKETCAL_API_KEY: Boolean(process.env.COINMARKETCAL_API_KEY),
        CRYPTORANK_API_KEY: Boolean(process.env.CRYPTORANK_API_KEY),
        CRYPTORANK_ENABLED: process.env.CRYPTORANK_ENABLED === "true",
        FMP_API_KEY: Boolean(process.env.FMP_API_KEY),
        FRED_API_KEY: Boolean(process.env.FRED_API_KEY),
        MESSARI_API_KEY: Boolean(process.env.MESSARI_API_KEY),
        MOBULA_API_KEY: Boolean(process.env.MOBULA_API_KEY),
        TOKENOMIST_API_KEY: Boolean(process.env.TOKENOMIST_API_KEY),
        TOKENOMIST_ENABLED: process.env.TOKENOMIST_ENABLED === "true",
        TRADING_ECONOMICS_KEY: Boolean(process.env.TRADING_ECONOMICS_KEY),
      },
      message: "Only key presence is shown. Secret values are never exposed.",
      ok: true,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
