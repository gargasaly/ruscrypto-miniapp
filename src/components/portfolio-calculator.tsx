"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { trackEvent } from "@/lib/analytics/client";
import {
  portfolioAmounts,
  portfolioProfiles,
  type PortfolioProfile,
} from "@/lib/content";
import { getTelegramInitData, watchTelegramInitData } from "@/lib/telegram/webapp";

function formatAmount(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);
}

export function PortfolioCalculator() {
  const [amount, setAmount] = useState(500);
  const [profileId, setProfileId] =
    useState<PortfolioProfile["id"]>("balanced");
  const [diaryAdminVisible, setDiaryAdminVisible] = useState(false);
  const [diaryHref, setDiaryHref] = useState("/portfolio/diary");

  const activeProfile =
    portfolioProfiles.find((profile) => profile.id === profileId) ??
    portfolioProfiles[0];

  const rows = useMemo(
    () =>
      activeProfile.categories.map((category) => ({
        ...category,
        value: (amount * category.percent) / 100,
      })),
    [activeProfile, amount],
  );

  useEffect(() => {
    trackEvent("portfolio_open", {
      eventTarget: "portfolio",
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkAdmin(initData: string) {
      if (!initData) {
        return;
      }

      try {
        const response = await fetch("/api/me", {
          body: JSON.stringify({ initData }),
          cache: "no-store",
          headers: {
            "content-type": "application/json",
          },
          method: "POST",
        });
        const data = (await response.json()) as {
          isAdmin?: boolean;
          user?: {
            isAdmin?: boolean;
          };
        };

        if (!cancelled && (data.isAdmin === true || data.user?.isAdmin === true)) {
          setDiaryAdminVisible(true);
        }
      } catch {
        // Diary entry visibility must not affect the public portfolio screen.
      }
    }

    if (
      process.env.NODE_ENV === "development" &&
      new URLSearchParams(window.location.search).get("admin") === "1"
    ) {
      setDiaryAdminVisible(true);
      setDiaryHref("/portfolio/diary?admin=1");
      return undefined;
    }

    const initData = getTelegramInitData();

    if (initData) {
      void checkAdmin(initData);
      return () => {
        cancelled = true;
      };
    }

    const stopWatching = watchTelegramInitData((value) => {
      void checkAdmin(value);
    });

    return () => {
      cancelled = true;
      stopWatching();
    };
  }, []);

  return (
    <div className="space-y-4">
      <section className="app-card overflow-hidden p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white">
              Наш подготовленный портфель
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Обновлённая модель портфеля до 2028: риск-офф структура, коридоры долей,
              стейбл-буфер и активы, выведенные за скобки.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          <Link className="primary-button w-full" href="/portfolio/prepared">
            Открыть отчёт
          </Link>
          <Link
            className="flex min-h-[60px] w-full min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border border-emerald-200/20 bg-emerald-300/[0.09] px-3 py-3 text-center text-sm font-black text-emerald-100 transition hover:bg-emerald-300/[0.14]"
            href={diaryHref}
          >
            <span className="max-w-full break-words leading-tight">Портфельный дневник</span>
            <StatusBadge tone="green">{diaryAdminVisible ? "Admin" : "Pro"}</StatusBadge>
          </Link>
        </div>
        <p className="mt-3 text-xs leading-5 text-zinc-500">
          {diaryAdminVisible
            ? "Admin preview: можно сохранить количества активов и сравнить структуру с коридорами модели."
            : "Можно сохранить личную структуру. Pro открывает проверку портфеля и безлимитный чек-лист."}
        </p>
        <Link
          className="mt-4 block rounded-[22px] border border-emerald-300/20 bg-emerald-300/[0.07] p-4 text-left transition hover:bg-emerald-300/[0.11]"
          href="/portfolio/staking"
        >
          <span className="block text-lg font-black text-white">Стейкинг</span>
          <span className="mt-2 block text-sm leading-6 text-zinc-400">
            Где можно получать доходность по активам из подготовленного портфеля.
            С учётом рисков, комиссий и сроков вывода.
          </span>
          <span className="mt-3 inline-flex min-h-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-200 to-emerald-300 px-3 text-sm font-black text-[#06201b]">
            Открыть стейкинг
          </span>
        </Link>
      </section>

      <section className="app-card p-4">
        <h2 className="text-lg font-black text-white">Сумма</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {portfolioAmounts.map((value) => (
            <button
              className={`h-11 rounded-[16px] border text-sm font-bold transition ${
                amount === value
                  ? "border-transparent bg-gradient-to-br from-teal-200 to-emerald-300 text-[#06201b] shadow-lg shadow-emerald-950/20"
                  : "border-white/10 bg-black/20 text-zinc-300 hover:bg-white/[0.06]"
              }`}
              key={value}
              onClick={() => setAmount(value)}
              type="button"
            >
              {value} USDT
            </button>
          ))}
        </div>
        <label className="mt-3 block">
          <span className="mb-2 block text-sm font-medium text-zinc-300">
            Своя сумма
          </span>
          <input
            className="search-input"
            min={0}
            onChange={(event) => setAmount(Number(event.target.value) || 0)}
            type="number"
            value={amount}
          />
        </label>
      </section>

      <section className="app-card p-4">
        <h2 className="text-lg font-black text-white">Риск-профиль</h2>
        <div className="mt-3 grid gap-2">
          {portfolioProfiles.map((profile) => {
            const active = profile.id === profileId;

            return (
              <button
                className={`rounded-[18px] border p-3 text-left transition ${
                  active
                    ? "border-emerald-300/35 bg-emerald-300/10"
                    : "border-white/10 bg-black/20 hover:bg-white/[0.055]"
                }`}
                key={profile.id}
                onClick={() => setProfileId(profile.id)}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-white">{profile.title}</span>
                  {active ? <StatusBadge tone="green">Выбран</StatusBadge> : null}
                </div>
                <p className="mt-1 text-sm leading-6 text-zinc-400">
                  {profile.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="app-card p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-zinc-400">Результат</p>
            <h2 className="text-2xl font-black text-white">
              {formatAmount(amount)} USDT
            </h2>
          </div>
          <StatusBadge tone="neutral">{activeProfile.title}</StatusBadge>
        </div>

        <div className="mt-4 grid gap-3">
          {rows.map((row) => (
            <div className="mini-card p-3" key={row.name}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-white">{row.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">{row.note}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-white">{row.percent}%</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {formatAmount(row.value)} USDT
                  </p>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-300 to-emerald-300"
                  style={{ width: `${row.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="app-card border-cyan-300/20 p-4">
        <h2 className="text-lg font-black text-white">Почему так?</h2>
        <p className="mt-2 text-sm leading-6 text-cyan-50">
          {activeProfile.rationale}
        </p>
      </section>

      <div className="rounded-[20px] border border-amber-300/20 bg-amber-300/[0.08] px-4 py-3 text-sm leading-5 text-amber-100">
        Это обучающий пример, не финансовая рекомендация
      </div>
    </div>
  );
}
