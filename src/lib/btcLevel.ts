export type BtcLevelType =
  | "decision-zone"
  | "pivot"
  | "support"
  | "resistance"
  | "major_resistance";
export type BtcLevelConfidence = "low" | "medium" | "high";
export type BtcLevelDataQuality = "full" | "partial" | "fallback";

export type BtcLevelResponse = {
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
  nextResistance: string | null;
  nextSupport: string | null;
  source?: "auto-swing-sma-atr" | "fallback-current-price" | "fallback-static";
  type: BtcLevelType;
  updatedAt: string;
};

export const btcLevelFallback: BtcLevelResponse = {
  bearishScenario: "Потеря зоны повышает риск движения к следующей поддержке.",
  bullishScenario: "Закрепление выше зоны снижает давление продавцов.",
  aboveScenario: "Выше зоны рынок получает шанс на стабилизацию.",
  belowScenario: "Ниже зоны растёт риск движения к следующей поддержке.",
  confidence: "low",
  currentPrice: null,
  dataQuality: "fallback",
  distancePercent: null,
  error: "Уровень временно рассчитан по резервным данным",
  explanation:
    "Уровень временно рассчитан по резервным данным, потому что автоматический источник недоступен.",
  keyLevel: null,
  keyLevelRange: "$104 000–105 000",
  levelLabel: "$104 000–105 000",
  nextResistance: null,
  nextSupport: null,
  source: "fallback-static",
  type: "decision-zone",
  updatedAt: "резервные данные",
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
