"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { getTelegramInitData, watchTelegramInitData } from "@/lib/telegram/webapp";

type RangeId = "1d" | "7d" | "30d" | "all";
type TabId = "overview" | "users" | "funnel" | "retention" | "tops" | "errors";

type TopItem = {
  averageScore?: number | null;
  count: number;
  label: string;
  uniqueUsers: number;
};

type AnalyticsResponse = {
  activity: {
    appOpens: number;
    guideOpens: number;
    pageViews: number;
    portfolioReportViews: number;
    portfolioViews: number;
    tokenChecks: number;
  };
  checklist: {
    checks: number;
    topTokens: TopItem[];
    totalChecks: number;
  };
  daily: Array<{
    appOpens: number;
    date: string;
    pageViews: number;
    payments: number;
    portfolioReportViews: number;
    tokenChecks: number;
    uniqueUsers: number;
  }>;
  errors: {
    recent: Array<{
      created_at: string;
      event_target: string | null;
      message: string | null;
      route: string | null;
      telegram_user_id: number | null;
      username: string | null;
    }>;
    total: number;
  };
  funnel: Array<{
    conversionFromPrevious: number;
    conversionFromStart: number;
    events: number;
    label: string;
    step: string;
    uniqueUsers: number;
  }>;
  ok: boolean;
  payments: {
    payments: number;
    stars: number;
    totalPayments: number;
  };
  range: RangeId;
  recentEvents: Array<{
    created_at: string;
    event_target: string | null;
    event_type: string;
    message: string | null;
    route: string | null;
    telegram_user_id: number | null;
    username: string | null;
  }>;
  recentUsers: Array<{
    eventCount: number;
    first_name: string | null;
    first_seen_at: string | null;
    is_admin: boolean;
    last_name: string | null;
    last_route: string | null;
    last_seen_at: string | null;
    openedPortfolio: boolean;
    payments: number;
    portfolioReportOpens: number;
    telegram_user_id: number;
    tokenChecks: number;
    username: string | null;
    visit_count: number;
  }>;
  retention: {
    newUsers: number;
    powerUserRate: number;
    powerUsers: number;
    repeatRate: number;
    repeatUsers: number;
    returned30d: number;
    returned7d: number;
    returnedNextDay: number;
  };
  topExternalClicks: TopItem[];
  topGuides: TopItem[];
  topRoutes: TopItem[];
  topTokens: TopItem[];
  users: {
    activeRange: number;
    newInRange: number;
    total: number;
  };
};

type UserDetails = {
  checkedTokens: Array<{ count: number; label: string }>;
  ok: boolean;
  openedGuides: Array<{ count: number; label: string }>;
  recentEvents: Array<{
    created_at: string;
    event_target: string | null;
    event_type: string;
    message: string | null;
    route: string | null;
    score: number | null;
  }>;
  stats: {
    guideOpens: number;
    payments: number;
    portfolioOpens: number;
    portfolioReportOpens: number;
    starsTotal: number;
    tokenChecks: number;
    totalEvents: number;
  };
  user: {
    first_name: string | null;
    first_seen_at: string | null;
    last_name: string | null;
    last_route: string | null;
    last_seen_at: string | null;
    telegram_user_id: number;
    username: string | null;
    visit_count: number;
  };
};

const ranges: Array<{ id: RangeId; label: string }> = [
  { id: "1d", label: "Сегодня" },
  { id: "7d", label: "7 дней" },
  { id: "30d", label: "30 дней" },
  { id: "all", label: "Всё время" },
];

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "overview", label: "Обзор" },
  { id: "users", label: "Пользователи" },
  { id: "funnel", label: "Воронка" },
  { id: "retention", label: "Retention" },
  { id: "tops", label: "Топы" },
  { id: "errors", label: "Ошибки" },
];

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function shortLabel(value: string | null) {
  if (!value) {
    return "—";
  }

  try {
    const url = new URL(value);
    const label = `${url.hostname}${url.pathname}`;
    return label.length > 42 ? `${label.slice(0, 39)}...` : label;
  } catch {
    return value.length > 42 ? `${value.slice(0, 39)}...` : value;
  }
}

function displayUser(user: {
  first_name?: string | null;
  telegram_user_id?: number | null;
  username?: string | null;
}) {
  if (user.username) {
    return `@${user.username}`;
  }

  return user.first_name ?? (user.telegram_user_id ? `ID ${user.telegram_user_id}` : "anonymous");
}

