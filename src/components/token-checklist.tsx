"use client";

import { useMemo, useState } from "react";
import { TokenLogo } from "@/components/token-logo";
import { useMarketData } from "@/hooks/use-market-data";
import { formatPercent, formatUsdPrice } from "@/lib/formatters";
import type { TokenCard } from "@/lib/content";

type TokenChecklistProps = {
  tokens: TokenCard[];
};

type ChecklistGroup = {
  title: string;
  items: string[];
};

const checklistGroups: ChecklistGroup[] = [
  {
    title: "Базовые вопросы",
    items: [
      "Понимаю ли я, чем занимается проект?",
      "Есть ли у токена понятный сектор?",
      "Не покупаю ли я после сильного пампа?",
      "Есть ли план входа и выхода?",
      "Понимаю ли я риск просадки?",
    ],
  },
  {
    title: "Токеномика",
    items: [
      "Проверены ли unlocks?",
      "Понятно ли, сколько токенов уже в обращении?",
      "Нет ли сильного давления от будущих разблокировок?",
    ],
  },
  {
    title: "Ликвидность и объём",
    items: [
      "Есть ли нормальный объём торгов?",
      "Не слишком ли маленькая ликвидность?",
      "Можно ли выйти из позиции без сильного проскальзывания?",
    ],
  },
  {
    title: "Безопасность",
    items: [
      "Проверил ли я официальный сайт?",
      "Проверил ли я тикер и контракт?",
      "Не покупаю ли я фейковый токен?",
      "Не перехожу ли по сомнительной ссылке?",
    ],
  },
];

const checklistItems = checklistGroups.flatMap((group) => group.items);

function resultLabel(progress: number) {
  if (progress < 0.4) {
    return "Лучше не лезть без дополнительной проверки";
  }

  if (progress <= 0.75) {
    return "Есть риски, не спешить";
  }

  return "Можно изучать дальше";
}

function resultTone(progress: number) {
  if (progress < 0.4) {
    return "border-rose-300/20 bg-rose-300/10 text-rose-100";
  }

  if (progress <= 0.75) {
    return "border-amber-300/20 bg-amber-300/10 text-amber-100";
  }

  return "border-emerald-300/20 bg-emerald-300/10 text-emerald-100";
}

export function TokenChecklist({ tokens }: TokenChecklistProps) {
  const { coinsById } = useMarketData();
  const [query, setQuery] = useState("");
  const [selectedTicker, setSelectedTicker] = useState(tokens[0]?.ticker ?? "");
  const [checkedItems, setCheckedItems] = useState<Set<string>>(() => new Set());

  const selectedToken =
    tokens.find((token) => token.ticker === selectedTicker) ?? tokens[0];
  const selectedCoin = selectedToken
    ? coinsById.get(selectedToken.coingeckoId)
    : undefined;

  const filteredTokens = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return tokens;
    }

    return tokens.filter((token) => {
      return [token.title, token.ticker, token.description]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [query, tokens]);

  const checkedCount = checkedItems.size;
  const progress = checklistItems.length > 0 ? checkedCount / checklistItems.length : 0;

  function toggleItem(item: string) {
    setCheckedItems((current) => {
      const next = new Set(current);

      if (next.has(item)) {
        next.delete(item);
      } else {
        next.add(item);
      }

      return next;
    });
  }

  function selectToken(ticker: string) {
    setSelectedTicker(ticker);
    setCheckedItems(new Set());
  }

  if (!selectedToken) {
    return null;
  }

  return (
    <div className="space-y-5">
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-zinc-300">
          Поиск токена
        </span>
        <input
          className="search-input"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Например: BTC, LINK, TON"
          type="search"
          value={query}
        />
      </label>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filteredTokens.map((token) => {
          const active = token.ticker === selectedToken.ticker;

          return (
            <button
              className={`shrink-0 rounded-full border px-3 py-2 text-xs font-black transition ${
                active
                  ? "border-emerald-300/35 bg-emerald-300/15 text-emerald-100"
                  : "border-white/10 bg-white/[0.035] text-zinc-400 hover:border-emerald-300/20 hover:text-zinc-100"
              }`}
              key={token.ticker}
              onClick={() => selectToken(token.ticker)}
              type="button"
            >
              {token.ticker}
            </button>
          );
        })}
      </div>

      {filteredTokens.length === 0 ? (
        <div className="app-card p-4 text-sm leading-6 text-zinc-400">
          Ничего не найдено
        </div>
      ) : null}

      <section className="premium-card p-4">
        <div className="relative z-10 flex items-start gap-3">
          <TokenLogo
            logo={selectedToken.logo}
            remoteLogo={selectedCoin?.image}
            ticker={selectedToken.ticker}
            title={selectedToken.title}
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-black text-white">
                {selectedToken.ticker}
              </h2>
              <span className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-xs font-black text-zinc-300">
                {selectedToken.title}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {selectedToken.description}
            </p>
          </div>
        </div>
      </section>

      <section className="app-card p-4">
        <h2 className="text-lg font-black text-white">Рыночная ситуация</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="mini-card p-3">
            <p className="text-xs font-bold uppercase text-zinc-500">Цена</p>
            <p className="mt-2 text-lg font-black text-white">
              {formatUsdPrice(selectedCoin?.current_price)}
            </p>
          </div>
          <div className="mini-card p-3">
            <p className="text-xs font-bold uppercase text-zinc-500">24ч</p>
            <p className="mt-2 text-lg font-black text-emerald-200">
              {formatPercent(selectedCoin?.price_change_percentage_24h)}
            </p>
          </div>
          <div className="mini-card p-3">
            <p className="text-xs font-bold uppercase text-zinc-500">
              Market Cap
            </p>
            <p className="mt-2 text-lg font-black text-white">
              {formatUsdPrice(selectedCoin?.market_cap)}
            </p>
          </div>
          <div className="mini-card p-3">
            <p className="text-xs font-bold uppercase text-zinc-500">Volume</p>
            <p className="mt-2 text-lg font-black text-white">
              {formatUsdPrice(selectedCoin?.total_volume)}
            </p>
          </div>
        </div>
      </section>

      {checklistGroups.map((group) => (
        <section className="app-card p-4" key={group.title}>
          <h2 className="text-lg font-black text-white">{group.title}</h2>
          <div className="mt-3 grid gap-2">
            {group.items.map((item) => (
              <label
                className="mini-card flex items-start gap-3 p-3 text-sm leading-6 text-zinc-300"
                key={item}
              >
                <input
                  checked={checkedItems.has(item)}
                  className="mt-1 size-4 accent-emerald-300"
                  onChange={() => toggleItem(item)}
                  type="checkbox"
                />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </section>
      ))}

      <section className={`rounded-[24px] border p-4 ${resultTone(progress)}`}>
        <p className="text-xs font-bold uppercase opacity-80">Итог</p>
        <h2 className="mt-2 text-xl font-black">{resultLabel(progress)}</h2>
        <p className="mt-2 text-sm leading-6 opacity-85">
          Отмечено {checkedCount} из {checklistItems.length}. Это обучающий
          чеклист, а не финансовая рекомендация.
        </p>
      </section>
    </div>
  );
}
