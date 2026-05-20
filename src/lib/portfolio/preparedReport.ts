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
  "SUI",
  "TAO",
  "LINK",
  "AAVE",
  "HYPE",
  "UNI",
  "BNB",
  "AVAX",
  "NEAR",
  "JUP",
  "PENDLE",
  "RENDER",
  "ENA",
] as const;

const TOKEN_ANALYSIS_ORDER = new Map(TOKEN_SYMBOLS.map((symbol, index) => [symbol, index]));
const KEY_METRICS_ORDER = new Map(
  [
    "BTC",
    "ETH",
    "SOL",
    "BNB",
    "LINK",
    "AAVE",
    "HYPE",
    "ONDO",
    "SUI",
    "TAO",
    "UNI",
    "AVAX",
    "NEAR",
    "JUP",
    "PENDLE",
    "RENDER",
    "ENA",
    "TON",
    "XRP",
  ].map((symbol, index) => [symbol, index]),
);

const FINAL_PORTFOLIO = [
  {
    reason: "максимально надёжный денежный слой",
    role: "core",
    symbol: "BTC",
    weight: 24,
  },
  {
    reason: "расчётный слой + L2 + stablecoin-база",
    role: "core",
    symbol: "ETH",
    weight: 20,
  },
  {
    reason: "самая сильная ставка на розничную активность среди L1",
    role: "core",
    symbol: "SOL",
    weight: 10,
  },
  {
    reason: "burn + сильная экосистема BSC",
    role: "core",
    symbol: "BNB",
    weight: 7,
  },
  {
    reason: "oracle/interop-инфраструктура с реальной выручкой",
    role: "core",
    symbol: "LINK",
    weight: 6,
  },
  {
    reason: "зрелый кредитный протокол и запуск V4",
    role: "satellite",
    symbol: "AAVE",
    weight: 5,
  },
  {
    reason: "один из лучших кейсов денежного потока и захвата ценности токеном",
    role: "satellite",
    symbol: "HYPE",
    weight: 5,
  },
  {
    reason: "сильная RWA / tokenized securities-ставка",
    role: "satellite",
    symbol: "ONDO",
    weight: 5,
  },
  {
    reason: "сильная ростовая L1 с хорошими метриками",
    role: "satellite",
    symbol: "SUI",
    weight: 4,
  },
  {
    reason: "уникальная AI-subnet-асимметричная ставка",
    role: "satellite",
    symbol: "TAO",
    weight: 3,
  },
  {
    reason: "голубая фишка децентрализованных бирж + опциональность Unichain",
    role: "satellite",
    symbol: "UNI",
    weight: 3,
  },
  {
    reason: "диверсификация через модульную L1",
    role: "satellite",
    symbol: "AVAX",
    weight: 2,
  },
  {
    reason: "chain abstraction-апсайд без перевеса в портфеле",
    role: "satellite",
    symbol: "NEAR",
    weight: 2,
  },
  {
    reason: "поток ордеров Solana / buyback-ставка",
    role: "satellite",
    symbol: "JUP",
    weight: 1.5,
  },
  {
    reason: "асимметрия рынков доходности",
    role: "satellite",
    symbol: "PENDLE",
    weight: 1.5,
  },
  {
    reason: "AI/GPU-опциональность",
    role: "satellite",
    symbol: "RENDER",
    weight: 1,
  },
] as const;

