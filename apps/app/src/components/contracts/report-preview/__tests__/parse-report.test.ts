import { describe, it, expect } from "vitest";
import {
  parseReport,
  replaceSectionBody,
  parseResolutionOptions,
  parseKeyMetrics,
  parseRisks,
  parseNextSteps,
  parseEvidence,
  parseObjectionHandlers,
  ParsedTable,
} from "../parse-report";

describe("parseReport", () => {
  it("parses sections split by ### headings", () => {
    const md = `### Situation\nLine one\nLine two\n### Complication\nSomething`;
    const result = parseReport(md);
    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].heading).toBe("Situation");
    expect(result.sections[0].body).toContain("Line one");
    expect(result.sections[1].heading).toBe("Complication");
  });

  it("captures preamble text before first heading", () => {
    const md = `Preamble text\n### Heading\nBody`;
    const result = parseReport(md);
    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].heading).toBe("");
    expect(result.sections[0].body).toBe("Preamble text");
  });

  it("tracks correct startLine and endLine", () => {
    const md = `### A\nline1\nline2\n### B\nline3`;
    const result = parseReport(md);
    expect(result.sections[0].startLine).toBe(0);
    expect(result.sections[0].endLine).toBe(3);
    expect(result.sections[1].startLine).toBe(3);
    expect(result.sections[1].endLine).toBe(5);
  });

  it("handles empty input (returns single empty preamble section)", () => {
    const result = parseReport("");
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].heading).toBe("");
    expect(result.sections[0].body).toBe("");
  });

  it("handles markdown with only headings and no body", () => {
    const md = `### A\n### B`;
    const result = parseReport(md);
    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].body).toBe("");
    expect(result.sections[1].body).toBe("");
  });

  it("extracts a pipe table from a section", () => {
    const md = [
      "### Metrics",
      "| Metric | Value | Limit |",
      "| --- | --- | --- |",
      "| Users | 100 | 200 |",
      "| Storage | 50 | 100 |",
    ].join("\n");
    const result = parseReport(md);
    expect(result.sections[0].table).toBeDefined();
    expect(result.sections[0].table!.headers).toEqual(["Metric", "Value", "Limit"]);
    expect(result.sections[0].table!.rows).toHaveLength(2);
    expect(result.sections[0].table!.rows[0]).toEqual(["Users", "100", "200"]);
  });

  it("returns no table when fewer than 3 table lines", () => {
    const md = `### Section\n| Only | Header |\n| --- | --- |`;
    const result = parseReport(md);
    expect(result.sections[0].table).toBeUndefined();
  });
});

describe("replaceSectionBody", () => {
  it("replaces body of a headed section", () => {
    const md = `### A\nold body\n### B\nkeep this`;
    const parsed = parseReport(md);
    const result = replaceSectionBody(md, parsed.sections[0], "new body");
    expect(result).toContain("### A\nnew body");
    expect(result).toContain("### B\nkeep this");
  });

  it("replaces preamble body", () => {
    const md = `preamble\n### A\nbody`;
    const parsed = parseReport(md);
    const result = replaceSectionBody(md, parsed.sections[0], "new preamble");
    expect(result).toContain("new preamble");
    expect(result).toContain("### A\nbody");
  });
});

describe("parseResolutionOptions", () => {
  const table: ParsedTable = {
    headers: ["", "Option A: Upgrade", "Option B: Custom"],
    rows: [
      ["Action", "Upgrade tier", "Custom plan"],
      ["Upside", "$50k", "$30k"],
      ["Risk", "Low", "Medium"],
      ["Timeline", "2 weeks", "1 month"],
    ],
  };

  it("extracts option names stripping prefix", () => {
    const options = parseResolutionOptions(table);
    expect(options).toHaveLength(2);
    expect(options[0].name).toBe("Upgrade");
    expect(options[1].name).toBe("Custom");
  });

  it("maps row values correctly", () => {
    const options = parseResolutionOptions(table);
    expect(options[0].action).toBe("Upgrade tier");
    expect(options[0].upside).toBe("$50k");
    expect(options[0].risk).toBe("Low");
    expect(options[0].timeline).toBe("2 weeks");
  });

  it("handles missing columns gracefully", () => {
    const sparse: ParsedTable = {
      headers: ["", "Option A: Solo"],
      rows: [["Action", "Do it"]],
    };
    const options = parseResolutionOptions(sparse);
    expect(options).toHaveLength(1);
    expect(options[0].action).toBe("Do it");
    expect(options[0].upside).toBe("");
  });
});

