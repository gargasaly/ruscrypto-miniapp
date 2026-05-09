import Link from "next/link";
import { Disclaimer } from "@/components/disclaimer";
import { StatusBadge } from "@/components/status-badge";
import { homeQuickAccess, pageHeaders, quickAccessCards } from "@/lib/content";
import { marketStatus } from "@/lib/marketStatus";

type IconName =
  | "bolt"
  | "chart"
  | "hourglass"
  | "landmark"
  | "rocket"
  | "shield";

function impactTone(impact: string) {
  if (impact === "high") {
    return "red" as const;
  }

  if (impact === "low") {
    return "green" as const;
  }

  return "yellow" as const;
}

function impactLabel(impact: string) {
  if (impact === "high") {
    return "🔴 Высокое влияние";
  }

  if (impact === "low") {
    return "🟢 Низкое влияние";
  }

  return "🟡 Среднее влияние";
}

function splitQuickTitle(title: string) {
  const [, ...rest] = title.split(" ");

  return rest.length > 0 ? rest.join(" ") : title;
}

function iconForTitle(title: string): IconName {
  if (title.includes("Старт")) {
    return "rocket";
  }

  if (title.includes("Биржи")) {
    return "landmark";
  }

  if (title.includes("Рынок")) {
    return "chart";
  }

  return "bolt";
}

function HomeIcon({ icon }: { icon: IconName }) {
  const common = {
    fill: "none",
    height: 26,
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
    width: 26,
    "aria-hidden": true,
  };

  if (icon === "rocket") {
    return (
      <svg {...common}>
        <path d="M14 4c2.8.5 4.8 2.5 5.4 5.3L14 14.7 9.3 10 14 4Z" />
        <path d="m9 15-2.8 2.8" />
        <path d="M9.3 10H6.2L4 12.2l3.4 1" />
        <path d="M14 14.7v3.1L11.8 20l-1-3.4" />
      </svg>
    );
  }

  if (icon === "landmark") {
    return (
      <svg {...common}>
        <path d="M4 10h16" />
        <path d="M6 10v8" />
        <path d="M10 10v8" />
        <path d="M14 10v8" />
        <path d="M18 10v8" />
        <path d="M3 18h18" />
        <path d="m12 4 8 4H4l8-4Z" />
      </svg>
    );
  }

  if (icon === "chart") {
    return (
      <svg {...common}>
        <path d="M4 19h16" />
        <path d="M5 15l4-4 3 3 6-7" />
        <path d="M16 7h2v2" />
      </svg>
    );
  }

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
      <path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z" />
    </svg>
  );
}

