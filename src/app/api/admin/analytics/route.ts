import { isAdminTelegramUser } from "@/lib/checklist/accessPolicy";
import { getConfiguredSupabaseClient } from "@/lib/supabase/checks";
import { validateTelegramInitData } from "@/lib/telegram/validateInitData";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RangeId = "1d" | "7d" | "30d" | "all";

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

type UserStats = {
  eventCount: number;
  guideOpens: number;
  openedPortfolio: boolean;
  payments: number;
  portfolioOpens: number;
  portfolioReportOpens: number;
  tokenChecks: number;
};

const funnelSteps = [
  { label: "Открыл Mini App", step: "app_open" },
  { label: "Открыл гайды", step: "guides_open" },
  { label: "Открыл чеклист", step: "checklist_open" },
  { label: "Проверил токен", step: "token_check_result" },
  { label: "Открыл портфель", step: "portfolio_open" },
  { label: "Открыл отчёт", step: "portfolio_report_open" },
  { label: "Начал оплату", step: "payment_started" },
  { label: "Успешная оплата", step: "payment_success" },
] as const;

function readAdminInitData(request: Request) {
  const url = new URL(request.url);

  return (
    request.headers.get("x-telegram-init-data") ??
    url.searchParams.get("initData") ??
    ""
  );
}

function parseRange(value: string | null): RangeId {
  return value === "1d" || value === "7d" || value === "30d" || value === "all"
    ? value
    : "7d";
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function rangeStart(range: RangeId) {
  if (range === "1d") {
    return startOfToday();
  }

  if (range === "7d") {
    return daysAgo(7);
  }

  if (range === "30d") {
    return daysAgo(30);
  }

  return null;
}

function restEncode(value: string | number) {
  return encodeURIComponent(String(value));
}

function isAfter(value: string | null | undefined, date: Date | null) {
  if (!date) {
    return true;
  }

  if (!value) {
    return false;
  }

  const time = new Date(value).getTime();
  return Number.isFinite(time) && time >= date.getTime();
}

function routePath(route: string | null | undefined) {
  return (route ?? "").split("?")[0].replace(/\/+$/, "") || "/";
}

function dateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : "";
}

function userKey(userId: number | null | undefined) {
  return userId ? String(userId) : "anonymous";
}

function metadataRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function metadataMessage(value: unknown) {
  const metadata = metadataRecord(value);
  const message = metadata.message;

  return typeof message === "string" ? message.slice(0, 240) : null;
}

function increment(
  map: Map<string, { count: number; users: Set<string> }>,
  label: string | null | undefined,
  telegramUserId?: number | null,
) {
  const normalized = label?.trim() || "unknown";
  const current = map.get(normalized) ?? { count: 0, users: new Set<string>() };
  current.count += 1;
  current.users.add(userKey(telegramUserId));
  map.set(normalized, current);
}

function topFromMap(map: Map<string, { count: number; users: Set<string> }>, limit = 10) {
  return [...map.entries()]
    .sort((left, right) => right[1].count - left[1].count)
    .slice(0, limit)
    .map(([label, value]) => ({
      count: value.count,
      label,
      uniqueUsers: [...value.users].filter((id) => id !== "anonymous").length,
    }));
}

function percent(part: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((part / total) * 1000) / 10;
}

function isGuidesEvent(event: ActivityRow) {
  return event.event_type === "guide_open" || routePath(event.route) === "/guides";
}

function isChecklistEvent(event: ActivityRow) {
  return (
    event.event_type === "token_check_open" ||
    routePath(event.route) === "/token-checklist"
  );
}

function isPortfolioEvent(event: ActivityRow) {
  return event.event_type === "portfolio_open" || routePath(event.route) === "/portfolio";
}

function isPortfolioReportEvent(event: ActivityRow) {
  return (
    event.event_type === "portfolio_report_open" ||
    routePath(event.route) === "/portfolio/prepared"
  );
}

function eventMatchesFunnelStep(event: ActivityRow, step: string) {
  if (step === "guides_open") {
    return isGuidesEvent(event);
  }

  if (step === "checklist_open") {
    return isChecklistEvent(event);
  }

  if (step === "portfolio_open") {
    return isPortfolioEvent(event);
  }

  if (step === "portfolio_report_open") {
    return isPortfolioReportEvent(event);
  }

  return event.event_type === step;
}

function scoreFromEvent(event: ActivityRow) {
  const score = metadataRecord(event.metadata).score;

  return typeof score === "number" && Number.isFinite(score) ? score : null;
}

