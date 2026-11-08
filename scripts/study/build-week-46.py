"""Build week 46 from independently audited public source positions, not bodies.

Raw HTML/text lives only in ignored test-results/week46. Re-fetch into a new
cache before changing published boundaries; task IDs are saved progress keys.
"""
import csv
import hashlib
import importlib.util
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit

sys.dont_write_bytecode = True

CACHE = Path('test-results/week46')
DOCS = Path('docs/study')
REQUESTED = CACHE/'requested-sources.json'
MANIFEST = REQUESTED if REQUESTED.exists() else DOCS/'2026-week-46-sources.json'
CONFIG = json.loads(MANIFEST.read_text(encoding='utf-8'))
SOURCES = {s['id']: json.loads((CACHE/(s['id']+'.json')).read_text(encoding='utf-8')) for s in CONFIG}
spec = importlib.util.spec_from_file_location('audit', Path(__file__).with_name('audit-sources.py'))
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)
TREES = {s: audit.Tree((CACHE/(s+'.html')).read_text(encoding='utf-8')) for s in SOURCES}
TITLES = {s['id']: s['title'] for s in CONFIG}
TITLES['bednar'] = '만물을 회복하실 때'
TITLES['eyring-witness'] = '하나님의 증인 · 닐 엘 앤더슨'
TITLES['song-wisdom'] = 'The Word of Wisdom'
TITLES['song-pray'] = 'Heavenly Father, While I Pray'
SCOPED = {}
FIGURE_ROWS = {}

# Freeze source scope before creating any tasks. Figure numbers in the manual
# are data-marker values, not live anchors (the original figure23 link is stale).
for config in CONFIG:
    source = config['id']
    data = SOURCES[source]
    rows = data['units']
    if 'verses' in config:
        wanted = set(config['verses'])
        selected = {u['anchor'] for u in rows if wanted.intersection(u['verseNumbers'])}
        assert {v for u in rows if u['anchor'] in selected for v in u['verseNumbers']} == wanted, source
        rows = [u for u in rows if u['anchor'] in selected or (u['note'] and selected.intersection(u['noteOwners']))]
    elif 'figures' in config:
        selected = set()
        for number in config['figures']:
            marker = next(e for e in TREES[source].root.walk() if e.attrs.get('data-marker') == str(number))
            ids = {e.attrs.get('id') for e in marker.walk()}
            FIGURE_ROWS[source, number] = [u for u in rows if u['anchor'] in ids]
            assert FIGURE_ROWS[source, number], (source, number)
            selected.update(ids)
        rows = [u for u in rows if u['anchor'] in selected]
    SCOPED[source] = rows

# The manual's standalone knowledge film has no paragraph ID. Its real figure
# anchor is a metadata unit; it opens the full official player, without claiming
# a transcript audit. Story films are alternatives to their complete story texts.
video = next(e for e in TREES['manual'].root.walk() if e.attrs.get('id') == 'figure8')
video_text = audit.normalized(video)
SCOPED['manual'] = [*SCOPED['manual'], dict(anchor='figure8', tag='figure', chars=len(''.join(video_text.split())), words=len(video_text.split()), sha256=hashlib.sha256(video_text.encode()).hexdigest(), note=False, noteGroup='', verseNumbers=[], text=video_text, noteOwners=[])]

