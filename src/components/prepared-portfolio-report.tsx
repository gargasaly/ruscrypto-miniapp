"use client";

import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import {
  getTelegramInitData,
  watchTelegramInitData,
} from "@/lib/telegram/webapp";
import { openExternalLink, openTelegramLink } from "@/lib/telegramLinks";

type ReportField = {
  label: string;
  value: string;
};

type ReportBlock =
  | {
      id: string;
      level: number;
      text: string;
      type: "heading";
    }
  | {
      text: string;
      type: "paragraph";
    }
  | {
      items: string[];
      type: "list";
    }
  | {
      cards: Array<{
        fields: ReportField[];
        title: string;
      }>;
      title: string;
      type: "tableCards";
    }
  | {
      cards: Array<{
        reason: string;
        role: string;
        symbol: string;
        weight: number;
      }>;
      totalWeight: number;
      type: "portfolioCards";
      watchlist: string[];
    }
  | {
      items: Array<{
        asset: string | null;
        date: string;
        description: string;
        kind: string | null;
        title: string;
      }>;
      type: "timeline";
    }
  | {
      evaluation: string;
      metrics: string;
      risks: string;
      role: string;
      symbol: string;
      thesis: string;
      type: "tokenCard";
    };

type PreparedReport = {
  blocks: ReportBlock[];
  description: string;
  highlights: Array<{
    label: string;
    text: string;
    title: string;
  }>;
  nav: Array<{
    href: string;
    label: string;
  }>;
  title: string;
};

type PortfolioReportResponse = {
  channelUrl?: string;
  isAdmin: boolean;
  locked: boolean;
  message?: string;
  ok: boolean;
  reason?: string;
  releaseDate: string;
  released?: boolean;
  report?: PreparedReport;
  title?: string;
};

const CHANNEL_URL = "https://t.me/ruscrypto2026";
const urlPattern = /(https?:\/\/[^\s)]+)/g;

const quickNavItems = [
  {
    aria: "Перейти к началу отчёта",
    id: "report-start",
    label: "Начало",
    number: "1",
  },
  {
    aria: "Перейти к сравнению ключевых метрик",
    id: "key-metrics",
    label: "Метрики",
    number: "2",
  },
  {
    aria: "Перейти к оценке по каждому токену",
    id: "token-analysis",
    label: "Токены",
    number: "3",
  },
  {
    aria: "Перейти к итоговой таблице портфеля",
    id: "portfolio-table",
    label: "Портфель",
    number: "4",
  },
] as const;

function openSafeLink(url: string) {
  if (url.includes("t.me/") || url.includes("telegram.me/")) {
    openTelegramLink(url);
    return;
  }

  openExternalLink(url);
}

function InlineText({ text }: { text: string }) {
  const parts = text.split(urlPattern);

  return (
    <>
      {parts.map((part, index) => {
        if (part.match(urlPattern)) {
          return (
            <button
              className="inline break-all text-left font-semibold text-emerald-200 underline decoration-emerald-300/35 underline-offset-4"
              key={`${part}-${index}`}
              onClick={() => openSafeLink(part)}
              type="button"
            >
              {part}
            </button>
          );
        }

        return <span key={`${part}-${index}`}>{part}</span>;
      })}
    </>
  );
}

function getWeight(fields: ReportField[]) {
  const weight = fields.find((field) => /вес/i.test(field.label))?.value;
  const parsed = Number(String(weight ?? "").replace(",", "."));

  return Number.isFinite(parsed) ? parsed : null;
}

