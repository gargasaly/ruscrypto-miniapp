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
      items: Array<{
        date: string;
        description: string;
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
  isAdmin: boolean;
  locked: boolean;
  ok: boolean;
  reason?: string;
  releaseDate: string;
  report?: PreparedReport;
};

const JUP_LINK = "https://t.me/ruscrypto2026/117";
const urlPattern = /(https?:\/\/[^\s)]+)/g;

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

function JupLink({ symbol }: { symbol: string }) {
  if (symbol.toUpperCase() !== "JUP") {
    return null;
  }

  return (
    <button
      className="secondary-button mt-3 w-full"
      onClick={() => openTelegramLink(JUP_LINK)}
      type="button"
    >
      Разбор JUP в канале
    </button>
  );
}

function ReportBlockView({ block }: { block: ReportBlock }) {
  if (block.type === "heading") {
    const className =
      block.level <= 2
        ? "scroll-mt-6 text-2xl font-black text-white"
        : "scroll-mt-6 text-lg font-black text-emerald-50";

    return (
      <h2 className={className} id={block.id}>
        {block.text}
      </h2>
    );
  }

  if (block.type === "paragraph") {
    return (
      <p className="text-sm leading-6 text-zinc-300">
        <InlineText text={block.text} />
      </p>
    );
  }

  if (block.type === "list") {
    return (
      <div className="grid gap-2">
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
      <div className="grid gap-3">
        {block.items.map((item) => (
          <article className="mini-card min-w-0 p-4" key={`${item.date}-${item.title}`}>
            <StatusBadge tone="green">{item.date}</StatusBadge>
            <h3 className="mt-3 text-base font-black text-white">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              <InlineText text={item.description} />
            </p>
          </article>
        ))}
      </div>
    );
  }

  if (block.type === "tokenCard") {
    return (
      <details className="mini-card group min-w-0 p-4">
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
              <p className="mt-1">
                <InlineText text={block.evaluation} />
              </p>
            </div>
          ) : null}
          <JupLink symbol={block.symbol} />
        </div>
      </details>
    );
  }

  return (
    <div className="grid gap-3">
      {block.cards.map((card) => {
        const weight = getWeight(card.fields);

        return (
          <details className="mini-card group min-w-0 p-4" key={`${block.title}-${card.title}`}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-black text-white">{card.title}</p>
                {weight !== null ? (
                  <p className="mt-1 text-sm font-semibold text-emerald-200">
                    {weight}% портфеля
                  </p>
                ) : null}
              </div>
              <span className="chevron-soft transition group-open:rotate-90">›</span>
            </summary>
            {weight !== null ? (
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
              <JupLink symbol={card.title} />
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
        isAdmin: false,
        locked: true,
        ok: true,
        reason: "telegram-init-data-missing",
        releaseDate: "22.05.2026",
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
      <section className="premium-card p-5">
        <div className="relative z-10">
          <div className="flex flex-wrap gap-2">
            {data?.isAdmin ? <StatusBadge tone="green">Admin preview</StatusBadge> : null}
            <StatusBadge tone="neutral">Релиз для всех: {releaseDate}</StatusBadge>
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
            Полный отчёт откроется {releaseDate}
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Здесь будет готовая структура долгосрочного криптопортфеля до 2028 года.
          </p>
          <button className="secondary-button mt-4 w-full" onClick={() => loadReport()} type="button">
            Проверить доступ
          </button>
        </section>
      ) : null}

      {status === "ready" && report ? (
        <>
          <section className="grid gap-3">
            {report.highlights.map((item) => (
              <article className="mini-card min-w-0 p-4" key={item.title}>
                <StatusBadge tone="green">{item.label}</StatusBadge>
                <h2 className="mt-3 text-lg font-black text-white">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-300">{item.text}</p>
              </article>
            ))}
          </section>

          <nav className="app-card sticky top-2 z-20 -mx-1 flex flex-wrap gap-2 p-2">
            {report.nav.map((item) => (
              <a
                className="rounded-full border border-emerald-200/12 bg-emerald-300/[0.08] px-3 py-2 text-xs font-black text-emerald-50"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </a>
            ))}
          </nav>

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
