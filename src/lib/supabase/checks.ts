import "server-only";
import { getSupabaseAdminClient, type SupabaseAdminClient } from "@/lib/supabase/server";
import {
  isAdminTelegramUser,
  type ChecklistAccessType,
} from "@/lib/checklist/accessPolicy";
import type { ValidatedTelegramUser } from "@/lib/telegram/validateInitData";

export type AppUserRow = {
  created_at?: string;
  first_name: string | null;
  id?: string;
  is_admin: boolean;
  language_code: string | null;
  last_name: string | null;
  last_seen_at?: string;
  telegram_user_id: number;
  updated_at?: string;
  username: string | null;
};

export type CheckBalanceRow = {
  checks_available: number;
  checks_used: number;
  telegram_user_id: number;
  updated_at?: string;
};

function restEncode(value: string | number) {
  return encodeURIComponent(String(value));
}

export function getConfiguredSupabaseClient() {
  return getSupabaseAdminClient();
}

export async function upsertTelegramUser(
  client: SupabaseAdminClient,
  user: ValidatedTelegramUser,
) {
  const isAdmin = isAdminTelegramUser(user);
  const payload = {
    first_name: user.first_name ?? null,
    is_admin: isAdmin,
    language_code: user.language_code ?? null,
    last_name: user.last_name ?? null,
    last_seen_at: new Date().toISOString(),
    telegram_user_id: user.id,
    updated_at: new Date().toISOString(),
    username: user.username ?? null,
  };
  const result = await client.request<AppUserRow[]>(
    "rest/v1/app_users?on_conflict=telegram_user_id&select=*",
    {
      body: payload,
      method: "POST",
      prefer: "resolution=merge-duplicates,return=representation",
    },
  );

  if (result.error) {
    return {
      data: null,
      error: result.error,
      isAdmin,
    };
  }

  return {
    data: result.data?.[0] ?? null,
    error: null,
    isAdmin,
  };
}

export async function ensureCheckBalance(client: SupabaseAdminClient, telegramUserId: number) {
  const inserted = await client.request<CheckBalanceRow[]>(
    "rest/v1/check_balances?on_conflict=telegram_user_id&select=*",
    {
      body: {
        telegram_user_id: telegramUserId,
      },
      method: "POST",
      prefer: "resolution=ignore-duplicates,return=representation",
    },
  );

  if (inserted.error) {
    return inserted;
  }

  if (inserted.data?.[0]) {
    return {
      data: inserted.data,
      error: null,
      status: inserted.status,
    };
  }

  return client.request<CheckBalanceRow[]>(
    `rest/v1/check_balances?telegram_user_id=eq.${restEncode(telegramUserId)}&select=*`,
  );
}

export async function getOrCreateUserSession(
  client: SupabaseAdminClient,
  user: ValidatedTelegramUser,
) {
  const appUser = await upsertTelegramUser(client, user);

  if (appUser.error) {
    return {
      balance: null,
      error: appUser.error,
      isAdmin: appUser.isAdmin,
      user: null,
    };
  }

  const balance = await ensureCheckBalance(client, user.id);

  if (balance.error) {
    return {
      balance: null,
      error: balance.error,
      isAdmin: appUser.isAdmin,
      user: appUser.data,
    };
  }

  return {
    balance: balance.data?.[0] ?? null,
    error: null,
    isAdmin: appUser.isAdmin,
    user: appUser.data,
  };
}

export async function consumeOneCheck(client: SupabaseAdminClient, telegramUserId: number) {
  return client.request<CheckBalanceRow[] | CheckBalanceRow>("rest/v1/rpc/consume_check", {
    body: {
      p_telegram_user_id: telegramUserId,
    },
    method: "POST",
  });
}

export async function grantChecks(
  client: SupabaseAdminClient,
  targetTelegramUserId: number,
  checks: number,
) {
  const userUpsert = await client.request<AppUserRow[]>(
    "rest/v1/app_users?on_conflict=telegram_user_id&select=*",
    {
      body: {
        telegram_user_id: targetTelegramUserId,
        updated_at: new Date().toISOString(),
      },
      method: "POST",
      prefer: "resolution=ignore-duplicates,return=representation",
    },
  );

  if (userUpsert.error) {
    return {
      data: null,
      error: userUpsert.error,
      status: userUpsert.status,
    };
  }

  await ensureCheckBalance(client, targetTelegramUserId);
  const current = await client.request<CheckBalanceRow[]>(
    `rest/v1/check_balances?telegram_user_id=eq.${restEncode(targetTelegramUserId)}&select=*`,
  );

  if (current.error) {
    return current;
  }

  const row = current.data?.[0];
  const nextAvailable = Math.max(0, (row?.checks_available ?? 0) + checks);

  return client.request<CheckBalanceRow[]>(
    `rest/v1/check_balances?telegram_user_id=eq.${restEncode(targetTelegramUserId)}&select=*`,
    {
      body: {
        checks_available: nextAvailable,
        updated_at: new Date().toISOString(),
      },
      method: "PATCH",
      prefer: "return=representation",
    },
  );
}

export async function recordCheckHistory(
  client: SupabaseAdminClient,
  input: {
    accessType: ChecklistAccessType | "error_no_charge";
    checksDelta: number;
    dataQuality?: string | null;
    providerStatus?: string | null;
    symbol: string;
    telegramUserId: number;
    tokenId?: string | null;
    verdictRiskLevel?: string | null;
    verdictTitle?: string | null;
  },
) {
  return client.request("rest/v1/check_history", {
    body: {
      access_type: input.accessType,
      checks_delta: input.checksDelta,
      data_quality: input.dataQuality ?? null,
      provider_status: input.providerStatus ?? null,
      symbol: input.symbol,
      telegram_user_id: input.telegramUserId,
      token_id: input.tokenId ?? null,
      verdict_risk_level: input.verdictRiskLevel ?? null,
      verdict_title: input.verdictTitle ?? null,
    },
    method: "POST",
    prefer: "return=minimal",
  });
}

export async function recordManualGrantEvent(
  client: SupabaseAdminClient,
  input: {
    adminTelegramUserId: number;
    checksAdded: number;
    targetTelegramUserId: number;
  },
) {
  return client.request("rest/v1/payment_events", {
    body: {
      checks_added: input.checksAdded,
      provider: "manual_admin",
      raw_event: {
        adminTelegramUserId: input.adminTelegramUserId,
      },
      status: "granted",
      telegram_user_id: input.targetTelegramUserId,
    },
    method: "POST",
    prefer: "return=minimal",
  });
}
