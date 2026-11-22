"""Build week 48 from the official source manifest and the ignored HTML cache.

Collect first with audit-sources.py docs/study/2026-week-48-sources.json
test-results/week48. Only verified positions, hashes and authorship metadata
are written to the repository. The curriculum title names three complete books.
"""

import csv
import hashlib
import importlib.util
import json
import re
import sys
from collections import defaultdict
from pathlib import Path
from urllib.parse import urljoin, urlsplit

sys.dont_write_bytecode = True
sys.stdout.reconfigure(encoding="utf8")
cache = Path("test-results/week48")
docs = Path("docs/study")
manifest_file = docs / "2026-week-48-sources.json"
config = json.loads(manifest_file.read_text("utf8"))
spec = importlib.util.spec_from_file_location("audit", Path(__file__).with_name("audit-sources.py"))
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)
sources = {}
scoped = {}
trees = {}
for entry in config:
    sid = entry["id"]
    data = sources[sid] = json.loads((cache / (sid + ".json")).read_text("utf8"))
    assert (data["path"], data["lang"]) == (entry["path"], entry["lang"]), sid
    html = (cache / (sid + ".html")).read_text("utf8")
    assert hashlib.sha256(html.encode()).hexdigest() == data["htmlSha256"], (
        sid,
        "refresh the parsed cache",
    )
    tree = trees[sid] = audit.Tree(html)
    assert (
        next(n for n in tree.root.walk() if n.tag == "html").attrs["lang"]
        == {"kor": "ko", "eng": "en"}[data["lang"]]
    ), sid
    rows = list(data["units"])
    if "verses" in entry:
        wanted = set(entry["verses"])
        selected = {u["anchor"] for u in rows if wanted.intersection(u["verseNumbers"])}
        rows = [u for u in rows if u["anchor"] in selected or selected.intersection(u["noteOwners"])]
        assert {n for u in rows for n in u["verseNumbers"]} == wanted, (sid, wanted, rows)
    if sid == "manual":
        # Independently addressable players and the worksheet image have no
        # numbered paragraph children. Keep them beside their instructions.
        for anchor, tag in [("figure7", "figure"), ("figure8", "figure"), ("figure5_img2", "img")]:
            elem = next(n for n in tree.root.walk() if n.attrs.get("id") == anchor)
            assert elem.tag == tag and not {n.attrs.get("id") for n in elem.walk()}.intersection(
                u["anchor"] for u in rows
            ), anchor
            text = audit.normalized(elem) or elem.attrs["alt"]
            rows.append(
                dict(
                    anchor=anchor,
                    tag=tag,
                    chars=0,
                    words=0,
                    sha256=hashlib.sha256(text.encode()).hexdigest(),
                    note=False,
                    noteOwners=[],
                    verseNumbers=[],
                )
            )
    scoped[sid] = rows
