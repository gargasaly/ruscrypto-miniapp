import "server-only";

type TelegramBotResponse<T> = {
  description?: string;
  error_code?: number;
  ok: boolean;
  result?: T;
};

function getBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
}

export function hasTelegramBotToken() {
  return Boolean(getBotToken());
}

export async function callTelegramBotApi<T>(method: string, body: Record<string, unknown>) {
  const token = getBotToken();

  if (!token) {
    return {
      error: "missing-telegram-bot-token",
      result: null,
      status: 500,
    };
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    body: JSON.stringify(body),
    cache: "no-store",
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
  const data = (await response.json()) as TelegramBotResponse<T>;

  if (!response.ok || !data.ok) {
    return {
      error: data.description ?? `telegram-http-${response.status}`,
      result: null,
      status: response.status,
    };
  }

  return {
    error: null,
    result: data.result ?? null,
    status: response.status,
  };
}

export async function createTelegramStarsInvoiceLink(input: {
  description: string;
  payload: string;
  stars: number;
  title: string;
}) {
  return callTelegramBotApi<string>("createInvoiceLink", {
    currency: "XTR",
    description: input.description,
    payload: input.payload,
    prices: [
      {
        amount: input.stars,
        label: input.title,
      },
    ],
    provider_token: "",
    title: input.title,
  });
}

export async function answerTelegramPreCheckoutQuery(input: {
  errorMessage?: string;
  ok: boolean;
  preCheckoutQueryId: string;
}) {
  return callTelegramBotApi<boolean>("answerPreCheckoutQuery", {
    error_message: input.errorMessage,
    ok: input.ok,
    pre_checkout_query_id: input.preCheckoutQueryId,
  });
}

export async function setTelegramWebhook(url: string) {
  return callTelegramBotApi<boolean>("setWebhook", {
    allowed_updates: ["pre_checkout_query", "message"],
    drop_pending_updates: false,
    url,
  });
}
