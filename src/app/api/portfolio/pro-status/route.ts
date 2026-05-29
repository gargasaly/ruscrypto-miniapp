import {
  PORTFOLIO_PRO_PRODUCT,
  getPortfolioProStatus,
} from "@/lib/portfolio/proAccess";
import { getConfiguredSupabaseClient } from "@/lib/supabase/checks";
import { validateTelegramInitData, type ValidatedTelegramUser } from "@/lib/telegram/validateInitData";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ADMIN_ID = 1720794119;

function noStoreJson(body: unknown, init?: ResponseInit) {
  return Response.json(body, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...(init?.headers ?? {}),
    },
  });
}

function readInitData(request: Request) {
  const url = new URL(request.url);

  return request.headers.get("x-telegram-init-data") ?? url.searchParams.get("initData") ?? "";
}

function devAdminUser(request: Request): ValidatedTelegramUser | null {
  const url = new URL(request.url);

  if (process.env.NODE_ENV === "development" && url.searchParams.get("admin") === "1") {
    return {
      first_name: "Dev",
      id: ADMIN_ID,
      username: "K_Vahtang",
    };
  }

  return null;
}

function resolveUser(request: Request) {
  const devUser = devAdminUser(request);

  if (devUser) {
    return {
      error: null,
      user: devUser,
    };
  }

  const validation = validateTelegramInitData(readInitData(request));

  if (!validation.ok) {
    return {
      error: validation.error,
      user: null,
    };
  }

  return {
    error: null,
    user: validation.user,
  };
}

export async function GET(request: Request) {
  const session = resolveUser(request);

  if (!session.user) {
    return noStoreJson(
      {
        daysLeft: null,
        expiresAt: null,
        hasPro: false,
        isAdmin: false,
        ok: false,
        product: PORTFOLIO_PRO_PRODUCT,
        reason: session.error ?? "initData-required",
      },
      { status: 401 },
    );
  }

  const supabase = getConfiguredSupabaseClient();

  if (!supabase.isConfigured) {
    return noStoreJson(
      {
        daysLeft: null,
        expiresAt: null,
        hasPro: false,
        isAdmin: false,
        ok: false,
        product: PORTFOLIO_PRO_PRODUCT,
        reason: supabase.reason,
      },
      { status: 503 },
    );
  }

  const status = await getPortfolioProStatus(supabase, session.user);

  return noStoreJson({
    ...status,
    ok: true,
  });
}
