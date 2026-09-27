// Finds worksheet questions in text extracted from an uploaded file (PDF,
// Word, Hangul …) using simple rules — no AI, no cost. The teacher always
// reviews the draft before it is published.
const NUMBERED =
  /^\s*(?:\d{1,2}\s*[.)．]|\(\d{1,2}\)|[①-⑳]|(?:문항|문|질문)\s*\d{1,2}\s*[.):．]?|Q\s*\d{1,2}\s*[.):．]?)\s*(.+)$/i;
const ANSWER_LINE = /^\s*(?:답|정답|answer|a)\s*[:：]/i;
const ENDS_SENTENCE = /[?？.!。]$|[요까다]$/;
const MAX_QUESTIONS = 20;

// Lines that are only blanks to write in: ____, ( ), ……
function isBlank(line: string) {
  return !line.replace(/[_\-－—=~.·…:：()（）\[\]\s]/g, "");
}

export function extractQuestions(text: string): string[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const numbered: string[] = [];
  let current: string | null = null;
  const finish = () => {
    if (current) numbered.push(current);
    current = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    const m = line.match(NUMBERED);
    if (m) {
      finish();
      current = m[1].trim();
    } else if (
      !line ||
      ANSWER_LINE.test(line) ||
      isBlank(line) ||
      /^[-•*·]/.test(line)
    ) {
      finish();
    } else if (current !== null && !ENDS_SENTENCE.test(current)) {
      current += " " + line; // wrapped question continues on the next line
    } else {
      finish();
    }
  }
  finish();
  const candidates = numbered.length
    ? numbered
    : lines.map((l) => l.trim()).filter((l) => /[?？]$/.test(l));
  const out: string[] = [];
  for (const c of candidates) {
    const q = c
      .replace(/\s+/g, " ")
      .replace(/[_]{2,}.*$/, "")
      .trim();
    if (q.length < 4 || q.length > 300 || out.includes(q)) continue;
    out.push(q);
    if (out.length === MAX_QUESTIONS) break;
  }
  return out;
}
