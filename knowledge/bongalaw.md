---
slug: bongalaw
type: project
title: BongaLaw AI Civic Engagement Platform
tags: bongalaw, civic ai, legal ai, kenya constitution, rag, fastapi, nextjs, chromadb, public participation
source_url:
priority: 9
---

BongaLaw is David's AI civic engagement platform for Kenyan legal and public participation workflows. It helps citizens understand bills, constitutional rights, public sentiment, and legal impact through plain-language explanations, grounded Q&A, analytics, and multi-agent debate simulations.

Problem:

Legal and policy documents are public, but they are often too dense for ordinary citizens to use. A generic legal chatbot can also hallucinate article numbers or legal claims. BongaLaw addresses this by grounding answers in retrieved legal and constitutional text before generating explanations.

Core features:

The platform includes bill listings, bill detail pages, bill summaries, citizen comments, support or oppose voting, sentiment tracking, trending bills, public mood analytics, constitutional explainers, scenario simulation, news-to-constitution mapping, multi-agent debates, audio summaries, and admin workflows.

Technical architecture:

BongaLaw uses a full-stack architecture with a Next.js and TypeScript frontend, Tailwind CSS, protected routes, and admin surfaces. The backend is FastAPI with modular routes for bills, comments, votes, analytics, constitution workflows, assistant behavior, focus groups, tasks, auth, traces, and admin operations.

Retrieval and grounding:

The backend uses PostgreSQL for application state and ChromaDB for semantic retrieval over legal and constitutional text. The RAG workflow retrieves relevant legal snippets, article metadata, and source context before asking the model to explain in accessible language. This is important because civic/legal AI must be verifiable.

Agentic features:

BongaLaw includes AI focus group and debate workflows where multiple agent personas simulate stakeholder perspectives such as legal, economic, youth, women, and moderator viewpoints. The frontend supports streaming interactions, including Server-Sent Events style debate rendering.

Product value:

BongaLaw demonstrates David's ability to combine AI with a real product workflow: source ingestion, retrieval, explanation, voting, comments, sentiment, analytics, media generation, admin tooling, and user-facing civic education.

Recruiter framing:

This project is strong evidence for RAG, full-stack AI product engineering, civic AI, retrieval grounding, admin dashboards, and multi-agent UX. David should describe it as an owned civic AI platform, not a toy chatbot.
