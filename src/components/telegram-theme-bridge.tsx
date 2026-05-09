"use client";

import { useEffect } from "react";

type TelegramWebApp = {
  expand?: () => void;
  ready?: () => void;
  setBackgroundColor?: (color: string) => void;
  setHeaderColor?: (color: string) => void;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

const telegramDarkColor = "#020807";
const telegramHeaderColor = "#06120f";

export function TelegramThemeBridge() {
  useEffect(() => {
    document.documentElement.style.backgroundColor = telegramDarkColor;
    document.body.style.backgroundColor = telegramDarkColor;
    document.documentElement.style.colorScheme = "dark";

    const webApp = window.Telegram?.WebApp;

    if (!webApp) {
      return;
    }

    webApp.ready?.();
    webApp.expand?.();
    webApp.setHeaderColor?.(telegramHeaderColor);
    webApp.setBackgroundColor?.(telegramDarkColor);
  }, []);

  return null;
}
