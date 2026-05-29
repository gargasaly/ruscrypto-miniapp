import {
  getConfiguredSupabaseClient,
  getActiveChecklistResultsForUser,
  getOrCreateUserSession,
} from "@/lib/supabase/checks";
import { PAID_CHECKLIST_SYMBOLS, isAdminTelegramUser } from "@/lib/checklist/accessPolicy";
import { getPortfolioProStatus } from "@/lib/portfolio/proAccess";
import { validateTelegramInitData } from "@/lib/telegram/validateInitData";

export const dynamic = "force-dynamic";

async function readInitData(request: Request) {
  try {
    const body = (await request.json()) as { initData?: unknown };

    return typeof body.initData === "string" ? body.initData : "";
  } catch {
    return "";
  }
}

export async function GET() {
  return Response.json(
    {
      authenticated: false,
      ok: false,
      reason: "initData-required",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(request: Request) {
  const initData = await readInitData(request);
  const validation = validateTelegramInitData(initData);

  if (!validation.ok) {
    return Response.json(
      {
        authenticated: false,
        ok: false,
        reason: validation.error,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const supabase = getConfiguredSupabaseClient();
  const isAdmin = isAdminTelegramUser(validation.user);

  if (!supabase.isConfigured) {
    return Response.json(
      {
        authenticated: true,
        ok: false,
        reason: supabase.reason,
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const session = await getOrCreateUserSession(supabase, validation.user);

  if (session.error) {
    return Response.json(
      {
        authenticated: true,
        ok: false,
        reason: session.error,
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
  const checksAvailable = session.balance?.checks_available ?? 0;
  const portfolioPro = await getPortfolioProStatus(supabase, validation.user);
  const effectiveIsAdmin = session.isAdmin || isAdmin || portfolioPro.isAdmin;
  const activeResults = await getActiveChecklistResultsForUser(supabase, {
    symbols: [...PAID_CHECKLIST_SYMBOLS],
    telegramUserId: validation.user.id,
  });
  const activeResultBySymbol = activeResults.data as Record<
    string,
    {
      active: boolean;
      activeResultUntil: string | null;
      lastCheckAt: string | null;
    }
  >;
  const access = Object.fromEntries(
    PAID_CHECKLIST_SYMBOLS.map((symbol) => {
      const activeResult = activeResultBySymbol[symbol] ?? {
        active: false,
        activeResultUntil: null,
        lastCheckAt: null,
      };
      const tokenAccess =
        effectiveIsAdmin
          ? {
              activeResultUntil: null,
              canRun: true,
              lastCheckAt: null,
              reason: "admin" as const,
            }
          : portfolioPro.hasPro
            ? {
                activeResultUntil: portfolioPro.expiresAt,
                canRun: true,
                lastCheckAt: activeResult.lastCheckAt,
                reason: "portfolio-pro" as const,
              }
          : activeResult.active
            ? {
                activeResultUntil: activeResult.activeResultUntil,
                canRun: true,
                lastCheckAt: activeResult.lastCheckAt,
                reason: "active-result" as const,
              }
            : checksAvailable > 0
              ? {
                  activeResultUntil: null,
                  canRun: true,
                  lastCheckAt: activeResult.lastCheckAt,
                  reason: "has-balance" as const,
                }
              : {
                  activeResultUntil: null,
                  canRun: false,
                  lastCheckAt: activeResult.lastCheckAt,
                  reason: "needs-payment" as const,
                };

      return [symbol, tokenAccess];
    }),
  );

  return Response.json(
    {
      access,
      authenticated: true,
      balance: {
        checksAvailable: effectiveIsAdmin || portfolioPro.hasPro ? "unlimited" : checksAvailable,
        checksUsed: session.balance?.checks_used ?? 0,
      },
      isAdmin: effectiveIsAdmin,
      ok: true,
      portfolioPro: {
        daysLeft: portfolioPro.daysLeft,
        expiresAt: portfolioPro.expiresAt,
        hasPro: portfolioPro.hasPro,
        isAdmin: portfolioPro.isAdmin,
        product: portfolioPro.product,
      },
      user: {
        firstName: validation.user.first_name ?? null,
        isAdmin: effectiveIsAdmin,
        lastName: validation.user.last_name ?? null,
        telegramUserId: validation.user.id,
        username: validation.user.username ?? null,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
