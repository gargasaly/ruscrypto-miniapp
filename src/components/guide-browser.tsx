"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { TokenLogo } from "@/components/token-logo";
import { useTokenPrices, type TokenPricePoint } from "@/hooks/use-token-prices";
import type { GuideItem, GuideSection } from "@/lib/content";
import { formatPercent, formatUsdPrice } from "@/lib/formatters";
import { openTelegramLinkAndClose } from "@/lib/telegramLinks";

type GuideBrowserProps = {
  activeTab: string;
  sections: GuideSection[];
};

type GuideCardProps = {
  item: GuideItem;
  pricePoint?: TokenPricePoint;
  sectionId: string;
};

function GuideCard({ item, pricePoint, sectionId }: GuideCardProps) {
  const itemUrl = item.url?.trim();
  const price = pricePoint?.price;
  const change24h = pricePoint?.change24h;
  const hasPrice = typeof price === "number";
  const positive = typeof change24h === "number" && change24h >= 0;
  const openItem = () => {
    if (itemUrl) {
      openTelegramLinkAndClose(itemUrl);
    }
  };
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase text-emerald-200">
          <span className="size-2 rounded-full bg-emerald-300" />
          Материал
        </div>
        {itemUrl ? (
          <span className="chevron-soft">›</span>
        ) : (
          <StatusBadge tone="yellow">Скоро</StatusBadge>
        )}
      </div>

      <div className="mt-3 flex items-start gap-3">
        {item.kind === "token" ? (
          <TokenLogo
            logo={item.logo ?? null}
            ticker={item.ticker ?? item.title}
            title={item.title}
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-black leading-snug text-white">
            {item.title}
          </h3>
          {item.kind === "token" && item.sector ? (
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-emerald-200/80">
              {item.sector}
            </p>
          ) : null}
          {item.kind === "token" ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-black">
              <span className={hasPrice ? "text-white" : "text-zinc-500"}>
                {hasPrice ? formatUsdPrice(price) : "Цена обновляется"}
              </span>
              {typeof change24h === "number" ? (
                <span className={positive ? "text-emerald-300" : "text-rose-300"}>
                  {formatPercent(change24h)}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <p className="mt-2 text-sm leading-6 text-zinc-400">
        {item.description}
      </p>
    </>
  );

  if (!itemUrl) {
    return (
      <article className="app-card p-4" key={`${sectionId}-${item.title}`}>
        {content}
      </article>
    );
  }

  return (
    <button
      className="app-card tap-card group block w-full p-4 text-left"
      key={`${sectionId}-${item.title}`}
      onClick={openItem}
      type="button"
    >
      {content}
    </button>
  );
}

export function GuideBrowser({ activeTab, sections }: GuideBrowserProps) {
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const sectionIds = useMemo(
    () => new Set(sections.map((section) => section.id)),
    [sections],
  );

  const activeSectionId = sectionIds.has(activeTab) ? activeTab : "education";
  const activeSection = sections.find((section) => section.id === activeSectionId);
  const priceSymbols = useMemo(
    () =>
      (activeSection?.items ?? [])
        .filter((item) => item.kind === "token" && item.ticker)
        .map((item) => item.ticker as string),
    [activeSection],
  );
  const { pricesBySymbol } = useTokenPrices(priceSymbols);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return (activeSection?.items ?? []).filter((item) => {
      return (
        normalizedQuery.length === 0 ||
        item.title.toLowerCase().includes(normalizedQuery) ||
        item.description.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [activeSection, query]);

  function handleDropdownClick(item: GuideItem) {
    const itemUrl = item.url?.trim();

    if (itemUrl) {
      openTelegramLinkAndClose(itemUrl);
    }

    setDropdownOpen(false);
  }

  useEffect(() => {
    if (!dropdownOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [dropdownOpen]);

  return (
    <div className="space-y-4">
      <div className="glass-card grid grid-cols-2 gap-2 p-2">
        {sections.map((section) => {
          const active = section.id === activeSectionId;

          return (
            <button
              className={`min-h-[54px] rounded-[18px] px-3 py-3 text-sm font-extrabold transition ${
                active
                  ? "bg-gradient-to-br from-emerald-300 to-teal-200 font-extrabold text-[#062018] shadow-lg shadow-emerald-950/25 ring-1 ring-emerald-50/45 [text-shadow:0_1px_0_rgba(255,255,255,0.28)]"
                  : "bg-white/[0.035] text-zinc-300 hover:bg-white/[0.07] hover:text-white"
              }`}
              key={section.id}
              onClick={() => {
                setDropdownOpen(false);
                router.replace(`/guides?tab=${section.id}`, { scroll: false });
              }}
              type="button"
            >
              {section.tabLabel}
            </button>
          );
        })}
      </div>

      {activeSection ? (
        <div className="section-card p-4">
          <div className="flex items-start gap-3">
            <span className="mt-1 h-9 w-1.5 rounded-full bg-gradient-to-b from-emerald-300 to-teal-300" />
            <div>
              <h2 className="text-xl font-black text-white">
                {activeSection.title}
              </h2>
              <p className="mt-1 text-sm leading-6 text-zinc-400">
                {activeSection.description}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="relative z-[1000] block" ref={searchRef}>
        <label
          className="mb-2 block text-sm font-semibold text-zinc-300"
          htmlFor="guide-search"
        >
          Поиск по гайдам
        </label>
        <div className="relative">
          <input
            className="search-input search-input-with-toggle"
            id="guide-search"
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setDropdownOpen(true)}
            placeholder="Например: BTC, кошелёк, DeFi"
            type="search"
            value={query}
          />
          <button
            aria-label={
              dropdownOpen ? "Скрыть список гайдов" : "Показать список гайдов"
            }
            aria-expanded={dropdownOpen}
            className="absolute right-2 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-[14px] border border-emerald-200/12 bg-emerald-300/[0.055] text-emerald-100 transition hover:bg-emerald-300/[0.11]"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              (document.activeElement as HTMLElement | null)?.blur?.();
              setDropdownOpen((value) => !value);
            }}
            type="button"
          >
            <svg
              aria-hidden
              className={`size-4 transition ${dropdownOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>
        {dropdownOpen ? (
          <div
            className="dropdown-scroll absolute left-0 right-0 top-full z-[1100] mt-2 max-h-[320px] overflow-y-auto rounded-[22px] border border-emerald-200/15 bg-[#07100f]/95 p-2 shadow-2xl shadow-black/45 backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onTouchMove={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            onWheel={(event) => event.stopPropagation()}
          >
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => {
                const disabled = !item.url;

                return (
                  <button
                    className={`w-full rounded-[16px] px-3 py-3 text-left transition ${
                      disabled
                        ? "cursor-default text-zinc-500"
                        : "text-zinc-200 hover:bg-emerald-300/[0.08] hover:text-white"
                    }`}
                    disabled={disabled}
                    key={`${activeSectionId}-dropdown-${item.title}`}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleDropdownClick(item);
                    }}
                    type="button"
                  >
                    <span className="flex items-center gap-3">
                      {item.kind === "token" ? (
                        <TokenLogo
                          logo={item.logo ?? null}
                          ticker={item.ticker ?? item.title}
                          title={item.title}
                        />
                      ) : null}
                      <span className="min-w-0">
                        <span className="block text-sm font-black">{item.title}</span>
                        {item.kind === "token" && item.sector ? (
                          <span className="mt-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-200/70">
                            {item.sector}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span className="mt-1 line-clamp-2 block text-xs leading-5 text-zinc-500">
                      {item.description}
                    </span>
                    {disabled ? (
                      <span className="mt-2 inline-flex rounded-full border border-emerald-200/12 bg-emerald-300/[0.055] px-2 py-0.5 text-[10px] font-bold text-emerald-100/75">
                        Скоро
                      </span>
                    ) : null}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-3 text-sm text-zinc-500">
                Ничего не найдено
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3">
        {filteredItems.map((item) => (
          <GuideCard
            item={item}
            key={`${activeSectionId}-${item.title}`}
            pricePoint={
              item.ticker ? pricesBySymbol.get(item.ticker.toUpperCase()) : undefined
            }
            sectionId={activeSectionId}
          />
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <div className="app-card p-4 text-sm leading-6 text-zinc-400">
          Ничего не найдено. Попробуйте изменить запрос.
        </div>
      ) : null}
    </div>
  );
}
