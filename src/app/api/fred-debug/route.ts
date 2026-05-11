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
  }

  return null;
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
        sampleKeys: [],
        sampleTitles: [],
        status: "skipped",
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

  const normalized = rows.filter((row) => macroGroup(stringFrom(row, ["release_name", "name", "title"]) ?? ""));

  return Response.json(
    {
      filteredOutCount: Math.max(0, rows.length - normalized.length),
      hasKey: true,
      normalizedCount: normalized.length,
      ok: true,
      rawCount: rows.length,
      requestRange: `${from}..${to}`,
      sampleKeys: rows[0] ? Object.keys(rows[0]).slice(0, 12) : [],
      sampleTitles: rows
        .map((row) => stringFrom(row, ["release_name", "name", "title"]) ?? "unknown")
        .slice(0, 10),
      status,
      warnings,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
