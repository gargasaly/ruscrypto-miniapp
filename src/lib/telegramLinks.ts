"use client";

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

  if (!isTelegramLink(url)) {
    openExternalLink(url);
    return;
  }

  const webApp = getTelegramWebApp();

  if (!webApp) {
    window.location.href = url;
    return;
  }

  if (process.env.NODE_ENV === "development") {
    console.info("[telegram-link] openTelegramLink + close");
  }

  if (isHttpTelegramLink(url) && webApp.openTelegramLink) {
    webApp.openTelegramLink(url);
  } else {
    window.location.href = url;
  }

  closeTelegramWebAppWithRetries(webApp);
}
