"""Build reviewed English reading positions without reallocating week 46.

Read public sources with audit-sources.py into test-results/english46 first.
The cache is ignored; only positions, counts and source hashes are published.
The first build records the reviewed source hashes; subsequent builds refuse
changed source bodies until the language alignment is reviewed again.
"""
import csv
import hashlib
import importlib.util
import json
import re
import sys
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlsplit

sys.dont_write_bytecode = True
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf8')
DOCS = Path('docs/study')
CACHE = Path('test-results/english46')
PLAN = json.loads(Path('src/data/cfm-2026-week-46.json').read_text(encoding='utf8'))
CANON = {s['id']: s for s in json.loads((DOCS/'2026-week-46-sources.json').read_text(encoding='utf8'))}
ENG = {sid: json.loads((CACHE/(sid+'.json')).read_text(encoding='utf8')) for sid in CANON}
spec = importlib.util.spec_from_file_location('audit', Path(__file__).with_name('audit-sources.py'))
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)
TREES = {sid: audit.Tree((CACHE/(sid+'.html')).read_text(encoding='utf8')) for sid in CANON}
LOCATIONS = [dict(task=t, day=d['day'], track=track) for d in PLAN['days'] for track in ['adult', 'family'] for t in d[track+'Tasks']]
BY_SOURCE = defaultdict(list)
for loc in LOCATIONS:
    BY_SOURCE[loc['task']['sourceId']].append(loc)
META = {'reference1', 'short_reference1'}
# These are the five corresponding Scripture Helps links, reviewed by meaning,
# link destination and surrounding section, rather than their ordinal position.
MANUAL_IDS = {'p_nB6xw': 'p_pcUeL', 'p_e7qM9': 'p_aOreu', 'p_iRdkd': 'p_tbV44', 'p_gSvZd': 'p_cjtSM', 'p_grqLE': 'p_f6Sjz'}
SPLIT_TALKS = {'uchtdorf', 'jones', 'church', 'worship', 'rasband', 'bednar', 'eyring-witness'}
PART_LABELS = {
1: 'Come, Follow Me · Introduction and faithful choices',
2: 'Come, Follow Me · Trusting when the miracle does not come',
3: 'Come, Follow Me · The influence of righteous choices',
4: 'Come, Follow Me · An invitation to believe',
5: 'Come, Follow Me · Include everyone',
6: 'Come, Follow Me · The fiery furnace',
7: 'Come, Follow Me · God’s kingdom and revelation',
8: 'Come, Follow Me · The Son of Man’s everlasting kingdom',
9: 'Come, Follow Me · Scripture Helps: Daniel’s food',
10: 'Come, Follow Me · Scripture Helps: Daniel’s vision',
11: 'God Gave Them Knowledge · Full video 13:49 (transcript not verified)',
12: 'Family study · Choose right in difficult situations',
13: 'Family study · Caring for our bodies',
14: 'Family study · Drawing God’s kingdom',
15: 'Family study · Pray always',
16: 'Family study · More ideas and activity page',
42: 'Doctrine and Covenants 89:1–9 · Avoid harmful substances',
43: 'Doctrine and Covenants 89:10–21 · Care and promised blessings',
65: 'Scripture Helps · Introduction, Daniel’s background and food',
66: 'Scripture Helps · The stone cut without hands',
67: 'Scripture Helps · But if not',
68: 'Scripture Helps · Writing on the wall',
69: 'Scripture Helps · Daniel and the Savior’s life',
70: 'Scripture Helps · Beasts, the Son of Man and the Ancient of Days',
71: 'Scripture Helps · More about faithfulness',
72: 'Scripture Helps · A message about faith',
73: 'Scripture Helps · Resources about God’s kingdom',
74: 'Scripture Helps · The Gospel Shall Roll Forth (transcript not verified)',
75: 'Scripture Helps · Adam-ondi-Ahman hymn',
76: 'Scripture Helps · Pictures of food and the palace',
77: 'Scripture Helps · The king’s dream',
78: 'Scripture Helps · Refusing to bow',
79: 'Scripture Helps · Belshazzar',
80: 'Scripture Helps · The fiery furnace',
81: 'Scripture Helps · The writing on the wall',
82: 'Scripture Helps · Daniel in the lions’ den and at prayer',
83: 'Children’s resources · Introduction and choosing right',
84: 'Children’s resources · Courage and scripture fun',
85: 'Children’s resources · Caring for our bodies and a song',
86: 'Children’s resources · Saying no respectfully',
87: 'Children’s resources · Caring for my body coloring page',
88: 'Children’s resources · The king’s dream and the Church',
89: 'Children’s resources · Prayer and a song',
90: 'Children’s resources · Daniel in the lions’ den coloring page',
104: 'Weekly Scripture Fun · 1/4 Join in doing good',
105: 'Weekly Scripture Fun · 2/4 Gathering Israel',
106: 'Weekly Scripture Fun · 3/4 Daniel’s faith',
107: 'Weekly Scripture Fun · 4/4 Invite the Spirit and follow God’s plan',
108: 'Gospel Art Book 23 · Daniel refuses the king’s food',
109: 'Gospel Art Book 25 · The fiery furnace',
110: 'Gospel Art Book 26 · Daniel in the lions’ den',
111: 'Gospel Art Book 90–95 · Pictures of the Restoration',
}
BOOKS = {'dan': 'Daniel', '2-kgs': '2 Kings', 'alma': 'Alma', '2-ne': '2 Nephi', 'moses': 'Moses', 'matt': 'Matthew', 'mark': 'Mark', 'dc': 'Doctrine and Covenants', 'philip': 'Philippians', 'luke': 'Luke', '1-cor': '1 Corinthians'}