titles = {c["id"]: c["title"] for c in config}
titles["children"] = "어린이용 자료"
titles["2-kgs-5"] = "열왕기하 5:1~14"
titles.update(
    {
        "dc-84": "교리와 성약 84:36~38",
        "dc-112": "교리와 성약 112:20, 30~32",
        "2-ne-32": "니파이후서 32:3",
        "luke-6": "누가복음 6:12~13",
        "apostasy": "주제 및 질문 · 배도",
        "gs-apostasy": "경전 안내서 · 배도",
    }
)
days = []
day_info = [
    (
        "선지자를 통해 들려오는 말씀",
        "The Lord speaks through prophets",
        "선지자를 통해 들은 말씀을 오늘 어떻게 실천할 수 있을까요?",
        "선지자의 말씀을 전해요",
        "Share the prophet’s message",
        "주님의 말씀을 누구에게 전하고 싶나요?",
        "서로에게 짧은 메시지를 전하고 선지자가 하는 일을 이야기해요.",
    ),
    (
        "선지자의 권고를 따르는 선택",
        "Choosing to follow prophetic counsel",
        "주님의 사랑을 느꼈던 권고에 어떻게 응답할까요?",
        "마음에 간직하는 성구",
        "Keep a scripture in your heart",
        "어떤 성구를 기억하고 싶나요?",
        "좋아하는 구절을 소리 내어 읽고 기억하는 방법을 나눠요.",
    ),
    (
        "주님을 찾고 선을 구하기",
        "Seek the Lord and seek good",
        "힘든 일 속에서도 주님을 찾는다는 것은 내게 어떤 뜻인가요?",
        "회복된 복음이 주는 힘",
        "The strength of the restored gospel",
        "복음이 회복되어 어떤 점이 기쁜가요?",
        "배도의 기근이 끝난 이야기를 듣고 회복의 축복을 그림으로 표현해요.",
    ),
    (
        "말씀의 기근과 복음의 회복",
        "A famine of the word and the Restoration",
        "하나님의 말씀에 목마를 때 나는 어디에서 채움을 얻나요?",
        "하나님은 자녀들을 모으세요",
        "God gathers His children",
        "우리 가족은 어떻게 다른 사람을 도울 수 있나요?",
        "집합에 관한 가족 활동을 하고 함께 성찬의 의미를 생각해요.",
    ),
    (
        "시온 산과 성전의 약속",
        "Mount Zion and the promises of the temple",
        "조상을 위한 봉사는 나를 어떻게 구주께 가까이 데려가나요?",
        "요나에게 주신 두 번째 기회",
        "Jonah’s second chance",
        "어려워도 순종하기 위해 어떻게 기도할까요?",
        "종이 고래와 활동 그림으로 요나의 선택을 이야기해요.",
    ),
    (
        "요나와 니느웨에 베푸신 자비",
        "Mercy for Jonah and Nineveh",
        "다시 시작할 기회를 누구에게 줄 수 있을까요?",
        "구주처럼 자비를 베풀어요",
        "Show mercy as the Savior did",
        "오늘 누구에게 자비를 베풀 수 있을까요?",
        "요나를 인터뷰하고, 구주처럼 사랑을 보일 일을 하나 정해요.",
    ),
    (
        "휴식과 밀린 분량 읽기",
        "Rest and catch up",
        "",
        "휴식과 밀린 분량 읽기",
        "Rest and catch up",
        "",
        "",
    ),
]
for n, (title, en, q, f, fe, fq, act) in enumerate(day_info, 1):
    days.append(
        dict(
            day=n,
            shortTitle=title,
            shortTitleEn=en,
            question=q,
            familyTitle=f,
            familyTitleEn=fe,
            familyQuestion=fq,
            familyActivity=act,
            adultTasks=[],
            familyTasks=[],
        )
    )
days[-1]["restDay"] = True
by_source = defaultdict(list)
chains = []
all_tasks = []
used = defaultdict(set)


def take(source_id, rows=None, label=None, kind=None, note=None):
    """Assign a source or ordered subset of it to the current day and track."""
    if rows is None:
        rows = [unit for unit in scoped[source_id] if not unit["note"]]
    anchors = [unit["anchor"] for unit in rows]
    # Keep the source's reference metadata in inventory; highlight just the reading.
    selected = [anchor for anchor in anchors if anchor not in ("reference1", "short_reference1")]
    assert selected and not used[source_id].intersection(anchors), (source_id, anchors)
    used[source_id].update(anchors)
    source = sources[source_id]
    if kind is None:
        if source_id == "manual":
            kind = "manual"
        else:
            kind = "scripture" if "/scriptures/" in source["path"] else "reading"
    display = label or titles[source_id]
    if source["lang"] == "eng":
        display += " · 영어 원문"
    assert display.strip()
    task = dict(
        id=f"w48-t{len(all_tasks) + 1:03}",
        sourceId=source_id,
        kind=kind,
        label=display,
        path=source["path"],
        sourceLang=source["lang"],
        sourceLanguageLocked=True,
        anchor=selected[0],
        endAnchor=selected[-1],
        units=[f"{source_id}#{anchor}" for anchor in anchors],
        sourceIds=anchors,
        selectedIds=selected,
        noteLinks=[],
    )
    if note:
        task["readingNote"] = note
    days[day - 1][track + "Tasks"].append(task)
    by_source[source_id].append(task)
    all_tasks.append(task)
    return task


def section(source_id, start, end, label, **kwargs):
    """Select inclusive boundaries in official document order."""
    rows = [unit for unit in scoped[source_id] if not unit["note"]]
    if source_id == "manual" and start not in ("figure7", "figure8", "figure5_img2"):
        rows = [unit for unit in rows if unit["tag"] not in ("figure", "img")]
    anchors = [unit["anchor"] for unit in rows]
    first = anchors.index(start) if start else 0
    after_last = anchors.index(end) + 1 if end else len(rows)
    return take(source_id, rows[first:after_last], label, **kwargs)


