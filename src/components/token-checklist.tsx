"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { TokenLogo } from "@/components/token-logo";
import { trackEvent } from "@/lib/analytics/client";
import {
  CHECKLIST_PRICING_PREVIEW,
  LOCKED_ALT_MESSAGE,
  isFreeChecklistSymbol,
  isPaidTestSymbol,
} from "@/lib/checklist/accessPolicy";
import { getFreeChecklistSymbols } from "@/lib/checklistAccess";
import type { TokenCard } from "@/lib/content";
import {
  formatCompactNumber,
  formatMarketCap,
  formatPercent,
  formatUsdPrice,
  formatVolume,
  toFiniteNumber,
} from "@/lib/formatters";
import type {
  TokenAnalysisSignal,
  TokenChecklistFactor,
  TokenChecklistRiskLevel,
} from "@/lib/tokenChecklist";
import {
  getTelegramInitData,
  openTelegramInvoice,
  watchTelegramInitData,
} from "@/lib/telegram/webapp";

type TokenChecklistProps = {
  tokens: TokenCard[];
};

type SourceStatus = "ok" | "partial" | "failed" | "fallback-market-cache";
type DataQuality = "full" | "partial" | "fallback" | "last-good";

type TokenChecklistApiResponse = {
  access?: {
    accessType: "active_result" | "admin" | "free" | "paid_balance" | "portfolio_pro";
    activeResult?: boolean;
    activeResultUntil?: string | null;
    charged: boolean;
    isAdmin?: boolean;
    paymentRequired: boolean;
  };
  activeResult?: boolean;
  activeResultUntil?: string | null;
  analysisSignals?: TokenAnalysisSignal[];
  balance?: {
    checksAvailable: number | "unlimited";
    checksUsed: number;
  };
  dataQuality: DataQuality;
  liquidity: {
    benchmarkPercent: number | null;
    explanation: string;
    isEstimated: boolean;
    label: string;
    score: number | null;
  };
  market: {
    ath: number | null;
    change24h: number | null;
    change30d: number | null;
    change7d: number | null;
    distanceFromAth: number | null;
    marketCap: number | null;
    price: number | null;
    volume24h: number | null;
    volumeToMarketCap: number | null;
  };
  ok: boolean;
  project: {
    sectorRiskRu: string;
    sectorRu: string;
    summaryRu: string;
  };
  sourceStatus: Record<"chart" | "details" | "market" | "tickers" | "unlocks", SourceStatus>;
  technical: {
    nearHigh: number | null;
    nearLow: number | null;
    position: "hot" | "neutral" | "cold" | "unknown";
    pumpRisk: TokenChecklistRiskLevel;
    pumpRiskLabel?: string;
    pumpRiskText?: string;
    rsi14: number | null;
    sma20: number | null;
    sma50: number | null;
  };
  token: {
    id: string;
    image: string | null;
    name: string;
    symbol: string;
  };
  unlocks: {
    circulatingSupplyPercent: number | null;
    confidence: "high" | "medium" | "low" | "unknown";
    explanation: string;
    isAvailable: boolean;
    label: string;
    lockedPercent: number | null;
    allocationName: string | null;
    comparedSources: string[];
    conflicts: string[];
    manualCheckUrls: Array<{
      label: string;
      url: string;
    }>;
    nextUnlockAmount: number | null;
    nextUnlockAmountUsd: number | null;
    nextUnlockDate: string | null;
    nextUnlockMarketCapPercent: number | null;
    nextUnlockPercent: number | null;
    provider: string;
    providerStatus: string;
    rawTitle: string | null;
    sourceUrl: string | null;
    tokenomics: {
      circulatingSupply: number | null;
      circulatingSupplyPercent: number | null;
      concentrationWarnings: string[];
      distribution: Array<{
        name: string;
        percentage: number | null;
      }>;
      hasBurn?: boolean | null;
      hasBuyback?: boolean | null;
      hasCommittedClaim?: boolean | null;
      hasFundraising?: boolean | null;
      latestFundraisingRound?: string | null;
      lockedPercentage?: number | null;
      maxSupply: number | null;
      provider: string;
      providerStatus: string;
      releasedPercentage?: number | null;
      sourceUrl: string | null;
      tbdLockedAmount?: number | null;
      tbdPercentage?: number | null;
      totalLockedAmount?: number | null;
      totalSupply: number | null;
      unlockedAmount?: number | null;
      untrackedAmount?: number | null;
      websiteUrl?: string | null;
    } | null;
    lockedPercentage: number | null;
    maxSupply: number | null;
    releasedPercentage: number | null;
    tbdLockedAmount: number | null;
    tbdPercentage: number | null;
    tokenomistSummary: {
      hasBurn: boolean | null;
      hasBuyback: boolean | null;
      latestFundraisingRound: string | null;
    } | null;
    totalLockedAmount: number | null;
    unlockedAmount: number | null;
    unlockedPercent: number | null;
    unlockEvents: Array<{
      allocationName: string | null;
      amountNative: number | null;
      amountUsd: number | null;
      date: string | null;
      percent: number | null;
      title: string;
      type: string | null;
    }>;
    unlocksRemainingNative: number | null;
    unlocksRemainingUsd: number | null;
    vestingChart: Array<{
      cumulativeUnlockedNative: number | null;
      cumulativeUnlockedUsd: number | null;
      date: string;
      percentOfUnlocksCompleted: number | null;
      unlocksRemainingNative: number | null;
      unlocksRemainingUsd: number | null;
    }>;
    vestingEndDate: string | null;
    allocations: Array<{
      name: string;
      percentage: number | null;
      unlockedPercent?: number | null;
    }>;
    warnings: string[];
  };
  updatedAt: string;
  verdict: {
    badges: string[];
    factors: TokenChecklistFactor[];
    riskLevel: TokenChecklistRiskLevel;
    score: number;
    scoreBreakdown?: Array<{
      delta: number;
      factor: string;
      reason: string;
    }>;
    text: string;
    title: string;
  };
  volume: {
    benchmark: number | null;
    benchmarkPercent: number | null;
    explanation: string;
    label: string;
    value: number | null;
    volumeToMarketCap: number | null;
  };
  warnings: string[];
};

type ChecklistState = {
  data: TokenChecklistApiResponse | null;
  error: string | null;
  loading: boolean;
  staleNotice: string | null;
};

type AccessStatus = "idle" | "loading" | "authenticated" | "anonymous" | "error";

type EnaAccessReason =
  | "admin"
  | "has-balance"
  | "active-result"
  | "portfolio-pro"
  | "needs-payment";

type EnaAccessState = {
  activeResultUntil: string | null;
  canRun: boolean;
  lastCheckAt: string | null;
  reason: EnaAccessReason;
};

type AccountState = {
  authenticated: boolean;
  checksAvailable: number | "unlimited" | null;
  checksUsed: number;
  enaAccess: EnaAccessState;
  firstName: string | null;
  isAdmin: boolean;
  loaded: boolean;
  paidAccess: Record<string, EnaAccessState>;
  reason: string | null;
  telegramUserId: number | null;
  username: string | null;
};

type PaymentPackageId = "single_check" | "five_checks";

type PaymentState = {
  invoiceOpen?: boolean;
  loadingPackage: PaymentPackageId | null;
  message: string | null;
  tone: "green" | "yellow" | "red" | null;
};

type CachedChecklistData = {
  expiresAt: number;
  response: TokenChecklistApiResponse;
  updatedAt: string;
};

const CACHE_TTL_MS = 15 * 60_000;
const DEFAULT_ENA_ACCESS: EnaAccessState = {
  activeResultUntil: null,
  canRun: false,
  lastCheckAt: null,
  reason: "needs-payment",
};

