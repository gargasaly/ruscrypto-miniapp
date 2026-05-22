"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics/client";
import { getTelegramInitData, watchTelegramInitData } from "@/lib/telegram/webapp";

function getRoute() {
  if (typeof window === "undefined") {
    return "/";
  }

  return `${window.location.pathname}${window.location.search}`;
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const appOpenSentRef = useRef(false);

  useEffect(() => {
    function sendAppOpen() {
      if (appOpenSentRef.current) {
        return;
      }

      appOpenSentRef.current = true;
      trackEvent("app_open", {
        route: getRoute(),
      });
    }

    if (getTelegramInitData()) {
      sendAppOpen();
      return undefined;
    }

    const stopWatching = watchTelegramInitData(() => sendAppOpen());
    const fallbackTimer = window.setTimeout(sendAppOpen, 2200);

    return () => {
      stopWatching();
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  useEffect(() => {
    trackEvent("page_view", {
      route: getRoute(),
    });
  }, [pathname]);

  return null;
}
