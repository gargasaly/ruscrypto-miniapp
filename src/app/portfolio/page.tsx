import { Disclaimer } from "@/components/disclaimer";
import { PortfolioCalculator } from "@/components/portfolio-calculator";
import { SectionHeader } from "@/components/section-header";
import { pageHeaders } from "@/lib/content";

export default function PortfolioPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        description={pageHeaders.portfolio.description}
        eyebrow={pageHeaders.portfolio.eyebrow}
        title={pageHeaders.portfolio.title}
      />
      <PortfolioCalculator />
      <Disclaimer />
    </div>
  );
}
