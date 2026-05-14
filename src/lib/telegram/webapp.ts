export type TelegramUnsafeUser = {
  first_name?: string;
  id?: number;
  language_code?: string;
  last_name?: string;
  username?: string;
};

type TelegramWebApp = {
  initData?: string;
  initDataUnsafe?: {
    user?: TelegramUnsafeUser;
  };
  openInvoice?: (url: string, callback?: (status: string) => void) => void;
  openTelegramLink?: (url: string) => void;
};

function getWebApp() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return (window as Window & { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
}

export function getTelegramInitData() {
  return getWebApp()?.initData ?? "";
}

export function getTelegramUserUnsafe() {
  return getWebApp()?.initDataUnsafe?.user ?? null;
}

export function openTelegramInvoice(url: string, callback?: (status: string) => void) {
  const webApp = getWebApp();

  if (webApp?.openInvoice) {
    webApp.openInvoice(url, callback);
    return "openInvoice" as const;
  }

  if (webApp?.openTelegramLink) {
    webApp.openTelegramLink(url);
    callback?.("opened");
    return "openTelegramLink" as const;
  }

  if (typeof window !== "undefined") {
    window.location.href = url;
  }

  return "location" as const;
}

export function watchTelegramInitData(onInitData: (initData: string) => void) {
  const delays = [0, 100, 300, 700, 1200, 2000];
  const timers: number[] = [];
  let done = false;

  delays.forEach((delay) => {
    const timer = window.setTimeout(() => {
      if (done) {
        return;
      }

      const initData = getTelegramInitData();

      if (initData) {
        done = true;
        onInitData(initData);
      }
    }, delay);

    timers.push(timer);
  });

  return () => {
    done = true;
    timers.forEach((timer) => window.clearTimeout(timer));
  };
}
