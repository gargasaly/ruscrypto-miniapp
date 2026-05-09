"use client";

import { useState } from "react";
import Image from "next/image";

type TokenLogoProps = {
  logo: string | null;
  remoteLogo?: string | null;
  title: string;
  ticker: string;
};

export function TokenLogo({ logo, remoteLogo, title, ticker }: TokenLogoProps) {
  const [failedLogos, setFailedLogos] = useState<string[]>([]);
  const source =
    logo && !failedLogos.includes(logo)
      ? logo
      : remoteLogo && !failedLogos.includes(remoteLogo)
        ? remoteLogo
        : null;

  if (!source) {
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
        onError={() => {
          setFailedLogos((current) =>
            current.includes(source) ? current : [...current, source],
          );
        }}
        src={source}
        unoptimized
        width={56}
      />
    </div>
  );
}
