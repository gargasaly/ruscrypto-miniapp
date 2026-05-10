import Link from "next/link";
import { Disclaimer } from "@/components/disclaimer";
import { SectionHeader } from "@/components/section-header";
import { TokenChecklist } from "@/components/token-checklist";
import { tokens } from "@/lib/content";

export default function TokenChecklistPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        description="Не сигнал и не рекомендация. Это быстрая проверка: цена, памп, объём, ликвидность, unlocks и техническая зона."
        eyebrow="Инструмент"
        title="Проверка токена перед покупкой"
      />

      <TokenChecklist tokens={tokens} />

      <Link className="secondary-button" href="/more">
        Назад в Ещё
      </Link>

      <Disclaimer />
    </div>
  );
}
