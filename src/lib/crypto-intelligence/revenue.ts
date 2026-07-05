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

const revenueAliases = [
  "revenue",
  "dailyRevenue",
  "daily_revenue",
  "amount",
  "value",
  "usd",
];

const protocolRevenueAliases = [
  "protocolRevenue",
  "protocol_revenue",
  "dailyProtocolRevenue",
  "daily_protocol_revenue",
  "revenue",
  "amount",
  "value",
  "usd",
];

const holdersRevenueAliases = [
  "holdersRevenue",
  "holders_revenue",
  "dailyHoldersRevenue",
  "daily_holders_revenue",
  "tokenHolderRevenue",
  "token_holders_revenue",
  "holderRevenue",
  "holder_revenue",
  "amount",
  "value",
  "usd",
];

async function fetchRevenue(slug: string, dataType: string) {
  try {
    return await fetchJson<unknown>(feesSummaryUrl(slug, dataType));
  } catch {
    return null;
  }
}

export async function getRevenueRawData(
  token: CryptoIntelligenceTokenInput,
): Promise<CryptoIntelligenceToolResult> {
  const tool = "get_revenue_raw_data";

  try {
    const resolved = await resolveProtocol(token);
    const [revenueRaw, protocolRevenueRaw, holdersRevenueRaw] = await Promise.all([
      fetchRevenue(resolved.slug, "dailyRevenue"),
      fetchRevenue(resolved.slug, "dailyProtocolRevenue"),
      fetchRevenue(resolved.slug, "dailyHoldersRevenue"),
    ]);

    if (!revenueRaw && !protocolRevenueRaw && !holdersRevenueRaw) {
      throw new Error("revenue-source-failed");
    }

    const revenue7d = revenueRaw ? extractWindowTotal(revenueRaw, revenueAliases, 7) : null;
    const revenue30d = revenueRaw ? extractWindowTotal(revenueRaw, revenueAliases, 30) : null;
    const protocolRevenue7d = protocolRevenueRaw
      ? extractWindowTotal(protocolRevenueRaw, protocolRevenueAliases, 7)
      : null;
    const protocolRevenue30d = protocolRevenueRaw
      ? extractWindowTotal(protocolRevenueRaw, protocolRevenueAliases, 30)
      : null;
    const holdersRevenue7d = holdersRevenueRaw
      ? extractWindowTotal(holdersRevenueRaw, holdersRevenueAliases, 7)
      : null;
    const holdersRevenue30d = holdersRevenueRaw
      ? extractWindowTotal(holdersRevenueRaw, holdersRevenueAliases, 30)
      : null;

    return {
      error: null,
      ok: true,
      payload: {
        fetchedAt: new Date().toISOString(),
        holdersRevenue:
          holdersRevenue30d ??
          holdersRevenue7d ??
          (holdersRevenueRaw ? latestDailyValue(holdersRevenueRaw, holdersRevenueAliases) : null),
        holdersRevenue7d,
        holdersRevenue30d,
        protocolRevenue: protocolRevenue30d ?? protocolRevenue7d ?? revenue30d ?? revenue7d,
        protocolRevenue7d,
        protocolRevenue30d,
        protocolSlug: resolved.slug,
        resolvedFrom: resolved,
        revenue: revenue30d ?? revenue7d,
        revenue7d,
        revenue30d,
        source: "crypto-intelligence-local",
      },
      tool,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "revenue-source-failed",
      ok: false,
      payload: null,
      tool,
    };
  }
}
