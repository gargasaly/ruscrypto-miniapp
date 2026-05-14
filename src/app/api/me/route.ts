import {
  getConfiguredSupabaseClient,
  getActiveChecklistResultAccess,
  getOrCreateUserSession,
} from "@/lib/supabase/checks";
import { isAdminTelegramUser } from "@/lib/checklist/accessPolicy";
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
  const activeResult = await getActiveChecklistResultAccess(supabase, {
    symbol: "ENA",
    telegramUserId: validation.user.id,
  });
  const enaAccess = session.isAdmin || isAdmin
    ? {
        activeResultUntil: null,
        canRun: true,
        lastCheckAt: null,
        reason: "admin" as const,
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

  return Response.json(
    {
      access: {
        ENA: enaAccess,
      },
      authenticated: true,
      balance: {
        checksAvailable: session.isAdmin ? "unlimited" : checksAvailable,
        checksUsed: session.balance?.checks_used ?? 0,
      },
      isAdmin: session.isAdmin || isAdmin,
      ok: true,
      user: {
        firstName: validation.user.first_name ?? null,
        isAdmin: session.isAdmin || isAdmin,
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
