---
slug: anchor
type: project
title: Anchor Voice AI Interview Platform
tags: anchor, voice ai, interviews, researchkit, hiresignal, evidence
source_url:
priority: 10
---

Anchor is David's owned voice AI interview platform. It conducts live or offline interviews, asks structured follow-up questions, and turns transcripts into evidence-backed research artifacts.

The core differentiator is evidence anchoring. Every extracted finding should trace back to what the participant actually said, using source turn information, character offsets, and verbatim anchor text. If a claim cannot be traced to evidence, it should not appear as a finding.

Product model:

Anchor is designed as a tenant-scoped platform, not a single demo. It supports tenants, API keys, projects, rubrics, personas, sessions, provider configuration, usage metering, webhook-ready outputs, and participant links.

Technical architecture:

Anchor is built mainly with Python, FastAPI, WebSockets, PostgreSQL, Redis, Docker, and a browser client. It includes provider abstractions for LLMs, speech-to-text, and text-to-speech. The voice loop follows a listen, think, respond pattern: browser audio input, STT, turn detection, LLM response generation, streaming TTS, and browser audio output.

Latency design:

Anchor separates fast response generation from heavier background extraction. The interviewer can continue the conversation while claim extraction, gap detection, scoring, and session state updates happen asynchronously.

Anchor has two early verticals:

ResearchKit: structured qualitative research interviews for UX teams, market researchers, and product teams.

HireSignal: STAR-format recruitment screening with evidence scorecards and CV claim verification.

David's role:

David designed and implemented the platform architecture, interview loop, evidence model, provider abstraction, tenant model, and demo/client workflows. Anchor is the strongest owned project to discuss with recruiters or technical founders.

The local MVP is demoable. Contact David at david.mwiti.muthiru@gmail.com to book a walkthrough.