def verses(sid, numbers, label, headings=False):
    rows = [
        u
        for u in scoped[sid]
        if not u["note"]
        and (set(numbers).intersection(u["verseNumbers"]) or (headings and not u["verseNumbers"]))
    ]
    assert sorted(n for u in rows for n in u["verseNumbers"]) == sorted(numbers), sid
    return take(sid, rows, label)


def related(task, *targets):
    task["relatedTaskIds"] = list(
        dict.fromkeys(task.get("relatedTaskIds", []) + [t["id"] for t in targets])
    )


def follows(instruction, *targets):
    group = days[day - 1][track + "Tasks"]
    i = group.index(instruction) + 1
    assert group[i : i + len(targets)] == list(targets)
    chains.append((instruction["id"], ",".join(t["id"] for t in targets)))


def assign(instruction, *ids):
    follows(instruction, *(take(s) for s in ids))


def manual(a, b, label, **kw):
    return section("manual", a, b, "교재 · " + label, **kw)


def helps(a, b, label):
    return section("helps", a, b, "경전 도움말 · " + label)


def guide(a, b, label):
    return section("prophets", a, b, "선지자 학습 안내서 · " + label)


def family(a, b, label, **kw):
    return section("manual", a, b, "가족 교재 · " + label, **kw)


def children(a, b, label):
    return section("children", a, b, "어린이 자료 · " + label)


def appendix(a, b, label):
    return section("appendix", a, b, "부록 2 · " + label)


def monthly(a, b, label):
    return section("23-weekly-scripture-fun", a, b, "가족 경전 활동 · " + label)


def lesson(a, b, label):
    return section("08-chapter-3-lesson-1", a, b, "복음의 회복 · " + label)


# Monday: establish the three prophetic books, then read both exact Amos passages
# named by the manual before moving to the general conference address.
day, track = 1, "adult"
intro = manual(None, "p3", "주간 도입과 세 선지자")
assign(intro, "gs-amos", "gs-obad", "gs-jonah")
take("amos1")
take("amos2")
helps(None, "p_wPXAP", "아모스의 시대와 나실인")
q = manual("title2", "p4", "선지자의 음성을 알아보는 징후")
a3 = verses("amos3", range(1, 9), "아모스 3:1~8", True)
a7 = verses("amos7", range(10, 16), "아모스 7:10~15")
follows(q, a3, a7)
verses("amos3", range(9, 16), "아모스 3:9~15")
related(helps("p_hRG50", "p_wOj39", "선지자를 통해 전하시는 말씀"), a3)
q = manual("p5", "p_cpCYU", "오늘의 선지자에게서 배우기")
assign(q, "17teh")
q = helps("p_pTCGr", "p_vIME2", "선지자에 관한 두 읽을거리")
assign(q, "09-the-prophet-leads-us-to-jesus-christ", "amos-3-7-article")
verses("amos7", list(range(1, 10)) + [16, 17], "아모스 7장의 남은 시현과 경고", True)

day, track = 2, "adult"
q = manual("p6", "p6", "선지자가 전하는 사랑의 증거")
t = take("soares")
compare = [take(s) for s in ["deut-18", "ezek-3", "eph-4", "1-ne-22", "dc-21", "dc-84"]]
dc107 = verses("dc-107", [91, 92], "교리와 성약 107:91~92")
follows(q, t, *compare, dc107)
q = manual("p7", "p8", "오늘날 선지자가 필요한 이유")
g = guide(None, "p4", "선지자의 역할")
follows(q, g)
related(g, dc107)
g = guide("title4", "p5", "권고를 받아들인 두 백성")
assign(g, "hel-13", "3-ne-12")
g = guide("title5", "p7", "증인들을 통해 주신 가르침")
rs = [take(s) for s in ["ezek-2", "luke-1", "luke-6", "3-ne-20"]]
rs += [verses("dc-107", [23], "교리와 성약 107:23"), take("sustaining-the-prophets")]
follows(g, *rs)
related(g, compare[3])
take("amos6")
q = helps("p_yCP7r", "p_rhQgf", "복음의 회복에 관한 공과")
pg1 = lesson(None, "p51", "회복을 가르치기 위한 제언")
follows(q, pg1)

