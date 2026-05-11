"use client";

import { StatusBadge } from "@/components/status-badge";
import { useBtcLevel } from "@/hooks/use-btc-level";
import { useMarketData } from "@/hooks/use-market-data";
import { useRiskData } from "@/hooks/use-risk-data";
import { btcLevelConfidenceLabel, btcLevelTypeLabel } from "@/lib/btcLevel";
import { formatPercent, formatUsdPrice } from "@/lib/formatters";
import { getImpactTone } from "@/lib/riskCalendar";
import { marketStatus } from "@/lib/marketStatus";

type IconName = "bolt" | "hourglass" | "shield";

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

function BtcPriceCard() {
  const { coinsById, error, loading } = useMarketData();
  const bitcoin = coinsById.get("bitcoin");
  const change = bitcoin?.price_change_percentage_24h;
  const positive = typeof change === "number" && change >= 0;
  const unavailable = !loading && (!bitcoin || error);

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
          <p className={`mt-1 font-black leading-tight text-emerald-300 ${
            unavailable ? "text-[1.18rem]" : "text-[1.38rem] min-[390px]:text-[1.55rem]"
          }`}>
            {loading
              ? "Загрузка цены…"
              : unavailable
                ? marketStatus.btcKeyLevel
                : formatUsdPrice(bitcoin?.current_price)}
          </p>
        </div>

        <div className="hidden h-14 w-px bg-emerald-100/12 min-[360px]:block" />

        <div className="min-w-[88px] text-right">
          <p className="text-xs font-medium text-zinc-400">
            Изменение за 24ч
          </p>
          <p
            className={`mt-1 text-[1.32rem] font-black leading-tight ${
              typeof change !== "number" || loading || unavailable
                ? "text-zinc-400"
                : positive
                  ? "text-emerald-300"
                  : "text-rose-300"
            }`}
          >
            {loading || unavailable ? "—" : formatPercent(change)}
          </p>
        </div>
      </div>

      <p className="relative z-10 mt-2.5 flex items-center justify-end gap-2 text-xs font-medium text-zinc-400">
        <span className="size-3 rounded-full border border-emerald-300/75 shadow-[0_0_12px_rgba(52,211,153,0.35)]" />
        {unavailable ? "данные временно недоступны" : "Обновляется автоматически"}
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
  tone?: "green" | "yellow";
  value: React.ReactNode;
}) {
  return (
    <article className="market-row flex items-center gap-3 p-2.5 min-[390px]:p-3">
      <span
        className={`icon-tile size-[50px] rounded-[17px] ${
          tone === "yellow" ? "text-amber-200" : ""
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
          <p className="mt-1 text-[12.5px] leading-[1.4] text-zinc-400">
            {children}
          </p>
        ) : null}
      </div>
      <span className="chevron-soft">›</span>
    </article>
  );
}

function formatLevelUpdatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function HomeScreen() {
  const { data: btcLevel, error: btcLevelError, loading: btcLevelLoading } = useBtcLevel();
  const { mainRisk } = useRiskData();
  const riskAssets = mainRisk.affectedAssets.join(" / ");
  const riskDescription = riskAssets
    ? `${riskAssets} · ${mainRisk.whyItMatters}`
    : mainRisk.whyItMatters;

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

      <BtcPriceCard />

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

        <div className="relative z-10 grid gap-2">
          <StatusRow
            icon="hourglass"
            label="Действие"
            value={<span className="text-emerald-300">{marketStatus.action}</span>}
          >
            Пока рынок без уверенного сигнала, лучше не спешить с покупками.
          </StatusRow>

          <StatusRow
            icon="dollar"
            label="Ключевой уровень BTC"
            value={
              <span className="text-emerald-300">
                {btcLevelLoading ? marketStatus.btcKeyLevel : btcLevel.keyLevelRange}
              </span>
            }
          >
            {btcLevelLoading
              ? "Уровень рассчитывается по свечам и объёму."
              : `${btcLevelTypeLabel(btcLevel.type)} · ${btcLevelConfidenceLabel(
                  btcLevel.confidence,
                )} · обновлено ${formatLevelUpdatedAt(btcLevel.updatedAt)}. ${
                  btcLevelError
                    ? "Уровень временно рассчитан по резервным данным."
                    : `Выше: ${btcLevel.bullishScenario} Ниже: ${btcLevel.bearishScenario}`
                }`}
          </StatusRow>

          <StatusRow
            icon="shield"
            label="Риск по BTC"
            tone="yellow"
            value={
              <span className="flex flex-wrap items-center gap-2">
                {mainRisk.title}
                <StatusBadge tone={getImpactTone(mainRisk.impact)}>
                  {mainRisk.impactLabel}
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
