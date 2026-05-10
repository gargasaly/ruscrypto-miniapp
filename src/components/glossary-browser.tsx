"use client";

import { useMemo, useState } from "react";
import type { GlossaryTerm } from "@/lib/glossary";

type GlossaryBrowserProps = {
  terms: GlossaryTerm[];
};

export function GlossaryBrowser({ terms }: GlossaryBrowserProps) {
  const [query, setQuery] = useState("");

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

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-zinc-300">
          Поиск по словарю
        </span>
        <input
          className="search-input"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Например: DYOR, unlock, кошелёк"
          type="search"
          value={query}
        />
      </label>

      <div className="grid gap-3">
        {filteredTerms.map((term) => (
          <article className="app-card p-4" key={term.id}>
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
