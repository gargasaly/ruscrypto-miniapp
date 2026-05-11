import { fetchMarketData } from "@/lib/market";

export const revalidate = 60;

export async function GET() {
  const payload = await fetchMarketData();

  return Response.json(payload, {
    status: payload.error && payload.coins.length === 0 ? 502 : 200,
  });
}
