"use client";

import Link from "next/link";
import { Disclaimer } from "@/components/disclaimer";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";
import { openExternalLink, openTelegramLink } from "@/lib/telegramLinks";

const WANTTOPAY_SITE_URL = "https://wanttopay.net/?pid=48OWR";
const WANTTOPAY_BOT_URL = "https://t.me/WantToPayBot?start=w17851188--48OWR";

export default function VirtualCardPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        description="Аккуратный разбор платёжного инструмента для небольших онлайн-оплат."
        eyebrow="Wanttopay"
        title="Виртуальная карта"
      />

      <section className="app-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="green">виртуальная карта</StatusBadge>
          <StatusBadge tone="neutral">зарубежные сервисы</StatusBadge>
        </div>

        <h1 className="mt-4 text-2xl font-black leading-tight text-white">
          Виртуальная карта для зарубежных сервисов
        </h1>

        <div className="mt-4 space-y-4 text-sm leading-6 text-zinc-300">
          <p>
            Иногда в крипте и около неё вопрос не только в токенах, но и в оплате
            зарубежных сервисов, подписок и инструментов, если обычная карта не проходит.
          </p>
          <p>Один из вариантов - виртуальная карта через Wanttopay.</p>
          <p>
            Wanttopay - это Telegram-приложение для выпуска виртуальных зарубежных карт.
            Карту можно использовать для онлайн-платежей и подписок, где нужна зарубежная
            карта.
          </p>
        </div>
      </section>

      <section className="app-card p-4">
        <h2 className="text-lg font-black text-white">Важно понимать</h2>
        <div className="mt-3 grid gap-2 text-sm leading-6 text-zinc-300">
          {[
            "это не банковский счёт;",
            "это платёжный инструмент для оплат;",
            "карту не стоит использовать как накопительный счёт;",
            "не держите там крупные суммы;",
            "условия, комиссии и доступность могут меняться;",
            "для выпуска может потребоваться KYC.",
          ].map((item) => (
            <div className="mini-card p-3" key={item}>
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="app-card p-4">
        <h2 className="text-lg font-black text-white">Как я бы использовал</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          Только для небольших личных оплат: сервис, подписка или инструмент, который
          нужен в работе. Не как место хранения денег и не как способ переводить средства
          третьих лиц.
        </p>

        <div className="mt-4 grid gap-2 min-[420px]:grid-cols-2">
          <button
            className="primary-button justify-center"
            onClick={() => openTelegramLink(WANTTOPAY_BOT_URL)}
            type="button"
          >
            Открыть бота
          </button>
          <button
            className="secondary-button justify-center"
            onClick={() => openExternalLink(WANTTOPAY_SITE_URL)}
            type="button"
          >
            Открыть сайт
          </button>
        </div>
      </section>

      <Disclaimer>Не является финансовой или налоговой консультацией.</Disclaimer>

      <Link className="secondary-button" href="/more">
        Назад в Ещё
      </Link>
    </div>
  );
}
