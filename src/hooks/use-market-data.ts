"use client";

import { useEffect, useMemo, useState } from "react";
import type { MarketCoin, MarketResponse } from "@/lib/market";

type MarketDataState = {
  coins: MarketCoin[];
  error: string | null;
  loading: boolean;
  updatedAt: string | null;
};

export function useMarketData() {
  const [state, setState] = useState<MarketDataState>({
    coins: [],
    error: null,
    loading: true,
    updatedAt: null,
  });

  useEffect(() => {
    let active = true;

    async function loadMarketData() {
      try {
        const response = await fetch("/api/market", {
          cache: "no-store",
        });
        const data = (await response.json()) as MarketResponse;

        if (!active) {
          return;
        }

        setState({
          coins: data.coins ?? [],
          error: response.ok ? (data.error ?? null) : (data.error ?? "Ошибка API"),
          loading: false,
          updatedAt: data.updatedAt ?? null,
        });
      } catch {
        if (!active) {
          return;
        }

        setState({
          coins: [],
          error: "Данные временно недоступны",
          loading: false,
          updatedAt: null,
        });
      }
    }

    void loadMarketData();

    const intervalId = window.setInterval(() => {
      void loadMarketData();
    }, 60_000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const coinsById = useMemo(() => {
    return new Map(state.coins.map((coin) => [coin.id, coin]));
  }, [state.coins]);

  return {
    ...state,
    coinsById,
  };
}
