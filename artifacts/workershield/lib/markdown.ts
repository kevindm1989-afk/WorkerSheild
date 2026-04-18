export type MdNode =
  | { type: "h1" | "h2" | "h3"; text: InlineSpan[] }
  | { type: "bullet"; text: InlineSpan[] }
  | { type: "ordered"; index: number; text: InlineSpan[] }
  | { type: "p"; text: InlineSpan[] }
  | { type: "blank" };

export type InlineSpan = { text: string; bold: boolean; italic: boolean };

function parseInline(input: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  let i = 0;
  let current = "";
  let bold = false;
  let italic = false;

  const flush = () => {
    if (current) {
      spans.push({ text: current, bold, italic });
      current = "";
    }
  };

  while (i < input.length) {
    const ch = input[i];
    const next = input[i + 1];
    if (ch === "*" && next === "*") {
      flush();
      bold = !bold;
      i += 2;
      continue;
    }
    if (ch === "_" && next === "_") {
      flush();
      bold = !bold;
      i += 2;
      continue;
    }
    if (ch === "*" || ch === "_") {
      flush();
      italic = !italic;
      i += 1;
      continue;
    }
    if (ch === "`") {
      // strip code ticks
      i += 1;
      continue;
    }
    current += ch;
    i += 1;
  }
  flush();
  return spans.length ? spans : [{ text: input, bold: false, italic: false }];
}

export function parseMarkdown(input: string): MdNode[] {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const nodes: MdNode[] = [];
  for (const raw of lines) {
    const line = raw.replace(/\s+$/g, "");
    if (!line.trim()) {
      nodes.push({ type: "blank" });
      continue;
    }
    const h3 = /^###\s+(.*)$/.exec(line);
    if (h3) {
      nodes.push({ type: "h3", text: parseInline(h3[1] ?? "") });
      continue;
    }
    const h2 = /^##\s+(.*)$/.exec(line);
    if (h2) {
      nodes.push({ type: "h2", text: parseInline(h2[1] ?? "") });
      continue;
    }
    const h1 = /^#\s+(.*)$/.exec(line);
    if (h1) {
      nodes.push({ type: "h1", text: parseInline(h1[1] ?? "") });
      continue;
    }
    const bullet = /^[-*+]\s+(.*)$/.exec(line);
    if (bullet) {
      nodes.push({ type: "bullet", text: parseInline(bullet[1] ?? "") });
      continue;
    }
    const ordered = /^(\d+)[.)]\s+(.*)$/.exec(line);
    if (ordered) {
      nodes.push({
        type: "ordered",
        index: Number(ordered[1] ?? "1"),
        text: parseInline(ordered[2] ?? ""),
      });
      continue;
    }
    nodes.push({ type: "p", text: parseInline(line) });
  }
  return nodes;
}
