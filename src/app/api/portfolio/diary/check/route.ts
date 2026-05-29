import { isAdminTelegramUser } from "@/lib/checklist/accessPolicy";
import { tokens } from "@/lib/content";
import { fetchMarketData, type MarketCoin } from "@/lib/market";
import {
  isPortfolioDiarySymbol,
  normalizePortfolioDiarySymbol,
  portfolioDiaryModel,
} from "@/lib/portfolio/diaryModel";
import { getConfiguredSupabaseClient } from "@/lib/supabase/checks";
import { calculatePumpRisk, type TokenPumpRiskLevel } from "@/lib/tokenChecklist";
import { validateTelegramInitData, type ValidatedTelegramUser } from "@/lib/telegram/validateInitData";
import { readHomeLiveState } from "@/lib/homeLive/cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DiaryCheckBody = {
  initData?: unknown;
};

type PortfolioPositionRow = {
  amount: number | string | null;
  symbol: string;
};

type PortfolioCashRow = {
  cash_usd: number | string | null;
};

type Risk = "high" | "low" | "medium" | "unknown";
type SellSignal = "high" | "medium" | "none";
type StructureStatus = "above" | "below" | "near";

const ADMIN_ID = 1720794119;
const ADMIN_USERNAME = "k_vahtang";
const tokenBySymbol = new Map(tokens.map((token) => [token.ticker.toUpperCase(), token]));

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

