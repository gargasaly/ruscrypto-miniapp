"use client";

import { trackEvent } from "@/lib/analytics/client";

export type TelegramWebAppLinks = {
  close?: () => void;
  initData?: string;
  initDataUnsafe?: {
    user?: unknown;
  };
  openLink?: (url: string) => void;
  openTelegramLink?: (url: string) => void;
  platform?: string;
  version?: string;
};

export function getTelegramWebApp() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return (window as unknown as {
    Telegram?: {
      WebApp?: TelegramWebAppLinks;
    };
  }).Telegram?.WebApp;
}

export function watchTelegramWebApp(
  onCheck: (webApp: TelegramWebAppLinks | undefined) => void,
) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const delays = [0, 100, 300, 700, 1200];
  const timers = delays.map((delay) =>
    window.setTimeout(() => {
      onCheck(getTelegramWebApp());
    }, delay),
  );

  return () => {
    timers.forEach((timer) => window.clearTimeout(timer));
  };
}

function parseUrl(url: string) {
  try {
    return new URL(url, "https://ruscrypto-miniapp.local");
  } catch {
    return null;
  }
}

export function isTelegramLink(url: string) {
  const parsed = parseUrl(url);

  if (!parsed) {
    return false;
  }

  const hostname = parsed.hostname.replace(/^www\./, "");

  return (
    parsed.protocol === "tg:" ||
    ((parsed.protocol === "https:" || parsed.protocol === "http:") &&
      (hostname === "t.me" || hostname === "telegram.me"))
  );
}

function isHttpTelegramLink(url: string) {
  const parsed = parseUrl(url);

  if (!parsed) {
    return false;
  }

  const hostname = parsed.hostname.replace(/^www\./, "");

  return (
    (parsed.protocol === "https:" || parsed.protocol === "http:") &&
    (hostname === "t.me" || hostname === "telegram.me")
  );
}

export function isTelegramChannelLink(url: string) {
  try {
    const parsed = parseUrl(url);

    if (!parsed) {
      return false;
    }

    const pathname = parsed.pathname.replace(/\/+$/, "");
    const hostname = parsed.hostname.replace(/^www\./, "");

    return (
      (hostname === "t.me" || hostname === "telegram.me") &&
      (pathname.startsWith("/ruscrypto2026/") ||
        pathname === "/boost/ruscrypto2026")
    );
  } catch {
    return false;
  }
}

function analyticsEventForUrl(url: string) {
  const parsed = parseUrl(url);

  if (!parsed) {
    return "external_link_click";
  }

  const hostname = parsed.hostname.replace(/^www\./, "");
  const pathname = parsed.pathname.replace(/\/+$/, "");

  if (hostname === "t.me" || hostname === "telegram.me") {
    if (pathname === "/WantToPayBot") {
      return "virtual_card_bot_click";
    }

    if (pathname === "/boost/ruscrypto2026" || pathname === "/ruscrypto2026") {
      return "support_channel_click";
    }
  }

  return "external_link_click";
}

function trackLinkClick(url: string) {
  trackEvent(analyticsEventForUrl(url), {
    eventTarget: url,
  });
}

export function openExternalLink(url: string) {
  if (typeof window === "undefined") {
    return;
  }

  trackLinkClick(url);
  const webApp = getTelegramWebApp();

  if (webApp?.openLink) {
    webApp.openLink(url);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

export function openTelegramLink(url: string) {
  if (typeof window === "undefined") {
    return;
  }

  trackLinkClick(url);

  if (!isTelegramLink(url)) {
    const webApp = getTelegramWebApp();

    if (webApp?.openLink) {
      webApp.openLink(url);
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  const webApp = getTelegramWebApp();

  if (isHttpTelegramLink(url) && webApp?.openTelegramLink) {
    webApp.openTelegramLink(url);
    return;
  }

  if (webApp?.openLink) {
    webApp.openLink(url);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

function closeTelegramWebAppWithRetries(webApp: TelegramWebAppLinks) {
  if (!webApp.close) {
    return;
  }

  const close = () => {
    if (process.env.NODE_ENV === "development") {
      console.info("[telegram-link] closing webapp after openTelegramLink");
    }

    webApp.close?.();
  };

  close();

  [100, 300, 800, 1500].forEach((delay) => {
    window.setTimeout(close, delay);
  });
}

export function openTelegramLinkAndClose(url: string) {
  if (typeof window === "undefined") {
    return;
  }

  trackLinkClick(url);

  if (!isTelegramLink(url)) {
    const webApp = getTelegramWebApp();

    if (webApp?.openLink) {
      webApp.openLink(url);
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  const webApp = getTelegramWebApp();

  if (!webApp) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  if (process.env.NODE_ENV === "development") {
    console.info("[telegram-link] openTelegramLink + close");
  }

  if (isHttpTelegramLink(url) && webApp.openTelegramLink) {
    webApp.openTelegramLink(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  closeTelegramWebAppWithRetries(webApp);
}
