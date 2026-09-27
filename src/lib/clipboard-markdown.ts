// Converts HTML copied from a web page into the Markdown subset understood by
// markdown-lite. DOMParser builds an inert document: scripts never run and
// nothing is fetched. Only text, headings, lists, emphasis and https links
// survive; everything else is dropped.
const BLOCKS = new Set([
  "P",
  "DIV",
  "SECTION",
  "ARTICLE",
  "BLOCKQUOTE",
  "HEADER",
  "FOOTER",
  "MAIN",
  "TR",
]);

function inline(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE)
    return (node.textContent || "").replace(/\s+/g, " ");
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as Element;
  if (["SCRIPT", "STYLE", "NOSCRIPT", "SUP"].includes(el.tagName)) return "";
  const inner = [...el.childNodes].map(inline).join("");
  if (!inner.trim()) return el.tagName === "BR" ? "\n" : inner;
  if (el.tagName === "STRONG" || el.tagName === "B")
    return `**${inner.trim()}** `;
  if (el.tagName === "EM" || el.tagName === "I") return `*${inner.trim()}* `;
  if (el.tagName === "A") {
    const href = el.getAttribute("href") || "";
    return /^https:\/\//.test(href) ? `[${inner.trim()}](${href})` : inner;
  }
  return inner;
}

function blocks(node: Element, out: string[]) {
  for (const child of [...node.children]) {
    const tag = child.tagName;
    if (/^H[1-6]$/.test(tag))
      out.push(
        `${"#".repeat(Math.min(3, Number(tag[1])))} ${inline(child).trim()}`,
      );
    else if (tag === "LI") out.push(`- ${inline(child).trim()}`);
    else if (tag === "UL" || tag === "OL") blocks(child, out);
    else if (
      BLOCKS.has(tag) &&
      [...child.children].some(
        (c) => BLOCKS.has(c.tagName) || /^(H[1-6]|UL|OL)$/.test(c.tagName),
      )
    )
      blocks(child, out);
    else if (BLOCKS.has(tag) || tag === "LI") out.push(inline(child).trim());
    else if (
      !["SCRIPT", "STYLE", "NAV", "BUTTON", "FORM", "IMG", "SVG"].includes(tag)
    ) {
      const text = inline(child).trim();
      if (text) out.push(text);
    }
  }
}

export function htmlToMarkdown(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const out: string[] = [];
  blocks(doc.body, out);
  return out
    .map((b) =>
      b
        .replace(/[ \t]+\n/g, "\n")
        .replace(/ {2,}/g, " ")
        .trim(),
    )
    .filter(Boolean)
    .join("\n\n");
}
