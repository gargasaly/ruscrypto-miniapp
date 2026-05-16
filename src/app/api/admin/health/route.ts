import { isAdminTelegramUser } from "@/lib/checklist/accessPolicy";
import { CHECK_PACKAGES } from "@/lib/payments/pricing";
import { getConfiguredSupabaseClient } from "@/lib/supabase/checks";
import { validateTelegramInitData } from "@/lib/telegram/validateInitData";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function envPresence() {
  return {
    ADMIN_TELEGRAM_IDS: Boolean(process.env.ADMIN_TELEGRAM_IDS),
    ADMIN_TELEGRAM_USERNAMES: Boolean(process.env.ADMIN_TELEGRAM_USERNAMES),
    COINGECKO_API_KEY: Boolean(process.env.COINGECKO_API_KEY),
    COINMARKETCAL_API_KEY: Boolean(process.env.COINMARKETCAL_API_KEY),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
    STARS_FIVE_CHECKS_PRICE: CHECK_PACKAGES.pack5.stars,
    STARS_SINGLE_CHECK_PRICE: CHECK_PACKAGES.single.stars,
    TELEGRAM_BOT_TOKEN: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    TELEGRAM_WEBHOOK_SECRET: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET),
    TOKENOMIST_API_KEY: Boolean(process.env.TOKENOMIST_API_KEY),
    TOKENOMIST_ENABLED: process.env.TOKENOMIST_ENABLED === "true",
  };
}

function readAdminInitData(request: Request) {
  const url = new URL(request.url);

  return (
    request.headers.get("x-telegram-init-data") ??
    url.searchParams.get("initData") ??
    ""
  );
}

function isHealthSecretValid(request: Request) {
  const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const providedSecret = request.headers.get("x-admin-health-secret")?.trim();

  return Boolean(configuredSecret && providedSecret && configuredSecret === providedSecret);
}

async function fetchJsonSafe(origin: string, path: string, timeoutMs = 8_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${origin}${path}`, {
      cache: "no-store",
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => null)) as unknown;

    return {
      ok: response.ok,
      payload,
      status: response.status,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "request-failed",
      ok: false,
      payload: null,
      status: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function homeSnapshotStatus(payload: unknown) {
  if (!isRecord(payload)) {
    return {
      status: "missing" as const,
      updatedAt: null,
    };
  }

  const cacheStatus = typeof payload.cacheStatus === "string" ? payload.cacheStatus : "missing";
  const updatedAt = typeof payload.updatedAt === "string" ? payload.updatedAt : null;

  if (cacheStatus === "last-good") {
    return {
      cacheStatus,
      status: "lastGood" as const,
      updatedAt,
    };
  }

  const updatedAtMs = updatedAt ? new Date(updatedAt).getTime() : NaN;
  const ageMs = Number.isFinite(updatedAtMs) ? Date.now() - updatedAtMs : Number.POSITIVE_INFINITY;

  return {
    cacheStatus,
    status:
      ageMs <= 4 * 60 * 60_000
        ? ("fresh" as const)
        : ageMs <= 12 * 60 * 60_000
          ? ("stale" as const)
          : ("missing" as const),
    updatedAt,
  };
}

function calendarStatus(payload: unknown) {
  if (!isRecord(payload)) {
    return {
      status: "missing",
      updatedAt: null,
    };
  }

  const debug = isRecord(payload.debug) ? payload.debug : {};

  return {
    cacheAgeMinutes:
      typeof debug.cacheAgeMinutes === "number" ? debug.cacheAgeMinutes : null,
    cacheStatus:
      typeof debug.cacheStatus === "string"
        ? debug.cacheStatus
        : typeof payload.cacheStatus === "string"
          ? payload.cacheStatus
          : null,
    status: payload.ok === true ? "ok" : "degraded",
    updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : null,
  };
}

async function supabaseStatus() {
  const supabase = getConfiguredSupabaseClient();

  if (!supabase.isConfigured) {
    return {
      reason: supabase.reason,
      status: "missing-env",
    };
  }

  const result = await supabase.request<unknown[]>("rest/v1/app_users?select=id&limit=1");

  return {
    status: result.error ? "error" : "ok",
    statusCode: result.status,
    error: result.error ?? undefined,
  };
}

export async function GET(request: Request) {
  const validation = validateTelegramInitData(readAdminInitData(request));
  const authorized =
    (validation.ok && isAdminTelegramUser(validation.user)) || isHealthSecretValid(request);

  if (!authorized) {
    return Response.json(
      {
        env: envPresence(),
        ok: false,
        status: "unauthorized",
        timestamp: new Date().toISOString(),
      },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const origin = new URL(request.url).origin;
  const [homeResult, calendarResult, checklistResult, supabaseResult] =
    await Promise.allSettled([
      fetchJsonSafe(origin, "/api/home-snapshot"),
      fetchJsonSafe(origin, "/api/risks?debug=1"),
      fetchJsonSafe(origin, "/api/token-checklist?symbol=BTC&debug=1"),
      supabaseStatus(),
    ]);

  const homePayload =
    homeResult.status === "fulfilled" && homeResult.value.ok
      ? homeResult.value.payload
      : null;
  const calendarPayload =
    calendarResult.status === "fulfilled" && calendarResult.value.ok
      ? calendarResult.value.payload
      : null;
  const checklistPayload =
    checklistResult.status === "fulfilled" && checklistResult.value.ok
      ? checklistResult.value.payload
      : null;
  const tokenomistEnabled = process.env.TOKENOMIST_ENABLED === "true";

  return Response.json(
    {
      app: {
        status: "ok",
      },
      calendar: calendarStatus(calendarPayload),
      checklistApi: {
        status: isRecord(checklistPayload) && checklistPayload.ok === true ? "ok" : "degraded",
        token: isRecord(checklistPayload) && isRecord(checklistPayload.token)
          ? checklistPayload.token.symbol ?? null
          : null,
      },
      env: envPresence(),
      homeSnapshot: homeSnapshotStatus(homePayload),
      ok: true,
      recentErrors: [],
      stars: {
        botTokenConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
        packages: {
          fiveChecks: {
            checks: CHECK_PACKAGES.pack5.checks,
            stars: CHECK_PACKAGES.pack5.stars,
          },
          singleCheck: {
            checks: CHECK_PACKAGES.single.checks,
            stars: CHECK_PACKAGES.single.stars,
          },
        },
        status: process.env.TELEGRAM_BOT_TOKEN ? "configured" : "missing-bot-token",
      },
      supabase:
        supabaseResult.status === "fulfilled"
          ? supabaseResult.value
          : {
              status: "error",
              error: "supabase-health-failed",
            },
      timestamp: new Date().toISOString(),
      tokenomist: {
        apiKeyConfigured: Boolean(process.env.TOKENOMIST_API_KEY),
        enabled: tokenomistEnabled,
        status:
          tokenomistEnabled && process.env.TOKENOMIST_API_KEY
            ? "configured"
            : tokenomistEnabled
              ? "missing-api-key"
              : "disabled",
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
