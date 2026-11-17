# David Mwiti — interactive portfolio

A self-contained static portfolio: HTML, CSS, JavaScript, interactive case studies, workflow simulations and a public-facing PDF resume.

## Run locally

1. Unzip the archive.
2. Open a terminal in the extracted folder (the folder containing `index.html`).
3. Run `python3 -m http.server 8000`.
4. Visit http://localhost:8000/ in your browser.

This site uses root-relative links (such as `/projects/anchor/`), so run the server from this folder. Opening `index.html` directly as a `file://` URL will not load everything correctly.

The static site has no build step or API key. PATCH (the chat guide) shows an "offline" badge under the python server; its API needs the Cloudflare Worker (see below). The pipeline demonstrations are browser-only simulations and do not call real models or access customer data. Google Fonts requires an internet connection; system-font fallbacks work offline.

## Contents

- `index.html`: homepage
- `projects/*/index.html`: five case-study pages
- `style.css`: the single stylesheet (visual system, animations, notebook, responsive and accessibility rules)
- `notebook.js`: searchable engineering notebook, concept links and discovery interactions
- `app.js`, `project.js`, `enhancements.js`: interactive logic
- `artifacts.js`: synthetic example artifacts shown in each workflow's handoff panel (all invented, labelled as such)
- `nav.js`: mobile menu toggle
- `guide.js`, `guide.css`: PATCH, the floating chat guide (DOM-built, no HTML strings)
- `server/`: Cloudflare Worker: serves the site and `/api/guide/status`, `/api/guide/chat` (`knowledge.js` curated evidence, `chat.js` validation/prompt/sanitizing, `providers.js` Groq → OpenRouter + opt-in LangSmith, `worker.js` routing + rate limit)
- `wrangler.toml`, `.assetsignore`, `.dev.vars.example`: Worker config; `.assetsignore` keeps tests, server, docs and dotfiles out of the public assets
- `David_Mwiti_CV.pdf`: public-facing, anonymized resume, generated from `cv-source/cv.html` with `node cv-source/build-cv.js` (needs `npm install`; fails if it spills past one page)

## Editing

Change text in the HTML and the case-study data in `project.js`. Workflow explanations, educational speech architecture and illustrations are in `enhancements.js`. Update `style.css` for colors, typography and layout.
The Engineering Notebook entries are authored in `notebook.js`; they are original explanations, with project examples and explicit distinctions between shipped features and educational concepts.

## Notes

- All reported project outcomes are drawn from David's supplied CV.
- Development-stage and pilot-stage projects are labeled accordingly.
- Financial-services client names and internal programme names have been removed.
- The static pages collect no visitor data. PATCH sends a visitor's question and recent turns to Groq (or OpenRouter as fallback) to answer; nothing is stored server-side unless the visitor ticks the opt-in trace box, which sends that exchange to LangSmith.

## Tests

Playwright + axe-core, run against a local python server (started automatically).

```sh
npm install
npx playwright install chromium   # once
npm test                          # Chromium
WEBKIT=1 npm test                 # Chromium + WebKit (npx playwright install webkit first)
SHOTS=1 npm test                  # also save full-page screenshots to qa-screenshots/
```

Covers: responsive overflow at 1440/768/390/320, console errors, mobile menu, every interactive control (mouse + keyboard),
internal routes, canonical external links and emails, no `/admin`, case status tags, CV download, homepage numbering, axe WCAG A/AA.

The confidential-names check reads `tests/.forbidden-terms` (one term per line). That file is git-ignored and must never be
published or zipped; create it locally before running tests.

Do not ship `node_modules/`, `tests/`, `cv-source/`, `package*.json`, `playwright.config.js`, `test-results/` or `qa-screenshots/` with the site.

## PATCH / Cloudflare Worker

```sh
npm install -D wrangler            # or use npx
cp .dev.vars.example .dev.vars     # add GROQ_API_KEY (and optionally OPENROUTER_API_KEY, LANGSMITH_API_KEY)
npm run dev                        # http://localhost:8787, state kept outside the repo (avoids a watcher reload loop)
npm run test:server                # node:test, mocked providers, no network
npx wrangler secret put GROQ_API_KEY   # production secrets; never commit them
npm run deploy
```

No keys → PATCH answers in labelled preview mode with matching case cards. Rate limit: `GUIDE_LIMITER` binding (12 msgs / 60 s per IP).
Set provider spend caps in the Groq/OpenRouter dashboards before going public.

## Release ZIP

```sh
sh package.sh   # → ../David_Mwiti_Interactive_Portfolio.zip (site files + README + HANDOFF.md only), then integrity-checks it
```
