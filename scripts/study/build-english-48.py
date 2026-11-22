"""Build week 48 English reading positions from the reviewed official documents.

From the repository root, run audit-sources.py with the English source manifest
and test-results/english48 as its cache, then run this script. Only IDs, original
range fingerprints, titles and audit metadata are written to tracked files.
"""
import hashlib
import importlib.util
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

sys.dont_write_bytecode = True
DOCS = Path("docs/study")
DATA = Path("src/data")
CACHE = Path("test-results/english48")
CANONICAL = DOCS / "2026-week-48-sources.json"
MANIFEST = DOCS / "2026-english-48-sources.json"
PLAN = DATA / "cfm-2026-week-48.json"
EDITION = DATA / "cfm-2026-week-48-english.json"
METADATA = {"reference1", "short_reference1"}
RANGE_KEYS = ("path", "sourceLang", "anchor", "endAnchor", "selectedIds")
UNIT_KEYS = ("anchor", "verseNumbers", "note", "noteOwners", "sha256")

WEEKLY_VERSES = {
    "amos": [15, 16, 15, 13, 27, 14, 17, 14, 15],
    "obad": [21],
    "jonah": [17, 10, 10, 11],
}
BOOKS = {
    "amos": "Amos", "obad": "Obadiah", "jonah": "Jonah", "deut": "Deuteronomy",
    "ezek": "Ezekiel", "eph": "Ephesians", "1-ne": "1 Nephi", "2-ne": "2 Nephi",
    "dc": "Doctrine and Covenants", "hel": "Helaman", "john": "John", "enos": "Enos",
    "mosiah": "Mosiah", "alma": "Alma", "mark": "Mark", "luke": "Luke",
    "3-ne": "3 Nephi", "matt": "Matthew", "2-kgs": "2 Kings", "isa": "Isaiah",
    "morm": "Mormon", "a-of-f": "Articles of Faith",
}
# The Teh paragraph and prompt share p5 in English. The Holland reference
# separates from p16. The five study helps have translation-specific IDs.
MANUAL = {
    "p_cpCYU": ["p5"], "p16": ["p16", "p_iKlGQ"],
    "p_pueAg": ["p_eSea6"], "p_mDCN3": ["p_dAXAE"], "p_kxrr6": ["p_qD7UF"],
    "p_ikipw": ["p_kfhoD"], "p_ovYrY": ["p_wdCqL"],
}
NAMES = {"manual": "Come, Follow Me", "helps": "Scripture Helps",
         "children": "Children’s resources", "appendix": "Appendix B",
         "23-weekly-scripture-fun": "Weekly Scripture Fun",
         "prophets": "Prophets study guide",
         "08-chapter-3-lesson-1": "The Restoration",
         "26-paper-whale-craft": "Paper Whale Craft"}
