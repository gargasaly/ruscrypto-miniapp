import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export type ValidatedTelegramUser = {
  first_name?: string;
  id: number;
  language_code?: string;
  last_name?: string;
  username?: string;
};

export type TelegramInitDataValidation =
  | {
      ok: true;
      user: ValidatedTelegramUser;
    }
  | {
      error: string;
      ok: false;
    };

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function isTelegramUser(value: unknown): value is ValidatedTelegramUser {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { id?: unknown }).id === "number"
  );
}

export function validateTelegramInitData(initData: string): TelegramInitDataValidation {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();

  if (!botToken) {
    return {
      error: "missing-bot-token",
      ok: false,
    };
  }

  if (!initData.trim()) {
    return {
      error: "initData-required",
      ok: false,
    };
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash) {
    return {
      error: "hash-required",
      ok: false,
    };
  }

  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculatedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  const expected = Buffer.from(hash, "hex");
  const actual = Buffer.from(calculatedHash, "hex");

  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return {
      error: "invalid-init-data",
      ok: false,
    };
  }

  const parsedUser = safeJsonParse(params.get("user") ?? "");

  if (!isTelegramUser(parsedUser)) {
    return {
      error: "user-required",
      ok: false,
    };
  }

  return {
    ok: true,
    user: {
      first_name:
        typeof parsedUser.first_name === "string" ? parsedUser.first_name : undefined,
      id: parsedUser.id,
      language_code:
        typeof parsedUser.language_code === "string" ? parsedUser.language_code : undefined,
      last_name: typeof parsedUser.last_name === "string" ? parsedUser.last_name : undefined,
      username: typeof parsedUser.username === "string" ? parsedUser.username : undefined,
    },
  };
}
