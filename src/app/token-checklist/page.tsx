import Link from "next/link";
import { Disclaimer } from "@/components/disclaimer";
import { SectionHeader } from "@/components/section-header";
import { TokenChecklist } from "@/components/token-checklist";
import { tokens } from "@/lib/content";

export default function TokenChecklistPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        description="Быстрая оценка риска по цене, пампу, объёму, ликвидности, технической зоне и токеномике."
        eyebrow="Инструмент"
        title="Проверка риска токена"
      />

      <TokenChecklist tokens={tokens} />

      <Link className="secondary-button" href="/more">
        Назад в Ещё
      </Link>

      <Disclaimer />
    </div>
  );
}
