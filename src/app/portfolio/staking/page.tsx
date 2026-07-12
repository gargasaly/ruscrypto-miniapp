import type { Metadata } from "next";
import { PortfolioStaking } from "@/components/portfolio-staking";

export const metadata: Metadata = {
  title: "Стейкинг",
  description:
    "Информационная справка по стейкингу активов из подготовленного портфеля.",
};

export default function PortfolioStakingPage() {
  return <PortfolioStaking />;
}
