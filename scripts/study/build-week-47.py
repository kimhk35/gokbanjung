"""Rebuild the audited 2026 week 47 allocation from ignored official HTML caches.

The cache is intentionally not source-controlled. Fetch each manifest path into
 test-results/week47 with audit-sources.py before rebuilding. Do not run an older
week's builder: task IDs are persisted progress keys. Source scope and chapter
coverage are asserted before outputs are published. Article text is never copied
into the application or tracked reports.
"""
import csv
import hashlib
import importlib.util
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit, urljoin, parse_qs

sys.dont_write_bytecode = True
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf8')
CACHE = Path('test-results/week47')
DOCS = Path('docs/study')
requested = CACHE / 'requested-sources.json'
CONFIG = json.loads((requested if requested.exists() else DOCS/'2026-week-47-sources.json').read_text(encoding='utf8'))
SOURCES = {c['id']: json.loads((CACHE/(c['id']+'.json')).read_text(encoding='utf8')) for c in CONFIG}
spec = importlib.util.spec_from_file_location('audit', Path(__file__).with_name('audit-sources.py'))
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)
TREES = {s: audit.Tree((CACHE/(s+'.html')).read_text(encoding='utf8')) for s in SOURCES}
TITLES = {c['id']: c['title'] for c in CONFIG}
TITLES.update({'09-teach-by-the-spirit':'영으로 가르친다','matt-12':'마태복음 12:1~8','mosiah-18':'모사이야서 18:7~11','family-spirit':'Weekly Scripture Fun · 2026년 11월 전체 연결 글','elder-soares-speaks-to-children':'소아레스 장로님과 어린이들의 대화'})
SCOPED = {}
for config in CONFIG:
    source = config['id']
    data = SOURCES[source]
    rows = data['units']
    if 'verses' in config:
        wanted = set(config['verses'])
        selected = {u['anchor'] for u in rows if wanted.intersection(u['verseNumbers'])}
        assert {v for u in rows if u['anchor'] in selected for v in u['verseNumbers']} == wanted, source
        rows = [u for u in rows if u['anchor'] in selected or (u['note'] and selected.intersection(u['noteOwners']))]
    assert rows, (source, 'empty/collection source')
    SCOPED[source] = rows

SHORT = ['다시 맺는 사랑의 성약','돌아오라는 주님의 초대','겉모양보다 마음의 충실함','지금 주님을 찾고 영을 구하기','구속주를 따르며 영을 맞이하기','모든 사람에게 부어 주시는 영','영의 속삭임을 듣고 행하기']
EN = ['Love and a renewed covenant','The Lord invites us to return','Faithfulness of the heart','Seek the Lord and His Spirit now','Follow the Redeemer and receive the Spirit','The Spirit poured out on all people','Hear and act on the Spirit’s promptings']
QUESTIONS = ['주님께서 나와 맺으신 성약을 기억할 때, 그분께 돌아가기 위해 어떤 선택을 할 수 있나요?','주님의 사랑과 용서를 받아들이기 위해 오늘 내려놓을 것은 무엇인가요?','겉으로 보이는 신앙과 내 마음의 충실함이 일치하도록 무엇을 바꿀 수 있나요?','지금 주님을 찾고 성신을 구하기 위해 어떤 시간을 마련할 수 있나요?','예수 그리스도를 구속주로 신뢰하며 성신을 맞이하려면 어떤 마음과 행동이 필요한가요?','하나님께서 모든 사람에게 영을 주신다는 약속을 내 삶에서 어떻게 경험하나요?','성신의 속삭임을 더 잘 알아듣고 그에 따라 행동하기 위해 무엇을 실천하겠나요?']
FAMILY = ['약속과 성약을 지켜요','주님께 다시 돌아가요','예수님을 노래해요','지금 주님을 찾아요','예수님은 나의 구속주예요','성신의 느낌을 알아보아요','성신을 초대하는 상자를 만들어요']
FAMILY_EN = ['Keeping promises and covenants','Returning to the Lord','Singing about Jesus','Seeking the Lord now','Jesus is my Redeemer','Recognizing the Holy Ghost','Making an Invite the Spirit box']
ACTIVITIES = ['기본 과정에서 읽은 호세아 2:19~20을 떠올리며 서로 지킬 수 있는 약속 하나를 정합니다.','약속을 지키는 이야기와 연결 글의 활동을 살펴보고 잘못한 뒤 다시 시작하는 방법을 이야기합니다.','예수님에 관한 색칠 자료를 보며 그분을 기리는 노래를 부르고 마음으로 주님을 따른다는 뜻을 나눕니다.','호세아 10:12를 기본 과정에서 읽은 뒤 시계를 만들고 언제 어디서 주님을 찾을 수 있는지 이야기합니다.','기본 과정의 호세아 13:4,14를 떠올리며 예수님께서 우리를 한 명씩 사랑하신다는 이야기를 읽습니다.','요엘 2:28~29를 기본 과정에서 읽은 뒤 물을 붓는 활동과 노래로 성신의 선물을 이야기합니다.','성신에 관한 세 성구를 차례로 읽고, 노래·기도·경전·봉사로 영을 초대하는 상자를 만듭니다.']
DAYS = [dict(day=n,shortTitle=SHORT[n-1],shortTitleEn=EN[n-1],question=QUESTIONS[n-1],familyTitle=FAMILY[n-1],familyTitleEn=FAMILY_EN[n-1],familyQuestion=['나는 어떤 약속을 지킬 수 있나요?','잘못했을 때 어떻게 다시 시작할까요?','예수님을 생각하면 어떤 노래를 부르고 싶나요?','언제 어디서 주님을 찾을 수 있나요?','예수님은 나를 어떻게 도와주시나요?','성신을 느낄 때 마음은 어떤가요?','우리 가족은 어떻게 성신을 초대할까요?'][n-1],familyActivity=ACTIVITIES[n-1],adultTasks=[],familyTasks=[]) for n in range(1,8)]
KEYS = {}
CHAINS = []

