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

  return Response.json(
    {
      authenticated: true,
      balance: {
        checksAvailable: session.balance?.checks_available ?? 0,
        checksUsed: session.balance?.checks_used ?? 0,
      },
      ok: true,
      user: {
        firstName: validation.user.first_name ?? null,
        isAdmin: session.isAdmin,
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
