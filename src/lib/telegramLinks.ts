"use client";

type TelegramWebAppLinks = {
  close?: () => void;
  openLink?: (url: string) => void;
  openTelegramLink?: (url: string) => void;
};

function getTelegramWebApp() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return (window as unknown as {
    Telegram?: {
      WebApp?: TelegramWebAppLinks;
    };
  }).Telegram?.WebApp;
}

export function isTelegramChannelLink(url: string) {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.replace(/\/+$/, "");

    return (
      parsed.hostname === "t.me" &&
      (pathname.startsWith("/ruscrypto2026/") ||
        pathname === "/boost/ruscrypto2026")
    );
  } catch {
    return false;
  }
}

export function openExternalLink(url: string) {
  if (typeof window === "undefined") {
    return;
  }

  const webApp = getTelegramWebApp();

  if (webApp?.openLink) {
    webApp.openLink(url);
    return;
  }

  window.location.href = url;
}

function closeTelegramWebAppWithRetries(webApp: TelegramWebAppLinks) {
  if (!webApp.close) {
    return;
  }

  [0, 250, 700, 1200].forEach((delay) => {
    window.setTimeout(() => {
      console.info("[telegram-link] closing webapp after openTelegramLink");
      webApp.close?.();
    }, delay);
  });
}

export function openTelegramLinkAndClose(url: string) {
  if (typeof window === "undefined") {
    return;
  }

  if (!isTelegramChannelLink(url)) {
    openExternalLink(url);
    return;
  }

  const webApp = getTelegramWebApp();

  if (!webApp?.openTelegramLink) {
    window.location.href = url;
    return;
  }

  webApp.openTelegramLink(url);
  closeTelegramWebAppWithRetries(webApp);
}
