import type { ValidatedTelegramUser } from "@/lib/telegram/validateInitData";

export const FREE_CHECKLIST_SYMBOLS = ["BTC", "ETH"] as const;
export const PAID_CHECKLIST_SYMBOLS = [
  "BNB",
  "LINK",
  "HYPE",
  "SOL",
  "AAVE",
  "XRP",
  "RENDER",
  "SUI",
  "TAO",
  "TON",
  "ONDO",
  "UNI",
  "JUP",
  "PENDLE",
  "ENA",
  "AVAX",
  "NEAR",
  "MORPHO",
  "ARB",
  "OP",
  "SKY",
  "SYRUP",
  "AERO",
  "SEI",
  "LDO",
  "JTO",
  "PYTH",
] as const;
export const PAID_TEST_SYMBOLS = PAID_CHECKLIST_SYMBOLS;
export const CHECKLIST_PRICING_PREVIEW = {
  fiveChecksStars: 20,
  singleCheckStars: 5,
};
export const LOCKED_ALT_MESSAGE =
  "Расширенная проверка доступна для BTC, ETH и токенов из списка чеклиста. Для альтов нужна 1 попытка.";

export type ChecklistAccessType =
  | "admin"
  | "free"
  | "paid_balance"
  | "portfolio_pro"
  | "locked";

export type ChecklistAccessDecision = {
  accessType: ChecklistAccessType;
  canRun: boolean;
  locked: boolean;
  message?: string;
  paymentRequired: boolean;
  pricingPreview?: typeof CHECKLIST_PRICING_PREVIEW;
  shouldCharge: boolean;
};

function parseList(value: string | undefined) {
  return (
    value
      ?.split(/[,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean) ?? []
  );
}

export function normalizeChecklistSymbol(symbol: string | null | undefined) {
  return symbol?.trim().toUpperCase() ?? "";
}

export function isFreeChecklistSymbol(symbol: string | null | undefined) {
  const normalized = normalizeChecklistSymbol(symbol);

  return FREE_CHECKLIST_SYMBOLS.includes(normalized as (typeof FREE_CHECKLIST_SYMBOLS)[number]);
}

export function isPaidTestSymbol(symbol: string | null | undefined) {
  const normalized = normalizeChecklistSymbol(symbol);

  return PAID_CHECKLIST_SYMBOLS.includes(normalized as (typeof PAID_CHECKLIST_SYMBOLS)[number]);
}

export function getAdminTelegramIds() {
  return parseList(process.env.ADMIN_TELEGRAM_IDS)
    .map((value) => Number(value))
    .filter((value) => Number.isSafeInteger(value));
}

export function getAdminTelegramUsernames() {
  return parseList(process.env.ADMIN_TELEGRAM_USERNAMES).map((value) =>
    value.replace(/^@/, "").toLowerCase(),
  );
}

export function isAdminTelegramUser(user: ValidatedTelegramUser | null | undefined) {
  if (!user) {
    return false;
  }

  const username = user.username?.replace(/^@/, "").toLowerCase();

  return (
    getAdminTelegramIds().includes(user.id) ||
    Boolean(username && getAdminTelegramUsernames().includes(username))
  );
}

export function decideChecklistAccess({
  balance,
  isAdmin,
  symbol,
}: {
  balance: number | null;
  isAdmin: boolean;
  symbol: string;
}): ChecklistAccessDecision {
  const normalized = normalizeChecklistSymbol(symbol);

  if (isFreeChecklistSymbol(normalized)) {
    return {
      accessType: "free",
      canRun: true,
      locked: false,
      paymentRequired: false,
      shouldCharge: false,
    };
  }

  if (isPaidTestSymbol(normalized)) {
    if (isAdmin) {
      return {
        accessType: "admin",
        canRun: true,
        locked: false,
        paymentRequired: false,
        shouldCharge: false,
      };
    }

    if ((balance ?? 0) > 0) {
      return {
        accessType: "paid_balance",
        canRun: true,
        locked: false,
        paymentRequired: false,
        shouldCharge: true,
      };
    }

    return {
      accessType: "locked",
      canRun: false,
      locked: true,
      message: "Для расширенной проверки нужна 1 попытка.",
      paymentRequired: true,
      pricingPreview: CHECKLIST_PRICING_PREVIEW,
      shouldCharge: false,
    };
  }

  return {
    accessType: "locked",
    canRun: false,
    locked: true,
    message:
      "Этот токен пока не добавлен в расширенный чеклист. Сейчас доступны BTC, ETH и токены из списка чеклиста.",
    paymentRequired: false,
    shouldCharge: false,
  };
}