SECTIONS = {
    "주간 도입과 세 선지자": "Meet the three prophets",
    "아모스의 시대와 나실인": "The setting of Amos and the Nazarites",
    "선지자의 음성을 알아보는 징후": "Recognizing the voice of a prophet",
    "선지자를 통해 전하시는 말씀": "God speaks through His prophets",
    "오늘의 선지자에게서 배우기": "Learning from the living prophet",
    "선지자에 관한 두 읽을거리": "Two readings about prophets",
    "선지자가 전하는 사랑의 증거": "Prophets as a sign of God’s love",
    "오늘날 선지자가 필요한 이유": "Why we need prophets today",
    "선지자의 역할": "The role of prophets",
    "권고를 받아들인 두 백성": "Two peoples respond to counsel",
    "증인들을 통해 주신 가르침": "Learning from witnesses",
    "시련 속에서 주님께 돌아가기": "Turning to the Lord in trials",
    "선을 구하고 살라는 초대": "Seek good and live",
    "여호와의 날": "The day of the Lord",
    "거짓 선지자를 분별하는 성구": "Scriptures on discerning false prophets",
    "선지자를 지지하는 방법": "Sustaining the prophet",
    "주님의 종을 받아들이는 일": "Receiving the Lord’s servants",
    "하나님의 말씀에 대한 기근": "A famine of God’s word",
    "대배도와 복음의 회복": "The Great Apostasy and the Restoration",
    "대배도 영상 안내": "Introducing The Great Apostasy video",
    "영적인 기근": "Spiritual famine",
    "복음의 회복에 관한 공과": "A lesson about the Restoration",
    "회복을 가르치기 위한 제언": "Preparing to teach the Restoration",
    "사도와 선지자의 역할": "The work of apostles and prophets",
    "현대 선지자들의 간증과 그리스도의 교리": "Modern prophets and the doctrine of Christ",
    "구주의 가르침과 베드로의 계시": "The Savior’s teaching and Peter’s revelation",
    "평의회의 계시와 간증": "Revelation in council and testimony",
    "다림줄의 뜻": "The meaning of the plumb line",
    "첫번째 시현과 신권의 회복": "The First Vision and the restoration of the priesthood",
    "아모스와 요나가 배운 자비": "What Amos and Jonah learned about mercy",
    "시온 산의 구원자": "Saviors on Mount Zion",
    "시온 산의 성전 찬송": "A hymn about the temple",
    "오바댜와 성전 사업": "Obadiah and temple work",
    "하나님의 사랑과 선지자와 구주": "God’s love, prophets, and the Savior",
    "선지자의 말씀에 대한 확증": "A witness of prophetic counsel",
    "영적인 확증과 주님의 인도": "Spiritual confirmation and the Lord’s guidance",
    "요나와 복음을 전한 이들을 비교하기": "Compare Jonah with other missionaries",
    "요나에게 베푸신 은혜": "Mercy shown to Jonah",
    "다림줄과 니느웨와 박넝쿨에 관한 도움말": "The plumb line, Nineveh, and the gourd",
    "요나와 니느웨": "Jonah and Nineveh",
    "기도와 박넝쿨": "Jonah’s prayer and the gourd",
    "요나와 두 번째 기회": "Jonah and a second chance",
    "아모스와 요나 그림": "Images of Amos and Jonah",
    "몰몬경과 성신의 증거": "The Book of Mormon and the witness of the Holy Ghost",
    "다섯째 일요일 활동 선택": "Choosing a fifth-Sunday activity",
    "그리스도의 교리": "The doctrine of Christ",
    "선지자의 말씀 전하기": "Sharing the prophet’s message",
    "선지자를 따르는 노래와 이야기": "A song and story about following the prophet",
    "10월 26일 주의 활동": "October 26 activities",
    "아모스 3:7을 외우는 방법": "Memorizing Amos 3:7",
    "침례와 성약": "Baptism and covenants",
    "회복과 영적 기근": "The Restoration ends spiritual famine",
    "회복된 복음의 노래와 색칠 활동": "A Restoration song and coloring activity",
    "확인과 성신": "Confirmation and the Holy Ghost",
    "이스라엘의 집합 활동": "An activity about gathering Israel",
    "11월 2일 주의 이스라엘 집합": "November 2 activity about gathering Israel",
    "11월 9일 주의 다니엘 활동": "November 9 Daniel activity",
    "11월 16일 주의 성신 활동": "November 16 Holy Ghost activity",
    "성찬": "The sacrament",
    "선지자 요나 이야기와 활동 그림": "The story of Jonah and an activity page",
    "이번 주 가족 활동 그림": "This week’s family activity page",
    "요나가 회개하고 다시 시작한 과정": "How Jonah repented and began again",
    "요나 색칠·다니엘 이야기·종이 고래·영상": "Jonah coloring page, Daniel story, paper whale, and video",
    "신권의 권능과 열쇠": "Priesthood power and keys",
    "요나에게 주님의 자비를 묻기": "Ask Jonah about the Lord’s mercy",
    "구주께서 자비를 베푸신 세 장면": "Three examples of the Savior’s mercy",
    "요나와 굶주린 사람들을 먹이신 예수님": "Jonah and Jesus feeding the hungry",
    "요나와 하나님의 계획": "Jonah and God’s plan",
    "성전과 행복의 계획": "Temples and the plan of happiness",
    "더 찾아볼 자료와 요나 그림": "More resources and Jonah artwork",
}
MANUAL_PLAYERS = {
    "figure7": ("The Great Apostasy", "16:36"),
    "figure8": ("After the New Testament", "2:52"),
    "figure9": ("Jonah the Prophet", "2:30"),
}
WORKSHEET = "figure5_img2"
ALIASES = {
    "manual": MANUAL,
    "08-chapter-3-lesson-1": {
        "figure9_p1": ["figure9_p1", "figure9_p2"],
        "figure15_p1": ["figure15_p1", "figure15_p2"],
    },
    "chapter-11-follow-the-living-prophet": {
        "title_number1": ["reference1", "short_reference1", "title_number1"],
    },
}


