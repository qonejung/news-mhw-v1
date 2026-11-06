#!/usr/bin/env python3
"""Build the optional self-contained preview from the modular static site.

The deployed index.html reads JSON via fetch and does not need this script.
Re-run this script after editing any JSON to refresh demo-preview.html.
"""
from pathlib import Path
import json, re
from html import escape

ROOT=Path(__file__).resolve().parents[1]
assets=ROOT/'assets'

# This explicit list is also the dependency order for combining ES modules.
modules=['shared.js','state.js','data.js','views.js','tracking.js','app.js']
parts=[]
for name in modules:
    source=(assets/name).read_text(encoding='utf-8')
    source=re.sub(r'^import\s+.*?\s+from\s+[\'\"].+?[\'\"];?\s*$', '', source, flags=re.M|re.S) if False else source
    # Multi-line import declarations are removed without touching HTML templates.
    source=re.sub(r'^import\s+\{[\s\S]*?\}\s+from\s+[\'\"][^\'\"]+[\'\"];?\s*$', '', source, flags=re.M)
    source=re.sub(r'\bexport\s+(?=(?:const|function|async function)\b)', '', source)
    if name=='app.js':
        source='const createVisit=makeVisit, createFreshState=freshState, computeReadiness=getReadiness, selectArticles=chooseArticles;\n'+source
    parts.append(f'// ---- {name} ----\n'+source)

inputs={
 'config':json.loads((ROOT/'config/study-config.json').read_text()),
 'articles':json.loads((ROOT/'data/immigration-articles-complete.json').read_text()),
 'newsSets':json.loads((ROOT/'data/immigration-news-sets.json').read_text()),
 'articleQuestions':json.loads((ROOT/'data/article-questions.json').read_text()),
 'backgroundQuestions':json.loads((ROOT/'data/background-questions.json').read_text()),
}
embedded=json.dumps(inputs,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
css=(assets/'styles.css').read_text()
js='\n'.join(parts)
# The bundle uses ordinary scripts, not imports. The script is generated, not hand-edited.
html=f'''<!doctype html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
<title>CSS Media | Article survey</title><style>{css}</style></head>
<body><div id="app"><p class="initial-loading">Loading articles…</p></div>
<script>window.__CSS_ARTICLE_SURVEY_PREVIEW_DATA__={embedded};</script>
<script>{js}</script>
</body></html>
'''
(ROOT/'demo-preview.html').write_text(html,encoding='utf-8')
print('Created', ROOT/'demo-preview.html')