SHORT = ['타협하지 않는 신앙', '계시를 구하고 왕국을 세우기', '그렇게 하지 아니하실지라도', '겸손히 하나님을 예배하기', '하나님의 경고에 응답하기', '기도하며 증인으로 살기', '인자와 영원한 왕국']
EN = ['Faith without compromise', 'Revelation and God’s kingdom', 'But if not', 'Worship with humility', 'Responding to God’s warning', 'Prayer and witness', 'The Son of Man’s kingdom']
QUESTIONS = ['주변의 압력 속에서도 하나님께 충실하기 위해 어떤 선택을 할 수 있을까요?', '계시를 받을 준비를 하고 하나님의 왕국에 참여하려면 무엇을 할까요?', '원하는 결과가 오지 않더라도 주님을 신뢰할 수 있는 이유는 무엇인가요?', '내가 받은 힘과 기회를 하나님의 선물로 인정하고 예배하려면 어떻게 할까요?', '하나님의 경고를 듣고 오늘 바꾸어야 할 태도와 행동은 무엇인가요?', '어려운 상황에서도 기도를 계속하며 그리스도의 증인으로 살 방법은 무엇인가요?', '예수 그리스도의 영원한 왕국을 바라보며 이번 주에 배운 것을 어떻게 실천할까요?']
FAMILY = ['몸을 돌보는 선택', '하나님의 왕국 그리기', '옳은 일을 선택할 용기', '존중하며 거절하기', '신앙을 지키는 연습', '늘 기도하는 마음', '예수님을 따르는 한 주']
FAMILY_EN = ['Caring for our bodies', 'Drawing God’s kingdom', 'Courage to choose right', 'Saying no respectfully', 'Practicing faithful choices', 'A prayerful heart', 'Following Jesus this week']
ACTIVITIES = ['다니엘 1장을 기본 과정에서 읽은 뒤 건강한 선택을 그림으로 표현하고 오늘 실천할 한 가지를 정합니다.', '기본 과정의 다니엘 2장을 떠올리며 돌과 산을 그리고 복음 그림책의 회복 장면을 함께 살펴봅니다.', '세 친구의 이야기를 읽고 옳은 일을 선택하기 어려운 상황을 짧게 역할극으로 해 봅니다.', '원치 않는 부탁이나 신체 접촉에 정중하게 거절하는 말을 연습하고 서로의 선택을 존중합니다.', '에스더의 용기와 경전 놀이를 살펴보고 가족이 함께 실천할 용기 있는 행동을 고릅니다.', '다니엘처럼 기도할 장소와 시간을 그려 보고 마음속으로도 기도할 수 있음을 이야기합니다.', '이번 주 옳은 선택과 기도 경험을 나누고 사자 굴 활동지를 색칠하며 다음 주 실천을 정합니다.']
DAYS = [dict(day=n, shortTitle=SHORT[n-1], shortTitleEn=EN[n-1], question=QUESTIONS[n-1], familyTitle=FAMILY[n-1], familyTitleEn=FAMILY_EN[n-1], familyQuestion=['내 몸을 소중히 여기는 선택은 무엇일까요?', '하나님의 교회에서 나는 어떻게 도울 수 있을까요?', '옳은 일을 하기 어려울 때 누구를 신뢰할까요?', '불편하거나 잘못된 부탁에는 어떻게 말할까요?', '나는 언제 용기를 낼 수 있을까요?', '언제 어디서 하나님 아버지께 기도할까요?', '예수님을 따르며 이번 주 무엇을 배웠나요?'][n-1], familyActivity=ACTIVITIES[n-1], adultTasks=[], familyTasks=[]) for n in range(1,8)]
ASSIGNED = {}

def body(source):
    return [u for u in SCOPED[source] if not u['note']]

def span(source, start=None, end=None):
    rows = body(source)
    ids = [u['anchor'] for u in rows]
    return rows[ids.index(start) if start else 0:ids.index(end)+1 if end else len(rows)]

def task(day, source, rows=None, track='adult', label=None, kind=None):
    data = SOURCES[source]
    rows = list(body(source) if rows is None else rows)
    owned = {u['anchor'] for u in rows}
    for u in SCOPED[source]:
        if u['note'] and u['anchor'] not in ASSIGNED.get(source, {}) and (owned.intersection(u['noteOwners']) or (not u['noteOwners'] and source not in ASSIGNED)):
            rows.append(u)
    task_id = f'w46-t{sum(len(v) for d in DAYS for k,v in d.items() if k in {"adultTasks","familyTasks"})+1:03d}'
    for u in rows:
        assert u['anchor'] not in ASSIGNED.setdefault(source, {}), (source,u['anchor'])
        ASSIGNED[source][u['anchor']] = (day,track,task_id)
    visible = [u['anchor'] for u in rows if not u['note'] and u['anchor'] not in {'reference1','short_reference1'}]
    assert visible, (source,day)
    item = dict(id=task_id,sourceId=source,kind=kind or ('manual' if source=='manual' else 'scripture' if '/scriptures/' in data['path'] else 'reading'),label=(label or TITLES[source])+(' · 영어 원문' if data['lang']=='eng' else ''),path=data['path'],sourceLang=data['lang'],sourceLanguageLocked=True,anchor=visible[0],endAnchor=visible[-1],units=[source+'#'+u['anchor'] for u in rows],sourceIds=[u['anchor'] for u in rows],selectedIds=visible,noteLinks=[dict(note=u['anchor'],owner=next(o for o in u['noteOwners'] if o in owned)) for u in rows if u['note'] and owned.intersection(u['noteOwners'])])
    DAYS[day-1][track+'Tasks'].append(item)

