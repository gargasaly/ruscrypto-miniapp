import { isAdminTelegramUser } from "@/lib/checklist/accessPolicy";
import {
  isPortfolioDiarySymbol,
  normalizePortfolioDiarySymbol,
  portfolioDiaryModel,
} from "@/lib/portfolio/diaryModel";
import {
  PORTFOLIO_PRO_PRICE_STARS,
  PORTFOLIO_PRO_PRODUCT,
  getPortfolioProStatus,
} from "@/lib/portfolio/proAccess";
import { getConfiguredSupabaseClient } from "@/lib/supabase/checks";
import { validateTelegramInitData, type ValidatedTelegramUser } from "@/lib/telegram/validateInitData";

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

type ChecklistSource = "checklist" | "fallback" | "missing";
type DiaryAction = "buy" | "cash_out" | "hold";
type RiskLevel = "extreme" | "high" | "low" | "medium" | "medium-high" | "unknown";
type StructureStatus = "above" | "below" | "near";

type ChecklistSignal = {
  key?: unknown;
  label?: unknown;
  level?: unknown;
  text?: unknown;
};

type ChecklistPayload = {
  analysisSignals?: unknown;
  dataQuality?: unknown;
  debug?: unknown;
  market?: {
    change24h?: unknown;
    change30d?: unknown;
    change7d?: unknown;
    price?: unknown;
    volumeToMarketCap?: unknown;
  };
  ok?: unknown;
  technical?: {
    nearHigh?: unknown;
    position?: unknown;
    pumpRisk?: unknown;
    rsi14?: unknown;
  };
  verdict?: {
    score?: unknown;
  };
};

type ChecklistSnapshot = {
  cashOutReasons: string[];
  checklistScore: number | null;
  checklistSource: ChecklistSource;
  market: {
    change24h: number | null;
    change30d: number | null;
    change7d: number | null;
    price: number | null;
    volumeToMarketCap: number | null;
  };
  signals: {
    liquidityRisk: RiskLevel;
    macroRisk: RiskLevel;
    pumpRisk: RiskLevel;
    score: number | null;
    technicalRisk: RiskLevel;
    tokenomicsRisk: RiskLevel;
  };
  technical: {
    nearHigh: number | null;
    rsi14: number | null;
  };
};

const ADMIN_ID = 1720794119;
const ADMIN_USERNAME = "k_vahtang";

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

function forbidden(reason = "initData-required") {
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

function finiteOrNull(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
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

function normalizeRisk(value: unknown): RiskLevel {
  if (typeof value !== "string") {
    return "unknown";
  }

  const normalized = value.toLowerCase();

  if (normalized === "extreme") {
    return "extreme";
  }

  if (normalized === "high") {
    return "high";
  }

  if (normalized === "medium-high") {
    return "medium-high";
  }

  if (normalized === "medium") {
    return "medium";
  }

  if (normalized === "low") {
    return "low";
  }

  return "unknown";
}

function isElevatedRisk(level: RiskLevel) {
  return level === "medium" || level === "medium-high" || level === "high" || level === "extreme";
}

function isHighRisk(level: RiskLevel) {
  return level === "medium-high" || level === "high" || level === "extreme";
}

function riskLabel(level: RiskLevel) {
  if (level === "extreme") {
    return "экстремальный";
  }

  if (level === "high" || level === "medium-high") {
    return "высокий";
  }

  if (level === "medium") {
    return "средний";
  }

  if (level === "low") {
    return "низкий";
  }

  return "не определён";
}

function getSignals(payload: ChecklistPayload): ChecklistSignal[] {
  return Array.isArray(payload.analysisSignals)
    ? (payload.analysisSignals as ChecklistSignal[])
    : [];
}

function getSignalLevel(payload: ChecklistPayload, key: string) {
  const signal = getSignals(payload).find((item) => item.key === key);

  return normalizeRisk(signal?.level);
}

function stripDebug(payload: unknown): ChecklistPayload | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return null;
  }

  const { debug: _debug, ...analysis } = payload as ChecklistPayload;

  return analysis;
}

function cashOutRange(coverage: number) {
  if (coverage >= 0.9) {
    return "15–20% позиции";
  }

  if (coverage >= 0.75) {
    return "10–15% позиции";
  }

  return "5–10% позиции";
}