function normalizeEnaAccess(value: unknown, isAdmin: boolean): EnaAccessState {
  if (isAdmin) {
    return {
      activeResultUntil: null,
      canRun: true,
      lastCheckAt: null,
      reason: "admin",
    };
  }

  if (typeof value !== "object" || value === null) {
    return DEFAULT_ENA_ACCESS;
  }

  const access = value as {
    activeResultUntil?: unknown;
    canRun?: unknown;
    lastCheckAt?: unknown;
    reason?: unknown;
  };
  const reason =
    access.reason === "has-balance" ||
    access.reason === "active-result" ||
    access.reason === "portfolio-pro" ||
    access.reason === "needs-payment"
      ? access.reason
      : "needs-payment";

  return {
    activeResultUntil:
      typeof access.activeResultUntil === "string" ? access.activeResultUntil : null,
    canRun: access.canRun === true,
    lastCheckAt: typeof access.lastCheckAt === "string" ? access.lastCheckAt : null,
    reason,
  };
}

function normalizePaidAccessMap(value: unknown, isAdmin: boolean) {
  if (typeof value !== "object" || value === null) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([symbol, access]) => [
      symbol.toUpperCase(),
      normalizeEnaAccess(access, isAdmin),
    ]),
  );
}

function getPaidAccessForSymbol(
  access: Record<string, EnaAccessState>,
  symbol: string,
  isAdmin: boolean,
) {
  return normalizeEnaAccess(access[symbol.toUpperCase()], isAdmin);
}

function cacheKey(symbol: string) {
  return `token-checklist:last-good:${symbol.toUpperCase()}`;
}

function isChecklistResponse(value: unknown): value is TokenChecklistApiResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    "token" in value &&
    "verdict" in value
  );
}

function qualityRank(value: DataQuality) {
  if (value === "full") {
    return 3;
  }

  if (value === "partial" || value === "last-good") {
    return 2;
  }

  return 1;
}

function unlockQualityRank(value: TokenChecklistApiResponse["unlocks"]["confidence"]) {
  if (value === "high") {
    return 4;
  }

  if (value === "medium") {
    return 3;
  }

  if (value === "low") {
    return 2;
  }

  return 1;
}

function hasPriceAndPumpData(value: TokenChecklistApiResponse) {
  return (
    value.market.price !== null ||
    value.market.change24h !== null ||
    value.market.change7d !== null ||
    value.market.change30d !== null
  );
}

function readCachedData(symbol: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(cacheKey(symbol));

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CachedChecklistData;

    if (
      parsed.expiresAt > Date.now() &&
      isChecklistResponse(parsed.response) &&
      parsed.response.ok
    ) {
      return parsed.response;
    }
  } catch {
    return null;
  }

  return null;
}