def whole(day, source, track='adult'):
    task(day,source,track=track,label=TITLES[source]+' · 전체')

def split(source, pieces, track='adult'):
    for day,start,end,name in pieces:
        task(day,source,span(source,start,end),track,TITLES[source]+' · '+name)

split('manual',[(1,None,'p4','도입·신앙을 지키는 선택'),(3,'p5','p5','기적이 오지 않아도 신뢰하기'),(5,'p6','p6','의로운 선택의 영향'),(1,'p7','p7','믿음의 권유'),(4,'figure2_p1','figure2_p1','모든 사람을 참여시키기'),(3,'figure3_p1','figure3_p1','풀무불 그림'),(2,'scripture_title2','p10','하나님의 왕국과 계시'),(7,'scripture_title4','p14','인자와 영원한 왕국'),(1,'p_nB6xw','p_e7qM9','경전 도움말 안내'),(7,'p_iRdkd','p_grqLE','다니엘의 꿈 도움말')])
task(2,'manual',span('manual','figure8','figure8'),label='하나님이 그들에게 지식을 주시고 · 전체 영상 13:57 (전문 미검증)',kind='video')
split('manual',[(3,'title7','p16','어려운 상황에서 옳은 선택'),(1,'figure5_p1','p17','몸을 돌보는 선택'),(2,'scripture_title7','p18','하나님의 왕국 그리기'),(6,'scripture_title8','p19','항상 기도하기'),(7,'figure6_p1','figure7_figure1_p1','추가 아이디어·활동지')],'family')
for n in range(1,8):whole(n,f'dan{n}')
for day,ids in [(1,['kings24','gs-daniel']),(3,['alma14']),(4,['nephi26']),(6,['phil2','luke23','matt27','cor15']),(7,['moses6','matt25','mark9','mark10','dc121','dc49','mark15','gs-son-of-man'])]:
    for source in ids:whole(day,source)
