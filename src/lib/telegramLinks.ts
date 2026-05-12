"use client";

type TelegramWebAppLinks = {
  close?: () => void;
  openLink?: (url: string) => void;
  openTelegramLink?: (url: string) => void;
};

function getTelegramWebApp() {
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
  const webApp = getTelegramWebApp();

  if (webApp?.openLink) {
    webApp.openLink(url);
    return;
  }

  window.location.href = url;
}

export function openTelegramPostAndClose(url: string) {
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
  window.setTimeout(() => {
    webApp.close?.();
  }, 220);
}