describe("parseKeyMetrics", () => {
  it("maps table rows to metric objects", () => {
    const table: ParsedTable = {
      headers: ["Metric", "Value", "Limit", "Utilization", "Headroom"],
      rows: [["Users", "100", "200", "50%", "100"]],
    };
    const metrics = parseKeyMetrics(table);
    expect(metrics).toHaveLength(1);
    expect(metrics[0]).toEqual({
      metric: "Users",
      value: "100",
      limit: "200",
      utilization: "50%",
      headroom: "100",
    });
  });

  it("handles rows with missing cells", () => {
    const table: ParsedTable = {
      headers: ["Metric", "Value", "Limit", "Utilization", "Headroom"],
      rows: [["Users"]],
    };
    const metrics = parseKeyMetrics(table);
    expect(metrics[0].value).toBe("");
    expect(metrics[0].headroom).toBe("");
  });
});

describe("parseRisks", () => {
  it("maps risk/likelihood/mitigant columns", () => {
    const table: ParsedTable = {
      headers: ["Risk", "Likelihood", "Mitigant"],
      rows: [["Churn", "High", "Engage CSM"]],
    };
    const risks = parseRisks(table);
    expect(risks[0]).toEqual({ risk: "Churn", likelihood: "High", mitigant: "Engage CSM" });
  });
});

describe("parseNextSteps", () => {
  it("maps number/action/owner/deadline columns", () => {
    const table: ParsedTable = {
      headers: ["#", "Action", "Owner", "Deadline"],
      rows: [["1", "Call client", "CSM", "Next week"]],
    };
    const steps = parseNextSteps(table);
    expect(steps[0]).toEqual({
      number: "1",
      action: "Call client",
      owner: "CSM",
      deadline: "Next week",
    });
  });
});

describe("parseEvidence", () => {
  it("extracts bullet items with deal IDs", () => {
    const body = `Some intro\n- Deal D-001 was successful\n- Deal D-042 had issues`;
    const items = parseEvidence(body);
    expect(items).toHaveLength(2);
    expect(items[0].dealId).toBe("D-001");
    expect(items[0].text).toBe("Deal D-001 was successful");
    expect(items[1].dealId).toBe("D-042");
  });

  it("handles bullets without deal IDs", () => {
    const body = `- No deal reference here`;
    const items = parseEvidence(body);
    expect(items[0].dealId).toBe("");
    expect(items[0].text).toBe("No deal reference here");
  });

  it("ignores non-bullet lines", () => {
    const body = `Not a bullet\nAlso not\n- Only this`;
    const items = parseEvidence(body);
    expect(items).toHaveLength(1);
  });
});

describe("parseObjectionHandlers", () => {
  it("extracts objection/rebuttal pairs", () => {
    const body = `**"Too expensive"**\nWe offer flexible pricing.\n\n**"Not ready"**\nTimeline is adjustable.`;
    const handlers = parseObjectionHandlers(body);
    expect(handlers).toHaveLength(2);
    expect(handlers[0].objection).toBe("Too expensive");
    expect(handlers[0].rebuttal).toBe("We offer flexible pricing.");
    expect(handlers[1].objection).toBe("Not ready");
  });

  it("joins multi-line rebuttals", () => {
    const body = `**"Why now?"**\nFirst reason.\nSecond reason.`;
    const handlers = parseObjectionHandlers(body);
    expect(handlers[0].rebuttal).toBe("First reason. Second reason.");
  });

  it("handles empty input", () => {
    const handlers = parseObjectionHandlers("");
    expect(handlers).toHaveLength(0);
  });
});