day, track = 3, "adult"
q = manual("scripture_title2", "p9", "시련 속에서 주님께 돌아가기")
a4 = verses("amos4", range(6, 14), "아모스 4:6~13")
follows(q, a4, take("hel-12"))
verses("amos4", range(1, 6), "아모스 4:1~5", True)
q = manual("p10", "p10", "선을 구하고 살라는 초대")
a5 = verses("amos5", [4, 14, 15], "아모스 5:4, 14~15")
follows(q, a5)
verses("amos5", [i for i in range(1, 28) if i not in (4, 14, 15)], "아모스 5장의 나머지 본문", True)
helps("p_aqpch", "p_y90mo", "여호와의 날")
g = guide("title_number2", "p11", "거짓 선지자를 분별하는 성구")
assign(g, "matt-24", "john-10", "dc-43")
g = guide("title8", "p12", "선지자를 지지하는 방법")
follows(g, verses("dc-107", [22], "교리와 성약 107:22"))
g = guide("title9", "p14", "주님의 종을 받아들이는 일")
assign(g, "matt-10", "3-ne-28", "dc-1", "dc-112", "chapter-11-follow-the-living-prophet")
pg2 = lesson("title14", "figure9_p3", "하나님의 사랑과 선지자와 구주")

day, track = 4, "adult"
q = manual("scripture_title3", "p11", "하나님의 말씀에 대한 기근")
a8 = verses("amos8", [11, 12], "아모스 8:11~12")
follows(q, a8, *(take(s) for s in ["john-6", "2-ne-9", "2-ne-32", "enos-1"]))
verses("amos8", list(range(1, 11)) + [13, 14], "아모스 8장의 나머지 본문", True)
q = manual("p29", "p29", "대배도와 복음의 회복")
assign(q, "apostasy")
q = manual("p12", "p12", "대배도 영상 안내")
mv = section("manual", "figure7", "figure7", "대배도 · 공식 영상", kind="video")
follows(q, mv)
helps("p_aMcqs", "p_avPfv", "영적인 기근")
g = guide("title_number3", "p18", "사도와 선지자의 역할")
follows(g, take("eph-2"))
related(g, compare[2])
g = guide("title12", "p24", "현대 선지자들의 간증과 그리스도의 교리")
dc = take("dc-124")
oaks = take("04-the-sure-witness-of-modern-prophets")
doctrine1 = section(
    "the-doctrine-of-christ", None, "p26", "그리스도의 교리 · 구주의 가르침과 베드로의 계시"
)
follows(g, dc, oaks, doctrine1)
related(g, a3)

day, track = 5, "adult"
a7r = by_source["amos7"][1]
plumb = helps("p_eIMmP", "p_qkvng", "다림줄의 뜻")
related(plumb, a7r)
take("amos9")
q = manual("scripture_title4", "p13", "시온 산의 구원자")
o = verses("obad1", [21], "오바댜 1:21")
follows(q, o, take("hinckley"))
verses("obad1", range(1, 21), "오바댜 1:1~20", True)
assign(manual("p14", "p14", "시온 산의 성전 찬송"), "mount-zion")
related(helps("p_bpl44", "p_c03fY", "오바댜와 성전 사업"), o)
doctrine2 = section("the-doctrine-of-christ", "p27", None, "그리스도의 교리 · 평의회의 계시와 간증")
related(doctrine1, doctrine2)
related(doctrine2, doctrine1)
pg3 = lesson("title35", "figure11_p3", "첫번째 시현과 신권의 회복")
g = guide("title_number4", "p28", "선지자의 말씀에 대한 확증")
follows(g, take("2-kgs-5"))
related(g, compare[4])
g = guide("title16", None, "영적인 확증과 주님의 인도")
assign(g, "isa-55", "morm-9", "a-of-f-1", "god-is-at-the-helm")

