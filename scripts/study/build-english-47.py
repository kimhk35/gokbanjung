"""Build audited English positions without changing week 47 allocation/progress.

Fetch English documents with audit-sources.py into ignored test-results/english47.
This variant owns no progress units: original identifies the immutable Korean
(or original English) allocation fingerprint. English verses are matched by
logical verse number, not a coincidentally equal paragraph ID. Whole songs use
complete English bodies because translations group their lyric lines differently.
"""
import csv
import hashlib
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

sys.dont_write_bytecode=True
if hasattr(sys.stdout,'reconfigure'):sys.stdout.reconfigure(encoding='utf8')
CACHE=Path('test-results/english47')
DOCS=Path('docs/study')
PLAN=json.loads(Path('src/data/cfm-2026-week-47.json').read_text(encoding='utf8'))
CANON={s['id']:s for s in json.loads((DOCS/'2026-week-47-sources.json').read_text(encoding='utf8'))}
ENG={sid:json.loads((CACHE/(sid+'.json')).read_text(encoding='utf8')) for sid in CANON}
for sid,data in ENG.items():
    html=(CACHE/(sid+'.html')).read_text(encoding='utf8')
    assert re.search(r'<html\s[^>]*lang="en"',html),(sid,'response is not English')
    assert hashlib.sha256(html.encode()).hexdigest()==data['htmlSha256'],(sid,'cache/hash mismatch')
