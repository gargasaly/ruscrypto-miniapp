"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { TokenLogo } from "@/components/token-logo";
import {
  canRunChecklistForSymbol,
  getFreeChecklistSymbols,
} from "@/lib/checklistAccess";
import type { TokenCard } from "@/lib/content";
import {
  formatCompactNumber,
  formatMarketCap,
  formatPercent,
  formatUsdPrice,
  formatVolume,
  toFiniteNumber,
} from "@/lib/formatters";
import type { TokenChecklistFactor, TokenChecklistRiskLevel } from "@/lib/tokenChecklist";

type TokenChecklistProps = {
  tokens: TokenCard[];
};

type SourceStatus = "ok" | "partial" | "failed" | "fallback-market-cache";
type DataQuality = "full" | "partial" | "fallback" | "last-good";

type TokenChecklistApiResponse = {
  dataQuality: DataQuality;
  liquidity: {
    benchmarkPercent: number | null;
    explanation: string;
    isEstimated: boolean;
    label: string;
    score: number | null;
  };
  market: {
    ath: number | null;
    change24h: number | null;
    change30d: number | null;
    change7d: number | null;
    distanceFromAth: number | null;
    marketCap: number | null;
    price: number | null;
    volume24h: number | null;
    volumeToMarketCap: number | null;
  };
  ok: boolean;
  project: {
    sectorRiskRu: string;
    sectorRu: string;
    summaryRu: string;
  };
  sourceStatus: Record<"chart" | "details" | "market" | "tickers" | "unlocks", SourceStatus>;
  technical: {
    nearHigh: number | null;
    nearLow: number | null;
    position: "hot" | "neutral" | "cold" | "unknown";
    pumpRisk: TokenChecklistRiskLevel;
    rsi14: number | null;
    sma20: number | null;
    sma50: number | null;
  };
  token: {
    id: string;
    image: string | null;
    name: string;
    symbol: string;
  };
  unlocks: {
    circulatingSupplyPercent: number | null;
    confidence: "high" | "medium" | "low" | "unknown";
    explanation: string;
    isAvailable: boolean;
    label: string;
    lockedPercent: number | null;
    manualCheckUrls: Array<{
      label: string;
      url: string;
    }>;
    nextUnlockAmount: number | null;
    nextUnlockDate: string | null;
    nextUnlockMarketCapPercent: number | null;
    nextUnlockPercent: number | null;
    provider: string;
    providerStatus: string;
    rawTitle: string | null;
    sourceUrl: string | null;
    unlockedPercent: number | null;
  };
  updatedAt: string;
  verdict: {
    badges: string[];
    factors: TokenChecklistFactor[];
    riskLevel: TokenChecklistRiskLevel;
    score: number;
    text: string;
    title: string;
  };
  volume: {
    benchmark: number | null;
    benchmarkPercent: number | null;
    explanation: string;
    label: string;
    value: number | null;
    volumeToMarketCap: number | null;
  };
  warnings: string[];
};

type ChecklistState = {
  data: TokenChecklistApiResponse | null;
  error: string | null;
  loading: boolean;
  staleNotice: string | null;
};

type CachedChecklistData = {
  expiresAt: number;
  response: TokenChecklistApiResponse;
  updatedAt: string;
};

const CACHE_TTL_MS = 15 * 60_000;

function cacheKey(symbol: string) {
  return `token-checklist:last-good:${symbol.toUpperCase()}`;
}

function isChecklistResponse(value: unknown): value is TokenChecklistApiResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    "token" in value &&
    "verdict" in value
  );
}

function qualityRank(value: DataQuality) {
  if (value === "full") {
    return 3;
  }

  if (value === "partial" || value === "last-good") {
    return 2;
  }

  return 1;
}

function unlockQualityRank(value: TokenChecklistApiResponse["unlocks"]["confidence"]) {
  if (value === "high") {
    return 4;
  }

  if (value === "medium") {
    return 3;
  }

  if (value === "low") {
    return 2;
  }

  return 1;
}

