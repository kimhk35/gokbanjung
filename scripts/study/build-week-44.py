"""Build the reviewed week 44 allocation from separately collected source metadata.

Run audit-sources.py first. Raw source bodies stay in test-results/ (ignored).
Only positions, counts and checksums are written to the repository.
"""
import csv
import json
import re
from pathlib import Path

CACHE = Path("test-results/week44")
DOCS = Path("docs/study")
MANIFEST = CACHE / "requested-sources.json" if (CACHE / "requested-sources.json").exists() else DOCS / "2026-week-44-sources.json"
SOURCES = {s["id"]: json.loads((CACHE / (s["id"] + ".json")).read_text(encoding="utf-8")) for s in json.loads(MANIFEST.read_text(encoding="utf-8"))}
TITLES = {
    "manual": "주간 교재", "helps": "경전 도움말", "gs-lamentations": "경전 안내서 · 예레미야애가",
    "gs-covenant": "경전 안내서 · 새롭고도 영원한 성약", "walker": "특별한 보물", "bednar": "내 안에 거하라",
    "andersen": "소망의 승리", "christofferson": "너는 돌이킨 후에", "cook": "예레미야애가 · 속박을 조심하라",
    "ballard": "성취되는 소망의 기쁨 · 영어 원문", "evening": "교사 참고 방송 · 베드나 장로", "teaching": "부지런히 배우도록 권유한다",
    "children": "어린이 추가 자료 목록", "hymn115": "Come, Ye Disconsolate · 영어 찬송 115장", "family-song73": "Help Us, O God, to Understand · 영어 노래",
    "family-source-1": "혼자가 아니에요", "family-source-2": "청년 용사들", "family-source-3": "하나님과 맺는 성약",
    "family-source-4": "주간 경전 놀이 · 연결된 10월 글 전체", "family-source-5": "금판을 묻는 모로나이 · 색칠",
    "family-source-6": "니파이의 용기 · 노래", "family-source-7": "다르지만 혼자가 아니에요",
    "family-source-8": "트래비스의 노래", "family-source-9": "불 속에서도 안전했어요", "family-source-10": "회개는 좋은 거니까!",
    "ne1": "니파이전서 1장", "ne2": "니파이전서 2장", "jer1": "예레미야 1:10", "matt5": "마태복음 5:4",
    "james4": "야고보서 4:8~10", "alma36": "앨마서 36:17~20", "mosiah18": "모사이야서 18:10, 13",
}
for n in [31, 32, 33, 36, 37, 38, 39]: TITLES[f"jer{n}"] = f"예레미야 {n}장"
for n in [1, 3]: TITLES[f"lam{n}"] = f"예레미야애가 {n}장"

SHORT = ["회복을 약속하시는 주님", "새 성약과 하나님의 백성", "마음에 말씀을 기록하기", "경전을 대하는 나의 태도", "선지자의 경고에 응답하기", "옳은 일을 선택하는 용기", "슬픔 속에서 다시 찾는 소망"]
EN = ["Promises of restoration", "A new covenant", "Writing the word on our hearts", "Responding to scripture", "Responding to prophetic warnings", "Courage to choose the right", "Hope amid sorrow"]
QUESTIONS = ["어려움 속에서도 주님의 회복 약속을 신뢰하기 위해 무엇을 할 수 있을까요?", "하나님과 맺은 성약은 내가 누구인지, 어떻게 살아야 하는지를 어떻게 알려 주나요?", "말씀을 아는 데서 나아가 마음과 행동에 새기기 위해 무엇을 바꿀 수 있을까요?", "나에게 불편하게 느껴지는 경전의 가르침에 어떻게 응답할까요?", "두려움과 주님의 권고가 맞설 때 나는 어떤 선택을 할까요?", "에벳멜렉처럼 도움이 필요한 사람 곁에 서기 위해 어떤 용기를 낼 수 있을까요?", "슬픔과 후회 가운데 구주의 자비를 기억하며 다시 시작할 방법은 무엇일까요?"]
FAMILY = ["오래가는 사랑", "마음에 적는 약속", "성약을 실천하는 하루", "기록하고 읽는 말씀", "니파이의 용기", "에벳멜렉처럼 돕기", "용서와 새로운 시작"]
FAMILY_EN = ["Everlasting love", "Promises on a heart", "Living our covenants", "Recording and reading", "Nephi’s courage", "Helping like Ebed-melech", "Forgiveness and a new start"]
ACTIVITIES = ["오래가는 물건과 금방 변하는 물건을 비교하고 하나님의 사랑을 느낀 일을 이야기합니다.", "종이 하트에 침례 성약과 하나님이 주신 약속을 적습니다.", "성약에 관한 이야기와 경전 놀이를 통해 오늘 지킬 약속 하나를 정하고 실천합니다.", "예레미야·바룩·왕의 역할을 해 보고 경전과 동화책의 차이를 이야기합니다.", "용기에 관한 노래와 이야기를 읽고 주님의 권고를 따를 행동 하나를 고릅니다.", "에벳멜렉 그림과 성구를 살펴보고 도움이 필요한 사람을 도울 방법을 나눕니다.", "슬프거나 잘못했을 때 느낀 마음을 나누고 예레미야애가에서 다시 시작할 희망을 찾습니다."]
DAYS = [{"day": n, "shortTitle": SHORT[n-1], "shortTitleEn": EN[n-1], "question": QUESTIONS[n-1], "familyTitle": FAMILY[n-1], "familyTitleEn": FAMILY_EN[n-1], "familyQuestion": ["하나님이 나를 계속 사랑하신다는 것을 어떻게 느끼나요?", "나는 하나님과 어떤 약속을 했나요?", "오늘 지킬 수 있는 약속은 무엇인가요?", "내게 특별한 경전 말씀은 무엇인가요?", "옳은 일을 하려면 언제 용기가 필요한가요?", "도움이 필요한 사람을 어떻게 도울까요?", "구주 덕분에 어떻게 다시 시작할 수 있나요?"][n-1], "familyActivity": ACTIVITIES[n-1], "adultTasks": [], "familyTasks": []} for n in range(1, 8)]
ASSIGNED = {}
SCOPED = {}
TASK_NO = 0
# Removed repeated-reading shortcuts must not renumber saved progress for other tasks.
RETIRED_TASK_NUMBERS = {19, 20}


