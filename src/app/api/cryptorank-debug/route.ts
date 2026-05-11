import { runCryptoRankDebug } from "@/lib/unlocks";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const symbol = requestUrl.searchParams.get("symbol");
  const coingeckoId = requestUrl.searchParams.get("coingeckoId");
  const slug = requestUrl.searchParams.get("slug");
  const apiKey = process.env.CRYPTORANK_API_KEY;
  const result = await runCryptoRankDebug({
    apiKey,
    coingeckoId,
    slug,
    symbol,
  });

  return Response.json(
    {
      attempts: result.attempts,
      bestAttempt: result.bestAttempt,
      hasKey: Boolean(apiKey),
      ok: true,
      recommendation: result.recommendation,
      requested: {
        coingeckoId,
        slug,
        symbol,
      },
      resolvedToken: result.mapping,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