def ranges(values):
    groups = []
    for value in sorted(set(values)):
        if groups and value == groups[-1][-1]+1:
            groups[-1].append(value)
        else:
            groups.append([value])
    return ', '.join(str(g[0]) if len(g) == 1 else f'{g[0]}–{g[-1]}' for g in groups)


def title(source):
    rows = ENG[source]['units']
    return next((u['text'] for u in rows if u['tag'] == 'h1'), source)


def refs(source, data, owner):
    note_ids = {u['anchor'] for u in data['units'] if owner in u.get('noteOwners', [])}
    return sorted(set(urlsplit(a['href']).path+'#'+urlsplit(a['href']).fragment for a in data.get('links', []) if a['owner'] in note_ids and '/scriptures/' in a['href']))


# Figure 8 is a real, language-specific official player, not a transcript.
player = next(e for e in TREES['manual'].root.walk() if e.attrs.get('id') == 'figure8')
player_text = audit.normalized(player)
assert player_text == '13:49God Gave Them Knowledge', player_text
ENG['manual']['units'].append(dict(anchor='figure8', tag='figure', chars=len(''.join(player_text.split())), words=len(player_text.split()), sha256=hashlib.sha256(player_text.encode()).hexdigest(), note=False, noteGroup='', verseNumbers=[], text=player_text, noteOwners=[]))

previous = DOCS/'2026-english-46-sources.json'
if previous.exists():
    reviewed = json.loads(previous.read_text(encoding='utf8'))
    hashes = {s['id']: s['htmlSha256'] for s in reviewed}
    assert hashes == {sid: s['htmlSha256'] for sid, s in ENG.items()}, 'Source responses changed: review English alignment before rebuilding'
    for source in reviewed:
        if 'canonicalHtmlSha256' in source:
            assert source['canonicalHtmlSha256'] == CANON[source['id']]['htmlSha256'], 'Original source changed: review English alignment before rebuilding'
previous_edition = Path('src/data/cfm-2026-week-46-english.json')
if previous_edition.exists():
    reviewed_tasks = json.loads(previous_edition.read_text(encoding='utf8'))['tasks']
    signatures = {loc['task']['id']: {k: loc['task'][k] for k in ['path', 'sourceLang', 'anchor', 'endAnchor', 'selectedIds']} for loc in LOCATIONS}
    assert {tid: variant['original'] for tid, variant in reviewed_tasks.items()} == signatures, 'Original allocation changed: review English alignment before rebuilding'