task(6,'mark14',[u for u in body('mark14') if u['anchor']=='p55'])
task(7,'mark14',[u for u in body('mark14') if u['anchor']!='p55'])
split('dc89',[(1,None,'p9','1/2 · 몸을 해치는 것을 피하기'),(7,'p10',None,'2/2 · 감사히 돌보며 약속을 기억하기')],'family')
split('uchtdorf',[(1,None,'p33','1/2 · 바벨론에서 신앙 지키기'),(3,'title4',None,'2/2 · 믿으려는 용기와 약속')])
split('church',[(2,None,'p17','1/2 · 그리스도의 몸'),(5,'p18',None,'2/2 · 함께 이루는 하나님의 왕국')])
whole(6,'eyring')
split('worship',[(4,None,'p_aq1kl','1/2 · 예배의 행동과 태도'),(5,'p_q2fmd',None,'2/2 · 오직 하나님을 예배하기')])
split('jones',[(1,None,'p14','1/2 · 자녀를 강화하기'),(4,'p15',None,'2/2 · 약속을 지키는 신앙')])
whole(3,'simmons')
split('bednar',[(2,None,'p_ey7Gw','1/3 · 첫 번째 시현'),(4,'p_uD4qs','p_iQAGM','2/3 · 몰몬경·신권·교회'),(7,'p_d4VR5',None,'3/3 · 때가 찬 경륜의 시대')])
split('rasband',[(5,None,'p14','1/2 · 회복과 성취된 예언'),(7,'p15',None,'2/2 · 재림을 준비하는 백성')])
split('eyring-witness',[(2,None,'p16','1/3 · 다니엘과 회복의 예언'),(5,'title2','p27','2/3 · 나누어야 할 책임'),(6,'title4',None,'3/3 · 함께 증인이 되기')])
whole(2,'hymn-nations')
whole(3,'hymn-choose','family')
whole(7,'hymn-adam')
split('helps',[(1,None,'p_xDhbD','도입·다니엘의 배경과 음식'),(2,'p_x2Z3u','p_dc32C','손대지 아니한 돌'),(3,'p_k1zfT','p_zeOfZ','그렇게 하지 아니하실지라도'),(5,'p_zHeQk','p_gIsfu','벽에 쓰인 글'),(6,'p_kdD6m','p_y6CMt','다니엘과 구주의 생애 비교'),(7,'p_fidhQ','p_bjpgB','짐승·인자·옛적부터 계신 이'),(1,'p_mYyIN','p_ncWCc','더 알아보기 · 충실함'),(3,'p_vfwgQ','p_vfwgQ','신앙의 말씀 안내'),(2,'p_ckDZc','p_loyNd','하나님의 왕국 자료 안내'),(2,'p_u9Faf','p_gFGqE','영상 안내 · 복음이 굴러 나아가 (전문 미검증)'),(7,'p_zJkvd','p_tGgeb','아담 온다이 아만 찬송 안내'),(1,'p_l5TQX','p_eJRQ2','음식·궁전 그림'),(2,'p_a3nBq','p_a3nBq','왕의 꿈 그림'),(3,'p_lLYmJ','p_lLYmJ','절하기를 거절함'),(5,'p_kYzwE','p_kYzwE','벨사살 그림'),(3,'p_uR2Px','p_uR2Px','풀무불 그림'),(5,'p_kULiF','p_kULiF','벽의 글 그림'),(6,'p_kgjXm',None,'사자 굴·기도 그림')])
split('children',[(3,None,'p_v1lGd','도입·옳은 선택'),(5,'p_m8ugZ','p_cE5Fz','용기·경전 놀이'),(1,'p_dZp2j','p_oIFdt','몸을 돌보기·노래'),(4,'p_iLWoH','p_lk1fM','존중하며 거절하기'),(1,'p_owaLY','p_owaLY','몸 돌보기 색칠'),(2,'p_qJ5Jk','p_oBTqe','왕의 꿈·교회'),(6,'p_jAVjR','p_e3I1Q','기도·노래'),(7,'p_eFwSl',None,'사자 굴 색칠')],'family')
for day,ids in [(1,['story-friends','song-wisdom','family-body']),(2,['story-dream','family-church']),(3,['story-fire','color-fire']),(4,['family-margo','family-guide']),(5,['family-esther']),(6,['story-lions','song-pray']),(7,['color-lions'])]:
    for source in ids:whole(day,source,'family')
# The linked November scripture-fun article is included in full, not just its
# Daniel section. Split only at complete activity headings after raw review.
split('family-fun',[(2,None,'p_bAXFA','1/4 · 옳은 일에 참여하기'),(5,'p_zhN10','p_sFjUI','2/4 · 이스라엘을 모으기'),(6,'p_anJk9','p_iYNI8','3/4 · 다니엘의 신앙'),(7,'p_uyKg5',None,'4/4 · 영을 초대하고 하나님의 계획 따르기')],'family')
for number,day in [(23,1),(25,3),(26,6)]:
    task(day,'art-ot',FIGURE_ROWS['art-ot',number],'family',f'복음 그림책 {number}번 · 그림과 설명')
task(2,'art-history',body('art-history'),'family','복음 그림책 90~95번 · 회복의 그림과 설명')

for source,rows in SCOPED.items():
    assert set(ASSIGNED.get(source,{})) == {u['anchor'] for u in rows}, (source,'coverage mismatch',{u['anchor'] for u in rows}-set(ASSIGNED.get(source,{})))
