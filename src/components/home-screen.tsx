"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { formatPercent, formatUsdPrice } from "@/lib/formatters";
import { getImpactLabel, getImpactTone, type RiskImpact } from "@/lib/riskCalendar";

const HOME_MAJOR_BTC_RESISTANCE = "$80,000–82,000";

type IconName = "bolt" | "hourglass" | "shield";
type HomeTone = "green" | "red" | "yellow";
type HomeDataStatus = "fallback" | "partial" | "ready";
type HomeLevelType =
  | "major_resistance"
  | "near_resistance"
  | "neutral"
  | "resistance_above"
  | "support";

type HomeLiveResponse = {
  action: {
    reason: string;
    status: string;
    tone: HomeTone;
    whatToWait: string;
  };
  dataStatus: HomeDataStatus;
  level: {
    distancePercent: number | null;
    label: string;
    text: string;
    title: string;
    type: HomeLevelType;
  };
  mainRisk: {
    affectedAssets: string[];
    category: string;
    description: string;
    impact: RiskImpact;
    time: string | null;
    title: string;
  };
  meta?: {
    actionReady?: boolean;
    calendarSource?: string;
    calendarUpdatedAt?: string | null;
    highEventsTodayCount?: number;
    levelReady?: boolean;
    localDate?: string;
    priceReady?: boolean;
    riskReady?: boolean;
    snapshotFallbackUsed?: boolean;
  };
  ok: boolean;
  price: {
    change24h: number | null;
    source: string;
    symbol: "BTC";
    updatedAt: string;
    value: number | null;
  };
};

type HomeSnapshotResponse = {
  btc?: {
    change24h?: number | null;
    price?: number | null;
  };
  btcChange24h?: number | null;
  btcLevel?: {
    currentPrice?: number | null;
    majorResistance?: {
      high?: number | null;
      label?: string | null;
      low?: number | null;
    };
  };
  btcPrice?: number | null;
  updatedAt?: string;
};

type HomeState = {
  data: HomeLiveResponse | null;
  error: string | null;
  loading: boolean;
};

function HomeIcon({ icon }: { icon: IconName }) {
  const common = {
    fill: "none",
    height: 24,
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.9,
    viewBox: "0 0 24 24",
    width: 24,
    "aria-hidden": true,
  };

  if (icon === "hourglass") {
    return (
      <svg {...common}>
        <path d="M7 4h10" />
        <path d="M7 20h10" />
        <path d="M8 4c0 4 8 4 8 8s-8 4-8 8" />
        <path d="M16 4c0 4-8 4-8 8s8 4 8 8" />
      </svg>
    );
  }

  if (icon === "shield") {
    return (
      <svg {...common}>
        <path d="M12 4 19 7v5c0 4.2-2.8 7.2-7 8-4.2-.8-7-3.8-7-8V7l7-3Z" />
        <path d="m9.5 12 1.7 1.7 3.5-4" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z" />
      <path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg
      aria-hidden
      className="size-4"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M20.7 4.4c.4-.2.9.1.8.6l-2.6 14.7c-.1.7-.9.9-1.4.5l-4.3-3.2-2.1 2c-.4.4-1 .2-1.1-.4l-.8-4-3.9-1.3c-.6-.2-.6-1 0-1.2zM10 14.2l.4 2 1.1-1.1 5.4-5.3c.2-.2-.1-.5-.3-.3z" />
    </svg>
  );
}

function HeroCrystal() {
  return (
    <div className="relative grid size-[76px] shrink-0 place-items-center rounded-full border border-emerald-200/20 bg-black/30 shadow-[0_0_34px_rgba(16,185,129,0.22)] min-[390px]:size-[84px]">
      <div className="absolute inset-2 rounded-full border border-emerald-300/10 bg-[radial-gradient(circle_at_42%_30%,rgba(167,243,208,0.17),transparent_42%)]" />
      <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_210deg,transparent,rgba(52,211,153,0.62),transparent_38%)] opacity-80" />
      <div className="relative h-11 w-9 rotate-45 rounded-[12px] border border-emerald-100/45 bg-[linear-gradient(135deg,rgba(220,252,231,0.92),rgba(16,185,129,0.2)_45%,rgba(20,184,166,0.9))] shadow-[0_0_30px_rgba(16,185,129,0.42)] min-[390px]:h-12 min-[390px]:w-10" />
      <div className="absolute h-[60px] w-[60px] rotate-45 border border-emerald-300/10 min-[390px]:h-16 min-[390px]:w-16" />
    </div>
  );
}