expected = {}
for sid, data in ENG.items():
    assert data['path'] == CANON[sid]['path'] and data['lang'] == 'eng'
    main = next(e for e in TREES[sid].root.walk() if e.attrs.get('id') == 'main')
    assert not re.search('[가-힣]', audit.normalized(main)), (sid, 'Non-English fallback response')
    rows = [u for u in data['units'] if not u['note'] and u['anchor'] not in META]
    config = CANON[sid]
    if 'verses' in config:
        wanted = set(config['verses'])
        rows = [u for u in rows if wanted.intersection(u['verseNumbers'])]
        assert {v for u in rows for v in u['verseNumbers']} == wanted, sid
    elif 'figures' in config:
        ids = {e.attrs.get('id') for n in config['figures'] for marker in TREES[sid].root.walk() if marker.attrs.get('data-marker') == str(n) for e in marker.walk()}
        rows = [u for u in rows if u['anchor'] in ids]
    expected[sid] = rows

variants, methods, alignment = {}, {}, []
ownership = defaultdict(dict)
for sid, locations in BY_SOURCE.items():
    en = ENG[sid]
    rows = [u for u in en['units'] if not u['note'] and u['anchor'] not in META]
    by_id = {u['anchor']: u for u in rows}
    canonical = {u['anchor']: u for u in CANON[sid]['units']}
    scripture = '/scriptures/' in en['path'] and '/gs/' not in en['path']
    if sid in SPLIT_TALKS:
        korean = json.loads(Path(f'test-results/week46/{sid}.json').read_text(encoding='utf8'))
        # Reviewed boundaries and complete paragraph sequences agree. Check the
        # linked scripture references for every corresponding body paragraph.
        assert [u['anchor'] for u in korean['units'] if not u['note']] == [u['anchor'] for u in rows]
        allowed_ref_changes = {('uchtdorf', 'p9'), ('bednar', 'p_sgNFG')}
        for u in rows:
            if (sid, u['anchor']) not in allowed_ref_changes:
                assert refs(sid, korean, u['anchor']) == refs(sid, en, u['anchor']), (sid, u['anchor'], 'reference changed')
    for loc in locations:
        task = loc['task']
        tid = task['id']
        original_rows = [canonical[a] for a in task['selectedIds']]
        if scripture:
            wanted = {v for u in original_rows for v in u['verseNumbers']}
            selected = [u for u in rows if wanted.intersection(u['verseNumbers'])]
            assert {v for u in selected for v in u['verseNumbers']} == wanted, (tid, 'logical verse mismatch')
            if any(not u['verseNumbers'] for u in original_rows):
                selected = [u for u in rows if u in selected or not u['verseNumbers']]
            method = 'logical verses '+ranges(wanted)+'; original chapter-heading ownership'
        elif sid.startswith('art-'):
            # Match the artwork number and title/reference pair. English adds
            # artist/rightsholder captions inside the same numbered item.
            selected_ids = set()
            for number in CANON[sid]['figures']:
                marker = next(e for e in TREES[sid].root.walk() if e.attrs.get('data-marker') == str(number))
                ids = {e.attrs.get('id') for e in marker.walk()}
                if ids.intersection(task['selectedIds']):
                    selected_ids.update(ids)
            selected = [u for u in rows if u['anchor'] in selected_ids]
            method = 'same numbered artwork, title and scripture references; include English artist captions'
        elif len(locations) == 1:
            selected = rows
            method = 'complete corresponding English article/song/story, including changed paragraph grouping'
        else:
            selected_ids = {MANUAL_IDS.get(a, a) if sid == 'manual' else a for a in task['selectedIds']}
            if tid == 'w46-t070':
                selected_ids.add('p_cxFO0')  # Caption inside the Ancient of Days section.
            assert selected_ids <= by_id.keys(), (tid, selected_ids-by_id.keys())
            selected = [u for u in rows if u['anchor'] in selected_ids]
            method = ('reviewed five link replacements; same-meaning section boundaries' if sid == 'manual' else
                      'English original; same body hashes and stable activity headings' if sid == 'family-fun' else
                      'reviewed boundary meaning, complete paragraph sequence and scripture references' if sid in SPLIT_TALKS else
                      'reviewed question/activity/caption meaning and destination references')
            if task['sourceLang'] == 'eng':
                for u in selected:
                    assert u['sha256'] == canonical[u['anchor']]['sha256'], (tid, u['anchor'], 'English original changed')
        assert selected, tid
        ids = [u['anchor'] for u in selected]
        for a in ids:
            assert a not in ownership[sid], (sid, a, tid, ownership[sid].get(a))
            ownership[sid][a] = tid
        original = {key: task[key] for key in ['path', 'sourceLang', 'anchor', 'endAnchor', 'selectedIds']}
        label = PART_LABELS.get(int(tid.split('t')[-1]))
        if label is None and scripture:
            book, chapter = task['path'].split('/')[-2:]
            label = BOOKS[book]+' '+chapter+(':'+ranges(wanted) if 'verses' in CANON[sid] else '')
        if label is None:
            label = title(sid)
            part = re.search(r'\b\d/\d\b', task['label'])
            label += ' · Part '+part[0] if part else ' · Complete'
        variants[tid] = dict(path=en['path'], anchor=ids[0], endAnchor=ids[-1], selectedIds=ids, noteLinks=[], label=label, original=original)
        methods[tid] = method
        alignment.append(dict(task=tid, source=sid, day=loc['day'], track=loc['track'], originalStart=task['anchor'], originalEnd=task['endAnchor'], englishStart=ids[0], englishEnd=ids[-1], method=method))

