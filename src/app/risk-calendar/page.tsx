import Link from "next/link";
import { Disclaimer } from "@/components/disclaimer";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";
import { riskCalendar } from "@/lib/riskCalendar";

function statusLabel(status: string) {
  return status === "example" ? "пример / обновляется вручную" : status;
}

export default function RiskCalendarPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        description="События, которые могут повлиять на BTC, ETH и альткоины. Данные обновляются вручную после утреннего обзора рынка."
        eyebrow="Риски"
        title="Календарь рисков"
      />

      <section className="grid gap-3">
        {riskCalendar.map((event) => (
          <article
            className="app-card p-4"
            key={event.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm text-zinc-500">
                  {event.date} · {event.time}
                </p>
                <h2 className="mt-1 text-lg font-black leading-snug text-white">
                  {event.title}
                </h2>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <StatusBadge tone={event.impact === "high" ? "red" : "yellow"}>
                  {event.impactLabel}
                </StatusBadge>
                {event.status === "example" ? (
                  <StatusBadge tone="neutral">{statusLabel(event.status)}</StatusBadge>
                ) : null}
              </div>
            </div>

            <p className="mt-3 text-sm font-bold text-emerald-100">
              {event.category}
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {event.whyItMatters}
            </p>

            <div className="mt-4 grid gap-3">
              <div className="mini-card p-3">
                <p className="text-xs font-bold uppercase text-emerald-200">
                  Позитивный сценарий
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  {event.positiveScenario}
                </p>
              </div>
              <div className="mini-card p-3">
                <p className="text-xs font-bold uppercase text-amber-200">
                  Негативный сценарий
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  {event.negativeScenario}
                </p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <Link
        className="secondary-button"
        href="/more"
      >
        Назад в Ещё
      </Link>

      <Disclaimer />
    </div>
  );
}
