"use client";

import { useEffect, useMemo, useState } from "react";

export type TokenPricePoint = {
  change24h: number | null;
  price: number | null;
  source: string;
  updatedAt: string;
};

type PricesResponse = {
  ok?: boolean;
  prices?: Record<string, TokenPricePoint>;
  updatedAt?: string;
};

type TokenPricesState = {
  error: string | null;
  loading: boolean;
  pricesBySymbol: Map<string, TokenPricePoint>;
  updatedAt: string | null;
};

const EMPTY_PRICE_MAP = new Map<string, TokenPricePoint>();

export function useTokenPrices(symbols: string[]) {
  const symbolsKey = useMemo(
    () =>
      Array.from(new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)))
        .sort()
        .join(","),
    [symbols],
  );
  const [state, setState] = useState<TokenPricesState>({
    error: null,
    loading: true,
    pricesBySymbol: EMPTY_PRICE_MAP,
    updatedAt: null,
  });

  useEffect(() => {
    if (!symbolsKey) {
      setState({
        error: null,
        loading: false,
        pricesBySymbol: EMPTY_PRICE_MAP,
        updatedAt: null,
      });
      return;
    }

    let active = true;

    async function loadPrices() {
      try {
        const response = await fetch(`/api/prices?symbols=${encodeURIComponent(symbolsKey)}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as PricesResponse;
        const prices = new Map<string, TokenPricePoint>();

        Object.entries(data.prices ?? {}).forEach(([symbol, point]) => {
          prices.set(symbol.toUpperCase(), point);
        });

        if (!active) {
          return;
        }

        setState({
          error: response.ok ? null : "prices-unavailable",
          loading: false,
          pricesBySymbol: prices,
          updatedAt: data.updatedAt ?? null,
        });
      } catch {
        if (!active) {
          return;
        }

        setState((current) => ({
          ...current,
          error: "prices-unavailable",
          loading: false,
        }));
      }
    }

    void loadPrices();

    const intervalId = window.setInterval(() => {
      void loadPrices();
    }, 60_000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [symbolsKey]);

  return state;
}