def body(source):
    return [u for u in SCOPED[source] if not u['note']]

def span(source,start=None,end=None):
    rows=body(source); ids=[u['anchor'] for u in rows]
    return rows[ids.index(start) if start else 0:ids.index(end)+1 if end else len(rows)]

def verses(source,numbers,head=False):
    wanted=set(numbers)
    return [u for u in body(source) if wanted.intersection(u['verseNumbers']) or (head and not u['verseNumbers'])]

def task(key,day,source,rows=None,track='adult',label=None,kind=None,note=None,related=()):
    assert key not in KEYS, key
    rows=list(body(source) if rows is None else rows)
    assert rows, key
    data=SOURCES[source]
    visible=[u['anchor'] for u in rows if u['anchor'] not in {'reference1','short_reference1'}]
    assert visible, key
    item=dict(sourceId=source,kind=kind or ('manual' if source=='manual' else 'scripture' if '/scriptures/' in data['path'] else 'reading'),label=(label or TITLES[source])+(' · 영어 원문' if data['lang']=='eng' else ''),path=data['path'],sourceLang=data['lang'],sourceLanguageLocked=True,anchor=visible[0],endAnchor=visible[-1],units=[],sourceIds=[],selectedIds=visible,noteLinks=[],_rows=rows,_key=key,_related=list(related),_day=day,_track=track)
    if note:item['readingNote']=note
    DAYS[day-1][track+'Tasks'].append(item); KEYS[key]=item
    return item

def part(key,day,source,start,end,label,**kwargs):
    return task(key,day,source,span(source,start,end),label=label,**kwargs)

def whole(key,day,source,**kwargs):
    return task(key,day,source,label=TITLES[source]+' · 전체',**kwargs)

def connect(instruction,targets,scope,mode='immediate'):
    # Literal target task keys are independently checked against final task order.
    CHAINS.append(dict(instruction=instruction,targets=list(targets),scope=scope,mode=mode))

# DAY 1: chapter 1–3 forms one uninterrupted primary reading after the manual's
# explicit instruction. Explanatory helps refer to this same-day owner, never
# create a second mandatory scripture task.
part('manual-intro',1,'manual',None,'p3','교재 · 주간 도입과 선지자 안내')
whole('gs-hosea',1,'gs-hosea')
whole('gs-joel',1,'gs-joel')
connect('manual-intro',['gs-hosea','gs-joel'],'경전 안내서 호세아와 요엘 전체')
part('helps-background',1,'helps',None,'p_plcYD','도움말 · 소선지자와 호세아의 배경')
part('manual-covenant',1,'manual','title2','p4','교재 · 호세아 1~3장을 읽으며 성약 생각하기')
whole('hos1',1,'hos1'); whole('hos2',1,'hos2'); whole('hos3',1,'hos3')
connect('manual-covenant',['hos1','hos2','hos3'],'호세아 1~3장 전체')
part('manual-gomer',1,'manual','figure1_p1','figure1_p1','교재 · 고멜 그림과 설명')
part('helps-marriage',1,'helps','p_iHsEv','p_tAmkM','도움말 · 성약의 결혼과 하나님의 자녀',note='호세아 1~3장은 바로 앞 기본 과정에서 읽었습니다. 같은 본문을 떠올리며 질문을 살펴보세요.',related=['hos1','hos2','hos3'])
part('helps-covenant',1,'helps','p_cbpuH','p_hSarS','도움말 · 성약의 관계와 변함없는 사랑',note='호세아 2장은 오늘 기본 과정에서 이미 읽은 본문입니다. 관련 본문으로 돌아가 살펴볼 수 있습니다.',related=['hos2'])

# DAY 2: the return invitation, its complete scripture, hymn, then the full
# directly designated Kearon message. No article excerpt is silently omitted.
part('manual-return',2,'manual','p5','p5','교재 · 호세아 14장을 읽고 주님의 초대에 응답하기')
whole('hos14',2,'hos14'); whole('hymn-jesus',2,'come-unto-jesus')
connect('manual-return',['hos14','hymn-jesus'],'호세아 14장, 예수께 오라')
part('helps-love',2,'helps','p_fmIv9','p_j5T6c','도움말 · 하나님의 사랑에 관한 말씀')
whole('kearon',2,'45kearon')
connect('helps-love',['kearon'],'패트릭 키런 말씀 전체')
part('helps-jesus-song',2,'helps','p_qWHJd','p_o6ILT','도움말 · 예수께 오라 음악 안내',note='이 찬송은 오늘 앞부분에서 이미 살펴보았습니다. 다시 부르고 싶다면 연결된 찬송으로 돌아가세요.',related=['hymn-jesus'])

