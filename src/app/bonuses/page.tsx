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

        <div className="mt-3 space-y-4 text-sm leading-6 text-zinc-300">
          <p>
            Для подписчиков канала доступна регистрация на MEXC по моей
            реферальной ссылке.
          </p>

          <div>
            <p className="font-bold text-white">Что даёт регистрация по ссылке:</p>
            <ul className="mt-2 space-y-2 pl-4">
              <li>
                • доступ к приветственным бонусам и наградам MEXC для новых
                пользователей;
              </li>
              <li>
                • возможность торговать с <strong>нулевой</strong> комиссией на
                споте;
              </li>
              <li>
                • возможность получить бонусы за выполнение заданий:
                регистрация, KYC, депозит, приложение, торговая активность и
                другие условия биржи;
              </li>
              <li>
                • общий размер наград по программе MEXC может доходить до{" "}
                <strong>8 000 USDT</strong>, но это не подарок сразу за
                регистрацию, а максимум за выполнение условий акции;
              </li>
            </ul>
          </div>

          <p>
            <strong>Важно</strong>: часть бонусов может быть связана с
            депозитом, торговым объёмом и фьючерсами.
          </p>

          <p>
            <strong>Моя позиция для новичков:</strong> не лезть во фьючерсы
            ради бонуса. Сначала регистрация, 2FA, изучение интерфейса,
            безопасность и маленькие суммы.
          </p>

          <p>
            Бонус — это приятное дополнение, но не причина рисковать деньгами.
          </p>
        </div>

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
