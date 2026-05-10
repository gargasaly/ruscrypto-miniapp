"use client";

import { useEffect, useMemo, useState } from "react";
import { btcLevelFallback, type BtcLevelResponse } from "@/lib/btcLevel";

type BtcLevelState = {
  data: BtcLevelResponse;
  error: string | null;
  loading: boolean;
};

export function useBtcLevel() {
  const [state, setState] = useState<BtcLevelState>({
    data: btcLevelFallback,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let active = true;

    async function loadBtcLevel() {
      try {
        const response = await fetch("/api/btc-level", {
          cache: "no-store",
        });
        const data = (await response.json()) as BtcLevelResponse;

        if (!active) {
          return;
        }

        setState({
          data: response.ok ? data : btcLevelFallback,
          error: response.ok ? (data.error ?? null) : "Уровень временно недоступен",
          loading: false,
        });
      } catch {
        if (!active) {
          return;
        }

        setState({
          data: btcLevelFallback,
          error: "Уровень временно недоступен",
          loading: false,
        });
      }
    }

    void loadBtcLevel();

    const intervalId = window.setInterval(() => {
      void loadBtcLevel();
    }, 15 * 60_000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return useMemo(() => state, [state]);
}
