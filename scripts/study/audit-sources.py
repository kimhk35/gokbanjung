"""Read public Church source positions; keep bodies only in an ignored audit cache.

Usage: python scripts/study/audit-sources.py MANIFEST OUTPUT_DIR
The manifest is an array of {id, path, lang}. Metadata never substitutes for a
separate source-to-manifest review or an actual browser selection check.
"""
import concurrent.futures
import hashlib
import json
import re
import sys
import urllib.request
from html.parser import HTMLParser
from pathlib import Path


class Element:
    def __init__(self, tag, attrs=(), parent=None):
        self.tag, self.attrs, self.parent = tag, dict(attrs), parent
        self.children = []

    def text(self):
        if self.tag in ("script", "style", "svg"):
            return ""
        return "".join(c if isinstance(c, str) else c.text() for c in self.children)

    def walk(self):
        yield self
        for child in self.children:
            if isinstance(child, Element):
                yield from child.walk()

    def parents(self):
        node = self.parent
        while node:
            yield node
            node = node.parent


class Tree(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.root = Element("root")
        self.stack = [self.root]
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        node = Element(tag, attrs, self.stack[-1])
        self.stack[-1].children.append(node)
        if tag not in {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                self.stack = self.stack[:i]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def normalized(node):
    return re.sub(r"\s+", " ", node.text()).strip()


def repeated_table_header(node):
    """Recognize plain-text mobile card labels copied from the same table header.

    Church vertical-axis tables repeat their column headings in every mobile
    card, including the heading IDs. Keep the original heading once. Other
    duplicate IDs, different text, links, notes and media remain audit errors.
    """
    if node.tag != "p" or not node.attrs.get("id"):
        return False
    parents = list(node.parents())
    if not any(p.tag == "div" and "card-label" in p.attrs.get("class", "").split() for p in parents):
        return False
    table = next((p for p in parents if p.tag == "table"), None)
    if table is None or "vertical-axis" not in table.attrs.get("class", "").split():
        return False
    # Do not collapse references or embedded content just because their words
    # happen to match; these need an explicit source review.
    if any(child.tag in {"a", "img", "video", "audio", "iframe", "sup"} or
           (child is not node and child.attrs.get("id")) for child in node.walk()):
        return False
    originals = [
        candidate for candidate in table.walk()
        if candidate.tag == node.tag and candidate.attrs.get("id") == node.attrs["id"]
        and any(p.tag == "thead" and next((a for a in p.parents() if a.tag == "table"), None) is table for p in candidate.parents())
        and next((p for p in candidate.parents() if p.tag == "table"), None) is table
    ]
    return len(originals) == 1 and normalized(originals[0]) == normalized(node)


def inspect(source, out):
    url = "https://www.churchofjesuschrist.org" + source["path"] + "?lang=" + source["lang"]
    cache = out / (source["id"] + ".html")
    if not cache.exists():
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=45) as response:
            cache.write_bytes(response.read())
    html = cache.read_text(encoding="utf-8")
    tree = Tree(html)
    main = next((e for e in tree.root.walk() if e.attrs.get("id") == "main"), None)
    if not main:
        raise ValueError(source["id"] + ": no main article")
    units, links, media = [], [], []
    repeated_headers = {}
    for e in main.walk():
        anchor = e.attrs.get("id")
        if anchor and e.tag in {"p", "h1", "h2", "h3", "h4", "h5", "h6", "figcaption", "li"}:
            if repeated_table_header(e):
                repeated_headers[anchor] = repeated_headers.get(anchor, 0) + 1
                continue
            # Lists with paragraph children have their own stable paragraph IDs.
            if e.tag == "li" and any(c is not e and c.tag in {"p", "li"} and c.attrs.get("id") for c in e.walk()):
                continue
            text = normalized(e)
            if text:
                is_note = anchor.startswith("note") or any("notes" in p.attrs.get("class", "") or p.attrs.get("id") in {"notes", "footnotes"} for p in e.parents())
                note_group = next((p.attrs["id"] for p in e.parents() if p.attrs.get("id", "").startswith("note")), anchor if is_note else "")
                verse_match = re.match(r"^(\d+)(?:[-–~](\d+))?\s", text) if "/scriptures/" in source["path"] and "/gs/" not in source["path"] and re.fullmatch(r"p\d+", anchor) else None
                verse_numbers = list(range(int(verse_match[1]), int(verse_match[2] or verse_match[1])+1)) if verse_match else []
                units.append({"anchor": anchor, "tag": e.tag, "chars": len(re.sub(r"\s", "", text)), "words": len(text.split()), "sha256": hashlib.sha256(text.encode()).hexdigest(), "note": is_note, "noteGroup": note_group, "verseNumbers": verse_numbers, "text": text})
        if e.tag == "a" and e.attrs.get("href"):
            owner = next((p.attrs["id"] for p in [e, *e.parents()] if p.attrs.get("id")), "main")
            links.append({"owner": owner, "href": e.attrs["href"], "label": normalized(e)})
        if e.tag in {"img", "video", "audio", "iframe"}:
            media.append({"tag": e.tag, "id": anchor, "alt": e.attrs.get("alt", ""), "owner": next((p.attrs["id"] for p in e.parents() if p.attrs.get("id")), "main")})
    anchors = [u["anchor"] for u in units]
    if len(anchors) != len(set(anchors)):
        duplicates = sorted({anchor for anchor in anchors if anchors.count(anchor) > 1})
        raise ValueError(source["id"] + ": duplicate source anchors: " + ", ".join(duplicates))
    for unit in units:
        unit["noteOwners"] = list(dict.fromkeys(a["owner"] for a in links if unit["note"] and a["href"].split("#")[-1] == unit["noteGroup"]))
    durations = sorted(set(int(m[1])*60+int(m[2]) for e in main.walk() if e.tag == "div" and (m := re.fullmatch(r"(\d{1,3}):(\d{2})", normalized(e)))))
    result = {**source, "url": url, "htmlSha256": hashlib.sha256(html.encode()).hexdigest(), "allIds": [e.attrs["id"] for e in main.walk() if e.attrs.get("id")], "units": units, "links": links, "media": media, "durationSeconds": durations}
    if repeated_headers:
        result["ignoredRepeatedTableHeaders"] = repeated_headers
    (out / (source["id"] + ".json")).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"id": source["id"], "units": len(units), "chars": sum(u["chars"] for u in units), "notes": sum(u["note"] for u in units), "links": len(links)}


if __name__ == "__main__":
    manifest = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8-sig"))
    out = Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for summary in pool.map(lambda s: inspect(s, out), manifest):
            print(json.dumps(summary, ensure_ascii=False), flush=True)
