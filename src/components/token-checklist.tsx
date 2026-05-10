"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { TokenLogo } from "@/components/token-logo";
import type { TokenCard } from "@/lib/content";
import {
  formatCompactNumber,
  formatMarketCap,
  formatPercent,
  formatUsdPrice,
  formatVolume,
  toFiniteNumber,
} from "@/lib/formatters";
import type {
  TokenChecklistFactor,
  TokenChecklistMarket,
  TokenChecklistRiskLevel,
  TokenChecklistScore,
  TokenLiquiditySummary,
  TokenTechnicalSummary,
  TokenUnlockSummary,
  TokenVolumeSummary,
} from "@/lib/tokenChecklist";

type TokenChecklistProps = {
  tokens: TokenCard[];
};

type TokenChecklistApiResponse = {
  error?: string;
  liquidity: TokenLiquiditySummary;
  market: TokenChecklistMarket;
  partialData: boolean;
  plainConclusion: string[];
  project: {
    projectSummaryRu: string;
    sectorRiskRu: string;
    sectorRu: string;
  };
  score: TokenChecklistScore;
  technical: TokenTechnicalSummary;
  token: {
    coingeckoId: string;
    logo: string | null;
    ticker: string;
    title: string;
  };
  unlocks: TokenUnlockSummary;
  updatedAt: string;
  volume: TokenVolumeSummary;
  whatToCheckManually: string[];
};

type ChecklistState = {
  data: TokenChecklistApiResponse | null;
  error: string | null;
  loading: boolean;
};

function riskTone(level: TokenChecklistRiskLevel): "green" | "neutral" | "red" | "yellow" {
  if (level === "low") {
    return "green";
  }

  if (level === "high") {
    return "red";
  }

  if (level === "unknown") {
    return "neutral";
  }

  return "yellow";
}

function riskLabel(level: TokenChecklistRiskLevel) {
  if (level === "low") {
    return "Низкий риск";
  }

  if (level === "high") {
    return "Высокий риск";
  }

  if (level === "unknown") {
    return "Данных мало";
  }

  return "Средний риск";
}

