import {
  addChecksToBalance,
  claimPaymentEventForGrant,
  getConfiguredSupabaseClient,
  getPaymentEventByPayload,
  recordUnknownPaymentEvent,
  updatePaymentEventByPayload,
} from "@/lib/supabase/checks";
import { answerTelegramPreCheckoutQuery, hasTelegramBotToken } from "@/lib/telegram/botApi";

export const dynamic = "force-dynamic";

type TelegramUpdate = {
  message?: {
    from?: {
      id?: number;
    };
    successful_payment?: {
      currency?: string;
      invoice_payload?: string;
      telegram_payment_charge_id?: string;
      total_amount?: number;
    };
  };
  pre_checkout_query?: {
    id?: string;
    invoice_payload?: string;
  };
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

async function readUpdate(request: Request) {
  try {
    return (await request.json()) as TelegramUpdate;
  } catch {
    return {};
  }
}

async function answerPreCheckout(preCheckoutQueryId: string, ok: boolean, errorMessage?: string) {
  if (!hasTelegramBotToken()) {
    return {
      error: "missing-telegram-bot-token",
      ok: false,
    };
  }

  const answer = await answerTelegramPreCheckoutQuery({
    errorMessage,
    ok,
    preCheckoutQueryId,
  });

  return {
    error: answer.error,
    ok: !answer.error,
  };
}

export async function POST(request: Request) {
  const update = await readUpdate(request);
  const supabase = getConfiguredSupabaseClient();

  if (!supabase.isConfigured) {
    return noStoreJson(
      {
        ok: false,
        reason: supabase.reason,
      },
      { status: 503 },
    );
  }

  const preCheckout = update.pre_checkout_query;

  if (preCheckout?.id) {
    const payload = preCheckout.invoice_payload ?? "";
    const event = payload ? await getPaymentEventByPayload(supabase, payload) : null;
    const payment = event?.data?.[0] ?? null;
    const canPay = Boolean(payment && payment.status === "created");

    await answerPreCheckout(
      preCheckout.id,
      canPay,
      canPay ? undefined : "Платёж не найден",
    );

    return noStoreJson({
      ok: true,
      preCheckoutAnswered: canPay,
    });
  }

  const payment = update.message?.successful_payment;

  if (!payment) {
    return noStoreJson({
      ignored: true,
      ok: true,
    });
  }

  const payload = payment.invoice_payload ?? "";
  const paymentEvent = payload ? await getPaymentEventByPayload(supabase, payload) : null;
  const event = paymentEvent?.data?.[0] ?? null;

  if (!event) {
    await recordUnknownPaymentEvent(supabase, {
      invoicePayload: payload || `unknown:${Date.now()}:${crypto.randomUUID()}`,
      rawEvent: update,
      telegramUserId: update.message?.from?.id ?? null,
    });

    return noStoreJson({
      ok: true,
      paymentHandled: false,
      reason: "unknown-payload",
    });
  }

  if (event.status === "paid") {
    return noStoreJson({
      idempotent: true,
      ok: true,
    });
  }

  const currencyOk = payment.currency === "XTR";
  const amountOk = payment.total_amount === event.stars_amount;

  if (!currencyOk || !amountOk) {
    await updatePaymentEventByPayload(supabase, payload, {
      raw_event: {
        reason: "payment-mismatch",
        update,
      },
      status: "failed",
      telegram_payment_charge_id: payment.telegram_payment_charge_id ?? null,
    });

    return noStoreJson({
      ok: true,
      paymentHandled: false,
      reason: "payment-mismatch",
    });
  }

  const claimed = await claimPaymentEventForGrant(supabase, payload, {
    rawEvent: update,
    telegramPaymentChargeId: payment.telegram_payment_charge_id ?? null,
  });
  const claimedEvent = claimed.data?.[0] ?? null;

  if (!claimedEvent || claimed.error) {
    return noStoreJson({
      idempotent: true,
      ok: true,
      reason: claimed.error ?? "already-processed",
    });
  }

  const telegramUserId = claimedEvent.telegram_user_id;
  const checksAdded = claimedEvent.checks_added ?? 0;

  if (!telegramUserId || checksAdded <= 0) {
    await updatePaymentEventByPayload(supabase, payload, {
      raw_event: {
        reason: "invalid-payment-event",
        update,
      },
      status: "failed",
    });

    return noStoreJson({
      ok: true,
      paymentHandled: false,
      reason: "invalid-payment-event",
    });
  }

  const balance = await addChecksToBalance(supabase, telegramUserId, checksAdded);

  if (balance.error) {
    await updatePaymentEventByPayload(supabase, payload, {
      raw_event: {
        grantError: balance.error,
        update,
      },
    });

    return noStoreJson(
      {
        ok: false,
        reason: "balance-grant-failed",
      },
      { status: 500 },
    );
  }

  return noStoreJson({
    checksAdded,
    ok: true,
    paymentHandled: true,
  });
}
