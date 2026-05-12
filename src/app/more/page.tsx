"use client";

import Link from "next/link";
import { Disclaimer } from "@/components/disclaimer";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";
import { moreItems, pageHeaders, type MoreItem } from "@/lib/content";
import { openTelegramPostAndClose } from "@/lib/telegramLinks";

function MoreCardContent({ item, linked }: { item: MoreItem; linked: boolean }) {
  return (
    <article className="app-card tap-card h-full p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-black leading-snug text-white">
          {item.title}
        </h2>
        {linked ? (
          <span className="chevron-soft">›</span>
        ) : (
          <StatusBadge tone="yellow">Скоро</StatusBadge>
        )}
      </div>

      <p className="mt-2 text-sm leading-6 text-zinc-400">
        {item.description}
      </p>
    </article>
  );
}

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
          const externalUrl = item.url?.trim();

          if (item.internalUrl) {
            return (
              <Link
                className="block"
                href={item.internalUrl}
                key={item.title}
              >
                <MoreCardContent item={item} linked />
              </Link>
            );
          }

          if (externalUrl) {
            return (
              <button
                className="block w-full text-left"
                key={item.title}
                onClick={() => openTelegramPostAndClose(externalUrl)}
                type="button"
              >
                <MoreCardContent item={item} linked />
              </button>
            );
          }

          return (
            <MoreCardContent item={item} key={item.title} linked={false} />
          );
        })}
      </section>

      <Disclaimer />
    </div>
  );
}
