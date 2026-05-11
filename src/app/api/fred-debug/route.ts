export const dynamic = "force-dynamic";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function arrayPayload(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (!isRecord(value)) {
    return [];
  }

  const rows = value.release_dates ?? value.data ?? value.rows ?? value.items;

  return Array.isArray(rows) ? rows : [];
}

function stringFrom(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return null;
}

const fredReleaseWhitelist: Record<
  string,
  {
    impact: "high" | "medium" | "low";
    time?: string;
    title: string;
  }
> = {
  "10": {
    impact: "high",
    time: "15:30",
    title: "US CPI",
  },
  "13": {
    impact: "medium",
    time: "16:15",
    title: "US Industrial Production",
  },
  "180": {
    impact: "medium",
    time: "15:30",
    title: "Initial Jobless Claims",
  },
  "188": {
    impact: "low",
    time: "15:30",
    title: "US Import/Export Price Indexes",
  },
  "321": {
    impact: "medium",
    time: "15:30",
    title: "NY Empire State Manufacturing Index",
  },
  "363": {
    impact: "medium",
    time: "21:00",
    title: "Monthly Treasury Statement / US Federal Budget",
  },
  "46": {
    impact: "high",
    time: "15:30",
    title: "US PPI",
  },
  "9": {
    impact: "medium",
    time: "15:30",
    title: "US Retail Sales",
  },
};

function rawTitle(row: UnknownRecord) {
  return stringFrom(row, ["release_name", "name", "title", "release"]) ?? "unknown";
}

function macroGroup(title: string) {
  const text = title.toLowerCase();

  if (/\bcpi\b|consumer price|personal consumption expenditures|core pce|\bpce\b/.test(text)) {
    return "inflation-high";
  }

  if (/producer price|\bppi\b|retail sales|jobless claims|industrial production|empire state|ism|pmi|durable goods|consumer sentiment|jolts|housing starts/.test(text)) {
    return "macro-medium";
  }

  if (/fomc|federal funds|interest rate|employment situation|nonfarm|unemployment|gross domestic product|\bgdp\b/.test(text)) {
    return "macro-high";
  }

  if (/import.*export.*price|import price|export price/.test(text)) {
    return "macro-low";
  }

  return null;
}

function additionalFredReleaseConfig(title: string) {
  const group = macroGroup(title);

  if (
    group === "macro-high" &&
    /\bemployment situation\b|nonfarm payrolls?/i.test(title) &&
    !/\bstate\b/i.test(title)
  ) {
    return {
      impact: "high" as const,
      time: "15:30",
      title: "Employment Situation / Nonfarm Payrolls",
    };
  }

  if (
    group === "macro-high" &&
    /\bgross domestic product\b/i.test(title) &&
    !/eurostat|international|foreign/i.test(title)
  ) {
    return {
      impact: "high" as const,
      time: "15:30",
      title: "US GDP",
    };
  }

  if (
    group === "inflation-high" &&
    /personal income and outlays|personal consumption expenditures|core pce|\bpce\b/i.test(title)
  ) {
    return {
      impact: "high" as const,
      time: "15:30",
      title: "US PCE",
    };
  }

  if (
    group === "macro-high" &&
    /fomc|federal funds|interest rate/i.test(title) &&
    /meeting|rate decision|interest rate decision|federal funds rate/i.test(title) &&
    !/press release/i.test(title)
  ) {
    return {
      impact: "high" as const,
      title: "FOMC / Federal Funds Rate Decision",
    };
  }

  return null;
}

function normalizedFredRelease(row: UnknownRecord) {
  const releaseId = stringFrom(row, ["release_id", "id"]);
  const title = rawTitle(row);
  const config =
    (releaseId ? fredReleaseWhitelist[releaseId] : undefined) ??
    additionalFredReleaseConfig(title);

  if (!config) {
    return null;
  }

  return {
    impact: config.impact,
    rawTitle: title,
    releaseId,
    time: config.time ?? null,
    title: config.title,
  };
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const from = requestUrl.searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
  const to = requestUrl.searchParams.get("to") ?? from;
  const apiKey = process.env.FRED_API_KEY;
  const warnings: string[] = [];

  if (!apiKey) {
    return Response.json(
      {
        filteredOutCount: 0,
        hasKey: false,
        normalizedCount: 0,
        ok: true,
        rawCount: 0,
        requestRange: `${from}..${to}`,
        cacheStatus: "failed",
        normalizedSampleTitles: [],
        rawSampleTitles: [],
        sampleKeys: [],
        sampleTitles: [],
        status: "skipped",
        whitelistMatches: [],
        warnings: ["FRED_API_KEY is not configured"],
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const url = new URL("https://api.stlouisfed.org/fred/releases/dates");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("include_release_dates_with_no_data", "true");
  url.searchParams.set("limit", "1000");
  url.searchParams.set("realtime_end", to);
  url.searchParams.set("realtime_start", from);

  let status = "ok";
  let rows: UnknownRecord[] = [];

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      status = `http-${response.status}`;
      warnings.push(status);
    } else {
      const payload = await response.json() as unknown;
      rows = arrayPayload(payload).filter(isRecord);
    }
  } catch (error) {
    status = "failed";
    warnings.push(error instanceof Error ? error.name : "request-failed");
  }

  const normalized = rows
    .map(normalizedFredRelease)
    .filter((release): release is NonNullable<ReturnType<typeof normalizedFredRelease>> =>
      release !== null,
    );
  const rawSampleTitles = rows.map(rawTitle).slice(0, 10);

  return Response.json(
    {
      cacheStatus: status === "ok" ? "refresh-ok" : "failed",
      filteredOutCount: Math.max(0, rows.length - normalized.length),
      hasKey: true,
      normalizedCount: normalized.length,
      normalizedSampleTitles: normalized.map((release) => release.title).slice(0, 10),
      ok: true,
      rawCount: rows.length,
      rawSampleTitles,
      requestRange: `${from}..${to}`,
      sampleKeys: rows[0] ? Object.keys(rows[0]).slice(0, 12) : [],
      sampleTitles: rawSampleTitles,
      status,
      whitelistMatches: normalized.slice(0, 20),
      warnings,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
