"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import {
  portfolioDiaryCategories,
  portfolioDiaryModel,
  portfolioDiarySymbols,
} from "@/lib/portfolio/diaryModel";
import { trackEvent } from "@/lib/analytics/client";
import {
  getTelegramInitData,
  openTelegramInvoice,
  watchTelegramInitData,
} from "@/lib/telegram/webapp";

type DiaryAccessState = "loading" | "allowed" | "locked" | "error";

type DiaryPosition = {
  amount: number;
  symbol: string;
};

type DiaryResponse = {
  cashUsd?: number;
  lastUpdatedAt?: string | null;
  locked?: boolean;
  ok: boolean;
  positions?: DiaryPosition[];
  reason?: string;
};

type PricePoint = {
  change24h: number | null;
  price: number | null;
  source: string;
  updatedAt: string;
};

type PricesResponse = {
  ok: boolean;
  prices: Record<string, PricePoint | undefined>;
};

type DiaryCheckAction = "buy" | "cash_out" | "hold";

type DiaryCheckAsset = {
  action: DiaryCheckAction;
  actionLabel: string;
  cashOutRange: string | null;
  cashOutReasons: string[];
  cashOutSignal: boolean;
  checklistScore: number | null;
  checklistSource: "checklist" | "fallback" | "missing";
  coverage: number;
  currentWeight: number;
  reason: string;
  signals: {
    liquidityRisk: string;
    macroRisk: string;
    pumpRisk: string;
    score: number | null;
    technicalRisk: string;
    tokenomicsRisk: string;
  };
  structureStatus: "above" | "below" | "near";
  symbol: string;
  targetWeight: number;
};

type DiaryCheckResponse = {
  assets: DiaryCheckAsset[];
  checkedAt: string;
  lockedAssets?: string[];
  mode?: "admin" | "free" | "pro";
  ok: boolean;
  priceStars?: number;
  product?: string;
  reason?: string;
  recommendations?: {
    buy: DiaryCheckAsset[];
    cashOut: DiaryCheckAsset[];
    hold: DiaryCheckAsset[];
  };
  requiresPro?: boolean;
  summary: {
    buyCount: number;
    cashOutCount: number;
    holdCount: number;
  };
};

type ProStatusResponse = {
  daysLeft: number | null;
  expiresAt: string | null;
  hasPro: boolean;
  isAdmin: boolean;
  ok: boolean;
  product: "portfolio_pro_7d";
  reason?: string;
};

type ProBuyResponse = {
  error?: string;
  invoiceLink?: string;
  ok?: boolean;
  product?: {
    days: number;
    product: string;
    stars: number;
    title: string;
  };
};

const symbolsQuery = portfolioDiarySymbols.join(",");

function safeNumber(value: unknown, fallback = 0) {
  const numberValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function formatUsd(value: number, maximumFractionDigits = 0) {
  const safeValue = safeNumber(value);
  const safeMaximum = Math.max(0, safeNumber(maximumFractionDigits));
  const minimumFractionDigits =
    safeMaximum > 0 && safeValue > 0 && safeValue < 10 ? Math.min(2, safeMaximum) : 0;

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: safeMaximum,
    minimumFractionDigits,
    style: "currency",
  }).format(safeValue);
}