async function readBody(request: Request): Promise<DiaryCheckBody> {
  try {
    const body = (await request.json()) as unknown;

    return typeof body === "object" && body !== null && !Array.isArray(body)
      ? (body as DiaryCheckBody)
      : {};
  } catch {
    return {};
  }
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

function readInitDataFromRequest(request: Request, body?: DiaryCheckBody) {
  const url = new URL(request.url);

  return (
    request.headers.get("x-telegram-init-data") ??
    url.searchParams.get("initData") ??
    (typeof body?.initData === "string" ? body.initData : "") ??
    ""
  );
}

function resolveUser(request: Request, body?: DiaryCheckBody) {
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

  const validation = validateTelegramInitData(readInitDataFromRequest(request, body));

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

function safeNumber(value: unknown, fallback = 0) {
  const numberValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function toNumber(value: number | string | null | undefined) {
  return safeNumber(value);
}

function structureStatus(currentWeight: number, targetWeight: number): StructureStatus {
  const band = Math.max(0.5, targetWeight * 0.1);

  if (currentWeight < targetWeight - band) {
    return "below";
  }

  if (currentWeight > targetWeight + band) {
    return "above";
  }

  return "near";
}

function riskFromPump(level: TokenPumpRiskLevel): Risk {
  if (level === "extreme" || level === "high") {
    return "high";
  }

  if (level === "medium") {
    return "medium";
  }

  if (level === "low") {
    return "low";
  }

  return "unknown";
}

function liquidityRisk(symbol: string, coin: MarketCoin | null): {
  delta: number;
  risk: Risk;
  volumeToMarketCap: number | null;
} {
  const marketCap = coin?.market_cap ?? null;
  const volume = coin?.total_volume ?? null;
  const volumeToMarketCap =
    marketCap && marketCap > 0 && volume !== null ? volume / marketCap : null;

  if (volumeToMarketCap === null) {
    return {
      delta: 0,
      risk: "unknown",
      volumeToMarketCap,
    };
  }

  if (symbol === "BTC") {
    if (volumeToMarketCap < 0.005) {
      return { delta: -8, risk: "high", volumeToMarketCap };
    }

    if (volumeToMarketCap < 0.015) {
      return { delta: 0, risk: "medium", volumeToMarketCap };
    }

    return { delta: 4, risk: "low", volumeToMarketCap };
  }

  if (volumeToMarketCap < 0.01) {
    return { delta: -12, risk: "high", volumeToMarketCap };
  }

  if (volumeToMarketCap < 0.03) {
    return { delta: -4, risk: "medium", volumeToMarketCap };
  }

  return { delta: 5, risk: "low", volumeToMarketCap };
}

function cashOutRange(coverage: number) {
  if (coverage >= 0.9) {
    return "15–20%";
  }

  if (coverage >= 0.75) {
    return "10–15%";
  }

  return "5–10%";
}

function clampScore(value: number) {
  return Math.round(Math.min(100, Math.max(0, safeNumber(value, 0))));
}

function classifySellSignal(input: {
  change24h: number | null;
  macroRisk: Risk;
  pumpRisk: TokenPumpRiskLevel;
  volumeToMarketCap: number | null;
}): SellSignal {
  const change24h = input.change24h ?? 0;
  const volumeSpike =
    input.volumeToMarketCap !== null && input.volumeToMarketCap >= 0.1 && change24h >= 5;

  if (
    input.macroRisk === "high" ||
    input.pumpRisk === "extreme" ||
    input.pumpRisk === "high" ||
    change24h >= 15
  ) {
    return "high";
  }

  if (input.pumpRisk === "medium" || change24h >= 8 || volumeSpike) {
    return "medium";
  }

  return "none";
}

function actionForAsset(input: {
  coverage: number;
  hasPrice: boolean;
  liquidityRisk: Risk;
  macroRisk: Risk;
  pumpRisk: TokenPumpRiskLevel;
  score: number | null;
  sellSignal: SellSignal;
  structureStatus: StructureStatus;
  technicalRisk: Risk;
  tokenomicsRisk: Risk;
}) {
  if (!input.hasPrice || input.score === null) {
    return {
      action: "hold" as const,
      actionLabel: "Не трогать",
      cashOutRange: null,
      reason: "Данные по активу обновляются. Без сигнала риска действие не формируем.",
    };
  }

  if (input.sellSignal === "high" && input.coverage >= 0.5) {
    return {
      action: "cash_out" as const,
      actionLabel: "Снять часть в кэш",
      cashOutRange: cashOutRange(input.coverage),
      reason:
        "Актив выглядит перегретым, есть риск коррекции. Можно вывести часть позиции в кэш, чтобы позже откупить ниже или переложить часть в более сильный актив.",
    };
  }

  const belowModel = input.structureStatus === "below";
  const stronglyBelowModel = belowModel && input.coverage < 0.75;
  const hasHighRisk =
    input.pumpRisk === "high" ||
    input.pumpRisk === "extreme" ||
    input.macroRisk === "high" ||
    input.tokenomicsRisk === "high" ||
    input.liquidityRisk === "high" ||
    input.technicalRisk === "high";
  const buyConditionsGood = !hasHighRisk && input.score >= 60;

  if (input.sellSignal === "medium" && stronglyBelowModel) {
    return {
      action: "hold" as const,
      actionLabel: "Не трогать",
      cashOutRange: null,
      reason:
        "Актив ниже модельной доли, но сейчас есть умеренный риск перегрева. Без сильного сигнала лучше не менять позицию.",
    };
  }

  if (belowModel && buyConditionsGood) {
    return {
      action: "buy" as const,
      actionLabel: "Можно докупать",
      cashOutRange: null,
      reason: "Актив ниже модельной доли, при этом сильного перегрева сейчас нет.",
    };
  }

  if (belowModel && !buyConditionsGood) {
    return {
      action: "hold" as const,
      actionLabel: "Не трогать",
      cashOutRange: null,
      reason: "Актив ниже модельной доли, но сейчас условия для докупки слабые.",
    };
  }

  if (input.sellSignal === "medium" && input.coverage >= 0.5) {
    return {
      action: "cash_out" as const,
      actionLabel: "Снять часть в кэш",
      cashOutRange: cashOutRange(input.coverage),
      reason:
        "Актив выглядит перегретым, есть риск коррекции. Можно вывести часть позиции в кэш, чтобы позже откупить ниже или переложить часть в более сильный актив.",
    };
  }

  return {
    action: "hold" as const,
    actionLabel: "Не трогать",
    cashOutRange: null,
    reason: "Нет сильного сигнала для докупки или вывода части позиции в кэш.",
  };
}

export async function GET() {
  return Response.json(
    {
      ok: false,
      reason: "use-post",
    },
    noStore(405),
  );
}

export async function POST(request: Request) {
  const body = await readBody(request);
  const session = resolveUser(request, body);

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

  const [positionsResult, cashResult, market] = await Promise.all([
    supabase.request<PortfolioPositionRow[]>(
      `rest/v1/portfolio_positions?telegram_user_id=eq.${restEncode(
        session.user.id,
      )}&select=symbol,amount`,
    ),
    supabase.request<PortfolioCashRow[]>(
      `rest/v1/portfolio_cash?telegram_user_id=eq.${restEncode(
        session.user.id,
      )}&select=cash_usd&limit=1`,
    ),
    fetchMarketData(),
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

  const amountBySymbol = new Map<string, number>();

  for (const row of positionsResult.data ?? []) {
    const symbol = normalizePortfolioDiarySymbol(row.symbol);

    if (isPortfolioDiarySymbol(symbol)) {
      amountBySymbol.set(symbol, Math.max(0, toNumber(row.amount)));
    }
  }

  const coinById = new Map(market.coins.map((coin) => [coin.id, coin]));
  const rows = portfolioDiaryModel.map((asset) => {
    const token = tokenBySymbol.get(asset.symbol);
    const coin = token ? (coinById.get(token.coingeckoId) ?? null) : null;
    const amount = amountBySymbol.get(asset.symbol) ?? 0;
    const price = coin?.current_price ?? null;
    const valueUsd = price !== null ? safeNumber(amount * price) : 0;

    return {
      ...asset,
      amount,
      coin,
      hasPrice: price !== null,
      price,
      valueUsd,
    };
  });
  const cryptoTotalUsd = safeNumber(rows.reduce((sum, row) => sum + row.valueUsd, 0));
  const cashUsd = toNumber(cashResult.data?.[0]?.cash_usd);
  const totalWithCashUsd = cryptoTotalUsd + cashUsd;
  const homeState = readHomeLiveState();
  const macroRisk: Risk = homeState?.payload.mainRisk.impact === "high" ? "high" : "low";

  const assets = rows.map((row) => {
    const currentWeight =
      cryptoTotalUsd > 0 ? safeNumber((row.valueUsd / cryptoTotalUsd) * 100) : 0;
    const status = structureStatus(currentWeight, row.targetWeight);
    const coverage = row.targetWeight > 0 ? currentWeight / row.targetWeight : 0;
    const change24h = row.coin?.price_change_percentage_24h ?? null;
    const pumpRisk = calculatePumpRisk({
      change24h,
      change30d: null,
      change7d: null,
      nearHigh: null,
      rsi14: null,
    });
    const liquid = liquidityRisk(row.symbol, row.coin);
    const technicalRisk = riskFromPump(pumpRisk.level);
    const tokenomicsRisk: Risk = "unknown";
    const score = row.hasPrice
      ? clampScore(
          70 +
            pumpRisk.scoreDelta +
            liquid.delta +
            (macroRisk === "high" ? -12 : 0) +
            (change24h !== null && change24h <= -8 ? -8 : 0),
        )
      : null;
    const sellSignal = classifySellSignal({
      change24h,
      macroRisk,
      pumpRisk: pumpRisk.level,
      volumeToMarketCap: liquid.volumeToMarketCap,
    });
    const action = actionForAsset({
      coverage,
      hasPrice: row.hasPrice && cryptoTotalUsd > 0,
      liquidityRisk: liquid.risk,
      macroRisk,
      pumpRisk: pumpRisk.level,
      score,
      sellSignal,
      structureStatus: status,
      technicalRisk,
      tokenomicsRisk,
    });

    return {
      action: action.action,
      actionLabel: action.actionLabel,
      cashOutRange: action.cashOutRange,
      category: row.categoryLabel,
      currentWeight,
      reason: action.reason,
      signals: {
        liquidityRisk: liquid.risk,
        macroRisk,
        pumpRisk: pumpRisk.level,
        score,
        technicalRisk,
        tokenomicsRisk,
      },
      structureStatus: status,
      symbol: row.symbol,
      targetWeight: row.targetWeight,
    };
  });

  return Response.json(
    {
      assets,
      checkedAt: new Date().toISOString(),
      ok: true,
      summary: {
        buyCount: assets.filter((asset) => asset.action === "buy").length,
        cashOutCount: assets.filter((asset) => asset.action === "cash_out").length,
        holdCount: assets.filter((asset) => asset.action === "hold").length,
      },
      totals: {
        cashUsd,
        cryptoTotalUsd,
        totalWithCashUsd,
      },
    },
    noStore(),
  );
}
