import type { Metadata } from "next";
import { PreparedPortfolioReport } from "@/components/prepared-portfolio-report";

export const metadata: Metadata = {
  title: "Подготовленный портфель до 2028",
  description:
    "Внутренний экран отчёта по долгосрочному криптопортфелю до 2028 года.",
};

export default function PreparedPortfolioPage() {
  return <PreparedPortfolioReport />;
}
