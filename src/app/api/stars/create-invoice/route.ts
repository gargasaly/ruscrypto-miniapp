import { getCheckPackage } from "@/lib/payments/pricing";
import {
  createPaymentEvent,
  getConfiguredSupabaseClient,
  getOrCreateUserSession,
  updatePaymentEventByPayload,
} from "@/lib/supabase/checks";
import { createTelegramStarsInvoiceLink, hasTelegramBotToken } from "@/lib/telegram/botApi";
import { validateTelegramInitData } from "@/lib/telegram/validateInitData";

export const dynamic = "force-dynamic";

type CreateInvoiceBody = {
  initData?: unknown;
  packageId?: unknown;
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

async function readBody(request: Request): Promise<CreateInvoiceBody> {
  try {
    return (await request.json()) as CreateInvoiceBody;
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const body = await readBody(request);
  const initData = typeof body.initData === "string" ? body.initData : "";
  const packageId = typeof body.packageId === "string" ? body.packageId : "";
  const validation = validateTelegramInitData(initData);

  if (!validation.ok) {
    return noStoreJson(
      {
        error: "invalid-init-data",
        ok: false,
      },
      { status: 401 },
    );
  }

  const selectedPackage = getCheckPackage(packageId);

  if (!selectedPackage) {
    return noStoreJson(
      {
        error: "unknown-package",
        ok: false,
      },
      { status: 400 },
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

  if (session.isAdmin) {
    return noStoreJson(
      {
        error: "admin-does-not-need-payment",
        message: "Admin-доступ активен, покупать проверки не нужно.",
        ok: false,
      },
      { status: 400 },
    );
  }

  const invoicePayload = [
    "check_pack",
    selectedPackage.packageId,
    validation.user.id,
    Date.now(),
    crypto.randomUUID(),
  ].join(":");
  const event = await createPaymentEvent(supabase, {
    checksAdded: selectedPackage.checks,
    invoicePayload,
    packageId: selectedPackage.packageId,
    starsAmount: selectedPackage.stars,
    telegramUserId: validation.user.id,
    title: selectedPackage.title,
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

  const invoice = await createTelegramStarsInvoiceLink({
    description: selectedPackage.description,
    payload: invoicePayload,
    stars: selectedPackage.stars,
    title: selectedPackage.title,
  });

  if (invoice.error || !invoice.result) {
    await updatePaymentEventByPayload(supabase, invoicePayload, {
      raw_event: {
        error: invoice.error,
        failedBy: "create-invoice",
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
    package: {
      checks: selectedPackage.checks,
      packageId: selectedPackage.packageId,
      stars: selectedPackage.stars,
    },
    payload: invoicePayload,
  });
}
