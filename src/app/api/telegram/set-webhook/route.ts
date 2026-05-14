import { setTelegramWebhook } from "@/lib/telegram/botApi";

export const dynamic = "force-dynamic";

type SetWebhookBody = {
  secret?: unknown;
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

async function readBody(request: Request): Promise<SetWebhookBody> {
  try {
    return (await request.json()) as SetWebhookBody;
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

  if (!configuredSecret) {
    return noStoreJson(
      {
        ok: false,
        reason: "TELEGRAM_WEBHOOK_SECRET not configured",
      },
      { status: 503 },
    );
  }

  const body = await readBody(request);
  const secret = typeof body.secret === "string" ? body.secret : "";

  if (secret !== configuredSecret) {
    return noStoreJson(
      {
        ok: false,
        reason: "forbidden",
      },
      { status: 403 },
    );
  }

  const webhookUrl = "https://ruscrypto-miniapp.vercel.app/api/telegram/webhook";
  const result = await setTelegramWebhook(webhookUrl);

  if (result.error) {
    return noStoreJson(
      {
        ok: false,
        reason: result.error,
      },
      { status: 502 },
    );
  }

  return noStoreJson({
    ok: true,
    webhookUrl,
  });
}