opened=set()
for day in DAYS:
    for track in ['adult','family']:
        for item in day[track+'Tasks']:
            assert item['units'] and set(item['selectedIds']) <= set(item['sourceIds'])
            for anchor in item['selectedIds']:
                key=(item['path'],item['sourceLang'],anchor)
                assert key not in opened, key
                opened.add(key)

manifest=[]
inventory=[]
links=[]
for config in CONFIG:
    source=config['id'];data=SOURCES[source];units=SCOPED[source]
    provenance=[f'{parent}#{a["owner"]}' for parent in ['manual','helps','children'] for a in SOURCES[parent]['links'] if urlsplit(a['href']).path==data['path']]
    if source.startswith('dan') and source[3:].isdigit():provenance.append('manual#title1 (full weekly chapters 1–7)')
    if source=='gs-daniel':provenance.append('manual#p2 (named without link)')
    if not provenance:provenance=[f'children (named resource; verified English counterpart)' if source.startswith('family-') or source.startswith('song-') else 'helps (named resource)']
    scope='verses '+', '.join(map(str,config['verses'])) if 'verses' in config else 'Gospel Art Book figures '+', '.join(map(str,config['figures'])) if 'figures' in config else 'full article including notes'
    entry=dict(id=source,title=TITLES[source],path=data['path'],lang=data['lang'],retrieved='2026-11-08',htmlSha256=data['htmlSha256'],scope=scope,provenance=sorted(set(provenance)),units=[{k:v for k,v in u.items() if k not in {'text','tag','noteGroup'}} for u in units],media=data['media'],durationSeconds=data['durationSeconds'])
    for key in ['verses','figures']:
        if key in config:entry[key]=config[key]
    if source=='manual':entry['mediaScope']='figure8 metadata and full player; embedded story films are alternatives; transcript and PDF interiors not audited'
    if data['lang']=='eng':entry['languageNote']='English positions verified; Korean route unavailable or resolves to collection, except hymn-adam explicitly linked in English'
    manifest.append(entry)
    for u in units:
        day,track,item=ASSIGNED[source][u['anchor']]
        inventory.append([source+'#'+u['anchor'],TITLES[source],data['path'],u['anchor'],data['lang'],day,track,item,u['chars'] if data['lang']=='kor' else 0,u['words'] if data['lang']=='eng' else 0,int(u['note']),u['sha256']])
    for a in data['links']:
        path=urlsplit(a['href']).path
        included=next((s for s in CONFIG if s['path']==path),None)
        owner=next((u for u in units if u['anchor']==a['owner']),None)
        decision='included '+included['id']+' (see exact scope)' if included else 'same-document note/navigation' if path in {'',data['path']} or a['href'].startswith('#') else 'official image/PDF/media retained; interior/transcript not audited' if '/media/' in path or 'assets.churchofjesuschrist.org' in a['href'] else 'additional exploration: reference inside a note; no recursive expansion' if owner and owner['note'] else 'additional exploration: magazine/collection navigation' if path.endswith('/friend') else 'outside selected chapter/figure scope' if ('verses' in config or 'figures' in config) and not owner else 'additional exploration: secondary illustration/reference, not separately named study assignment'
        links.append([source,a['owner'],a['label'],a['href'],decision])