# DAY 3: exact compare instructions and their targets stay adjacent. Joel's two
# verses belong here; chapter 2's remaining verses are deliberately owned day 6.
whole('hos4',3,'hos4'); whole('hos5',3,'hos5')
task('hos6-opening',3,'hos6',verses('hos6',range(1,4),head=True),label='호세아 6:1~3 · 돌아가자는 초대')
part('manual-heart',3,'manual','scripture_title2','p6','교재 · 충실함을 물에 비유한 세 본문 비교하기')
task('hos6-compare',3,'hos6',verses('hos6',range(4,8)),label='호세아 6:4~7 · 인애와 충실함')
whole('isa48',3,'isa-48'); whole('nephi2',3,'1-ne-2')
connect('manual-heart',['hos6-compare','isa48','nephi2'],'호세아 6:4~7, 이사야 48:18, 니파이전서 2:9~10')
task('hos6-ending',3,'hos6',verses('hos6',range(8,12)),label='호세아 6:8~11 · 나머지 본문')
part('manual-jesus-mercy',3,'manual','p7','p7','교재 · 예수님이 인용하신 말씀 살펴보기')
whole('matt9',3,'matt-9'); whole('matt12',3,'matt-12')
connect('manual-jesus-mercy',['matt9','matt12'],'마태복음 9:10~13;12:1~8')
part('manual-rend-heart',3,'manual','p8','p8','교재 · 요엘의 마음을 찢으라는 권유')
task('joel2-heart',3,'joel2',verses('joel2',[12,13]),label='요엘 2:12~13 · 마음을 다해 돌아오기')
connect('manual-rend-heart',['joel2-heart'],'요엘 2:12~13')
part('helps-mercy',3,'helps','p_eXOqV','p_zOBVI','도움말 · 인애를 원하시는 하나님',note='호세아 6:6~7과 예수님의 인용은 오늘 앞부분에서 읽었습니다.',related=['hos6-compare','matt9','matt12'])
part('helps-joel-intro',3,'helps','p_tP5r2','p_nz0yU','도움말 · 요엘과 마음을 찢는 회개',note='요엘 2:12~13은 바로 앞에서 읽은 본문입니다.',related=['joel2-heart'])
part('teach-prep-question',3,'09-teach-by-the-spirit',None,'p3','영으로 가르친다 · 1/4 준비와 예수님의 모범',note='이 연결 글의 상단에는 4분 17초 학습 영상이 함께 제공됩니다. 마태복음을 살펴보라는 질문 뒤에 해당 성구가 이어집니다.')
whole('matt4',3,'matt-4')
connect('teach-prep-question',['matt4'],'마태복음 4:1~11')
part('teach-prep-rest',3,'09-teach-by-the-spirit','p4','p11','영으로 가르친다 · 2/4 준비와 사람의 필요',note='영으로 가르치는 글의 앞부분입니다. 성신을 초대하는 환경과 간증에 관한 나머지는 5일차와 7일차에 이어집니다.',related=['teach-environment','teach-testimony-question'])

# DAY 4 keeps written load short: the named Bednar source is a 61:29 video,
# not a missing Korean transcript. Its player immediately follows the quotation.
whole('hos10',4,'hos10'); whole('hos11',4,'hos11'); whole('hos12',4,'hos12')
part('manual-bednar',4,'manual','p16','p18','교재 · 성신을 받으라는 권유와 베드나 장로의 인용')
whole('bednar',4,'bednar-discussion',kind='video',note='한국어 원문은 영상으로 제공되며 글 전문은 제공되지 않습니다. 전체 영상은 61분 29초이며, 앞 교재에 실린 인용문과 함께 살펴보세요.')
connect('manual-bednar',['bednar'],'베드나 토론 전체 영상61:29, 한국어 전문 없음')

# DAY 5 completes the question with all its examples before changing topics.
whole('hos13',5,'hos13')
part('manual-spirit-question',5,'manual','p12','p13','교재 · 성신을 더 풍성히 받는 원리와 모사이야서의 사례')
whole('mosiah4',5,'mosiah-4'); whole('mosiah18',5,'mosiah-18')
connect('manual-spirit-question',['mosiah4','mosiah18'],'모사이야서 4:1~3,19~20;18:7~11')
part('manual-helaman',5,'manual','p14','p14','교재 · 힐라맨서에서 성신을 받는 원리 찾기')
whole('hel6',5,'hel-6');connect('manual-helaman',['hel6'],'힐라맨서 6:34~36')
part('manual-dc19',5,'manual','p15','p15','교재 · 교리와 성약에서 약속 찾기')
whole('dc19',5,'dc-19');connect('manual-dc19',['dc19'],'교리와 성약 19:37~41')
part('manual-teach',5,'manual','p20','p20','교재 · 영으로 배울 환경을 마련하기')
part('teach-environment',5,'09-teach-by-the-spirit','title9','p19','영으로 가르친다 · 3/4 성신을 느낄 환경과 개인 계시',note='글의 준비와 학습자의 필요에 관한 앞부분은 3일차, 간증에 관한 뒷부분은 7일차에 이어집니다.',related=['teach-prep-question','teach-prep-rest','teach-testimony-question'])
connect('manual-teach',['teach-environment'],'영으로 가르친다 p14의 환경 질문을 포함한 소제목 전체')

