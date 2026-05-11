export const dynamic = "force-dynamic";

const sources = [
  {
    name: "Consumer Price Index",
    url: "https://www.bls.gov/schedule/news_release/cpi.htm",
  },
  {
    name: "Producer Price Index",
    url: "https://www.bls.gov/schedule/news_release/ppi.htm",
  },
  {
    name: "Employment Situation",
    url: "https://www.bls.gov/schedule/news_release/empsit.htm",
  },
  {
    name: "Import and Export Price Indexes",
    url: "https://www.bls.gov/schedule/news_release/ximpim.htm",
  },
  {
    name: "JOLTS",
    url: "https://www.bls.gov/schedule/news_release/jolts.htm",
  },
  {
    name: "BLS Release Calendar",
    url: "https://www.bls.gov/schedule/news_release/current_year.asp",
  },
];

function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractDateTitles(html: string) {
  const text = htmlToText(html);

  return [
    ...text.matchAll(
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s*20\d{2}\b/gi,
    ),
    ...text.matchAll(/\b\d{1,2}\/\d{1,2}\/20\d{2}\b/g),
    ...text.matchAll(/\b20\d{2}-\d{2}-\d{2}\b/g),
  ].map((match) => match[0]);
}

function dateValue(value: string) {
  const parsed = new Date(value);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed.getTime();
  }

  const monthMatch = value.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(20\d{2})\b/i,
  );

  if (!monthMatch) {
    return NaN;
  }

  const months: Record<string, number> = {
    april: 3,
    august: 7,
    december: 11,
    february: 1,
    january: 0,
    july: 6,
    june: 5,
    march: 2,
    may: 4,
    november: 10,
    october: 9,
    september: 8,
  };

  return new Date(
    Number(monthMatch[3]),
    months[monthMatch[1].toLowerCase()],
    Number(monthMatch[2]),
  ).getTime();
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const from = requestUrl.searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
  const to = requestUrl.searchParams.get("to") ?? from;
  const results = await Promise.allSettled(
    sources.map(async (source) => {
      const response = await fetch(source.url, {
        cache: "no-store",
        headers: {
          accept: "text/html,application/xhtml+xml",
        },
      });

      if (!response.ok) {
        return {
          error: `http-${response.status}`,
          name: source.name,
          normalizedCount: 0,
          rawCount: 0,
          sampleTitles: [] as string[],
          status: "failed",
          url: source.url,
        };
      }

      const html = await response.text();
      const dates = extractDateTitles(html);
      const fromTime = dateValue(from);
      const toTime = dateValue(to);
      const inRangeDates = dates.filter((date) => {
        const time = dateValue(date);

        return Number.isFinite(time) && time >= fromTime && time <= toTime;
      });

      return {
        error: null,
        name: source.name,
        normalizedCount: inRangeDates.length,
        rawCount: dates.length,
        sampleTitles: inRangeDates.slice(0, 5),
        status: inRangeDates.length > 0 ? "ok" : "partial",
        url: source.url,
      };
    }),
  );

  return Response.json(
    {
      ok: true,
      requestRange: `${from}..${to}`,
      sources: results.map((result, index) =>
        result.status === "fulfilled"
          ? result.value
          : {
              error: result.reason instanceof Error ? result.reason.name : "request-failed",
              name: sources[index].name,
              normalizedCount: 0,
              rawCount: 0,
              sampleTitles: [],
              status: "failed",
              url: sources[index].url,
            },
      ),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
