"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { getTelegramInitData, watchTelegramInitData } from "@/lib/telegram/webapp";

type AnalyticsResponse = {
  activity: {
    appOpens24h: number;
    guideOpens24h: number;
    pageViews24h: number;
    portfolioReportViews24h: number;
    portfolioViews24h: number;
    tokenChecks24h: number;
  };
  checklist: {
    checks24h: number;
    topTokens: Array<{
      averageScore: number | null;
      count: number;
      label: string;
    }>;
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
  ok: boolean;
  payments: {
    payments24h: number;
    starsTotal: number;
    totalPayments: number;
  };
  recentEvents: Array<{
    created_at: string;
    event_target: string | null;
    event_type: string;
    route: string | null;
    telegram_user_id: number | null;
    username: string | null;
  }>;
  recentUsers: Array<{
    first_name: string | null;
    first_seen_at: string | null;
    is_admin: boolean;
    last_name: string | null;
    last_route: string | null;
    last_seen_at: string | null;
    telegram_user_id: number;
    username: string | null;
    visit_count: number;
  }>;
  topGuides: Array<{ count: number; label: string }>;
  topRoutes: Array<{ count: number; label: string }>;
  topTokens: Array<{ averageScore: number | null; count: number; label: string }>;
  users: {
    active24h: number;
    active30d: number;
    active7d: number;
    newToday: number;
    total: number;
  };
};

type TabId = "overview" | "users" | "events" | "tokens";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "overview", label: "Обзор" },
  { id: "users", label: "Пользователи" },
  { id: "events", label: "События" },
  { id: "tokens", label: "Токены" },
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

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <article className="mini-card p-3">
      <p className="text-xs font-bold uppercase text-emerald-200/70">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="app-card p-4 text-sm leading-6 text-zinc-400">
      {text}
    </div>
  );
}