# DAY 6: Joel2's previous two verses are not assigned twice. All remaining
# chapter units are contiguous spans around that already-owned passage.
whole('joel1',6,'joel1')
part('manual-spirit-promise',6,'manual','scripture_title3','p9','교재 · 요엘 2장의 마지막 날과 성신의 약속',note='회개를 권유하는 12~13절은 3일차에서 읽었습니다. 오늘은 2장의 나머지 본문을 읽습니다.',related=['joel2-heart'])
task('joel2-opening',6,'joel2',verses('joel2',range(1,12),head=True),label='요엘 2:1~11 · 여호와의 날')
task('joel2-promise',6,'joel2',verses('joel2',range(14,33)),label='요엘 2:14~32 · 회복과 성신의 약속')
connect('manual-spirit-promise',['joel2-opening','joel2-promise'],'요엘2장 중 3일차에 소유된12~13절을 제외한 전체')
part('manual-prophecy',6,'manual','p10','p10','교재 · 요엘의 예언을 인용한 두 사건',note='요엘 2:28~32는 바로 앞에서 읽었습니다. 이제 두 사건의 본문을 차례로 비교하세요.',related=['joel2-promise'])
whole('jsh',6,'js-h-1');whole('acts2',6,'acts-2')
connect('manual-prophecy',['jsh','acts2'],'조셉스미스—역사1:41, 사도행전2:1~21')
part('helps-spirit',6,'helps','p_x3Os3','p_oh5Pn','도움말 · 요엘의 예언과 영을 부어 주시는 약속',note='요엘의 약속과 두 사건은 오늘 앞부분에서 읽었습니다. 같은 본문을 떠올리며 설명을 살펴보세요.',related=['joel2-promise','jsh','acts2'])
part('manual-nelson',6,'manual','p11','p11','교재 · 계시를 받는 능력에 관한 넬슨 회장의 말씀')
whole('nelson',6,'revelation-for-the-church-revelation-for-our-lives')
connect('manual-nelson',['nelson'],'넬슨2018계시 말씀 전체')
part('helps-nelson',6,'helps','p_ws2IN','p_bY7tI','도움말 · 같은 계시 말씀 안내',note='도움말에서 권하는 넬슨 회장 말씀은 바로 앞에서 읽은 동일한 글입니다. 새 필수 읽기를 추가하지 않습니다.',related=['nelson'])
part('helps-spirit-hymn',6,'helps','p_u7bOc','p_u7bOc','도움말 · 타는 듯한 하나님의 영 찬송 안내')
whole('hymn-spirit',6,'spirit-of-god');connect('helps-spirit-hymn',['hymn-spirit'],'타는 듯한 하나님의 영 전체')

# DAY 7 closes the week's Spirit theme and complete teaching/article scope.
whole('joel3',7,'joel3')
part('manual-promptings',7,'manual','p19','p19','교재 · 영의 속삭임과 적진 영상')
whole('stevenson',7,'25stevenson');whole('enemy',7,'enemy-territory',kind='video',note='한국어 공식 영상은 3분 38초입니다. 이 페이지에는 영상과 소개문이 제공됩니다.')
connect('manual-promptings',['stevenson','enemy'],'스티븐슨 말씀 전체와 적진 전체 영상3:38')
part('teach-testimony-question',7,'09-teach-by-the-spirit','title15','p20','영으로 가르친다 · 4/4 간증의 모범 살펴보기')
whole('john11',7,'john-11');connect('teach-testimony-question',['john11'],'요한복음11:25~27')
part('teach-testimony-rest',7,'09-teach-by-the-spirit','p21',None,'영으로 가르친다 · 간증과 배운 것 적용하기',note='이로써 3일차부터 나누어 읽은 연결 글 전체를 마칩니다.',related=['teach-prep-question','teach-prep-rest','teach-environment'])
part('manual-helps-navigation',7,'manual','p_uHXgV','p_jgY1j','교재 · 경전 도움말의 연결 안내',note='소선지자의 배경과 하나님의 자녀에 관한 설명은 1일차에 읽었습니다. 같은 도움말을 다시 필수 읽기로 넣지 않았습니다.',related=['helps-background','helps-marriage'])
part('helps-image',7,'helps','p_xywpk',None,'도움말 · 구주 그림과 설명')

