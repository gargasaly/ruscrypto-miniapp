"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems, type NavIcon } from "@/lib/content";

type IconProps = {
  icon: NavIcon;
  active: boolean;
};

function NavigationIcon({ icon, active }: IconProps) {
  const common = {
    className: active ? "text-emerald-300" : "text-zinc-400",
    fill: "none",
    height: 21,
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
    width: 21,
    "aria-hidden": true,
  };

  if (icon === "home") {
    return (
      <svg {...common}>
        <path d="M4 11.5 12 4l8 7.5" />
        <path d="M6.5 10.5V20h11v-9.5" />
        <path d="M10 20v-5h4v5" />
      </svg>
    );
  }

  if (icon === "guides") {
    return (
      <svg {...common}>
        <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H20v15H7.5A2.5 2.5 0 0 0 5 20.5z" />
        <path d="M5 5.5v15" />
        <path d="M9 7h7" />
        <path d="M9 11h6" />
      </svg>
    );
  }

  if (icon === "portfolio") {
    return (
      <svg {...common}>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 15v-4" />
        <path d="M12 15V8" />
        <path d="M16 15v-6" />
      </svg>
    );
  }

  if (icon === "checklist") {
    return (
      <svg {...common}>
        <path d="M9 6h11" />
        <path d="M9 12h11" />
        <path d="M9 18h11" />
        <path d="m4 6 1 1 2-2" />
        <path d="m4 12 1 1 2-2" />
        <path d="m4 18 1 1 2-2" />
      </svg>
    );
  }

  if (icon === "tokens") {
    return (
      <svg {...common}>
        <path d="M12 3.5 19.5 8v8L12 20.5 4.5 16V8z" />
        <path d="M12 8v8" />
        <path d="M8.5 10.2 12 12.2l3.5-2" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M5 12h.01" />
      <path d="M12 12h.01" />
      <path d="M19 12h.01" />
    </svg>
  );
}

export function BottomNavigation() {
  const pathname = usePathname();
  const moreRoutes = new Set([
    "/risk-calendar",
    "/glossary",
    "/bonuses",
    "/virtual-card",
    "/wanttopay",
  ]);

  return (
    <nav className="pointer-events-none fixed left-1/2 bottom-[calc(10px+env(safe-area-inset-bottom))] z-[1200] w-full max-w-[430px] -translate-x-1/2 px-3 pt-1">
      <div className="pointer-events-auto grid grid-cols-5 gap-1 rounded-[26px] border border-emerald-100/10 bg-[#07100f]/90 p-1 shadow-2xl shadow-black/55 backdrop-blur-xl">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href === "/more" && moreRoutes.has(pathname));

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`relative flex h-[58px] flex-col items-center justify-center gap-1 rounded-[20px] text-[10.5px] font-bold transition ${
                active
                  ? "bg-emerald-300/[0.08] text-emerald-300 shadow-inner shadow-emerald-200/5"
                  : "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200"
              }`}
              href={item.href}
              key={item.href}
              prefetch={false}
            >
              <NavigationIcon active={active} icon={item.icon} />
              <span>{item.label}</span>
              {active ? (
                <span className="absolute bottom-1.5 h-0.5 w-5 rounded-full bg-emerald-300" />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
