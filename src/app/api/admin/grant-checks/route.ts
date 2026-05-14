import {
  grantChecks,
  getConfiguredSupabaseClient,
  getOrCreateUserSession,
  recordManualGrantEvent,
} from "@/lib/supabase/checks";
import { validateTelegramInitData } from "@/lib/telegram/validateInitData";

export const dynamic = "force-dynamic";

async function readBody(request: Request) {
  try {
    return (await request.json()) as {
      checks?: unknown;
      initData?: unknown;
      targetTelegramUserId?: unknown;
    };
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const body = await readBody(request);
  const initData = typeof body.initData === "string" ? body.initData : "";
  const targetTelegramUserId = Number(body.targetTelegramUserId);
  const checks = Number(body.checks);
  const validation = validateTelegramInitData(initData);

  if (!validation.ok) {
    return Response.json(
      {
        ok: false,
        reason: validation.error,
      },
      {
        status: 403,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  if (!Number.isSafeInteger(targetTelegramUserId) || !Number.isSafeInteger(checks) || checks <= 0) {
    return Response.json(
      {
        ok: false,
        reason: "invalid-grant-request",
      },
      {
        status: 400,
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

  if (session.error || !session.isAdmin) {
    return Response.json(
      {
        ok: false,
        reason: session.error ?? "admin-required",
      },
      {
        status: 403,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const grant = await grantChecks(supabase, targetTelegramUserId, checks);

  if (grant.error) {
    return Response.json(
      {
        ok: false,
        reason: grant.error,
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  await recordManualGrantEvent(supabase, {
    adminTelegramUserId: validation.user.id,
    checksAdded: checks,
    targetTelegramUserId,
  });

  return Response.json(
    {
      checksAdded: checks,
      newBalance: grant.data?.[0] ?? null,
      ok: true,
      targetTelegramUserId,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