ITEMS=[dict(task=t,day=d['day'],track=track) for d in PLAN['days'] for track in ['adult','family'] for t in d[track+'Tasks']]
BY_SOURCE=defaultdict(list)
for loc in ITEMS:BY_SOURCE[loc['task']['sourceId']].append(loc)
MANUAL_IDS={'p_uHXgV':'p_uKbDf','p_uFn2M':'p_sE1eb','p_rB12K':'p_uKuqA','p_jgY1j':'p_mMAH5'}
# These four links and the Bednar date were checked against both source bodies;
# their position and meaning match, while their language-specific IDs do not.
RENAMED={'manual':MANUAL_IDS,'bednar-discussion':{'p106':'p1'}}
PART_LABELS={
1:'Come, Follow Me · Introduction and the prophets',4:'Scripture Helps · The minor prophets and Hosea’s background',5:'Come, Follow Me · Covenants in Hosea 1–3',9:'Come, Follow Me · Gomer Rescued',10:'Scripture Helps · Covenant marriage and God’s children',11:'Scripture Helps · Covenant love and mercy',12:'Family study · Keeping covenants',13:'Children’s resources · Covenants',15:'Other weeks in the linked article · October 26–November 1',16:'Come, Follow Me · Return to the Lord: Hosea 14',19:'Scripture Helps · God’s love and mercy',21:'Scripture Helps · Come unto Jesus',22:'Children’s resources · Keeping His Promise',24:'Other weeks in the linked article · November 2–8',28:'Come, Follow Me · Compare three images of faithfulness',33:'Come, Follow Me · Jesus quotes Hosea',36:'Come, Follow Me · Rend your heart',38:'Scripture Helps · Mercy, not sacrifice',39:'Scripture Helps · Joel and a repentant heart',40:'Teach by the Spirit · 1/4 Preparation and the Savior’s example',42:'Teach by the Spirit · 2/4 Preparation and learners’ needs',43:'Children’s resources · Singing about Jesus',45:'Other weeks in the linked article · November 9–15',49:'Come, Follow Me · Elder Bednar on receiving the Holy Ghost',51:'Family study · It is time to seek the Lord',53:'Children’s resources · Teach Me to Walk in the Light',55:'Children’s video · Time to Seek the Lord · 0:35',57:'Come, Follow Me · Receiving the Spirit: examples in Mosiah',60:'Come, Follow Me · Receiving the Spirit: Helaman',62:'Come, Follow Me · Receiving the Spirit: Doctrine and Covenants',64:'Come, Follow Me · An environment for learning by the Spirit',65:'Teach by the Spirit · 3/4 An environment for the Spirit and personal revelation',66:'Family study · Jesus is my Savior and Redeemer',67:'Children’s resources · Savior and Redeemer',68:'Children’s resources · Jesus Blessed One by One',70:'Other weeks in the linked article · November 23–29',72:'Come, Follow Me · Joel 2 and the promise of the Spirit',75:'Come, Follow Me · Two events quoting Joel',78:'Scripture Helps · The Spirit poured out on all flesh',79:'Come, Follow Me · President Nelson on revelation',81:'Scripture Helps · The same message on revelation',82:'Scripture Helps · The Spirit of God',84:'Family study · The promise of the Spirit',85:'Children’s resources · The Still Small Voice',88:'Come, Follow Me · Promptings and Enemy Territory',91:'Teach by the Spirit · 4/4 The Savior’s example of testimony',93:'Teach by the Spirit · Testimony and applying what you learn',94:'Come, Follow Me · Links to Scripture Helps',95:'Scripture Helps · Savior image',96:'Family study · Three scriptures about the Holy Ghost',100:'Children’s resources · I Can Feel the Holy Ghost',102:'Children’s resources · Invite the Spirit activity',103:'This week’s linked activity · God Will Bless Me with His Spirit',104:'This week’s linked activity · Sing The Holy Ghost',106:'This week’s linked activity · Make an Invite the Spirit box',107:'Family study · More resources and a picture of the Savior'}
NOTES={
1:'The English manual links to the Bible Dictionary here. This plan retains the assigned Guide to the Scriptures entries. The Bible Dictionary links remain available in the official manual.',
10:'Hosea 1–3 was read just before this in today’s basic course. Consider these questions using the same passages.',
11:'Hosea 2 is already part of today’s basic reading. Use the link if you wish to return to it.',
12:'Hosea 2:19–20 is in today’s basic reading of Hosea 2. Read it together before doing the activity.',
13:'Hosea 2:19–20 is the same passage assigned in today’s basic course.',
15:'This is another week’s activity within the complete linked November article. Its other weekly chapters are not added to this week’s required reading.',
21:'This hymn was assigned earlier today. Use the link if you would like to sing it again.',
24:'This is another week’s activity in the full November article. Its weekly chapters are not added to this week’s required reading.',
38:'Hosea 6:6–7 and the Savior’s quotations were read earlier today.',
39:'Joel 2:12–13 is the passage read just before this.',
40:'A 4-minute 17-second learning video is provided at the top of this article. The assigned Matthew passage follows the question about it.',
42:'This is the beginning of the complete teaching article. The sections on inviting the Spirit and testimony continue on days 5 and 7.',
45:'This part of the monthly article contains last week’s Daniel activity. It is not a new scripture assignment in this week’s basic course.',
50:'The official source provides a video, not a written transcript. The full discussion is 61 minutes 29 seconds. Consider it with the quotation in the preceding manual section.',
51:'Hosea 10:12 is in today’s basic reading of Hosea 10. Read it together before the clock and planting activities.',
53:'Hosea 10:12 is assigned in today’s basic course.',
55:'The official 35-second player appears directly below this sentence. A written transcript is not provided.',
65:'The preparation and learners’ needs sections were assigned on day 3. The testimony section continues on day 7.',
66:'Hosea 13:4,14 is in today’s basic reading of Hosea 13. Recall those verses as you discuss the picture and their meaning.',
67:'The Hosea passage is in day 5 of the basic course. The singing activity is in day 3 of the family course.',
70:'This part of the monthly article contains next week’s Jonah activity. Entire chapters of Jonah are not added to this week’s basic reading.',
72:'The invitation to repent in verses 12–13 was assigned on day 3. Today covers the rest of Joel 2.',
75:'Joel 2:28–32 was read just before this. Compare it with the accounts of these two events.',
78:'Joel’s promise and the two events were read earlier today. Use those passages as you consider these explanations.',
81:'Scripture Helps recommends the same message by President Nelson that was read just before this. It is not a second required reading.',
84:'Joel 2:28–29 is in today’s basic reading of Joel 2:14–32. Read it together before the pouring activity.',
85:'Joel 2:28–29 is in today’s basic course. The assigned song is The Still Small Voice.',
90:'The official video is 3 minutes 38 seconds. This page provides the video and a short introduction.',
93:'This completes the linked teaching article that began on day 3.',
94:'The minor prophets and God’s children were explained on day 1. These links do not add another required reading of the same material.',
96:'Joel 2:28–29 was assigned in day 6 of the basic course. Today, read the following three passages together.',
106:'Joel 2:28 is the same verse assigned in day 6 of the basic course. See the official page for the image lettering and cutout activity.'}
BOOKS={'hosea':'Hosea','joel':'Joel','isa':'Isaiah','1-ne':'1 Nephi','matt':'Matthew','js-h':'Joseph Smith—History','acts':'Acts','mosiah':'Mosiah','hel':'Helaman','dc':'Doctrine and Covenants','john':'John','moro':'Moroni'}