def read(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8")


def verse_numbers(rows):
    return {number for unit in rows for number in unit["verseNumbers"]}


def ranges(numbers):
    groups = []
    for verse in sorted(numbers):
        if groups and groups[-1][-1] + 1 == verse:
            groups[-1].append(verse)
        else:
            groups.append([verse])
    return ", ".join(str(group[0]) if len(group) == 1 else
                     f"{group[0]}–{group[-1]}" for group in groups)


def visible_order(rows):
    return [row["anchor"] for row in rows if not row["note"]]


def english_aliases(source, anchors):
    result = []
    for anchor in anchors:
        for counterpart in ALIASES.get(source, {}).get(anchor, [anchor]):
            if counterpart not in result:
                result.append(counterpart)
    return result


def title(source, rows):
    return NAMES.get(source) or next(unit["text"] for unit in rows
                                    if unit["anchor"] == "title1" or unit["tag"] == "h1")


def source_label(source, doc, rows, task, count):
    if source == "manual" and len(rows) == 1 and rows[0]["anchor"] in MANUAL_PLAYERS:
        return " · ".join(MANUAL_PLAYERS[rows[0]["anchor"]])
    if verse_numbers(rows):
        book, chapter = doc["path"].split("/")[-2:]
        return f"{BOOKS[book]} {chapter}:{ranges(verse_numbers(rows))}"
    label = title(source, doc["units"])
    if count > 1:
        section = SECTIONS[task["label"].split(" · ")[-1]]
        return f"{label} · {section}"
    return label


def include_assigned_players(source, doc, tree):
    if source["id"] != "manual":
        return
    assigned = set(visible_order(source["units"])) & MANUAL_PLAYERS.keys()
    positions = {anchor: i for i, anchor in enumerate(doc["allIds"])}
    for anchor in sorted(assigned):
        node = next(node for node in tree.root.walk()
                    if node.attrs.get("id") == anchor and node.tag == "figure")
        label, duration = MANUAL_PLAYERS[anchor]
        actual = audit.normalized(node)
        assert label in actual and duration in actual, (anchor, "English player mismatch")
        doc["units"].append(dict(anchor=anchor, tag="figure", text=label, note=False,
                                 verseNumbers=[], noteOwners=[],
                                 sha256=hashlib.sha256(actual.encode()).hexdigest()))
    if WORKSHEET in visible_order(source["units"]):
        image = next(node for node in tree.root.walk() if node.attrs.get("id") == WORKSHEET)
        assert image.tag == "img" and "Primary activity page" in image.attrs["alt"]
        doc["units"].append(dict(anchor=WORKSHEET, tag="img", text="Primary activity page",
                                 note=False, noteOwners=[], verseNumbers=[],
                                 sha256=hashlib.sha256(image.attrs["alt"].encode()).hexdigest()))
    doc["units"].sort(key=lambda unit: positions[unit["anchor"]])


def verify_visible_dom(tree, variants):
    selected = {anchor for variant in variants for anchor in variant["selectedIds"]}
    found = set()
    for node in tree.root.walk():
        anchor = node.attrs.get("id")
        if anchor not in selected or audit.repeated_table_header(node):
            continue
        assert anchor not in found, ("duplicate selection in HTML", anchor)
        assert not any(parent.attrs.get("id") in selected for parent in node.parents()), (
            "nested selected body", anchor)
        found.add(anchor)
    assert found == selected, ("missing DOM selection", selected - found)


audit_spec = importlib.util.spec_from_file_location("audit", Path(__file__).with_name("audit-sources.py"))
audit = importlib.util.module_from_spec(audit_spec)
audit_spec.loader.exec_module(audit)


def main():
    tasks = defaultdict(list)
    for day in read(PLAN)["days"]:
        for track in ("adultTasks", "familyTasks"):
            if day["day"] == 7:
                assert not day[track], "Sunday must have no new reading"
            for task in day[track]:
                tasks[task["sourceId"]].append(task)
    canonical = read(CANONICAL)
    assert set(tasks) == {source["id"] for source in canonical}
    recorded = {s["id"]: s for s in read(MANIFEST)} if MANIFEST.exists() else {}
    editions, manifest = {}, []
    for source in canonical:
        sid = source["id"]
        doc = read(CACHE / f"{sid}.json")
        html = (CACHE / f"{sid}.html").read_text(encoding="utf-8")
        assert doc["lang"] == "eng" and doc["path"] == source["path"]
        assert re.search(r'<html\b[^>]*\blang="en"', html)
        assert hashlib.sha256(html.encode()).hexdigest() == doc["htmlSha256"]
        if sid in recorded:
            assert recorded[sid]["htmlSha256"] == doc["htmlSha256"], (sid, "review changed English source")
            assert recorded[sid]["canonicalHtmlSha256"] == source["htmlSha256"], (sid, "review changed canonical source")
        tree = audit.Tree(html)
        include_assigned_players(source, doc, tree)
        scripture = re.search(r"/scriptures/(ot|nt|dc-testament|bofm|pgp)/", doc["path"])
        body = [unit for unit in doc["units"] if not unit["note"]]
        if scripture:
            book, chapter = doc["path"].split("/")[-2:]
            if book in WEEKLY_VERSES and doc["path"].startswith("/study/scriptures/ot/"):
                assert verse_numbers(body) == set(range(1, WEEKLY_VERSES[book][int(chapter) - 1] + 1))
        expected = set(visible_order(body))
        if "verses" in source:
            wanted = set(source["verses"])
            assert wanted <= verse_numbers(body), (sid, "declared verses missing")
            expected = {u["anchor"] for u in body if wanted.intersection(u["verseNumbers"])}
        by_id = {u["anchor"]: u for u in source["units"]}
        assigned = tasks[sid]
        if not scripture and len(assigned) > 1:
            # The canonical inventory appends independently addressable players
            # and the activity image after its textual rows.
            media = (set(MANUAL_PLAYERS) | {WORKSHEET}) if sid == "manual" else set()
            aliases = english_aliases(sid, visible_order(source["units"]))
            assert [a for a in aliases if a not in media] == [a for a in visible_order(body) if a not in media], (
                sid, "split article needs a reviewed translation mapping")
        owners = {}
        variants = []
        for task in assigned:
            original_rows = [by_id[a] for a in task["sourceIds"] if not by_id[a]["note"]]
            if scripture:
                wanted = verse_numbers(original_rows)
                has_header = any(not u["verseNumbers"] for u in original_rows)
                rows = [u for u in body if wanted.intersection(u["verseNumbers"])
                        or (has_header and not u["verseNumbers"])]
                assert verse_numbers(rows) == wanted, (task["id"], "verse mismatch")
            elif len(assigned) == 1:
                rows = body
            else:
                selected = set(english_aliases(sid, visible_order(original_rows)))
                rows = [u for u in body if u["anchor"] in selected]
            ids = visible_order(rows)
            for anchor in ids:
                assert anchor not in owners, (sid, task["id"], anchor, "duplicate body")
                owners[anchor] = task["id"]
            visible = [anchor for anchor in ids if anchor not in METADATA]
            variant = dict(original={key: task[key] for key in RANGE_KEYS}, path=doc["path"],
                           anchor=visible[0], endAnchor=visible[-1], selectedIds=visible,
                           noteLinks=[], label=source_label(sid, doc, rows, task, len(assigned)))
            assert not task.get("readingNote"), (task["id"], "provide an English reading note")
            if sid == "manual" and "p3" in task["sourceIds"]:
                variant["readingNote"] = ("The English manual links to the Bible Dictionary. "
                    "This plan uses the three assigned entries in the Guide to the Scriptures.")
            editions[task["id"]] = variant
            variants.append(variant)
        assert set(owners) == expected, (sid, "scope mismatch", set(owners) ^ expected)
        scoped = []
        for unit in doc["units"]:
            if unit["note"]:
                citing = [a for a in unit["noteOwners"] if a in owners and a not in METADATA]
                if citing:
                    owner = citing[0]
                    editions[owners[owner]]["noteLinks"].append(dict(note=unit["anchor"], owner=owner))
                elif "verses" in source:
                    continue
            elif unit["anchor"] not in expected:
                continue
            scoped.append({key: unit[key] for key in UNIT_KEYS})
        verify_visible_dom(tree, variants)
        manifest.append(dict(id=sid, path=doc["path"], lang="eng", retrieved="2026-11-23",
                             htmlSha256=doc["htmlSha256"], canonicalHtmlSha256=source["htmlSha256"],
                             scope=source["scope"], units=scoped))
    write(EDITION, dict(version=1, week=48, lang="eng", tasks=editions))
    write(MANIFEST, manifest)
    print(f"Week 48 English: {len(editions)} tasks, {len(manifest)} sources, "
          f"{sum(len(s['units']) for s in manifest)} scoped units.")


if __name__ == "__main__":
    main()