def body(source):
    return [u for u in SOURCES[source]["units"] if not u["note"]]


def span(source, start=None, end=None):
    rows = body(source)
    ids = [u["anchor"] for u in rows]
    return rows[ids.index(start) if start else 0:(ids.index(end)+1) if end else len(rows)]


def task(day, source, rows=None, track="adult", label=None, kind=None, selected=None):
    global TASK_NO
    TASK_NO += 1
    while TASK_NO in RETIRED_TASK_NUMBERS:
        TASK_NO += 1
    data = SOURCES[source]
    if rows is None: rows = body(source)
    owned = {u["anchor"] for u in rows}
    # Keep a note next to the first citing body unit; later references remain links.
    for u in data["units"]:
        if u["note"] and u["anchor"] not in ASSIGNED.get(source, {}) and (any(owner in owned for owner in u["noteOwners"]) or (not u["noteOwners"] and source not in ASSIGNED)):
            rows = [*rows, u]
    visible = selected if selected is not None else [u["anchor"] for u in rows if not u["note"] and u["anchor"] not in {"reference1", "short_reference1"}]
    if not visible: visible = ["title1"] if "title1" in data["allIds"] else []
    for unit in rows:
        assert unit["anchor"] not in ASSIGNED.setdefault(source, {}), (source, unit["anchor"])
        ASSIGNED[source][unit["anchor"]] = (day, track, f"w44-t{TASK_NO:03d}")
    item = {"id": f"w44-t{TASK_NO:03d}", "sourceId": source, "kind": kind or ("manual" if source=="manual" else "scripture" if "/scriptures/" in data["path"] else "reading"), "label": label or TITLES[source], "path": data["path"], "sourceLang": data["lang"], "sourceLanguageLocked": True, "anchor": visible[0] if visible else "", "endAnchor": visible[-1] if visible else "", "units": [source+"#"+u["anchor"] for u in rows], "sourceIds": [u["anchor"] for u in rows], "selectedIds": visible, "noteLinks": [{"note": u["anchor"], "owner": u["noteOwners"][0]} for u in rows if u["note"] and u["noteOwners"]]}
    DAYS[day-1][track+"Tasks"].append(item)
    return item


def whole(day, source, track="adult"):
    return task(day, source, track=track, label=TITLES[source]+" · 전체")


def split(source, pieces, track="adult"):
    for day, start, end, name in pieces:
        task(day, source, span(source,start,end), track, TITLES[source]+" · "+name)


# The full weekly manual is partitioned once; repeated context headings are not owners.
split("manual", [(1,None,"p3","도입과 회복 약속"),(2,"scripture_title2","p4","새 성약"),(3,"p5","p11","성약을 마음에 새기는 질문"),(4,"scripture_title3","p18","경전에 대한 반응"),(5,"scripture_title4","p19","선지자를 따르는 선택"),(6,"scripture_title5","figure2_p1","옳은 일을 수호함"),(7,"scripture_title6","p26","슬픔과 자비")])
task(3,"manual",span("manual","figure3_p1","figure3_p1"),label="교재 · 자신의 학습에 책임지기")
for day, ids in [(1,["p_h066E","p_a8DzN"]),(4,["p_jYLoa"]),(5,["p_opNyv"]),(6,["p_mJlX6"])]:
    task(day,"manual",[u for u in body("manual") if u["anchor"] in ids],label="교재 · 경전 도움말 안내")
