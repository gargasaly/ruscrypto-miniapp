import type { Metadata } from "next";
import { PortfolioDiary } from "@/components/portfolio-diary";

export const metadata: Metadata = {
  title: "Портфельный дневник",
  description: "Admin preview для сравнения личной структуры с модельным криптопортфелем.",
};

export default function PortfolioDiaryPage() {
  return <PortfolioDiary />;
}
