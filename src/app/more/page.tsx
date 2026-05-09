import Link from "next/link";
import { Disclaimer } from "@/components/disclaimer";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";
import { moreItems, pageHeaders } from "@/lib/content";

export default function MorePage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        description={pageHeaders.more.description}
        eyebrow={pageHeaders.more.eyebrow}
        title={pageHeaders.more.title}
      />

      <section className="grid gap-3">
        {moreItems.map((item) => {
          const itemUrl = item.url?.trim();

          return (
            <article
              className="app-card tap-card p-4"
              key={item.title}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-black leading-snug text-white">
                  {item.title}
                </h2>
                {item.status === "published" ? (
                  <StatusBadge tone="green">Опубликовано</StatusBadge>
                ) : (
                  <StatusBadge tone="yellow">Скоро</StatusBadge>
                )}
              </div>

              <p className="mt-2 text-sm leading-6 text-zinc-400">
                {item.description}
              </p>

              <div className="mt-4">
                {item.href ? (
                  <Link className="primary-button" href={item.href}>
                    Открыть
                    <span aria-hidden>›</span>
                  </Link>
                ) : itemUrl ? (
                  <a
                    className="primary-button"
                    href={itemUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Открыть
                    <span aria-hidden>›</span>
                  </a>
                ) : (
                  <StatusBadge tone="yellow">Скоро</StatusBadge>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <Disclaimer />
    </div>
  );
}