split("manual",[(1,"title9","p27","영원한 사랑"),(2,"scripture_title8","p28","하트에 성약 적기"),(4,"scripture_title9","p30","경전 역할극"),(6,"scripture_title10","p31","에벳멜렉의 용기"),(7,"scripture_title11","figure4_p1","용서와 소망"),(6,"figure5_figure1_p1",None,"에벳멜렉 그림·활동지")],"family")
for day, ids in [(1,["jer31","jer33"]),(2,["jer32"]),(4,["jer36"]),(5,["jer37","jer38","ne1"]),(6,["jer39","ne2"]),(7,["lam1","lam3"])]:
    for source in ids: whole(day,source)
PARTIAL = {"jer1": [10],"matt5":[4],"james4":[8,9,10],"alma36":[17,18,19,20],"mosiah18":[10,13]}
for source, verses in PARTIAL.items():
    rows=[u for u in body(source) if u["anchor"] in {"p"+str(n) for n in verses}]
    task(1 if source=="jer1" else 2 if source=="mosiah18" else 7,source,rows,"family" if source=="mosiah18" else "adult")
whole(7,"gs-lamentations")
whole(2,"gs-covenant")
whole(2,"walker")
split("bednar",[(2,None,"p41","1/2 · 주님 안에 거하기"),(3,"title3",None,"2/2 · 마음에 심고 동행하기")])
split("christofferson",[(3,None,"p14","1/2 · 연구와 기도"),(4,"p15",None,"2/2 · 실천과 보호")])
split("cook",[(5,None,"p18","1/2 · 예레미야와 리하이"),(6,"p19",None,"2/2 · 오늘날의 속박과 선택")])
split("andersen",[(1,None,"p_cD13D","1/3 · 영생에 대한 소망"),(4,"p_d7CYq","p_grC8N","2/3 · 소망의 근원과 성전"),(7,"p_tW3aK",None,"3/3 · 고난 속의 소망")])
split("ballard",[(1,None,"p17","1/3 · 낙담과 주님의 초대"),(4,"p18","p26","2/3 · 신앙으로 소망을 기르기"),(7,"p27",None,"3/3 · 소망의 경험과 간증")])
split("teaching",[(1,None,"figure1_p5","1/7 · 배우도록 초대하기"),(3,"title3","p8","2/7 · 학습에 책임지기"),(4,"title6","p12","3/7 · 매일 말씀을 공부하기"),(2,"title9","p17","4/7 · 배울 준비하기"),(5,"figure4_p1","p21","5/7 · 배운 진리를 나누기"),(6,"title15","p25","6/7 · 배운 것을 실천하기"),(7,"figure2_title1",None,"7/7 · 적용 방법")])
task(3,"evening",label="교사 참고 방송 · 전체 76:22 (자막·전문 검증 미완료)",kind="video",selected=[])
whole(7,"hymn115")

# Scripture Helps: full body and its actual footnotes, including media captions.
split("helps",[(1,None,"p_mQk4G","도입·라헬"),(2,"p_sNjLc","p_oOFJy","새 언약·땅 구입"),(1,"p_fhz6w","p_cIcQC","공의로운 가지"),(4,"p_s91JQ","p_u59Zl","바룩"),(5,"p_ij6vo","p_bJxdh","시드기야의 시대"),(6,"p_njRFQ","p_mZQH1","예언의 성취"),(7,"p_vTb0z","p_yPHEd","애가의 형식과 비유"),(1,"p_kEAPN","p_u2eko","더 알아보기 · 소망"),(3,"p_j8YB3","p_xILBZ","더 알아보기 · 마음"),(6,"p_q9bEn","p_rjgmG","더 알아보기 · 속박"),(1,"p_vlpPz","p_wCiP1","이미지 안내·예레미야"),(6,"p_fxxkg","p_fxxkg","에벳멜렉 이미지"),(7,"p_tupmD","p_tupmD","애곡 이미지")])
split("children",[(1,None,"p_enls9","도입·영원한 사랑"),(2,"p_yPll4","p_eKpQ2","성약과 청년 용사"),(3,"p_k5yTi","p_cQnKB","성약 실천"),(4,"p_iLeB6","p_apVae","경전·색칠"),(5,"p_pMOBU","p_qLpVg","노래와 용기"),(6,"p_nHjO6","p_xyhkQ","용기에 관한 이야기"),(7,"p_a9Bnn",None,"용서·소망")],"family")
for n,day in enumerate([1,2,3,3,4,5,5,6,6,7],1):whole(day,"family-source-"+str(n),"family")
whole(7,"family-song73","family")