function MetricCard({
  hint,
  label,
  value,
}: {
  hint?: string;
  label: string;
  value: number | string;
}) {
  return (
    <article className="mini-card p-3">
      <p className="text-xs font-bold uppercase text-emerald-200/70">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs leading-5 text-zinc-500">{hint}</p> : null}
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="app-card p-4 text-sm leading-6 text-zinc-400">{text}</div>;
}

function TopList({ empty, items }: { empty: string; items: TopItem[] }) {
  if (items.length === 0) {
    return <EmptyState text={empty} />;
  }

  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <article className="mini-card flex min-w-0 items-center justify-between gap-3 p-3" key={item.label}>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-white">{shortLabel(item.label)}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {item.uniqueUsers} users
              {typeof item.averageScore === "number" ? ` · avg ${item.averageScore}` : ""}
            </p>
          </div>
          <p className="text-lg font-black text-emerald-200">{item.count}</p>
        </article>
      ))}
    </div>
  );
}

function EventCard({
  event,
}: {
  event: {
    created_at: string;
    event_target: string | null;
    event_type: string;
    message?: string | null;
    route: string | null;
    telegram_user_id?: number | null;
    username?: string | null;
  };
}) {
  return (
    <article className="mini-card min-w-0 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-black text-white">{event.event_type}</p>
          <p className="mt-1 truncate text-sm text-zinc-400">
            {event.event_target ?? event.route ?? "—"}
          </p>
        </div>
        <span className="shrink-0 text-xs text-zinc-500">{formatDate(event.created_at)}</span>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        {displayUser(event)}
        {event.message ? ` · ${event.message}` : ""}
      </p>
    </article>
  );
}

