import type { Metadata } from "next";
import { AdminAnalyticsScreen } from "@/components/admin-analytics-screen";

export const metadata: Metadata = {
  title: "Admin Analytics",
  description: "Hidden Mini App analytics dashboard.",
};

export default function AdminAnalyticsPage() {
  return <AdminAnalyticsScreen />;
}