export default function Home() {
  const marketCard = quickAccessCards.find((card) => card.links);
  const directCards = quickAccessCards.filter((card) => card.href);

  return (
    <div className="space-y-7">
      <header className="relative overflow-hidden rounded-[32px] border border-emerald-200/10 bg-[rgba(5,13,12,0.56)] p-5 shadow-2xl shadow-black/35">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_16%,rgba(74,222,128,0.22),transparent_12rem)]" />
        <div className="absolute right-5 top-8 -z-10 h-36 w-32 rounded-full border border-emerald-200/10 bg-[linear-gradient(150deg,rgba(74,222,128,0.14),rgba(20,184,166,0.04))] blur-[1px]" />

        <div className="flex items-center gap-4">
          <div className="grid size-20 shrink-0 place-items-center rounded-full border border-emerald-200/20 bg-emerald-300/10 shadow-inner shadow-emerald-100/10">
            <div className="grid size-12 place-items-center rounded-[18px] border border-emerald-200/20 bg-emerald-300/10 text-emerald-200">
              <HomeIcon icon="shield" />
            </div>
          </div>

          <div className="min-w-0">
            <span className="eyebrow-pill">{pageHeaders.home.eyebrow}</span>
            <h1 className="mt-3 text-[2.1rem] font-black leading-[1.02] text-white">
              {pageHeaders.home.title}
            </h1>
          </div>
        </div>

        <p className="mt-5 max-w-[24ch] text-[15px] leading-7 text-zinc-300">
          Простые знания. Уверенные шаги. Спокойный подход к рынку.
        </p>
      </header>

      <section className="premium-card p-4">
        <div className="relative z-10 mb-4 flex items-center gap-3">
          <span className="icon-tile size-11 rounded-[16px]">
            <HomeIcon icon="bolt" />
          </span>
          <h2 className="text-[1.55rem] font-black text-white">
            Что делать сейчас?
          </h2>
        </div>

        <div className="relative z-10 grid gap-3">
          <article className="market-row flex items-center gap-3 p-3.5">
            <span className="icon-tile">
              <HomeIcon icon="hourglass" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-zinc-400">Действие</p>
              <p className="mt-0.5 text-xl font-black text-emerald-300">
                {marketStatus.action}
              </p>
              <p className="mt-1 text-[13px] leading-5 text-zinc-400">
                {marketStatus.actionDescription}
              </p>
            </div>
            <span className="chevron-soft">›</span>
          </article>

          <article className="market-row flex items-center gap-3 p-3.5">
            <span className="icon-tile">
              <span className="text-xl font-black">$</span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-zinc-400">Ключевой уровень BTC</p>
              <p className="mt-0.5 text-xl font-black text-emerald-300">
                {marketStatus.btcKeyLevel}
              </p>
              <p className="mt-1 text-[13px] leading-5 text-zinc-400">
                {marketStatus.btcKeyLevelDescription}
              </p>
            </div>
            <span className="chevron-soft">›</span>
          </article>

          <article className="market-row flex items-center gap-3 p-3.5">
            <span className="icon-tile text-amber-200">
              <HomeIcon icon="shield" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-zinc-400">Риск дня</p>
                <StatusBadge tone={impactTone(marketStatus.riskDayImpact)}>
                  {impactLabel(marketStatus.riskDayImpact)}
                </StatusBadge>
              </div>
              <p className="mt-1 text-base font-bold text-white">
                {marketStatus.riskDay}
              </p>
              <p className="mt-1 text-[13px] leading-5 text-zinc-400">
                {marketStatus.riskDayDescription}
              </p>
            </div>
            <span className="chevron-soft">›</span>
          </article>
        </div>

        <p className="relative z-10 mt-4 text-xs text-zinc-500">
          Последнее обновление: {marketStatus.updatedAt}
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-emerald-300">
            <HomeIcon icon="bolt" />
          </span>
          <div>
            <h2 className="text-2xl font-black text-white">
              {homeQuickAccess.title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-zinc-400">
              {homeQuickAccess.description}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {directCards.map((card) => {
            const title = splitQuickTitle(card.title);

            return (
              <Link
                className="glass-card tap-card group flex min-h-[188px] flex-col justify-between p-4"
                href={card.href ?? "/guides"}
                key={card.title}
              >
                <span className="icon-tile">
                  <HomeIcon icon={iconForTitle(card.title)} />
                </span>
                <div>
                  <h3 className="text-[1.05rem] font-black leading-tight text-white">
                    {title}
                  </h3>
                  <p className="mt-2 text-[13px] leading-5 text-zinc-400">
                    {card.description}
                  </p>
                </div>
                <span className="chevron-soft self-end">›</span>
              </Link>
            );
          })}
        </div>

        {marketCard ? (
          <article className="section-card relative overflow-hidden p-4">
            <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/45 to-transparent" />
            <div className="flex items-start gap-3">
              <span className="icon-tile">
                <HomeIcon icon="chart" />
              </span>
              <div>
                <h3 className="text-xl font-black text-white">
                  {splitQuickTitle(marketCard.title)}
                </h3>
                <p className="mt-1 text-sm leading-6 text-zinc-400">
                  {marketCard.description}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {marketCard.links?.map((link) => (
                <Link className="secondary-button justify-between" href={link.href} key={link.href}>
                  <span>{link.label}</span>
                  <span className="text-emerald-300" aria-hidden>
                    ›
                  </span>
                </Link>
              ))}
            </div>
          </article>
        ) : null}
      </section>

      <Disclaimer />
    </div>
  );
}