export function AdminAnalyticsScreen() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [detailsByUser, setDetailsByUser] = useState<Record<number, UserDetails | undefined>>({});
  const [detailsLoading, setDetailsLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initData, setInitData] = useState("");
  const [loading, setLoading] = useState(true);
  const [openUserId, setOpenUserId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<RangeId>("7d");
  const [tab, setTab] = useState<TabId>("overview");

  async function loadAnalytics(nextInitData = initData, nextRange = range) {
    setLoading(true);
    setError(null);

    try {
      const headers: HeadersInit = nextInitData
        ? { "x-telegram-init-data": nextInitData }
        : {};
      const response = await fetch(`/api/admin/analytics?range=${nextRange}`, {
        cache: "no-store",
        headers,
      });
      const payload = (await response.json()) as AnalyticsResponse & {
        reason?: string;
      };

      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.reason ?? "admin-only");
      }

      setData(payload);
    } catch (caught) {
      setData(null);
      setError(caught instanceof Error ? caught.message : "analytics-load-failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadUserDetails(telegramUserId: number) {
    if (detailsByUser[telegramUserId] || !initData) {
      return;
    }

    setDetailsLoading(telegramUserId);

    try {
      const response = await fetch(
        `/api/admin/analytics/user?telegram_user_id=${telegramUserId}`,
        {
          cache: "no-store",
          headers: {
            "x-telegram-init-data": initData,
          },
        },
      );
      const payload = (await response.json()) as UserDetails & { reason?: string };

      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.reason ?? "user-load-failed");
      }

      setDetailsByUser((previous) => ({
        ...previous,
        [telegramUserId]: payload,
      }));
    } finally {
      setDetailsLoading(null);
    }
  }

  useEffect(() => {
    const currentInitData = getTelegramInitData();

    if (currentInitData) {
      setInitData(currentInitData);
      void loadAnalytics(currentInitData, range);
      return;
    }

    const stopWatching = watchTelegramInitData((value) => {
      setInitData(value);
      void loadAnalytics(value, range);
    });
    const fallbackTimer = window.setTimeout(() => {
      void loadAnalytics("", range);
    }, 2200);

    return () => {
      stopWatching();
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  useEffect(() => {
    if (!initData) {
      return;
    }

    void loadAnalytics(initData, range);
  }, [range]);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!data) {
      return [];
    }

    if (!normalized) {
      return data.recentUsers;
    }

    return data.recentUsers.filter((user) => {
      return (
        String(user.telegram_user_id).includes(normalized) ||
        user.username?.toLowerCase().includes(normalized) ||
        user.first_name?.toLowerCase().includes(normalized)
      );
    });
  }, [data, query]);

  return (
    <div className="space-y-5">
      <header className="premium-card p-5">
        <div className="relative z-10">
          <StatusBadge tone="green">Admin</StatusBadge>
          <h1 className="mt-4 text-3xl font-black leading-tight text-white">
            Admin Analytics
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Mini App usage: пользователи, события, чеклист, портфель и Stars.
          </p>
        </div>
      </header>

      <section className="glass-card grid grid-cols-2 gap-1 p-1">
        {ranges.map((item) => (
          <button
            className={`rounded-[16px] px-3 py-3 text-xs font-black transition ${
              range === item.id
                ? "bg-emerald-300 text-[#041412]"
                : "bg-white/[0.035] text-zinc-300"
            }`}
            key={item.id}
            onClick={() => setRange(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </section>

      {loading ? (
        <section className="app-card p-5 text-sm font-semibold text-emerald-100">
          Загружаем аналитику…
        </section>
      ) : null}

      {error ? (
        <section className="app-card p-5">
          <h2 className="text-xl font-black text-white">Доступ закрыт</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Экран доступен только admin через Telegram Mini App.
          </p>
          <p className="mt-2 text-xs text-zinc-500">{error}</p>
          <button className="primary-button mt-4 w-full" onClick={() => loadAnalytics(getTelegramInitData(), range)} type="button">
            Обновить
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <section className="grid grid-cols-2 gap-3">
            <MetricCard label="Всего users" value={data.users.total} />
            <MetricCard label="Активны в период" value={data.users.activeRange} />
            <MetricCard label="Новые в период" value={data.users.newInRange} />
            <MetricCard label="Открытий" value={data.activity.appOpens} />
            <MetricCard label="Просмотров" value={data.activity.pageViews} />
            <MetricCard label="Проверок" value={data.checklist.checks} />
            <MetricCard label="Отчёт портфеля" value={data.activity.portfolioReportViews} />
            <MetricCard label="Оплат Stars" value={data.payments.payments} />
          </section>

          <nav className="glass-card flex gap-1 overflow-x-auto p-1">
            {tabs.map((item) => (
              <button
                className={`min-w-fit rounded-[16px] px-3 py-3 text-xs font-black transition ${
                  tab === item.id
                    ? "bg-emerald-300 text-[#041412]"
                    : "bg-white/[0.035] text-zinc-300"
                }`}
                key={item.id}
                onClick={() => setTab(item.id)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </nav>

          {tab === "overview" ? (
            <section className="space-y-3">
              <div className="app-card p-4">
                <h2 className="text-lg font-black text-white">Динамика</h2>
                <div className="mt-3 grid gap-2">
                  {data.daily.map((day) => (
                    <article className="mini-card p-3" key={day.date}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-black text-white">{formatShortDate(day.date)}</p>
                        <p className="text-sm font-bold text-emerald-200">
                          {day.uniqueUsers} users
                        </p>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-zinc-400">
                        opens {day.appOpens} · views {day.pageViews} · checks {day.tokenChecks} · portfolio {day.portfolioReportViews} · payments {day.payments}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
              <div className="app-card p-4">
                <h2 className="text-lg font-black text-white">Последние события</h2>
                <div className="mt-3 grid gap-2">
                  {data.recentEvents.slice(0, 8).map((event) => (
                    <EventCard event={event} key={`${event.created_at}-${event.event_type}-${event.event_target}`} />
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {tab === "users" ? (
            <section className="space-y-3">
              <input
                className="search-input"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Поиск username или Telegram ID"
                value={query}
              />
              {filteredUsers.map((user) => {
                const details = detailsByUser[user.telegram_user_id];
                const open = openUserId === user.telegram_user_id;

                return (
                  <article className="app-card p-4" key={user.telegram_user_id}>
                    <button
                      className="flex w-full items-start justify-between gap-3 text-left"
                      onClick={() => {
                        const nextOpen = open ? null : user.telegram_user_id;
                        setOpenUserId(nextOpen);
                        if (nextOpen) {
                          void loadUserDetails(nextOpen);
                        }
                      }}
                      type="button"
                    >
                      <div className="min-w-0">
                        <h2 className="text-lg font-black text-white">{displayUser(user)}</h2>
                        <p className="mt-1 text-xs text-zinc-500">
                          ID {user.telegram_user_id} · visits {user.visit_count}
                        </p>
                        <p className="mt-1 truncate text-xs text-zinc-500">
                          route: {user.last_route ?? "—"}
                        </p>
                      </div>
                      <span className="chevron-soft">{open ? "⌃" : "›"}</span>
                    </button>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <MetricCard label="События" value={user.eventCount} />
                      <MetricCard label="Проверки" value={user.tokenChecks} />
                      <MetricCard label="Оплаты" value={user.payments} />
                      <MetricCard label="Отчёт" value={user.portfolioReportOpens} />
                    </div>
                    {open ? (
                      <div className="mt-4 grid gap-3">
                        {detailsLoading === user.telegram_user_id ? (
                          <EmptyState text="Загружаем карточку пользователя…" />
                        ) : null}
                        {details ? (
                          <>
                            <div className="grid gap-2 text-sm text-zinc-300">
                              <div className="mini-card p-3">Первый вход: {formatDate(details.user.first_seen_at)}</div>
                              <div className="mini-card p-3">Последний вход: {formatDate(details.user.last_seen_at)}</div>
                              <div className="mini-card p-3">Имя: {[details.user.first_name, details.user.last_name].filter(Boolean).join(" ") || "—"}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <MetricCard label="Events" value={details.stats.totalEvents} />
                              <MetricCard label="Guides" value={details.stats.guideOpens} />
                              <MetricCard label="Portfolio" value={details.stats.portfolioOpens} />
                              <MetricCard label="Stars" value={details.stats.starsTotal} />
                            </div>
                            <div className="mini-card p-3">
                              <p className="text-xs font-black uppercase text-emerald-200/75">Токены</p>
                              <p className="mt-2 text-sm leading-6 text-zinc-300">
                                {details.checkedTokens.length
                                  ? details.checkedTokens.map((item) => `${item.label} ×${item.count}`).join(", ")
                                  : "Нет проверок токенов."}
                              </p>
                            </div>
                            <div className="mini-card p-3">
                              <p className="text-xs font-black uppercase text-emerald-200/75">Гайды</p>
                              <p className="mt-2 text-sm leading-6 text-zinc-300">
                                {details.openedGuides.length
                                  ? details.openedGuides.map((item) => `${shortLabel(item.label)} ×${item.count}`).join(", ")
                                  : "Нет открытых гайдов."}
                              </p>
                            </div>
                            <div className="grid gap-2">
                              {details.recentEvents.map((event) => (
                                <EventCard event={event} key={`${event.created_at}-${event.event_type}-${event.event_target}`} />
                              ))}
                            </div>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
              {filteredUsers.length === 0 ? <EmptyState text="Пользователи не найдены." /> : null}
            </section>
          ) : null}

          {tab === "funnel" ? (
            <section className="grid gap-3">
              {data.funnel.map((step, index) => (
                <article className="app-card p-4" key={step.step}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase text-emerald-200/75">
                        Шаг {index + 1}
                      </p>
                      <h2 className="mt-1 text-lg font-black text-white">{step.label}</h2>
                    </div>
                    <p className="text-2xl font-black text-emerald-100">{step.uniqueUsers}</p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-300 to-emerald-300"
                      style={{ width: `${Math.min(step.conversionFromStart, 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-zinc-400">
                    events {step.events} · от старта {step.conversionFromStart}% · от прошлого {step.conversionFromPrevious}%
                  </p>
                </article>
              ))}
            </section>
          ) : null}

          {tab === "retention" ? (
            <section className="grid grid-cols-2 gap-3">
              <MetricCard label="Новые users" value={data.retention.newUsers} />
              <MetricCard label="На след. день" value={data.retention.returnedNextDay} />
              <MetricCard label="Вернулись 7д" value={data.retention.returned7d} />
              <MetricCard label="Вернулись 30д" value={data.retention.returned30d} />
              <MetricCard
                hint="Открывали Mini App больше одного раза"
                label="Repeat rate"
                value={`${data.retention.repeatRate}%`}
              />
              <MetricCard
                hint="visit_count >= 5"
                label="Power users"
                value={`${data.retention.powerUserRate}%`}
              />
            </section>
          ) : null}

          {tab === "tops" ? (
            <section className="space-y-3">
              <div className="app-card p-4">
                <h2 className="text-lg font-black text-white">Топ токенов</h2>
                <div className="mt-3">
                  <TopList empty="Проверок токенов за период нет." items={data.topTokens} />
                </div>
              </div>
              <div className="app-card p-4">
                <h2 className="text-lg font-black text-white">Топ гайдов</h2>
                <div className="mt-3">
                  <TopList empty="Открытий гайдов за период нет." items={data.topGuides} />
                </div>
              </div>
              <div className="app-card p-4">
                <h2 className="text-lg font-black text-white">Топ страниц</h2>
                <div className="mt-3">
                  <TopList empty="Просмотров страниц за период нет." items={data.topRoutes} />
                </div>
              </div>
              <div className="app-card p-4">
                <h2 className="text-lg font-black text-white">Внешние клики</h2>
                <div className="mt-3">
                  <TopList empty="Внешних кликов за период нет." items={data.topExternalClicks} />
                </div>
              </div>
            </section>
          ) : null}

          {tab === "errors" ? (
            <section className="space-y-3">
              <MetricCard label="Ошибок за период" value={data.errors.total} />
              {data.errors.recent.length ? (
                <div className="grid gap-2">
                  {data.errors.recent.map((event) => (
                    <article className="mini-card p-3" key={`${event.created_at}-${event.event_target}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-black text-white">{event.message ?? "error"}</p>
                          <p className="mt-1 truncate text-sm text-zinc-400">
                            {event.event_target ?? event.route ?? "—"}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-zinc-500">{formatDate(event.created_at)}</span>
                      </div>
                      <p className="mt-2 text-xs text-zinc-500">{displayUser(event)}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState text="Ошибок за период не найдено." />
              )}
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
