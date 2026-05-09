function toFiniteNumber(value: unknown): number {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  return Number.isFinite(number) ? number : NaN;
}

export function formatUsdPrice(value: unknown): string {
  const number = toFiniteNumber(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  const abs = Math.abs(number);

  let maximumFractionDigits = 2;

  if (abs >= 1000) {
    maximumFractionDigits = 0;
  } else if (abs >= 1) {
    maximumFractionDigits = 2;
  } else if (abs >= 0.01) {
    maximumFractionDigits = 4;
  } else {
    maximumFractionDigits = 6;
  }

  maximumFractionDigits = Math.min(20, Math.max(0, maximumFractionDigits));

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(number);
}

export function formatPercent(value: unknown): string {
  const number = toFiniteNumber(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  const sign = number > 0 ? "+" : "";

  return `${sign}${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(number)}%`;
}
