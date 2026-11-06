# CSS Media article survey

A mobile-first, framework-free **static website** for reviewing immigration news articles and evaluating each article. This is a refactored version of the existing v5 prototype. It preserves the v5 survey flow, news set IDs, options, response format, browser-local logging, and reading requirements.

## Project structure

```text
index.html
assets/
  app.js                 # Application controller: events and stage transitions
  tracking.js            # Article time, scroll, paragraph and revisit logging
  views.js               # Page and form HTML templates (render-only functions)
  data.js                # Loads JSON; validates questions; resolves news sets
  state.js               # Initial survey state, reading visits and completion criteria
  shared.js              # Icons, escaping, timestamps, sentence segmentation
  styles.css             # Existing UI styles (unchanged)
config/
  study-config.json      # Default set ID, article count/order, reading/survey settings
data/
  immigration-articles-complete.json  # Full article data (unchanged)
  immigration-news-sets.json         # ID -> list of article IDs (unchanged)
  article-questions.json             # 8 article-evaluation questions
  background-questions.json          # 6 final background questions
tools/
  verify-data.mjs        # Check cross-file references and question schemas
  build-standalone.py    # Generate the optional self-contained demo HTML
demo-preview.html        # Generated browser-openable snapshot
```

## Where to make changes

| Need to change | Edit |
| --- | --- |
| Wording, order, or options of the eight article-evaluation questions | `data/article-questions.json` |
| Wording, order, or options of the six background questions | `data/background-questions.json` |
| Which ten news articles a participant sees | `data/immigration-news-sets.json` |
| Default news set ID or maximum number of articles | `config/study-config.json` |
| News article text, title, ID, or attention check | `data/immigration-articles-complete.json` |
| Appearance and typography | `assets/styles.css` and `assets/views.js` |
| Stage navigation, interaction events, local export | `assets/app.js` |
| Time, scroll, paragraph visibility, revisits | `assets/tracking.js` |
| Data loading and validation | `assets/data.js` |
| Reading requirements and survey state schema | `assets/state.js` |

Questions are JSON objects in this format:

```json
{
  "id": "q1",
  "text": "Which position does this article appear to favor?",
  "options": ["Strongly favors more restrictive immigration policies", "..."]
}
```

Responses use the **question ID** (`q1`, `age`, etc.) and the **one-based index** of the selected option (`1`, `2`, etc.). The export also contains the text label. **Keep IDs stable after participants start**, and do not casually reorder options: option indices are part of the collected data. If question wording/options change during testing, reset stored browser sessions before evaluating the new version.

The `gender` question has an existing special case in `assets/views.js`: `id: "gender"` and the **third** option enable the self-description input. If you reorder that option, update the corresponding UI logic in `views.js` and completion/export logic in `app.js`.

**Article placeholders:** IMM_07 through IMM_10 contain temporary article content copied from IMM_01 through IMM_04; replace before using the study with real participants.

## Run and deploy

No npm, Vite, or compilation step is needed. Serve the project root from a static file server, for example:

```bash
python -m http.server 8000
```

Open `http://localhost:8000/` to test. A local HTTP server is recommended because the app fetches the JSON files. For Vercel, deploy the project root with **Framework Preset: Other**, no Build Command, and output directory `.`.

`demo-preview.html` is an **optional self-contained snapshot** that can be opened as a local file without a web server. If any JSON, CSS, or JS changes, rebuild it:

```bash
python tools/build-standalone.py
```

It does not automatically update when the individual JSON files change. **For deployment and ongoing development, use `index.html` and the separate assets**, not the demo snapshot.

## Study flow and saved data

1. Introduction and **Start**
2. Per-article **Read article / Evaluate article** tabs, with article revisit support
3. Article rating (eight questions; all or incomplete depending on configuration)
4. Final background questionnaire (six questions)
5. Completion and JSON data export

The upper-right `···` menu sets the news set ID and test options. Default settings retain **highlight OFF, quiz OFF, minimum time OFF, incomplete responses allowed ON**. Selecting another news set starts over after confirmation.

The app preserves the previous `css-media-article-survey-v5` localStorage key and state version `5` so in-progress compatible v5 sessions can resume. It records article reading time, page scrolling, paragraph exposure, highlights, quiz submissions, evaluation answers, and revisits; the export JSON format is unchanged. All information stays in the participant's browser until downloaded. **There is no research server or participant ID integration yet.**

## Verification

```bash
node tools/verify-data.mjs
node --check assets/app.js
node --check assets/tracking.js
node --check assets/views.js
node --check assets/data.js
node --check assets/state.js
node --check assets/shared.js
```

Suggested browser smoke test: change news set ID, enter a story, switch to the evaluation tab, answer a question, return to the article and back, submit ten evaluations, complete the background survey, and export JSON. Repeat with highlighting/quiz/minimum time requirements enabled. Use mobile Safari/Chrome before recruiting participants.

### Implementation notes

The code avoids introducing a framework or build pipeline. `views.js` receives application data through getters, so replacing the current news set does not leave views pointing to old state. Article/statement HTML is escaped in `shared.js`. Cross-file article references and question schemas are checked at startup. The optional standalone preview is generated from the same modular sources to avoid maintaining a second application implementation.
