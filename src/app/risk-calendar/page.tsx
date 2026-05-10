import Link from "next/link";
import { Disclaimer } from "@/components/disclaimer";
import { RiskCalendarBrowser } from "@/components/risk-calendar-browser";
import { SectionHeader } from "@/components/section-header";

export default function RiskCalendarPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        description="События, которые могут повлиять на BTC, ETH и альткоины. Данные обновляются вручную или через подключённые серверные источники."
        eyebrow="Риски"
        title="Календарь рисков"
      />

      <RiskCalendarBrowser />

      <Link className="secondary-button" href="/more">
        Назад в Ещё
      </Link>

      <Disclaimer />
    </div>
  );
}
