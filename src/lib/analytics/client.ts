"use client";

import { normalizeAnalyticsEventType, type AnalyticsEventType } from "@/lib/analytics/events";
import { getTelegramUserUnsafe } from "@/lib/telegram/webapp";

type TrackEventPayload = {
  eventTarget?: string | null;
  metadata?: Record<string, unknown>;
  route?: string | null;
};

function currentRoute() {
  if (typeof window === "undefined") {
    return null;
  }

  return `${window.location.pathname}${window.location.search}`;
}

function currentPlatform() {
  if (typeof window === "undefined") {
    return null;
  }

  const webApp = (window as Window & {
    Telegram?: {
      WebApp?: {
        platform?: string;
      };
    };
  }).Telegram?.WebApp;

  return webApp?.platform ?? window.navigator.userAgent.slice(0, 120);
}

export function trackEvent(eventType: AnalyticsEventType | string, payload: TrackEventPayload = {}) {
  if (typeof window === "undefined") {
    return;
  }

  const body = JSON.stringify({
    eventTarget: payload.eventTarget ?? null,
    eventType: normalizeAnalyticsEventType(eventType),
    metadata: payload.metadata ?? {},
    platform: currentPlatform(),
    route: payload.route ?? currentRoute(),
    telegramUser: getTelegramUserUnsafe(),
  });

  void fetch("/api/analytics/track", {
    body,
    cache: "no-store",
    headers: {
      "content-type": "application/json",
    },
    keepalive: body.length < 60_000,
    method: "POST",
  }).catch(() => {
    // Analytics must never affect the Mini App UX.
  });
}