function formatPercent(value: number | null | undefined, digits = 1) {
  const safeValue = safeNumber(value, NaN);

  if (!Number.isFinite(safeValue)) {
    return "—";
  }

  return `${safeValue.toFixed(Math.max(0, safeNumber(digits, 1)))}%`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function parseInputNumber(value: string) {
  if (!value.trim()) {
    return 0;
  }

  const parsed = Number(value.replace(",", "."));

  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function amountToInput(value: number | null | undefined) {
  if (!value || !Number.isFinite(value)) {
    return "";
  }

  return String(value);
}

function buildInitialAmounts() {
  return Object.fromEntries(portfolioDiaryModel.map((asset) => [asset.symbol, ""]));
}

function getStructureStatus(actualWeight: number, targetWeight: number) {
  const band = Math.max(0.5, targetWeight * 0.1);

  if (actualWeight < targetWeight - band) {
    return {
      label: "Ниже модели",
      tone: "yellow" as const,
    };
  }

  if (actualWeight > targetWeight + band) {
    return {
      label: "Выше модели",
      tone: "yellow" as const,
    };
  }

  return {
    label: "Около модели",
    tone: "green" as const,
  };
}

function diaryUrl(devAdmin: boolean) {
  return `/api/portfolio/diary${devAdmin ? "?admin=1" : ""}`;
}

function diaryCheckUrl(devAdmin: boolean) {
  return `/api/portfolio/diary/check${devAdmin ? "?admin=1" : ""}`;
}

function proStatusUrl(devAdmin: boolean) {
  return `/api/portfolio/pro-status${devAdmin ? "?admin=1" : ""}`;
}

export function PortfolioDiary() {
  const [accessState, setAccessState] = useState<DiaryAccessState>("loading");
  const [amounts, setAmounts] = useState<Record<string, string>>(() => buildInitialAmounts());
  const [cashUsd, setCashUsd] = useState("");
  const [checkResult, setCheckResult] = useState<DiaryCheckResponse | null>(null);
  const [checking, setChecking] = useState(false);
  const [devAdmin, setDevAdmin] = useState(false);
  const [draftAmounts, setDraftAmounts] = useState<Record<string, string>>(() =>
    buildInitialAmounts(),
  );
  const [draftCashUsd, setDraftCashUsd] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initData, setInitData] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, PricePoint | undefined>>({});
  const [priceError, setPriceError] = useState<string | null>(null);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [proLoading, setProLoading] = useState(true);
  const [proMessage, setProMessage] = useState<string | null>(null);
  const [proPaymentLoading, setProPaymentLoading] = useState(false);
  const [proStatus, setProStatus] = useState<ProStatusResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const hasPortfolioPro = devAdmin || proStatus?.hasPro === true;
  const isAdminPro = devAdmin || proStatus?.isAdmin === true;

  async function loadDiary(nextInitData = initData, nextDevAdmin = devAdmin) {
    setError(null);

    try {
      const headers: HeadersInit = nextInitData
        ? { "x-telegram-init-data": nextInitData }
        : {};
      const response = await fetch(diaryUrl(nextDevAdmin), {
        cache: "no-store",
        headers,
      });
      const payload = (await response.json()) as DiaryResponse;

      if (response.status === 403 || payload.locked) {
        setAccessState("locked");
        return;
      }

      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.reason ?? "diary-load-failed");
      }

      const nextAmounts = buildInitialAmounts();

      for (const position of payload.positions ?? []) {
        if (position.symbol in nextAmounts) {
          nextAmounts[position.symbol] = amountToInput(position.amount);
        }
      }

      setAmounts(nextAmounts);
      setCashUsd(amountToInput(payload.cashUsd ?? 0));
      setLastUpdatedAt(payload.lastUpdatedAt ?? null);
      setAccessState("allowed");
    } catch (caught) {
      setAccessState("error");
      setError(caught instanceof Error ? caught.message : "diary-load-failed");
    }
  }

  async function loadPrices() {
    setPricesLoading(true);
    setPriceError(null);

    try {
      const response = await fetch(`/api/prices?symbols=${symbolsQuery}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as PricesResponse;

      setPrices(payload.prices ?? {});

      if (!response.ok || payload.ok !== true) {
        setPriceError("Часть цен временно обновляется");
      }
    } catch {
      setPriceError("Цены временно обновляются");
    } finally {
      setPricesLoading(false);
    }
  }

  async function loadProStatus(nextInitData = initData, nextDevAdmin = devAdmin) {
    setProLoading(true);

    try {
      const headers: HeadersInit = nextInitData
        ? { "x-telegram-init-data": nextInitData }
        : {};
      const response = await fetch(proStatusUrl(nextDevAdmin), {
        cache: "no-store",
        headers,
      });
      const payload = (await response.json()) as ProStatusResponse;

      if (response.ok && payload.ok === true) {
        setProStatus(payload);
        return payload;
      }

      setProStatus({
        daysLeft: null,
        expiresAt: null,
        hasPro: false,
        isAdmin: false,
        ok: false,
        product: "portfolio_pro_7d",
        reason: payload.reason ?? "pro-status-unavailable",
      });
      return null;
    } catch (caught) {
      setProStatus({
        daysLeft: null,
        expiresAt: null,
        hasPro: false,
        isAdmin: false,
        ok: false,
        product: "portfolio_pro_7d",
        reason: caught instanceof Error ? caught.message : "pro-status-unavailable",
      });
      return null;
    } finally {
      setProLoading(false);
    }
  }

  async function refreshProStatusWithRetry() {
    const maxAttempts = 5;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const status = await loadProStatus(initData, devAdmin);

      if (status?.hasPro) {
        setProMessage("Pro активирован на 7 дней");
        return status;
      }

      if (attempt < maxAttempts) {
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
      }
    }

    setProMessage("Платёж обрабатывается. Обновите статус через несколько секунд.");
    return null;
  }

  useEffect(() => {
    trackEvent("portfolio_diary_open", {
      eventTarget: "portfolio_diary",
    });

    const localDevAdmin =
      process.env.NODE_ENV === "development" &&
      new URLSearchParams(window.location.search).get("admin") === "1";

    setDevAdmin(localDevAdmin);

    if (localDevAdmin) {
      void loadDiary("", true);
      void loadProStatus("", true);
    } else {
      const currentInitData = getTelegramInitData();

      if (currentInitData) {
        setInitData(currentInitData);
        void loadDiary(currentInitData, false);
        void loadProStatus(currentInitData, false);
      } else {
        const stopWatching = watchTelegramInitData((value) => {
          setInitData(value);
          void loadDiary(value, false);
          void loadProStatus(value, false);
        });
        const fallbackTimer = window.setTimeout(() => {
          void loadDiary("", false);
          void loadProStatus("", false);
        }, 1800);

        return () => {
          stopWatching();
          window.clearTimeout(fallbackTimer);
        };
      }
    }
  }, []);

  useEffect(() => {
    void loadPrices();
  }, []);

  useEffect(() => {
    if (accessState === "allowed" && proStatus && !hasPortfolioPro) {
      trackEvent("portfolio_pro_paywall_view", {
        eventTarget: "portfolio_diary",
      });
    }
  }, [accessState, hasPortfolioPro, proStatus]);

  const calculated = useMemo(() => {
    const rows = portfolioDiaryModel.map((asset) => {
      const amount = parseInputNumber(amounts[asset.symbol] ?? "");
      const rawPrice = prices[asset.symbol]?.price;
      const price =
        typeof rawPrice === "number" && Number.isFinite(rawPrice) ? rawPrice : null;
      const valueUsd = safeNumber(amount * (price ?? 0));

      return {
        ...asset,
        amount,
        missingPrice: amount > 0 && price === null,
        price,
        valueUsd,
      };
    });
    const cryptoTotalUsd = safeNumber(rows.reduce((sum, row) => sum + row.valueUsd, 0));
    const cash = parseInputNumber(cashUsd);
    const totalWithCashUsd = safeNumber(cryptoTotalUsd + cash);
    const rowsWithWeights = rows.map((row) => {
      const actualWeight =
        cryptoTotalUsd > 0 ? safeNumber((row.valueUsd / cryptoTotalUsd) * 100) : 0;

      return {
        ...row,
        actualWeight,
        status: getStructureStatus(actualWeight, row.targetWeight),
      };
    });
    const categories = portfolioDiaryCategories.map((category) => {
      const valueUsd = rowsWithWeights
        .filter((row) => row.category === category.id)
        .reduce((sum, row) => sum + row.valueUsd, 0);

      return {
        ...category,
        actualWeight: cryptoTotalUsd > 0 ? safeNumber((valueUsd / cryptoTotalUsd) * 100) : 0,
        valueUsd,
      };
    });

    return {
      cash,
      cashWeight: totalWithCashUsd > 0 ? safeNumber((cash / totalWithCashUsd) * 100) : 0,
      categories,
      cryptoTotalUsd,
      missingPrices: rowsWithWeights.filter((row) => row.missingPrice).length,
      rows: rowsWithWeights,
      totalWithCashUsd,
    };
  }, [amounts, cashUsd, prices]);
  const visibleCheckResult = checkResult;
  const recommendations = useMemo(() => {
    const assets = visibleCheckResult?.assets ?? [];

    return (
      visibleCheckResult?.recommendations ?? {
        buy: assets.filter((asset) => asset.action === "buy"),
        cashOut: assets.filter((asset) => asset.action === "cash_out"),
        hold: assets.filter((asset) => asset.action === "hold"),
      }
    );
  }, [visibleCheckResult]);
  const latestPriceUpdatedAt = useMemo(() => {
    return (
      Object.values(prices)
        .map((price) => price?.updatedAt)
        .filter(Boolean)
        .sort()
        .at(-1) ?? null
    );
  }, [prices]);

  function openEditor() {
    setDraftAmounts(amounts);
    setDraftCashUsd(cashUsd);
    setEditorOpen(true);
  }

  async function saveDiary({
    nextAmounts = amounts,
    nextCashUsd = cashUsd,
    showMessage = true,
  }: {
    nextAmounts?: Record<string, string>;
    nextCashUsd?: string;
    showMessage?: boolean;
  } = {}) {
    setSaving(true);
    if (showMessage) {
      setSaveMessage(null);
    }
    setError(null);

    try {
      const response = await fetch(diaryUrl(devAdmin), {
        body: JSON.stringify({
          cashUsd: parseInputNumber(nextCashUsd),
          initData,
          positions: portfolioDiaryModel.map((asset) => ({
            amount: parseInputNumber(nextAmounts[asset.symbol] ?? ""),
            symbol: asset.symbol,
          })),
        }),
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          ...(initData ? { "x-telegram-init-data": initData } : {}),
        },
        method: "POST",
      });
      const payload = (await response.json()) as { ok: boolean; reason?: string; updatedAt?: string };

      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.reason ?? "diary-save-failed");
      }

      setAmounts(nextAmounts);
      setCashUsd(nextCashUsd);
      setCheckResult(null);
      setLastUpdatedAt(payload.updatedAt ?? new Date().toISOString());
      if (showMessage) {
        setSaveMessage("Портфель сохранён");
      }
      trackEvent("portfolio_saved", {
        eventTarget: "portfolio_diary",
        metadata: {
          assets: portfolioDiaryModel.length,
        },
      });
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "diary-save-failed");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveDraftPortfolio() {
    const saved = await saveDiary({
      nextAmounts: draftAmounts,
      nextCashUsd: draftCashUsd,
    });

    if (saved) {
      setEditorOpen(false);
    }
  }

  async function checkPortfolio() {
    setChecking(true);
    setSaveMessage(null);
    setError(null);
    trackEvent("portfolio_check_started", {
      eventTarget: hasPortfolioPro ? "portfolio_diary" : "portfolio_diary_free",
    });

    try {
      const saved = await saveDiary({ showMessage: false });

      if (!saved) {
        return;
      }

      const response = await fetch(diaryCheckUrl(devAdmin), {
        body: JSON.stringify({ initData }),
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          ...(initData ? { "x-telegram-init-data": initData } : {}),
        },
        method: "POST",
      });
      const payload = (await response.json()) as DiaryCheckResponse;

      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.reason ?? "portfolio-check-failed");
      }

      setCheckResult(payload);
      trackEvent("portfolio_check_completed", {
        eventTarget: "portfolio_diary",
        metadata: {
          buyCount: payload.summary.buyCount,
          cashOutCount: payload.summary.cashOutCount,
          holdCount: payload.summary.holdCount,
          mode: payload.mode,
        },
      });
      setSaveMessage(
        payload.mode === "free" ? "BTC/ETH проверены бесплатно" : "Портфель сохранён и проверен",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "portfolio-check-failed");
    } finally {
      setChecking(false);
    }
  }

  async function buyPortfolioPro() {
    if (isAdminPro) {
      setProMessage("Admin Pro активен без оплаты.");
      return;
    }

    if (!initData) {
      setProMessage("Откройте Mini App через Telegram, чтобы оплатить Pro.");
      return;
    }

    setProPaymentLoading(true);
    setProMessage(null);
    trackEvent("portfolio_pro_payment_started", {
      eventTarget: "portfolio_pro_7d",
    });

    try {
      const response = await fetch("/api/portfolio/pro-buy", {
        body: JSON.stringify({ initData }),
        cache: "no-store",
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as ProBuyResponse;

      if (!response.ok || payload.ok !== true || !payload.invoiceLink) {
        throw new Error(payload.error ?? "portfolio-pro-invoice-failed");
      }

      setProMessage("Счёт открыт в Telegram. После оплаты статус обновится.");
      openTelegramInvoice(payload.invoiceLink, (status) => {
        if (status === "paid") {
          trackEvent("portfolio_pro_payment_success", {
            eventTarget: "portfolio_pro_7d",
          });
          setProMessage("Платёж получен, обновляем Pro-статус...");
          void refreshProStatusWithRetry();
          return;
        }

        if (status === "cancelled" || status === "failed") {
          trackEvent("portfolio_pro_payment_failed", {
            eventTarget: "portfolio_pro_7d",
            metadata: {
              status,
            },
          });
          setProMessage("Оплата не завершена.");
        }
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "portfolio-pro-payment-failed";

      trackEvent("portfolio_pro_payment_failed", {
        eventTarget: "portfolio_pro_7d",
        metadata: {
          message,
        },
      });
      setProMessage(`Не удалось открыть оплату: ${message}`);
    } finally {
      setProPaymentLoading(false);
    }
  }

  function renderRecommendationCard(asset: DiaryCheckAsset, compact = false) {
    const tone =
      asset.action === "buy" ? "green" : asset.action === "cash_out" ? "yellow" : "neutral";

    return (
      <article className="rounded-2xl border border-white/10 bg-black/15 p-3" key={asset.symbol}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-base font-black text-white">{asset.symbol}</p>
            <p className="mt-1 text-xs text-zinc-500">
              Доля: {formatPercent(asset.currentWeight)} / модель{" "}
              {formatPercent(asset.targetWeight)}
            </p>
          </div>
          <StatusBadge tone={tone}>{asset.actionLabel}</StatusBadge>
        </div>
        {compact ? (
          <details className="mt-2 text-sm text-zinc-300">
            <summary className="cursor-pointer text-xs font-bold text-emerald-100">
              Причина
            </summary>
            <p className="mt-2 leading-6">{asset.reason}</p>
          </details>
        ) : (
          <>
            {asset.cashOutRange ? (
              <p className="mt-2 text-sm font-bold text-amber-100">
                Диапазон: {asset.cashOutRange}
              </p>
            ) : null}
            <p className="mt-2 text-sm leading-6 text-zinc-300">{asset.reason}</p>
            {asset.action === "cash_out" && asset.cashOutReasons.length > 0 ? (
              <ul className="mt-2 space-y-1 text-xs leading-5 text-amber-50/85">
                {asset.cashOutReasons.slice(0, 3).map((reason) => (
                  <li key={reason}>• {reason}</li>
                ))}
              </ul>
            ) : null}
          </>
        )}
        <p className="mt-2 text-xs text-zinc-500">
          Чек-лист:{" "}
          {typeof asset.checklistScore === "number" ? `${asset.checklistScore}/100` : "обновляется"}
        </p>
      </article>
    );
  }

  function renderRecommendationGroup(
    title: string,
    assets: DiaryCheckAsset[],
    emptyText: string,
    compact = false,
  ) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-black text-white">{title}</h3>
          <StatusBadge tone="neutral">{assets.length}</StatusBadge>
        </div>
        <div className="mt-3 grid gap-2">
          {assets.length > 0 ? (
            assets.map((asset) => renderRecommendationCard(asset, compact))
          ) : (
            <p className="text-sm text-zinc-500">{emptyText}</p>
          )}
        </div>
      </div>
    );
  }

  const proStatusLabel = isAdminPro
    ? "Admin Pro"
    : hasPortfolioPro
      ? `Portfolio Pro активен до ${formatDateTime(proStatus?.expiresAt)}`
      : proLoading
        ? "Проверяем Portfolio Pro..."
        : "Portfolio Pro не активен";
  const priceStatusLabel = pricesLoading
    ? "Цены обновляются автоматически"
    : latestPriceUpdatedAt
      ? `Цены обновлены: ${formatDateTime(latestPriceUpdatedAt)}`
      : "Данные обновляются автоматически";

  if (accessState === "loading") {
    return (
      <section className="app-card p-5">
        <StatusBadge tone={hasPortfolioPro ? "green" : "yellow"}>{proStatusLabel}</StatusBadge>
        <h1 className="mt-4 text-3xl font-black text-white">Портфельный дневник</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Загружаем сохранённую структуру и проверяем Pro-статус.
        </p>
      </section>
    );
  }

  if (accessState === "locked") {
    return (
      <section className="app-card p-5">
        <StatusBadge tone="yellow">Telegram access</StatusBadge>
        <h1 className="mt-4 text-3xl font-black text-white">Портфельный дневник</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Откройте Mini App через Telegram, чтобы сохранить личный портфель.
        </p>
      </section>
    );
  }

  if (accessState === "error") {
    return (
      <section className="app-card p-5">
        <StatusBadge tone="red">Ошибка</StatusBadge>
        <h1 className="mt-4 text-3xl font-black text-white">Портфельный дневник</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Не удалось загрузить дневник. Проверьте Supabase-таблицы и попробуйте ещё раз.
        </p>
        {error ? <p className="mt-3 text-xs text-rose-200">{error}</p> : null}
        <button className="primary-button mt-4 w-full" onClick={() => loadDiary()} type="button">
          Повторить
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <header className="premium-card p-5">
        <StatusBadge tone={hasPortfolioPro ? "green" : "yellow"}>{proStatusLabel}</StatusBadge>
        <h1 className="mt-4 text-3xl font-black leading-tight text-white">
          Портфельный дневник
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          Введите количество активов и кэш в $. Дневник покажет структуру портфеля и сравнит её с
          моделью.
        </p>
        <p className="mt-3 text-xs text-zinc-500">
          Последнее сохранение: {formatDateTime(lastUpdatedAt)}
        </p>
        {isAdminPro ? (
          <div className="mt-3">
            <StatusBadge tone="green">Admin bypass</StatusBadge>
          </div>
        ) : null}
      </header>

      <section className="app-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-white">Структура портфеля</h2>
            <p className="mt-1 text-xs text-zinc-500">{priceStatusLabel}</p>
          </div>
          <button
            className="rounded-2xl border border-emerald-200/20 bg-emerald-300/[0.1] px-4 py-2 text-sm font-black text-emerald-100"
            onClick={openEditor}
            type="button"
          >
            Внести количество активов
          </button>
        </div>

        <div className="mt-4 grid gap-2 min-[430px]:grid-cols-3">
          <div className="mini-card p-3">
            <p className="text-xs font-bold uppercase text-emerald-200/70">Всего</p>
            <p className="mt-1 text-xl font-black text-white">
              {formatUsd(calculated.totalWithCashUsd)}
            </p>
          </div>
          <div className="mini-card p-3">
            <p className="text-xs font-bold uppercase text-emerald-200/70">Crypto</p>
            <p className="mt-1 text-xl font-black text-white">
              {formatUsd(calculated.cryptoTotalUsd)}
            </p>
          </div>
          <div className="mini-card p-3">
            <p className="text-xs font-bold uppercase text-emerald-200/70">Кэш</p>
            <p className="mt-1 text-xl font-black text-white">{formatUsd(calculated.cash)}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {calculated.categories.map((category) => (
            <div className="rounded-2xl border border-white/10 bg-black/15 p-3" key={category.id}>
              <p className="text-xs text-zinc-500">{category.label}</p>
              <p className="mt-1 text-lg font-black text-emerald-100">
                {formatPercent(category.actualWeight)}
              </p>
            </div>
          ))}
          <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
            <p className="text-xs text-zinc-500">Cash</p>
            <p className="mt-1 text-lg font-black text-emerald-100">
              {formatPercent(calculated.cashWeight)}
            </p>
          </div>
        </div>

        {calculated.cryptoTotalUsd <= 0 ? (
          <p className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.08] px-4 py-3 text-sm leading-6 text-amber-100">
            Добавьте количество активов, чтобы увидеть структуру портфеля.
          </p>
        ) : null}
        {calculated.missingPrices > 0 || priceError ? (
          <p className="mt-3 text-xs leading-5 text-zinc-500">
            {priceError ?? "Часть цен временно обновляется"}: позиции без цены не учитываются в
            текущей стоимости.
          </p>
        ) : null}
      </section>

      <section className="app-card p-4">
        <h2 className="text-lg font-black text-white">Что у меня есть</h2>
        <div className="mt-3 divide-y divide-white/10 overflow-hidden rounded-3xl border border-white/10 bg-black/10">
          {calculated.rows.map((row) => (
            <article className="min-w-0 px-4 py-3" key={row.symbol}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-black text-white">{row.symbol}</h3>
                    <StatusBadge tone="neutral">{row.categoryLabel}</StatusBadge>
                  </div>
                  <p className="mt-1 truncate text-xs text-zinc-500">{row.name}</p>
                </div>
                <p className="shrink-0 text-right text-base font-black text-white">
                  {formatUsd(row.valueUsd, 2)}
                </p>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                <span>
                  Доля {formatPercent(row.actualWeight)} · Модель{" "}
                  {formatPercent(row.targetWeight)}
                </span>
                <StatusBadge tone={row.status.tone}>{row.status.label}</StatusBadge>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="app-card p-4">
        {saveMessage ? (
          <p className="mb-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08] px-4 py-3 text-sm font-bold text-emerald-100">
            {saveMessage}
          </p>
        ) : null}
        {error ? <p className="mb-3 text-sm text-rose-200">{error}</p> : null}
        {proMessage ? (
          <p className="mb-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08] px-4 py-3 text-sm font-bold text-emerald-100">
            {proMessage}
          </p>
        ) : null}

        <h2 className="text-lg font-black text-white">Что с этим делать</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-400">
          {hasPortfolioPro
            ? "Полная проверка использует чек-лист по всем активам модели."
            : "Без Pro можно бесплатно проверить BTC и ETH. Остальные активы откроются в Portfolio Pro."}
        </p>
        <button
          className="primary-button mt-4 w-full justify-center"
          disabled={saving || checking}
          onClick={checkPortfolio}
          type="button"
        >
          {checking
            ? "Проверяем…"
            : hasPortfolioPro
              ? "Проверить портфель"
              : "Проверить BTC/ETH бесплатно"}
        </button>

        {!hasPortfolioPro ? (
          <div className="mt-3 rounded-[22px] border border-amber-200/15 bg-amber-300/[0.07] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-amber-50">Portfolio Pro</h3>
                <p className="mt-2 text-sm leading-6 text-amber-100/85">
                  Полная проверка портфеля и безлимитный чек-лист на 7 дней.
                </p>
              </div>
              <StatusBadge tone="yellow">100 ⭐ / 7 дней</StatusBadge>
            </div>
            <button
              className="primary-button mt-4 w-full justify-center"
              disabled={proPaymentLoading || proLoading}
              onClick={() => void buyPortfolioPro()}
              type="button"
            >
              {proPaymentLoading ? "Открываем оплату..." : "Открыть Pro за 100 ⭐"}
            </button>
          </div>
        ) : null}
      </section>

      {visibleCheckResult ? (
        <section className="app-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white">Рекомендации</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Последняя проверка: {formatDateTime(visibleCheckResult.checkedAt)}
              </p>
            </div>
            <StatusBadge tone={visibleCheckResult.mode === "free" ? "yellow" : "green"}>
              {visibleCheckResult.mode === "free"
                ? "BTC/ETH free"
                : isAdminPro
                  ? "Admin Pro"
                  : "Portfolio Pro"}
            </StatusBadge>
          </div>

          <div className="mt-4 grid gap-3">
            {renderRecommendationGroup(
              "Можно докупать",
              recommendations.buy,
              "Сейчас нет активов с сигналом для докупки.",
            )}
            {renderRecommendationGroup(
              "Снять часть в кэш",
              recommendations.cashOut,
              "Сейчас нет активов с кэш-сигналом.",
            )}
            {renderRecommendationGroup(
              "Не трогать",
              recommendations.hold,
              "Нет активов в этой группе.",
              true,
            )}
          </div>

          {visibleCheckResult.mode === "free" ? (
            <div className="mt-4 rounded-[22px] border border-amber-200/15 bg-amber-300/[0.07] p-4">
              <h3 className="font-black text-amber-50">Полная проверка портфеля</h3>
              <p className="mt-2 text-sm leading-6 text-amber-100/85">
                Откройте Portfolio Pro, чтобы получить рекомендации по SOL, BNB, LINK, AAVE,
                HYPE и другим активам.
              </p>
              {visibleCheckResult.lockedAssets?.length ? (
                <p className="mt-2 text-xs text-amber-100/70">
                  Закрыто за Pro: {visibleCheckResult.lockedAssets.join(", ")}
                </p>
              ) : null}
              <button
                className="primary-button mt-4 w-full justify-center"
                disabled={proPaymentLoading || proLoading}
                onClick={() => void buyPortfolioPro()}
                type="button"
              >
                Открыть Pro
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="rounded-[20px] border border-amber-300/20 bg-amber-300/[0.08] px-4 py-3 text-sm leading-5 text-amber-100">
        Это структурное сравнение с моделью и чек-листом, не торговая команда.
      </div>

      {editorOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-[80] overflow-y-auto bg-[#07110d] px-4 py-4"
          role="dialog"
        >
          <div className="mx-auto flex min-h-full max-w-xl flex-col pb-8">
            <div className="sticky top-0 z-10 -mx-4 border-b border-white/10 bg-[#07110d]/95 px-4 py-3 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-white">Внести количество активов</h2>
                  <p className="mt-1 text-xs text-zinc-500">Кэш и активы модели, без Watchlist.</p>
                </div>
                <button
                  className="rounded-full border border-white/10 px-3 py-2 text-sm font-bold text-zinc-200"
                  onClick={() => setEditorOpen(false)}
                  type="button"
                >
                  Отмена
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="app-card block p-4">
                <span className="text-sm font-bold text-zinc-200">Кэш в $</span>
                <input
                  className="search-input mt-2"
                  inputMode="decimal"
                  min={0}
                  onChange={(event) => setDraftCashUsd(event.target.value)}
                  placeholder="0"
                  type="text"
                  value={draftCashUsd}
                />
              </label>

              {portfolioDiaryModel.map((asset) => (
                <label
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                  key={asset.symbol}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span>
                      <span className="block font-black text-white">{asset.symbol}</span>
                      <span className="mt-1 block text-xs text-zinc-500">{asset.name}</span>
                    </span>
                    <StatusBadge tone="neutral">{formatPercent(asset.targetWeight)}</StatusBadge>
                  </span>
                  <input
                    className="search-input mt-3"
                    inputMode="decimal"
                    min={0}
                    onChange={(event) =>
                      setDraftAmounts((previous) => ({
                        ...previous,
                        [asset.symbol]: event.target.value,
                      }))
                    }
                    placeholder="0"
                    type="text"
                    value={draftAmounts[asset.symbol] ?? ""}
                  />
                </label>
              ))}
            </div>

            <div className="sticky bottom-0 mt-4 grid gap-2 border-t border-white/10 bg-[#07110d]/95 py-3 backdrop-blur">
              <button
                className="primary-button w-full justify-center"
                disabled={saving}
                onClick={() => void saveDraftPortfolio()}
                type="button"
              >
                {saving ? "Сохраняем…" : "Сохранить портфель"}
              </button>
              <button
                className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-zinc-200"
                disabled={saving}
                onClick={() => setEditorOpen(false)}
                type="button"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
