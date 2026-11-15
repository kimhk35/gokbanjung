"""Build the reviewed English equivalents of the existing week 44 tasks.

Run from the repository root after audit-sources.py has populated the ignored
test-results/english44 cache. This is an offline builder, not an automatic
translation/alignment tool: the review file pins the inspected source bodies
and canonical task signatures. Changed inputs require a new semantic review.
The original Korean allocation and its completion IDs are never rewritten.
"""
import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / "test-results/english44"
REVIEW_PATH = ROOT / "docs/study/2026-english-44-review.json"
OUTPUT = ROOT / "src/data/cfm-2026-week-44-english.json"
SOURCES_OUTPUT = ROOT / "docs/study/2026-english-44-sources.json"
RESULT_OUTPUT = ROOT / "docs/study/2026-english-44-audit.json"
HIDDEN_METADATA = {"reference1", "short_reference1"}

# These sources were compared by meaning, citations, and section boundaries.
# Keeping the IDs is the reviewed result, not the criterion for approval.
REVIEWED_SAME_ID_SPLITS = {"helps", "children", "bednar", "cook", "teaching", "andersen", "ballard"}
MANUAL_ID_MAP = {
    "p_h066E": "p_zPEti",  # Scripture Helps
    "p_jYLoa": "p_iImft",  # Who was Baruch?
    "p_opNyv": "p_mgM61",  # Jeremiah 37 historical context
    "p_mJlX6": "p_mPtvc",  # Zedekiah's rejection of Jeremiah's warning
    "p_a8DzN": "p_cNrs4",  # More Scripture Helps
}
PARTIAL_VERSES = {"jer1": [10], "matt5": [4], "james4": [8, 9, 10], "alma36": [17, 18, 19, 20], "mosiah18": [10, 13]}
TITLES = {
    "manual": "Weekly manual", "helps": "Scripture Helps", "children": "Additional Resources for Teaching Children",
    "gs-lamentations": "Lamentations, Book of", "gs-covenant": "New and Everlasting Covenant",
    "walker": "A Peculiar Treasure", "bednar": "Abide in Me, and I in You; Therefore Walk with Me",
    "andersen": "The Triumph of Hope", "christofferson": "When Thou Art Converted",
    "cook": "Lamentations of Jeremiah: Beware of Bondage", "ballard": "The Joy of Hope Fulfilled",
    "evening": "An Evening with Elder David A. Bednar", "teaching": "Invite Diligent Learning",
    "hymn115": "Come, Ye Disconsolate", "family-song73": "Help Us, O God, to Understand",
    "family-source-1": "Not Alone", "family-source-2": "The Stripling Warriors", "family-source-3": "Covenants with God",
    "family-source-4": "Weekly Scripture Fun — the linked October article", "family-source-5": "Moroni Buried the Gold Plates",
    "family-source-6": "Nephi’s Courage", "family-source-7": "Different but Not Alone", "family-source-8": "Travis’s Song",
    "family-source-9": "Safe in the Fire", "family-source-10": "Repentance Is a Good Thing!",
    "ne1": "1 Nephi 1", "ne2": "1 Nephi 2", "jer1": "Jeremiah 1:10", "matt5": "Matthew 5:4",
    "james4": "James 4:8–10", "alma36": "Alma 36:17–20", "mosiah18": "Mosiah 18:10, 13",
    **{f"jer{n}": f"Jeremiah {n}" for n in [31, 32, 33, 36, 37, 38, 39]},
    "lam1": "Lamentations 1", "lam3": "Lamentations 3",
}
TASK_SUBTITLES = {
    1: "Introduction and restoration", 2: "The new covenant", 3: "Writing the covenant in our hearts",
    4: "Responding to the scriptures", 5: "Following the prophets", 6: "Standing for what is right",
    7: "Sorrow and mercy", 8: "Take responsibility for your learning", 9: "Scripture Helps overview",
    10: "Who was Baruch?", 11: "Jeremiah 37 in context", 12: "Zedekiah and Jeremiah’s warning",
    13: "Everlasting love", 14: "Writing covenants on a heart", 15: "Acting out the scriptures",
    16: "The courage of Ebed-melech", 17: "Forgiveness and hope", 18: "Ebed-melech picture and activity",
    40: "Part 1/2 · Abiding in the Lord", 41: "Part 2/2 · Planting the word and walking with Him",
    42: "Part 1/2 · Study and prayer", 43: "Part 2/2 · Service and protection",
    44: "Part 1/2 · Jeremiah and Lehi", 45: "Part 2/2 · Bondage and choices today",
    46: "Part 1/3 · Hope for eternal life", 47: "Part 2/3 · God, hope, and the temple", 48: "Part 3/3 · Hope in adversity",
    49: "Part 1/3 · Discouragement and the Lord’s invitation", 50: "Part 2/3 · Nurturing hope through faith", 51: "Part 3/3 · Experiences and testimony",
    52: "Part 1/7 · Inviting learning", 53: "Part 2/7 · Responsibility for learning", 54: "Part 3/7 · Daily scripture study",
    55: "Part 4/7 · Preparing to learn", 56: "Part 5/7 · Sharing truths", 57: "Part 6/7 · Living what we learn", 58: "Part 7/7 · Ways to apply learning",
    59: "Full video 76:22 · transcript not audited",
    61: "Introduction and Rachel", 62: "The new covenant and land purchase", 63: "The Branch of righteousness",
    64: "Baruch", 65: "The time of Zedekiah", 66: "Prophecy fulfilled", 67: "Lamentations: poetry and imagery",
    68: "Learn more: hope", 69: "Learn more: the heart", 70: "Learn more: bondage",
    71: "Images: Jeremiah", 72: "Image: Ebed-melech", 73: "Image: Jeremiah’s lament",
    74: "Introduction and everlasting love", 75: "Covenants and the stripling warriors", 76: "Living our covenants",
    77: "Scriptures and coloring", 78: "Songs and courage", 79: "Stories of courage", 80: "Forgiveness and hope",
}


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def original(task):
    return {key: task[key] for key in ["path", "sourceLang", "anchor", "endAnchor", "selectedIds"]}


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def visible(doc):
    return [u for u in doc["units"] if not u["note"] and u["anchor"] not in HIDDEN_METADATA]


