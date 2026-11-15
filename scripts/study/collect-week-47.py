"""Collect the official week 47 manifest into the ignored source-audit cache.

Use --cache-dir test-results/week47-fresh for a fresh independent download;
never overwrite audited source files in another week's directory. Raw HTML and
text are deliberately excluded from version control.
"""
import argparse
import concurrent.futures
import importlib.util
import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf8')
parser = argparse.ArgumentParser()
parser.add_argument('--manifest', type=Path, default=Path('docs/study/2026-week-47-sources.json'))
parser.add_argument('--cache-dir', type=Path, default=Path('test-results/week47'))
args = parser.parse_args()
workspace = Path.cwd().resolve()
cache = args.cache_dir.resolve()
assert cache.is_relative_to(workspace/'test-results'), 'Raw source cache must stay inside ignored test-results'
cache.mkdir(parents=True, exist_ok=True)
spec = importlib.util.spec_from_file_location('audit', Path(__file__).with_name('audit-sources.py'))
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)
config = json.loads(args.manifest.read_text(encoding='utf8'))

def collect(source):
    try:
        return audit.inspect(source, cache)
    except Exception as error:
        return {'id': source['id'], 'error': str(error)}

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    results = list(pool.map(collect, config))
for result in results:
    print(json.dumps(result, ensure_ascii=False))
(cache/'collection-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
if any('error' in result for result in results):
    sys.exit(1)
