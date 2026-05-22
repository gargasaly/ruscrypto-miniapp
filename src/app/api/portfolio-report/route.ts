import { isAdminTelegramUser } from "@/lib/checklist/accessPolicy";
import { getPreparedPortfolioReport } from "@/lib/portfolio/preparedReport";
import { validateTelegramInitData } from "@/lib/telegram/validateInitData";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RELEASE_DATE = "22.05.2026";

type PortfolioReportBody = {
  initData?: unknown;
};

async function reportResponse(isAdmin = false) {
  const report = await getPreparedPortfolioReport();

  return Response.json(
    {
      isAdmin,
      locked: false,
      ok: true,
      releaseDate: RELEASE_DATE,
      released: true,
      report,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

async function readBody(request: Request): Promise<PortfolioReportBody> {
  try {
    return (await request.json()) as PortfolioReportBody;
  } catch {
    return {};
  }
}

export async function GET() {
  return reportResponse();
}

export async function POST(request: Request) {
  const body = await readBody(request);
  const validation = validateTelegramInitData(
    typeof body.initData === "string" ? body.initData : "",
  );

  return reportResponse(validation.ok ? isAdminTelegramUser(validation.user) : false);
}
