import Link from "next/link";
import { Disclaimer } from "@/components/disclaimer";
import { SectionHeader } from "@/components/section-header";
import { TokenChecklist } from "@/components/token-checklist";
import { tokens } from "@/lib/content";

export default function TokenChecklistPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        description="Выберите токен и проверьте базовые риски перед покупкой. Это не финансовая рекомендация."
        eyebrow="Инструмент"
        title="Чеклист перед покупкой токена"
      />

      <TokenChecklist tokens={tokens} />

      <Link className="secondary-button" href="/more">
        Назад в Ещё
      </Link>

      <Disclaimer />
    </div>
  );
}