function formatNumber(value: unknown) {
  const number = toFiniteNumber(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(number);
}

function formatRatioPercent(value: number | null) {
  return value === null ? "—" : formatPercent(value * 100);
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "только что";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function MetricCard({
  label,
  tone = "default",
  value,
}: {
  label: string;
  tone?: "default" | "green" | "red";
  value: string;
}) {
  return (
    <div className="mini-card p-3">
      <p className="text-xs font-bold uppercase text-zinc-500">{label}</p>
      <p
        className={`mt-2 text-lg font-black ${
          tone === "green"
            ? "text-emerald-300"
            : tone === "red"
              ? "text-rose-300"
              : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function InsightCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="app-card p-4">
      <h2 className="text-lg font-black text-white">{title}</h2>
      <div className="mt-3 text-sm leading-6 text-zinc-400">{children}</div>
    </section>
  );
}

function FactorRow({ factor }: { factor: TokenChecklistFactor }) {
  return (
    <div className="mini-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-black text-white">{factor.label}</p>
        <StatusBadge tone={riskTone(factor.level)}>{riskLabel(factor.level)}</StatusBadge>
      </div>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{factor.text}</p>
    </div>
  );
}

export function TokenChecklist({ tokens }: TokenChecklistProps) {
  const [query, setQuery] = useState("");
  const [selectedTicker, setSelectedTicker] = useState(tokens[0]?.ticker ?? "");
  const [state, setState] = useState<ChecklistState>({
    data: null,
    error: null,
    loading: true,
  });

  const selectedToken =
    tokens.find((token) => token.ticker === selectedTicker) ?? tokens[0];

  const filteredTokens = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return tokens;
    }

    return tokens.filter((token) =>
      [token.title, token.ticker, token.description, token.sector]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, tokens]);

  useEffect(() => {
    if (!selectedToken) {
      return;
    }

    const controller = new AbortController();

    async function loadChecklist() {
      setState((current) => ({
        ...current,
        error: null,
        loading: true,
      }));

      try {
        const params = new URLSearchParams({
          coingeckoId: selectedToken.coingeckoId,
        });
        const response = await fetch(`/api/token-checklist?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = (await response.json()) as TokenChecklistApiResponse;

        if (!response.ok) {
          throw new Error(data.error ?? "Не удалось проверить токен");
        }

        setState({
          data,
          error: null,
          loading: false,
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          data: null,
          error:
            error instanceof Error
              ? error.message
              : "Данные временно недоступны",
          loading: false,
        });
      }
    }

    void loadChecklist();

    return () => {
      controller.abort();
    };
  }, [selectedToken]);

  if (!selectedToken) {
    return null;
  }

  const data = state.data;
  const change24h = data?.market.priceChange24h;
  const positive24h = typeof change24h === "number" && change24h >= 0;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-zinc-300">
            Поиск токена
          </span>
          <input
            className="search-input"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Например: BTC, LINK, AVAX"
            type="search"
            value={query}
          />
        </label>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {filteredTokens.map((token) => {
            const active = token.ticker === selectedToken.ticker;

            return (
              <button
                className={`shrink-0 rounded-full border px-3 py-2 text-xs font-black transition ${
                  active
                    ? "border-emerald-300/35 bg-emerald-300/15 text-emerald-100"
                    : "border-white/10 bg-white/[0.035] text-zinc-400 hover:border-emerald-300/20 hover:text-zinc-100"
                }`}
                key={token.ticker}
                onClick={() => setSelectedTicker(token.ticker)}
                type="button"
              >
                {token.ticker}
              </button>
            );
          })}
        </div>

        {filteredTokens.length === 0 ? (
          <div className="app-card p-4 text-sm leading-6 text-zinc-400">
            Ничего не найдено
          </div>
        ) : null}
      </div>

      {state.loading ? (
        <section className="premium-card p-5">
          <div className="relative z-10 animate-pulse space-y-4">
            <div className="h-6 w-36 rounded-full bg-white/10" />
            <div className="h-12 rounded-2xl bg-white/10" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-20 rounded-2xl bg-white/10" />
              <div className="h-20 rounded-2xl bg-white/10" />
            </div>
          </div>
        </section>
      ) : null}

      {!state.loading && state.error ? (
        <section className="app-card p-4">
          <h2 className="text-lg font-black text-white">
            Данные временно недоступны
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            {state.error}. Попробуй открыть раздел позже: приложение не ломается,
            но автоматическая оценка сейчас невозможна.
          </p>
        </section>
      ) : null}

      {!state.loading && data ? (
        <>
          <section className="premium-card p-4">
            <div className="relative z-10 flex items-start gap-3">
              <TokenLogo
                logo={data.token.logo}
                remoteLogo={data.market.image}
                ticker={data.token.ticker}
                title={data.token.title}
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-black text-white">
                    {data.token.ticker}
                  </h2>
                  <span className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-xs font-black text-zinc-300">
                    {data.token.title}
                  </span>
                  <StatusBadge tone={riskTone(data.score.riskLevel)}>
                    {riskLabel(data.score.riskLevel)}
                  </StatusBadge>
                </div>

                <div className="mt-4 grid gap-3 min-[380px]:grid-cols-[auto_1fr]">
                  <div className="grid size-20 place-items-center rounded-[24px] border border-emerald-200/15 bg-emerald-300/[0.08] text-3xl font-black text-emerald-200 shadow-inner shadow-white/5">
                    {data.score.score}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-zinc-500">
                      score 0–100
                    </p>
                    <h3 className="mt-1 text-xl font-black leading-tight text-white">
                      {data.score.verdictTitle}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      {data.score.verdictText}
                    </p>
                  </div>
                </div>

                {data.score.badges.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {data.score.badges.map((badge) => (
                      <span
                        className="rounded-full border border-amber-200/15 bg-amber-300/[0.07] px-2.5 py-1 text-xs font-bold text-amber-100/85"
                        key={badge}
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          {data.partialData ? (
            <div className="rounded-[22px] border border-amber-200/15 bg-amber-300/[0.07] p-4 text-sm leading-6 text-amber-100/90">
              Часть данных недоступна, оценка приблизительная.
            </div>
          ) : null}

          <section className="app-card p-4">
            <h2 className="text-lg font-black text-white">Цена и памп</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MetricCard label="Цена" value={formatUsdPrice(data.market.currentPrice)} />
              <MetricCard
                label="24ч"
                tone={positive24h ? "green" : "red"}
                value={formatPercent(change24h)}
              />
              <MetricCard label="7д" value={formatPercent(data.market.priceChange7d)} />
              <MetricCard label="30д" value={formatPercent(data.market.priceChange30d)} />
              <MetricCard label="Market Cap" value={formatMarketCap(data.market.marketCap)} />
              <MetricCard label="Volume" value={formatVolume(data.market.totalVolume)} />
            </div>
          </section>

          <div className="grid gap-4">
            <InsightCard title="Чем занимается проект">
              <p>{data.project.projectSummaryRu}</p>
            </InsightCard>

            <InsightCard title="Сектор">
              <p className="font-bold text-emerald-100">{data.project.sectorRu}</p>
              <p className="mt-2">{data.project.sectorRiskRu}</p>
            </InsightCard>

            <InsightCard title="Техническая зона">
              <p className="font-bold text-white">{data.technical.zoneLabel}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <MetricCard label="RSI 14" value={formatNumber(data.technical.rsi14)} />
                <MetricCard
                  label="SMA 20"
                  value={formatUsdPrice(data.technical.sma20)}
                />
                <MetricCard
                  label="к SMA 20"
                  value={formatPercent(data.technical.priceVsSma20Percent)}
                />
                <MetricCard
                  label="к 90d high"
                  value={formatPercent(data.technical.near90dHighPercent)}
                />
              </div>
            </InsightCard>

            <InsightCard title="Объём торгов">
              <p className="font-bold text-white">{data.volume.label}</p>
              <p className="mt-2">
                Volume / Market Cap: {formatRatioPercent(data.volume.volumeToMarketCap)}
              </p>
              <p className="mt-1">
                Оборот к эталону:{" "}
                {data.volume.benchmarkRatioPercent === null
                  ? "—"
                  : `${formatCompactNumber(data.volume.benchmarkRatioPercent)}% от нормального уровня`}
              </p>
            </InsightCard>

            <InsightCard title="Ликвидность">
              <p className="font-bold text-white">{data.liquidity.label}</p>
              <p className="mt-2">
                Торговых пар: {formatNumber(data.liquidity.tickerCount)} · зелёный trust score:{" "}
                {formatNumber(data.liquidity.trustedTickerCount)}
              </p>
              <p className="mt-1">
                CEX/DEX: {formatNumber(data.liquidity.cexPairs)} /{" "}
                {formatNumber(data.liquidity.dexPairs)}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                Оценка ликвидности приблизительная, без данных стакана.
              </p>
            </InsightCard>

            <InsightCard title="Unlocks">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={riskTone(data.unlocks.risk)}>
                  {riskLabel(data.unlocks.risk)}
                </StatusBadge>
                <span className="text-xs font-bold uppercase text-zinc-500">
                  {data.unlocks.source}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <MetricCard
                  label="next unlock"
                  value={data.unlocks.nextUnlockDate ?? "—"}
                />
                <MetricCard
                  label="% unlock"
                  value={formatPercent(data.unlocks.nextUnlockPercent)}
                />
                <MetricCard
                  label="unlocked"
                  value={formatPercent(data.unlocks.unlockedPercent)}
                />
                <MetricCard
                  label="locked"
                  value={formatPercent(data.unlocks.lockedPercent)}
                />
              </div>
              <p className="mt-3">{data.unlocks.note}</p>
            </InsightCard>

            <InsightCard title="Что проверить вручную">
              <div className="grid gap-2">
                {data.whatToCheckManually.map((item) => (
                  <div className="mini-card p-3 text-sm text-zinc-300" key={item}>
                    {item}
                  </div>
                ))}
              </div>
            </InsightCard>
          </div>

          <section className="rounded-[24px] border border-emerald-200/15 bg-emerald-300/[0.075] p-4">
            <p className="text-xs font-bold uppercase text-emerald-100/80">
              Вывод простыми словами
            </p>
            <div className="mt-3 space-y-2 text-sm leading-6 text-zinc-200">
              {data.plainConclusion.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-zinc-500">
              Обновлено: {formatUpdatedAt(data.updatedAt)}. Это обучающий
              инструмент, а не финансовая рекомендация.
            </p>
          </section>

          <section className="grid gap-2">
            {data.score.factors.map((factor) => (
              <FactorRow factor={factor} key={`${factor.label}-${factor.text}`} />
            ))}
          </section>
        </>
      ) : null}
    </div>
  );
}
