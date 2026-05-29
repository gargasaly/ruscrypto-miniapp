import "server-only";

import { isAdminTelegramUser } from "@/lib/checklist/accessPolicy";
import type { SupabaseAdminClient } from "@/lib/supabase/server";
import type { ValidatedTelegramUser } from "@/lib/telegram/validateInitData";

export const PORTFOLIO_PRO_PRODUCT = "portfolio_pro_7d";
export const PORTFOLIO_PRO_TITLE = "Portfolio Pro";
export const PORTFOLIO_PRO_PRICE_STARS = 100;
export const PORTFOLIO_PRO_DURATION_DAYS = 7;

const ADMIN_ID = 1720794119;
const ADMIN_USERNAME = "k_vahtang";
const DAY_MS = 24 * 60 * 60 * 1000;

export type UserEntitlementRow = {
  created_at?: string | null;
  expires_at: string;
  id?: string;
  payment_event_id?: string | null;
  product: string;
  source?: string | null;
  starts_at?: string | null;
  status: string;
  telegram_user_id: number;
  updated_at?: string | null;
};

export type PortfolioProStatus = {
  daysLeft: number | null;
  error?: string | null;
  expiresAt: string | null;
  hasPro: boolean;
  isAdmin: boolean;
  product: typeof PORTFOLIO_PRO_PRODUCT;
};

function restEncode(value: string | number) {
  return encodeURIComponent(String(value));
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function daysLeft(expiresAt: string | null) {
  if (!expiresAt) {
    return null;
  }

  const expiresMs = new Date(expiresAt).getTime();

  if (!Number.isFinite(expiresMs)) {
    return null;
  }

  return Math.max(0, Math.ceil((expiresMs - Date.now()) / DAY_MS));
}

export function isPortfolioProAdmin(user: ValidatedTelegramUser | null | undefined) {
  if (!user) {
    return false;
  }

  const username = user.username?.replace(/^@/, "").toLowerCase();

  return isAdminTelegramUser(user) || user.id === ADMIN_ID || username === ADMIN_USERNAME;
}

export function makePortfolioProInvoicePayload(telegramUserId: number) {
  return [
    "portfolio_pro",
    PORTFOLIO_PRO_PRODUCT,
    telegramUserId,
    Date.now(),
    crypto.randomUUID(),
  ].join(":");
}

export function isPortfolioProInvoicePayload(payload: string | null | undefined) {
  const parts = (payload ?? "").split(":");

  return parts[0] === "portfolio_pro" && parts[1] === PORTFOLIO_PRO_PRODUCT;
}

export async function getPortfolioProStatus(
  client: SupabaseAdminClient,
  user: ValidatedTelegramUser,
): Promise<PortfolioProStatus> {
  const isAdmin = isPortfolioProAdmin(user);

  if (isAdmin) {
    return {
      daysLeft: null,
      expiresAt: null,
      hasPro: true,
      isAdmin: true,
      product: PORTFOLIO_PRO_PRODUCT,
    };
  }

  const now = new Date().toISOString();
  const result = await client.request<UserEntitlementRow[]>(
    [
      "rest/v1/user_entitlements?",
      `telegram_user_id=eq.${restEncode(user.id)}`,
      `product=eq.${restEncode(PORTFOLIO_PRO_PRODUCT)}`,
      "status=eq.active",
      `expires_at=gt.${restEncode(now)}`,
      "order=expires_at.desc",
      "limit=1",
      "select=*",
    ].join("&").replace("?&", "?"),
  );

  if (result.error) {
    return {
      daysLeft: null,
      error: result.error,
      expiresAt: null,
      hasPro: false,
      isAdmin: false,
      product: PORTFOLIO_PRO_PRODUCT,
    };
  }

  const active = result.data?.[0] ?? null;

  return {
    daysLeft: daysLeft(active?.expires_at ?? null),
    expiresAt: active?.expires_at ?? null,
    hasPro: Boolean(active),
    isAdmin: false,
    product: PORTFOLIO_PRO_PRODUCT,
  };
}

export async function grantOrExtendPortfolioPro(
  client: SupabaseAdminClient,
  input: {
    paymentEventId?: string | null;
    source?: string;
    telegramUserId: number;
  },
) {
  if (input.paymentEventId) {
    const existingForPayment = await client.request<UserEntitlementRow[]>(
      [
        "rest/v1/user_entitlements?",
        `payment_event_id=eq.${restEncode(input.paymentEventId)}`,
        "select=*",
        "limit=1",
      ].join("&").replace("?&", "?"),
    );

    if (existingForPayment.data?.[0]) {
      return {
        data: existingForPayment.data[0],
        error: null,
        extended: false,
      };
    }
  }

  const now = new Date();
  const active = await client.request<UserEntitlementRow[]>(
    [
      "rest/v1/user_entitlements?",
      `telegram_user_id=eq.${restEncode(input.telegramUserId)}`,
      `product=eq.${restEncode(PORTFOLIO_PRO_PRODUCT)}`,
      "status=eq.active",
      `expires_at=gt.${restEncode(now.toISOString())}`,
      "order=expires_at.desc",
      "limit=1",
      "select=*",
    ].join("&").replace("?&", "?"),
  );

  if (active.error) {
    return {
      data: null,
      error: active.error,
      extended: false,
    };
  }

  const currentExpiresAt = active.data?.[0]?.expires_at ?? null;
  const currentExpiresMs = currentExpiresAt ? new Date(currentExpiresAt).getTime() : NaN;
  const baseDate =
    Number.isFinite(currentExpiresMs) && currentExpiresMs > now.getTime()
      ? new Date(currentExpiresMs)
      : now;
  const expiresAt = addDays(baseDate, PORTFOLIO_PRO_DURATION_DAYS).toISOString();
  const startsAt = now.toISOString();
  const inserted = await client.request<UserEntitlementRow[]>(
    "rest/v1/user_entitlements?select=*",
    {
      body: {
        expires_at: expiresAt,
        payment_event_id: input.paymentEventId ?? null,
        product: PORTFOLIO_PRO_PRODUCT,
        source: input.source ?? "telegram_stars",
        starts_at: startsAt,
        status: "active",
        telegram_user_id: input.telegramUserId,
        updated_at: startsAt,
      },
      method: "POST",
      prefer: "return=representation",
    },
  );

  return {
    data: inserted.data?.[0] ?? null,
    error: inserted.error,
    extended: Boolean(currentExpiresAt),
  };
}
