import { isAdminTelegramUser } from "@/lib/checklist/accessPolicy";
import { getPreparedPortfolioReport } from "@/lib/portfolio/preparedReport";
import { validateTelegramInitData } from "@/lib/telegram/validateInitData";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RELEASE_DATE = "22.05.2026";

type PortfolioReportBody = {
  initData?: unknown;
};

function lockedResponse(reason?: string, status = 200) {
  return Response.json(
    {
      isAdmin: false,
      locked: true,
      ok: true,
      reason,
      releaseDate: RELEASE_DATE,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
      status,
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
  return lockedResponse("initData-required");
}

export async function POST(request: Request) {
  const body = await readBody(request);
  const validation = validateTelegramInitData(
    typeof body.initData === "string" ? body.initData : "",
  );

  if (!validation.ok) {
    return lockedResponse(validation.error);
  }

  const isAdmin = isAdminTelegramUser(validation.user);

  if (!isAdmin) {
    return lockedResponse("admin-only");
  }

  const report = await getPreparedPortfolioReport();

  return Response.json(
    {
      isAdmin: true,
      locked: false,
      ok: true,
      releaseDate: RELEASE_DATE,
      report,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
