// Text layout for canvas quote cards. `measure` is ctx.measureText(...).width
// in the browser; tests pass a fake. Breaks at spaces, falls back to single
// characters for Korean or long words, keeps explicit line breaks, and ends
// the last visible line with "…" when the text does not fit.
export const CARD_SIZES = {
  square: [1080, 1080],
  story: [1080, 1920],
  wide: [1920, 1080],
} as const;
export type CardSize = keyof typeof CARD_SIZES;

export function wrapLines(
  measure: (s: string) => number,
  text: string,
  width: number,
  maxLines: number,
): string[] {
  const lines: string[] = [];
  let truncated = false;
  outer: for (const paragraph of text.split("\n")) {
    let line = "";
    for (const token of paragraph.split(/(\s+)/)) {
      if (!token) continue;
      const candidate = line + token;
      if (measure(candidate.trimEnd()) <= width) {
        line = candidate;
        continue;
      }
      // Token does not fit on this line.
      if (line.trim()) {
        lines.push(line.trimEnd());
        if (lines.length >= maxLines) {
          truncated = true;
          break outer;
        }
        line = "";
      }
      if (/^\s+$/.test(token)) continue;
      for (const char of token) {
        if (measure(line + char) > width && line) {
          lines.push(line);
          if (lines.length >= maxLines) {
            truncated = true;
            break outer;
          }
          line = "";
        }
        line += char;
      }
    }
    if (line.trim() || paragraph === "") {
      if (lines.length >= maxLines) {
        truncated = true;
        break;
      }
      if (line.trim()) lines.push(line.trimEnd());
    }
  }
  if (truncated && lines.length) {
    let last = lines[lines.length - 1];
    while (last && measure(last + "…") > width) last = last.slice(0, -1);
    lines[lines.length - 1] = last.trimEnd() + "…";
  }
  return lines;
}