# FAMILY: no repeated primary scripture ownership. Each reused passage offers
# explicit same-week navigation; each newly assigned target follows its instruction.
part('family-covenant',1,'manual','title6','p21','가족 교재 · 성약 지키기',track='family',note='호세아 2:19~20은 오늘 기본 과정의 호세아 2장에 있습니다. 먼저 그 본문을 함께 읽은 뒤 활동하세요.',related=['hos2'])
part('children-intro',1,'children',None,'p_k2Cgg','어린이 자료 · 도입과 성약 이야기',track='family',note='호세아 2:19~20은 오늘 기본 과정에서 읽는 같은 본문입니다.',related=['hos2'])
whole('soares',1,'elder-soares-speaks-to-children',track='family');connect('children-intro',['soares'],'소아레스 장로와 어린이들의 대화 전체')
# Extra sections from the full directly designated monthly article are retained,
# labelled as other-week activities rather than expanded into unrelated chapters.
part('monthly-first',1,'family-spirit',None,'p_bAXFA','연결 글의 다른 주차 활동 · 10/26~11/1',track='family',note='11월 연결 글 전체 중 다른 주차 활동입니다. 여기에 적힌 다른 주의 경전 장 전체를 이번 주 분량으로 추가하지는 않습니다.')
part('children-promise',2,'children','p_dqFQ5','p_dqFQ5','어린이 자료 · 약속 지키기 안내',track='family')
whole('keeping-promise',2,'keeping-his-promise',track='family');connect('children-promise',['keeping-promise'],'약속지키기 전체')
part('monthly-second',2,'family-spirit','p_zhN10','p_sFjUI','연결 글의 다른 주차 활동 · 11/2~8',track='family',note='11월 연결 글의 다른 주차 활동입니다. 그 주의 경전 장 전체는 이번 주 필수 범위에 포함하지 않습니다.')
part('children-sing',3,'children','p_bhV0C','p_bhV0C','어린이 자료 · 예수님에 관해 노래하기 안내',track='family')
whole('sing-jesus',3,'32-i-can-sing-about-jesus',track='family');connect('children-sing',['sing-jesus'],'예수님 노래 색칠 글 전체')
part('monthly-third',3,'family-spirit','p_anJk9','p_iYNI8','연결 글의 다른 주차 활동 · 11/9~15',track='family',note='지난주 다니엘 활동이 들어 있는 월간 글의 일부입니다. 이번 주 기본 과정의 새 성구 분량은 아닙니다.')
part('family-seek',4,'manual','scripture_title5','p23','가족 교재 · 지금 주님을 찾기',track='family',note='호세아 10:12는 오늘 기본 과정의 호세아 10장에서 읽습니다. 그 본문을 함께 읽은 뒤 시계와 씨앗 활동을 해 보세요.',related=['hos10'])
whole('anytime',4,'anytime-anywhere',track='family');connect('family-seek',['anytime'],'AnytimeAnywhere찬송 전체')
part('children-seek',4,'children','p_s5zFS','p_bmgXd','어린이 자료 · 사랑의 빛 안에 걸어가고',track='family',note='호세아 10:12는 오늘 기본 과정에 배정되어 있습니다.',related=['hos10'])
whole('walk-light',4,'teach-me-to-walk-in-the-light',track='family');connect('children-seek',['walk-light'],'사랑의빛안에걸어가고 전체')
part('seek-video',4,'children','p_rRJB3','p_rRJB3','어린이 영상 · 지금 주님을 찾을 때 0:35',track='family',kind='video',note='이 문장 바로 아래 공식 플레이어에서 35초 영상을 볼 수 있습니다. 자막 전문은 제공되지 않습니다.')
part('family-redeemer',5,'manual','scripture_title6','p25','가족 교재 · 나의 구주와 구속주',track='family',note='호세아 13:4,14는 오늘 기본 과정의 호세아 13장에서 읽습니다. 같은 성구를 함께 떠올리며 그림과 뜻을 나누세요.',related=['hos13'])
part('children-redeemer',5,'children','p_vWFMz','p_yfrfM','어린이 자료 · 구주와 구속주',track='family',note='이 주제의 호세아 본문과 노래 활동은 각각 기본 과정 5일차와 가족 과정 3일차에 있습니다.',related=['hos13','sing-jesus'])
part('children-one-by-one',5,'children','p_tkjkE','p_tkjkE','어린이 자료 · 한 명씩 축복하신 예수님 안내',track='family')
whole('one-by-one',5,'17-jesus-blessed-one-by-one',track='family');connect('children-one-by-one',['one-by-one'],'예수님은한명씩축복하셨어요 전체')
part('monthly-last',5,'family-spirit','p_qas3k',None,'연결 글의 다른 주차 활동 · 11/23~29',track='family',note='다음 주 요나 활동이 들어 있는 월간 글의 일부입니다. 이번 주 기본 과정에 요나서 장 전체를 추가하지 않습니다.')
part('family-pour',6,'manual','scripture_title7','p26','가족 교재 · 성신을 부어 주시는 약속',track='family',note='요엘 2:28~29는 오늘 기본 과정의 요엘 2:14~32에 있습니다. 먼저 함께 읽은 뒤 물을 붓는 활동을 해 보세요.',related=['joel2-promise'])
part('children-spirit',6,'children','p_cqvLW','p_mfaZe','어린이 자료 · 고요하고 작은 음성 안내',track='family',note='요엘 2:28~29는 오늘 기본 과정에서 읽습니다. 아래 노래는 한국어 원문이 제공되지 않아 영어 노래책으로 연결됩니다.',related=['joel2-promise'])
whole('still-voice',6,'still-small-voice',track='family');connect('children-spirit',['still-voice'],'고요하고작은음성 전체 영어가사')
part('family-spirit-scriptures',7,'manual','p27','p27','가족 교재 · 성신에 관한 세 가지 성구 읽기',track='family',note='요엘 2:28~29는 기본 과정 6일차에서 읽었습니다. 오늘은 이어지는 세 성구를 함께 읽습니다.',related=['joel2-promise'])
whole('john14',7,'john-14',track='family');whole('moroni10',7,'moro-10',track='family');whole('dc42',7,'dc-42',track='family')
connect('family-spirit-scriptures',['john14','moroni10','dc42'],'요한복음14:16;모로나이10:5;교성42:17')
part('children-feel',7,'children','p_f54lp','p_f54lp','어린이 자료 · 성신 색칠 활동 안내',track='family')
whole('feel-ghost',7,'i-can-feel-the-holy-ghost',track='family');connect('children-feel',['feel-ghost'],'나는성신을느껴요 전체')
part('children-box',7,'children','p_sqejF','p_sqejF','어린이 자료 · 성신을 초대하는 상자 안내',track='family')
part('monthly-this-week',7,'family-spirit','p_uyKg5','p_tSxUJ','이번 주 연결 활동 · 하나님께서 영을 주실 거예요',track='family')
part('monthly-song-instruction',7,'family-spirit','p_aIMzs','p_aIMzs','이번 주 연결 활동 · 성신 노래 부르기',track='family')
whole('holy-ghost',7,'song-holy-ghost',track='family');connect('monthly-song-instruction',['holy-ghost'],'성신 노래 전체')
part('monthly-box',7,'family-spirit','p_dVECq','p_rgsK8','이번 주 연결 활동 · 성신을 초대하는 상자 만들기',track='family',note='이 활동의 요엘 2:28은 기본 과정 6일차에 배정된 같은 성구입니다. 그림 속 글씨와 오려 쓰는 활동지는 공식 원문에서 확인하세요.',related=['joel2-promise'])
connect('children-box',['monthly-this-week'],'지정11/16~22활동 시작')
part('family-closing',7,'manual','figure2_p1','figure7_figure1_p1','가족 교재 · 추가 자료와 구주 그림',track='family')

