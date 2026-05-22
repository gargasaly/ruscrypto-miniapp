import { isAdminTelegramUser } from "@/lib/checklist/accessPolicy";
import { getConfiguredSupabaseClient } from "@/lib/supabase/checks";
import { validateTelegramInitData } from "@/lib/telegram/validateInitData";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AppUserAnalyticsRow = {
  created_at?: string | null;
  first_name: string | null;
  first_seen_at?: string | null;
  is_admin: boolean | null;
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

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function isAfter(value: string | null | undefined, date: Date) {
  if (!value) {
    return false;
  }

  const time = new Date(value).getTime();
  return Number.isFinite(time) && time >= date.getTime();
}

function dateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : "";
}

function increment(map: Map<string, number>, key: string | null | undefined, amount = 1) {
  const normalized = key?.trim() || "unknown";
  map.set(normalized, (map.get(normalized) ?? 0) + amount);
}

function topFromMap(map: Map<string, number>, limit = 10) {
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([label, count]) => ({ count, label }));
}

function metadataRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export async function GET(request: Request) {
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

  const since30 = daysAgo(30).toISOString();
  const [usersResult, activityResult, checksResult, paymentsResult] = await Promise.all([
    supabase.request<AppUserAnalyticsRow[]>(
      "rest/v1/app_users?select=telegram_user_id,username,first_name,last_name,first_seen_at,last_seen_at,visit_count,last_route,is_admin,created_at&order=last_seen_at.desc.nullslast&limit=10000",
    ),
    supabase.request<ActivityRow[]>(
      `rest/v1/user_activity_log?created_at=gte.${encodeURIComponent(since30)}&select=telegram_user_id,username,event_type,event_target,route,metadata,created_at&order=created_at.desc&limit=5000`,
    ),
    supabase.request<CheckRow[]>(
      "rest/v1/check_history?select=telegram_user_id,symbol,access_type,data_quality,verdict_title,verdict_risk_level,created_at&order=created_at.desc&limit=10000",
    ),
    supabase.request<PaymentRow[]>(
      "rest/v1/payment_events?select=telegram_user_id,status,stars_amount,checks_added,created_at&order=created_at.desc&limit=10000",
    ),
  ]);

  const firstError =
    usersResult.error ?? activityResult.error ?? checksResult.error ?? paymentsResult.error;

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

  const users = usersResult.data ?? [];
  const activity = activityResult.data ?? [];
  const checks = checksResult.data ?? [];
  const payments = paymentsResult.data ?? [];
  const now = new Date();
  const today = startOfToday();
  const since24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const since7 = daysAgo(7);
  const since14 = daysAgo(13);
  const paidPayments = payments.filter((payment) => payment.status === "paid");
  const activity24 = activity.filter((event) => isAfter(event.created_at, since24));
  const checks24 = checks.filter((check) => isAfter(check.created_at, since24));
  const paid24 = paidPayments.filter((payment) => isAfter(payment.created_at, since24));
  const routeMap = new Map<string, number>();
  const guideMap = new Map<string, number>();
  const tokenMap = new Map<string, number>();
  const scoreBuckets = new Map<string, { count: number; sum: number }>();

  for (const event of activity) {
    if (event.event_type === "page_view") {
      increment(routeMap, event.route);
    }

    if (event.event_type === "guide_open") {
      increment(guideMap, event.event_target);
    }

    if (event.event_type === "token_check_result") {
      const metadata = metadataRecord(event.metadata);
      const token =
        typeof metadata.token === "string" ? metadata.token : event.event_target;
      increment(tokenMap, token);

      if (typeof metadata.score === "number" && token) {
        const current = scoreBuckets.get(token) ?? { count: 0, sum: 0 };
        current.count += 1;
        current.sum += metadata.score;
        scoreBuckets.set(token, current);
      }
    }
  }

  for (const check of checks) {
    increment(tokenMap, check.symbol);
  }

  const dayMap = new Map<
    string,
    {
      appOpens: number;
      pageViews: number;
      payments: number;
      portfolioReportViews: number;
      tokenChecks: number;
      uniqueUsers: Set<number>;
    }
  >();

  for (let index = 0; index < 14; index += 1) {
    const date = new Date(since14.getTime() + index * 24 * 60 * 60 * 1000);
    dayMap.set(dateKey(date), {
      appOpens: 0,
      pageViews: 0,
      payments: 0,
      portfolioReportViews: 0,
      tokenChecks: 0,
      uniqueUsers: new Set<number>(),
    });
  }

  for (const event of activity) {
    const key = dateKey(event.created_at);
    const day = dayMap.get(key);

    if (!day) {
      continue;
    }

    if (event.telegram_user_id) {
      day.uniqueUsers.add(event.telegram_user_id);
    }

    if (event.event_type === "app_open") day.appOpens += 1;
    if (event.event_type === "page_view") day.pageViews += 1;
    if (event.event_type === "token_check_result") day.tokenChecks += 1;
    if (event.event_type === "portfolio_report_open") day.portfolioReportViews += 1;
  }

  for (const payment of paidPayments) {
    const key = dateKey(payment.created_at);
    const day = dayMap.get(key);

    if (day) {
      day.payments += 1;
      if (payment.telegram_user_id) {
        day.uniqueUsers.add(payment.telegram_user_id);
      }
    }
  }

  const topTokens = topFromMap(tokenMap).map((item) => {
    const score = scoreBuckets.get(item.label);

    return {
      ...item,
      averageScore: score && score.count > 0 ? Math.round(score.sum / score.count) : null,
    };
  });

  return Response.json(
    {
      activity: {
        appOpens24h: activity24.filter((event) => event.event_type === "app_open").length,
        guideOpens24h: activity24.filter((event) => event.event_type === "guide_open").length,
        pageViews24h: activity24.filter((event) => event.event_type === "page_view").length,
        portfolioReportViews24h: activity24.filter(
          (event) =>
            event.event_type === "portfolio_report_open" ||
            (event.event_type === "page_view" && event.route === "/portfolio/prepared"),
        ).length,
        portfolioViews24h: activity24.filter(
          (event) =>
            event.event_type === "portfolio_open" ||
            (event.event_type === "page_view" && event.route === "/portfolio"),
        ).length,
        tokenChecks24h: activity24.filter((event) => event.event_type === "token_check_result")
          .length,
      },
      checklist: {
        checks24h: checks24.length,
        topTokens,
        totalChecks: checks.length,
      },
      daily: [...dayMap.entries()].map(([date, value]) => ({
        appOpens: value.appOpens,
        date,
        pageViews: value.pageViews,
        payments: value.payments,
        portfolioReportViews: value.portfolioReportViews,
        tokenChecks: value.tokenChecks,
        uniqueUsers: value.uniqueUsers.size,
      })),
      ok: true,
      payments: {
        payments24h: paid24.length,
        starsTotal: paidPayments.reduce((sum, payment) => sum + (payment.stars_amount ?? 0), 0),
        totalPayments: paidPayments.length,
      },
      recentEvents: activity.slice(0, 100).map((event) => ({
        created_at: event.created_at,
        event_target: event.event_target,
        event_type: event.event_type,
        route: event.route,
        telegram_user_id: event.telegram_user_id,
        username: event.username,
      })),
      recentUsers: users.slice(0, 60).map((user) => ({
        first_name: user.first_name,
        first_seen_at: user.first_seen_at ?? user.created_at ?? null,
        is_admin: Boolean(user.is_admin),
        last_name: user.last_name,
        last_route: user.last_route ?? null,
        last_seen_at: user.last_seen_at ?? null,
        telegram_user_id: user.telegram_user_id,
        username: user.username,
        visit_count: user.visit_count ?? 0,
      })),
      topGuides: topFromMap(guideMap),
      topRoutes: topFromMap(routeMap),
      topTokens,
      users: {
        active24h: users.filter((user) => isAfter(user.last_seen_at, since24)).length,
        active30d: users.filter((user) => isAfter(user.last_seen_at, daysAgo(30))).length,
        active7d: users.filter((user) => isAfter(user.last_seen_at, since7)).length,
        newToday: users.filter((user) => isAfter(user.first_seen_at ?? user.created_at, today))
          .length,
        total: users.length,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
