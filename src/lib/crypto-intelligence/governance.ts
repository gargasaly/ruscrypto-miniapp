import type {
  CryptoIntelligenceTokenInput,
  CryptoIntelligenceToolResult,
} from "./types";
import {
  fetchJson,
  isRecord,
  resolveProtocol,
} from "./shared";

const SNAPSHOT_GRAPHQL = "https://hub.snapshot.org/graphql";

const SNAPSHOT_SPACE_BY_KEY: Record<string, string> = {
  aave: "aavedao.eth",
  ldo: "lido-snapshot.eth",
  morpho: "morpho.eth",
  uni: "uniswapgovernance.eth",
  uniswap: "uniswapgovernance.eth",
};

type SnapshotProposal = {
  author?: unknown;
  body?: unknown;
  choices?: unknown;
  created?: unknown;
  end?: unknown;
  id?: unknown;
  link?: unknown;
  scores_total?: unknown;
  snapshot?: unknown;
  start?: unknown;
  state?: unknown;
  title?: unknown;
  votes?: unknown;
};

function governanceKeys(token: CryptoIntelligenceTokenInput, protocolSlug: string) {
  return [
    token.ticker,
    token.coingeckoId,
    protocolSlug,
    token.title,
  ]
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function resolveSnapshotSpace(token: CryptoIntelligenceTokenInput, protocolSlug: string) {
  for (const key of governanceKeys(token, protocolSlug)) {
    const direct = SNAPSHOT_SPACE_BY_KEY[key];

    if (direct) {
      return direct;
    }
  }

  return null;
}

function isoFromSeconds(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? new Date(value * 1000).toISOString()
    : null;
}

export async function getGovernanceRawData(
  token: CryptoIntelligenceTokenInput,
): Promise<CryptoIntelligenceToolResult> {
  const tool = "get_governance_raw_data";

  try {
    const resolved = await resolveProtocol(token);
    const space = resolveSnapshotSpace(token, resolved.slug);

    if (!space) {
      return {
        error: null,
        ok: true,
        payload: {
          fetchedAt: new Date().toISOString(),
          governanceKey: token.ticker,
          proposals: [],
          protocolSlug: resolved.slug,
          resolvedFrom: resolved,
          source: "snapshot",
          warnings: ["snapshot_space_mapping_missing"],
        },
        tool,
      };
    }

    const query = `query GovernanceData($space: String!, $limit: Int!) {
      space(id: $space) { id name about network symbol }
      proposals(first: $limit, where: { space: $space }, orderBy: "created", orderDirection: desc) {
        id title body state start end choices scores scores_total votes created author snapshot link
      }
    }`;
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    const snapshotApiKey = process.env.SNAPSHOT_API_KEY?.trim();

    if (snapshotApiKey) {
      headers["x-api-key"] = snapshotApiKey;
    }

    const raw = await fetchJson<unknown>(
      SNAPSHOT_GRAPHQL,
      {
        body: JSON.stringify({
          query,
          variables: {
            limit: 10,
            space,
          },
        }),
        headers,
        method: "POST",
      },
      5 * 60_000,
    );
    const root = isRecord(raw) ? raw : null;
    const data = isRecord(root?.data) ? root.data : null;
    const proposals = Array.isArray(data?.proposals)
      ? (data.proposals as SnapshotProposal[]).map((proposal) => ({
          body: typeof proposal.body === "string" ? proposal.body : null,
          endDate: isoFromSeconds(proposal.end),
          startDate: isoFromSeconds(proposal.start),
          status: proposal.state ?? null,
          title: proposal.title ?? null,
          url: proposal.link ?? null,
        }))
      : [];

    return {
      error: null,
      ok: true,
      payload: {
        fetchedAt: new Date().toISOString(),
        governanceKey: token.ticker,
        proposals,
        protocolSlug: resolved.slug,
        resolvedFrom: resolved,
        snapshotSpace: space,
        source: "snapshot",
      },
      tool,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "governance-source-failed",
      ok: false,
      payload: null,
      tool,
    };
  }
}