def ranges(values):
    values=sorted(set(values));chunks=[]
    for value in values:
        if chunks and value==chunks[-1][-1]+1:chunks[-1].append(value)
        else:chunks.append([value])
    return ', '.join(str(c[0]) if len(c)==1 else f'{c[0]}–{c[-1]}' for c in chunks)

def english_title(source):
    rows=[u for u in ENG[source]['units'] if not u['note']]
    title=next((u['text'] for u in rows if u['anchor']=='title1'),None)
    return title or {'manual':'Come, Follow Me','helps':'Scripture Helps','children':'Children’s resources','family-spirit':'Weekly Scripture Fun'}[source]

mapped={};ownership=defaultdict(dict);body_rows={};methods={};differences=[];EXPECTED_SCOPE={}
for source,locations in BY_SOURCE.items():
    english=ENG[source];rows=english['units'];enbody=[u for u in rows if not u['note']]
    en_by_id={u['anchor']:u for u in enbody}
    canonical={u['anchor']:u for u in CANON[source]['units']}
    scripture='/scriptures/' in english['path'] and '/gs/' not in english['path']
    if not scripture and len(locations)>1:
        canonical_order=[RENAMED.get(source,{}).get(u['anchor'],u['anchor']) for u in CANON[source]['units'] if not u['note']]
        assert canonical_order==[u['anchor'] for u in enbody],(source,'parallel topic/paragraph order differs')
    for loc in locations:
        task=loc['task'];tid=task['id']
        original_rows=[canonical[a] for a in task['sourceIds'] if not canonical[a]['note']]
        if scripture:
            wanted={v for u in original_rows for v in u['verseNumbers']}
            selected=[u for u in enbody if wanted.intersection(u['verseNumbers'])]
            assert {v for u in selected for v in u['verseNumbers']}==wanted,(tid,'verse mismatch')
            # Full weekly chapter headings belong to the task that owns the
            # corresponding Korean chapter heading, once even for split chapters.
            if any(not u['verseNumbers'] for u in original_rows):
                selected=[u for u in enbody if u in selected or not u['verseNumbers']]
            methods[tid]='logical verses '+ranges(wanted)+'; language-specific headings and footnotes'
        elif len(locations)==1:
            selected=enbody[:]
            methods[tid]='complete English article/song; no assumption of lyric paragraph equivalence'
        else:
            selected=[]
            for unit in original_rows:
                anchor=RENAMED.get(source,{}).get(unit['anchor'],unit['anchor'])
                assert anchor in en_by_id,(tid,unit['anchor'],'missing English paragraph')
                selected.append(en_by_id[anchor])
            methods[tid]='reviewed parallel body order and topic; explicit language-specific ID aliases where needed'
        assert selected,(tid,'empty English body')
        body_rows[tid]=selected
        for unit in selected:
            assert unit['anchor'] not in ownership[source],(source,unit['anchor'],'duplicate English body')
            ownership[source][unit['anchor']]=tid
        if not scripture:
            old={u['anchor'] for u in original_rows};new={u['anchor'] for u in selected}
            if old!=new:differences.append(dict(source=source,task=tid,canonicalBodyUnits=len(old),englishBodyUnits=len(new),canonicalOnly=sorted(old-new),englishOnly=sorted(new-old),decision='complete counterpart, metadata/line grouping/verified ID differences; no additional required progress item'))