function buildCashOutReasons(input: {
  change24h: number | null;
  change30d: number | null;
  change7d: number | null;
  macroRisk: RiskLevel;
  nearHigh: number | null;
  pumpRisk: RiskLevel;
  rsi14: number | null;
  technicalRisk: RiskLevel;
  volumeRisk: RiskLevel;
}) {
  const reasons: string[] = [];

  if (isElevatedRisk(input.pumpRisk)) {
    reasons.push(`памп-риск ${riskLabel(input.pumpRisk)}`);
  }

  if (isHighRisk(input.technicalRisk)) {
    reasons.push("технический риск повышен");
  }

  if (input.rsi14 !== null && input.rsi14 >= 70) {
    reasons.push("RSI высокий");
  }

  if (input.change24h !== null && input.change24h >= 8) {
    reasons.push("24ч рост сильный");
  }

  if (input.change7d !== null && input.change7d >= 15) {
    reasons.push("7д рост сильный");
  }

  if (input.change30d !== null && input.change30d >= 35) {
    reasons.push("30д рост сильный");
  }

  if (input.nearHigh !== null && input.nearHigh > -3) {
    reasons.push("цена рядом с локальным high");
  }

  if (isHighRisk(input.macroRisk)) {
    reasons.push("макро-риск высокий");
  }

  if (isHighRisk(input.volumeRisk) && input.change24h !== null && input.change24h >= 5) {
    reasons.push("рост на повышенном объёме");
  }

  return [...new Set(reasons)].slice(0, 3);
}

function missingChecklist(): ChecklistSnapshot {
  return {
    cashOutReasons: [],
    checklistScore: null,
    checklistSource: "missing",
    market: {
      change24h: null,
      change30d: null,
      change7d: null,
      price: null,
      volumeToMarketCap: null,
    },
    signals: {
      liquidityRisk: "unknown",
      macroRisk: "unknown",
      pumpRisk: "unknown",
      score: null,
      technicalRisk: "unknown",
      tokenomicsRisk: "unknown",
    },
    technical: {
      nearHigh: null,
      rsi14: null,
    },
  };
}

async function fetchChecklistSnapshot(request: Request, symbol: string): Promise<ChecklistSnapshot> {
  try {
    const url = new URL("/api/token-checklist", request.url);

    url.searchParams.set("symbol", symbol);
    url.searchParams.set("debug", "1");

    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return missingChecklist();
    }

    const payload = stripDebug(await response.json());

    if (!payload || payload.ok !== true) {
      return missingChecklist();
    }

    const checklistScore = finiteOrNull(payload.verdict?.score);
    const dataQuality = typeof payload.dataQuality === "string" ? payload.dataQuality : null;
    const checklistSource: ChecklistSource =
      checklistScore === null ? "missing" : dataQuality === "fallback" ? "fallback" : "checklist";
    const change24h = finiteOrNull(payload.market?.change24h);
    const change7d = finiteOrNull(payload.market?.change7d);
    const change30d = finiteOrNull(payload.market?.change30d);
    const nearHigh = finiteOrNull(payload.technical?.nearHigh);
    const rsi14 = finiteOrNull(payload.technical?.rsi14);
    const pumpRisk = normalizeRisk(payload.technical?.pumpRisk ?? getSignalLevel(payload, "pumpRisk"));
    const technicalRisk = getSignalLevel(payload, "technicalRisk");
    const liquidityRisk = getSignalLevel(payload, "liquidity");
    const tokenomicsRisk = getSignalLevel(payload, "tokenomics");
    const macroRisk = getSignalLevel(payload, "macro");
    const volumeRisk = getSignalLevel(payload, "volume");
    const cashOutReasons =
      checklistSource === "checklist"
        ? buildCashOutReasons({
            change24h,
            change30d,
            change7d,
            macroRisk,
            nearHigh,
            pumpRisk,
            rsi14,
            technicalRisk,
            volumeRisk,
          })
        : [];

    return {
      cashOutReasons,
      checklistScore,
      checklistSource,
      market: {
        change24h,
        change30d,
        change7d,
        price: finiteOrNull(payload.market?.price),
        volumeToMarketCap: finiteOrNull(payload.market?.volumeToMarketCap),
      },
      signals: {
        liquidityRisk,
        macroRisk,
        pumpRisk,
        score: checklistScore,
        technicalRisk,
        tokenomicsRisk,
      },
      technical: {
        nearHigh,
        rsi14,
      },
    };
  } catch {
    return missingChecklist();
  }
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
) {
  const results: R[] = [];

  for (let index = 0; index < items.length; index += limit) {
    results.push(...(await Promise.all(items.slice(index, index + limit).map(mapper))));
  }

  return results;
}

