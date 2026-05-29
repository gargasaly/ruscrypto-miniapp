import { isAdminTelegramUser } from "@/lib/checklist/accessPolicy";
import {
  isPortfolioDiarySymbol,
  normalizePortfolioDiarySymbol,
  portfolioDiaryModel,
} from "@/lib/portfolio/diaryModel";
import { getConfiguredSupabaseClient } from "@/lib/supabase/checks";
import { validateTelegramInitData, type ValidatedTelegramUser } from "@/lib/telegram/validateInitData";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DiaryBody = {
  cashUsd?: unknown;
  initData?: unknown;
  positions?: unknown;
};

type PortfolioPositionRow = {
  amount: number | string | null;
  symbol: string;
  updated_at?: string | null;
};

type PortfolioCashRow = {
  cash_usd: number | string | null;
  updated_at?: string | null;
};

const ADMIN_ID = 1720794119;
const ADMIN_USERNAME = "k_vahtang";
const MODEL_SYMBOLS = portfolioDiaryModel.map((asset) => asset.symbol);

function restEncode(value: string | number) {
  return encodeURIComponent(String(value));
}

function noStore(status?: number) {
  return {
    headers: {
      "Cache-Control": "no-store",
    },
    ...(status ? { status } : {}),
  };
}

function isDevelopmentAdminBypass(url: URL) {
  return process.env.NODE_ENV === "development" && url.searchParams.get("admin") === "1";
}

function isDiaryAdmin(user: ValidatedTelegramUser | null | undefined) {
  if (!user) {
    return false;
  }

  const username = user.username?.replace(/^@/, "").toLowerCase();

  return isAdminTelegramUser(user) || user.id === ADMIN_ID || username === ADMIN_USERNAME;
}

function readInitDataFromRequest(request: Request, body?: DiaryBody) {
  const url = new URL(request.url);

  return (
    request.headers.get("x-telegram-init-data") ??
    url.searchParams.get("initData") ??
    (typeof body?.initData === "string" ? body.initData : "") ??
    ""
  );
}

async function readBody(request: Request): Promise<DiaryBody> {
  try {
    const body = (await request.json()) as unknown;

    return typeof body === "object" && body !== null && !Array.isArray(body)
      ? (body as DiaryBody)
      : {};
  } catch {
    return {};
  }
}

function parseAmount(value: unknown) {
  if (value === "" || value === null || value === undefined) {
    return 0;
  }

  const numberValue = typeof value === "number" ? value : Number(String(value).replace(",", "."));

  if (!Number.isFinite(numberValue)) {
    return 0;
  }

  return numberValue;
}

function toNumber(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveUser(request: Request, body?: DiaryBody) {
  const url = new URL(request.url);

  if (isDevelopmentAdminBypass(url)) {
    return {
      admin: true,
      error: null,
      user: {
        first_name: "Dev",
        id: ADMIN_ID,
        username: "K_Vahtang",
      } satisfies ValidatedTelegramUser,
    };
  }

  const initData = readInitDataFromRequest(request, body);
  const validation = validateTelegramInitData(initData);

  if (!validation.ok) {
    return {
      admin: false,
      error: validation.error,
      user: null,
    };
  }

  return {
    admin: isDiaryAdmin(validation.user),
    error: null,
    user: validation.user,
  };
}

function forbidden(reason = "admin-only") {
  return Response.json(
    {
      locked: true,
      ok: false,
      reason,
    },
    noStore(403),
  );
}

export async function GET(request: Request) {
  const session = resolveUser(request);

  if (!session.admin || !session.user) {
    return forbidden(session.error ?? "admin-only");
  }

  const supabase = getConfiguredSupabaseClient();

  if (!supabase.isConfigured) {
    return Response.json(
      {
        ok: false,
        reason: supabase.reason,
      },
      noStore(503),
    );
  }

  const [positionsResult, cashResult] = await Promise.all([
    supabase.request<PortfolioPositionRow[]>(
      `rest/v1/portfolio_positions?telegram_user_id=eq.${restEncode(
        session.user.id,
      )}&select=symbol,amount,updated_at&order=symbol.asc`,
    ),
    supabase.request<PortfolioCashRow[]>(
      `rest/v1/portfolio_cash?telegram_user_id=eq.${restEncode(
        session.user.id,
      )}&select=cash_usd,updated_at&limit=1`,
    ),
  ]);

  if (positionsResult.error || cashResult.error) {
    return Response.json(
      {
        ok: false,
        reason: positionsResult.error ?? cashResult.error,
      },
      noStore(500),
    );
  }

  const positions = (positionsResult.data ?? [])
    .filter((row) => isPortfolioDiarySymbol(row.symbol))
    .map((row) => ({
      amount: toNumber(row.amount),
      symbol: normalizePortfolioDiarySymbol(row.symbol),
    }));
  const cash = cashResult.data?.[0] ?? null;
  const lastUpdatedAt =
    positionsResult.data
      ?.map((row) => row.updated_at)
      .filter(Boolean)
      .sort()
      .at(-1) ??
    cash?.updated_at ??
    null;

  return Response.json(
    {
      cashUsd: toNumber(cash?.cash_usd),
      lastUpdatedAt,
      ok: true,
      positions,
    },
    noStore(),
  );
}

export async function POST(request: Request) {
  const body = await readBody(request);
  const session = resolveUser(request, body);

  if (!session.admin || !session.user) {
    return forbidden(session.error ?? "admin-only");
  }

  const rawPositions = Array.isArray(body.positions) ? body.positions : [];
  const positionMap = new Map<string, number>();

  for (const item of rawPositions) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      continue;
    }

    const record = item as { amount?: unknown; symbol?: unknown };
    const symbol = normalizePortfolioDiarySymbol(record.symbol);

    if (!isPortfolioDiarySymbol(symbol)) {
      continue;
    }

    const amount = parseAmount(record.amount);

    if (amount < 0) {
      return Response.json(
        {
          ok: false,
          reason: "negative-amount",
          symbol,
        },
        noStore(400),
      );
    }

    positionMap.set(symbol, amount);
  }

  const cashUsd = parseAmount(body.cashUsd);

  if (cashUsd < 0) {
    return Response.json(
      {
        ok: false,
        reason: "negative-cash",
      },
      noStore(400),
    );
  }

  const supabase = getConfiguredSupabaseClient();

  if (!supabase.isConfigured) {
    return Response.json(
      {
        ok: false,
        reason: supabase.reason,
      },
      noStore(503),
    );
  }

  const now = new Date().toISOString();
  const positionsPayload = MODEL_SYMBOLS.map((symbol) => ({
    amount: positionMap.get(symbol) ?? 0,
    symbol,
    telegram_user_id: session.user.id,
    updated_at: now,
  }));

  const positionsResult = await supabase.request(
    "rest/v1/portfolio_positions?on_conflict=telegram_user_id,symbol",
    {
      body: positionsPayload,
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
    },
  );

  if (positionsResult.error) {
    return Response.json(
      {
        ok: false,
        reason: positionsResult.error,
      },
      noStore(500),
    );
  }

  const cashResult = await supabase.request("rest/v1/portfolio_cash?on_conflict=telegram_user_id", {
    body: {
      cash_usd: cashUsd,
      telegram_user_id: session.user.id,
      updated_at: now,
    },
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
  });

  if (cashResult.error) {
    return Response.json(
      {
        ok: false,
        reason: cashResult.error,
      },
      noStore(500),
    );
  }

  return Response.json(
    {
      ok: true,
      updatedAt: now,
    },
    noStore(),
  );
}
