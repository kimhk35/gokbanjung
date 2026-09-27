// Minimal, safe Markdown for uploaded lesson text: headings (#–###), list
// items (-, *, 1.), paragraphs, **bold**, *italic*, [link](https://…).
// No raw HTML is ever produced. The server computes note anchors on
// plainText(); the reader renders the same blocks, so offsets agree.
export type Run = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  href?: string;
};
export type Block = {
  kind: "h1" | "h2" | "h3" | "p" | "li";
  runs: Run[];
  start: number;
};
export const BLOCK_SEPARATOR = "\n\n";

function inline(source: string): Run[] {
  const runs: Run[] = [];
  const pattern =
    /\*\*([^*]+)\*\*|\*([^*]+)\*|_([^_]+)_|\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g;
  let last = 0;
  for (let m = pattern.exec(source); m; m = pattern.exec(source)) {
    if (m.index > last) runs.push({ text: source.slice(last, m.index) });
    if (m[1]) runs.push({ text: m[1], bold: true });
    else if (m[2] || m[3]) runs.push({ text: m[2] || m[3], italic: true });
    else runs.push({ text: m[4], href: m[5] });
    last = m.index + m[0].length;
  }
  if (last < source.length) runs.push({ text: source.slice(last) });
  return runs.filter((r) => r.text);
}

export function parseMarkdown(markdown: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let offset = 0;
  const push = (kind: Block["kind"], source: string) => {
    const runs = inline(source.trim());
    if (!runs.length) return;
    if (blocks.length) offset += BLOCK_SEPARATOR.length;
    blocks.push({ kind, runs, start: offset });
    offset += runs.reduce((n, r) => n + r.text.length, 0);
  };
  const flush = () => {
    if (paragraph.length) push("p", paragraph.join(" "));
    paragraph = [];
  };
  for (const raw of markdown.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    const item = line.match(/^\s*(?:[-*]|\d+[.)])\s+(.*)$/);
    if (!line.trim()) flush();
    else if (heading) {
      flush();
      push(`h${heading[1].length}` as Block["kind"], heading[2]);
    } else if (item) {
      flush();
      push("li", item[1]);
    } else paragraph.push(line.trim());
  }
  flush();
  return blocks;
}

export function blockText(block: Block) {
  return block.runs.map((r) => r.text).join("");
}
export function plainText(markdown: string) {
  return parseMarkdown(markdown).map(blockText).join(BLOCK_SEPARATOR);
}
