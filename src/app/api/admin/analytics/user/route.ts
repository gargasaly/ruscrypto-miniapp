import { isAdminTelegramUser } from "@/lib/checklist/accessPolicy";
import { getConfiguredSupabaseClient } from "@/lib/supabase/checks";
import { validateTelegramInitData } from "@/lib/telegram/validateInitData";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AppUserRow = {
  created_at?: string | null;
  first_name: string | null;
  first_seen_at?: string | null;
  last_name: string | null;
  last_route?: string | null;
  last_seen_at?: string | null;
  telegram_user_id: number;
  username: string | null;
  visit_count?: number | null;
};

type ActivityRow = {
  created_at: string;
  event_target: string | null;
  event_type: string;
  metadata: unknown;
  route: string | null;
  telegram_user_id: number | null;
  username: string | null;
};

type CheckRow = {
  access_type: string | null;
  created_at: string;
  data_quality: string | null;
  symbol: string;
  telegram_user_id: number | null;
  verdict_risk_level: string | null;
  verdict_title: string | null;
};

type PaymentRow = {
  checks_added: number | null;
  created_at: string;
  stars_amount: number | null;
  status: string | null;
  telegram_user_id: number | null;
};

function readAdminInitData(request: Request) {
  const url = new URL(request.url);

  return (
    request.headers.get("x-telegram-init-data") ??
    url.searchParams.get("initData") ??
    ""
  );
}

function restEncode(value: string | number) {
  return encodeURIComponent(String(value));
}

function routePath(route: string | null | undefined) {
  return (route ?? "").split("?")[0].replace(/\/+$/, "") || "/";
}

function metadataRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function metadataMessage(value: unknown) {
  const message = metadataRecord(value).message;

  return typeof message === "string" ? message.slice(0, 240) : null;
}

function metadataScore(value: unknown) {
  const score = metadataRecord(value).score;

  return typeof score === "number" && Number.isFinite(score) ? score : null;
}

function tokenFromEvent(event: ActivityRow) {
  const token = metadataRecord(event.metadata).token;

  return typeof token === "string" && token.trim()
    ? token.trim().toUpperCase()
    : event.event_target?.trim().toUpperCase() ?? null;
}

function topCounts<T extends string | null | undefined>(values: T[]) {
  const map = new Map<string, number>();

  for (const value of values) {
    const key = value?.trim();

    if (!key) {
      continue;
    }

    map.set(key, (map.get(key) ?? 0) + 1);
  }

  return [...map.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([label, count]) => ({ count, label }));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const validation = validateTelegramInitData(readAdminInitData(request));

  if (!validation.ok || !isAdminTelegramUser(validation.user)) {
    return Response.json(
      {
        ok: false,
        reason: "admin-only",
      },
      {
        status: 403,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const telegramUserId = Number(url.searchParams.get("telegram_user_id"));

  if (!Number.isSafeInteger(telegramUserId)) {
    return Response.json(
      {
        ok: false,
        reason: "telegram_user_id-required",
      },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const supabase = getConfiguredSupabaseClient();

  if (!supabase.isConfigured) {
    return Response.json(
      {
        ok: false,
        reason: supabase.reason,
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const [userResult, activityResult, checksResult, paymentsResult] = await Promise.all([
    supabase.request<AppUserRow[]>(
      `rest/v1/app_users?telegram_user_id=eq.${restEncode(telegramUserId)}&select=telegram_user_id,username,first_name,last_name,first_seen_at,last_seen_at,visit_count,last_route,created_at&limit=1`,
    ),
    supabase.request<ActivityRow[]>(
      `rest/v1/user_activity_log?telegram_user_id=eq.${restEncode(telegramUserId)}&select=telegram_user_id,username,event_type,event_target,route,metadata,created_at&order=created_at.desc&limit=300`,
    ),
    supabase.request<CheckRow[]>(
      `rest/v1/check_history?telegram_user_id=eq.${restEncode(telegramUserId)}&select=telegram_user_id,symbol,access_type,data_quality,verdict_title,verdict_risk_level,created_at&order=created_at.desc&limit=300`,
    ),
    supabase.request<PaymentRow[]>(
      `rest/v1/payment_events?telegram_user_id=eq.${restEncode(telegramUserId)}&select=telegram_user_id,status,stars_amount,checks_added,created_at&order=created_at.desc&limit=300`,
    ),
  ]);

  const firstError =
    userResult.error ?? activityResult.error ?? checksResult.error ?? paymentsResult.error;

  if (firstError) {
    return Response.json(
      {
        ok: false,
        reason: firstError,
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const user = userResult.data?.[0] ?? null;

  if (!user) {
    return Response.json(
      {
        ok: false,
        reason: "user-not-found",
      },
      {
        status: 404,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const activity = activityResult.data ?? [];
  const checks = checksResult.data ?? [];
  const paidPayments = (paymentsResult.data ?? []).filter((payment) => payment.status === "paid");
  const portfolioOpens = activity.filter(
    (event) => event.event_type === "portfolio_open" || routePath(event.route) === "/portfolio",
  ).length;
  const portfolioReportOpens = activity.filter(
    (event) =>
      event.event_type === "portfolio_report_open" ||
      routePath(event.route) === "/portfolio/prepared",
  ).length;
  const guideEvents = activity.filter((event) => event.event_type === "guide_open");

  return Response.json(
    {
      checkedTokens: topCounts([
        ...checks.map((check) => check.symbol?.toUpperCase()),
        ...activity
          .filter((event) => event.event_type === "token_check_result")
          .map(tokenFromEvent),
      ]),
      ok: true,
      openedGuides: topCounts(guideEvents.map((event) => event.event_target)),
      recentEvents: activity.slice(0, 20).map((event) => ({
        created_at: event.created_at,
        event_target: event.event_target,
        event_type: event.event_type,
        message: event.event_type === "error" ? metadataMessage(event.metadata) : null,
        route: event.route,
        score: event.event_type === "token_check_result" ? metadataScore(event.metadata) : null,
      })),
      stats: {
        guideOpens: guideEvents.length,
        payments: paidPayments.length,
        portfolioOpens,
        portfolioReportOpens,
        starsTotal: paidPayments.reduce((sum, payment) => sum + (payment.stars_amount ?? 0), 0),
        tokenChecks: checks.length,
        totalEvents: activity.length,
      },
      user: {
        first_name: user.first_name,
        first_seen_at: user.first_seen_at ?? user.created_at ?? null,
        last_name: user.last_name,
        last_route: user.last_route ?? null,
        last_seen_at: user.last_seen_at ?? null,
        telegram_user_id: user.telegram_user_id,
        username: user.username,
        visit_count: user.visit_count ?? 0,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
