"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { TokenLogo } from "@/components/token-logo";
import { useMarketData } from "@/hooks/use-market-data";
import { formatPercent, formatUsdPrice } from "@/lib/formatters";
import { openTelegramLinkAndClose } from "@/lib/telegramLinks";
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
        <button
          aria-label={`Разбор ${token.title}`}
          className="absolute inset-0 z-0"
          onClick={(event) => {
            event.preventDefault();
            openTelegramLinkAndClose(tokenUrl);
          }}
          type="button"
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

          {!tokenUrl ? (
            <span className="mt-2 inline-flex w-fit rounded-full border border-emerald-200/12 bg-emerald-300/[0.055] px-2.5 py-1 text-[11px] font-bold text-emerald-100/75">
              Скоро
            </span>
          ) : null}
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

    </article>
  );
}

export function TokenExplorer({ tokens }: TokenExplorerProps) {
  const { coinsById } = useMarketData();
  const searchRef = useRef<HTMLDivElement>(null);
  const favoriteTickers = useSyncExternalStore(
    subscribeFavoriteTickers,
    readFavoriteTickers,
    () => EMPTY_FAVORITES,
  );
  const [query, setQuery] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

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

      <div className="relative z-30 block" ref={searchRef}>
        <label
          className="mb-2 block text-sm font-semibold text-zinc-300"
          htmlFor="token-search"
        >
          Поиск по токенам
        </label>
        <span className="relative block">
          <svg
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-zinc-500"
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
            className="search-input search-input-with-icon search-input-with-toggle"
            id="token-search"
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setDropdownOpen(true)}
            placeholder="Найти токен…"
            type="search"
            value={query}
          />
          <button
            aria-label={
              dropdownOpen
                ? "Скрыть список токенов"
                : "Показать список токенов"
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
        </span>
        {dropdownOpen ? (
          <div className="dropdown-scroll absolute left-0 right-0 top-full z-40 mt-2 max-h-[340px] overflow-y-auto rounded-[22px] border border-emerald-200/15 bg-[#07100f]/95 p-2 shadow-2xl shadow-black/45 backdrop-blur-xl">
            {filteredTokens.length > 0 ? (
              filteredTokens.map((token) => {
                const tokenUrl = token.url?.trim();
                const coin = coinsById.get(token.coingeckoId);

                return (
                  <button
                    className={`flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left transition ${
                      tokenUrl
                        ? "text-zinc-200 hover:bg-emerald-300/[0.08] hover:text-white"
                        : "cursor-default text-zinc-500"
                    }`}
                    disabled={!tokenUrl}
                    key={`token-dropdown-${token.ticker}`}
                    onPointerDown={(event) => {
                      event.preventDefault();

                      if (tokenUrl) {
                        openTelegramLinkAndClose(tokenUrl);
                      }

                      setDropdownOpen(false);
                    }}
                    type="button"
                  >
                    <TokenLogo
                      logo={token.logo}
                      remoteLogo={coin?.image}
                      ticker={token.ticker}
                      title={token.title}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-white">
                        {token.ticker}
                        <span className="ml-2 font-semibold text-zinc-400">
                          {token.title}
                        </span>
                      </span>
                      <span className="mt-1 line-clamp-1 block text-xs leading-5 text-zinc-500">
                        {token.sector ? `${token.sector} · ` : ""}
                        {token.description}
                      </span>
                      {!tokenUrl ? (
                        <span className="mt-2 inline-flex rounded-full border border-emerald-200/12 bg-emerald-300/[0.055] px-2 py-0.5 text-[10px] font-bold text-emerald-100/75">
                          Разбор скоро
                        </span>
                      ) : null}
                    </span>
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