# Freeze an allocation-independent source set. Partial verse scope is explicit.
for source,data in SOURCES.items():
    if source in PARTIAL:
        selected={"p"+str(n) for n in PARTIAL[source]}
        rows=[u for u in data["units"] if u["anchor"] in selected or (u["note"] and any(o in selected for o in u["noteOwners"]))]
    else: rows=data["units"]
    SCOPED[source]=rows
    assert set(ASSIGNED.get(source,{}))=={u["anchor"] for u in rows}, (source,"unassigned or extra",{u["anchor"] for u in rows}-set(ASSIGNED.get(source,{})))

manifest=[]
inventory=[]
links=[]
for source,data in SOURCES.items():
    units=SCOPED[source]
    manifest.append({"id":source,"title":TITLES[source],"path":data["path"],"lang":data["lang"],"retrieved":"2026-10-25","htmlSha256":data["htmlSha256"],"scope":"verses "+", ".join(map(str,PARTIAL[source])) if source in PARTIAL else "video metadata only; full linked player" if source=="evening" else "full article including notes", "units":[{k:v for k,v in u.items() if k not in {"text","tag","noteGroup"}} for u in units],"media":data["media"],"durationSeconds":data["durationSeconds"]})
    for u in units:
        day,track,item=ASSIGNED[source][u["anchor"]]
        inventory.append([source+"#"+u["anchor"],TITLES[source],data["path"],u["anchor"],data["lang"],day,track,item,u["chars"] if data["lang"]=="kor" else 0,u["words"] if data["lang"]=="eng" else 0,int(u["note"]),u["sha256"]])
    for a in data["links"]:
        # Retain every observed source link with an explicit finite-scope decision.
        path=a["href"].split("?")[0]
        included=any(s["path"]==path for s in SOURCES.values())
        category="included source (see exact verse scope)" if included else "same-document note/navigation" if path in {"",data["path"]} or a["href"].startswith("#") else "linked file/media; original link retained" if "assets.churchofjesuschrist.org" in path else "additional exploration; no recursive expansion beyond frozen source list"
        links.append([source,a["owner"],a["label"],a["href"],category])

# Validate actual reader selections as well as primary ownership. A zero-unit
# shared shortcut used to pass the ownership audit while reopening another day.
opened = set()
for day in DAYS:
    for track in ["adult", "family"]:
        for item in day[track+"Tasks"]:
            assert item["units"], (item["id"], "empty repeated-reading task")
            assert set(item["selectedIds"]) <= set(item["sourceIds"]), (item["id"], "unowned selection")
            for anchor in item["selectedIds"]:
                key = (item["path"], item["sourceLang"], anchor)
                assert key not in opened, (item["id"], "repeated reader selection", key)
                opened.add(key)

plan={"version":2,"week":44,"dates":"2026-10-26/2026-11-01","days":DAYS}
Path("src/data/cfm-2026-week-44.json").write_text(json.dumps(plan,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
(DOCS/"2026-week-44-sources.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
with (DOCS/"2026-week-44-source-inventory.csv").open("w",encoding="utf-8-sig",newline="") as f:
    w=csv.writer(f);w.writerow(["unit","source","path","anchor","lang","day","track","task","koChars","enWords","note","sha256"]);w.writerows(inventory)
with (DOCS/"2026-week-44-source-links.csv").open("w",encoding="utf-8-sig",newline="") as f:
    w=csv.writer(f);w.writerow(["source","owner","label","href","decision"]);w.writerows(links)
summary=[]
for d in DAYS:
    counts=[]
    for track in ["adult","family"]:
        rows=[r for r in inventory if r[5]==d["day"] and r[6]==track]
        counts.append({"track":track,"units":len(rows),"koChars":sum(r[8] for r in rows),"enWords":sum(r[9] for r in rows),"notes":sum(r[10] for r in rows),"verses":sum(len(u.get("verseNumbers",[])) for source,units in SCOPED.items() for u in units if ASSIGNED[source][u["anchor"]][:2]==(d["day"],track)),"tasks":len(d[track+"Tasks"])})
    summary.append({"day":d["day"],"title":d["shortTitle"],"counts":counts})
(CACHE/"summary.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps({"sources":len(manifest),"units":len(inventory),"days":summary},ensure_ascii=False,indent=2))
