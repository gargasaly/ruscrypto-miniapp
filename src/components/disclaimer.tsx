import { financialDisclaimer } from "@/lib/content";

type DisclaimerProps = {
  children?: React.ReactNode;
};

export function Disclaimer({ children }: DisclaimerProps) {
  return (
    <div className="rounded-[20px] border border-amber-300/20 bg-amber-300/[0.08] px-4 py-3 text-[13px] leading-5 text-amber-100 shadow-sm shadow-black/10">
      <span className="font-semibold">Важно: </span>
      {children ?? financialDisclaimer}
    </div>
  );
}
