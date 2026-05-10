"use client";

import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { useRiskData } from "@/hooks/use-risk-data";
import {
  categoryLabels,
  getImpactTone,
  trackedRiskAssets,
  type RiskCategory,
  type RiskEvent,
} from "@/lib/riskCalendar";

type CategoryFilter = RiskCategory | "all";
type AssetFilter = (typeof trackedRiskAssets)[number] | "all";

const categoryFilters: Array<{ id: CategoryFilter; label: string }> = [
  { id: "all", label: "Все" },
  { id: "macro", label: "Макро" },
  { id: "crypto", label: "Крипто" },
  { id: "token", label: "Токены" },
];

function sourceStatusLabel(status: RiskEvent["status"]) {
  if (status === "auto") {
    return "авто";
  }

  if (status === "manual") {
    return "ручное";
  }

  return "fallback";
}

function groupByDate(events: RiskEvent[]) {
  const groups = new Map<string, RiskEvent[]>();

  for (const event of events) {
    const group = groups.get(event.date) ?? [];
    group.push(event);
    groups.set(event.date, group);
  }

  return [...groups.entries()];
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-full border px-3 py-2 text-xs font-bold transition ${
        active
          ? "border-emerald-300/35 bg-emerald-300/15 text-emerald-100"
          : "border-white/10 bg-white/[0.035] text-zinc-400 hover:border-emerald-300/20 hover:text-zinc-100"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function AssetPill({ asset }: { asset: string }) {
  return (
    <span className="rounded-full border border-emerald-200/12 bg-emerald-300/[0.055] px-2.5 py-1 text-[11px] font-bold text-emerald-100/80">
      {asset}
    </span>
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
        {event.whyItMatters}
      </p>

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
  const { events, loading } = useRiskData();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [assetFilter, setAssetFilter] = useState<AssetFilter>("all");

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const categoryMatches =
        categoryFilter === "all" || event.category === categoryFilter;
      const assetMatches =
        assetFilter === "all" || event.affectedAssets.includes(assetFilter);

      return categoryMatches && assetMatches;
    });
  }, [assetFilter, categoryFilter, events]);

  const groupedEvents = useMemo(
    () => groupByDate(filteredEvents),
    [filteredEvents],
  );

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {categoryFilters.map((filter) => (
            <FilterButton
              active={categoryFilter === filter.id}
              key={filter.id}
              onClick={() => setCategoryFilter(filter.id)}
            >
              {filter.label}
            </FilterButton>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterButton
            active={assetFilter === "all"}
            onClick={() => setAssetFilter("all")}
          >
            Все токены
          </FilterButton>
          {trackedRiskAssets.map((asset) => (
            <FilterButton
              active={assetFilter === asset}
              key={asset}
              onClick={() => setAssetFilter(asset)}
            >
              {asset}
            </FilterButton>
          ))}
        </div>
      </section>

      {groupedEvents.length > 0 ? (
        <section className="space-y-5">
          {groupedEvents.map(([date, dateEvents]) => {
            const firstEvent = dateEvents[0];
            const groupTitle = `${firstEvent.weekday ?? ""}, ${
              firstEvent.readableDate ?? date
            }`;

            return (
              <div className="space-y-3" key={date}>
                <div className="flex items-center gap-3">
                  <span className="h-8 w-1.5 rounded-full bg-gradient-to-b from-emerald-300 to-teal-300" />
                  <h2 className="text-xl font-black capitalize text-white">
                    {groupTitle}
                  </h2>
                </div>

                <div className="grid gap-3">
                  {dateEvents.map((event) => (
                    <RiskEventCard event={event} key={event.id} />
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      ) : (
        <div className="app-card p-4 text-sm leading-6 text-zinc-400">
          {loading
            ? "Загружаем календарь рисков…"
            : "На ближайшие дни крупных событий не найдено. Следим за уровнями BTC, BTC.D, ETF-потоками и общей реакцией на риск."}
        </div>
      )}
    </div>
  );
}
