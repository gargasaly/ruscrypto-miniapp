export type CoinGeckoApiPlan = "demo" | "pro" | "not-set";

const COINGECKO_PUBLIC_ROOT = "https://api.coingecko.com/api/v3";
const COINGECKO_PRO_ROOT = "https://pro-api.coingecko.com/api/v3";

export function getCoinGeckoApiPlan(): CoinGeckoApiPlan {
  const rawPlan = process.env.COINGECKO_API_PLAN?.trim().toLowerCase();

  if (rawPlan === "pro") {
    return "pro";
  }

  if (rawPlan === "demo") {
    return "demo";
  }

  return process.env.COINGECKO_API_KEY ? "demo" : "not-set";
}

export function getCoinGeckoEnvStatus() {
  return {
    COINGECKO_API_KEY: Boolean(process.env.COINGECKO_API_KEY),
    COINGECKO_API_PLAN: getCoinGeckoApiPlan(),
  };
}

function getCoinGeckoRootUrl() {
  return getCoinGeckoApiPlan() === "pro" ? COINGECKO_PRO_ROOT : COINGECKO_PUBLIC_ROOT;
}

export function buildCoinGeckoUrl(path: string, searchParams?: Record<string, string | number | boolean | null | undefined>) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${getCoinGeckoRootUrl()}${normalizedPath}`);

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url;
}

export function getCoinGeckoHeaders() {
  const apiKey = process.env.COINGECKO_API_KEY?.trim();
  const plan = getCoinGeckoApiPlan();
  const headers: Record<string, string> = {
    accept: "application/json",
  };

  if (apiKey && plan === "pro") {
    headers["x-cg-pro-api-key"] = apiKey;
  }

  if (apiKey && plan !== "pro") {
    headers["x-cg-demo-api-key"] = apiKey;
  }

  return headers;
}

export async function fetchCoinGeckoJson<T>(
  path: string,
  searchParams?: Record<string, string | number | boolean | null | undefined>,
  options?: { timeoutMs?: number; signal?: AbortSignal },
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 8_000);

  const relayAbort = () => controller.abort();
  options?.signal?.addEventListener("abort", relayAbort, { once: true });

  try {
    const response = await fetch(buildCoinGeckoUrl(path, searchParams), {
      headers: getCoinGeckoHeaders(),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`coingecko-http-${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
    options?.signal?.removeEventListener("abort", relayAbort);
  }
}
