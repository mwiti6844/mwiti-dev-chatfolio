---
slug: biasharacredit
type: project
title: BiasharaCredit SME Loan Processing Agent
tags: biasharacredit, google adk, loan processing, sme lending, human in the loop, document extraction, fintech
source_url: /Users/mac/Desktop/adk-samples/python/agents/small-business-loan-agent
priority: 7
---

BiasharaCredit is David's localized portfolio case study based on the Google ADK small-business-loan-agent sample. It reframes the sample as an East African SME lending workflow for banks, SACCOs, MFIs, fintech lenders, and embedded finance platforms.

The original ADK sample demonstrates a multi-agent financial services workflow with one orchestrator and four specialized sub-agents. It includes multimodal document extraction, structured Pydantic outputs, human-in-the-loop approval, LLM-as-judge validation, Firestore-backed state, and repair/resume behavior.

Localized product concept:

Small business lending is document-heavy and repetitive. Applicants submit forms, bank statements, business permits, registration documents, tax records, invoices, or mobile-money summaries. Loan officers need to extract fields, check eligibility, price risk, and prepare a decision without losing human accountability.

Core workflow:

BiasharaCredit receives a loan application, extracts structured application data, checks eligibility, calculates risk-based pricing, pauses for human approval, and resumes from checkpoints when documents are incomplete. If a required field is missing, the workflow should stop instead of forcing a bad decision.

Agent responsibilities:

The orchestrator coordinates document extraction, underwriting, pricing, and final decisioning. The document extraction agent parses application files. The underwriting agent validates eligibility. The pricing agent calculates rate, repayment, risk tier, and terms. The decision agent finalizes the result only after approval.

Why it matters:

This project shows David understands regulated AI workflows. The AI supports extraction, consistency, workflow state, and decision support, but does not remove human review from high-impact credit decisions.

Recruiter framing:

BiasharaCredit should be presented as an adapted and localized ADK case study, not as a production Paysoko system. It demonstrates agent orchestration, checkpointing, structured output, validation gates, and responsible human-in-the-loop design.
