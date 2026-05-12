"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GlossaryTerm } from "@/lib/glossary";

type GlossaryBrowserProps = {
  terms: GlossaryTerm[];
};

export function GlossaryBrowser({ terms }: GlossaryBrowserProps) {
  const searchRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeTermId, setActiveTermId] = useState<string | null>(null);

  const filteredTerms = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return terms;
    }

    return terms.filter((term) => {
      return [term.term, term.short, term.category, term.explanation]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [query, terms]);

  function selectTerm(term: GlossaryTerm) {
    setActiveTermId(term.id);
    setDropdownOpen(false);

    window.setTimeout(() => {
      document
        .getElementById(`glossary-${term.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
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
      <div className="relative z-[1000] block" ref={searchRef}>
        <label
          className="mb-2 block text-sm font-semibold text-zinc-300"
          htmlFor="glossary-search"
        >
          Поиск по словарю
        </label>
        <div className="relative">
          <input
            className="search-input search-input-with-toggle"
            id="glossary-search"
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setDropdownOpen(true)}
            placeholder="Например: DYOR, unlock, кошелёк"
            type="search"
            value={query}
          />
          <button
            aria-label={
              dropdownOpen
                ? "Скрыть список терминов"
                : "Показать список терминов"
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
            className="dropdown-scroll absolute left-0 right-0 top-full z-[1100] mt-2 max-h-[340px] overflow-y-auto rounded-[22px] border border-emerald-200/15 bg-[#07100f]/95 p-2 shadow-2xl shadow-black/45 backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onTouchMove={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            onWheel={(event) => event.stopPropagation()}
          >
            {filteredTerms.length > 0 ? (
              filteredTerms.map((term) => (
                <button
                  className="w-full rounded-[16px] px-3 py-3 text-left text-zinc-200 transition hover:bg-emerald-300/[0.08] hover:text-white"
                  key={`glossary-dropdown-${term.id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    selectTerm(term);
                  }}
                  type="button"
                >
                  <span className="block text-sm font-black">{term.term}</span>
                  <span className="mt-1 block text-xs font-bold text-emerald-200/80">
                    {term.category}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-xs leading-5 text-zinc-500">
                    {term.short}
                  </span>
                </button>
              ))
            ) : (
              <div className="px-3 py-3 text-sm text-zinc-500">
                Ничего не найдено
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3">
        {filteredTerms.map((term) => (
          <article
            className={`app-card p-4 transition ${
              activeTermId === term.id ? "ring-1 ring-emerald-300/45" : ""
            }`}
            id={`glossary-${term.id}`}
            key={term.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-white">{term.term}</h2>
                <p className="mt-1 text-sm font-bold text-emerald-200">
                  {term.short}
                </p>
              </div>
              <span className="rounded-full border border-emerald-200/12 bg-emerald-300/[0.055] px-3 py-1.5 text-[11px] font-bold text-emerald-100/80">
                {term.category}
              </span>
            </div>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {term.explanation}
            </p>

            {term.example ? (
              <div className="mini-card mt-4 p-3">
                <p className="text-xs font-bold uppercase text-emerald-200">
                  Пример
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  {term.example}
                </p>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {filteredTerms.length === 0 ? (
        <div className="app-card p-4 text-sm leading-6 text-zinc-400">
          Ничего не найдено
        </div>
      ) : null}
    </div>
  );
}