const WATCHLIST = ["TON", "XRP", "ENA"] as const;

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
      cards: Array<{
        reason: string;
        role: string;
        symbol: string;
        weight: number;
      }>;
      totalWeight: number;
      type: "portfolioCards";
      watchlist: string[];
    }
  | {
      items: Array<{
        asset: string | null;
        date: string;
        description: string;
        kind: string | null;
        title: string;
      }>;
      type: "timeline";
    }
  | {
      evaluation: string;
      metrics: string;
      risks: string;
      role: string;
      symbol: string;
      thesis: string;
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

function normalizeMarkdown(markdown: string) {
  return markdown
    .replace(
      "Под “потенциалом выигрыша”",
      "Под “потенциалом выигрыша” (апсайд)",
    )
    .replace(
      "Под «потенциалом выигрыша»",
      "Под «потенциалом выигрыша» (апсайд)",
    )
    .replace(
      /Под потенциалом выигрыша(?! \(апсайд\))/g,
      "Под потенциалом выигрыша (апсайд)",
    )
    .replace(
      "TON, XRP я оставляю в зоне watch",
      "TON, XRP и ENA я оставляю в зоне watch",
    )
    .replace(
      "Не включаю в базовую аллокацию TON, XRP:",
      "Не включаю в базовую аллокацию TON, XRP и ENA:",
    )
    .replace(
      "хвост — 3.5% на PENDLE, ENA и RENDER",
      "хвост — 3.5% на PENDLE, RENDER и watchlist-наблюдение за ENA",
    );
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

  if (normalized.includes("сравнение ключевых метрик")) {
    return "key-metrics";
  }

  if (normalized.includes("оценка по каждому токену")) {
    return "token-analysis";
  }

  if (normalized.includes("итоговая таблица портфеля")) {
    return "portfolio-table";
  }

  if (normalized.includes("резюме")) {
    return "summary";
  }

  if (normalized.includes("метод")) {
    return "methodology";
  }

  if (normalized.includes("рекомендуемый портфель")) {
    return "portfolio";
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

function getTokenOrder(symbol: string) {
  return TOKEN_ANALYSIS_ORDER.get(symbol.toUpperCase() as (typeof TOKEN_SYMBOLS)[number]) ?? 999;
}

function normalizeRole(symbol: string, role: string) {
  if (symbol === "ENA") {
    return "watchlist";
  }

  if (role.toLowerCase() === "watch") {
    return "watchlist";
  }

  return role;
}

function levelLabel(level: string, kind: "quality" | "reliability" | "upside") {
  const normalized = level.toLowerCase();

  if (kind === "quality") {
    if (normalized === "high") {
      return "высокое — сильный продукт, устойчивый спрос и понятная роль в рынке.";
    }

    if (normalized === "medium") {
      return "среднее — идея понятная, но продуктовая устойчивость и масштаб спроса ещё не такие сильные.";
    }

    return "низкое — качество кейса зависит от факторов, которые пока слабее подтверждены рынком.";
  }

  if (kind === "reliability") {
    if (normalized === "high") {
      return "высокая — высокая ликвидность, зрелая инфраструктура и меньше tokenomics-рисков.";
    }

    if (normalized === "medium") {
      return "средняя — актив интересный, но есть заметные риски исполнения, ликвидности или токеномики.";
    }

    return "низкая — сценарий чувствителен к execution-риску, supply-давлению или слабой предсказуемости.";
  }

  if (normalized === "high") {
    return "высокий — у актива есть пространство для переоценки, но вместе с ним выше разброс исходов.";
  }

  if (normalized === "medium") {
    return "средний — потенциал есть, но часть роста уже учтена в масштабе и ожиданиях рынка.";
  }

  return "низкий — потенциал переоценки слабее, чем у альтернатив в списке.";
}

function normalizeEvaluation(raw: string) {
  const levels = [...raw.matchAll(/\b(high|medium|low)\b/gi)].map((match) =>
    match[1].toLowerCase(),
  );
  const [quality = "medium", reliability = "medium", upside = "medium"] = levels;

  return [
    `Качество: ${levelLabel(quality, "quality")}`,
    `Надёжность: ${levelLabel(reliability, "reliability")}`,
    `Апсайд: ${levelLabel(upside, "upside")}`,
  ].join("\n");
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
  const riskMatch = content.match(
    /(?:Главные риски|Основные риски|Риски|Проблема инвестиционного кейса)\s*[—-]\s*/,
  );
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
          .slice(
            riskIndex,
            evaluationIndex >= 0 ? evaluationIndex : roleIndex >= 0 ? roleIndex : content.length,
          )
          .replace(
            /^(?:Главные риски|Основные риски|Риски|Проблема инвестиционного кейса)\s*[—-]\s*/,
            "",
          )
          .trim()
      : "";
  const rawEvaluation =
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
    evaluation: normalizeEvaluation(rawEvaluation),
    metrics,
    risks,
    role: normalizeRole(symbol, role),
    symbol,
    thesis,
    type: "tokenCard",
  };
}

function inferTimelineMeta(title: string) {
  const upperTitle = title.toUpperCase();
  const asset = TOKEN_SYMBOLS.find((token) => upperTitle.includes(token)) ?? null;
  const normalizedTitle = title.toLowerCase();

  if (normalizedTitle.includes("unlock") || normalizedTitle.includes("вестинг")) {
    return {
      asset,
      kind: "unlock",
      title: title.replace(/^Окно\s+/i, "").trim(),
    };
  }

  if (normalizedTitle.includes("v4")) {
    return {
      asset: asset ?? "AAVE",
      kind: "V4",
      title,
    };
  }

  if (normalizedTitle.includes("unichain")) {
    return {
      asset: asset ?? "UNI",
      kind: "Unichain",
      title,
    };
  }

  if (normalizedTitle.includes("ondo")) {
    return {
      asset: asset ?? "ONDO",
      kind: "RWA",
      title,
    };
  }

  if (normalizedTitle.includes("burn")) {
    return {
      asset: asset ?? "BNB",
      kind: "burn",
      title,
    };
  }

  if (normalizedTitle.includes("хардфорк") || normalizedTitle.includes("апгрейд")) {
    return {
      asset: asset ?? "BNB",
      kind: "upgrade",
      title,
    };
  }

  if (normalizedTitle.includes("халвинг")) {
    return {
      asset: asset ?? (upperTitle.includes("BTC") ? "BTC" : "TAO"),
      kind: "halving",
      title,
    };
  }

  return {
    asset,
    kind: null,
    title,
  };
}

function sortRowsByToken(rows: string[][]) {
  return [...rows].sort((left, right) => {
    const leftOrder = KEY_METRICS_ORDER.get((left[0] ?? "").toUpperCase()) ?? 999;
    const rightOrder = KEY_METRICS_ORDER.get((right[0] ?? "").toUpperCase()) ?? 999;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return 0;
  });
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
        items: rows.map((row) => {
          const meta = inferTimelineMeta(row[1] ?? "");

          return {
            asset: meta.asset,
            date: row[0] ?? "",
            description: row[2] ?? "",
            kind: meta.kind,
            title: meta.title,
          };
        }),
        type: "timeline" as const,
      },
      nextIndex: index,
    };
  }

  if (/итоговая таблица портфеля/i.test(previousHeading)) {
    return {
      block: {
        cards: [...FINAL_PORTFOLIO],
        totalWeight: FINAL_PORTFOLIO.reduce((sum, item) => sum + item.weight, 0),
        type: "portfolioCards" as const,
        watchlist: [...WATCHLIST],
      },
      nextIndex: index,
    };
  }

  const sortedRows = headers[0]?.toLowerCase().includes("токен")
    ? sortRowsByToken(rows)
    : rows;

  return {
    block: {
      cards: sortedRows.map((row) => ({
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

function sortTokenAnalysisBlocks(blocks: PreparedReportBlock[]) {
  const result: PreparedReportBlock[] = [];
  let index = 0;

  const isTopHeading = (block: PreparedReportBlock) =>
    block.type === "heading" && block.level <= 2;

  while (index < blocks.length) {
    const block = blocks[index];

    if (block.type !== "heading" || block.id !== "token-analysis") {
      result.push(block);
      index += 1;
      continue;
    }

    result.push(block);
    index += 1;

    const tokenBlocks: PreparedReportBlock[] = [];
    const otherBlocks: PreparedReportBlock[] = [];

    while (index < blocks.length && !isTopHeading(blocks[index])) {
      const current = blocks[index];

      if (current.type === "tokenCard") {
        tokenBlocks.push(current);
      } else {
        otherBlocks.push(current);
      }

      index += 1;
    }

    result.push(...otherBlocks);
    result.push(
      ...tokenBlocks.sort((left, right) => {
        if (left.type !== "tokenCard" || right.type !== "tokenCard") {
          return 0;
        }

        return getTokenOrder(left.symbol) - getTokenOrder(right.symbol);
      }),
    );
  }

  return result;
}

function moveWatchlistMetricsToEnd(blocks: PreparedReportBlock[]) {
  const result: PreparedReportBlock[] = [];
  let index = 0;
  const isTopHeading = (block: PreparedReportBlock) =>
    block.type === "heading" && block.level <= 2;

  while (index < blocks.length) {
    const block = blocks[index];

    if (block.type !== "heading" || block.id !== "key-metrics") {
      result.push(block);
      index += 1;
      continue;
    }

    result.push(block);
    index += 1;

    const sectionBlocks: PreparedReportBlock[] = [];
    const watchlistCards: Array<{
      fields: PreparedReportField[];
      title: string;
    }> = [];

    while (index < blocks.length && !isTopHeading(blocks[index])) {
      const current = blocks[index];

      if (current.type === "tableCards") {
        const regularCards = current.cards.filter(
          (card) => card.title !== "TON" && card.title !== "XRP",
        );
        watchlistCards.push(
          ...current.cards.filter((card) => card.title === "TON" || card.title === "XRP"),
        );

        sectionBlocks.push({
          ...current,
          cards: regularCards,
        });
      } else {
        sectionBlocks.push(current);
      }

      index += 1;
    }

    result.push(...sectionBlocks);

    if (watchlistCards.length) {
      result.push({
        cards: watchlistCards,
        title: "Watchlist",
        type: "tableCards",
      });
    }
  }

  return result;
}

export async function getPreparedPortfolioReport(): Promise<PreparedPortfolioReport> {
  const markdown = normalizeMarkdown(await readFile(REPORT_FILE, "utf8"));
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: PreparedReportBlock[] = [];
  const nav: PreparedReportNavItem[] = [];
  const usedIds = new Map<string, number>();
  let index = 0;
  let previousHeading = "";
  let skipTimelineText = false;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);

    if (skipTimelineText) {
      if (heading && cleanMarkdown(heading[2]).toLowerCase().includes("рекомендуемый портфель")) {
        skipTimelineText = false;
      } else {
        index += 1;
        continue;
      }
    }

    if (heading) {
      const level = heading[1].length;
      const text = cleanMarkdown(heading[2]);

      if (level === 1) {
        index += 1;
        continue;
      }

      if (text.toLowerCase().includes("матрица качества")) {
        index += 1;

        while (index < lines.length && !/^(#{1,6})\s+/.test(lines[index].trim())) {
          index += 1;
        }

        continue;
      }

      const id = makeUniqueId(text, usedIds);

      previousHeading = text;
      blocks.push({
        id,
        level,
        text,
        type: "heading",
      });

      if (["key-metrics", "token-analysis", "portfolio-table"].includes(id)) {
        nav.push({
          href: `#${id}`,
          label:
            id === "key-metrics"
              ? "Метрики"
              : id === "token-analysis"
                ? "Токены"
                : "Портфель",
        });
      }

      index += 1;
      continue;
    }

    if (isTableLine(line)) {
      const parsed = parseTable(lines, index, previousHeading);
      blocks.push(parsed.block);
      index = parsed.nextIndex;

      if (parsed.block.type === "timeline") {
        skipTimelineText = true;
      }

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
    blocks: moveWatchlistMetricsToEnd(sortTokenAnalysisBlocks(blocks)),
    description:
      "Готовая структура долгосрочного портфеля: core-активы, satellite-идеи, watchlist и логика распределения.",
    highlights: [
      {
        label: "Core",
        text: "BTC / ETH / SOL / BNB / LINK",
        title: "Core-основа",
      },
      {
        label: "Alpha",
        text: "AAVE / HYPE / ONDO / SUI / TAO / UNI",
        title: "Alpha / satellite",
      },
      {
        label: "Beta",
        text: "AVAX / NEAR / JUP / PENDLE / RENDER",
        title: "Beta / satellite",
      },
      {
        label: "Watchlist",
        text: "TON / XRP / ENA",
        title: "Watchlist",
      },
    ],
    nav: [
      {
        href: "#report-start",
        label: "Начало",
      },
      ...nav,
    ],
    title: "Долгосрочный криптопортфель до 2028",
  };
}
