"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { StatusBadge } from "@/components/status-badge";
import { TokenLogo } from "@/components/token-logo";
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

function statusTone(status: TokenCard["status"]) {
  if (status === "published") {
    return "green";
  }

  return "yellow";
}

function statusLabel(status: TokenCard["status"]) {
  return status === "published" ? "Опубликовано" : "Скоро";
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
  favorite,
  onToggleFavorite,
  token,
}: {
  favorite: boolean;
  onToggleFavorite: () => void;
  token: TokenCard;
}) {
  const tokenUrl = token.url?.trim();

  return (
    <article className="app-card tap-card relative overflow-hidden p-4">
      {tokenUrl ? (
        <a
          aria-label={`Разбор ${token.title}`}
          className="absolute inset-0 z-0"
          href={tokenUrl}
          rel="noopener noreferrer"
          target="_blank"
        />
      ) : null}

      <div className="pointer-events-none relative z-10 flex items-start gap-3">
        <TokenLogo logo={token.logo} ticker={token.ticker} title={token.title} />

        <div className="min-w-0 flex-1 pr-12">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black leading-tight text-white">
              {token.title}
            </h2>
            <span className="rounded-full border border-emerald-200/10 bg-black/20 px-2 py-0.5 text-xs font-bold text-zinc-400">
              {token.ticker}
            </span>
          </div>

          <p className="mt-2 text-sm leading-6 text-zinc-400">
            {token.description}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <StatusBadge tone={statusTone(token.status)}>
              {statusLabel(token.status)}
            </StatusBadge>
            {!tokenUrl ? <StatusBadge tone="yellow">Скоро</StatusBadge> : null}
          </div>
        </div>

        <div className="absolute right-0 top-12">
          {tokenUrl ? <span className="chevron-soft">›</span> : null}
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
    </article>
  );
}

export function TokenExplorer({ tokens }: TokenExplorerProps) {
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
        <input
          className="search-input"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Найти токен…"
          type="search"
          value={query}
        />
      </label>

      <div className="grid gap-3">
        {filteredTokens.map((token) => (
          <TokenCardView
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
