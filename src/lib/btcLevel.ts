export type BtcLevelType = "support" | "resistance" | "pivot";
export type BtcLevelConfidence = "low" | "medium" | "high";
export type BtcLevelDataQuality = "full" | "partial" | "fallback";

export type BtcLevelResponse = {
  bearishScenario: string;
  bullishScenario: string;
  confidence: BtcLevelConfidence;
  currentPrice: number | null;
  dataQuality: BtcLevelDataQuality;
  distancePercent: number | null;
  error?: string;
  explanation: string;
  keyLevel: number | null;
  keyLevelRange: string;
  nextResistance: string | null;
  nextSupport: string | null;
  type: BtcLevelType;
  updatedAt: string;
};

export const btcLevelFallback: BtcLevelResponse = {
  bearishScenario: "Потеря зоны повышает риск движения к следующей поддержке.",
  bullishScenario: "Закрепление выше зоны снижает давление продавцов.",
  confidence: "low",
  currentPrice: null,
  dataQuality: "fallback",
  distancePercent: null,
  error: "Уровень временно рассчитан по резервным данным",
  explanation:
    "Уровень временно рассчитан по резервным данным, потому что автоматический источник недоступен.",
  keyLevel: null,
  keyLevelRange: "$104 000–105 000",
  nextResistance: null,
  nextSupport: null,
  type: "pivot",
  updatedAt: "резервные данные",
};

export function btcLevelTypeLabel(type: BtcLevelType) {
  if (type === "support") {
    return "поддержка";
  }

  if (type === "resistance") {
    return "сопротивление";
  }

  return "pivot";
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
