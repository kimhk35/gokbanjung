// Splits a rendered Markdown block into pieces so private highlights and
// public-note underlines can be drawn as React spans (no DOM surgery).
import type { Block } from "./markdown-lite";

export type Mark = {
  start: number;
  end: number;
  kind: "highlight" | "note";
  id: string;
};
export type Piece = {
  text: string;
  start: number;
  bold?: boolean;
  italic?: boolean;
  href?: string;
  highlight: boolean;
  notes: string[];
};

export function pieces(block: Block, marks: Mark[]): Piece[] {
  const out: Piece[] = [];
  let offset = block.start;
  for (const run of block.runs) {
    const runStart = offset,
      runEnd = offset + run.text.length;
    const cuts = new Set([runStart, runEnd]);
    for (const m of marks) {
      if (m.start > runStart && m.start < runEnd) cuts.add(m.start);
      if (m.end > runStart && m.end < runEnd) cuts.add(m.end);
    }
    const points = [...cuts].sort((a, b) => a - b);
    for (let i = 0; i < points.length - 1; i++) {
      const s = points[i],
        e = points[i + 1];
      const covering = marks.filter((m) => m.start <= s && m.end >= e);
      const piece: Piece = {
        text: run.text.slice(s - runStart, e - runStart),
        start: s,
        bold: run.bold,
        italic: run.italic,
        href: run.href,
        highlight: covering.some((m) => m.kind === "highlight"),
        notes: covering.filter((m) => m.kind === "note").map((m) => m.id),
      };
      const prev = out[out.length - 1];
      // Merge neighbours that look the same (keeps the DOM small).
      if (
        prev &&
        prev.start + prev.text.length === s &&
        prev.bold === piece.bold &&
        prev.italic === piece.italic &&
        prev.href === piece.href &&
        prev.highlight === piece.highlight &&
        prev.notes.join() === piece.notes.join()
      )
        prev.text += piece.text;
      else out.push(piece);
    }
    offset = runEnd;
  }
  return out;
}