function numberOrNull(value: unknown) {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(/,/g, ""))
        : NaN;

  return Number.isFinite(number) ? number : null;
}

function BtcPriceCard({
  change24h,
  loading,
  partial,
  price,
}: {
  change24h: number | null;
  loading: boolean;
  partial: boolean;
  price: number | null;
}) {
  const positive = typeof change24h === "number" && change24h >= 0;
  const unavailable = !loading && price === null;

  return (
    <section className="btc-card relative overflow-hidden rounded-[28px] border border-emerald-200/18 bg-[linear-gradient(135deg,rgba(9,94,66,0.42),rgba(6,16,14,0.9)_46%,rgba(4,9,8,0.98))] px-3.5 py-3.5 shadow-[0_22px_56px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_28%,rgba(52,211,153,0.18),transparent_8.5rem),radial-gradient(circle_at_86%_12%,rgba(45,212,191,0.12),transparent_8rem)]" />

      <div className="relative z-10 flex items-center gap-3">
        <div className="grid size-[54px] shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#fbbf24,#f97316)] text-[2.15rem] font-black leading-none text-white shadow-[0_0_24px_rgba(251,146,60,0.28)]">
          ₿
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[1.35rem] font-black leading-tight text-white">
              Bitcoin
            </h2>
            <span className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-xs font-black text-zinc-300">
              BTC
            </span>
          </div>
          <p
            className={`mt-1 font-black leading-tight text-emerald-300 ${
              unavailable ? "text-[1.18rem]" : "text-[1.38rem] min-[390px]:text-[1.55rem]"
            }`}
          >
            {loading
              ? "Загрузка цены…"
              : unavailable
                ? "Цена обновляется"
                : formatUsdPrice(price)}
          </p>
        </div>

        <div className="hidden h-14 w-px bg-emerald-100/12 min-[360px]:block" />

        <div className="min-w-[88px] text-right">
          <p className="text-xs font-medium text-zinc-400">
            Изменение за 24ч
          </p>
          <p
            className={`mt-1 text-[1.32rem] font-black leading-tight ${
              typeof change24h !== "number" || loading || unavailable
                ? "text-zinc-400"
                : positive
                  ? "text-emerald-300"
                  : "text-rose-300"
            }`}
          >
            {loading || unavailable || typeof change24h !== "number"
              ? "—"
              : formatPercent(change24h)}
          </p>
        </div>
      </div>

      <p className="relative z-10 mt-2.5 flex items-center justify-end gap-2 text-xs font-medium text-zinc-400">
        <span className="size-3 rounded-full border border-emerald-300/75 shadow-[0_0_12px_rgba(52,211,153,0.35)]" />
        {unavailable
          ? "данные временно недоступны"
          : partial
            ? "данные частично обновлены"
            : "Обновляется автоматически"}
      </p>
    </section>
  );
}

