import { normalizeAnalyticsEventType } from "@/lib/analytics/events";
import { normalizeAnalyticsUser, trackAnalyticsEvent } from "@/lib/analytics/server";
import { getConfiguredSupabaseClient } from "@/lib/supabase/checks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TrackBody = {
  eventTarget?: unknown;
  eventType?: unknown;
  metadata?: unknown;
  platform?: unknown;
  route?: unknown;
  telegramUser?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readBody(request: Request): Promise<TrackBody> {
  try {
    const body = (await request.json()) as unknown;

    return isRecord(body) ? body : {};
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const body = await readBody(request);
  const supabase = getConfiguredSupabaseClient();

  if (!supabase.isConfigured) {
    return Response.json(
      {
        ok: false,
        reason: supabase.reason,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const result = await trackAnalyticsEvent(supabase, {
    eventTarget: typeof body.eventTarget === "string" ? body.eventTarget : null,
    eventType: normalizeAnalyticsEventType(body.eventType),
    metadata: body.metadata,
    platform: typeof body.platform === "string" ? body.platform : null,
    route: typeof body.route === "string" ? body.route : null,
    telegramUser: normalizeAnalyticsUser(body.telegramUser),
  });

  return Response.json(
    {
      ok: result.ok,
      reason: result.error ?? undefined,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
