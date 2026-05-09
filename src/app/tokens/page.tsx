import { Disclaimer } from "@/components/disclaimer";
import { TokenExplorer } from "@/components/token-explorer";
import { tokens } from "@/lib/content";

export default function TokensPage() {
  return (
    <div className="space-y-6">
      <TokenExplorer tokens={tokens} />
      <Disclaimer />
    </div>
  );
}
