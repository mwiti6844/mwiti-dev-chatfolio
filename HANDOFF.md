# Portfolio handoff — state as of 17 Nov 2026

Static, buildless site. Positioning: **Data at the core. Intelligence by design.** Read README.md for running, tests and packaging.

## Non-negotiables

- **Confidentiality.** The financial-services client and its internal programme names never appear in HTML, JS, CSS, metadata,
  the CV, screenshots or comments. The terms live only in the git-ignored `tests/.forbidden-terms`, and the test suite fails if any
  site file contains them. Also never publish agent/sub-agent counts, pilot size, rollout or adoption claims for that work.
  Naming the consultancy (Invent Consulting) is approved.
- **No fabrication.** Every metric must trace to David's CV: 95 → under 5 minutes; 200+ users, +40% relevance, ~60% latency
  (~4s → <1.6s, LangSmith); 1,000+ concurrent users on AWS ECS; 100,000+ batch records on Azure. Lab values, traces and
  handoff artifacts (`artifacts.js`) are synthetic and must stay labelled.
- **Status vocabulary.** Shipped (PaySoko, consulting), live pilot (Anchor), in development (enterprise agents), educational
  demonstration (speech explorer, RAG lab). The speech explorer is not a claim about shipped Anchor features.
- **Links.** LinkedIn `https://www.linkedin.com/in/david-mwiti-38316b18b/` (verified live; the hyphen-less slug is wrong),
  GitHub `https://github.com/mwiti6844`, Anchor `https://studyanchor.org/` (never `/admin`), emails
  david.mwiti.muthiru@gmail.com and david.mwiti@studyanchor.org, phone +254 716 003 852 (publishing approved by David).

## Done (Nov 2026 pass)

- P0 QA at 1440/768/390/320 in Chromium and WebKit: mobile menu, skip link, focus styles, notebook focus retention,
  stuck Run button, 320px overflow, contrast, section numbering, compact mobile stages and tanks.
- Playwright + axe suite (`tests/`) covering layout, every control, links, statuses, CV and confidentiality.
- Handoff panel shows concrete synthetic input/output artifacts per stage. Anchor stages reordered so transcription precedes
  choosing a follow-up; NL-to-SQL last stage includes read-only execution and answer formatting.
- Single stylesheet; runtime link-patching removed (links are correct in source); toolkit data de-duplicated.
- Public CV regenerated from `cv-source/cv.html`: anonymized, one page, correct LinkedIn, includes newer CV facts.

## PATCH chat guide (rebuilt locally, Nov 2026)

Cloudflare Worker (`server/worker.js`, `wrangler.toml`) serves the static site through the ASSETS binding and handles
`/api/guide/*`. Groq first (`openai/gpt-oss-120b`, low reasoning effort), OpenRouter fallback (`openai/gpt-oss-20b`); override via `GROQ_MODEL`/`OPENROUTER_MODEL`. Replies stream as NDJSON. Each case in `knowledge.js` carries problem, role, audience and fits-when fields so PATCH answers "what does this do for my team" rather than reciting the CV.
Model output is untrusted: JSON parsed leniently, card/action ids allowlisted against `server/knowledge.js`, card URLs come from
the knowledge file, never from the model, and replies are capped and redacted against the optional `FORBIDDEN_TERMS` secret.
All messages, greetings included, go to the model; tone rules in `SYSTEM_PROMPT` make it match the visitor's register (Sheng/Swahili included). The last 12 turns are sent with each question for in-conversation memory; the conversation lives in `sessionStorage` (per tab). Unknown answers and hiring/collab intent surface an "Ask David directly" mailto pre-filled with the visitor's questions. Up to 3 cards, 2 actions, 2 visitor-voice follow-ups; em/en dashes rewritten server-side. With no keys, or when providers fail, PATCH gives a **preview** reply
with matching evidence cards. Allowlisted actions (`open_lab`, `open_tanks`, `open_anchor`, `open_credit`, `open_sql`, `open_contact`)
render as buttons; the visitor clicks them. LangSmith tracing happens only when the visitor ticks the opt-in box AND `LANGSMITH_API_KEY` is set.
The Startup Builder Programs section (Cartesia, LiveKit) sits on the homepage
as 06. These are program acceptances, not certifications, and use no logos.
Tests: `npm run test:server` (14, mocked HTTP) + `tests/guide.spec.js` (UI, mocked routes, axe, XSS, opt-in).

Before public launch: set secrets, live smoke test against the handoff's behaviour checks (credit memo, badges ≠ certifications,
full duplex not shipped, confidential client, off-topic, prompt injection, navigation), provider spend caps, a privacy
page with retention/erasure terms, and a check of LangSmith region/retention. The rate limit is per Cloudflare location. Add WAF/Turnstile if abuse shows up.
Not built: Cartesia read-aloud (`CARTESIA_API_KEY` reserved), "ask David to follow up" form and notifications, owner dashboard,
eval harness beyond the unit tests.

## Open — needs David

- Public vs private, and permanent hosting. Blocks canonical URL, sitemap, robots.txt, Open Graph image.
- Approved screenshots/diagrams/code per case study; NL-to-SQL relevance methodology and latency setup; Anchor's actual
  STT/TTS/turn-taking implementation (confirm the Transcribe → Probe order matches).
- Optional professional photo.

## Code map

`index.html` homepage · `projects/*/index.html` case shells · `project.js` case data + walkthrough · `enhancements.js` stage
icons, plain-language stage notes, story chapters, Anchor speech explorer · `artifacts.js` synthetic handoff examples ·
`app.js` hero terminal, RAG lab, failure modes, tanks · `notebook.js` 16 concepts · `nav.js` mobile menu · `style.css` all styles.
`project.js` renders the case DOM first; `enhancements.js` (dynamic import) decorates it via `#project-stages`, `.case-layout`,
`.case-pipeline` and `.stage.active` class changes.