function tokenFromEvent(event: ActivityRow) {
  const token = metadataRecord(event.metadata).token;

  return typeof token === "string" && token.trim()
    ? token.trim().toUpperCase()
    : event.event_target?.trim().toUpperCase() ?? null;
}

function buildDaily(
  activity: ActivityRow[],
  paidPayments: PaymentRow[],
  range: RangeId,
) {
  const today = startOfToday();
  const dayCount = range === "1d" ? 1 : range === "7d" ? 7 : 14;
  const start = new Date(today.getTime() - (dayCount - 1) * 24 * 60 * 60 * 1000);
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

  for (let index = 0; index < dayCount; index += 1) {
    const date = new Date(start.getTime() + index * 24 * 60 * 60 * 1000);
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
    const day = dayMap.get(dateKey(event.created_at));

    if (!day) {
      continue;
    }

    if (event.telegram_user_id) {
      day.uniqueUsers.add(event.telegram_user_id);
    }

    if (event.event_type === "app_open") day.appOpens += 1;
    if (event.event_type === "page_view") day.pageViews += 1;
    if (event.event_type === "token_check_result") day.tokenChecks += 1;
    if (isPortfolioReportEvent(event)) day.portfolioReportViews += 1;
  }

  for (const payment of paidPayments) {
    const day = dayMap.get(dateKey(payment.created_at));

    if (!day) {
      continue;
    }

    day.payments += 1;
    if (payment.telegram_user_id) {
      day.uniqueUsers.add(payment.telegram_user_id);
    }
  }

  return [...dayMap.entries()].map(([date, value]) => ({
    appOpens: value.appOpens,
    date,
    pageViews: value.pageViews,
    payments: value.payments,
    portfolioReportViews: value.portfolioReportViews,
    tokenChecks: value.tokenChecks,
    uniqueUsers: value.uniqueUsers.size,
  }));
}

function buildUserStats(
  activity: ActivityRow[],
  checks: CheckRow[],
  payments: PaymentRow[],
) {
  const map = new Map<number, UserStats>();

  function ensure(id: number | null | undefined) {
    if (!id) {
      return null;
    }

    const current =
      map.get(id) ??
      {
        eventCount: 0,
        guideOpens: 0,
        openedPortfolio: false,
        payments: 0,
        portfolioOpens: 0,
        portfolioReportOpens: 0,
        tokenChecks: 0,
      };
    map.set(id, current);
    return current;
  }

  for (const event of activity) {
    const stats = ensure(event.telegram_user_id);

    if (!stats) {
      continue;
    }

    stats.eventCount += 1;
    if (event.event_type === "guide_open") stats.guideOpens += 1;
    if (isPortfolioEvent(event)) {
      stats.openedPortfolio = true;
      stats.portfolioOpens += 1;
    }
    if (isPortfolioReportEvent(event)) stats.portfolioReportOpens += 1;
  }

  for (const check of checks) {
    const stats = ensure(check.telegram_user_id);
    if (stats) stats.tokenChecks += 1;
  }

  for (const payment of payments.filter((item) => item.status === "paid")) {
    const stats = ensure(payment.telegram_user_id);
    if (stats) stats.payments += 1;
  }

  return map;
}

function buildFunnel(activity: ActivityRow[]) {
  let previousUnique = 0;
  let startUnique = 0;

  return funnelSteps.map((item, index) => {
    const events = activity.filter((event) => eventMatchesFunnelStep(event, item.step));
    const users = new Set(
      events
        .map((event) => event.telegram_user_id)
        .filter((id): id is number => typeof id === "number"),
    );
    const uniqueUsers = users.size;

    if (index === 0) {
      startUnique = uniqueUsers;
      previousUnique = uniqueUsers;
    }

    const row = {
      conversionFromPrevious: index === 0 ? 100 : percent(uniqueUsers, previousUnique),
      conversionFromStart: index === 0 ? 100 : percent(uniqueUsers, startUnique),
      events: events.length,
      label: item.label,
      step: item.step,
      uniqueUsers,
    };

    previousUnique = uniqueUsers;
    return row;
  });
}

