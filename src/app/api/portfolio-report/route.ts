import { isAdminTelegramUser } from "@/lib/checklist/accessPolicy";
import { getPreparedPortfolioReport } from "@/lib/portfolio/preparedReport";
import { getTelegramChatMember } from "@/lib/telegram/botApi";
import { validateTelegramInitData } from "@/lib/telegram/validateInitData";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RELEASE_DATE = "22.05.2026";
const CHANNEL_ID = "@ruscrypto2026";
const CHANNEL_URL = "https://t.me/ruscrypto2026";

type PortfolioReportBody = {
  initData?: unknown;
};

function lockedResponse({
  message,
  reason,
  status = 200,
  title,
}: {
  message: string;
  reason?: string;
  status?: number;
  title: string;
}) {
  return Response.json(
    {
      channelUrl: CHANNEL_URL,
      isAdmin: false,
      locked: true,
      message,
      ok: true,
      reason,
      releaseDate: RELEASE_DATE,
      released: true,
      title,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
      status,
    },
  );
}

async function readBody(request: Request): Promise<PortfolioReportBody> {
  try {
    return (await request.json()) as PortfolioReportBody;
  } catch {
    return {};
  }
}

function isActiveChannelMember(status: string, isMember?: boolean) {
  return (
    status === "creator" ||
    status === "administrator" ||
    status === "member" ||
    (status === "restricted" && isMember === true)
  );
}

function isKnownNotSubscriberError(error: string) {
  const normalized = error.toLowerCase();

  return (
    normalized.includes("user not found") ||
    normalized.includes("not a member") ||
    normalized.includes("participant") ||
    normalized.includes("member not found")
  );
}

export async function GET() {
  return lockedResponse({
    message: "Подпишитесь на канал «Крипта для новичков» и проверьте доступ.",
    reason: "initData-required",
    title: "Доступ только для подписчиков канала",
  });
}

export async function POST(request: Request) {
  const body = await readBody(request);
  const validation = validateTelegramInitData(
    typeof body.initData === "string" ? body.initData : "",
  );

  if (!validation.ok) {
    return lockedResponse({
      message: "Подпишитесь на канал «Крипта для новичков» и проверьте доступ.",
      reason: validation.error,
      title: "Доступ только для подписчиков канала",
    });
  }

  const isAdmin = isAdminTelegramUser(validation.user);

  if (!isAdmin) {
    const membership = await getTelegramChatMember({
      chatId: CHANNEL_ID,
      userId: validation.user.id,
    });

    if (membership.error || !membership.result) {
      const reason = membership.error
        ? isKnownNotSubscriberError(membership.error)
          ? "not-subscriber"
          : "subscription-check-unavailable"
        : "subscription-check-unavailable";

      return lockedResponse({
        message:
          reason === "not-subscriber"
            ? "Подпишитесь на канал «Крипта для новичков» и проверьте доступ."
            : "Не удалось проверить подписку. Если сообщение повторяется, боту нужна возможность проверять участников канала.",
        reason,
        title:
          reason === "not-subscriber"
            ? "Доступ только для подписчиков канала"
            : "Не удалось проверить подписку",
      });
    }

    if (!isActiveChannelMember(membership.result.status, membership.result.is_member)) {
      return lockedResponse({
        message: "Подпишитесь на канал «Крипта для новичков» и проверьте доступ.",
        reason: "not-subscriber",
        title: "Доступ только для подписчиков канала",
      });
    }
  }

  const report = await getPreparedPortfolioReport();

  return Response.json(
    {
      isAdmin,
      locked: false,
      ok: true,
      releaseDate: RELEASE_DATE,
      released: true,
      report,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
