import {
  FREE_CHECKLIST_SYMBOLS,
  PAID_CHECKLIST_SYMBOLS,
  PAID_TEST_SYMBOLS,
  isAdminTelegramUser,
} from "@/lib/checklist/accessPolicy";
import {
  getConfiguredSupabaseClient,
  getActiveChecklistResultsForUser,
  getOrCreateUserSession,
} from "@/lib/supabase/checks";
import { getPortfolioProStatus } from "@/lib/portfolio/proAccess";
import { validateTelegramInitData } from "@/lib/telegram/validateInitData";

export const dynamic = "force-dynamic";

type CheckBalanceBody = {
  debug?: unknown;
  initData?: unknown;
};

async function readBody(request: Request): Promise<CheckBalanceBody> {
  try {
    return (await request.json()) as CheckBalanceBody;
  } catch {
    return {};
  }
}

function buildEnaAccess(input: {
  activeResult: {
    active: boolean;
    activeResultUntil: string | null;
    lastCheckAt: string | null;
  };
  checksAvailable: number;
  isAdmin: boolean;
  portfolioPro: {
    expiresAt: string | null;
    hasPro: boolean;
  };
}) {
  if (input.isAdmin) {
    return {
      activeResultUntil: null,
      canRun: true,
      lastCheckAt: null,
      reason: "admin" as const,
    };
  }

  if (input.portfolioPro.hasPro) {
    return {
      activeResultUntil: input.portfolioPro.expiresAt,
      canRun: true,
      lastCheckAt: input.activeResult.lastCheckAt,
      reason: "portfolio-pro" as const,
    };
  }

  if (input.activeResult.active) {
    return {
      activeResultUntil: input.activeResult.activeResultUntil,
      canRun: true,
      lastCheckAt: input.activeResult.lastCheckAt,
      reason: "active-result" as const,
    };
  }

  if (input.checksAvailable > 0) {
    return {
      activeResultUntil: null,
      canRun: true,
      lastCheckAt: input.activeResult.lastCheckAt,
      reason: "has-balance" as const,
    };
  }

  return {
    activeResultUntil: null,
    canRun: false,
    lastCheckAt: input.activeResult.lastCheckAt,
    reason: "needs-payment" as const,
  };
}

export async function POST(request: Request) {
  const body = await readBody(request);
  const validation = validateTelegramInitData(typeof body.initData === "string" ? body.initData : "");
  const debug = body.debug === true;

  if (!validation.ok) {
    return Response.json(
      {
        authenticated: false,
        freeSymbols: FREE_CHECKLIST_SYMBOLS,
        lockedAltSymbols: [],
        ok: false,
        paidTestSymbols: PAID_TEST_SYMBOLS,
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
        freeSymbols: FREE_CHECKLIST_SYMBOLS,
        isAdmin,
        lockedAltSymbols: [],
        ok: false,
        paidTestSymbols: PAID_TEST_SYMBOLS,
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
        freeSymbols: FREE_CHECKLIST_SYMBOLS,
        isAdmin,
        lockedAltSymbols: [],
        ok: false,
        paidTestSymbols: PAID_TEST_SYMBOLS,
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
    PAID_CHECKLIST_SYMBOLS.map((symbol) => [
      symbol,
      buildEnaAccess({
        activeResult:
          activeResultBySymbol[symbol] ?? {
            active: false,
            activeResultUntil: null,
            lastCheckAt: null,
          },
        checksAvailable,
        isAdmin: effectiveIsAdmin,
        portfolioPro,
      }),
    ]),
  );

  return Response.json(
    {
      access,
      authenticated: true,
      checksAvailable: effectiveIsAdmin || portfolioPro.hasPro ? "unlimited" : checksAvailable,
      checksUsed: session.balance?.checks_used ?? 0,
      debug: debug
        ? {
            activeResults: Object.fromEntries(
              Object.entries(activeResults.data).map(([symbol, result]) => [
                symbol,
                {
                  activeResult: result.active,
                  activeResultUntil: result.activeResultUntil,
                  accessReason: access[symbol]?.reason,
                  lastCheckAt: result.lastCheckAt,
                },
              ]),
            ),
            activeResultError: activeResults.error,
          }
        : undefined,
      freeSymbols: FREE_CHECKLIST_SYMBOLS,
      isAdmin: effectiveIsAdmin,
      portfolioPro: {
        daysLeft: portfolioPro.daysLeft,
        expiresAt: portfolioPro.expiresAt,
        hasPro: portfolioPro.hasPro,
        isAdmin: portfolioPro.isAdmin,
        product: portfolioPro.product,
      },
      lockedAltSymbols: [],
      ok: true,
      paidTestSymbols: PAID_TEST_SYMBOLS,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
