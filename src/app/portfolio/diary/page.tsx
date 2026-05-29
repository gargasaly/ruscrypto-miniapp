import type { Metadata } from "next";
import { PortfolioDiary } from "@/components/portfolio-diary";

export const metadata: Metadata = {
  title: "Портфельный дневник",
  description: "Личный портфельный дневник с модельной структурой и Portfolio Pro.",
};

export default function PortfolioDiaryPage() {
  return <PortfolioDiary />;
}