# English notes belong once to the earliest task whose selected English body
# cites that English note. Korean footnote numbers are never substituted.
note_rows={tid:[] for tid in body_rows}
for source,locations in BY_SOURCE.items():
    english=ENG[source]
    selected_ids=set(ownership[source])
    expected_body={u['anchor'] for u in english['units'] if not u['note']}
    if '/scriptures/' in english['path'] and '/gs/' not in english['path'] and 'verses' in CANON[source]:
        wanted=set(CANON[source]['verses'])
        expected_body={u['anchor'] for u in english['units'] if not u['note'] and wanted.intersection(u['verseNumbers'])}
    assert selected_ids==expected_body,(source,'English body missing/leaked',expected_body-selected_ids,selected_ids-expected_body)
    expected_notes={u['anchor'] for u in english['units'] if u['note'] and (set(u['noteOwners']).intersection(expected_body) or 'verses' not in CANON[source])}
    EXPECTED_SCOPE[source]=dict(rule='explicit logical verse scope from canonical manifest, plus English notes citing those verses' if 'verses' in CANON[source] else 'complete English document body and notes required by canonical whole-document scope',canonicalScope=CANON[source]['scope'],declaredVerses=CANON[source].get('verses'),expectedBodyIds=[u['anchor'] for u in english['units'] if u['anchor'] in expected_body],expectedNoteIds=[u['anchor'] for u in english['units'] if u['anchor'] in expected_notes],parallelTopicOrderVerified=not ('/scriptures/' in english['path'] and '/gs/' not in english['path']) and len(locations)>1)
    for unit in [u for u in english['units'] if u['note']]:
        candidates=[loc['task']['id'] for loc in locations if set(unit['noteOwners']).intersection(u['anchor'] for u in body_rows[loc['task']['id']])]
        if not candidates:
            if '/scriptures/' in english['path'] and '/gs/' not in english['path'] and 'verses' in CANON[source]:continue
            candidates=[locations[0]['task']['id']]
        target=candidates[0]
        assert unit['anchor'] not in ownership[source],(source,unit['anchor'],'duplicate English note')
        ownership[source][unit['anchor']]=target;note_rows[target].append(unit)

for loc in ITEMS:
    task=loc['task'];tid=task['id'];source=task['sourceId'];rows=body_rows[tid]
    visible=[u['anchor'] for u in rows if u['anchor'] not in {'reference1','short_reference1'}]
    assert visible
    num=int(tid.rsplit('t',1)[1])
    label=PART_LABELS.get(num)
    if not label:
        if '/scriptures/' in task['path'] and '/gs/' not in task['path']:
            pathparts=task['path'].split('/');book=BOOKS[pathparts[-2]];verse_set={v for u in rows for v in u['verseNumbers']}
            label=book+' '+pathparts[-1]+':'+ranges(verse_set)
        else:label=english_title(source)+' · Complete source'
    owned={u['anchor'] for u in rows}
    note_links=[dict(note=u['anchor'],owner=next(o for o in u['noteOwners'] if o in owned)) for u in note_rows[tid] if owned.intersection(u['noteOwners'])]
    variant=dict(path=task['path'],anchor=visible[0],endAnchor=visible[-1],selectedIds=visible,noteLinks=note_links,label=label,original={k:task[k] for k in ['path','sourceLang','anchor','endAnchor','selectedIds']})
    if num in NOTES:variant['readingNote']=NOTES[num]
    assert not task.get('readingNote') or variant.get('readingNote'),(tid,'untranslated note')
    assert set(visible)<={u['anchor'] for u in ENG[source]['units']},tid
    assert all(n['owner'] in visible and n['note'] in ENG[source]['allIds'] for n in note_links),tid
    mapped[tid]=variant
assert len(mapped)==107
EXPECTED_WEEKLY={'hos1':11,'hos2':23,'hos3':5,'hos4':19,'hos5':15,'hos6':11,'hos10':15,'hos11':12,'hos12':14,'hos13':16,'hos14':9,'joel1':20,'joel2':32,'joel3':21}
for source,count in EXPECTED_WEEKLY.items():
    assert sorted(v for u in ENG[source]['units'] if not u['note'] for v in u['verseNumbers'])==list(range(1,count+1)),(source,'English weekly chapter incomplete')
