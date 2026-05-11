"use client";

import { StatusBadge } from "@/components/status-badge";
import { useRiskData } from "@/hooks/use-risk-data";
import {
  categoryLabels,
  getImpactTone,
  getRiskWeekDates,
  type RiskEvent,
} from "@/lib/riskCalendar";

function AssetPill({ asset }: { asset: string }) {
  return (
    <span className="rounded-full border border-emerald-200/12 bg-emerald-300/[0.055] px-2.5 py-1 text-[11px] font-bold text-emerald-100/80">
      {asset}
    </span>
  );
}

function NoMajorEventsCard() {
  return (
    <article className="mini-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-white">
            Крупных событий не найдено
          </h3>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Следим за BTC, BTC.D, ETF-потоками и общей реакцией рынка.
          </p>
        </div>
        <StatusBadge tone="green">🟢 Низкое влияние</StatusBadge>
      </div>
    </article>
  );
}

function sourceStatusLabel(status: RiskEvent["status"]) {
  if (status === "auto") {
    return "авто";
  }

  if (status === "manual") {
    return "ручное";
  }

  if (status === "live") {
    return "live";
  }

  return "fallback";
}

function MoreLocalEventsCard({ count }: { count: number }) {
  return (
    <div className="mini-card px-4 py-3 text-sm font-bold text-zinc-400">
      Ещё {count} локальных событий
    </div>
  );
}

function isLimitedLowEvent(event: RiskEvent) {
  return (
    event.impact === "low" &&
    (event.marketRelevance === "local" || event.marketRelevance === "unknown")
  );
}

function RiskEventCard({ event }: { event: RiskEvent }) {
  return (
    <article className="app-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-zinc-500">
            {event.time ?? "время уточняется"} · {categoryLabels[event.category]}
          </p>
          <h2 className="mt-1 text-lg font-black leading-snug text-white">
            {event.title}
          </h2>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <StatusBadge tone={getImpactTone(event.impact)}>
            {event.impactLabel}
          </StatusBadge>
          {event.marketRelevanceLabel ? (
            <StatusBadge tone="neutral">{event.marketRelevanceLabel}</StatusBadge>
          ) : null}
          <StatusBadge tone="neutral">{sourceStatusLabel(event.status)}</StatusBadge>
        </div>
      </div>

      {event.affectedAssets.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {event.affectedAssets.map((asset) => (
            <AssetPill asset={asset} key={asset} />
          ))}
        </div>
      ) : null}

      <p className="mt-3 text-sm leading-6 text-zinc-400">
        {event.whatIsIt ?? event.description ?? event.whyItMatters}
      </p>

      {event.affectedTokenNote ? (
        <p className="mt-2 text-xs leading-5 text-zinc-500">
          {event.affectedTokenNote}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3">
        {event.positiveScenario ? (
          <div className="mini-card p-3">
            <p className="text-xs font-bold uppercase text-emerald-200">
              Позитивный сценарий
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              {event.positiveScenario}
            </p>
          </div>
        ) : null}

        {event.negativeScenario ? (
          <div className="mini-card p-3">
            <p className="text-xs font-bold uppercase text-amber-200">
              Негативный сценарий
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              {event.negativeScenario}
            </p>
          </div>
        ) : null}
      </div>

      {event.source ? (
        <p className="mt-4 text-xs text-zinc-500">
          Источник:{" "}
          {event.sourceUrl ? (
            <a
              className="font-bold text-emerald-200"
              href={event.sourceUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {event.source}
            </a>
          ) : (
            event.source
          )}
        </p>
      ) : null}
    </article>
  );
}

export function RiskCalendarBrowser() {
  const { events } = useRiskData();
  const weekDates = getRiskWeekDates();

  return (
    <section className="space-y-5">
      {weekDates.map((dateInfo) => {
        const dateEvents = events.filter((event) => event.date === dateInfo.date);
        const realEvents = dateEvents.filter((event) => event.status !== "fallback");
        const visibleEvents: RiskEvent[] = [];
        let lowLocalCount = 0;
        let hiddenLowLocalCount = 0;

        realEvents.forEach((event) => {
          if (!isLimitedLowEvent(event)) {
            visibleEvents.push(event);
            return;
          }

          lowLocalCount += 1;

          if (lowLocalCount <= 5) {
            visibleEvents.push(event);
            return;
          }

          hiddenLowLocalCount += 1;
        });
        const groupTitle = `${dateInfo.weekday ?? ""}, ${
          dateInfo.readableDate ?? dateInfo.date
        }`;

        return (
          <div className="space-y-3" key={dateInfo.date}>
            <div className="flex items-center gap-3">
              <span className="h-8 w-1.5 rounded-full bg-gradient-to-b from-emerald-300 to-teal-300" />
              <h2 className="text-xl font-black capitalize text-white">
                {groupTitle}
              </h2>
            </div>

            <div className="grid gap-3">
              {visibleEvents.length > 0 ? (
                <>
                  {visibleEvents.map((event) => (
                    <RiskEventCard event={event} key={event.id} />
                  ))}
                  {hiddenLowLocalCount > 0 ? (
                    <MoreLocalEventsCard count={hiddenLowLocalCount} />
                  ) : null}
                </>
              ) : (
                <NoMajorEventsCard />
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