# Assign stable IDs in actual display order, then own each note at its earliest
# selected citing paragraph. Shared footnotes are never counted twice.
ASSIGNED={}; items=[]
for day in DAYS:
    for track in ['adult','family']:
        for item in day[track+'Tasks']:
            item['id']=f'w47-t{len(items)+1:03d}';items.append(item)
            source=item['sourceId']
            for u in item['_rows']:
                assert u['anchor'] not in ASSIGNED.setdefault(source,{}),(source,u['anchor'],'duplicate body')
                ASSIGNED[source][u['anchor']]=(day['day'],track,item['id'])
for source,rows in SCOPED.items():
    owned=ASSIGNED.get(source,{})
    for note in [u for u in rows if u['note']]:
        candidates=[t for t in items if t['sourceId']==source and set(note['noteOwners']).intersection(t['selectedIds'])]
        target=(candidates or [t for t in items if t['sourceId']==source])[0]
        target['_rows'].append(note);owned[note['anchor']]=(target['_day'],target['_track'],target['id'])
for item in items:
    source=item['sourceId'];rows=item['_rows']
    item['units']=[source+'#'+u['anchor'] for u in rows]
    item['sourceIds']=[u['anchor'] for u in rows]
    item['noteLinks']=[dict(note=u['anchor'],owner=next(o for o in u['noteOwners'] if o in item['selectedIds'])) for u in rows if u['note'] and set(u['noteOwners']).intersection(item['selectedIds'])]
    if item['_related']:item['relatedTaskIds']=[KEYS[k]['id'] for k in item['_related']]
for source,rows in SCOPED.items():
    assert set(ASSIGNED.get(source,{}))=={u['anchor'] for u in rows},(source,'coverage mismatch',{u['anchor'] for u in rows}-set(ASSIGNED.get(source,{})))
    assert all(u['anchor'] in SOURCES[source]['allIds'] for u in rows),(source,'nonexistent anchor')
positions=set()
for item in items:
    for anchor in item['selectedIds']:
        key=(item['path'],item['sourceLang'],anchor)
        assert key not in positions,('repeated blue position',key)
        positions.add(key)
for chain in CHAINS:
    instruction=KEYS[chain['instruction']]
    track=DAYS[instruction['_day']-1][instruction['_track']+'Tasks']
    i=track.index(instruction)
    targets=[KEYS[k] for k in chain['targets']]
    assert track[i+1:i+1+len(targets)]==targets,('nonadjacent instruction',chain['instruction'])

# These are the independently verified published chapter counts, not sums
# derived from the allocation, so a source omission cannot validate itself.
EXPECTED={'hos1':11,'hos2':23,'hos3':5,'hos4':19,'hos5':15,'hos6':11,'hos10':15,'hos11':12,'hos12':14,'hos13':16,'hos14':9,'joel1':20,'joel2':32,'joel3':21}
for source,count in EXPECTED.items():
    seen=[n for u in SCOPED[source] if not u['note'] for n in u['verseNumbers']]
    assert sorted(seen)==list(range(1,count+1)),(source,'chapter verses',seen)

# Minimal data is written before report construction so integration can proceed.
clean_days=[]
for day in DAYS:
    clean={k:v for k,v in day.items() if k not in ['adultTasks','familyTasks']}
    for track in ['adult','family']:
        clean[track+'Tasks']=[{k:v for k,v in item.items() if not k.startswith('_')} for item in day[track+'Tasks']]
    clean_days.append(clean)
Path('src/data/cfm-2026-week-47.json').write_text(json.dumps(dict(version=1,week=47,dates='2026-11-16/2026-11-22',days=clean_days),ensure_ascii=False,indent=2)+'\n',encoding='utf8')

