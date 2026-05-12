"use client";

import Link from "next/link";
import { Disclaimer } from "@/components/disclaimer";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";
import { openExternalLink } from "@/lib/telegramLinks";

const MEXC_URL = "https://promote.mexc.com/b/ruscrypto2026";

export default function BonusesPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        description="Спокойный раздел с партнёрскими предложениями без обещаний доходности и без давления."
        eyebrow="Партнёры"
        title="Акции и бонусы"
      />

      <section className="app-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <StatusBadge tone="green">MEXC</StatusBadge>
            <h2 className="mt-3 text-2xl font-black text-white">
              MEXC для новичков
            </h2>
          </div>
        </div>

        <p className="mt-3 text-sm leading-6 text-zinc-300">
          По моей ссылке можно зарегистрироваться на MEXC с автоматически
          привязанным реферальным кодом и получить доступ к доступным акциям
          для новых пользователей. После регистрации доступны условия с 0
          комиссиями по актуальным правилам биржи.
        </p>

        <button
          className="primary-button mt-4 w-full"
          onClick={() => openExternalLink(MEXC_URL)}
          type="button"
        >
          Открыть MEXC
        </button>
      </section>

      <Link className="secondary-button" href="/more">
        Назад в Ещё
      </Link>

      <Disclaimer>
        Условия акций задаёт биржа. Перед регистрацией и любыми действиями
        внимательно проверьте актуальные правила на стороне MEXC.
      </Disclaimer>
    </div>
  );
}
