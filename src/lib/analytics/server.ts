import "server-only";
import { isAdminTelegramUser } from "@/lib/checklist/accessPolicy";
import { normalizeAnalyticsEventType, type AnalyticsEventType } from "@/lib/analytics/events";
import type { SupabaseAdminClient } from "@/lib/supabase/server";

export type AnalyticsTelegramUser = {
  first_name?: string | null;
  id?: number | string | null;
  last_name?: string | null;
  username?: string | null;
};

type AppUserAnalyticsRow = {
  first_seen_at?: string | null;
  telegram_user_id: number;
  visit_count?: number | null;
};

type TrackAnalyticsInput = {
  eventTarget?: string | null;
  eventType: AnalyticsEventType | string;
  metadata?: unknown;
  platform?: string | null;
  route?: string | null;
  telegramUser?: AnalyticsTelegramUser | null;
};

function restEncode(value: string | number) {
  return encodeURIComponent(String(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function trimString(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function sanitizeMetadata(value: unknown, depth = 0): unknown {
  if (depth > 3) {
    return null;
  }

  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "string") {
    return value.slice(0, 500);
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeMetadata(item, depth + 1));
  }

  if (!isRecord(value)) {
    return null;
  }

  const output: Record<string, unknown> = {};

  for (const [key, raw] of Object.entries(value).slice(0, 40)) {
    const normalizedKey = key.toLowerCase();

    if (
      normalizedKey.includes("initdata") ||
      normalizedKey.includes("hash") ||
      normalizedKey.includes("token") ||
      normalizedKey.includes("secret") ||
      normalizedKey.includes("key")
    ) {
      continue;
    }

    output[key.slice(0, 80)] = sanitizeMetadata(raw, depth + 1);
  }

  return output;
}

export function normalizeAnalyticsUser(user: unknown): AnalyticsTelegramUser | null {
  if (!isRecord(user)) {
    return null;
  }

  const rawId = user.id;
  const id = typeof rawId === "number" ? rawId : typeof rawId === "string" ? Number(rawId) : NaN;

  if (!Number.isSafeInteger(id)) {
    return null;
  }

  return {
    first_name: trimString(user.first_name, 120),
    id,
    last_name: trimString(user.last_name, 120),
    username: trimString(user.username, 120)?.replace(/^@/, "") ?? null,
  };
}

async function upsertAnalyticsUser(
  client: SupabaseAdminClient,
  input: {
    eventType: AnalyticsEventType;
    platform?: string | null;
    route?: string | null;
    user: AnalyticsTelegramUser;
  },
) {
  const id = Number(input.user.id);

  if (!Number.isSafeInteger(id)) {
    return {
      error: "invalid-user-id",
    };
  }

  const now = new Date().toISOString();
  const existing = await client.request<AppUserAnalyticsRow[]>(
    `rest/v1/app_users?telegram_user_id=eq.${restEncode(id)}&select=telegram_user_id,visit_count,first_seen_at&limit=1`,
  );

  const isAdmin = isAdminTelegramUser({
    first_name: input.user.first_name ?? undefined,
    id,
    last_name: input.user.last_name ?? undefined,
    username: input.user.username ?? undefined,
  });
  const current = existing.data?.[0] ?? null;
  const visitCount =
    (current?.visit_count ?? 0) + (input.eventType === "app_open" ? 1 : 0);
  const body = {
    first_name: input.user.first_name ?? null,
    first_seen_at: current?.first_seen_at ?? now,
    is_admin: isAdmin,
    last_name: input.user.last_name ?? null,
    last_platform: input.platform ?? null,
    last_route: input.route ?? null,
    last_seen_at: now,
    telegram_user_id: id,
    updated_at: now,
    username: input.user.username ?? null,
    visit_count: visitCount,
  };

  if (current) {
    const patched = await client.request(
      `rest/v1/app_users?telegram_user_id=eq.${restEncode(id)}`,
      {
        body,
        method: "PATCH",
        prefer: "return=minimal",
      },
    );

    return {
      error: patched.error,
    };
  }

  const inserted = await client.request("rest/v1/app_users?on_conflict=telegram_user_id", {
    body,
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
  });

  return {
    error: inserted.error,
  };
}

export async function trackAnalyticsEvent(
  client: SupabaseAdminClient,
  input: TrackAnalyticsInput,
) {
  const eventType = normalizeAnalyticsEventType(input.eventType);
  const user = normalizeAnalyticsUser(input.telegramUser);
  const username = user?.username ?? null;
  const telegramUserId =
    user && Number.isSafeInteger(Number(user.id)) ? Number(user.id) : null;

  if (user) {
    const userResult = await upsertAnalyticsUser(client, {
      eventType,
      platform: trimString(input.platform, 80),
      route: trimString(input.route, 240),
      user,
    });

    if (userResult.error) {
      return {
        error: userResult.error,
        ok: false,
      };
    }
  }

  const inserted = await client.request("rest/v1/user_activity_log", {
    body: {
      event_target: trimString(input.eventTarget, 240),
      event_type: eventType,
      metadata: sanitizeMetadata(input.metadata) ?? {},
      route: trimString(input.route, 240),
      telegram_user_id: telegramUserId,
      username,
    },
    method: "POST",
    prefer: "return=minimal",
  });

  return {
    error: inserted.error,
    ok: !inserted.error,
  };
}
