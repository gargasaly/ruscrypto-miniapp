"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getMainRisk,
  manualRiskCalendar,
  normalizeRiskEvents,
  type RiskApiResponse,
  type RiskEvent,
} from "@/lib/riskCalendar";

type RiskDataState = {
  events: RiskEvent[];
  error: string | null;
  loading: boolean;
  mainRisk: RiskEvent;
  updatedAt: string | null;
};

function fallbackState(): RiskDataState {
  const events = normalizeRiskEvents(manualRiskCalendar);

  return {
    error: null,
    events,
    loading: true,
    mainRisk: getMainRisk(events),
    updatedAt: null,
  };
}

export function useRiskData() {
  const [state, setState] = useState<RiskDataState>(() => fallbackState());

  useEffect(() => {
    let active = true;

    async function loadRiskData() {
      try {
        const response = await fetch("/api/risks", {
          cache: "no-store",
        });
        const data = (await response.json()) as RiskApiResponse;

        if (!active) {
          return;
        }

        const events = data.events?.length
          ? data.events
          : normalizeRiskEvents(manualRiskCalendar);

        setState({
          error: response.ok ? null : "Риски временно недоступны",
          events,
          loading: false,
          mainRisk: data.mainRisk ?? getMainRisk(events),
          updatedAt: data.updatedAt ?? null,
        });
      } catch {
        if (!active) {
          return;
        }

        const fallback = fallbackState();
        setState({
          ...fallback,
          error: "Риски временно недоступны",
          loading: false,
        });
      }
    }

    void loadRiskData();

    return () => {
      active = false;
    };
  }, []);

  return useMemo(() => state, [state]);
}
