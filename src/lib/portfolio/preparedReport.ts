import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

const REPORT_FILE = path.join(
  process.cwd(),
  "src",
  "content",
  "portfolio",
  "Долгосрочный_криптопортфель_до_2028_app_ready_no_SEI.md",
);

const TOKEN_SYMBOLS = [
  "BTC",
  "ETH",
  "SOL",
  "TON",
  "ONDO",
  "XRP",
  "RENDER",
  "SUI",
  "TAO",
  "LINK",
  "AAVE",
  "HYPE",
  "UNI",
  "BNB",
  "PENDLE",
  "ENA",
  "AVAX",
  "NEAR",
  "JUP",
] as const;

export type PreparedReportNavItem = {
  href: string;
  label: string;
};

export type PreparedReportField = {
  label: string;
  value: string;
};

export type PreparedReportBlock =
  | {
      id: string;
      level: number;
      text: string;
      type: "heading";
    }
  | {
      text: string;
      type: "paragraph";
    }
  | {
      items: string[];
      type: "list";
    }
  | {
      cards: Array<{
        fields: PreparedReportField[];
        title: string;
      }>;
      title: string;
      type: "tableCards";
    }
  | {
      items: Array<{
        date: string;
        description: string;
        title: string;
      }>;
      type: "timeline";
    }
  | {
      symbol: string;
      thesis: string;
      metrics: string;
      risks: string;
      evaluation: string;
      role: string;
      type: "tokenCard";
    };

export type PreparedPortfolioReport = {
  blocks: PreparedReportBlock[];
  description: string;
  highlights: Array<{
    label: string;
    text: string;
    title: string;
  }>;
  nav: PreparedReportNavItem[];
  title: string;
};

function cleanMarkdown(value: string) {
  return value
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .replace(/\\\|/g, "|")
    .trim();
}

function parseTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cleanMarkdown(cell));
}

function isTableSeparator(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function isTableLine(line: string) {
  return line.trim().startsWith("|") && line.includes("|");
}

function makeBaseId(text: string) {
  const normalized = text.toLowerCase();

  if (normalized.includes("резюме")) {
    return "summary";
  }

  if (normalized.includes("метод") || normalized.includes("сравнен")) {
    return "methodology";
  }

  if (normalized.includes("портфель") || normalized.includes("итоговая")) {
    return "portfolio";
  }

  if (normalized.includes("токен")) {
    return "tokens";
  }

  if (normalized.includes("хронолог")) {
    return "timeline";
  }

  if (normalized.includes("источник")) {
    return "sources";
  }

  return text
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/giu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 44);
}

function makeUniqueId(text: string, usedIds: Map<string, number>) {
  const baseId = makeBaseId(text) || "section";
  const count = usedIds.get(baseId) ?? 0;

  usedIds.set(baseId, count + 1);

  return count === 0 ? baseId : `${baseId}-${count + 1}`;
}

function parseTokenParagraph(text: string): PreparedReportBlock | null {
  const symbol = TOKEN_SYMBOLS.find((token) => text.startsWith(`${token}. `));

  if (!symbol) {
    return null;
  }

  const content = cleanMarkdown(text.slice(symbol.length + 1));
  const thesisMatch = content.match(/Тезис:\s*/);
  const thesisStart = thesisMatch ? thesisMatch.index! + thesisMatch[0].length : 0;
  const evaluationIndex = content.indexOf("Оценка:");
  const roleIndex = content.indexOf("Роль:");
  const riskMatch = content.match(/(?:Главные риски|Основные риски|Риски)\s*[—-]\s*/);
  const riskIndex = riskMatch?.index ?? -1;

  const thesisAndMetricsEnd =
    riskIndex >= 0 ? riskIndex : evaluationIndex >= 0 ? evaluationIndex : content.length;
  const thesisAndMetrics = content.slice(thesisStart, thesisAndMetricsEnd).trim();
  const firstSentenceEnd = thesisAndMetrics.indexOf(". ");
  const thesis =
    firstSentenceEnd >= 0
      ? thesisAndMetrics.slice(0, firstSentenceEnd + 1).trim()
      : thesisAndMetrics;
  const metrics =
    firstSentenceEnd >= 0 ? thesisAndMetrics.slice(firstSentenceEnd + 2).trim() : "";
  const risks =
    riskIndex >= 0
      ? content
          .slice(riskIndex, evaluationIndex >= 0 ? evaluationIndex : roleIndex >= 0 ? roleIndex : content.length)
          .replace(/^(?:Главные риски|Основные риски|Риски)\s*[—-]\s*/, "")
          .trim()
      : "";
  const evaluation =
    evaluationIndex >= 0
      ? content
          .slice(evaluationIndex + "Оценка:".length, roleIndex >= 0 ? roleIndex : content.length)
          .trim()
      : "";
  const role =
    roleIndex >= 0
      ? content
          .slice(roleIndex + "Роль:".length)
          .replace(/\.$/, "")
          .trim()
      : "";

  return {
    evaluation,
    metrics,
    risks,
    role,
    symbol,
    thesis,
    type: "tokenCard",
  };
}

