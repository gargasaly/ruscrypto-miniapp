"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Disclaimer } from "@/components/disclaimer";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";
import { moreItems, pageHeaders, type MoreItem } from "@/lib/content";
import { getTelegramInitData, watchTelegramInitData } from "@/lib/telegram/webapp";
import { openExternalLink, openTelegramLink, openTelegramLinkAndClose } from "@/lib/telegramLinks";

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
                  if (link.preserveMiniApp) {
                    openTelegramLink(link.href);
                  } else {
                    openTelegramLinkAndClose(link.href);
                  }
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
  const [adminVisible, setAdminVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAdmin(initData: string) {
      if (!initData) {
        return;
      }

      try {
        const response = await fetch("/api/me", {
          body: JSON.stringify({ initData }),
          cache: "no-store",
          headers: {
            "content-type": "application/json",
          },
          method: "POST",
        });
        const data = (await response.json()) as {
          isAdmin?: boolean;
          user?: {
            isAdmin?: boolean;
          };
        };

        if (!cancelled && (data.isAdmin === true || data.user?.isAdmin === true)) {
          setAdminVisible(true);
        }
      } catch {
        // Admin entry must not affect the public More screen.
      }
    }

    if (
      process.env.NODE_ENV === "development" &&
      new URLSearchParams(window.location.search).get("admin") === "1"
    ) {
      setAdminVisible(true);
      return undefined;
    }

    const initData = getTelegramInitData();

    if (initData) {
      void checkAdmin(initData);
      return () => {
        cancelled = true;
      };
    }

    const stopWatching = watchTelegramInitData((value) => {
      void checkAdmin(value);
    });

    return () => {
      cancelled = true;
      stopWatching();
    };
  }, []);

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
                  if (item.preserveMiniApp) {
                    openTelegramLink(externalUrl);
                  } else {
                    openTelegramLinkAndClose(externalUrl);
                  }
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

        {adminVisible ? (
          <Link className="block" href="/admin/analytics">
            <article className="app-card tap-card h-full border-emerald-300/25 bg-emerald-300/[0.075] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black leading-snug text-white">
                    Админ-аналитика
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    Скрытый экран со статистикой Mini App, пользователями, событиями и оплатами.
                  </p>
                </div>
                <span className="chevron-soft">›</span>
              </div>
            </article>
          </Link>
        ) : null}
      </section>

      <Disclaimer />
    </div>
  );
}
