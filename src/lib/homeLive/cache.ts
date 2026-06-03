import "server-only";

import type {
  BtcDistantMajorResistance,
  BtcLevelAction,
  BtcLevelZone,
} from "@/lib/btcLevel";
import type { RiskImpact } from "@/lib/riskCalendar";

export type HomeLiveTone = "green" | "red" | "yellow";
export type HomeLiveDataStatus = "fallback" | "partial" | "ready";
export type HomeLiveLevelType =
  | "major_resistance"
  | "near_resistance"
  | "neutral"
  | "resistance_above"
  | "support";

export type HomeLiveStatePayload = {
  action: {
    reason: string;
    status: string;
    tone: HomeLiveTone;
    whatToWait: string;
  };
  dataStatus: HomeLiveDataStatus;
  importantEvents: Array<{
    affectedAssets: string[];
    category: string;
    impact: RiskImpact;
    time: string | null;
    title: string;
  }>;
  level: {
    action?: BtcLevelAction;
    activeSupportZone?: BtcLevelZone | null;
    currentPrice?: number | null;
    distancePercent: number | null;
    distantMajorResistance?: BtcDistantMajorResistance | null;
    label: string;
    levelModelVersion?: "btc-level-v2";
    levelState?: "dynamic_ready" | "level_pending";
    minorResistance?: (BtcLevelZone & { note?: string }) | null;
    nearestResistance?: BtcLevelZone | null;
    nearestSupport?: BtcLevelZone | null;
    riskRewardSupport?: BtcLevelZone | null;
    riskRewardRatio?: number | null;
    source?: string;
    supportState?:
      | "above_support"
      | "inside_support_zone"
      | "near_support_zone"
      | "no_support_below";
    text: string;
    title: string;
    type: HomeLiveLevelType;
  };
  mainRisk: {
    affectedAssets: string[];
    category: string;
    description: string;
    impact: RiskImpact;
    time: string | null;
    title: string;
  };
  meta?: Record<string, unknown>;
  ok: true;
  price: {
    change24h: number | null;
    source: string;
    symbol: "BTC";
    updatedAt: string;
    value: number | null;
  };
};

export type CachedHomeLiveState = {
  invalidatedAt: number | null;
  invalidationReason: string | null;
  payload: HomeLiveStatePayload;
  updatedAt: number;
};

const HOME_LIVE_STATE_KEY = "__ruscrypto_home_live_state__";
export const HOME_LIVE_STATE_LAST_GOOD_TTL_MS = 24 * 60 * 60_000;
export const HOME_LIVE_STATE_FRESH_TTL_MS = 90_000;

type HomeLiveStateBucket = {
  invalidatedAt: number | null;
  invalidationReason: string | null;
  state: CachedHomeLiveState | null;
};

type GlobalWithHomeLiveState = typeof globalThis & {
  [HOME_LIVE_STATE_KEY]?: HomeLiveStateBucket;
};

function bucket() {
  const globalBucket = globalThis as GlobalWithHomeLiveState;

  globalBucket[HOME_LIVE_STATE_KEY] ??= {
    invalidatedAt: null,
    invalidationReason: null,
    state: null,
  };

  return globalBucket[HOME_LIVE_STATE_KEY];
}

export function readHomeLiveState(maxAgeMs = HOME_LIVE_STATE_LAST_GOOD_TTL_MS) {
  const stateBucket = bucket();
  const state = stateBucket.state;

  if (!state) {
    return null;
  }

  const ageMs = Date.now() - state.updatedAt;

  if (ageMs > maxAgeMs) {
    return null;
  }

  return {
    ...state,
    ageMs,
    fresh: ageMs <= HOME_LIVE_STATE_FRESH_TTL_MS,
    invalidated:
      stateBucket.invalidatedAt !== null && stateBucket.invalidatedAt > state.updatedAt,
  };
}

export function writeHomeLiveState(payload: HomeLiveStatePayload) {
  const stateBucket = bucket();
  const current = stateBucket.state;

  if (
    current?.payload.dataStatus === "ready" &&
    payload.dataStatus !== "ready" &&
    Date.now() - current.updatedAt <= HOME_LIVE_STATE_LAST_GOOD_TTL_MS
  ) {
    return current;
  }

  const nextState: CachedHomeLiveState = {
    invalidatedAt: stateBucket.invalidatedAt,
    invalidationReason: stateBucket.invalidationReason,
    payload,
    updatedAt: Date.now(),
  };

  stateBucket.state = nextState;

  return nextState;
}

export function markHomeLiveStateStale(reason: string) {
  const stateBucket = bucket();

  stateBucket.invalidatedAt = Date.now();
  stateBucket.invalidationReason = reason;

  if (stateBucket.state) {
    stateBucket.state = {
      ...stateBucket.state,
      invalidatedAt: stateBucket.invalidatedAt,
      invalidationReason: reason,
    };
  }
}