function writeCachedData(response: TokenChecklistApiResponse) {
  if (typeof window === "undefined" || !response.ok || response.dataQuality === "fallback") {
    return;
  }

  try {
    const payload: CachedChecklistData = {
      expiresAt: Date.now() + CACHE_TTL_MS,
      response,
      updatedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(cacheKey(response.token.symbol), JSON.stringify(payload));
  } catch {
    // localStorage может быть недоступен в приватном режиме Telegram Desktop.
  }
}

function riskTone(level: TokenChecklistRiskLevel): "green" | "neutral" | "red" | "yellow" {
  if (level === "low") {
    return "green";
  }

  if (level === "high" || level === "extreme") {
    return "red";
  }

  if (level === "unknown") {
    return "neutral";
  }

  return "yellow";
}

function riskLabel(level: TokenChecklistRiskLevel) {
  if (level === "low") {
    return "Низкий риск";
  }

  if (level === "high") {
    return "Высокий риск";
  }

  if (level === "extreme") {
    return "Экстремальный риск";
  }

  if (level === "unknown") {
    return "Базовая оценка";
  }

  if (level === "medium-high") {
    return "Повышенная осторожность";
  }

  return "Средний риск";
}

function dataQualityLabel(value: DataQuality) {
  if (value === "full") {
    return "текущие данные";
  }

  if (value === "last-good") {
    return "сохранённый результат";
  }

  if (value === "partial") {
    return "доступные данные";
  }

  return "базовая оценка";
}

function unlockConfidenceLabel(value: TokenChecklistApiResponse["unlocks"]["confidence"]) {
  if (value === "high") {
    return "точные данные";
  }

  if (value === "medium") {
    return "календарная подсказка";
  }

  if (value === "low") {
    return "только supply";
  }

  return "данные по предложению";
}

function unlockConfidenceTone(
  value: TokenChecklistApiResponse["unlocks"]["confidence"],
): "green" | "neutral" | "red" | "yellow" {
  if (value === "high") {
    return "green";
  }

  if (value === "medium") {
    return "yellow";
  }

  if (value === "low") {
    return "neutral";
  }

  return "yellow";
}

function formatNumber(value: unknown) {
  const number = toFiniteNumber(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(number);
}

function formatRatioPercent(value: number | null) {
  return value === null ? "—" : formatPercent(value * 100);
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "только что";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function clampPercentValue(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.min(100, value));
}

function latestVestingPoint(data: TokenChecklistApiResponse) {
  const points = data.unlocks.vestingChart;

  return points.length > 0 ? points[points.length - 1] : null;
}

function tokenomicsRows(data: TokenChecklistApiResponse) {
  return data.unlocks.tokenomics?.distribution
    .filter((item) => item.percentage !== null)
    .slice(0, 6) ?? [];
}

function tokenomicsStats(data: TokenChecklistApiResponse) {
  const tokenomics = data.unlocks.tokenomics;

  return {
    circulatingSupplyPercent:
      data.unlocks.circulatingSupplyPercent ?? tokenomics?.circulatingSupplyPercent ?? null,
    hasBurn: tokenomics?.hasBurn ?? data.unlocks.tokenomistSummary?.hasBurn ?? null,
    hasBuyback: tokenomics?.hasBuyback ?? data.unlocks.tokenomistSummary?.hasBuyback ?? null,
    latestFundraisingRound:
      tokenomics?.latestFundraisingRound ??
      data.unlocks.tokenomistSummary?.latestFundraisingRound ??
      null,
    lockedPercentage:
      data.unlocks.lockedPercentage ??
      tokenomics?.lockedPercentage ??
      data.unlocks.lockedPercent ??
      null,
    maxSupply: data.unlocks.maxSupply ?? tokenomics?.maxSupply ?? null,
    releasedPercentage:
      data.unlocks.releasedPercentage ??
      tokenomics?.releasedPercentage ??
      data.unlocks.unlockedPercent ??
      null,
    tbdPercentage: data.unlocks.tbdPercentage ?? tokenomics?.tbdPercentage ?? null,
    totalLockedAmount:
      data.unlocks.totalLockedAmount ?? tokenomics?.totalLockedAmount ?? null,
    unlockedAmount: data.unlocks.unlockedAmount ?? tokenomics?.unlockedAmount ?? null,
  };
}

function hasTokenomicsData(data: TokenChecklistApiResponse) {
  const stats = tokenomicsStats(data);

  return (
    tokenomicsRows(data).length > 0 ||
    Object.values(stats).some((value) => value !== null && value !== undefined)
  );
}

function tokenomicsNarrative(data: TokenChecklistApiResponse) {
  const { lockedPercentage, tbdPercentage } = tokenomicsStats(data);

  if (lockedPercentage !== null && lockedPercentage > 50) {
    return "Доля заблокированного предложения высокая, поэтому токеномический риск заметно влияет на оценку.";
  }

  if (lockedPercentage !== null && lockedPercentage >= 35) {
    return "Доля заблокированного предложения заметная, поэтому токеномический риск учитывается в оценке.";
  }

  if (
    (lockedPercentage !== null && lockedPercentage >= 15) ||
    (tbdPercentage !== null && tbdPercentage > 20)
  ) {
    return "Часть предложения ещё находится вне свободного обращения. Это учитывается в оценке риска.";
  }

  return "Токеномический фон умеренный.";
}

function sourceLabel(source: string) {
  const labels: Record<string, string> = {
    chart: "график",
    details: "детали",
    market: "рынок",
    tickers: "пары",
    unlocks: "unlocks",
  };

  return labels[source] ?? source;
}

function MetricCard({
  label,
  tone = "default",
  value,
}: {
  label: string;
  tone?: "default" | "green" | "red";
  value: string;
}) {
  return (
    <div className="mini-card p-3">
      <p className="text-xs font-bold uppercase text-zinc-500">{label}</p>
      <p
        className={`mt-2 text-lg font-black ${
          tone === "green"
            ? "text-emerald-300"
            : tone === "red"
              ? "text-rose-300"
              : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function InsightCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="app-card p-4">
      <h2 className="text-lg font-black text-white">{title}</h2>
      <div className="mt-3 text-sm leading-6 text-zinc-400">{children}</div>
    </section>
  );
}

function FactorRow({ factor }: { factor: TokenChecklistFactor }) {
  return (
    <div className="mini-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-black text-white">{factor.label}</p>
        <StatusBadge tone={riskTone(factor.level)}>{riskLabel(factor.level)}</StatusBadge>
      </div>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{factor.text}</p>
    </div>
  );
}

function DataStatusCard({
  data,
  staleNotice,
}: {
  data: TokenChecklistApiResponse;
  staleNotice: string | null;
}) {
  if (data.dataQuality === "full" && !staleNotice) {
    return null;
  }

  return (
    <section className="rounded-[22px] border border-amber-200/15 bg-amber-300/[0.07] p-4 text-sm leading-6 text-amber-100/90">
      <h2 className="font-black text-amber-50">
        {data.dataQuality === "last-good"
          ? "Показан сохранённый результат"
          : data.dataQuality === "fallback"
          ? "Оценка построена по базовым данным"
          : "Оценка построена по доступным данным"}
      </h2>
      <p className="mt-2">
        {staleNotice ??
          (data.dataQuality === "last-good"
            ? "Используем последний сохранённый результат, чтобы не оставлять экран пустым."
            : data.dataQuality === "partial"
              ? "По полученным данным картина выглядит так; при обновлении результат уточнится."
              : "Оценка опирается на базовые рыночные параметры и сохранённый контекст.")}
      </p>
    </section>
  );
}

export function TokenChecklist({ tokens }: TokenChecklistProps) {
  const [query, setQuery] = useState("");
  const [selectedTicker, setSelectedTicker] = useState(tokens[0]?.ticker ?? "");
  const lastGoodByTokenRef = useRef<
    Record<string, TokenChecklistApiResponse | undefined>
  >({});
  const [state, setState] = useState<ChecklistState>({
    data: null,
    error: null,
    loading: false,
    staleNotice: null,
  });
  const [account, setAccount] = useState<AccountState>({
    authenticated: false,
    checksAvailable: null,
    checksUsed: 0,
    enaAccess: DEFAULT_ENA_ACCESS,
    firstName: null,
    isAdmin: false,
    loaded: false,
    paidAccess: {},
    reason: null,
    telegramUserId: null,
    username: null,
  });
  const [accessStatus, setAccessStatus] = useState<AccessStatus>("loading");
  const [paymentState, setPaymentState] = useState<PaymentState>({
    invoiceOpen: false,
    loadingPackage: null,
    message: null,
    tone: null,
  });
  const [showAccessDebug, setShowAccessDebug] = useState(false);
  const analysisAbortRef = useRef<AbortController | null>(null);

  const selectedToken =
    tokens.find((token) => token.ticker === selectedTicker) ?? tokens[0];
  const selectedFree = selectedToken ? isFreeChecklistSymbol(selectedToken.ticker) : false;
  const selectedPaidTest = selectedToken ? isPaidTestSymbol(selectedToken.ticker) : false;
  const selectedLocked = selectedToken ? !selectedFree && !selectedPaidTest : false;
  const selectedPaidAccess = selectedToken
    ? getPaidAccessForSymbol(account.paidAccess, selectedToken.ticker, account.isAdmin)
    : DEFAULT_ENA_ACCESS;
  const hasPaidAttempt =
    account.isAdmin ||
    account.checksAvailable === "unlimited" ||
    (typeof account.checksAvailable === "number" && account.checksAvailable > 0);
  const hasActiveEnaResult =
    selectedPaidTest && selectedPaidAccess.canRun && selectedPaidAccess.reason === "active-result";
  const paidTestCanRun = selectedPaidTest && (hasPaidAttempt || selectedPaidAccess.canRun);
  const freeSymbolsText = getFreeChecklistSymbols().join(" и ");

  useEffect(() => {
    if (!selectedToken) {
      return;
    }

    trackEvent("token_check_open", {
      eventTarget: selectedToken.ticker,
      metadata: {
        isFree: selectedFree,
        isPaid: selectedPaidTest,
        sector: selectedToken.sector,
      },
    });
  }, [selectedFree, selectedPaidTest, selectedToken]);

  const filteredTokens = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return tokens;
    }

    return tokens.filter((token) =>
      [token.title, token.ticker, token.description, token.sector]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, tokens]);

  useEffect(() => {
    if (!selectedToken) {
      return;
    }

    if (selectedLocked || (selectedPaidTest && !paidTestCanRun)) {
      analysisAbortRef.current?.abort();
      setState({
        data: null,
        error: null,
        loading: false,
        staleNotice: null,
      });
      return;
    }

    const cached = readCachedData(selectedToken.ticker);
    const memoryData = lastGoodByTokenRef.current[selectedToken.ticker];
    const initialData = memoryData ?? cached ?? null;

    if (cached && !memoryData) {
      lastGoodByTokenRef.current = {
        ...lastGoodByTokenRef.current,
        [selectedToken.ticker]: cached,
      };
    }

    setState({
      data: null,
      error: null,
      loading: false,
      staleNotice: initialData ? "Есть сохранённый результат для этого токена." : null,
    });
  }, [paidTestCanRun, selectedLocked, selectedPaidTest, selectedToken]);

  useEffect(() => {
    return () => {
      analysisAbortRef.current?.abort();
    };
  }, []);

  const loadChecklistAccess = useCallback(async () => {
    const initData = getTelegramInitData();

    if (!initData) {
      setAccessStatus("anonymous");
      setAccount({
        authenticated: false,
        checksAvailable: 0,
        checksUsed: 0,
        enaAccess: DEFAULT_ENA_ACCESS,
        firstName: null,
        isAdmin: false,
        loaded: true,
        paidAccess: {},
        reason: "telegram-init-data-missing",
        telegramUserId: null,
        username: null,
      });
      return;
    }

    setAccessStatus("loading");

    try {
      const response = await fetch("/api/me", {
        body: JSON.stringify({ initData }),
        cache: "no-store",
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as unknown;

      if (typeof payload !== "object" || payload === null) {
        throw new Error("bad-access-response");
      }

      const data = payload as {
        authenticated?: boolean;
        balance?: { checksAvailable?: number | "unlimited"; checksUsed?: number };
        checksAvailable?: number | "unlimited";
        checksUsed?: number;
        access?: Record<string, unknown>;
        error?: string;
        isAdmin?: boolean;
        ok?: boolean;
        reason?: string;
        telegramUserId?: number;
        username?: string | null;
        user?: {
          firstName?: string | null;
          first_name?: string | null;
          isAdmin?: boolean;
          telegramUserId?: number;
          username?: string | null;
        };
      };
      const isAdmin = data.isAdmin === true || data.user?.isAdmin === true;
      const paidAccess = normalizePaidAccessMap(data.access, isAdmin);
      const enaAccess = normalizeEnaAccess(data.access?.ENA, isAdmin);

      if (response.ok && data.ok === true && data.authenticated === true) {
        setAccessStatus("authenticated");
        setAccount({
          authenticated: true,
          checksAvailable: isAdmin
            ? "unlimited"
            : (data.balance?.checksAvailable ?? data.checksAvailable ?? 0),
          checksUsed: data.balance?.checksUsed ?? data.checksUsed ?? 0,
          enaAccess,
          firstName: data.user?.firstName ?? data.user?.first_name ?? null,
          isAdmin,
          loaded: true,
          paidAccess,
          reason: null,
          telegramUserId: data.user?.telegramUserId ?? data.telegramUserId ?? null,
          username: data.user?.username ?? data.username ?? null,
        });
        return;
      }

      setAccessStatus("error");
      setAccount({
        authenticated: false,
        checksAvailable: 0,
        checksUsed: 0,
        enaAccess,
        firstName: null,
        isAdmin,
        loaded: true,
        paidAccess,
        reason: data.reason ?? data.error ?? "auth-unavailable",
        telegramUserId: data.user?.telegramUserId ?? data.telegramUserId ?? null,
        username: data.user?.username ?? data.username ?? null,
      });
    } catch (error) {
      setAccessStatus("error");
      setAccount({
        authenticated: false,
        checksAvailable: 0,
        checksUsed: 0,
        enaAccess: DEFAULT_ENA_ACCESS,
        firstName: null,
        isAdmin: false,
        loaded: true,
        paidAccess: {},
        reason: error instanceof Error ? error.message : "auth-request-failed",
        telegramUserId: null,
        username: null,
      });
    }
  }, []);

  const refreshChecklistBalance = useCallback(
    async ({
      expectedPayment = false,
      silent = false,
    }: { expectedPayment?: boolean; silent?: boolean } = {}) => {
      const initData = getTelegramInitData();

      if (!initData) {
        if (!silent) {
          setPaymentState({
            loadingPackage: null,
            message: "Откройте Mini App через Telegram, чтобы обновить баланс.",
            tone: "yellow",
          });
        }
        await loadChecklistAccess();
        return null;
      }

      const previousChecks =
        typeof account.checksAvailable === "number" ? account.checksAvailable : null;

      try {
        const response = await fetch("/api/check-balance", {
          body: JSON.stringify({ initData }),
          cache: "no-store",
          headers: {
            "content-type": "application/json",
          },
          method: "POST",
        });
        const payload = (await response.json()) as unknown;

        if (typeof payload !== "object" || payload === null) {
          throw new Error("bad-balance-response");
        }

        const data = payload as {
          access?: Record<string, unknown>;
          authenticated?: boolean;
          checksAvailable?: number | "unlimited";
          checksUsed?: number;
          isAdmin?: boolean;
          ok?: boolean;
          reason?: string;
        };

        if (!response.ok || data.ok !== true || data.authenticated !== true) {
          throw new Error(data.reason ?? "balance-unavailable");
        }

        const isAdmin = data.isAdmin === true;
        const nextChecks = isAdmin ? "unlimited" : (data.checksAvailable ?? 0);
        const paidAccess = normalizePaidAccessMap(data.access, isAdmin);
        const enaAccess = normalizeEnaAccess(data.access?.ENA, isAdmin);
        const currentPaidAccess = selectedToken
          ? getPaidAccessForSymbol(paidAccess, selectedToken.ticker, isAdmin)
          : enaAccess;

        setAccessStatus("authenticated");
        setAccount((previous) => ({
          ...previous,
          authenticated: true,
          checksAvailable: nextChecks,
          checksUsed: data.checksUsed ?? previous.checksUsed,
          enaAccess,
          isAdmin,
          loaded: true,
          paidAccess,
          reason: null,
        }));

        const nextNumber = typeof nextChecks === "number" ? nextChecks : null;
        const paymentArrived =
          expectedPayment &&
          (nextChecks === "unlimited" ||
            currentPaidAccess.canRun ||
            (previousChecks !== null && nextNumber !== null && nextNumber > previousChecks));

        if (!silent) {
          setPaymentState({
            loadingPackage: null,
            message: paymentArrived
              ? currentPaidAccess.reason === "active-result"
                ? "Результат уже открыт. Можно посмотреть его без повторной оплаты."
                : "Проверка оплачена. Нажмите «Проверить», чтобы открыть результат."
              : expectedPayment
                ? "Платёж обрабатывается, обновите баланс через несколько секунд."
                : "Баланс обновлён.",
            tone: paymentArrived || !expectedPayment ? "green" : "yellow",
          });
        }

        return currentPaidAccess;
      } catch (error) {
        if (!silent) {
          setPaymentState({
            loadingPackage: null,
            message:
              error instanceof Error
                ? `Не удалось обновить баланс: ${error.message}`
                : "Не удалось обновить баланс.",
            tone: "red",
          });
        }

        return null;
      }
    },
    [account.checksAvailable, loadChecklistAccess, selectedToken],
  );

  const refreshBalanceWithRetry = useCallback(
    async ({ expectedPayment = false }: { expectedPayment?: boolean } = {}) => {
      const maxAttempts = 5;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const tokenAccess = await refreshChecklistBalance({
          expectedPayment,
          silent: attempt < maxAttempts,
        });

        if (tokenAccess?.canRun) {
          setPaymentState({
            loadingPackage: null,
            message:
              tokenAccess.reason === "active-result"
                ? "Результат уже открыт. Можно посмотреть его без повторной оплаты."
                : "Проверка оплачена. Нажмите «Проверить», чтобы открыть результат.",
            tone: "green",
          });
          return tokenAccess;
        }

        if (attempt < maxAttempts) {
          await new Promise((resolve) => window.setTimeout(resolve, 1500));
        }
      }

      setPaymentState({
        loadingPackage: null,
        message: "Платёж обрабатывается. Нажмите «Обновить баланс» через несколько секунд.",
        tone: "yellow",
      });

      return null;
    },
    [refreshChecklistBalance],
  );

  const startStarsPurchase = useCallback(
    async (packageId: PaymentPackageId) => {
      if (account.isAdmin) {
      setPaymentState({
        loadingPackage: null,
        message: "Admin-доступ активен, оформлять проверки не нужно.",
        tone: "green",
      });
        return;
      }

      const initData = getTelegramInitData();

      if (!initData) {
        setPaymentState({
          loadingPackage: null,
          message: "Откройте Mini App через Telegram, чтобы купить проверки.",
          tone: "yellow",
        });
        await loadChecklistAccess();
        return;
      }

      setPaymentState({
        invoiceOpen: false,
        loadingPackage: packageId,
        message: null,
        tone: null,
      });
      trackEvent("payment_started", {
        eventTarget: packageId,
        metadata: {
          token: selectedToken?.ticker ?? null,
        },
      });

      try {
        const response = await fetch("/api/stars/create-invoice", {
          body: JSON.stringify({ initData, packageId }),
          cache: "no-store",
          headers: {
            "content-type": "application/json",
          },
          method: "POST",
        });
        const payload = (await response.json()) as unknown;

        if (typeof payload !== "object" || payload === null) {
          throw new Error("bad-invoice-response");
        }

        const data = payload as {
          error?: string;
          invoiceLink?: string;
          message?: string;
          ok?: boolean;
        };

        if (!response.ok || data.ok !== true || !data.invoiceLink) {
          throw new Error(data.message ?? data.error ?? "invoice-create-failed");
        }

        setPaymentState({
          invoiceOpen: true,
          loadingPackage: null,
          message: "Счёт открыт в Telegram. После оплаты обновите баланс.",
          tone: "yellow",
        });

        openTelegramInvoice(data.invoiceLink, (status) => {
          if (status === "paid") {
            trackEvent("payment_success", {
              eventTarget: packageId,
              metadata: {
                token: selectedToken?.ticker ?? null,
              },
            });
            setPaymentState({
              invoiceOpen: false,
              loadingPackage: null,
              message: "Платёж получен, обновляем баланс...",
              tone: "yellow",
            });
            void refreshBalanceWithRetry({ expectedPayment: true });
            return;
          }

          if (status === "cancelled" || status === "failed") {
            setPaymentState({
              invoiceOpen: false,
              loadingPackage: null,
              message: "Оплата не завершена.",
              tone: "yellow",
            });
          }
        });
      } catch (error) {
        trackEvent("error", {
          eventTarget: "stars-create-invoice",
          metadata: {
            message: error instanceof Error ? error.message : "invoice-open-failed",
            packageId,
            token: selectedToken?.ticker ?? null,
          },
        });
        setPaymentState({
          invoiceOpen: false,
          loadingPackage: null,
          message:
            error instanceof Error
              ? `Не удалось открыть оплату: ${error.message}`
              : "Не удалось открыть оплату.",
          tone: "red",
        });
      }
    },
    [account.isAdmin, loadChecklistAccess, refreshBalanceWithRetry, selectedToken],
  );

  useEffect(() => {
    let cancelled = false;
    let started = false;

    setAccessStatus("loading");

    const fallbackTimer = window.setTimeout(() => {
      if (cancelled || started) {
        return;
      }

      void loadChecklistAccess();
    }, 2300);
    const stopWatching = watchTelegramInitData(() => {
      if (cancelled || started) {
        return;
      }

      started = true;
      window.clearTimeout(fallbackTimer);
      void loadChecklistAccess();
    });

    return () => {
      cancelled = true;
      window.clearTimeout(fallbackTimer);
      stopWatching();
    };
  }, [loadChecklistAccess]);

  const cachedResult = selectedToken
    ? selectedLocked || (selectedPaidTest && !paidTestCanRun)
      ? null
      : lastGoodByTokenRef.current[selectedToken.ticker] ?? null
    : null;
  const analysisAccess = {
    analyzeMode: selectedPaidTest ? ("paid-ready" as const) : ("free" as const),
    canRunAnalysis: selectedFree || paidTestCanRun,
    paymentRequired: selectedPaidTest && !paidTestCanRun,
  };

  async function runTokenAnalysis({
    refresh = false,
    useLastGood = false,
  }: {
    refresh?: boolean;
    useLastGood?: boolean;
  } = {}) {
    if (!selectedToken || !analysisAccess.canRunAnalysis) {
      return;
    }

    const cached =
      lastGoodByTokenRef.current[selectedToken.ticker] ??
      readCachedData(selectedToken.ticker);

    if (useLastGood && cached) {
      setState({
        data: cached,
        error: null,
        loading: false,
        staleNotice: "Показан последний сохранённый результат.",
      });

      return;
    }

    analysisAbortRef.current?.abort();
    const controller = new AbortController();
    analysisAbortRef.current = controller;

    setState((previous) => ({
      ...previous,
      error: null,
      loading: true,
      staleNotice: previous.data
        ? "Проверяем свежие данные, пока оставляю последний результат на экране."
              : null,
    }));
    trackEvent("token_check_submit", {
      eventTarget: selectedToken.ticker,
      metadata: {
        refresh,
        useLastGood,
      },
    });

    try {
      const params = new URLSearchParams({
        debug: "0",
        symbol: selectedToken.ticker,
      });

      if (refresh) {
        params.set("refresh", "1");
      }

      // В будущем здесь можно подключить Telegram Stars перед запуском runTokenAnalysis.
      const response = await fetch("/api/token-checklist", {
        body: JSON.stringify({
          initData: getTelegramInitData(),
          refresh,
          symbol: selectedToken.ticker,
        }),
        cache: "no-store",
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
        signal: controller.signal,
      });
      const data = (await response.json()) as unknown;

      if (!response.ok || !isChecklistResponse(data) || !data.ok) {
        const message =
          account.isAdmin && typeof data === "object" && data !== null && "paymentRequired" in data
            ? "Admin access не распознан. Проверьте /api/me и ADMIN_TELEGRAM_IDS."
            : typeof data === "object" && data !== null && "message" in data
              ? String((data as { message?: unknown }).message)
              : "Не удалось проверить токен";

        throw new Error(message);
      }

      const previous =
        lastGoodByTokenRef.current[selectedToken.ticker] ??
        readCachedData(selectedToken.ticker);
      const shouldKeepPrevious =
        previous &&
        ((qualityRank(previous.dataQuality) > qualityRank(data.dataQuality) &&
          unlockQualityRank(previous.unlocks.confidence) >=
            unlockQualityRank(data.unlocks.confidence)) ||
          (hasPriceAndPumpData(previous) && !hasPriceAndPumpData(data)));
      const nextData = shouldKeepPrevious ? previous : data;

      if (nextData.dataQuality !== "fallback") {
        writeCachedData(nextData);
      }

      lastGoodByTokenRef.current = {
        ...lastGoodByTokenRef.current,
        [selectedToken.ticker]: nextData,
      };
      const responseAccess = data.access;
      const responseActiveResult =
        responseAccess?.accessType === "active_result" ||
        responseAccess?.activeResult === true ||
        data.activeResult === true;
      const responsePortfolioPro = responseAccess?.accessType === "portfolio_pro";
      const responseActiveResultUntil =
        responseAccess?.activeResultUntil ?? data.activeResultUntil ?? null;

      if (data.balance) {
        setAccount((previous) => ({
          ...previous,
          checksAvailable: data.balance?.checksAvailable ?? previous.checksAvailable,
          checksUsed: data.balance?.checksUsed ?? previous.checksUsed,
          enaAccess: selectedPaidTest
            ? responseAccess?.isAdmin
              ? {
                  activeResultUntil: null,
                  canRun: true,
                  lastCheckAt: null,
                  reason: "admin",
                }
              : responsePortfolioPro
                ? {
                    activeResultUntil: responseActiveResultUntil,
                    canRun: true,
                    lastCheckAt: new Date().toISOString(),
                    reason: "portfolio-pro",
                  }
              : responseActiveResult
                ? {
                    activeResultUntil: responseActiveResultUntil,
                    canRun: true,
                    lastCheckAt: new Date().toISOString(),
                    reason: "active-result",
                  }
                : previous.enaAccess
            : previous.enaAccess,
          paidAccess: selectedPaidTest
            ? {
                ...previous.paidAccess,
                [selectedToken.ticker]: responseAccess?.isAdmin
                  ? {
                      activeResultUntil: null,
                      canRun: true,
                      lastCheckAt: null,
                      reason: "admin",
                    }
                  : responsePortfolioPro
                    ? {
                        activeResultUntil: responseActiveResultUntil,
                        canRun: true,
                        lastCheckAt: new Date().toISOString(),
                        reason: "portfolio-pro",
                      }
                  : responseActiveResult
                    ? {
                        activeResultUntil: responseActiveResultUntil,
                        canRun: true,
                        lastCheckAt: new Date().toISOString(),
                        reason: "active-result",
                      }
                    : previous.paidAccess[selectedToken.ticker] ?? DEFAULT_ENA_ACCESS,
              }
            : previous.paidAccess,
          isAdmin: data.access?.isAdmin ?? previous.isAdmin,
        }));
      }

      setState({
        data: nextData,
        error: null,
        loading: false,
        staleNotice: shouldKeepPrevious
          ? "Новый ответ слабее: показываю сохранённый результат по последним полученным данным."
          : data.dataQuality === "last-good"
            ? "Показан сохранённый результат по последним полученным данным."
            : data.dataQuality === "fallback"
              ? "Оценка построена по доступным базовым данным."
              : data.dataQuality === "partial"
                ? "Оценка построена по доступным рыночным данным."
                : null,
      });
      trackEvent("token_check_result", {
        eventTarget: selectedToken.ticker,
        metadata: {
          accessType: data.access?.accessType ?? null,
          dataQuality: nextData.dataQuality,
          score: nextData.verdict.score,
          token: selectedToken.ticker,
          verdict: nextData.verdict.title,
          riskLevel: nextData.verdict.riskLevel,
        },
      });

      if (selectedPaidTest) {
        setPaymentState({
          loadingPackage: null,
          message: responseActiveResult
            ? `Результат ${selectedToken.ticker} открыт на 24 часа.`
            : `Результат ${selectedToken.ticker} открыт.`,
          tone: "green",
        });
        void refreshChecklistBalance({ silent: true });
      }
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      trackEvent("error", {
        eventTarget: selectedToken.ticker,
        metadata: {
          scope: "token-checklist",
          message: error instanceof Error ? error.message : "token-check-failed",
        },
      });

      const fallbackData =
        lastGoodByTokenRef.current[selectedToken.ticker] ??
        readCachedData(selectedToken.ticker);

      setState({
        data: fallbackData ?? null,
        error:
          error instanceof Error
            ? error.message
            : "Не удалось обновить оценку",
        loading: false,
        staleNotice: fallbackData
          ? "Показан сохранённый результат по последним полученным данным."
          : null,
      });
    }
  }

  if (!selectedToken) {
    return null;
  }

  const data = state.data;
  const change24h = data?.market.change24h;
  const positive24h = typeof change24h === "number" && change24h >= 0;
  const accessRetryVisible =
    accessStatus === "anonymous" || accessStatus === "error";
  const accessButtonDisabled = accessStatus === "loading";
  const checksAvailableLabel =
    account.checksAvailable === "unlimited" ? "без ограничений" : String(account.checksAvailable ?? 0);
  useEffect(() => {
    setShowAccessDebug(new URLSearchParams(window.location.search).get("debug") === "1");
  }, []);

  return (
    <div className="space-y-5">
      <section className="app-card p-4">
        <p className="text-xs font-bold uppercase text-emerald-100/80">
          Как читать оценку
        </p>
        <h2 className="mt-1 text-lg font-black text-white">
          Шкала 0-100
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Оценка показывает комфортность входа по доступным рыночным, техническим и
          токеномическим данным.
        </p>
        <div className="mt-3 grid gap-2 text-xs leading-5 text-zinc-300">
          <div className="mini-card p-3">0 - лучше не лезть</div>
          <div className="mini-card p-3">50 - спорная зона, нужна осторожность</div>
          <div className="mini-card p-3">
            100 - самая комфортная зона по текущим данным
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-zinc-500">
          Это не торговая рекомендация, а оценка риска входа по текущим данным.
        </p>
      </section>

      <div className="space-y-3">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-zinc-300">
            Поиск токена
          </span>
          <input
            className="search-input"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Например: BTC, LINK, AVAX"
            type="search"
            value={query}
          />
        </label>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {filteredTokens.map((token) => {
            const active = token.ticker === selectedToken.ticker;

            return (
              <button
                className={`shrink-0 rounded-full border px-3 py-2 text-xs font-black transition ${
                  active
                    ? "border-emerald-300/35 bg-emerald-300/15 text-emerald-100"
                    : "border-white/10 bg-white/[0.035] text-zinc-400 hover:border-emerald-300/20 hover:text-zinc-100"
                }`}
                key={token.ticker}
                onClick={() => setSelectedTicker(token.ticker)}
                type="button"
              >
                {token.ticker}
              </button>
            );
          })}
        </div>

        {filteredTokens.length === 0 ? (
          <div className="app-card p-4 text-sm leading-6 text-zinc-400">
            Ничего не найдено
          </div>
        ) : null}
      </div>

      <section className="app-card p-4">
        <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-zinc-500">Ваш доступ</p>
            {accessStatus === "loading" || accessStatus === "idle" ? (
              <p className="mt-1 text-sm font-bold text-emerald-100">Проверяем доступ…</p>
            ) : account.isAdmin ? (
              <>
                <p className="mt-1 text-sm font-black text-emerald-200">
                  Admin-доступ активен
                </p>
                <p className="mt-1 text-xs leading-5 text-zinc-400">
                  Проверки: без ограничений. Все токены чеклиста доступны без Stars и без списания попыток.
                </p>
              </>
            ) : account.authenticated && selectedPaidAccess.reason === "active-result" ? (
              <>
                <p className="mt-1 text-sm font-black text-emerald-200">
                  Результат {selectedToken.ticker} уже открыт
                </p>
                <p className="mt-1 text-xs leading-5 text-zinc-400">
                  Можно посмотреть его без повторной оплаты
                  {selectedPaidAccess.activeResultUntil
                    ? ` до ${formatUpdatedAt(selectedPaidAccess.activeResultUntil)}.`
                    : "."}
                </p>
              </>
            ) : account.authenticated && selectedPaidAccess.reason === "portfolio-pro" ? (
              <>
                <p className="mt-1 text-sm font-black text-emerald-200">
                  Portfolio Pro активен
                </p>
                <p className="mt-1 text-xs leading-5 text-zinc-400">
                  Чек-лист доступен без списания попыток
                  {selectedPaidAccess.activeResultUntil
                    ? ` до ${formatUpdatedAt(selectedPaidAccess.activeResultUntil)}.`
                    : "."}
                </p>
              </>
            ) : account.authenticated ? (
              <>
                <p className="mt-1 text-sm font-black text-white">
                  Доступно проверок: {checksAvailableLabel}
                </p>
                <p className="mt-1 text-xs leading-5 text-zinc-400">
                  BTC и ETH бесплатны. Для остальных токенов нужна 1 попытка.
                </p>
              </>
            ) : accessStatus === "anonymous" ? (
              <>
                <p className="mt-1 text-sm font-black text-white">Доступ не определён</p>
                <p className="mt-1 text-xs leading-5 text-zinc-400">
                  Для расширенной проверки откройте Mini App через Telegram.
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm font-black text-white">
                  Не удалось определить доступ
                </p>
                <p className="mt-1 text-xs leading-5 text-zinc-400">
                  Нажмите кнопку ниже, чтобы повторить проверку.
                </p>
              </>
            )}
          </div>

          {accessRetryVisible || (account.authenticated && !account.isAdmin) ? (
            <div className="flex flex-col gap-2 min-[380px]:flex-row">
              {accessRetryVisible ? (
                <button
                  className="secondary-button justify-center"
                  disabled={accessButtonDisabled}
                  onClick={() => void loadChecklistAccess()}
                  type="button"
                >
                  {accessButtonDisabled ? "Проверяем…" : "Проверить доступ"}
                </button>
              ) : null}
              {account.authenticated && !account.isAdmin ? (
                <button
                  className="secondary-button justify-center"
                  onClick={() => void refreshChecklistBalance()}
                  type="button"
                >
                  Обновить баланс
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {paymentState.message ? (
          <div
            className={`mt-3 rounded-2xl border px-3 py-2 text-xs leading-5 ${
              paymentState.tone === "green"
                ? "border-emerald-200/15 bg-emerald-300/[0.07] text-emerald-100/85"
                : paymentState.tone === "red"
                  ? "border-rose-200/15 bg-rose-300/[0.07] text-rose-100/85"
                  : "border-amber-200/15 bg-amber-300/[0.07] text-amber-100/85"
            }`}
          >
            {paymentState.message}
          </div>
        ) : null}

        {showAccessDebug ? (
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] leading-5 text-zinc-400">
            accessStatus: {accessStatus}; authenticated: {String(account.authenticated)};
            isAdmin: {String(account.isAdmin)}; telegramUserId:{" "}
            {account.telegramUserId ?? "none"}; username: {account.username ?? "none"};
            checksAvailable: {checksAvailableLabel}
          </div>
        ) : null}
      </section>

      <section className="premium-card p-4">
        <div className="relative z-10 flex items-start gap-3">
          <TokenLogo
            logo={selectedToken.logo}
            ticker={selectedToken.ticker}
            title={selectedToken.title}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-black text-white">
                {selectedToken.ticker}
              </h2>
              <span className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-xs font-black text-zinc-300">
                {selectedToken.title}
              </span>
              <StatusBadge tone="green">{selectedToken.sector}</StatusBadge>
              {selectedFree ? <StatusBadge tone="green">Бесплатно</StatusBadge> : null}
              {selectedPaidTest && account.isAdmin ? (
                <StatusBadge tone="green">Admin-доступ</StatusBadge>
              ) : null}
              {selectedPaidTest && !account.isAdmin ? (
                <StatusBadge tone={paidTestCanRun ? "green" : "yellow"}>
                  {hasActiveEnaResult
                    ? "Результат открыт"
                    : selectedPaidAccess.reason === "portfolio-pro"
                    ? "Portfolio Pro"
                    : hasPaidAttempt
                    ? `Доступно проверок: ${account.checksAvailable}`
                    : "Платный доступ"}
                </StatusBadge>
              ) : null}
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {selectedToken.description}
            </p>
            <p className="mt-3 rounded-2xl border border-emerald-200/12 bg-emerald-300/[0.055] px-3 py-2 text-xs leading-5 text-emerald-100/85">
              Это обучающая проверка, не финансовая рекомендация.
            </p>
          </div>
        </div>
      </section>

      <section className="app-card p-4">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-zinc-500">
              Проверка риска
            </p>
            <h2 className="mt-1 text-lg font-black text-white">
              Проверка запускается по кнопке
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Выбери токен и нажми кнопку: приложение проверит рынок, график,
              объём и ликвидность по актуальным данным.
            </p>
          </div>

          {selectedPaidTest && account.isAdmin ? (
            <div className="rounded-2xl border border-emerald-200/15 bg-emerald-300/[0.07] px-3 py-2 text-xs leading-5 text-emerald-100/85">
              {selectedToken.ticker} доступен по admin-доступу. Проверка не списывает попытки.
            </div>
          ) : null}

          {selectedPaidTest && hasActiveEnaResult ? (
            <div className="rounded-2xl border border-emerald-200/15 bg-emerald-300/[0.07] px-3 py-2 text-xs leading-5 text-emerald-100/85">
              Результат {selectedToken.ticker} уже открыт. Можно посмотреть его без повторной оплаты.
            </div>
          ) : null}

          {selectedLocked || analysisAccess.paymentRequired ? (
            <div className="rounded-[22px] border border-amber-200/15 bg-amber-300/[0.07] p-4">
              {selectedPaidTest ? (
                <>
                  <div className="mb-3 rounded-2xl border border-amber-100/15 bg-black/10 px-3 py-2 text-xs leading-5 text-amber-100/85">
                    Для расширенной проверки нужна 1 попытка. Покупка проходит через Telegram Stars:
                    1 проверка — {CHECKLIST_PRICING_PREVIEW.singleCheckStars} ⭐ / 5 проверок —{" "}
                    {CHECKLIST_PRICING_PREVIEW.fiveChecksStars} ⭐.
                  </div>
                  <h3 className="text-base font-black text-amber-50">
                    Для проверки {selectedToken.ticker} нужна 1 попытка
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-amber-100/85">
                    После оплаты webhook начислит попытки на сервере. Если баланс не обновился
                    сразу, нажмите «Обновить баланс» через несколько секунд.
                  </p>
                  <div className="mt-3 grid gap-2 min-[420px]:grid-cols-2">
                    <button
                      className="primary-button justify-center"
                      disabled={paymentState.loadingPackage !== null || paymentState.invoiceOpen === true}
                      onClick={() => void startStarsPurchase("single_check")}
                      type="button"
                    >
                      {paymentState.invoiceOpen
                        ? "Оплата открыта..."
                        : paymentState.loadingPackage === "single_check"
                        ? "Открываем оплату..."
                        : `Купить 1 проверку — ${CHECKLIST_PRICING_PREVIEW.singleCheckStars} ⭐`}
                    </button>
                    <button
                      className="secondary-button justify-center"
                      disabled={paymentState.loadingPackage !== null || paymentState.invoiceOpen === true}
                      onClick={() => void startStarsPurchase("five_checks")}
                      type="button"
                    >
                      {paymentState.invoiceOpen
                        ? "Оплата открыта..."
                        : paymentState.loadingPackage === "five_checks"
                        ? "Открываем оплату..."
                        : `Купить 5 проверок — ${CHECKLIST_PRICING_PREVIEW.fiveChecksStars} ⭐`}
                    </button>
                  </div>
                  <div className="mt-2 flex flex-col gap-2 min-[380px]:flex-row">
                    <button
                      className="secondary-button justify-center"
                      onClick={() => void refreshChecklistBalance()}
                      type="button"
                    >
                      Обновить баланс
                    </button>
                    {accessStatus !== "authenticated" ? (
                      <button
                        className="secondary-button justify-center"
                        disabled={accessButtonDisabled}
                        onClick={() => void loadChecklistAccess()}
                        type="button"
                      >
                        {accessButtonDisabled ? "Проверяем…" : "Проверить доступ"}
                      </button>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-base font-black text-amber-50">
                    Токен пока не добавлен в чеклист
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-amber-100/85">
                    Сейчас доступны {freeSymbolsText} и платные токены из списка чеклиста.
                  </p>
                  <p className="mt-2 text-xs leading-5 text-amber-100/65">
                    Код анализа сохранён, функция временно ограничена перед запуском.
                  </p>
                  <button className="secondary-button mt-3 justify-center" disabled type="button">
                    Скоро откроем
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="grid gap-2 min-[380px]:grid-cols-2">
              {cachedResult && !data ? (
                <button
                  className="secondary-button justify-center"
                  disabled={state.loading}
                  onClick={() => void runTokenAnalysis({ useLastGood: true })}
                  type="button"
                >
                  Показать последний результат
                </button>
              ) : null}

              <button
                className="primary-button justify-center"
                disabled={state.loading || !analysisAccess.canRunAnalysis}
                onClick={() => void runTokenAnalysis({ refresh: Boolean(data || cachedResult) })}
                type="button"
              >
                {state.loading
                  ? selectedPaidTest
                    ? `Проверяем ${selectedToken.ticker}...`
                    : "Проверяем рынок, график, объём и ликвидность..."
                  : data || cachedResult
                    ? "Обновить проверку"
                    : hasActiveEnaResult
                      ? `Открыть результат ${selectedToken.ticker}`
                    : selectedPaidTest
                      ? `Проверить ${selectedToken.ticker}`
                      : "Проверить токен"}
              </button>
            </div>
          )}
        </div>
      </section>

      {state.loading && !data ? (
        <section className="premium-card p-5">
          <div className="relative z-10 animate-pulse space-y-4">
            <div className="h-6 w-36 rounded-full bg-white/10" />
            <div className="h-12 rounded-2xl bg-white/10" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-20 rounded-2xl bg-white/10" />
              <div className="h-20 rounded-2xl bg-white/10" />
            </div>
          </div>
        </section>
      ) : null}

      {state.error && !data ? (
        <section className="app-card p-4">
          <h2 className="text-lg font-black text-white">
            Не удалось обновить оценку
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            {state.error}. Попробуй открыть раздел позже: приложение не ломается,
            а сохранённый результат появится здесь, когда он есть.
          </p>
        </section>
      ) : null}

      {data ? (
        <>
          <DataStatusCard data={data} staleNotice={state.staleNotice} />

          {state.loading ? (
            <div className="rounded-[18px] border border-emerald-200/12 bg-emerald-300/[0.055] px-4 py-3 text-xs font-bold text-emerald-100/85">
              Данные обновляются…
            </div>
          ) : null}

          <section className="premium-card p-4">
            <div className="relative z-10 flex items-start gap-3">
              <TokenLogo
                logo={selectedToken.logo}
                remoteLogo={data.token.image}
                ticker={data.token.symbol}
                title={data.token.name}
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-black text-white">
                    {data.token.symbol}
                  </h2>
                  <span className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-xs font-black text-zinc-300">
                    {data.token.name}
                  </span>
                  <StatusBadge tone={riskTone(data.verdict.riskLevel)}>
                    {riskLabel(data.verdict.riskLevel)}
                  </StatusBadge>
                  <StatusBadge tone="neutral">
                    {dataQualityLabel(data.dataQuality)}
                  </StatusBadge>
                </div>

                <div className="mt-4 grid gap-3 min-[380px]:grid-cols-[auto_1fr]">
                  <div className="grid size-20 place-items-center rounded-[24px] border border-emerald-200/15 bg-emerald-300/[0.08] text-3xl font-black text-emerald-200 shadow-inner shadow-white/5">
                    {data.verdict.score}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-zinc-500">
                      Оценка входа: {data.verdict.score}/100
                    </p>
                    <h3 className="mt-1 text-xl font-black leading-tight text-white">
                      {data.verdict.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      {data.verdict.text}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-zinc-500">
                      0 - лучше не лезть, 100 - самая комфортная зона по текущим данным.
                    </p>
                  </div>
                </div>

                {data.verdict.badges.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {data.verdict.badges.map((badge) => (
                      <span
                        className="rounded-full border border-amber-200/15 bg-amber-300/[0.07] px-2.5 py-1 text-xs font-bold text-amber-100/85"
                        key={badge}
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="app-card p-4">
            <h2 className="text-lg font-black text-white">Цена и памп</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MetricCard label="Цена" value={formatUsdPrice(data.market.price)} />
              <MetricCard
                label="24ч"
                tone={positive24h ? "green" : "red"}
                value={formatPercent(change24h)}
              />
              <MetricCard label="7д" value={formatPercent(data.market.change7d)} />
              <MetricCard label="30д" value={formatPercent(data.market.change30d)} />
              <MetricCard label="Market Cap" value={formatMarketCap(data.market.marketCap)} />
              <MetricCard label="Volume" value={formatVolume(data.market.volume24h)} />
            </div>
            {data.sourceStatus.market !== "ok" ? (
              <p className="mt-3 text-xs leading-5 text-zinc-500">
                Цена и памп оценены по доступным рыночным данным.
              </p>
            ) : null}
          </section>

          <div className="grid gap-4">
            <InsightCard title="Чем занимается проект">
              <p>{data.project.summaryRu}</p>
            </InsightCard>

            <InsightCard title="Сектор">
              <p className="font-bold text-emerald-100">{data.project.sectorRu}</p>
              <p className="mt-2">{data.project.sectorRiskRu}</p>
            </InsightCard>

            <InsightCard title="Техническая зона">
              <p className="font-bold text-white">
                {data.technical.position === "unknown"
                  ? "Техническая картина сейчас читается осторожно"
                  : data.technical.position === "hot"
                    ? "Зона выглядит горячей"
                    : data.technical.position === "cold"
                      ? "Зона охлаждённая, но это не готовый вывод"
                      : "Зона ближе к нейтральной"}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <MetricCard label="RSI 14" value={formatNumber(data.technical.rsi14)} />
                <MetricCard label="SMA 20" value={formatUsdPrice(data.technical.sma20)} />
                <MetricCard label="SMA 50" value={formatUsdPrice(data.technical.sma50)} />
                <MetricCard
                  label="Памп-риск"
                  value={data.technical.pumpRiskLabel ?? riskLabel(data.technical.pumpRisk)}
                />
              </div>
            </InsightCard>

            <InsightCard title="Объём торгов">
              <p className="font-bold text-white">{data.volume.label}</p>
              <p className="mt-2">
                Volume / Market Cap: {formatRatioPercent(data.volume.volumeToMarketCap)}
              </p>
              <p className="mt-2 text-xs text-zinc-500">{data.volume.explanation}</p>
            </InsightCard>

            <InsightCard title="Ликвидность">
              <p className="font-bold text-white">{data.liquidity.label}</p>
              <p className="mt-2">Score: {formatNumber(data.liquidity.score)}</p>
              <p className="mt-2 text-xs text-zinc-500">
                {data.liquidity.explanation}
              </p>
            </InsightCard>

            {hasTokenomicsData(data) ? (
              <InsightCard title="Токеномика и предложение">
                {(() => {
                  const stats = tokenomicsStats(data);

                  return (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        {data.unlocks.tokenomics?.provider ? (
                          <StatusBadge tone="neutral">
                            {data.unlocks.tokenomics.provider}
                          </StatusBadge>
                        ) : null}
                        {stats.latestFundraisingRound ? (
                          <StatusBadge tone="yellow">
                            {stats.latestFundraisingRound}
                          </StatusBadge>
                        ) : null}
                        {stats.hasBurn ? <StatusBadge tone="green">burn</StatusBadge> : null}
                        {stats.hasBuyback ? (
                          <StatusBadge tone="green">buyback</StatusBadge>
                        ) : null}
                      </div>
                      <p className="mt-3">{tokenomicsNarrative(data)}</p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <MetricCard
                          label="released"
                          value={formatPercent(stats.releasedPercentage)}
                        />
                        <MetricCard label="locked" value={formatPercent(stats.lockedPercentage)} />
                        <MetricCard label="TBD" value={formatPercent(stats.tbdPercentage)} />
                        <MetricCard
                          label="circ. supply"
                          value={formatPercent(stats.circulatingSupplyPercent)}
                        />
                        <MetricCard
                          label="locked amount"
                          value={formatCompactNumber(stats.totalLockedAmount)}
                        />
                        <MetricCard
                          label="unlocked amount"
                          value={formatCompactNumber(stats.unlockedAmount)}
                        />
                      </div>
                      {stats.maxSupply !== null ? (
                        <p className="mt-3 text-xs leading-5 text-zinc-500">
                          Max supply: {formatCompactNumber(stats.maxSupply)}
                        </p>
                      ) : null}
                      {tokenomicsRows(data).length > 0 ? (
                        <div className="mt-3 grid gap-2">
                          {tokenomicsRows(data).map((item) => (
                            <div
                              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs"
                              key={`${item.name}-${item.percentage}`}
                            >
                              <span className="font-bold text-zinc-200">{item.name}</span>
                              <span className="text-emerald-100">
                                {formatPercent(item.percentage)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </>
                  );
                })()}
              </InsightCard>
            ) : null}

            {(data.analysisSignals?.length ?? 0) > 0 ? (
              <InsightCard title="Сигналы анализа">
                <div className="grid gap-2">
                  {data.analysisSignals?.map((signal) => (
                    <FactorRow factor={signal} key={signal.key} />
                  ))}
                </div>
              </InsightCard>
            ) : null}
          </div>

          <section className="rounded-[24px] border border-emerald-200/15 bg-emerald-300/[0.075] p-4">
            <p className="text-xs font-bold uppercase text-emerald-100/80">
              Вывод простыми словами
            </p>
            <p className="mt-3 text-sm leading-6 text-zinc-200">
              {data.verdict.text}
            </p>
            <p className="mt-3 text-xs leading-5 text-zinc-500">
              Обновлено: {formatUpdatedAt(data.updatedAt)}. Это обучающий
              инструмент, а не финансовая рекомендация.
            </p>
          </section>

          {data.analysisSignals?.length ? null : (
            <section className="grid gap-2">
              {data.verdict.factors.map((factor) => (
                <FactorRow factor={factor} key={`${factor.label}-${factor.text}`} />
              ))}
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}
