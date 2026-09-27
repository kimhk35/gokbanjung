// Text-position anchors for notes on uploaded lesson text. An anchor stores
// the selected words plus a little context, so a note finds its sentence
// again after the operator edits other parts of the text.
export type Anchor = {
  exact: string;
  prefix: string;
  suffix: string;
  start: number;
};
const CONTEXT = 32;

export function makeAnchor(text: string, start: number, end: number): Anchor {
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end > text.length ||
    end <= start
  )
    throw new RangeError("invalid_range");
  return {
    exact: text.slice(start, end),
    prefix: text.slice(Math.max(0, start - CONTEXT), start),
    suffix: text.slice(end, end + CONTEXT),
    start,
  };
}

// Length of the common run of characters at the end of a / start of b.
function tailMatch(a: string, b: string) {
  let n = 0;
  while (
    n < a.length &&
    n < b.length &&
    a[a.length - 1 - n] === b[b.length - 1 - n]
  )
    n++;
  return n;
}
function headMatch(a: string, b: string) {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
}

// Best occurrence of anchor.exact: most matching context wins, then the one
// closest to where it used to be. Null when the words are gone.
export function locate(
  text: string,
  a: Anchor,
): { start: number; end: number } | null {
  if (!a.exact) return null;
  let best: { start: number; score: number; distance: number } | null = null;
  for (
    let i = text.indexOf(a.exact);
    i >= 0;
    i = text.indexOf(a.exact, i + 1)
  ) {
    const score =
      tailMatch(text.slice(Math.max(0, i - a.prefix.length), i), a.prefix) +
      headMatch(
        text.slice(i + a.exact.length, i + a.exact.length + a.suffix.length),
        a.suffix,
      );
    const distance = Math.abs(i - a.start);
    if (
      !best ||
      score > best.score ||
      (score === best.score && distance < best.distance)
    )
      best = { start: i, score, distance };
  }
  return best ? { start: best.start, end: best.start + a.exact.length } : null;
}