day, track = 6, "adult"
q = manual("scripture_title5", "p15", "요나와 복음을 전한 이들을 비교하기")
js = [take(s) for s in ["jonah1", "jonah2", "jonah3", "jonah4"]]
follows(q, *js, take("mosiah-28"), take("alma-17"))
q = manual("p16", "p16", "요나에게 베푸신 은혜")
ho = take("53holland")
follows(q, ho)
related(q, js[3])
petition = helps("p_i0TP0", "p_uVSzj", "아모스와 요나가 배운 자비")
related(petition, a7r, js[2], js[3])
q = manual("p_pueAg", "p_ovYrY", "다림줄과 니느웨와 박넝쿨에 관한 도움말")
h1 = helps("p_fKIjz", "p_ueZv2", "요나와 니느웨")
h2 = helps("p_igDRI", "p_hiaA4", "기도와 박넝쿨")
follows(q, h1, h2)
related(q, plumb)
q = helps("p_mvzyN", "p_wKrtZ", "요나와 두 번째 기회")
assign(q, "uceda")
related(q, ho)
helps("p_amkIG", None, "아모스와 요나 그림")
# Return to the long Preach My Gospel lesson at a real heading boundary.
rest = [
    u
    for u in scoped["08-chapter-3-lesson-1"]
    if not u["note"] and u["anchor"] not in used["08-chapter-3-lesson-1"]
]
pg4 = take("08-chapter-3-lesson-1", rest, "복음의 회복 · 몰몬경과 성신의 증거")
for i, part in enumerate([pg1, pg2, pg3, pg4]):
    neighbors = [pg1, pg2, pg3, pg4][max(i - 1, 0) : i + 2]
    related(part, *(n for n in neighbors if n is not part))

# The Primary appendix is a menu of alternative fifth-Sunday lessons. Read the
# appendix over six days; teachers/families choose which class activities to do.
day, track = 1, "family"
q = family("title8", "p17", "다섯째 일요일 활동 선택")
ap = appendix(None, "p6", "그리스도의 교리")
follows(q, ap)
q = family("scripture_title6", "p19", "선지자의 말씀 전하기")
song = take("follow-the-prophet")
follows(q, song)
related(q, a3)
q = children(None, "p_ffHib", "선지자를 따르는 노래와 이야기")
assign(q, "the-firewood-race")
related(q, song)
monthly(None, "p_bAXFA", "10월 26일 주의 활동")
day = 2
q = family("figure2_p1", "figure2_p1", "아모스 3:7을 외우는 방법")
assign(q, "scott")
related(q, a3)
appendix("title5", "p13", "침례와 성약")
day = 3
q = family("scripture_title7", "p21", "회복과 영적 기근")
sg = take("gs-apostasy")
nt = section("manual", "figure8", "figure8", "신약전서 이후의 일들 · 공식 이야기 영상", kind="video")
nt["printEdition"] = {
    "pages": "167–170",
    "ko": "https://www.churchofjesuschrist.org/bc/content/shared/content/korean/pdf/language-materials/36618_kor.pdf#page=176",
    "en": "https://www.churchofjesuschrist.org/bc/content/shared/content/english/pdf/language-materials/36618_eng.pdf#page=176",
}
follows(q, sg, nt)
related(q, a8)
q = children("p_ff7Q6", "p_ti63r", "회복된 복음의 노래와 색칠 활동")
assign(q, "on-a-golden-springtime", "the-restored-church-of-jesus-christ")
appendix("title10", "p25", "확인과 성신")
day = 4
q = children("p_jLJ33", "p_jLJ33", "이스라엘의 집합 활동")
month = monthly("p_zhN10", "p_sFjUI", "11월 2일 주의 이스라엘 집합")
follows(q, month)
monthly("p_anJk9", "p_iYNI8", "11월 9일 주의 다니엘 활동")
monthly("p_uyKg5", "p_rgsK8", "11월 16일 주의 성신 활동")
appendix("title17", "p31", "성찬")
day = 5
q = family("scripture_title8", "p22", "선지자 요나 이야기와 활동 그림")
story = take("jonah-story")
sheet = section("manual", "figure5_img2", "figure5_img2", "이번 주 가족 활동 그림", kind="reading")
follows(q, story, sheet)
q = family("p23", "p26", "요나가 회개하고 다시 시작한 과정")
related(q, *js[:3])
q = children("p_xft9F", "p_rysjq", "요나 색칠·다니엘 이야기·종이 고래·영상")
assign(q, "jonah", "25-daniel-and-the-lions-den", "26-paper-whale-craft")
appendix("title20", "p39", "신권의 권능과 열쇠")
day = 6
q = family("scripture_title9", "figure3_p1", "요나에게 주님의 자비를 묻기")
related(q, *js[1:])
q = family("p28", "p28", "구주께서 자비를 베푸신 세 장면")
assign(q, "mark-2", "luke-23", "john-8")
q = children("p_mTQuE", None, "요나와 굶주린 사람들을 먹이신 예수님")
assign(q, "jesus-fed-the-hungry")
related(q, story)
q = monthly("p_qas3k", None, "요나와 하나님의 계획")
assign(q, "follow-gods-plan")
related(q, *js[:3], by_source["26-paper-whale-craft"][0])
appendix("title25", None, "성전과 행복의 계획")
family("figure4_p1", "figure5_figure1_p1", "더 찾아볼 자료와 요나 그림")
# Verify each original language occurrence, including notes whose translated
# numbering may differ. Store only the data necessary to locate the official text.
manifest = []
inventory = []
decisions = []
media = []
counts = {}
expected_chapters = dict(
    zip(
        [*(f"amos{i}" for i in range(1, 10)), "obad1", *(f"jonah{i}" for i in range(1, 5))],
        [15, 16, 15, 13, 27, 14, 17, 14, 15, 21, 17, 10, 10, 11],
        strict=True,
    )
)
for sid, n in expected_chapters.items():
    assert sorted(v for u in scoped[sid] for v in u["verseNumbers"]) == list(range(1, n + 1)), sid
