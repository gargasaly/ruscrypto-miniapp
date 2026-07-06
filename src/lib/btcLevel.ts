export type BtcLevelType =
  | "decision-zone"
  | "level_pending"
  | "pivot"
  | "support"
  | "resistance"
  | "major_resistance";
export type BtcLevelConfidence = "low" | "medium" | "high";
export type BtcLevelDataQuality = "full" | "partial" | "fallback";
export type BtcLevelStrength = "weak" | "working" | "strong" | "key";
export type BtcLevelState = "dynamic_ready" | "level_pending";
export type BtcLevelActionCode =
  | "DCA_CORE_SMALL"
  | "DCA_RANGE_SMALL"
  | "DCA_SMALL"
  | "DO_NOT_CHASE"
  | "LEVEL_PENDING"
  | "PARTIAL_CASH"
  | "RISK_OFF"
  | "WAIT_RECLAIM"
  | "WAIT_RANGE"
  | "WAIT_RETEST"
  | "WAIT"
  | "WAIT_BREAKOUT_CONFIRMATION";
export type BtcWorkingZoneState =
  | "above_working"
  | "below_working"
  | "inside_working"
  | "no_working_zone"
  | "retest_confirmed"
  | "retest_pending";

export type BtcLevelActionContext = {
  nextKeyResistanceLabel?: string | null;
  nearestStrongSupportLabel?: string | null;
  nextStrongResistanceLabel?: string | null;
  overheated?: boolean;
  roomFromStrongSupportPercent?: number | null;
  roomToNearestStrongKeyResistancePercent?: number | null;
  riskRewardToStrong?: number | null;
  roomToKeyPercent?: number | null;
  roomToStrongPercent?: number | null;
  workingZoneState?: BtcWorkingZoneState;
};

export type BtcLevelZone = {
  clusteredFrom?: string[];
  distancePercent: number | null;
  label?: string;
  lower: number;
  mid: number;
  note?: string;
  score: number;
  sources: string[];
  strength: BtcLevelStrength;
  upper: number;
};

export type BtcLevelAction = {
  code: BtcLevelActionCode;
  context?: BtcLevelActionContext;
  reasons: string[];
  text: string;
  title: string;
  whatToWait?: string;
};

export type BtcLevelResponse = {
  action?: BtcLevelAction;
  activeSupportZone?: BtcLevelZone | null;
  aboveScenario?: string;
  bearishScenario: string;
  belowScenario?: string;
  bullishScenario: string;
  confidence: BtcLevelConfidence;
  currentPrice: number | null;
  dataQuality: BtcLevelDataQuality;
  distancePercent: number | null;
  error?: string;
  explanation: string;
  keyLevel: number | null;
  keyLevelRange: string;
  levelLabel?: string;
  levelModelVersion?: "btc-level-v2";
  levelState?: BtcLevelState;
  majorResistance?: {
    high: number;
    label: string;
    low: number;
  };
  minorResistance?: (BtcLevelZone & { note: string }) | null;
  nearestResistance?: BtcLevelZone | null;
  nearestWorkingResistance?: BtcLevelZone | null;
  nextKeyResistance?: BtcLevelZone | null;
  nextStrongResistance?: BtcLevelZone | null;
  nearestSupport?: BtcLevelZone | null;
  riskRewardSupport?: BtcLevelZone | null;
  nextResistance: string | null;
  nextSupport: string | null;
  riskRewardRatio?: number | null;
  supportState?:
    | "above_support"
    | "inside_support_zone"
    | "near_support_zone"
    | "no_support_below";
  source?:
    | "auto-swing-sma-atr"
    | "fallback-current-price"
    | "fallback-static"
    | "level_pending"
    | "ohlc_dynamic";
  type: BtcLevelType;
  updatedAt: string;
  meta?: {
    atr14_4h?: number | null;
    atr14_1d?: number | null;
    cacheTtlMinutes?: number;
    calculatedAt?: string;
    candles4h?: number;
    candles1d?: number;
    candleSource?: string | null;
    ema20Daily?: number | null;
    ema50Daily?: number | null;
    ema200Daily?: number | null;
    elapsedMs?: number;
    fallbackUsed?: boolean;
    levelModelVersion?: "btc-level-v2";
    ohlcStatus?:
      | "error"
      | "last_good"
      | "pending"
      | "provider_failed"
      | "ready"
      | "timeout";
    overheated?: boolean;
    overheatedReasons?: string[];
    providerAttemptsCount?: number;
    rsiDaily?: number | null;
    sevenDayChangePercent?: number | null;
    source?: string;
  };
};

export const btcLevelFallback: BtcLevelResponse = {
  action: {
    code: "LEVEL_PENDING",
    reasons: ["OHLC-данные временно недоступны"],
    text: "Ближайшая зона BTC уточняется по свежим данным. Дальнюю зону нельзя считать рабочим уровнем для входа.",
    title: "Уровень уточняется",
  },
  bearishScenario: "Без свежих уровней не оцениваем риск движения к поддержке.",
  bullishScenario: "Без свежих уровней не считаем дальнюю зону рабочим сопротивлением.",
  aboveScenario: "Ближайшая рабочая зона уточняется.",
  belowScenario: "Ближайшая рабочая зона уточняется.",
  confidence: "low",
  currentPrice: null,
  activeSupportZone: null,
  dataQuality: "fallback",
  distancePercent: null,
  error: "Уровень временно уточняется",
  explanation:
    "Ближайшая рабочая зона BTC временно уточняется, потому что OHLC-источник недоступен.",
  keyLevel: null,
  keyLevelRange: "Уровень уточняется",
  levelLabel: "Уровень уточняется",
  levelModelVersion: "btc-level-v2",
  levelState: "level_pending",
  minorResistance: null,
  nearestResistance: null,
  nearestSupport: null,
  riskRewardSupport: null,
  nextResistance: null,
  nextSupport: null,
  riskRewardRatio: null,
  source: "level_pending",
  supportState: "no_support_below",
  type: "level_pending",
  updatedAt: "уровень уточняется",
};

export function btcLevelTypeLabel(type: BtcLevelType) {
  if (type === "support") {
    return "поддержка";
  }

  if (type === "resistance") {
    return "сопротивление";
  }

  if (type === "major_resistance") {
    return "главное сопротивление";
  }

  if (type === "level_pending") {
    return "уровень уточняется";
  }

  return "зона решения";
}

export function btcLevelConfidenceLabel(confidence: BtcLevelConfidence) {
  if (confidence === "high") {
    return "высокая уверенность";
  }

  if (confidence === "medium") {
    return "средняя уверенность";
  }

  return "низкая уверенность";
}