for source,scope in EXPECTED_SCOPE.items():
    assert set(ownership[source])==set(scope['expectedBodyIds'])|set(scope['expectedNoteIds']),(source,'English scope ownership differs from declared whole-document/verse scope')
# Stronger than comparing counts: selected DOM subtrees may not overlap another
# selected paragraph, even if two distinct IDs have an ancestor relationship.
import importlib.util
spec=importlib.util.spec_from_file_location('audit',Path(__file__).with_name('audit-sources.py'));audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)
for source,locations in BY_SOURCE.items():
    tree=audit.Tree((CACHE/(source+'.html')).read_text(encoding='utf8'))
    nodes=defaultdict(list)
    for node in tree.root.walk():
        if node.attrs.get('id'):nodes[node.attrs['id']].append(node)
    seen={}
    for loc in locations:
        tid=loc['task']['id']
        for anchor in mapped[tid]['selectedIds']:
            assert anchor in nodes,(tid,anchor)
            for node in nodes[anchor]:
                if audit.repeated_table_header(node):continue
                actual={u.attrs.get('id') for u in node.walk()} & set(ownership[source])
                for inner in actual:
                    assert ownership[source][inner]==tid,(tid,'selected subtree leaks another task',inner)
                    assert inner not in seen or seen[inner]==tid,(tid,'cross-task selected DOM duplicate',inner)
                    seen[inner]=tid
Path('src/data/cfm-2026-week-47-english.json').write_text(json.dumps(dict(version=1,week=47,lang='eng',tasks=mapped),ensure_ascii=False,indent=2)+'\n',encoding='utf8')

manifest=[];inventory=[];alignments=[]
for source,english in ENG.items():
    scoped=[u for u in english['units'] if u['anchor'] in ownership[source]]
    manifest.append(dict(id=source,path=english['path'],lang='eng',retrieved='2026-11-15',htmlSha256=english['htmlSha256'],canonicalPath=CANON[source]['path'],canonicalLang=CANON[source]['lang'],htmlLanguage='en',scope=CANON[source]['scope'],scopeEvidence=EXPECTED_SCOPE[source],units=[{k:v for k,v in u.items() if k not in {'text','tag','noteGroup'}} for u in scoped],bodyCount=sum(not u['note'] for u in scoped),noteCount=sum(u['note'] for u in scoped),durationSeconds=english['durationSeconds'],differences=[d for d in differences if d['source']==source]))
    for unit in scoped:
        tid=ownership[source][unit['anchor']];loc=next(x for x in ITEMS if x['task']['id']==tid)
        inventory.append([source,unit['anchor'],tid,loc['day'],loc['track'],int(unit['note']),';'.join(unit['noteOwners']),';'.join(map(str,unit['verseNumbers'])),unit['words'],unit['sha256']])
for loc in ITEMS:
    task=loc['task'];tid=task['id'];variant=mapped[tid]
    alignments.append([tid,task['sourceId'],loc['day'],loc['track'],task['anchor'],task['endAnchor'],variant['anchor'],variant['endAnchor'],len(variant['selectedIds']),len(note_rows[tid]),methods[tid]])
(DOCS/'2026-english-47-sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
for name,header,rows in [('units',['source','anchor','task','day','track','note','noteOwners','verses','enWords','sha256'],inventory),('alignment',['task','source','day','track','originalAnchor','originalEndAnchor','englishAnchor','englishEndAnchor','selectedParagraphs','ownedNotes','method'],alignments)]:
    with (DOCS/f'2026-english-47-{name}.csv').open('w',encoding='utf-8-sig',newline='') as f:
        writer=csv.writer(f);writer.writerow(header);writer.writerows(rows)
(CACHE/'differences.json').write_text(json.dumps(differences,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(dict(sources=len(manifest),tasks=len(mapped),units=len(inventory),notes=sum(r[5] for r in inventory),words=sum(r[8] for r in inventory),differences=differences),ensure_ascii=False,indent=2))
