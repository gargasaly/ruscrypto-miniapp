"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { TokenLogo } from "@/components/token-logo";
import { useMarketData } from "@/hooks/use-market-data";
import { formatPercent, formatUsdPrice } from "@/lib/formatters";
import type { MarketCoin } from "@/lib/market";
import type { TokenCard } from "@/lib/content";

type TokenExplorerProps = {
  tokens: TokenCard[];
};

const FAVORITES_STORAGE_KEY = "ruscrypto_favorite_tokens";
const FAVORITES_EVENT = "ruscrypto_favorite_tokens_changed";
const EMPTY_FAVORITES: string[] = [];
let favoriteSnapshotKey = "";
let favoriteSnapshot: string[] = [];

function readFavoriteTickers() {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY) ?? "[]";

  if (raw === favoriteSnapshotKey) {
    return favoriteSnapshot;
  }

  try {
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      favoriteSnapshotKey = raw;
      favoriteSnapshot = parsed.filter(
        (value): value is string => typeof value === "string",
      );
      return favoriteSnapshot;
    }
  } catch {
    favoriteSnapshotKey = raw;
    favoriteSnapshot = [];
    return favoriteSnapshot;
  }

  favoriteSnapshotKey = raw;
  favoriteSnapshot = [];
  return favoriteSnapshot;
}

function subscribeFavoriteTickers(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("storage", callback);
  window.addEventListener(FAVORITES_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(FAVORITES_EVENT, callback);
  };
}

function writeFavoriteTickers(tickers: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(tickers));
  window.dispatchEvent(new Event(FAVORITES_EVENT));
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden
      className="size-[20px]"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
    </svg>
  );
}

function TokenCardView({
  coin,
  favorite,
  onToggleFavorite,
  token,
}: {
  coin?: MarketCoin;
  favorite: boolean;
  onToggleFavorite: () => void;
  token: TokenCard;
}) {
  const tokenUrl = token.url?.trim();
  const price = coin?.current_price;
  const change = coin?.price_change_percentage_24h;
  const positive = typeof change === "number" && change >= 0;

  return (
    <article className="token-card app-card tap-card relative overflow-hidden p-3.5">
      {tokenUrl ? (
        <a
          aria-label={`Разбор ${token.title}`}
          className="absolute inset-0 z-0"
          href={tokenUrl}
          rel="noopener noreferrer"
          target="_blank"
        />
      ) : null}

      <div className="pointer-events-none relative z-10 flex items-center gap-3">
        <TokenLogo
          logo={token.logo}
          remoteLogo={coin?.image}
          ticker={token.ticker}
          title={token.title}
        />

        <div className="min-w-0 flex-1 pr-[108px]">
          <h2 className="text-xl font-black leading-tight text-white">
            {token.ticker}
          </h2>
          <p className="mt-1 text-sm font-semibold text-zinc-300">
            {token.title}
          </p>

          <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-zinc-500">
            {token.description}
          </p>
        </div>

        <div className="absolute right-1 top-[3.15rem] text-right">
          <p className="text-base font-semibold text-white">
            {formatUsdPrice(price)}
          </p>
          <p
            className={`mt-1 text-sm font-bold ${
              typeof change !== "number"
                ? "text-zinc-500"
                : positive
                  ? "text-emerald-300"
                  : "text-rose-300"
            }`}
          >
            {formatPercent(change)}
          </p>
        </div>
      </div>

      <button
        aria-label={
          favorite
            ? `Убрать ${token.ticker} из избранного`
            : `Добавить ${token.ticker} в избранное`
        }
        aria-pressed={favorite}
        className={`favorite-button absolute right-4 top-4 z-20 ${
          favorite ? "is-active" : ""
        }`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggleFavorite();
        }}
        type="button"
      >
        <StarIcon filled={favorite} />
      </button>

      {!tokenUrl ? (
        <span className="pointer-events-none absolute right-4 bottom-3 z-20 rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[11px] font-bold text-amber-100">
          Скоро
        </span>
      ) : (
        <span className="chevron-soft pointer-events-none absolute right-4 bottom-3 z-20">
          ›
        </span>
      )}
    </article>
  );
}

export function TokenExplorer({ tokens }: TokenExplorerProps) {
  const { coinsById } = useMarketData();
  const favoriteTickers = useSyncExternalStore(
    subscribeFavoriteTickers,
    readFavoriteTickers,
    () => EMPTY_FAVORITES,
  );
  const [query, setQuery] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const favoriteSet = useMemo(
    () => new Set(favoriteTickers.map((ticker) => ticker.toUpperCase())),
    [favoriteTickers],
  );

  const filteredTokens = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const baseTokens = showFavoritesOnly
      ? tokens.filter((token) => favoriteSet.has(token.ticker.toUpperCase()))
      : tokens;

    if (!normalizedQuery) {
      return baseTokens;
    }

    return baseTokens.filter((token) => {
      const searchable = [
        token.title,
        token.ticker,
        token.description,
      ].join(" ").toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [favoriteSet, query, showFavoritesOnly, tokens]);

  function toggleFavorite(ticker: string) {
    const normalizedTicker = ticker.toUpperCase();
    const currentSet = new Set(favoriteTickers.map((item) => item.toUpperCase()));
    const next = currentSet.has(normalizedTicker)
      ? favoriteTickers.filter((item) => item.toUpperCase() !== normalizedTicker)
      : [...favoriteTickers, normalizedTicker];

    writeFavoriteTickers(next);
  }

  const favoritesEmpty = showFavoritesOnly && favoriteSet.size === 0;

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-3">
          <span className="eyebrow-pill">Watchlist</span>
          <div>
            <h1 className="text-[2rem] font-black leading-[1.05] text-white">
              Токены
            </h1>
            <p className="mt-2 max-w-[31ch] text-[15px] leading-7 text-zinc-400">
              Бесплатный каталог разборов токенов. Избранные сохраняются на этом устройстве.
            </p>
          </div>
        </div>

        <button
          aria-label="Показать только избранные токены"
          aria-pressed={showFavoritesOnly}
          className={`favorite-button mt-9 ${
            showFavoritesOnly ? "is-active" : ""
          }`}
          onClick={() => setShowFavoritesOnly((value) => !value)}
          type="button"
        >
          <StarIcon filled={showFavoritesOnly} />
        </button>
      </header>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-zinc-300">
          Поиск по токенам
        </span>
        <span className="relative block">
          <svg
            aria-hidden
            className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-zinc-500"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="m21 21-4.3-4.3" />
            <circle cx="11" cy="11" r="7" />
          </svg>
          <input
            className="search-input pl-11"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Найти токен…"
            type="search"
            value={query}
          />
        </span>
      </label>

      <div className="grid gap-3">
        {filteredTokens.map((token) => (
          <TokenCardView
            coin={coinsById.get(token.coingeckoId)}
            favorite={favoriteSet.has(token.ticker.toUpperCase())}
            key={token.ticker}
            onToggleFavorite={() => toggleFavorite(token.ticker)}
            token={token}
          />
        ))}
      </div>

      {favoritesEmpty ? (
        <div className="app-card p-4 text-sm leading-6 text-zinc-400">
          В избранном пока пусто. Нажмите ⭐ рядом с токеном, чтобы сохранить его.
        </div>
      ) : null}

      {!favoritesEmpty && filteredTokens.length === 0 ? (
        <div className="app-card p-4 text-sm leading-6 text-zinc-400">
          Ничего не найдено
        </div>
      ) : null}
    </div>
  );
}
