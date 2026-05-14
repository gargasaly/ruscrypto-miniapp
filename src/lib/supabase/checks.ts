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

export type CheckHistoryRow = {
  access_type: string;
  checks_delta: number;
  created_at: string;
  data_quality: string | null;
  id?: string;
  provider_status: string | null;
  symbol: string;
  telegram_user_id: number;
  token_id: string | null;
  verdict_risk_level: string | null;
  verdict_title: string | null;
};

export type PaymentEventRow = {
  checks_added: number | null;
  created_at?: string;
  id?: string;
  invoice_payload: string | null;
  provider: string | null;
  raw_event: unknown;
  stars_amount: number | null;
  status: string | null;
  telegram_payment_charge_id: string | null;
  telegram_user_id: number | null;
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

export async function getActiveChecklistResultAccess(
  client: SupabaseAdminClient,
  input: {
    symbol: string;
    telegramUserId: number;
    windowHours?: number;
  },
) {
  const windowMs = (input.windowHours ?? 24) * 60 * 60 * 1000;
  const since = new Date(Date.now() - windowMs).toISOString();
  const result = await client.request<CheckHistoryRow[]>(
    [
      "rest/v1/check_history?",
      `telegram_user_id=eq.${restEncode(input.telegramUserId)}`,
      `symbol=eq.${restEncode(input.symbol.toUpperCase())}`,
      "access_type=in.(paid_balance,admin)",
      "data_quality=eq.full",
      `created_at=gte.${restEncode(since)}`,
      "order=created_at.desc",
      "limit=1",
      "select=*",
    ].join("&").replace("?&", "?"),
  );

  if (result.error) {
    return {
      active: false,
      activeResultUntil: null,
      error: result.error,
      lastCheckAt: null,
      row: null,
    };
  }

  const row = result.data?.[0] ?? null;

  if (!row) {
    return {
      active: false,
      activeResultUntil: null,
      error: null,
      lastCheckAt: null,
      row: null,
    };
  }

  const createdAtMs = new Date(row.created_at).getTime();
  const activeResultUntil =
    Number.isFinite(createdAtMs) && createdAtMs > 0
      ? new Date(createdAtMs + windowMs).toISOString()
      : null;

  return {
    active: Boolean(activeResultUntil && Date.now() < new Date(activeResultUntil).getTime()),
    activeResultUntil,
    error: null,
    lastCheckAt: row.created_at,
    row,
  };
}

export async function getActiveChecklistResultsForUser(
  client: SupabaseAdminClient,
  input: {
    symbols: string[];
    telegramUserId: number;
    windowHours?: number;
  },
) {
  const normalizedSymbols = [
    ...new Set(input.symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)),
  ];

  if (normalizedSymbols.length === 0) {
    return {
      data: {},
      error: null,
    } as const;
  }

  const windowMs = (input.windowHours ?? 24) * 60 * 60 * 1000;
  const since = new Date(Date.now() - windowMs).toISOString();
  const symbolsFilter = normalizedSymbols.map(restEncode).join(",");
  const result = await client.request<CheckHistoryRow[]>(
    [
      "rest/v1/check_history?",
      `telegram_user_id=eq.${restEncode(input.telegramUserId)}`,
      `symbol=in.(${symbolsFilter})`,
      "access_type=in.(paid_balance,admin)",
      "data_quality=eq.full",
      `created_at=gte.${restEncode(since)}`,
      "order=created_at.desc",
      "select=*",
    ].join("&").replace("?&", "?"),
  );

  if (result.error) {
    return {
      data: Object.fromEntries(
        normalizedSymbols.map((symbol) => [
          symbol,
          {
            active: false,
            activeResultUntil: null,
            error: result.error,
            lastCheckAt: null,
            row: null,
          },
        ]),
      ),
      error: result.error,
    };
  }

  const rowsBySymbol = new Map<string, CheckHistoryRow>();

  for (const row of result.data ?? []) {
    const symbol = row.symbol.toUpperCase();

    if (!rowsBySymbol.has(symbol)) {
      rowsBySymbol.set(symbol, row);
    }
  }

  return {
    data: Object.fromEntries(
      normalizedSymbols.map((symbol) => {
        const row = rowsBySymbol.get(symbol) ?? null;
        const createdAtMs = row ? new Date(row.created_at).getTime() : NaN;
        const activeResultUntil =
          row && Number.isFinite(createdAtMs) && createdAtMs > 0
            ? new Date(createdAtMs + windowMs).toISOString()
            : null;

        return [
          symbol,
          {
            active: Boolean(
              activeResultUntil && Date.now() < new Date(activeResultUntil).getTime(),
            ),
            activeResultUntil,
            error: null,
            lastCheckAt: row?.created_at ?? null,
            row,
          },
        ];
      }),
    ),
    error: null,
  };
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

export async function addChecksToBalance(
  client: SupabaseAdminClient,
  targetTelegramUserId: number,
  checks: number,
) {
  const rpcResult = await client.request<CheckBalanceRow[] | CheckBalanceRow>("rest/v1/rpc/add_checks", {
    body: {
      p_checks: checks,
      p_telegram_user_id: targetTelegramUserId,
    },
    method: "POST",
  });

  if (!rpcResult.error) {
    return rpcResult;
  }

  return grantChecks(client, targetTelegramUserId, checks);
}

export async function createPaymentEvent(
  client: SupabaseAdminClient,
  input: {
    checksAdded: number;
    invoicePayload: string;
    packageId: string;
    starsAmount: number;
    telegramUserId: number;
    title: string;
  },
) {
  return client.request<PaymentEventRow[]>("rest/v1/payment_events?select=*", {
    body: {
      checks_added: input.checksAdded,
      invoice_payload: input.invoicePayload,
      provider: "telegram_stars",
      raw_event: {
        createdBy: "create-invoice",
        packageId: input.packageId,
        title: input.title,
      },
      stars_amount: input.starsAmount,
      status: "created",
      telegram_user_id: input.telegramUserId,
    },
    method: "POST",
    prefer: "return=representation",
  });
}

export async function getPaymentEventByPayload(
  client: SupabaseAdminClient,
  invoicePayload: string,
) {
  return client.request<PaymentEventRow[]>(
    `rest/v1/payment_events?invoice_payload=eq.${restEncode(invoicePayload)}&select=*`,
  );
}

export async function updatePaymentEventByPayload(
  client: SupabaseAdminClient,
  invoicePayload: string,
  body: Partial<PaymentEventRow>,
) {
  return client.request<PaymentEventRow[]>(
    `rest/v1/payment_events?invoice_payload=eq.${restEncode(invoicePayload)}&select=*`,
    {
      body,
      method: "PATCH",
      prefer: "return=representation",
    },
  );
}

export async function claimPaymentEventForGrant(
  client: SupabaseAdminClient,
  invoicePayload: string,
  input: {
    rawEvent: unknown;
    telegramPaymentChargeId: string | null;
  },
) {
  return client.request<PaymentEventRow[]>(
    `rest/v1/payment_events?invoice_payload=eq.${restEncode(invoicePayload)}&status=eq.created&select=*`,
    {
      body: {
        raw_event: input.rawEvent,
        status: "paid",
        telegram_payment_charge_id: input.telegramPaymentChargeId,
      },
      method: "PATCH",
      prefer: "return=representation",
    },
  );
}

export async function recordUnknownPaymentEvent(
  client: SupabaseAdminClient,
  input: {
    invoicePayload: string;
    rawEvent: unknown;
    telegramUserId?: number | null;
  },
) {
  return client.request("rest/v1/payment_events", {
    body: {
      invoice_payload: input.invoicePayload,
      provider: "telegram_stars",
      raw_event: input.rawEvent,
      status: "failed_or_unknown_payload",
      telegram_user_id: input.telegramUserId ?? null,
    },
    method: "POST",
    prefer: "return=minimal",
  });
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