function actionForAsset(input: {
  cashOutSignal: boolean;
  checklistScore: number | null;
  checklistSource: ChecklistSource;
  coverage: number;
  structureStatus: StructureStatus;
}) {
  if (input.checklistSource !== "checklist" || input.checklistScore === null) {
    return {
      action: "hold" as DiaryAction,
      actionLabel: "Не трогать",
      cashOutRange: null,
      reason: "Данные по активу обновляются. Без актуального чек-листа действие не формируем.",
    };
  }

  if (input.checklistScore >= 75) {
    if (input.structureStatus === "below") {
      return {
        action: "buy" as DiaryAction,
        actionLabel: "Можно докупать",
        cashOutRange: null,
        reason: "Актив ниже модельной доли, а чек-лист в комфортной зоне.",
      };
    }

    return {
      action: "hold" as DiaryAction,
      actionLabel: "Не трогать",
      cashOutRange: null,
      reason: "Чек-лист хороший, но актив уже близко к модельной доле или выше неё.",
    };
  }

  if (input.checklistScore >= 60) {
    if (input.structureStatus === "below") {
      return {
        action: "buy" as DiaryAction,
        actionLabel: "Можно докупать",
        cashOutRange: null,
        reason: "Актив ниже модельной доли, условия рабочие, но докупку лучше делать осторожно.",
      };
    }

    return {
      action: "hold" as DiaryAction,
      actionLabel: "Не трогать",
      cashOutRange: null,
      reason: "Условия рабочие, но актив уже близко к модельной доле или выше неё.",
    };
  }

  if (input.checklistScore >= 45) {
    return {
      action: "hold" as DiaryAction,
      actionLabel: "Не трогать",
      cashOutRange: null,
      reason:
        "Чек-лист в зоне осторожности. Сейчас нет сильного сигнала для докупки или вывода части позиции в кэш.",
    };
  }

  if (input.cashOutSignal) {
    if (input.coverage >= 0.5) {
      return {
        action: "cash_out" as DiaryAction,
        actionLabel: "Снять часть в кэш",
        cashOutRange: cashOutRange(input.coverage),
        reason:
          "Актив выглядит перегретым, есть риск коррекции. Можно вывести часть позиции в кэш, чтобы позже откупить ниже или переложить часть в более сильный актив.",
      };
    }

    return {
      action: "hold" as DiaryAction,
      actionLabel: "Не трогать",
      cashOutRange: null,
      reason:
        "Актив сильно ниже модельной доли. Даже при слабом чек-листе выводить часть позиции в кэш сейчас не рассматриваем.",
    };
  }

  return {
    action: "hold" as DiaryAction,
    actionLabel: "Не трогать",
    cashOutRange: null,
    reason:
      "Чек-лист слабый, поэтому докупку не рассматриваем. Но признаков перегрева для вывода части позиции в кэш сейчас нет.",
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

  if (!session.user) {
    return forbidden(session.error ?? "initData-required");
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

  const proStatus = await getPortfolioProStatus(supabase, session.user);

  if (!proStatus.hasPro) {
    return Response.json(
      {
        ok: false,
        priceStars: PORTFOLIO_PRO_PRICE_STARS,
        product: PORTFOLIO_PRO_PRODUCT,
        requiresPro: true,
      },
      noStore(402),
    );
  }

  const [positionsResult, cashResult, checklistSnapshots] = await Promise.all([
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
    mapWithConcurrency(portfolioDiaryModel, portfolioDiaryModel.length, (asset) =>
      fetchChecklistSnapshot(request, asset.symbol),
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

  const amountBySymbol = new Map<string, number>();

  for (const row of positionsResult.data ?? []) {
    const symbol = normalizePortfolioDiarySymbol(row.symbol);

    if (isPortfolioDiarySymbol(symbol)) {
      amountBySymbol.set(symbol, Math.max(0, toNumber(row.amount)));
    }
  }

  const rows = portfolioDiaryModel.map((asset, index) => {
    const checklist = checklistSnapshots[index] ?? missingChecklist();
    const amount = amountBySymbol.get(asset.symbol) ?? 0;
    const price = checklist.market.price;
    const valueUsd = price !== null ? safeNumber(amount * price) : 0;

    return {
      ...asset,
      amount,
      checklist,
      hasPrice: price !== null,
      price,
      valueUsd,
    };
  });
  const cryptoTotalUsd = safeNumber(rows.reduce((sum, row) => sum + row.valueUsd, 0));
  const cashUsd = toNumber(cashResult.data?.[0]?.cash_usd);
  const totalWithCashUsd = cryptoTotalUsd + cashUsd;

  const assets = rows.map((row) => {
    const currentWeight =
      cryptoTotalUsd > 0 ? safeNumber((row.valueUsd / cryptoTotalUsd) * 100) : 0;
    const status = structureStatus(currentWeight, row.targetWeight);
    const coverage = row.targetWeight > 0 ? safeNumber(currentWeight / row.targetWeight) : 0;
    const cashOutSignal =
      row.checklist.checklistSource === "checklist" && row.checklist.cashOutReasons.length > 0;
    const action = actionForAsset({
      cashOutSignal,
      checklistScore: row.checklist.checklistScore,
      checklistSource: row.checklist.checklistSource,
      coverage,
      structureStatus: status,
    });

    return {
      action: action.action,
      actionLabel: action.actionLabel,
      cashOutRange: action.cashOutRange,
      cashOutReasons: cashOutSignal ? row.checklist.cashOutReasons : [],
      cashOutSignal,
      category: row.categoryLabel,
      checklistScore: row.checklist.checklistScore,
      checklistSource: row.checklist.checklistSource,
      coverage,
      currentWeight,
      reason: action.reason,
      signals: row.checklist.signals,
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