where = {
    t["id"]: (d["day"], course) for d in days for course in ["adult", "family"] for t in d[course + "Tasks"]
}
paths = {c["path"]: c["id"] for c in config}
assert len(paths) == len(set(c["id"] for c in config)) == len(config)
for c in config:
    sid = c["id"]
    data = sources[sid]
    rows = scoped[sid]
    ownership = {}
    for t in by_source[sid]:
        for anchor in t["sourceIds"]:
            assert anchor not in ownership, (sid, anchor)
            ownership[anchor] = t
    for u in rows:
        if not u["note"]:
            continue
        owners = [
            (ownership[a], a)
            for a in u["noteOwners"]
            if a in ownership and a in ownership[a]["selectedIds"]
        ]
        t, a = min(owners, key=lambda pair: pair[0]["id"]) if owners else (by_source[sid][0], None)
        t["units"].append(sid + "#" + u["anchor"])
        t["sourceIds"].append(u["anchor"])
        if a:
            t["noteLinks"].append(dict(note=u["anchor"], owner=a))
        ownership[u["anchor"]] = t
    assert set(ownership) == {u["anchor"] for u in rows}, (
        sid,
        {u["anchor"] for u in rows} - set(ownership),
    )
    assert set(ownership) <= set(data["allIds"]), sid
    node_by_id = {n.attrs["id"]: n for n in trees[sid].root.walk() if n.attrs.get("id")}
    selected = {a for t in by_source[sid] for a in t["selectedIds"]}
    all_readable = selected.union(u["anchor"] for u in data["units"] if not u["note"])
    for anchor in selected:
        descendants = {n.attrs.get("id") for n in node_by_id[anchor].walk() if n is not node_by_id[anchor]}
        assert not descendants.intersection(all_readable), (
            sid,
            anchor,
            descendants.intersection(all_readable),
        )
    source_scope = (
        ("verses " + ", ".join(map(str, c["verses"])) + " plus their notes")
        if "verses" in c
        else "full article including notes"
    )
    m = dict(
        id=sid,
        title=titles[sid],
        path=c["path"],
        lang=c["lang"],
        retrieved="2026-11-23",
        htmlSha256=data["htmlSha256"],
        scope=source_scope,
        provenance=c["provenance"],
        units=[
            {
                k: v
                for k, v in u.items()
                if k in ["anchor", "chars", "words", "sha256", "note", "verseNumbers", "noteOwners"]
            }
            for u in rows
        ],
        durationSeconds=data["durationSeconds"],
    )
    if "verses" in c:
        m["verses"] = c["verses"]
    manifest.append(m)
    for u in rows:
        t = ownership[u["anchor"]]
        daynum, tr = where[t["id"]]
        inventory.append(
            (
                sid + "#" + u["anchor"],
                sid,
                data["path"],
                u["anchor"],
                c["lang"],
                daynum,
                tr,
                t["id"],
                u["chars"] if c["lang"] == "kor" else 0,
                u["words"] if c["lang"] == "eng" else 0,
                int(u["note"]),
                u["sha256"],
            )
        )
    main = node_by_id["main"]
    for n in main.walk():
        legacy = n.attrs.get("data-legacy-href")
        href = n.attrs.get("href") if n.tag == "a" else None
        if not (legacy or href):
            continue
        owner = next((p.attrs["id"] for p in [n, *n.parents()] if p.attrs.get("id")), "main")
        link = href or legacy
        dest = urlsplit(
            urljoin("https://www.churchofjesuschrist.org" + data["path"] + ".html", link)
        ).path.removesuffix(".html")
        if dest in paths:
            resolution = (
                ("in declared source inventory (see assigned range): " + paths[dest])
                if paths[dest] != sid
                else "same-document source navigation / note"
            )
        elif sid == "manual" and owner == "p3":
            resolution = "Korean Guide to the Scriptures entries assigned"
        elif sid == "manual" and owner == "p21" and legacy:
            resolution = "old story HTML unavailable; assigned official story player at manual#figure8; see printed pages 167–170"
        elif "assets.churchofjesuschrist.org" in link or "/media/" in dest or dest.endswith(".pdf"):
            resolution = "official image, activity or media retained at source; separate playback/print contents not text-audited"
        elif sid == "appendix":
            resolution = "optional teaching resource for alternate fifth-Sunday lessons; appendix menu itself assigned"
        elif sid == "23-weekly-scripture-fun":
            resolution = (
                "another week’s activity; complete monthly article retained, supplemental links optional"
            )
        elif owner in {u["anchor"] for u in rows if u["note"]}:
            resolution = "reference in an assigned note; no recursive assignment"
        elif sid == "helps" and "scripture-helps" in dest:
            resolution = "parallel background entry from another lesson, available for optional exploration"
        elif sid == "manual" and ("/magazines/" in dest or "/books-and-lessons/" in dest):
            resolution = "open resource collection; member chooses the message"
        elif "verses" in c and owner not in ownership:
            resolution = "outside the assigned passage"
        else:
            resolution = "supporting citation or additional exploration in an assigned source"
        decisions.append((sid, owner, link, "legacy" if legacy and not href else "href", resolution))
    for n in main.walk():
        isvideo = "video" in n.attrs.get("class", "").split() and n.tag in ("div", "figure")
        pdf = n.tag == "a" and ".pdf" in n.attrs.get("href", "").lower()
        img = n.tag == "img" and n.attrs.get("alt", "").strip() and "아이콘" not in n.attrs["alt"]
        if not (isvideo or pdf or img):
            continue
        if isvideo and any("video" in p.attrs.get("class", "").split() for p in n.parents()):
            continue
        anchor = n.attrs.get("id") or next(
            (p.attrs["id"] for p in n.parents() if p.attrs.get("id")), "main"
        )
        media.append(
            (
                sid,
                anchor,
                "player" if isvideo else "PDF" if pdf else "image",
                n.attrs.get("href") or n.attrs.get("alt") or audit.normalized(n)[:120],
                ",".join(re.findall(r"\b\d{1,3}:\d{2}", audit.normalized(n))) if isvideo else "",
            )
        )