function buildRetention(
  users: AppUserAnalyticsRow[],
  activity: ActivityRow[],
  rangeStartDate: Date | null,
) {
  const cohort = users.filter((user) =>
    isAfter(user.first_seen_at ?? user.created_at, rangeStartDate),
  );
  const eventsByUser = new Map<number, ActivityRow[]>();

  for (const event of activity) {
    if (!event.telegram_user_id) {
      continue;
    }

    const events = eventsByUser.get(event.telegram_user_id) ?? [];
    events.push(event);
    eventsByUser.set(event.telegram_user_id, events);
  }

  function returnedInWindow(user: AppUserAnalyticsRow, minDays: number, maxDays: number) {
    const firstSeen = new Date(user.first_seen_at ?? user.created_at ?? "").getTime();

    if (!Number.isFinite(firstSeen)) {
      return false;
    }

    const min = firstSeen + minDays * 24 * 60 * 60 * 1000;
    const max = firstSeen + maxDays * 24 * 60 * 60 * 1000;

    return (eventsByUser.get(user.telegram_user_id) ?? []).some((event) => {
      const time = new Date(event.created_at).getTime();
      return Number.isFinite(time) && time >= min && time <= max;
    });
  }

  const repeatUsers = cohort.filter((user) => (user.visit_count ?? 0) >= 2).length;
  const powerUsers = cohort.filter((user) => (user.visit_count ?? 0) >= 5).length;

  return {
    newUsers: cohort.length,
    powerUserRate: percent(powerUsers, cohort.length),
    powerUsers,
    repeatRate: percent(repeatUsers, cohort.length),
    repeatUsers,
    returned30d: cohort.filter((user) => returnedInWindow(user, 1, 30)).length,
    returned7d: cohort.filter((user) => returnedInWindow(user, 1, 7)).length,
    returnedNextDay: cohort.filter((user) => returnedInWindow(user, 1, 2)).length,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const range = parseRange(url.searchParams.get("range"));
  const selectedRangeStart = rangeStart(range);
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

  const filter = selectedRangeStart
    ? `created_at=gte.${restEncode(selectedRangeStart.toISOString())}&`
    : "";
  const [usersResult, activityResult, checksResult, paymentsResult] = await Promise.all([
    supabase.request<AppUserAnalyticsRow[]>(
      "rest/v1/app_users?select=telegram_user_id,username,first_name,last_name,first_seen_at,last_seen_at,visit_count,last_route,is_admin,created_at&order=last_seen_at.desc.nullslast&limit=10000",
    ),
    supabase.request<ActivityRow[]>(
      `rest/v1/user_activity_log?${filter}select=telegram_user_id,username,event_type,event_target,route,metadata,created_at&order=created_at.desc&limit=20000`,
    ),
    supabase.request<CheckRow[]>(
      `rest/v1/check_history?${filter}select=telegram_user_id,symbol,access_type,data_quality,verdict_title,verdict_risk_level,created_at&order=created_at.desc&limit=20000`,
    ),
    supabase.request<PaymentRow[]>(
      `rest/v1/payment_events?${filter}select=telegram_user_id,status,stars_amount,checks_added,created_at&order=created_at.desc&limit=20000`,
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

  const allUsers = usersResult.data ?? [];
  const activity = activityResult.data ?? [];
  const checks = checksResult.data ?? [];
  const payments = paymentsResult.data ?? [];
  const paidPayments = payments.filter((payment) => payment.status === "paid");
  const now = new Date();
  const today = startOfToday();
  const since24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const since7 = daysAgo(7);
  const routeMap = new Map<string, { count: number; users: Set<string> }>();
  const guideMap = new Map<string, { count: number; users: Set<string> }>();
  const externalMap = new Map<string, { count: number; users: Set<string> }>();
  const tokenMap = new Map<string, { count: number; users: Set<string> }>();
  const scoreBuckets = new Map<string, { count: number; sum: number }>();

  for (const event of activity) {
    if (event.event_type === "page_view") {
      increment(routeMap, routePath(event.route), event.telegram_user_id);
    }

    if (event.event_type === "guide_open") {
      increment(guideMap, event.event_target, event.telegram_user_id);
    }

    if (
      event.event_type === "external_link_click" ||
      event.event_type === "support_channel_click" ||
      event.event_type === "virtual_card_bot_click"
    ) {
      increment(externalMap, event.event_target, event.telegram_user_id);
    }

    if (event.event_type === "token_check_result") {
      const token = tokenFromEvent(event);
      increment(tokenMap, token, event.telegram_user_id);
      const score = scoreFromEvent(event);

      if (token && score !== null) {
        const current = scoreBuckets.get(token) ?? { count: 0, sum: 0 };
        current.count += 1;
        current.sum += score;
        scoreBuckets.set(token, current);
      }
    }
  }

  for (const check of checks) {
    increment(tokenMap, check.symbol?.toUpperCase(), check.telegram_user_id);
  }

  const topTokens = topFromMap(tokenMap).map((item) => {
    const score = scoreBuckets.get(item.label);

    return {
      ...item,
      averageScore: score && score.count > 0 ? Math.round(score.sum / score.count) : null,
    };
  });
  const userStats = buildUserStats(activity, checks, payments);
  const errors = activity.filter((event) => event.event_type === "error");

  return Response.json(
    {
      activity: {
        appOpens: activity.filter((event) => event.event_type === "app_open").length,
        appOpens24h: activity.filter(
          (event) => event.event_type === "app_open" && isAfter(event.created_at, since24),
        ).length,
        guideOpens: activity.filter((event) => event.event_type === "guide_open").length,
        guideOpens24h: activity.filter(
          (event) => event.event_type === "guide_open" && isAfter(event.created_at, since24),
        ).length,
        pageViews: activity.filter((event) => event.event_type === "page_view").length,
        pageViews24h: activity.filter(
          (event) => event.event_type === "page_view" && isAfter(event.created_at, since24),
        ).length,
        portfolioReportViews: activity.filter(isPortfolioReportEvent).length,
        portfolioReportViews24h: activity.filter(
          (event) => isPortfolioReportEvent(event) && isAfter(event.created_at, since24),
        ).length,
        portfolioViews: activity.filter(isPortfolioEvent).length,
        portfolioViews24h: activity.filter(
          (event) => isPortfolioEvent(event) && isAfter(event.created_at, since24),
        ).length,
        tokenChecks: activity.filter((event) => event.event_type === "token_check_result").length,
        tokenChecks24h: activity.filter(
          (event) =>
            event.event_type === "token_check_result" && isAfter(event.created_at, since24),
        ).length,
      },
      checklist: {
        checks: checks.length,
        checks24h: checks.filter((check) => isAfter(check.created_at, since24)).length,
        topTokens,
        totalChecks: checks.length,
      },
      daily: buildDaily(activity, paidPayments, range),
      errors: {
        recent: errors.slice(0, 80).map((event) => ({
          created_at: event.created_at,
          event_target: event.event_target,
          message: metadataMessage(event.metadata),
          route: event.route,
          telegram_user_id: event.telegram_user_id,
          username: event.username,
        })),
        total: errors.length,
      },
      funnel: buildFunnel(activity),
      ok: true,
      payments: {
        payments: paidPayments.length,
        payments24h: paidPayments.filter((payment) => isAfter(payment.created_at, since24))
          .length,
        stars: paidPayments.reduce((sum, payment) => sum + (payment.stars_amount ?? 0), 0),
        starsTotal: paidPayments.reduce((sum, payment) => sum + (payment.stars_amount ?? 0), 0),
        totalPayments: paidPayments.length,
      },
      range,
      recentEvents: activity.slice(0, 150).map((event) => ({
        created_at: event.created_at,
        event_target: event.event_target,
        event_type: event.event_type,
        message: event.event_type === "error" ? metadataMessage(event.metadata) : null,
        route: event.route,
        telegram_user_id: event.telegram_user_id,
        username: event.username,
      })),
      recentUsers: allUsers.slice(0, 100).map((user) => {
        const stats = userStats.get(user.telegram_user_id);

        return {
          eventCount: stats?.eventCount ?? 0,
          first_name: user.first_name,
          first_seen_at: user.first_seen_at ?? user.created_at ?? null,
          is_admin: Boolean(user.is_admin),
          last_name: user.last_name,
          last_route: user.last_route ?? null,
          last_seen_at: user.last_seen_at ?? null,
          openedPortfolio: stats?.openedPortfolio ?? false,
          payments: stats?.payments ?? 0,
          portfolioReportOpens: stats?.portfolioReportOpens ?? 0,
          telegram_user_id: user.telegram_user_id,
          tokenChecks: stats?.tokenChecks ?? 0,
          username: user.username,
          visit_count: user.visit_count ?? 0,
        };
      }),
      retention: buildRetention(allUsers, activity, selectedRangeStart),
      topExternalClicks: topFromMap(externalMap),
      topGuides: topFromMap(guideMap),
      topRoutes: topFromMap(routeMap),
      topTokens,
      users: {
        active24h: allUsers.filter((user) => isAfter(user.last_seen_at, since24)).length,
        active30d: allUsers.filter((user) => isAfter(user.last_seen_at, daysAgo(30))).length,
        active7d: allUsers.filter((user) => isAfter(user.last_seen_at, since7)).length,
        activeRange:
          selectedRangeStart === null
            ? allUsers.length
            : allUsers.filter((user) => isAfter(user.last_seen_at, selectedRangeStart)).length,
        newInRange: allUsers.filter((user) =>
          isAfter(user.first_seen_at ?? user.created_at, selectedRangeStart),
        ).length,
        newToday: allUsers.filter((user) => isAfter(user.first_seen_at ?? user.created_at, today))
          .length,
        total: allUsers.length,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
