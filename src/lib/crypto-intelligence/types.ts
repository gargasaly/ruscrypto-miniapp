export type CryptoIntelligenceToolName =
  | "get_fees_raw_data"
  | "get_governance_raw_data"
  | "get_protocol_raw_data"
  | "get_revenue_raw_data";

export type CryptoIntelligenceTokenInput = {
  coingeckoId: string;
  ticker: string;
  title: string;
};

export type CryptoIntelligenceToolResult = {
  error: string | null;
  ok: boolean;
  payload: unknown;
  tool: CryptoIntelligenceToolName;
};

export type ProtocolResolution = {
  input: string;
  matchScore: number | null;
  method: "fallback_slug" | "search_protocol";
  slug: string;
};
