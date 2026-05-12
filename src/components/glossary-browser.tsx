"use client";

import { useMemo, useState } from "react";
import type { GlossaryTerm } from "@/lib/glossary";

type GlossaryBrowserProps = {
  terms: GlossaryTerm[];
};

export function GlossaryBrowser({ terms }: GlossaryBrowserProps) {
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
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
    setSearchFocused(false);

    window.setTimeout(() => {
      document
        .getElementById(`glossary-${term.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }

  return (
    <div className="space-y-4">
      <label className="relative z-30 block">
        <span className="mb-2 block text-sm font-semibold text-zinc-300">
          Поиск по словарю
        </span>
        <input
          className="search-input"
          onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setSearchFocused(true)}
          placeholder="Например: DYOR, unlock, кошелёк"
          type="search"
          value={query}
        />
        {searchFocused ? (
          <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[320px] overflow-y-auto rounded-[22px] border border-emerald-200/15 bg-[#07100f]/95 p-2 shadow-2xl shadow-black/45 backdrop-blur-xl">
            {filteredTerms.length > 0 ? (
              filteredTerms.map((term) => (
                <button
                  className="w-full rounded-[16px] px-3 py-3 text-left text-zinc-200 transition hover:bg-emerald-300/[0.08] hover:text-white"
                  key={`glossary-dropdown-${term.id}`}
                  onMouseDown={(event) => {
                    event.preventDefault();
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
      </label>

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
