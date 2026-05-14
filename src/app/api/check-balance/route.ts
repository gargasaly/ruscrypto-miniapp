import {
  FREE_CHECKLIST_SYMBOLS,
  PAID_TEST_SYMBOLS,
  isAdminTelegramUser,
} from "@/lib/checklist/accessPolicy";
import {
  getConfiguredSupabaseClient,
  getActiveChecklistResultAccess,
  getOrCreateUserSession,
} from "@/lib/supabase/checks";
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
  activeResult: Awaited<ReturnType<typeof getActiveChecklistResultAccess>>;
  checksAvailable: number;
  isAdmin: boolean;
}) {
  if (input.isAdmin) {
    return {
      activeResultUntil: null,
      canRun: true,
      lastCheckAt: null,
      reason: "admin" as const,
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
  const activeResult = await getActiveChecklistResultAccess(supabase, {
    symbol: "ENA",
    telegramUserId: validation.user.id,
  });
  const enaAccess = buildEnaAccess({
    activeResult,
    checksAvailable,
    isAdmin: session.isAdmin,
  });

  return Response.json(
    {
      access: {
        ENA: enaAccess,
      },
      authenticated: true,
      checksAvailable: session.isAdmin ? "unlimited" : checksAvailable,
      checksUsed: session.balance?.checks_used ?? 0,
      debug: debug
        ? {
            activeResult: activeResult.active,
            activeResultError: activeResult.error,
            activeResultUntil: activeResult.activeResultUntil,
            accessReason: enaAccess.reason,
            lastCheckAt: activeResult.lastCheckAt,
          }
        : undefined,
      freeSymbols: FREE_CHECKLIST_SYMBOLS,
      isAdmin: session.isAdmin,
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