function parseTable(lines: string[], startIndex: number, previousHeading: string) {
  const tableLines: string[] = [];
  let index = startIndex;

  while (index < lines.length && isTableLine(lines[index])) {
    tableLines.push(lines[index]);
    index += 1;
  }

  const headers = parseTableRow(tableLines[0] ?? "");
  const dataLines = tableLines.slice(isTableSeparator(tableLines[1] ?? "") ? 2 : 1);
  const rows = dataLines.map(parseTableRow).filter((row) => row.some(Boolean));

  if (/период/i.test(headers[0] ?? "") && /событие/i.test(headers[1] ?? "")) {
    return {
      block: {
        items: rows.map((row) => ({
          date: row[0] ?? "",
          description: row[2] ?? "",
          title: row[1] ?? "",
        })),
        type: "timeline" as const,
      },
      nextIndex: index,
    };
  }

  return {
    block: {
      cards: rows.map((row) => ({
        fields: headers.slice(1).map((header, fieldIndex) => ({
          label: header,
          value: row[fieldIndex + 1] ?? "",
        })),
        title: row[0] ?? "Актив",
      })),
      title: previousHeading,
      type: "tableCards" as const,
    },
    nextIndex: index,
  };
}

export async function getPreparedPortfolioReport(): Promise<PreparedPortfolioReport> {
  const markdown = await readFile(REPORT_FILE, "utf8");
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: PreparedReportBlock[] = [];
  const nav: PreparedReportNavItem[] = [];
  const usedIds = new Map<string, number>();
  let index = 0;
  let previousHeading = "";

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);

    if (heading) {
      const level = heading[1].length;
      const text = cleanMarkdown(heading[2]);
      const id = makeUniqueId(text, usedIds);

      previousHeading = text;
      blocks.push({
        id,
        level,
        text,
        type: "heading",
      });

      if (level === 2) {
        nav.push({
          href: `#${id}`,
          label:
            id === "summary"
              ? "Резюме"
              : id === "methodology"
                ? "Методика"
                : id === "portfolio"
                  ? "Портфель"
                  : id === "tokens"
                    ? "Токены"
                    : id === "timeline"
                      ? "Хронология"
                      : id === "sources"
                        ? "Источники"
                        : text,
        });
      }

      index += 1;
      continue;
    }

    if (isTableLine(line)) {
      const parsed = parseTable(lines, index, previousHeading);
      blocks.push(parsed.block);
      index = parsed.nextIndex;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];

      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(cleanMarkdown(lines[index].replace(/^\s*[-*]\s+/, "")));
        index += 1;
      }

      blocks.push({
        items,
        type: "list",
      });
      continue;
    }

    const paragraphLines: string[] = [];

    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,6})\s+/.test(lines[index].trim()) &&
      !isTableLine(lines[index]) &&
      !/^\s*[-*]\s+/.test(lines[index])
    ) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }

    const text = cleanMarkdown(paragraphLines.join(" "));
    const tokenBlock = parseTokenParagraph(text);

    blocks.push(tokenBlock ?? { text, type: "paragraph" });
  }

  return {
    blocks,
    description:
      "Готовая структура долгосрочного портфеля: core-активы, satellite-идеи, watchlist и логика распределения.",
    highlights: [
      {
        label: "Core",
        text: "BTC / ETH / SOL / BNB / LINK",
        title: "Core-основа",
      },
      {
        label: "Satellite",
        text: "AAVE / HYPE / ONDO / SUI / TAO",
        title: "Alpha / satellite",
      },
      {
        label: "Watchlist",
        text: "TON / XRP",
        title: "Watchlist",
      },
    ],
    nav,
    title: "Долгосрочный криптопортфель до 2028",
  };
}