Path('src/data/cfm-2026-week-46.json').write_text(json.dumps(dict(version=1,week=46,dates='2026-11-09/2026-11-15',days=DAYS),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(DOCS/'2026-week-46-sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for name,header,rows in [('source-inventory',['unit','source','path','anchor','lang','day','track','task','koChars','enWords','note','sha256'],inventory),('source-links',['source','owner','label','href','decision'],links)]:
    with (DOCS/f'2026-week-46-{name}.csv').open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.writer(f);w.writerow(header);w.writerows(rows)

# Media is a separate inventory: images, PDF worksheets and embedded players
# are not silently treated as transcribed text. Keep their actual source/asset
# links, including video captions without paragraph IDs and image-only pages.
media_rows=[]
for config in CONFIG:
    source=config['id'];data=SOURCES[source]
    main=next(e for e in TREES[source].root.walk() if e.attrs.get('id')=='main')
    nodes=list(main.walk())
    for index,node in enumerate(nodes):
        is_video=node.tag=='figure' and 'video' in node.attrs.get('class','').split()
        is_asset=node.tag=='a' and 'assets.churchofjesuschrist.org' in node.attrs.get('href','')
        is_media_link=node.tag=='a' and '/media/' in node.attrs.get('href','')
        if not (node.tag=='img' or is_video or is_asset or is_media_link):continue
        if node.tag=='img' and (not node.attrs.get('id') or '아이콘' in node.attrs.get('alt','')):continue
        marker=next((e.attrs['data-marker'] for e in node.parents() if 'data-marker' in e.attrs),None)
        if 'figures' in config and marker not in {str(n) for n in config['figures']}:continue
        anchor=node.attrs.get('id') or next((e.attrs['id'] for e in node.parents() if e.attrs.get('id')),'main')
        owners=[]
        for container in [node,*node.parents()]:
            owners=[e.attrs['id'] for e in container.walk() if e.attrs.get('id') in ASSIGNED[source]]
            if owners:break
        # Main-level story illustrations align with the nearest following text.
        if len({ASSIGNED[source][o][:2] for o in owners})>1:
            following=[e.attrs['id'] for e in nodes[index+1:] if e.attrs.get('id') in ASSIGNED[source]]
            owners=following[:1] or owners[-1:]
        owner=owners[0] if owners else next(iter(ASSIGNED[source]))
        day,track,item=ASSIGNED[source][owner]
        label=audit.normalized(node) if node.tag!='img' else node.attrs.get('alt','')
        href=node.attrs.get('href') or node.attrs.get('src') or ('https://www.churchofjesuschrist.org'+data['path']+'?lang='+data['lang']+'#'+anchor)
        role='image; inner lettering not transcribed' if node.tag=='img' else 'PDF/file; interior not audited' if is_asset else 'full video/player link; transcript not audited' if is_video or '/video/' in href else 'linked music; audio not audited'
        if source=='manual' and anchor in {'figure9','figure10','figure11'}:
            target={'figure9':'story-friends','figure10':'story-fire','figure11':'story-lions'}[anchor]
            day,track,item=next(iter(ASSIGNED[target].values()))
            role='same film as '+target+'; alternative to story text, not another required viewing'
        if source=='helps' and ('/2011-03-0010-' in href or anchor=='fig_nA8pi'):
            day,track,item=ASSIGNED['manual']['figure8']
            role='same film as manual#figure8; guide says 13:49, manual player says 13:57'
        if source=='helps' and '/2018-07-0001-' in href:
            role='full film; guide says 2:44, linked player says 2:48; transcript not audited'
        duration=','.join(sorted({audit.normalized(e) for e in node.walk() if e.tag=='div' and re.fullmatch(r'\d{1,3}:\d{2}',audit.normalized(e))})) if is_video else ''
        media_rows.append([source,anchor,node.tag,label,href,day,track,item,duration,role])
with (DOCS/'2026-week-46-media.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.writer(f);w.writerow(['source','anchor','kind','label','href','day','track','task','displayDuration','scope']);w.writerows(media_rows)
summary=[]
for day in DAYS:
    counts=[]
    for track in ['adult','family']:
        rows=[r for r in inventory if r[5]==day['day'] and r[6]==track]
        counts.append(dict(track=track,units=len(rows),koChars=sum(r[8] for r in rows),enWords=sum(r[9] for r in rows),notes=sum(r[10] for r in rows),verses=sum(len(u['verseNumbers']) for source,units in SCOPED.items() for u in units if ASSIGNED[source][u['anchor']][:2]==(day['day'],track)),tasks=len(day[track+'Tasks'])))
    summary.append(dict(day=day['day'],title=day['shortTitle'],counts=counts))
(CACHE/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(dict(sources=len(manifest),units=len(inventory),days=summary),ensure_ascii=False,indent=2))