for d in days:
    assert bool(d["adultTasks"]) == bool(d["familyTasks"]) == (d["day"] <= 6)
plan = dict(version=1, week=48, dates="2026-11-23/2026-11-29", days=days)


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf8")


save(Path("src/data/cfm-2026-week-48.json"), plan)
save(manifest_file, manifest)
for name, header, records in [
    (
        "source-inventory",
        (
            "unit",
            "source",
            "path",
            "anchor",
            "lang",
            "day",
            "track",
            "task",
            "koChars",
            "enWords",
            "note",
            "sha256",
        ),
        inventory,
    ),
    ("source-links", ("source", "owner", "href", "linkType", "decision"), decisions),
    ("media", ("source", "anchor", "kind", "labelOrURL", "displayDuration"), media),
    ("reading-chains", ("instructionTask", "targetTasks"), chains),
]:
    with (docs / f"2026-week-48-{name}.csv").open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(records)
for d in days:
    counts[d["day"]] = {}
    for tr in ["adult", "family"]:
        owned = [r for r in inventory if r[5:7] == (d["day"], tr)]
        counts[d["day"]][tr] = dict(
            tasks=len(d[tr + "Tasks"]),
            units=len(owned),
            chars=sum(r[8] for r in owned),
            words=sum(r[9] for r in owned),
            notes=sum(r[10] for r in owned),
        )
print(
    json.dumps(
        dict(
            sources=len(config),
            tasks=len(all_tasks),
            weeklyVerses=sum(expected_chapters.values()),
            units=len(inventory),
            chains=len(chains),
            days=counts,
        ),
        ensure_ascii=False,
        indent=2,
    )
)