manifest=[];inventory=[];links=[];media_rows=[]
for config in CONFIG:
    source=config['id'];data=SOURCES[source];units=SCOPED[source]
    provenance=[f'{parent}#{a["owner"]}' for parent in ['manual','helps','children','09-teach-by-the-spirit','family-spirit'] for a in SOURCES[parent]['links'] if urlsplit(a['href']).path==data['path']]
    if source in EXPECTED:provenance.append('manual#title1 (complete declared weekly chapters)')
    if source in ['gs-hosea','gs-joel']:provenance.append('manual#p3 (named without working link)')
    if source=='still-small-voice':provenance.append('children#p_mfaZe (data-legacy-href names Children’s Songbook)')
    if source=='family-spirit':provenance.append('children#p_sqejF (data-legacy-href selects p_tSxUJ)')
    if source=='enemy-territory':provenance.append('manual#p19 (named video without href)')
    if source=='spirit-of-god':provenance.append('helps#p_u7bOc (named hymn via media/music route)')
    scope='verses '+', '.join(map(str,config['verses']))+' plus their notes' if 'verses' in config else 'full article including notes'
    if source in ['enemy-territory','bednar-discussion']:scope='full official video/player and all page metadata; Korean transcript not provided'
    entry=dict(id=source,title=TITLES[source],path=data['path'],lang=data['lang'],retrieved='2026-11-15',htmlSha256=data['htmlSha256'],scope=scope,provenance=sorted(set(provenance)),units=[{k:v for k,v in u.items() if k not in {'text','tag','noteGroup'}} for u in units],media=data['media'],durationSeconds=data['durationSeconds'])
    if 'verses' in config:entry['verses']=config['verses']
    if source=='still-small-voice':entry['languageNote']='Korean route resolved to collection with zero content units; English full lyrics and actual anchors verified. Raw Korean attempted response retained in ignored cache.'
    if source=='family-spirit':entry['languageNote']='Direct Korean route returned HTTP 404 on 2026-11-15; designated English article and all its units verified. Full monthly article is included as required; unrelated weekly chapters are not expanded.'
    if source=='09-teach-by-the-spirit':entry['mediaScope']='Full embedded learning video 4:17 retained with article, assigned day3 first part. Transcript not independently audited.'
    if source=='children':entry['mediaScope']='Embedded Time to Seek the Lord | Hosea 10 player follows p_rRJB3; full video 0:35. No transcript provided. Image/PDF interiors not text-audited.'
    manifest.append(entry)
    for u in units:
        day,track,item=ASSIGNED[source][u['anchor']]
        inventory.append([source+'#'+u['anchor'],TITLES[source],data['path'],u['anchor'],data['lang'],day,track,item,u['chars'] if data['lang']=='kor' else 0,u['words'] if data['lang']=='eng' else 0,int(u['note']),u['sha256']])
    all_links=[dict(a,legacy=False) for a in data['links']]
    for node in TREES[source].root.walk():
        if node.attrs.get('data-legacy-href'):
            owner=next((p.attrs['id'] for p in node.parents() if p.attrs.get('id')),'main')
            all_links.append(dict(owner=owner,href=node.attrs['data-legacy-href'],label=audit.normalized(node),legacy=True))
    for a in all_links:
        href=a['href']; path=urlsplit(href).path
        if a['legacy']:
            path=urlsplit(urljoin('https://www.churchofjesuschrist.org'+data['path']+'.html',href)).path.removesuffix('.html')
        included=next((s for s in CONFIG if s['path']==path),None)
        # Korean manual explicitly names the Guide to the Scriptures; its old
        # BD legacy links do not identify a different mandatory English text.
        alias = 'gs-hosea' if source=='manual' and a['owner']=='p3' and path.endswith('/bd/hosea') else 'gs-joel' if source=='manual' and a['owner']=='p3' and path.endswith('/bd/joel') else 'come-unto-jesus' if source=='helps' and a['owner']=='p_o6ILT' else 'spirit-of-god' if source=='helps' and a['owner']=='p_u7bOc' else None
        if alias:included=next(s for s in CONFIG if s['id']==alias)
        owner=next((u for u in units if u['anchor']==a['owner']),None)
        if included:decision='included '+included['id']+('; named Korean guide/hymn counterpart of legacy/media path' if alias else '')+'; see exact declared scope and reading-chain audit'
        elif path in {'',data['path']} or href.startswith('#'):decision='same-document note/navigation'
        elif '/media/' in path or 'assets.churchofjesuschrist.org' in href or path.lower().endswith('.pdf'):decision='official image/PDF/media retained; interiors/audio/transcript not text-audited'
        elif owner and owner['note']:decision='additional exploration: source inside a note; no recursive expansion'
        elif 'verses' in config and not owner:decision='outside selected verse scope'
        elif source=='family-spirit' and a['owner'] not in {u['anchor'] for u in span('family-spirit','p_uyKg5','p_rgsK8')}:decision='other-week activity retained in full article; not this week’s scripture/song assignment'
        else:decision='additional exploration: supporting reference/navigation without explicit read/compare/find assignment'
        links.append([source,a['owner'],a['label'],href,'legacy' if a['legacy'] else 'href',decision])
    main=next(e for e in TREES[source].root.walk() if e.attrs.get('id')=='main')
    nodes=list(main.walk())
    for index,node in enumerate(nodes):
        is_video=node.tag in ['figure','div'] and 'video' in node.attrs.get('class','').split()
        is_asset=node.tag=='a' and ('assets.churchofjesuschrist.org' in node.attrs.get('href','') or urlsplit(node.attrs.get('href','')).path.lower().endswith('.pdf'))
        is_media=node.tag=='a' and '/media/' in node.attrs.get('href','')
        if not (node.tag=='img' or is_video or is_asset or is_media):continue
        if is_video and any('video' in p.attrs.get('class','').split() for p in node.parents()):continue
        if node.tag=='img' and (not node.attrs.get('id') or '아이콘' in node.attrs.get('alt','')):continue
        anchor=node.attrs.get('id') or next((p.attrs['id'] for p in node.parents() if p.attrs.get('id')),'main')
        owners=[]
        for container in [node,*node.parents()]:
            owners=[e.attrs['id'] for e in container.walk() if e.attrs.get('id') in ASSIGNED[source]]
            if owners:break
        if len({ASSIGNED[source][o][:2] for o in owners})>1:
            following=[e.attrs['id'] for e in nodes[index+1:] if e.attrs.get('id') in ASSIGNED[source]]
            owners=following[:1] or owners[-1:]
        if source=='children' and is_video:owners=['p_rRJB3']
        owner=owners[0] if owners else next(iter(ASSIGNED[source]))
        day,track,item=ASSIGNED[source][owner]
        if source=='manual' and anchor=='figure6':
            day,track,item=KEYS['enemy']['_day'],KEYS['enemy']['_track'],KEYS['enemy']['id']
        if source=='family-spirit' and anchor=='main':
            day,track,item=KEYS['monthly-box']['_day'],KEYS['monthly-box']['_track'],KEYS['monthly-box']['id']
        label=node.attrs.get('alt','') if node.tag=='img' else audit.normalized(node)
        href=node.attrs.get('href') or node.attrs.get('src') or ('https://www.churchofjesuschrist.org'+data['path']+'?lang='+data['lang']+'#'+anchor)
        role='image; inner lettering not transcribed' if node.tag=='img' else 'PDF/file; interior not audited' if is_asset else 'full official video/player; transcript not provided' if is_video or '/video/' in href else 'linked music/audio; audio not independently audited'
        if is_video and source in ['revelation-for-the-church-revelation-for-our-lives','25stevenson','45kearon']:
            role='video alternative to fully included talk text and notes; not an additional required viewing'
        if is_video and source=='09-teach-by-the-spirit':
            role='embedded learning video; full player 4:17 retained with article; transcript not independently audited'
        if source=='manual' and anchor=='figure6':
            role='same Enemy Territory film as enemy-territory; canonical owner '+item+', not another required viewing'
        duration='0:35' if source=='children' and is_video else ','.join(sorted({audit.normalized(e) for e in node.walk() if e.tag=='div' and re.fullmatch(r'\d{1,3}:\d{2}',audit.normalized(e))})) if is_video else ''
        media_rows.append([source,anchor,node.tag,label,href,day,track,item,duration,role])
    if source in ['bednar-discussion','enemy-territory'] and not any(r[0]==source and r[2] in ['figure','div'] for r in media_rows):
        day,track,item=next(iter(ASSIGNED[source].values()))
        media_rows.append([source,'main','player',TITLES[source],'https://www.churchofjesuschrist.org'+data['path']+'?lang='+data['lang'],day,track,item,'61:29' if source=='bednar-discussion' else '3:38','all page metadata and full official player; Korean transcript not provided'])

