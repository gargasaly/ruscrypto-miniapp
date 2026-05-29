"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import {
  portfolioDiaryCategories,
  portfolioDiaryModel,
  portfolioDiarySymbols,
  type PortfolioDiaryCategory,
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
  reason: string;
  signals: {
    liquidityRisk: string;
    macroRisk: string;
    pumpRisk: string;
    score: number | null;
    technicalRisk: string;
    tokenomicsRisk: string;
  };
  symbol: string;
};

type DiaryCheckResponse = {
  assets: DiaryCheckAsset[];
  checkedAt: string;
  ok: boolean;
  priceStars?: number;
  reason?: string;
  requiresPro?: boolean;
  product?: string;
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
  const [devAdmin, setDevAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initData, setInitData] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, PricePoint | undefined>>({});
  const [priceError, setPriceError] = useState<string | null>(null);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [checkResult, setCheckResult] = useState<DiaryCheckResponse | null>(null);
  const [checking, setChecking] = useState(false);
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
  const visibleCheckResult = hasPortfolioPro ? checkResult : null;
  const checkBySymbol = useMemo(() => {
    return new Map((visibleCheckResult?.assets ?? []).map((asset) => [asset.symbol, asset]));
  }, [visibleCheckResult]);

  async function saveDiary({
    showMessage = true,
  }: {
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
          cashUsd: parseInputNumber(cashUsd),
          initData,
          positions: portfolioDiaryModel.map((asset) => ({
            amount: parseInputNumber(amounts[asset.symbol] ?? ""),
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

      setLastUpdatedAt(payload.updatedAt ?? new Date().toISOString());
      if (showMessage) {
        setSaveMessage("Портфель сохранён");
      }
      trackEvent("portfolio_saved", {
        eventTarget: "portfolio_diary",
        metadata: {
          assets: portfolioDiaryModel.length,
          cryptoTotalUsd: calculated.cryptoTotalUsd,
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

  async function checkPortfolio() {
    if (!hasPortfolioPro) {
      setProMessage("Проверка портфеля доступна в Portfolio Pro.");
      trackEvent("portfolio_pro_paywall_view", {
        eventTarget: "portfolio_diary_check",
      });
      return;
    }

    setChecking(true);
    setSaveMessage(null);
    setError(null);
    trackEvent("portfolio_check_started", {
      eventTarget: "portfolio_diary",
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

      if (response.status === 402 || payload.requiresPro) {
        setProMessage("Проверка портфеля доступна в Portfolio Pro.");
        trackEvent("portfolio_pro_paywall_view", {
          eventTarget: "portfolio_diary_check",
        });
        return;
      }

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
        },
      });
      setSaveMessage("Портфель сохранён и проверен");
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

  const proStatusLabel = isAdminPro
    ? "Admin Pro"
    : hasPortfolioPro
      ? `Portfolio Pro активен до ${formatDateTime(proStatus?.expiresAt)}`
      : proLoading
        ? "Проверяем Portfolio Pro..."
        : "Portfolio Pro не активен";

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
          Введите количество активов и кэш в $. Дневник сравнит вашу структуру с модельным
          долгосрочным портфелем.
        </p>
        <p className="mt-3 text-xs text-zinc-500">
          Последнее обновление: {formatDateTime(lastUpdatedAt)}
        </p>
        {isAdminPro ? (
          <div className="mt-3">
            <StatusBadge tone="green">Admin bypass</StatusBadge>
          </div>
        ) : null}
      </header>

      <section className="app-card p-4">
        <h2 className="text-lg font-black text-white">Моя структура</h2>
        <div className="mt-3 grid gap-2 min-[520px]:grid-cols-3">
          <div className="mini-card p-3">
            <p className="text-xs font-bold uppercase text-emerald-200/70">Crypto-часть</p>
            <p className="mt-2 text-2xl font-black text-white">
              {formatUsd(calculated.cryptoTotalUsd)}
            </p>
          </div>
          <label className="mini-card block p-3">
            <span className="text-xs font-bold uppercase text-emerald-200/70">Кэш в $</span>
            <input
              className="search-input mt-2"
              inputMode="decimal"
              min={0}
              onChange={(event) => setCashUsd(event.target.value)}
              placeholder="0"
              type="text"
              value={cashUsd}
            />
          </label>
          <div className="mini-card p-3">
            <p className="text-xs font-bold uppercase text-emerald-200/70">С кэшем</p>
            <p className="mt-2 text-2xl font-black text-white">
              {formatUsd(calculated.totalWithCashUsd)}
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
        <h2 className="text-lg font-black text-white">Категории</h2>
        <div className="mt-3 grid gap-2">
          {calculated.categories.map((category) => (
            <article className="mini-card p-3" key={category.id}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-black text-white">{category.label}</p>
                  <p className="mt-1 text-xs text-zinc-500">{formatUsd(category.valueUsd)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-100">
                    У вас: {formatPercent(category.actualWeight)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Модель: {formatPercent(category.targetWeight, 0)}
                  </p>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-300 to-emerald-300"
                  style={{ width: `${Math.min(100, category.actualWeight)}%` }}
                />
              </div>
            </article>
          ))}
          <article className="mini-card p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-black text-white">Cash</p>
                <p className="mt-1 text-xs text-zinc-500">Отдельно от crypto-модели</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-100">
                  {formatUsd(calculated.cash)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatPercent(calculated.cashWeight)} от общего объёма
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="app-card p-4">
        {visibleCheckResult ? (
          <div className="mb-4 rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.08] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-white">Проверка портфеля</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Последняя проверка: {formatDateTime(visibleCheckResult.checkedAt)}
                </p>
              </div>
              <StatusBadge tone="green">{isAdminPro ? "Admin Pro" : "Portfolio Pro"}</StatusBadge>
            </div>
            <div className="mt-3 grid gap-2 min-[520px]:grid-cols-3">
              <div className="mini-card p-3">
                <p className="text-xs text-zinc-500">Можно докупать</p>
                <p className="mt-1 text-2xl font-black text-emerald-100">
                  {visibleCheckResult.summary.buyCount}
                </p>
              </div>
              <div className="mini-card p-3">
                <p className="text-xs text-zinc-500">Снять часть в кэш</p>
                <p className="mt-1 text-2xl font-black text-amber-100">
                  {visibleCheckResult.summary.cashOutCount}
                </p>
              </div>
              <div className="mini-card p-3">
                <p className="text-xs text-zinc-500">Не трогать</p>
                <p className="mt-1 text-2xl font-black text-white">
                  {visibleCheckResult.summary.holdCount}
                </p>
              </div>
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black text-white">Активы</h2>
          {pricesLoading ? <StatusBadge tone="neutral">Цены обновляются</StatusBadge> : null}
        </div>
        <div className="mt-3 grid gap-3">
          {calculated.rows.map((row) => (
            <article className="mini-card min-w-0 p-4" key={row.symbol}>
              {(() => {
                const check = checkBySymbol.get(row.symbol);
                const actionTone =
                  check?.action === "buy"
                    ? "green"
                    : check?.action === "cash_out"
                      ? "yellow"
                      : "neutral";

                return (
                  <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-black text-white">{row.symbol}</h3>
                    <StatusBadge tone="neutral">{row.categoryLabel}</StatusBadge>
                  </div>
                  <p className="mt-1 text-sm text-zinc-400">{row.name}</p>
                </div>
                <StatusBadge tone={row.status.tone}>{row.status.label}</StatusBadge>
              </div>

              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-medium text-zinc-300">Количество</span>
                <input
                  className="search-input"
                  inputMode="decimal"
                  min={0}
                  onChange={(event) =>
                    setAmounts((previous) => ({
                      ...previous,
                      [row.symbol]: event.target.value,
                    }))
                  }
                  placeholder="0"
                  type="text"
                  value={amounts[row.symbol] ?? ""}
                />
              </label>

              <div className="mt-3 grid gap-2 min-[430px]:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                  <p className="text-xs text-zinc-500">Цена</p>
                  <p className="mt-1 font-bold text-white">
                    {row.price === null ? "Цена обновляется" : formatUsd(row.price, 4)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                  <p className="text-xs text-zinc-500">Стоимость</p>
                  <p className="mt-1 font-bold text-white">{formatUsd(row.valueUsd, 2)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                  <p className="text-xs text-zinc-500">У вас</p>
                  <p className="mt-1 font-bold text-white">{formatPercent(row.actualWeight)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                  <p className="text-xs text-zinc-500">Модель</p>
                  <p className="mt-1 font-bold text-white">{formatPercent(row.targetWeight)}</p>
                </div>
              </div>
              {check ? (
                <div className="mt-3 rounded-2xl border border-emerald-200/15 bg-emerald-300/[0.06] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase text-emerald-200/70">Действие</p>
                    <StatusBadge tone={actionTone}>{check.actionLabel}</StatusBadge>
                  </div>
                  {check.cashOutRange ? (
                    <p className="mt-2 text-sm font-bold text-amber-100">
                      Диапазон: {check.cashOutRange} позиции
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm leading-6 text-zinc-300">{check.reason}</p>
                  <p className="mt-2 text-xs text-zinc-500">
                    Score: {check.signals.score ?? "—"} · Pump: {check.signals.pumpRisk} ·
                    Liquidity: {check.signals.liquidityRisk}
                  </p>
                </div>
              ) : null}
                  </>
                );
              })()}
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
        {!hasPortfolioPro ? (
          <div className="mb-3 rounded-[22px] border border-amber-200/15 bg-amber-300/[0.07] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-amber-50">Portfolio Pro</h2>
                <p className="mt-2 text-sm leading-6 text-amber-100/85">
                  Проверка портфеля + безлимитный чек-лист на 7 дней.
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
        <div className={`grid gap-2 ${hasPortfolioPro ? "min-[520px]:grid-cols-3" : "min-[520px]:grid-cols-2"}`}>
          <button
            className="primary-button w-full"
            disabled={saving || checking}
            onClick={() => void saveDiary()}
            type="button"
          >
            {saving ? "Сохраняем…" : "Сохранить портфель"}
          </button>
          {hasPortfolioPro ? (
            <button
              className="w-full rounded-2xl border border-emerald-200/20 bg-emerald-300/[0.12] px-4 py-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-300/[0.18] disabled:opacity-60"
              disabled={saving || checking}
              onClick={checkPortfolio}
              type="button"
            >
              {checking ? "Проверяем…" : "Проверить портфель"}
            </button>
          ) : null}
          <button
            className="w-full rounded-2xl border border-emerald-200/20 bg-emerald-300/[0.08] px-4 py-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-300/[0.13]"
            disabled={pricesLoading || checking}
            onClick={loadPrices}
            type="button"
          >
            {pricesLoading ? "Обновляем…" : "Обновить цены"}
          </button>
        </div>
      </section>

      <div className="rounded-[20px] border border-amber-300/20 bg-amber-300/[0.08] px-4 py-3 text-sm leading-5 text-amber-100">
        Это только структурное сравнение с моделью, не торговое действие.
      </div>
    </div>
  );
}
