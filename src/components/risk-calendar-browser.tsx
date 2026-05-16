"use client";

import { useState } from "react";
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

function isMainEvent(event: RiskEvent) {
  if (event.impact === "high" || event.impact === "medium") {
    return true;
  }

  if (event.marketRelevance === "market-wide" || event.category === "macro") {
    return true;
  }

  if (event.affectedAssets.includes("BTC") || event.affectedAssets.includes("ETH")) {
    return true;
  }

  return false;
}

function timeRank(time?: string) {
  if (!time) {
    return "99:99";
  }

  return /^\d{2}:\d{2}$/.test(time) ? time : "99:99";
}

function mainSortPriority(event: RiskEvent) {
  const impact = event.impact === "high" ? 500 : event.impact === "medium" ? 350 : 100;
  const category = event.category === "macro" ? 80 : 0;
  const relevance = event.marketRelevance === "market-wide" ? 50 : 0;
  const timed = event.time ? 10 : 0;

  return impact + category + relevance + timed;
}

function localSortPriority(event: RiskEvent) {
  const watchlist = event.marketRelevance === "watchlist-token" ? 100 : 0;
  const tokenSpecific =
    event.affectedAssets.length > 0 && !event.affectedAssets.includes("ALTS") ? 40 : 0;

  return watchlist + tokenSpecific;
}

function sortMainEvents(events: RiskEvent[]) {
  return [...events].sort((left, right) => {
    const priorityDiff = mainSortPriority(right) - mainSortPriority(left);

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return timeRank(left.time).localeCompare(timeRank(right.time));
  });
}

function sortLocalEvents(events: RiskEvent[]) {
  return [...events].sort((left, right) => {
    const priorityDiff = localSortPriority(right) - localSortPriority(left);

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return timeRank(left.time).localeCompare(timeRank(right.time));
  });
}

function RiskEventCard({
  compact = false,
  event,
}: {
  compact?: boolean;
  event: RiskEvent;
}) {
  return (
    <article className={compact ? "mini-card p-3" : "app-card p-4"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-zinc-500">
            {event.time ?? "время уточняется"} · {categoryLabels[event.category]}
          </p>
          <h2
            className={`mt-1 font-black leading-snug text-white ${
              compact ? "text-base" : "text-lg"
            }`}
          >
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

      {!compact ? (
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
      ) : null}

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

function MoreLocalEventsAccordion({
  count,
  events,
}: {
  count: number;
  events: RiskEvent[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <button
        className="mini-card flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-bold text-zinc-300 transition hover:border-emerald-200/20 hover:text-emerald-100"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span>{open ? "Скрыть локальные события" : `Ещё ${count} локальных событий`}</span>
        <span className={`text-lg text-emerald-300 transition ${open ? "rotate-180" : ""}`}>
          v
        </span>
      </button>

      {open ? (
        <div className="grid gap-2">
          {events.map((event) => (
            <RiskEventCard compact event={event} key={event.id} />
          ))}
        </div>
      ) : null}
    </div>
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
        const mainEvents = sortMainEvents(realEvents.filter(isMainEvent));
        const localLowEvents = sortLocalEvents(
          realEvents.filter((event) => !isMainEvent(event)),
        );
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
              {mainEvents.length > 0 ? (
                mainEvents.map((event) => (
                  <RiskEventCard event={event} key={event.id} />
                ))
              ) : realEvents.length === 0 ? (
                <NoMajorEventsCard />
              ) : null}

              {localLowEvents.length > 0 ? (
                <MoreLocalEventsAccordion
                  count={localLowEvents.length}
                  events={localLowEvents}
                />
              ) : null}
            </div>
          </div>
        );
      })}
    </section>
  );
}
