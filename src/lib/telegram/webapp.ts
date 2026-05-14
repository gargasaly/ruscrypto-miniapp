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
