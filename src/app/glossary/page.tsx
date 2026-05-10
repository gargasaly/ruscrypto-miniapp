import Link from "next/link";
import { Disclaimer } from "@/components/disclaimer";
import { GlossaryBrowser } from "@/components/glossary-browser";
import { SectionHeader } from "@/components/section-header";
import { glossaryTerms } from "@/lib/glossary";

export default function GlossaryPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        description="Короткие объяснения терминов, которые часто встречаются в крипте, DeFi, токеномике и торговле."
        eyebrow="База"
        title="Словарь новичка"
      />

      <GlossaryBrowser terms={glossaryTerms} />

      <Link className="secondary-button" href="/more">
        Назад в Ещё
      </Link>

      <Disclaimer />
    </div>
  );
}
