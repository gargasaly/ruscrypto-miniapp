import type {
  CryptoIntelligenceTokenInput,
  CryptoIntelligenceToolResult,
} from "./types";
import {
  fetchJson,
  isRecord,
  numberFrom,
  protocolUrl,
  resolveProtocol,
} from "./shared";

export async function getProtocolRawData(
  token: CryptoIntelligenceTokenInput,
): Promise<CryptoIntelligenceToolResult> {
  const tool = "get_protocol_raw_data";

  try {
    const resolved = await resolveProtocol(token);
    const raw = await fetchJson<unknown>(protocolUrl(resolved.slug), undefined, 20 * 60_000);
    const record = isRecord(raw) ? raw : null;

    return {
      error: null,
      ok: true,
      payload: {
        category: record?.category ?? null,
        chains: Array.isArray(record?.chains) ? record.chains : [],
        fetchedAt: new Date().toISOString(),
        protocolSlug: resolved.slug,
        resolvedFrom: resolved,
        source: "crypto-intelligence-local",
        tvl: numberFrom(record?.tvl),
      },
      tool,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "protocol-source-failed",
      ok: false,
      payload: null,
      tool,
    };
  }
}