(DOCS/'2026-week-47-sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
for name,header,rows in [('source-inventory',['unit','source','path','anchor','lang','day','track','task','koChars','enWords','note','sha256'],inventory),('source-links',['source','owner','label','href','linkType','decision'],links),('media',['source','anchor','kind','label','href','day','track','task','displayDuration','scope'],media_rows),('reading-chains',['instructionTask','instructionSource','instructionAnchor','targetTasks','scope','check'],[[KEYS[c['instruction']]['id'],KEYS[c['instruction']]['sourceId'],KEYS[c['instruction']]['endAnchor'],';'.join(KEYS[k]['id'] for k in c['targets']),c['scope'],'immediately following on same day/track'] for c in CHAINS]+[[t['id'],t['sourceId'],t['anchor'],';'.join(KEYS[k]['id'] for k in t['_related']),t.get('readingNote',''),'reused/continuation: existing ownership; optional navigation, no duplicate required reading'] for t in items if t['_related']])]:
    with (DOCS/f'2026-week-47-{name}.csv').open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.writer(f);w.writerow(header);w.writerows(rows)
summary=[]
for day in DAYS:
    counts=[]
    for track in ['adult','family']:
        rows=[r for r in inventory if r[5]==day['day'] and r[6]==track]
        counts.append(dict(track=track,units=len(rows),koChars=sum(r[8] for r in rows),enWords=sum(r[9] for r in rows),notes=sum(r[10] for r in rows),verses=sum(len(u['verseNumbers']) for source,units in SCOPED.items() for u in units if ASSIGNED[source][u['anchor']][:2]==(day['day'],track)),tasks=len(day[track+'Tasks']),videoSeconds=sum(3689 if t['sourceId']=='bednar-discussion' else 218 if t['sourceId']=='enemy-territory' else 35 if t['_key']=='seek-video' else 257 if t['_key']=='teach-prep-question' else 0 for t in day[track+'Tasks'])))
    summary.append(dict(day=day['day'],title=day['shortTitle'],counts=counts))
(CACHE/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(dict(sources=len(manifest),units=len(inventory),tasks=len(items),weeklyVerses=sum(EXPECTED.values()),explicitChains=len(CHAINS),days=summary),ensure_ascii=False,indent=2))
