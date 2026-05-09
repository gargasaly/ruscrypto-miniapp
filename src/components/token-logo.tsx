"use client";

import { useState } from "react";
import Image from "next/image";

type TokenLogoProps = {
  logo: string | null;
  title: string;
  ticker: string;
};

export function TokenLogo({ logo, title, ticker }: TokenLogoProps) {
  const [failedLogo, setFailedLogo] = useState<string | null>(null);
  const failed = logo === failedLogo;

  if (!logo || failed) {
    return (
      <div className="grid size-14 shrink-0 place-items-center rounded-full border border-emerald-100/10 bg-[linear-gradient(145deg,rgba(74,222,128,0.12),rgba(255,255,255,0.035))] text-[13px] font-black text-emerald-100 shadow-inner shadow-white/5">
        {ticker}
      </div>
    );
  }

  return (
    <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full border border-emerald-100/10 bg-black/25 shadow-inner shadow-white/5">
      <Image
        alt={`${title} logo`}
        className="size-full object-cover"
        height={56}
        onError={() => setFailedLogo(logo)}
        src={logo}
        unoptimized
        width={56}
      />
    </div>
  );
}