# Add each English note once, linked to an English body owner in that task.
# The heading "Notes" has no owner and is navigation, not a missing footnote.
manifests = []
units_csv = []
for sid, locations in BY_SOURCE.items():
    expected_ids = {u['anchor'] for u in expected[sid]}
    assert set(ownership[sid]) == expected_ids, (sid, 'scope mismatch', expected_ids-set(ownership[sid]), set(ownership[sid])-expected_ids)
    notes = [u for u in ENG[sid]['units'] if u['note'] and expected_ids.intersection(u['noteOwners'])]
    for u in notes:
        owner = next(o for o in u['noteOwners'] if o in ownership[sid])
        tid = ownership[sid][owner]
        variants[tid]['noteLinks'].append(dict(note=u['anchor'], owner=owner))
        ownership[sid][u['anchor']] = tid
    scoped = expected[sid]+notes
    excluded = [dict(anchor=u['anchor'], reason='bibliographic header' if u['anchor'] in META else 'unlinked Notes navigation heading' if u['note'] and not u['noteOwners'] else 'outside canonical verse/artwork scope') for u in ENG[sid]['units'] if u['anchor'] not in ownership[sid]]
    clean = [{k: u[k] for k in ['anchor', 'tag', 'chars', 'words', 'sha256', 'note', 'verseNumbers', 'noteOwners']} for u in scoped]
    manifests.append(dict(id=sid, path=ENG[sid]['path'], lang='eng', retrieved='2026-11-15', htmlSha256=ENG[sid]['htmlSha256'], canonicalPath=CANON[sid]['path'], canonicalLang=CANON[sid]['lang'], canonicalHtmlSha256=CANON[sid]['htmlSha256'], scope='expected English body and owned notes corresponding to the canonical allocation; bibliography and Notes headings excluded', units=clean, excluded=excluded))
    for u in scoped:
        units_csv.append(dict(source=sid, anchor=u['anchor'], task=ownership[sid][u['anchor']], note=u['note'], verseNumbers=','.join(map(str, u['verseNumbers']))))

assert len(variants) == len(LOCATIONS) == 111
output = dict(version=1, week=46, lang='eng', tasks=variants)
Path('src/data/cfm-2026-week-46-english.json').write_text(json.dumps(output, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
(DOCS/'2026-english-46-sources.json').write_text(json.dumps(manifests, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
for name, values in [('alignment', alignment), ('units', units_csv)]:
    with (DOCS/f'2026-english-46-{name}.csv').open('w', encoding='utf8', newline='') as file:
        writer = csv.DictWriter(file, fieldnames=list(values[0]))
        writer.writeheader()
        writer.writerows(values)
print(json.dumps(dict(week=46, sources=len(manifests), tasks=len(variants), bodyUnits=sum(len(v['selectedIds']) for v in variants.values()), notes=sum(len(v['noteLinks']) for v in variants.values()), missing=0, duplicate=0)))
