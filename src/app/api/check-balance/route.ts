import {
  FREE_CHECKLIST_SYMBOLS,
  PAID_TEST_SYMBOLS,
  isAdminTelegramUser,
} from "@/lib/checklist/accessPolicy";
import {
  getConfiguredSupabaseClient,
  getOrCreateUserSession,
} from "@/lib/supabase/checks";
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

export async function POST(request: Request) {
  const validation = validateTelegramInitData(await readInitData(request));

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

  return Response.json(
    {
      authenticated: true,
      checksAvailable: session.isAdmin ? "unlimited" : (session.balance?.checks_available ?? 0),
      checksUsed: session.balance?.checks_used ?? 0,
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