function hasPriceAndPumpData(value: TokenChecklistApiResponse) {
  return (
    value.market.price !== null ||
    value.market.change24h !== null ||
    value.market.change7d !== null ||
    value.market.change30d !== null
  );
}

function readCachedData(symbol: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(cacheKey(symbol));

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CachedChecklistData;

    if (
      parsed.expiresAt > Date.now() &&
      isChecklistResponse(parsed.response) &&
      parsed.response.ok
    ) {
      return parsed.response;
    }
  } catch {
    return null;
  }

  return null;
}

function writeCachedData(response: TokenChecklistApiResponse) {
  if (typeof window === "undefined" || !response.ok || response.dataQuality === "fallback") {
    return;
  }

  try {
    const payload: CachedChecklistData = {
      expiresAt: Date.now() + CACHE_TTL_MS,
      response,
      updatedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(cacheKey(response.token.symbol), JSON.stringify(payload));
  } catch {
    // localStorage может быть недоступен в приватном режиме Telegram Desktop.
  }
}

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

function dataQualityLabel(value: DataQuality) {
  if (value === "full") {
    return "полные данные";
  }

  if (value === "last-good") {
    return "последние данные";
  }

  if (value === "partial") {
    return "частичные данные";
  }

  return "fallback";
}

function unlockConfidenceLabel(value: TokenChecklistApiResponse["unlocks"]["confidence"]) {
  if (value === "high") {
    return "точные данные";
  }

  if (value === "medium") {
    return "календарная подсказка";
  }

  if (value === "low") {
    return "только supply";
  }

  return "проверить вручную";
}

function unlockConfidenceTone(
  value: TokenChecklistApiResponse["unlocks"]["confidence"],
): "green" | "neutral" | "red" | "yellow" {
  if (value === "high") {
    return "green";
  }

  if (value === "medium") {
    return "yellow";
  }

  if (value === "low") {
    return "neutral";
  }

  return "yellow";
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

function sourceLabel(source: string) {
  const labels: Record<string, string> = {
    chart: "график",
    details: "детали",
    market: "рынок",
    tickers: "пары",
    unlocks: "unlocks",
  };

  return labels[source] ?? source;
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

function DataStatusCard({
  data,
  staleNotice,
}: {
  data: TokenChecklistApiResponse;
  staleNotice: string | null;
}) {
  const unavailable = Object.entries(data.sourceStatus).filter(
    ([, status]) => status !== "ok" && status !== "fallback-market-cache",
  );

  if (data.dataQuality === "full" && !staleNotice) {
    return null;
  }

  return (
    <section className="rounded-[22px] border border-amber-200/15 bg-amber-300/[0.07] p-4 text-sm leading-6 text-amber-100/90">
      <h2 className="font-black text-amber-50">
        {data.dataQuality === "last-good"
          ? "Показаны последние доступные данные"
          : data.dataQuality === "fallback"
          ? "Данных недостаточно для полной оценки"
          : "Часть данных недоступна"}
      </h2>
      <p className="mt-2">
        {staleNotice ??
          (data.dataQuality === "last-good"
            ? "Свежая проверка временно недоступна, поэтому оставлен последний сохранённый результат."
            : data.dataQuality === "partial"
              ? "Часть данных недоступна, вывод приблизительный."
              : "Данных недостаточно для полной оценки. Проверь позже.")}
      </p>
      {unavailable.length > 0 ? (
        <p className="mt-2 text-xs text-amber-100/75">
          Не удалось получить:{" "}
          {unavailable.map(([source]) => sourceLabel(source)).join(", ")}.
        </p>
      ) : null}
    </section>
  );
}

export function TokenChecklist({ tokens }: TokenChecklistProps) {
  const [query, setQuery] = useState("");
  const [selectedTicker, setSelectedTicker] = useState(tokens[0]?.ticker ?? "");
  const lastGoodByTokenRef = useRef<
    Record<string, TokenChecklistApiResponse | undefined>
  >({});
  const [state, setState] = useState<ChecklistState>({
    data: null,
    error: null,
    loading: false,
    staleNotice: null,
  });
  const analysisAbortRef = useRef<AbortController | null>(null);

  const selectedToken =
    tokens.find((token) => token.ticker === selectedTicker) ?? tokens[0];
  const selectedLocked = selectedToken
    ? !canRunChecklistForSymbol(selectedToken.ticker)
    : false;
  const freeSymbolsText = getFreeChecklistSymbols().join(" и ");

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

    if (selectedLocked) {
      analysisAbortRef.current?.abort();
      setState({
        data: null,
        error: null,
        loading: false,
        staleNotice: null,
      });
      return;
    }

    const cached = readCachedData(selectedToken.ticker);
    const memoryData = lastGoodByTokenRef.current[selectedToken.ticker];
    const initialData = memoryData ?? cached ?? null;

    if (cached && !memoryData) {
      lastGoodByTokenRef.current = {
        ...lastGoodByTokenRef.current,
        [selectedToken.ticker]: cached,
      };
    }

    setState({
      data: null,
      error: null,
      loading: false,
      staleNotice: initialData ? "Есть сохранённый результат для этого токена." : null,
    });
  }, [selectedLocked, selectedToken]);

  useEffect(() => {
    return () => {
      analysisAbortRef.current?.abort();
    };
  }, []);

  const cachedResult = selectedToken
    ? selectedLocked
      ? null
      : lastGoodByTokenRef.current[selectedToken.ticker] ?? null
    : null;
  const analysisAccess = {
    analyzeMode: selectedLocked ? ("paid-ready" as const) : ("free" as const),
    canRunAnalysis: !selectedLocked,
    paymentRequired: false,
  };

  async function runTokenAnalysis({
    refresh = false,
    useLastGood = false,
  }: {
    refresh?: boolean;
    useLastGood?: boolean;
  } = {}) {
    if (!selectedToken || !analysisAccess.canRunAnalysis) {
      return;
    }

    const cached =
      lastGoodByTokenRef.current[selectedToken.ticker] ??
      readCachedData(selectedToken.ticker);

    if (useLastGood && cached) {
      setState({
        data: cached,
        error: null,
        loading: false,
        staleNotice: "Показан последний сохранённый результат.",
      });

      return;
    }

    analysisAbortRef.current?.abort();
    const controller = new AbortController();
    analysisAbortRef.current = controller;

    setState((previous) => ({
      ...previous,
      error: null,
      loading: true,
      staleNotice: previous.data
        ? "Проверяем свежие данные, пока оставляю последний результат на экране."
        : null,
    }));

    try {
      const params = new URLSearchParams({
        debug: "0",
        symbol: selectedToken.ticker,
      });

      if (refresh) {
        params.set("refresh", "1");
      }

      // В будущем здесь можно подключить Telegram Stars перед запуском runTokenAnalysis.
      const response = await fetch(`/api/token-checklist?${params}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const data = (await response.json()) as unknown;

      if (!response.ok || !isChecklistResponse(data) || !data.ok) {
        throw new Error("Не удалось проверить токен");
      }

      const previous =
        lastGoodByTokenRef.current[selectedToken.ticker] ??
        readCachedData(selectedToken.ticker);
      const shouldKeepPrevious =
        previous &&
        ((qualityRank(previous.dataQuality) > qualityRank(data.dataQuality) &&
          unlockQualityRank(previous.unlocks.confidence) >=
            unlockQualityRank(data.unlocks.confidence)) ||
          (hasPriceAndPumpData(previous) && !hasPriceAndPumpData(data)));
      const nextData = shouldKeepPrevious ? previous : data;

      if (nextData.dataQuality !== "fallback") {
        writeCachedData(nextData);
      }

      lastGoodByTokenRef.current = {
        ...lastGoodByTokenRef.current,
        [selectedToken.ticker]: nextData,
      };

      setState({
        data: nextData,
        error: null,
        loading: false,
        staleNotice: shouldKeepPrevious
          ? "Новый ответ слабее: показываю последние доступные данные."
          : data.dataQuality === "last-good"
            ? "Показаны последние доступные данные. Свежая проверка временно недоступна."
            : data.dataQuality === "fallback"
              ? "Данных недостаточно для полной оценки. Проверь позже."
              : data.dataQuality === "partial"
                ? "Часть данных недоступна, вывод приблизительный."
                : null,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      const fallbackData =
        lastGoodByTokenRef.current[selectedToken.ticker] ??
        readCachedData(selectedToken.ticker);

      setState({
        data: fallbackData ?? null,
        error:
          error instanceof Error
            ? error.message
            : "Данные временно недоступны",
        loading: false,
        staleNotice: fallbackData
          ? "Показаны последние доступные данные."
          : null,
      });
    }
  }

  if (!selectedToken) {
    return null;
  }

  const data = state.data;
  const change24h = data?.market.change24h;
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

      <section className="premium-card p-4">
        <div className="relative z-10 flex items-start gap-3">
          <TokenLogo
            logo={selectedToken.logo}
            ticker={selectedToken.ticker}
            title={selectedToken.title}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-black text-white">
                {selectedToken.ticker}
              </h2>
              <span className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-xs font-black text-zinc-300">
                {selectedToken.title}
              </span>
              <StatusBadge tone="green">{selectedToken.sector}</StatusBadge>
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {selectedToken.description}
            </p>
            <p className="mt-3 rounded-2xl border border-emerald-200/12 bg-emerald-300/[0.055] px-3 py-2 text-xs leading-5 text-emerald-100/85">
              Это обучающая проверка, не финансовая рекомендация.
            </p>
          </div>
        </div>
      </section>

      <section className="app-card p-4">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-zinc-500">
              режим анализа: {analysisAccess.analyzeMode}
            </p>
            <h2 className="mt-1 text-lg font-black text-white">
              Проверка запускается вручную
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Выбери токен и нажми кнопку: приложение проверит рынок, график,
              объём и ликвидность через server route.
            </p>
          </div>

          {selectedLocked ? (
            <div className="rounded-[22px] border border-amber-200/15 bg-amber-300/[0.07] p-4">
              <h3 className="text-base font-black text-amber-50">
                Расширенная проверка альтов временно закрыта
              </h3>
              <p className="mt-2 text-sm leading-6 text-amber-100/85">
                Сейчас бесплатно доступны {freeSymbolsText}. Анализ альтов скоро
                вернём в расширенном режиме.
              </p>
              <p className="mt-2 text-xs leading-5 text-amber-100/65">
                Код анализа сохранён, функция временно ограничена перед запуском.
              </p>
              <button className="secondary-button mt-3 justify-center" disabled type="button">
                Скоро откроем
              </button>
            </div>
          ) : (
            <div className="grid gap-2 min-[380px]:grid-cols-2">
              {cachedResult && !data ? (
                <button
                  className="secondary-button justify-center"
                  disabled={state.loading}
                  onClick={() => void runTokenAnalysis({ useLastGood: true })}
                  type="button"
                >
                  Показать последний результат
                </button>
              ) : null}

              <button
                className="primary-button justify-center"
                disabled={state.loading || !analysisAccess.canRunAnalysis}
                onClick={() => void runTokenAnalysis({ refresh: Boolean(data || cachedResult) })}
                type="button"
              >
                {state.loading
                  ? "Проверяем рынок, график, объём и ликвидность..."
                  : data || cachedResult
                    ? "Обновить проверку"
                    : "Проверить токен"}
              </button>
            </div>
          )}
        </div>
      </section>

      {state.loading && !data ? (
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

      {state.error && !data ? (
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

      {data ? (
        <>
          <DataStatusCard data={data} staleNotice={state.staleNotice} />

          {state.loading ? (
            <div className="rounded-[18px] border border-emerald-200/12 bg-emerald-300/[0.055] px-4 py-3 text-xs font-bold text-emerald-100/85">
              Данные обновляются…
            </div>
          ) : null}

          <section className="premium-card p-4">
            <div className="relative z-10 flex items-start gap-3">
              <TokenLogo
                logo={selectedToken.logo}
                remoteLogo={data.token.image}
                ticker={data.token.symbol}
                title={data.token.name}
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-black text-white">
                    {data.token.symbol}
                  </h2>
                  <span className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-xs font-black text-zinc-300">
                    {data.token.name}
                  </span>
                  <StatusBadge tone={riskTone(data.verdict.riskLevel)}>
                    {riskLabel(data.verdict.riskLevel)}
                  </StatusBadge>
                  <StatusBadge tone="neutral">
                    {dataQualityLabel(data.dataQuality)}
                  </StatusBadge>
                </div>

                <div className="mt-4 grid gap-3 min-[380px]:grid-cols-[auto_1fr]">
                  <div className="grid size-20 place-items-center rounded-[24px] border border-emerald-200/15 bg-emerald-300/[0.08] text-3xl font-black text-emerald-200 shadow-inner shadow-white/5">
                    {data.verdict.score}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-zinc-500">
                      score 0–100
                    </p>
                    <h3 className="mt-1 text-xl font-black leading-tight text-white">
                      {data.verdict.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      {data.verdict.text}
                    </p>
                  </div>
                </div>

                {data.verdict.badges.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {data.verdict.badges.map((badge) => (
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

          <section className="app-card p-4">
            <h2 className="text-lg font-black text-white">Цена и памп</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MetricCard label="Цена" value={formatUsdPrice(data.market.price)} />
              <MetricCard
                label="24ч"
                tone={positive24h ? "green" : "red"}
                value={formatPercent(change24h)}
              />
              <MetricCard label="7д" value={formatPercent(data.market.change7d)} />
              <MetricCard label="30д" value={formatPercent(data.market.change30d)} />
              <MetricCard label="Market Cap" value={formatMarketCap(data.market.marketCap)} />
              <MetricCard label="Volume" value={formatVolume(data.market.volume24h)} />
            </div>
            {data.sourceStatus.market !== "ok" ? (
              <p className="mt-3 text-xs leading-5 text-zinc-500">
                Цена и памп: часть данных временно недоступна, оценка приблизительная.
              </p>
            ) : null}
          </section>

          <div className="grid gap-4">
            <InsightCard title="Чем занимается проект">
              <p>{data.project.summaryRu}</p>
            </InsightCard>

            <InsightCard title="Сектор">
              <p className="font-bold text-emerald-100">{data.project.sectorRu}</p>
              <p className="mt-2">{data.project.sectorRiskRu}</p>
            </InsightCard>

            <InsightCard title="Техническая зона">
              <p className="font-bold text-white">
                {data.technical.position === "unknown"
                  ? "Технических данных недостаточно, оценка зоны приблизительная"
                  : data.technical.position === "hot"
                    ? "Зона выглядит горячей"
                    : data.technical.position === "cold"
                      ? "Зона охлаждённая, но это не готовый вывод"
                      : "Зона ближе к нейтральной"}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <MetricCard label="RSI 14" value={formatNumber(data.technical.rsi14)} />
                <MetricCard label="SMA 20" value={formatUsdPrice(data.technical.sma20)} />
                <MetricCard label="SMA 50" value={formatUsdPrice(data.technical.sma50)} />
                <MetricCard label="pump risk" value={riskLabel(data.technical.pumpRisk)} />
              </div>
            </InsightCard>

            <InsightCard title="Объём торгов">
              <p className="font-bold text-white">{data.volume.label}</p>
              <p className="mt-2">
                Volume / Market Cap: {formatRatioPercent(data.volume.volumeToMarketCap)}
              </p>
              <p className="mt-1">
                Оборот к эталону:{" "}
                {data.volume.benchmarkPercent === null
                  ? "—"
                  : `${formatCompactNumber(data.volume.benchmarkPercent)}% от нормального уровня`}
              </p>
              <p className="mt-2 text-xs text-zinc-500">{data.volume.explanation}</p>
            </InsightCard>

            <InsightCard title="Ликвидность">
              <p className="font-bold text-white">{data.liquidity.label}</p>
              <p className="mt-2">Score: {formatNumber(data.liquidity.score)}</p>
              <p className="mt-1">
                Benchmark:{" "}
                {data.liquidity.benchmarkPercent === null
                  ? "—"
                  : `${formatCompactNumber(data.liquidity.benchmarkPercent)}%`}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                {data.liquidity.explanation}
              </p>
            </InsightCard>

            <InsightCard title="Unlocks">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={data.unlocks.isAvailable ? "yellow" : "neutral"}>
                  {data.unlocks.label}
                </StatusBadge>
                <StatusBadge tone={unlockConfidenceTone(data.unlocks.confidence)}>
                  {unlockConfidenceLabel(data.unlocks.confidence)}
                </StatusBadge>
                <StatusBadge tone="neutral">{data.unlocks.provider}</StatusBadge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <MetricCard label="next unlock" value={data.unlocks.nextUnlockDate ?? "—"} />
                <MetricCard label="amount" value={formatCompactNumber(data.unlocks.nextUnlockAmount)} />
                <MetricCard label="% unlock" value={formatPercent(data.unlocks.nextUnlockPercent)} />
                <MetricCard
                  label="% market cap"
                  value={formatPercent(data.unlocks.nextUnlockMarketCapPercent)}
                />
                <MetricCard label="unlocked" value={formatPercent(data.unlocks.unlockedPercent)} />
                <MetricCard label="locked" value={formatPercent(data.unlocks.lockedPercent)} />
                <MetricCard
                  label="circ. supply"
                  value={formatPercent(data.unlocks.circulatingSupplyPercent)}
                />
              </div>
              {data.unlocks.rawTitle ? (
                <div className="mt-3 rounded-2xl border border-emerald-200/12 bg-emerald-300/[0.055] px-3 py-2 text-xs leading-5 text-emerald-100/85">
                  Найдено событие: {data.unlocks.rawTitle}
                  <br />
                  Размер не подтверждён API — проверь вручную.
                </div>
              ) : null}
              <p className="mt-3">{data.unlocks.explanation}</p>
              {data.unlocks.sourceUrl || data.unlocks.manualCheckUrls.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.unlocks.sourceUrl ? (
                    <a
                      className="secondary-button"
                      href={data.unlocks.sourceUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Источник
                    </a>
                  ) : null}
                  {data.unlocks.manualCheckUrls.map((link) => (
                    <a
                      className="secondary-button"
                      href={link.url}
                      key={`${link.label}-${link.url}`}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </InsightCard>

            <InsightCard title="Что проверить вручную">
              <div className="grid gap-2">
                {[
                  "Официальный сайт, тикер и контракт",
                  "Ближайшие unlocks и vesting",
                  "Новости, апгрейды и регуляторные события",
                  "Уровни на графике и реакция BTC",
                  "Качество биржевой ликвидности",
                ].map((item) => (
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
            <p className="mt-3 text-sm leading-6 text-zinc-200">
              {data.verdict.text}
            </p>
            <p className="mt-3 text-xs leading-5 text-zinc-500">
              Обновлено: {formatUpdatedAt(data.updatedAt)}. Это обучающий
              инструмент, а не финансовая рекомендация.
            </p>
          </section>

          <section className="grid gap-2">
            {data.verdict.factors.map((factor) => (
              <FactorRow factor={factor} key={`${factor.label}-${factor.text}`} />
            ))}
          </section>
        </>
      ) : null}
    </div>
  );
}
