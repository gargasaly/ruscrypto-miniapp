import { trackAnalyticsEvent } from "@/lib/analytics/server";
import {
  PORTFOLIO_PRO_DURATION_DAYS,
  PORTFOLIO_PRO_PRICE_STARS,
  PORTFOLIO_PRO_PRODUCT,
  PORTFOLIO_PRO_TITLE,
  getPortfolioProStatus,
  makePortfolioProInvoicePayload,
} from "@/lib/portfolio/proAccess";
import {
  createPaymentEvent,
  getConfiguredSupabaseClient,
  getOrCreateUserSession,
  updatePaymentEventByPayload,
} from "@/lib/supabase/checks";
import { createTelegramStarsInvoiceLink, hasTelegramBotToken } from "@/lib/telegram/botApi";
import { validateTelegramInitData } from "@/lib/telegram/validateInitData";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProBuyBody = {
  initData?: unknown;
};

function noStoreJson(body: unknown, init?: ResponseInit) {
  return Response.json(body, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...(init?.headers ?? {}),
    },
  });
}

async function readBody(request: Request): Promise<ProBuyBody> {
  try {
    const body = (await request.json()) as unknown;

    return typeof body === "object" && body !== null && !Array.isArray(body)
      ? (body as ProBuyBody)
      : {};
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const body = await readBody(request);
  const initData = typeof body.initData === "string" ? body.initData : "";
  const validation = validateTelegramInitData(initData);

  if (!validation.ok) {
    return noStoreJson(
      {
        error: validation.error,
        ok: false,
      },
      { status: 401 },
    );
  }

  const supabase = getConfiguredSupabaseClient();

  if (!supabase.isConfigured) {
    return noStoreJson(
      {
        error: supabase.reason,
        ok: false,
      },
      { status: 503 },
    );
  }

  if (!hasTelegramBotToken()) {
    return noStoreJson(
      {
        error: "missing-telegram-bot-token",
        ok: false,
      },
      { status: 503 },
    );
  }

  const session = await getOrCreateUserSession(supabase, validation.user);

  if (session.error) {
    return noStoreJson(
      {
        error: session.error,
        ok: false,
      },
      { status: 500 },
    );
  }

  const proStatus = await getPortfolioProStatus(supabase, validation.user);

  if (proStatus.isAdmin) {
    return noStoreJson(
      {
        error: "admin-does-not-need-payment",
        hasPro: true,
        isAdmin: true,
        ok: false,
      },
      { status: 400 },
    );
  }

  const invoicePayload = makePortfolioProInvoicePayload(validation.user.id);
  const event = await createPaymentEvent(supabase, {
    checksAdded: 0,
    invoicePayload,
    packageId: PORTFOLIO_PRO_PRODUCT,
    starsAmount: PORTFOLIO_PRO_PRICE_STARS,
    telegramUserId: validation.user.id,
    title: PORTFOLIO_PRO_TITLE,
  });

  if (event.error) {
    return noStoreJson(
      {
        error: event.error,
        ok: false,
      },
      { status: 500 },
    );
  }

  try {
    await trackAnalyticsEvent(supabase, {
      eventTarget: PORTFOLIO_PRO_PRODUCT,
      eventType: "portfolio_pro_payment_started",
      metadata: {
        days: PORTFOLIO_PRO_DURATION_DAYS,
        product: PORTFOLIO_PRO_PRODUCT,
        stars: PORTFOLIO_PRO_PRICE_STARS,
      },
      route: "/portfolio/diary",
      telegramUser: validation.user,
    });
  } catch {
    // Analytics must not block invoice creation.
  }

  const invoice = await createTelegramStarsInvoiceLink({
    description: "Портфельный дневник и безлимитный чек-лист на 7 дней",
    payload: invoicePayload,
    stars: PORTFOLIO_PRO_PRICE_STARS,
    title: PORTFOLIO_PRO_TITLE,
  });

  if (invoice.error || !invoice.result) {
    await updatePaymentEventByPayload(supabase, invoicePayload, {
      raw_event: {
        error: invoice.error,
        failedBy: "portfolio-pro-buy",
      },
      status: "failed",
    });

    return noStoreJson(
      {
        error: invoice.error ?? "invoice-link-failed",
        ok: false,
      },
      { status: 502 },
    );
  }

  return noStoreJson({
    invoiceLink: invoice.result,
    ok: true,
    payload: invoicePayload,
    product: {
      days: PORTFOLIO_PRO_DURATION_DAYS,
      product: PORTFOLIO_PRO_PRODUCT,
      stars: PORTFOLIO_PRO_PRICE_STARS,
      title: PORTFOLIO_PRO_TITLE,
    },
  });
}
