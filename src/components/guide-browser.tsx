"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import type { GuideItem, GuideSection } from "@/lib/content";
import { openTelegramPostAndClose } from "@/lib/telegramLinks";

type GuideBrowserProps = {
  activeTab: string;
  sections: GuideSection[];
};

type GuideCardProps = {
  item: GuideItem;
  sectionId: string;
};

function GuideCard({ item, sectionId }: GuideCardProps) {
  const itemUrl = item.url?.trim();
  const openItem = () => {
    if (itemUrl) {
      openTelegramPostAndClose(itemUrl);
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

      <h3 className="mt-3 text-lg font-black leading-snug text-white">
        {item.title}
      </h3>
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
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const sectionIds = useMemo(
    () => new Set(sections.map((section) => section.id)),
    [sections],
  );

  const activeSectionId = sectionIds.has(activeTab) ? activeTab : "start";
  const activeSection = sections.find((section) => section.id === activeSectionId);

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
      openTelegramPostAndClose(itemUrl);
    }

    setSearchFocused(false);
  }

  return (
    <div className="space-y-4">
      <div className="glass-card grid grid-cols-2 gap-2 p-2">
        {sections.map((section) => {
          const active = section.id === activeSectionId;

          return (
            <button
              className={`min-h-[54px] rounded-[18px] px-3 py-3 text-sm font-extrabold transition ${
                active
                  ? "bg-gradient-to-br from-emerald-300 to-teal-200 text-[#06201b] shadow-lg shadow-emerald-950/25"
                  : "bg-white/[0.035] text-zinc-300 hover:bg-white/[0.07] hover:text-white"
              }`}
              key={section.id}
              onClick={() => {
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

      <label className="relative z-30 block">
        <span className="mb-2 block text-sm font-semibold text-zinc-300">
          Поиск по гайдам
        </span>
        <input
          className="search-input"
          onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setSearchFocused(true)}
          placeholder="Например: BTC, кошелёк, DeFi"
          type="search"
          value={query}
        />
        {searchFocused ? (
          <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[300px] overflow-y-auto rounded-[22px] border border-emerald-200/15 bg-[#07100f]/95 p-2 shadow-2xl shadow-black/45 backdrop-blur-xl">
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
                    onMouseDown={(event) => {
                      event.preventDefault();
                      handleDropdownClick(item);
                    }}
                    type="button"
                  >
                    <span className="block text-sm font-black">{item.title}</span>
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
      </label>

      <div className="grid gap-3">
        {filteredItems.map((item) => (
          <GuideCard
            item={item}
            key={`${activeSectionId}-${item.title}`}
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
