export interface ParsedTable {
  headers: string[];
  rows: string[][];
}

export interface ParsedSection {
  heading: string;
  body: string;
  table?: ParsedTable;
  startLine: number;  // line index where heading is (or 0 for preamble)
  endLine: number;    // exclusive end line index
}

export interface ParsedReport {
  sections: ParsedSection[];
}

function parseTable(lines: string[]): ParsedTable | undefined {
  // Find pipe-table rows (lines starting and ending with |)
  const tableLines = lines.filter((l) => l.trim().startsWith("|") && l.trim().endsWith("|"));
  if (tableLines.length < 3) return undefined; // need header + separator + at least 1 row

  const splitRow = (line: string): string[] =>
    line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());

  const headers = splitRow(tableLines[0]);
  // skip separator row (index 1)
  const rows = tableLines.slice(2).map(splitRow);
  return { headers, rows };
}

export function parseReport(markdown: string): ParsedReport {
  const lines = markdown.split("\n");
  const sections: ParsedSection[] = [];
  let currentHeading = "";
  let currentLines: string[] = [];
  let currentStartLine = 0;

  const flush = (endLine: number) => {
    if (currentHeading || currentLines.length > 0) {
      const body = currentLines.join("\n").trim();
      const table = parseTable(currentLines);
      sections.push({ heading: currentHeading, body, table, startLine: currentStartLine, endLine });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("### ")) {
      flush(i);
      currentHeading = line.replace(/^###\s+/, "").trim();
      currentLines = [];
      currentStartLine = i;
    } else {
      currentLines.push(line);
    }
  }
  flush(lines.length);

  return { sections };
}

export function replaceSectionBody(
  fullMarkdown: string,
  section: ParsedSection,
  newBody: string
): string {
  const lines = fullMarkdown.split("\n");
  // Body starts on the line after the heading (or at startLine if no heading)
  const bodyStart = section.heading ? section.startLine + 1 : section.startLine;
  const replacement = section.heading
    ? [`### ${section.heading}`, newBody]
    : [newBody];
  const result = [
    ...lines.slice(0, section.startLine),
    ...replacement,
    ...lines.slice(section.endLine),
  ];
  return result.join("\n");
}

// Extract options table (Resolution section has a transposed table: rows are attributes, columns are options)
export interface ResolutionOption {
  name: string;
  action: string;
  upside: string;
  risk: string;
  timeline: string;
}

export function parseResolutionOptions(table: ParsedTable): ResolutionOption[] {
  // Headers: ["", "Option A: Name", "Option B: Name"]
  const optionNames = table.headers.slice(1);
  const options: ResolutionOption[] = optionNames.map((h) => ({
    name: h.replace(/^Option [A-Z]:\s*/, ""),
    action: "",
    upside: "",
    risk: "",
    timeline: "",
  }));

  for (const row of table.rows) {
    const label = row[0]?.toLowerCase() ?? "";
    for (let i = 1; i < row.length && i - 1 < options.length; i++) {
      if (label.includes("action")) options[i - 1].action = row[i];
      else if (label.includes("upside")) options[i - 1].upside = row[i];
      else if (label.includes("risk")) options[i - 1].risk = row[i];
      else if (label.includes("timeline")) options[i - 1].timeline = row[i];
    }
  }

  return options;
}

export interface KeyMetric {
  metric: string;
  value: string;
  limit: string;
  utilization: string;
  headroom: string;
}

export function parseKeyMetrics(table: ParsedTable): KeyMetric[] {
  return table.rows.map((row) => ({
    metric: row[0] ?? "",
    value: row[1] ?? "",
    limit: row[2] ?? "",
    utilization: row[3] ?? "",
    headroom: row[4] ?? "",
  }));
}

export interface RiskRow {
  risk: string;
  likelihood: string;
  mitigant: string;
}

export function parseRisks(table: ParsedTable): RiskRow[] {
  return table.rows.map((row) => ({
    risk: row[0] ?? "",
    likelihood: row[1] ?? "",
    mitigant: row[2] ?? "",
  }));
}

export interface NextStep {
  number: string;
  action: string;
  owner: string;
  deadline: string;
}

export function parseNextSteps(table: ParsedTable): NextStep[] {
  return table.rows.map((row) => ({
    number: row[0] ?? "",
    action: row[1] ?? "",
    owner: row[2] ?? "",
    deadline: row[3] ?? "",
  }));
}

export interface EvidenceItem {
  dealId: string;
  text: string;
}

export function parseEvidence(body: string): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  const bulletLines = body.split("\n").filter((l) => l.trim().startsWith("- "));
  for (const line of bulletLines) {
    const text = line.replace(/^-\s+/, "").trim();
    const dealMatch = text.match(/\b(D-\d+)\b/);
    items.push({ dealId: dealMatch?.[1] ?? "", text });
  }
  return items;
}

export interface ObjectionHandler {
  objection: string;
  rebuttal: string;
}

export function parseObjectionHandlers(body: string): ObjectionHandler[] {
  const items: ObjectionHandler[] = [];
  const lines = body.split("\n");
  let currentObjection = "";
  let currentRebuttal: string[] = [];

  const flush = () => {
    if (currentObjection) {
      items.push({
        objection: currentObjection,
        rebuttal: currentRebuttal.join(" ").trim(),
      });
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const objMatch = trimmed.match(/^\*\*"(.+?)"\*\*$/);
    if (objMatch) {
      flush();
      currentObjection = objMatch[1];
      currentRebuttal = [];
    } else if (trimmed && currentObjection) {
      currentRebuttal.push(trimmed);
    }
  }
  flush();
  return items;
}
