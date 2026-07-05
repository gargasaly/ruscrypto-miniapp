import type {
  CryptoIntelligenceTokenInput,
  CryptoIntelligenceToolResult,
} from "./types";
import {
  extractWindowTotal,
  feesSummaryUrl,
  fetchJson,
  latestDailyValue,
  resolveProtocol,
} from "./shared";

const feeAliases = [
  "fees",
  "fee",
  "dailyFees",
  "daily_fees",
  "totalFees",
  "total_fees",
  "amount",
  "value",
  "usd",
];

export async function getFeesRawData(
  token: CryptoIntelligenceTokenInput,
): Promise<CryptoIntelligenceToolResult> {
  const tool = "get_fees_raw_data";

  try {
    const resolved = await resolveProtocol(token);
    const raw = await fetchJson<unknown>(feesSummaryUrl(resolved.slug, "dailyFees"));
    const fees7d = extractWindowTotal(raw, feeAliases, 7);
    const fees30d = extractWindowTotal(raw, feeAliases, 30);
    const dailyFees = latestDailyValue(raw, feeAliases);

    return {
      error: null,
      ok: true,
      payload: {
        dailyFees,
        fetchedAt: new Date().toISOString(),
        fees: fees30d ?? fees7d ?? dailyFees,
        fees7d,
        fees30d,
        protocolSlug: resolved.slug,
        resolvedFrom: resolved,
        source: "crypto-intelligence-local",
      },
      tool,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "fees-source-failed",
      ok: false,
      payload: null,
      tool,
    };
  }
}
