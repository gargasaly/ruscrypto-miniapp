const DEFAULT_FREE_CHECKLIST_SYMBOLS = ["BTC", "ETH"];

function parseSymbolList(value: string | undefined) {
  const symbols = value
    ?.split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);

  return symbols && symbols.length > 0 ? symbols : DEFAULT_FREE_CHECKLIST_SYMBOLS;
}

export function getFreeChecklistSymbols() {
  return parseSymbolList(process.env.NEXT_PUBLIC_FREE_CHECKLIST_SYMBOLS);
}

export function isAltChecklistLocked() {
  const raw = process.env.NEXT_PUBLIC_ALT_CHECKLIST_LOCKED;

  if (raw === undefined) {
    return true;
  }

  return !["0", "false", "no", "off"].includes(raw.trim().toLowerCase());
}

export function canRunChecklistForSymbol(symbol: string | null | undefined) {
  if (!isAltChecklistLocked()) {
    return true;
  }

  const normalized = symbol?.trim().toUpperCase();

  return Boolean(normalized && getFreeChecklistSymbols().includes(normalized));
}
