"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Disclaimer } from "@/components/disclaimer";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";

type TelegramWebApp = {
  close?: () => void;
  initDataUnsafe?: {
    user?: unknown;
  };
  openTelegramLink?: (url: string) => void;
  platform?: string;
  version?: string;
};

type DiagnosticState = {
  hasTelegram: boolean;
  hasUser: boolean;
  platform: string;
  version: string;
};

const TEST_URL = "https://t.me/ruscrypto2026/7";
const TEST_DEEP_LINK = "tg://resolve?domain=ruscrypto2026&post=7";

function getTelegramWebApp() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return (window as unknown as {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }).Telegram?.WebApp;
}

function readDiagnostics(): DiagnosticState {
  const tg = getTelegramWebApp();

  return {
    hasTelegram: Boolean(tg),
    hasUser: Boolean(tg?.initDataUnsafe?.user),
    platform: tg?.platform || "unknown",
    version: tg?.version || "unknown",
  };
}

export default function LinkTestPage() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticState>(() => ({
    hasTelegram: false,
    hasUser: false,
    platform: "unknown",
    version: "unknown",
  }));
  const [lastAction, setLastAction] = useState("Ожидаем тест");
  const [lastTest, setLastTest] = useState("Не запускался");
  const [logs, setLogs] = useState<string[]>([]);

  const testButtons = useMemo(
    () => [
      {
        label: "Тест 1: открыть → закрыть сразу",
        run: runOpenThenClose,
      },
      {
        label: "Тест 2: закрыть → открыть",
        run: runCloseThenOpen,
      },
      {
        label: "Тест 3: location → закрыть",
        run: runLocationThenClose,
      },
      {
        label: "Тест 4: закрыть → location",
        run: runCloseThenLocation,
      },
      {
        label: "Тест 5: tg:// → закрыть",
        run: runDeepLinkThenClose,
      },
      {
        label: "Тест 6: закрыть → tg://",
        run: runCloseThenDeepLink,
      },
    ],
    [],
  );

  useEffect(() => {
    setDiagnostics(readDiagnostics());
  }, []);

  function addLog(message: string) {
    setLogs((items) => [message, ...items].slice(0, 8));
    setLastAction(message);
  }

  function markTest(name: string) {
    setDiagnostics(readDiagnostics());
    setLastTest(name);
    addLog(`${name}: запущен`);
  }

  function callClose(tg: TelegramWebApp | undefined, label: string) {
    if (!tg?.close) {
      addLog(`${label}: tg.close недоступен`);
      return;
    }

    addLog(`${label}: вызван tg.close`);
    tg.close();
  }

  function scheduleClose(tg: TelegramWebApp | undefined, delay: number, label: string) {
    if (!tg?.close) {
      return;
    }

    window.setTimeout(() => {
      addLog(`${label}: повторный close через ${delay} мс`);
      tg.close?.();
    }, delay);
  }

  function runOpenThenClose() {
    const name = "Тест 1";
    markTest(name);
    const tg = getTelegramWebApp();

    if (tg?.openTelegramLink) {
      addLog(`${name}: вызван openTelegramLink`);
      tg.openTelegramLink(TEST_URL);
      callClose(tg, name);
      [100, 300, 800].forEach((delay) => scheduleClose(tg, delay, name));
      return;
    }

    addLog(`${name}: Telegram WebApp/openTelegramLink нет, fallback location`);
    window.location.href = TEST_URL;
  }

  function runCloseThenOpen() {
    const name = "Тест 2";
    markTest(name);
    const tg = getTelegramWebApp();

    if (tg) {
      callClose(tg, name);
      window.setTimeout(() => {
        if (tg.openTelegramLink) {
          addLog(`${name}: openTelegramLink после close`);
          tg.openTelegramLink(TEST_URL);
        } else {
          addLog(`${name}: fallback location после close`);
          window.location.href = TEST_URL;
        }
      }, 100);
      return;
    }

    addLog(`${name}: Telegram WebApp нет, fallback location`);
    window.location.href = TEST_URL;
  }

  function runLocationThenClose() {
    const name = "Тест 3";
    markTest(name);
    const tg = getTelegramWebApp();

    addLog(`${name}: window.location.href`);
    window.location.href = TEST_URL;
    callClose(tg, name);
    [100, 300].forEach((delay) => scheduleClose(tg, delay, name));
  }

  function runCloseThenLocation() {
    const name = "Тест 4";
    markTest(name);
    const tg = getTelegramWebApp();

    callClose(tg, name);
    window.setTimeout(() => {
      addLog(`${name}: location после close`);
      window.location.href = TEST_URL;
    }, 100);
  }

  function runDeepLinkThenClose() {
    const name = "Тест 5";
    markTest(name);
    const tg = getTelegramWebApp();

    addLog(`${name}: window.location.href tg://`);
    window.location.href = TEST_DEEP_LINK;
    callClose(tg, name);
    [100, 300, 800].forEach((delay) => scheduleClose(tg, delay, name));
  }

  function runCloseThenDeepLink() {
    const name = "Тест 6";
    markTest(name);
    const tg = getTelegramWebApp();

    callClose(tg, name);
    window.setTimeout(() => {
      addLog(`${name}: tg:// после close`);
      window.location.href = TEST_DEEP_LINK;
    }, 100);
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        description="Проверяем, какой способ открывает пост и закрывает Mini App на мобильном Telegram."
        eyebrow="Mobile test"
        title="Тест открытия Telegram-ссылок"
      />

      <section className="app-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-zinc-400">
              Тестовая ссылка
            </p>
            <p className="mt-1 break-all text-sm font-bold text-emerald-200">
              {TEST_URL}
            </p>
          </div>
          <StatusBadge tone="green">ruscrypto2026</StatusBadge>
        </div>
      </section>

      <section className="grid gap-3">
        {testButtons.map((button) => (
          <button
            className="app-card tap-card p-4 text-left text-base font-black text-white"
            key={button.label}
            onClick={button.run}
            type="button"
          >
            {button.label}
          </button>
        ))}
      </section>

      <section className="app-card p-4">
        <h2 className="text-xl font-black text-white">Диагностика</h2>
        <div className="mt-4 grid gap-2 text-sm leading-6 text-zinc-300">
          <p>
            Telegram WebApp:{" "}
            <span className="font-bold text-white">
              {diagnostics.hasTelegram ? "найден" : "не найден"}
            </span>
          </p>
          <p>
            Platform:{" "}
            <span className="font-bold text-white">{diagnostics.platform}</span>
          </p>
          <p>
            Version:{" "}
            <span className="font-bold text-white">{diagnostics.version}</span>
          </p>
          <p>
            initDataUnsafe.user есть:{" "}
            <span className="font-bold text-white">
              {diagnostics.hasUser ? "да" : "нет"}
            </span>
          </p>
          <p>
            Последний тест:{" "}
            <span className="font-bold text-white">{lastTest}</span>
          </p>
          <p>
            Статус:{" "}
            <span className="font-bold text-emerald-200">{lastAction}</span>
          </p>
        </div>
      </section>

      <section className="app-card p-4">
        <h2 className="text-lg font-black text-white">Лог на странице</h2>
        <div className="mt-3 grid gap-2 text-xs leading-5 text-zinc-400">
          {logs.length > 0 ? (
            logs.map((item, index) => (
              <p className="mini-card px-3 py-2" key={`${item}-${index}`}>
                {item}
              </p>
            ))
          ) : (
            <p className="text-zinc-500">Пока действий не было.</p>
          )}
        </div>
      </section>

      <Link className="secondary-button" href="/more">
        Назад в Ещё
      </Link>

      <Disclaimer>
        Тестовая страница нужна только для выбора рабочего сценария в мобильном
        Telegram. После проверки её можно удалить.
      </Disclaimer>
    </div>
  );
}
