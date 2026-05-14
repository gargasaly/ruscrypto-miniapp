"use client";

import Link from "next/link";
import { Disclaimer } from "@/components/disclaimer";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";
import { moreItems, pageHeaders, type MoreItem } from "@/lib/content";
import { openExternalLink, openTelegramLinkAndClose } from "@/lib/telegramLinks";

function MoreCardContent({ item, linked }: { item: MoreItem; linked: boolean }) {
  const hasInlineLinks = Boolean(item.links?.length);

  return (
    <article className="app-card tap-card h-full p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-black leading-snug text-white">
          {item.title}
        </h2>
        {linked && !hasInlineLinks ? (
          <span className="chevron-soft">›</span>
        ) : !linked && !hasInlineLinks ? (
          <StatusBadge tone="yellow">Скоро</StatusBadge>
        ) : null}
      </div>

      <p className="mt-2 text-sm leading-6 text-zinc-400">
        {item.description}
      </p>

      {item.links?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {item.links.map((link) => (
            <button
              className="rounded-2xl border border-emerald-200/15 bg-emerald-300/[0.08] px-3 py-2 text-xs font-black text-emerald-100 transition hover:bg-emerald-300/[0.13]"
              key={link.href}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();

                if (link.kind === "telegram") {
                  openTelegramLinkAndClose(link.href);
                } else {
                  openExternalLink(link.href);
                }
              }}
              type="button"
            >
              {link.label}
            </button>
          ))}
        </div>
      ) : null}

      {item.disclaimer ? (
        <p className="mt-3 text-[11px] leading-5 text-zinc-500">
          {item.disclaimer}
        </p>
      ) : null}
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

          if (item.links?.length) {
            return <MoreCardContent item={item} key={item.title} linked />;
          }

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
                onClick={(event) => {
                  event.preventDefault();
                  openTelegramLinkAndClose(externalUrl);
                }}
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