def verse_set(units):
    return sorted({v for u in units for v in u["verseNumbers"]})


def main():
    plan = read(ROOT / "src/data/cfm-2026-week-44.json")
    review = read(REVIEW_PATH)
    canonical_sources = {s["id"]: s for s in read(ROOT / "docs/study/2026-week-44-sources.json")}
    tasks = [(day["day"], track, task) for day in plan["days"] for track in ["adultTasks", "familyTasks"] for task in day[track]]
    signatures = {task["id"]: original(task) for _, _, task in tasks}
    assert digest(signatures) == review["canonicalTaskSignaturesSha256"], "The approved allocation changed; review the mappings again."
    docs = {sid: read(CACHE / f"{sid}.json") for sid in canonical_sources}
    for sid, doc in docs.items():
        assert doc["lang"] == "eng" and doc["path"] == canonical_sources[sid]["path"]
        assert doc["htmlSha256"] == review["sources"][sid]["englishHtmlSha256"], f"{sid}: source changed since semantic review"
        assert canonical_sources[sid]["htmlSha256"] == review["sources"][sid]["originalHtmlSha256"], f"{sid}: original source changed"
        assert not any(re.search(r"[가-힣]", u["text"]) for u in visible(doc)), f"{sid}: English request returned Korean text"

    by_source = defaultdict(list)
    result = {"version": 1, "week": 44, "lang": "eng", "tasks": {}}
    task_audit = []
    for day, track, task in tasks:
        sid, doc = task["sourceId"], docs[task["sourceId"]]
        body = visible(doc)
        english_ids = [u["anchor"] for u in body]
        source_units = {u["anchor"]: u for u in canonical_sources[sid]["units"]}
        original_selected = [source_units[a] for a in task["selectedIds"]]
        expected_verses = verse_set(original_selected)
        if sid == "manual":
            selected = [MANUAL_ID_MAP.get(a, a) for a in task["selectedIds"]]
            method = "reviewed semantic section/paragraph mapping; five explicit help-link replacements"
        elif sid in REVIEWED_SAME_ID_SPLITS:
            selected = task["selectedIds"][:]
            method = "reviewed corresponding meanings, citations, and section boundaries"
        elif sid == "christofferson":
            # Korean p5+p6 -> English p5; p9–p11 -> p8; p12–p14 -> p9.
            # The next Korean task starts with service at p15 -> English p10.
            selected = english_ids[:english_ids.index("p9") + 1] if task["id"] == "w44-t042" else english_ids[english_ids.index("p10"):]
            assert task["id"] in {"w44-t042", "w44-t043"}
            method = "explicit translated paragraph merge: study/prayer ends p9; service/protection starts p10"
        elif sid in PARTIAL_VERSES:
            assert expected_verses == PARTIAL_VERSES[sid]
            selected = [u["anchor"] for u in body if set(u["verseNumbers"]) & set(expected_verses)]
            method = "same logical scripture verses, read from the published verse labels"
        elif task["kind"] == "scripture":
            assert expected_verses == verse_set(body), f"{sid}: complete chapter verse mismatch"
            selected = english_ids
            method = "complete matching scripture chapter and verse set; English headings and notes"
        elif sid == "evening":
            assert task["selectedIds"] == ["title1"]
            selected = ["title1"]
            method = "same video player and title metadata only; transcript remains unaudited"
        else:
            assert {u["anchor"] for u in original_selected} == {
                u["anchor"] for u in canonical_sources[sid]["units"]
                if not u["note"] and u["anchor"] not in HIDDEN_METADATA
            }, f"{sid}: this task is not a complete original article"
            selected = english_ids
            method = "same complete official article/song, including its English front matter and ending"
        assert selected and len(selected) == len(set(selected))
        assert set(selected) <= set(english_ids), f"{sid}: unknown or nonbody English anchors"
        assert selected == sorted(selected, key=english_ids.index), f"{sid}: source order changed"
        selected_units = [u for u in body if u["anchor"] in selected]
        assert verse_set(selected_units) == expected_verses, f"{task['id']}: logical verses changed"
        number = int(task["id"].split("t")[-1])
        label = TITLES[sid]
        if number in TASK_SUBTITLES:
            label += " · " + TASK_SUBTITLES[number]
        elif sid not in PARTIAL_VERSES:
            label += " · Full reading"
        variant = {
            "path": task["path"], "anchor": selected[0], "endAnchor": selected[-1],
            "selectedIds": selected, "noteLinks": [], "label": label, "original": original(task),
        }
        result["tasks"][task["id"]] = variant
        by_source[sid].append((task["id"], variant))
        task_audit.append({"taskId": task["id"], "day": day, "track": track, "sourceId": sid, "method": method,
                           "originalSelectedIds": task["selectedIds"], "englishSelectedIds": selected,
                           "logicalVerses": expected_verses})

    source_manifest, exceptions = [], []
    for sid, doc in docs.items():
        body = visible(doc)
        body_ids = [u["anchor"] for u in body]
        owned = Counter(a for _, task in by_source[sid] for a in task["selectedIds"])
        assert all(n == 1 for n in owned.values()), f"{sid}: overlapping English task bodies"
        expected_body = ([u for u in body if set(u["verseNumbers"]) & set(PARTIAL_VERSES[sid])]
                         if sid in PARTIAL_VERSES else [u for u in body if u["anchor"] == "title1"]
                         if sid == "evening" else body)
        assert set(owned) == {u["anchor"] for u in expected_body}, f"{sid}: missing or extra English body"
        included_notes = []
        for note in [u for u in doc["units"] if u["note"]]:
            owners = [a for a in note["noteOwners"] if a in owned]
            if not owners:
                reason = "Unlinked Notes section heading, not a reading paragraph" if not note["noteOwners"] else "Footnote belongs only to verses outside the original assigned scope"
                if not note["noteOwners"]:
                    assert note["text"] == "Notes", f"{sid}: unexplained orphan note"
                exceptions.append({"sourceId": sid, "anchor": note["anchor"], "reason": reason})
                continue
            owner = min(owners, key=body_ids.index)
            owner_tasks = [(tid, task) for tid, task in by_source[sid] if owner in task["selectedIds"]]
            assert len(owner_tasks) == 1
            owner_tasks[0][1]["noteLinks"].append({"note": note["anchor"], "owner": owner})
            included_notes.append(note)
        expected_ids = {u["anchor"] for u in expected_body + included_notes}
        scoped_units = [{key: value for key, value in u.items() if key != "text"}
                        for u in doc["units"] if u["anchor"] in expected_ids]
        excluded_body = [u["anchor"] for u in doc["units"] if not u["note"] and u["anchor"] not in expected_ids]
        source_manifest.append({"id": sid, "title": TITLES[sid], "path": doc["path"], "lang": "eng", "retrieved": review["reviewed"],
                                "htmlSha256": doc["htmlSha256"], "scope": canonical_sources[sid]["scope"], "units": scoped_units,
                                "excludedBodyIds": excluded_body, "media": doc["media"], "durationSeconds": doc["durationSeconds"]})

    body_keys = [(v["path"], anchor) for v in result["tasks"].values() for anchor in v["selectedIds"]]
    note_keys = [(v["path"], note["note"]) for v in result["tasks"].values() for note in v["noteLinks"]]
    assert len(body_keys) == len(set(body_keys))
    assert len(note_keys) == len(set(note_keys))
    for variant in result["tasks"].values():
        assert all(n["owner"] in variant["selectedIds"] for n in variant["noteLinks"])
    audit = {"version": 1, "week": 44, "lang": "eng", "reviewed": review["reviewed"],
             "counts": {"sources": len(docs), "tasks": len(tasks), "selectedBodyUnits": len(body_keys),
                        "attachedNoteUnits": len(note_keys), "missingBodyUnits": 0, "duplicateBodyUnits": 0,
                        "duplicateNoteUnits": 0, "verseSetMismatches": 0, "fallbackTasks": 0},
             "checks": ["reviewed source hashes", "canonical task signatures", "actual English bodies", "exact scoped English body coverage",
                        "no body or note duplication", "English note ownership", "logical scripture verse equality", "source order and range endpoints"],
             "tasks": task_audit, "excludedNotes": exceptions,
             "limitations": ["Local source/data inspection only; browser blue-range verification is recorded separately by the lead.",
                             "An Evening with Elder David A. Bednar retains the original metadata/player-only scope; the full transcript was not audited.",
                             "Bibliographic reference1/short_reference1 and unlinked Notes headings are display metadata, not separately assigned reading units.",
                             "English notes are the official English edition's notes, not translations of Korean note IDs."]}
    write(OUTPUT, result)
    write(SOURCES_OUTPUT, source_manifest)
    write(RESULT_OUTPUT, audit)
    print(json.dumps(audit["counts"], ensure_ascii=False))


if __name__ == "__main__":
    main()