function StatusRow({
  children,
  icon,
  label,
  tone = "green",
  value,
}: {
  children?: React.ReactNode;
  icon: IconName | "dollar";
  label: string;
  tone?: HomeTone;
  value: React.ReactNode;
}) {
  return (
    <article className="market-row flex items-center gap-3 p-2.5 min-[390px]:p-3">
      <span
        className={`icon-tile size-[50px] rounded-[17px] ${
          tone === "yellow" ? "text-amber-200" : tone === "red" ? "text-rose-200" : ""
        }`}
      >
        {icon === "dollar" ? (
          <span className="text-3xl font-black">$</span>
        ) : (
          <HomeIcon icon={icon} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-zinc-400">{label}</p>
        <div className="mt-0.5 text-[1.16rem] font-black leading-tight text-white">
          {value}
        </div>
        {children ? (
          <div className="mt-1 text-[12.5px] leading-[1.4] text-zinc-400">
            {children}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function iconForTone(tone: HomeTone): IconName {
  if (tone === "red") {
    return "shield";
  }

  if (tone === "green") {
    return "bolt";
  }

  return "hourglass";
}

function toneTextClass(tone: HomeTone) {
  if (tone === "red") {
    return "text-rose-300";
  }

  if (tone === "yellow") {
    return "text-amber-200";
  }

  return "text-emerald-300";
}

function extractSnapshotPrice(data: HomeSnapshotResponse) {
  return (
    numberOrNull(data.btcPrice) ??
    numberOrNull(data.btc?.price) ??
    numberOrNull(data.btcLevel?.currentPrice)
  );
}

function extractSnapshotChange24h(data: HomeSnapshotResponse) {
  return numberOrNull(data.btcChange24h) ?? numberOrNull(data.btc?.change24h);
}

function buildSnapshotFallback(data: HomeSnapshotResponse): HomeLiveResponse {
  const price = extractSnapshotPrice(data);
  const resistance = data.btcLevel?.majorResistance;
  const label =
    typeof resistance?.label === "string" && resistance.label.trim()
      ? resistance.label
      : HOME_MAJOR_BTC_RESISTANCE;

  return {
    action: {
      reason:
        "Live-проверка временно недоступна. Используем последний сохранённый снимок, поэтому не спешите с входом до обновления календаря.",
      status: "Данные обновляются",
      tone: "yellow",
      whatToWait: "Дождаться свежей проверки цены и событий дня.",
    },
    dataStatus: "fallback",
    level: {
      distancePercent: null,
      label,
      text:
        "Это сильная зона выше рынка. Live-проверка расстояния до уровня сейчас обновляется.",
      title: "Главное сопротивление выше",
      type: "resistance_above",
    },
    mainRisk: {
      affectedAssets: ["BTC", "ETH", "ALTS"],
      category: "macro",
      description:
        "Календарь событий обновляется. Не считаем рынок спокойным, пока live-проверка не завершилась.",
      impact: "medium",
      time: null,
      title: "Данные обновляются",
    },
    meta: {
      actionReady: false,
      levelReady: price !== null,
      priceReady: price !== null,
      riskReady: false,
      snapshotFallbackUsed: true,
    },
    ok: true,
    price: {
      change24h: extractSnapshotChange24h(data),
      source: "home-snapshot",
      symbol: "BTC",
      updatedAt: data.updatedAt ?? new Date().toISOString(),
      value: price,
    },
  };
}

const loadingData: HomeLiveResponse = {
  action: {
    reason:
      "Обновляем цену BTC, важные события и уровни. До загрузки данных не спешите с входом.",
    status: "Проверяю рынок…",
    tone: "yellow",
    whatToWait: "Дождаться полной проверки цены и календаря.",
  },
  dataStatus: "partial",
  level: {
    distancePercent: null,
    label: HOME_MAJOR_BTC_RESISTANCE,
    text: "Обновляем сильный уровень BTC.",
    title: "Уровень обновляется",
    type: "neutral",
  },
  mainRisk: {
    affectedAssets: ["BTC", "ETH", "ALTS"],
    category: "macro",
    description:
      "Обновляем календарь рисков. До проверки важных событий не спешите с входом.",
    impact: "medium",
    time: null,
    title: "Проверяем события дня…",
  },
  ok: true,
  price: {
    change24h: null,
    source: "loading",
    symbol: "BTC",
    updatedAt: new Date().toISOString(),
    value: null,
  },
};

export function HomeScreen() {
  const [state, setState] = useState<HomeState>({
    data: null,
    error: null,
    loading: true,
  });
  const data = state.data ?? loadingData;
  const action = data.action;
  const riskAssets = data.mainRisk.affectedAssets.join(" / ");
  const riskDescription = riskAssets
    ? `${riskAssets} · ${data.mainRisk.description}`
    : data.mainRisk.description;
  const partial = data.dataStatus !== "ready" || state.error !== null;

  useEffect(() => {
    let active = true;

    async function loadFallbackSnapshot() {
      const response = await fetch("/api/home-snapshot", {
        cache: "no-store",
      });
      const snapshot = (await response.json()) as HomeSnapshotResponse;

      return buildSnapshotFallback(snapshot);
    }

    async function loadHomeLive() {
      try {
        const response = await fetch("/api/home-live", {
          cache: "no-store",
        });
        const payload = (await response.json()) as HomeLiveResponse;

        if (!active) {
          return;
        }

        if (!response.ok || !payload.ok) {
          throw new Error("home-live-unavailable");
        }

        setState({
          data: payload,
          error: null,
          loading: false,
        });
      } catch {
        try {
          const fallback = await loadFallbackSnapshot();

          if (!active) {
            return;
          }

          setState({
            data: fallback,
            error: "Live-данные временно недоступны",
            loading: false,
          });
        } catch {
          if (!active) {
            return;
          }

          setState({
            data: loadingData,
            error: "Данные главной временно недоступны",
            loading: false,
          });
        }
      }
    }

    void loadHomeLive();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="home-v2 space-y-2.5 min-[390px]:space-y-3">
      <header className="hero-card relative overflow-hidden rounded-[34px] border border-emerald-100/10 bg-[rgba(3,10,9,0.5)] px-4 py-4 shadow-2xl shadow-black/35 min-[390px]:px-5">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_58%,rgba(52,211,153,0.15),transparent_9rem),radial-gradient(circle_at_72%_4%,rgba(45,212,191,0.16),transparent_12rem)]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(125,255,194,0.032)_1px,transparent_1px),linear-gradient(90deg,rgba(125,255,194,0.026)_1px,transparent_1px)] bg-[length:28px_28px] opacity-55 [mask-image:linear-gradient(180deg,#000,transparent_76%)]" />

        <div className="flex items-center gap-4 min-[390px]:gap-5">
          <HeroCrystal />
          <div className="min-w-0">
            <h1 className="text-[1.98rem] font-black leading-[1.04] text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.45)] min-[390px]:text-[2.18rem]">
              Крипта для новичков
            </h1>
            <p className="mt-2.5 text-[13px] leading-[1.55] text-zinc-300 min-[390px]:text-[14px]">
              Простые знания. Уверенные шаги.
              <br />
              Спокойный подход к рынку.
            </p>
            <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-sm font-semibold text-emerald-200 shadow-[0_0_26px_rgba(52,211,153,0.08)]">
              <TelegramIcon />
              Telegram Mini App
            </span>
          </div>
        </div>
      </header>

      <BtcPriceCard
        change24h={data.price.change24h}
        loading={state.loading && data.price.value === null}
        partial={partial}
        price={data.price.value}
      />

      <section className="premium-card px-3 py-3.5 min-[390px]:px-3.5">
        <div className="relative z-10 mb-3 flex items-center gap-3 pl-1">
          <span className="text-emerald-300 drop-shadow-[0_0_14px_rgba(52,211,153,0.4)]">
            <HomeIcon icon="bolt" />
          </span>
          <div>
            <h2 className="text-[1.58rem] font-black leading-tight text-white min-[390px]:text-[1.78rem]">
              Что делать сейчас?
            </h2>
            <p className="mt-0.5 text-[13px] text-zinc-400">
              Простой план на каждый день
            </p>
          </div>
        </div>

        {partial ? (
          <div className="relative z-10 mb-2 rounded-[18px] border border-amber-200/15 bg-amber-300/[0.055] px-3 py-2 text-xs font-semibold leading-5 text-amber-100/90">
            {state.loading
              ? "Проверяю рынок: цена, события дня и уровни обновляются."
              : "Данные частично обновлены. Не считаем вывод полностью свежим, пока live-проверка не восстановится."}
          </div>
        ) : null}

        <div className="relative z-10 grid gap-2">
          <StatusRow
            icon={iconForTone(action.tone)}
            label="Действие"
            tone={action.tone}
            value={
              <span className={toneTextClass(action.tone)}>
                {action.status}
              </span>
            }
          >
            <span className="block">{action.reason}</span>
            <span className="block text-zinc-500">Чего ждём: {action.whatToWait}</span>
          </StatusRow>

          <StatusRow
            icon="dollar"
            label={data.level.title}
            tone={data.level.type === "near_resistance" ? "yellow" : "green"}
            value={
              <span className="text-emerald-300">
                {data.level.label}
              </span>
            }
          >
            {data.level.text}
            {typeof data.level.distancePercent === "number" &&
            data.level.distancePercent > 0 ? (
              <span className="block text-zinc-500">
                До нижней границы: {data.level.distancePercent.toFixed(1)}%.
              </span>
            ) : null}
          </StatusRow>

          <StatusRow
            icon="shield"
            label="Риск по BTC"
            tone={getImpactTone(data.mainRisk.impact)}
            value={
              <span className="flex flex-wrap items-center gap-2">
                {data.mainRisk.title}
                <StatusBadge tone={getImpactTone(data.mainRisk.impact)}>
                  {getImpactLabel(data.mainRisk.impact)}
                </StatusBadge>
              </span>
            }
          >
            {riskDescription}
          </StatusRow>
        </div>
      </section>
    </div>
  );
}