function ReportQuickNav() {
  const [activeId, setActiveId] = useState("report-start");
  const [tooltipId, setTooltipId] = useState<string | null>(null);

  useEffect(() => {
    const elements = quickNavItems
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (!elements.length || typeof IntersectionObserver === "undefined") {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (visible?.target.id) {
          setActiveId(visible.target.id);
        }
      },
      {
        rootMargin: "-32% 0px -58% 0px",
        threshold: [0.1, 0.3, 0.55],
      },
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  const handleClick = (id: string) => {
    setActiveId(id);
    setTooltipId(id);
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    window.setTimeout(() => {
      setTooltipId((current) => (current === id ? null : current));
    }, 1300);
  };

  return (
    <nav
      aria-label="Навигация по отчёту"
      className="fixed right-2 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-2"
    >
      {quickNavItems.map((item) => {
        const active = activeId === item.id;
        const tooltipVisible = tooltipId === item.id;

        return (
          <div className="relative flex items-center justify-end" key={item.id}>
            <span
              className={`pointer-events-none absolute right-[42px] whitespace-nowrap rounded-full border border-emerald-200/15 bg-[#07110f]/95 px-2.5 py-1 text-[11px] font-black text-emerald-50 shadow-lg shadow-black/30 transition ${
                tooltipVisible ? "translate-x-0 opacity-100" : "translate-x-1 opacity-0"
              }`}
            >
              {item.number} — {item.label}
            </span>
            <button
              aria-label={item.aria}
              className={`grid h-8 w-8 place-items-center rounded-full border text-xs font-black shadow-lg backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-emerald-300/50 ${
                active
                  ? "border-emerald-200/55 bg-emerald-300 text-[#041412] shadow-emerald-950/30"
                  : "border-emerald-200/16 bg-[#06100e]/82 text-emerald-100 shadow-black/30"
              }`}
              onBlur={() => setTooltipId(null)}
              onClick={() => handleClick(item.id)}
              onFocus={() => setTooltipId(item.id)}
              onMouseEnter={() => setTooltipId(item.id)}
              onMouseLeave={() => setTooltipId(null)}
              type="button"
            >
              {item.number}
            </button>
          </div>
        );
      })}
    </nav>
  );
}

function ReportBlockView({ block }: { block: ReportBlock }) {
  if (block.type === "heading") {
    const className =
      block.level <= 2
        ? "scroll-mt-6 pr-8 text-2xl font-black text-white"
        : "scroll-mt-6 pr-8 text-lg font-black text-emerald-50";

    return (
      <h2 className={className} id={block.id}>
        {block.text}
      </h2>
    );
  }

  if (block.type === "paragraph") {
    return (
      <p className="pr-8 text-sm leading-6 text-zinc-300">
        <InlineText text={block.text} />
      </p>
    );
  }

  if (block.type === "list") {
    return (
      <div className="grid gap-2 pr-8">
        {block.items.map((item) => (
          <div className="mini-card min-w-0 p-3 text-sm leading-6 text-zinc-200" key={item}>
            <InlineText text={item} />
          </div>
        ))}
      </div>
    );
  }

  if (block.type === "timeline") {
    return (
      <div className="grid gap-2 pr-8">
        {block.items.map((item) => (
          <article
            className="mini-card grid min-w-0 grid-cols-[4.2rem_1fr] gap-2.5 p-3"
            key={`${item.date}-${item.title}`}
          >
            <div className="text-xs font-black leading-5 text-emerald-200">{item.date}</div>
            <div className="min-w-0">
              <h3 className="text-sm font-black leading-5 text-white">
                {item.asset ? (
                  <span className="text-emerald-200">{item.asset}</span>
                ) : null}
                {item.asset && item.kind ? <span className="text-zinc-500"> · </span> : null}
                {item.kind ? <span className="text-emerald-100">{item.kind}</span> : null}
                {(item.asset || item.kind) && item.title ? (
                  <span className="text-zinc-500"> · </span>
                ) : null}
                {item.title}
              </h3>
              <p className="mt-1 text-xs leading-5 text-zinc-300">
                <InlineText text={item.description} />
              </p>
            </div>
          </article>
        ))}
      </div>
    );
  }

  if (block.type === "portfolioCards") {
    return (
      <div className="grid gap-3 pr-8">
        {block.cards.map((card) => (
          <article className="mini-card min-w-0 p-4" key={card.symbol}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-black text-white">{card.symbol}</p>
                <p className="mt-1 text-xs font-semibold uppercase text-emerald-200/75">
                  {card.role}
                </p>
              </div>
              <p className="text-lg font-black text-emerald-100">{card.weight}%</p>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-300 to-emerald-300"
                style={{ width: `${Math.min(Math.max(card.weight, 0), 24) * 4.166}%` }}
              />
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-300">{card.reason}</p>
          </article>
        ))}

        <div className="app-card p-4">
          <h3 className="text-lg font-black text-white">Watchlist</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {block.watchlist.map((symbol) => (
              <StatusBadge key={symbol} tone="neutral">
                {symbol}
              </StatusBadge>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (block.type === "tokenCard") {
    return (
      <details className="mini-card group min-w-0 p-4 pr-8">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-black text-white">{block.symbol}</p>
            <p className="mt-1 text-xs font-semibold uppercase text-emerald-200/75">
              Роль: {block.role || "в портфеле"}
            </p>
          </div>
          <span className="chevron-soft transition group-open:rotate-90">›</span>
        </summary>
        <div className="mt-4 grid gap-3 text-sm leading-6 text-zinc-300">
          {block.thesis ? (
            <div>
              <p className="text-xs font-black uppercase text-emerald-200/75">Тезис</p>
              <p className="mt-1">
                <InlineText text={block.thesis} />
              </p>
            </div>
          ) : null}
          {block.metrics ? (
            <div>
              <p className="text-xs font-black uppercase text-emerald-200/75">
                Ключевые метрики
              </p>
              <p className="mt-1">
                <InlineText text={block.metrics} />
              </p>
            </div>
          ) : null}
          {block.risks ? (
            <div>
              <p className="text-xs font-black uppercase text-emerald-200/75">Риски</p>
              <p className="mt-1">
                <InlineText text={block.risks} />
              </p>
            </div>
          ) : null}
          {block.evaluation ? (
            <div>
              <p className="text-xs font-black uppercase text-emerald-200/75">Оценка</p>
              <div className="mt-2 grid gap-2">
                {block.evaluation.split(/\n+/).map((line) => (
                  <p
                    className="rounded-[16px] border border-white/10 bg-black/20 p-3 text-sm leading-6 text-zinc-200"
                    key={line}
                  >
                    <InlineText text={line} />
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </details>
    );
  }

  return (
    <div className="grid gap-3 pr-8">
      {block.cards.map((card) => {
        const weight = getWeight(card.fields);
        const showWeight = weight !== null && weight > 0;

        return (
          <details className="mini-card group min-w-0 p-4" key={`${block.title}-${card.title}`}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-black text-white">{card.title}</p>
                {showWeight ? (
                  <p className="mt-1 text-sm font-semibold text-emerald-200">
                    {weight}% портфеля
                  </p>
                ) : null}
              </div>
              <span className="chevron-soft transition group-open:rotate-90">›</span>
            </summary>
            {showWeight ? (
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-300 to-emerald-300"
                  style={{ width: `${Math.min(Math.max(weight, 0), 24) * 4.166}%` }}
                />
              </div>
            ) : null}
            <div className="mt-4 grid gap-3">
              {card.fields.map((field) => (
                <div
                  className="rounded-[16px] border border-white/10 bg-black/20 p-3"
                  key={`${card.title}-${field.label}`}
                >
                  <p className="text-xs font-black uppercase text-emerald-200/75">
                    {field.label}
                  </p>
                  <p className="mt-1 break-words text-sm leading-6 text-zinc-200">
                    <InlineText text={field.value} />
                  </p>
                </div>
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

export function PreparedPortfolioReport() {
  const [data, setData] = useState<PortfolioReportResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const loadReport = useCallback(async (initData?: string) => {
    const resolvedInitData = initData ?? getTelegramInitData();

    if (!resolvedInitData) {
      setData({
        channelUrl: CHANNEL_URL,
        isAdmin: false,
        locked: true,
        message: "Доступ будет открыт подписчикам канала «Крипта для новичков».",
        ok: true,
        reason: "telegram-init-data-missing",
        releaseDate: "22.05.2026",
        title: "Полный отчёт откроется 22.05.2026",
      });
      setStatus("ready");
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch("/api/portfolio-report", {
        body: JSON.stringify({ initData: resolvedInitData }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as PortfolioReportResponse;

      setData(payload);
      setStatus("ready");
    } catch {
      setData(null);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const initData = getTelegramInitData();

    if (initData) {
      void loadReport(initData);
      return;
    }

    const stopWatching = watchTelegramInitData((value) => {
      void loadReport(value);
    });
    const fallbackTimer = window.setTimeout(() => {
      void loadReport("");
    }, 2300);

    return () => {
      stopWatching();
      window.clearTimeout(fallbackTimer);
    };
  }, [loadReport]);

  const releaseDate = data?.releaseDate ?? "22.05.2026";
  const report = data?.report;

  return (
    <div className="space-y-5">
      <section className="premium-card p-5 pr-11" id="report-start">
        <div className="relative z-10">
          <div className="flex flex-wrap gap-2">
            {data?.isAdmin ? <StatusBadge tone="green">Admin preview</StatusBadge> : null}
            <StatusBadge tone="neutral">
              Релиз для всех подписчиков: {releaseDate}
            </StatusBadge>
          </div>
          <h1 className="mt-4 text-3xl font-black leading-tight text-white">
            Долгосрочный криптопортфель до 2028
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            Готовая структура долгосрочного портфеля: core-активы,
            satellite-идеи, watchlist и логика распределения.
          </p>
        </div>
      </section>

      {status === "loading" ? (
        <section className="app-card p-5">
          <p className="text-sm font-semibold text-emerald-100">
            Проверяем доступ к отчёту…
          </p>
        </section>
      ) : null}

      {status === "error" ? (
        <section className="app-card p-5">
          <h2 className="text-xl font-black text-white">Не удалось проверить доступ</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Откройте Mini App через Telegram и попробуйте снова.
          </p>
          <button className="primary-button mt-4 w-full" onClick={() => loadReport()} type="button">
            Проверить доступ
          </button>
        </section>
      ) : null}

      {status === "ready" && data?.locked ? (
        <section className="app-card p-5">
          <StatusBadge tone="yellow">Релиз: {releaseDate}</StatusBadge>
          <h2 className="mt-4 text-xl font-black text-white">
            {data.title ?? `Полный отчёт откроется ${releaseDate}`}
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            {data.message ??
              "Доступ будет открыт подписчикам канала «Крипта для новичков»."}
          </p>
          <div className="mt-4 grid gap-2">
            <button
              className="primary-button w-full"
              onClick={() => openTelegramLink(data.channelUrl ?? CHANNEL_URL)}
              type="button"
            >
              Открыть канал
            </button>
            <button className="secondary-button w-full" onClick={() => loadReport()} type="button">
              Проверить доступ
            </button>
          </div>
        </section>
      ) : null}

      {status === "ready" && report ? (
        <>
          <ReportQuickNav />

          <section className="grid gap-3 pr-8">
            {report.highlights.map((item) => (
              <article className="mini-card min-w-0 p-4" key={item.title}>
                <StatusBadge tone="green">{item.label}</StatusBadge>
                <h2 className="mt-3 text-lg font-black text-white">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-300">{item.text}</p>
              </article>
            ))}
          </section>

          <section className="space-y-4">
            {report.blocks.map((block, index) => (
              <ReportBlockView block={block} key={`${block.type}-${index}`} />
            ))}
          </section>
        </>
      ) : null}
    </div>
  );
}
