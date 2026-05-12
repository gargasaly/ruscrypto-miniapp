import type { Metadata } from "next";
import type { Viewport } from "next";
import { BottomNavigation } from "@/components/bottom-navigation";
import { TelegramLinkInterceptor } from "@/components/telegram-link-interceptor";
import { TelegramThemeBridge } from "@/components/telegram-theme-bridge";
import "./globals.css";

export const metadata: Metadata = {
  title: "Крипта для новичков",
  description:
    "Навигатор по гайдам, портфелю, токенам и рискам для канала «Крипта для новичков».",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  colorScheme: "dark",
  themeColor: "#020807",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full">
      <body className="min-h-full text-zinc-50 antialiased">
        <TelegramThemeBridge />
        <TelegramLinkInterceptor />
        <div className="app-background">
          <div className="app-shell mx-auto flex min-h-dvh w-full max-w-[430px] flex-col border-x border-white/[0.07] shadow-2xl shadow-black/50">
            <main className="relative z-10 flex-1 px-4 pb-32 pt-5 sm:px-5">
              {children}
            </main>
            <BottomNavigation />
          </div>
        </div>
      </body>
    </html>
  );
}