export function AdminAnalyticsScreen() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TabId>("overview");

  async function loadAnalytics(initData?: string) {
    setLoading(true);
    setError(null);

    try {
      const headers: HeadersInit = initData
        ? { "x-telegram-init-data": initData }
        : {};
      const response = await fetch("/api/admin/analytics", {
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

  useEffect(() => {
    const initData = getTelegramInitData();

    if (initData) {
      void loadAnalytics(initData);
      return;
    }

    const stopWatching = watchTelegramInitData((value) => {
      void loadAnalytics(value);
    });
    const fallbackTimer = window.setTimeout(() => {
      void loadAnalytics();
    }, 2200);

    return () => {
      stopWatching();
      window.clearTimeout(fallbackTimer);
    };
  }, []);

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
          <button className="primary-button mt-4 w-full" onClick={() => loadAnalytics(getTelegramInitData())} type="button">
            Обновить
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <section className="grid grid-cols-2 gap-3">
            <MetricCard label="Всего пользователей" value={data.users.total} />
            <MetricCard label="Активные 24ч" value={data.users.active24h} />
            <MetricCard label="Активные 7д" value={data.users.active7d} />
            <MetricCard label="Активные 30д" value={data.users.active30d} />
            <MetricCard label="Новые сегодня" value={data.users.newToday} />
            <MetricCard label="Открытий 24ч" value={data.activity.appOpens24h} />
            <MetricCard label="Проверок 24ч" value={data.activity.tokenChecks24h} />
            <MetricCard label="Stars 24ч" value={data.payments.payments24h} />
          </section>

          <nav className="glass-card grid grid-cols-4 gap-1 p-1">
            {tabs.map((item) => (
              <button
                className={`rounded-[16px] px-2 py-3 text-xs font-black transition ${
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
                <h2 className="text-lg font-black text-white">Последние 14 дней</h2>
                <div className="mt-3 grid gap-2">
                  {data.daily.map((day) => (
                    <article className="mini-card p-3" key={day.date}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-black text-white">{day.date}</p>
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
              <div className="grid gap-3">
                <div className="app-card p-4">
                  <h2 className="text-lg font-black text-white">Популярные разделы</h2>
                  <div className="mt-3 grid gap-2">
                    {data.topRoutes.slice(0, 8).map((item) => (
                      <div className="mini-card flex items-center justify-between gap-3 p-3" key={item.label}>
                        <span className="min-w-0 truncate text-sm text-zinc-200">{item.label}</span>
                        <span className="font-black text-emerald-200">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="app-card p-4">
                  <h2 className="text-lg font-black text-white">Популярные гайды</h2>
                  <div className="mt-3 grid gap-2">
                    {data.topGuides.slice(0, 8).map((item) => (
                      <div className="mini-card flex items-center justify-between gap-3 p-3" key={item.label}>
                        <span className="min-w-0 truncate text-sm text-zinc-200">{item.label}</span>
                        <span className="font-black text-emerald-200">{item.count}</span>
                      </div>
                    ))}
                    {data.topGuides.length === 0 ? <EmptyState text="Пока нет открытий гайдов." /> : null}
                  </div>
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
                const userEvents = data.recentEvents
                  .filter((event) => event.telegram_user_id === user.telegram_user_id)
                  .slice(0, 10);

                return (
                  <details className="app-card p-4" key={user.telegram_user_id}>
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-lg font-black text-white">
                          {user.username ? `@${user.username}` : user.first_name ?? "Без username"}
                        </h2>
                        <p className="mt-1 text-xs text-zinc-500">
                          ID {user.telegram_user_id} · visits {user.visit_count}
                        </p>
                      </div>
                      {user.is_admin ? <StatusBadge tone="green">admin</StatusBadge> : null}
                    </summary>
                    <div className="mt-4 grid gap-2 text-sm text-zinc-300">
                      <div className="mini-card p-3">Первый вход: {formatDate(user.first_seen_at)}</div>
                      <div className="mini-card p-3">Последний вход: {formatDate(user.last_seen_at)}</div>
                      <div className="mini-card p-3">Последний route: {user.last_route ?? "—"}</div>
                      <div className="mt-2 grid gap-2">
                        {userEvents.map((event) => (
                          <div className="rounded-[16px] border border-white/10 bg-black/20 p-3" key={`${event.created_at}-${event.event_type}`}>
                            <p className="font-bold text-white">{event.event_type}</p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {formatDate(event.created_at)} · {event.event_target ?? event.route ?? "—"}
                            </p>
                          </div>
                        ))}
                        {userEvents.length === 0 ? <p className="text-xs text-zinc-500">Последних событий нет.</p> : null}
                      </div>
                    </div>
                  </details>
                );
              })}
            </section>
          ) : null}

          {tab === "events" ? (
            <section className="grid gap-2">
              {data.recentEvents.map((event) => (
                <article className="mini-card p-3" key={`${event.created_at}-${event.event_type}-${event.event_target}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-black text-white">{event.event_type}</p>
                      <p className="mt-1 truncate text-sm text-zinc-400">
                        {event.event_target ?? event.route ?? "—"}
                      </p>
                    </div>
                    <span className="text-xs text-zinc-500">{formatDate(event.created_at)}</span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    {event.username ? `@${event.username}` : event.telegram_user_id ?? "anonymous"}
                  </p>
                </article>
              ))}
            </section>
          ) : null}

          {tab === "tokens" ? (
            <section className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="Всего проверок" value={data.checklist.totalChecks} />
                <MetricCard label="Проверок 24ч" value={data.checklist.checks24h} />
                <MetricCard label="Всего оплат" value={data.payments.totalPayments} />
                <MetricCard label="Stars total" value={data.payments.starsTotal} />
              </div>
              <div className="app-card p-4">
                <h2 className="text-lg font-black text-white">Топ токенов</h2>
                <div className="mt-3 grid gap-2">
                  {data.topTokens.map((token) => (
                    <article className="mini-card flex items-center justify-between gap-3 p-3" key={token.label}>
                      <div>
                        <p className="font-black text-white">{token.label}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          avg score {token.averageScore ?? "—"}
                        </p>
                      </div>
                      <p className="text-lg font-black text-emerald-200">{token.count}</p>
                    </article>
                  ))}
                  {data.topTokens.length === 0 ? <EmptyState text="Проверок токенов пока нет." /> : null}
                </div>
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
