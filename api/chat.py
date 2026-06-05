"""
FastAPI AI Pitch Agent — David Mwiti Muthiru
POST /api/chat  { message: str, history: list, visitorType: str }

Architecture:
  - Optional MongoDB Atlas Vector Search memory over portfolio knowledge
  - BM25 retrieval fallback over a chunked knowledge base
  - Top-k chunks injected into the LLM context alongside a system prompt
  - Groq (llama-3.3-70b-versatile) for generation
  - Vercel Python runtime — stateless, cold-start safe
"""

from http.server import BaseHTTPRequestHandler
import json
import os
import re
import urllib.request
import urllib.error
from typing import List, Dict, Any

try:
    import portfolio_memory
except Exception:
    portfolio_memory = None

# ── Knowledge Base ─────────────────────────────────────────────────────────────
# Each chunk has an id, a category tag, and the content.
# BM25 runs over these at query time — no pre-computation needed.

KNOWLEDGE_BASE: List[Dict[str, str]] = [
    {
        "id": "identity",
        "tags": "david who nairobi kenya ai engineer background",
        "content": (
            "David Mwiti Muthiru is an AI Engineer based in Nairobi, Kenya. "
            "2+ years building production LLM infrastructure and agentic systems. "
            "Currently working at Paysoko Systems on practical AI for business workflows. "
            "Open to remote engineering roles worldwide and conversations about his product Anchor. "
            "Contact: david.mwiti.muthiru@gmail.com | +254 716 003 852 | "
            "github.com/mwiti6844 | linkedin.com/in/david-mwiti-38316b18b/"
        ),
    },
    {
        "id": "paysoko_overview",
        "tags": "paysoko systems founding engineer llm infrastructure production",
        "content": (
            "David currently works at Paysoko Systems as an AI engineer focused on production LLM "
            "and automation systems for enterprise and fintech workflows. He can discuss this work "
            "professionally at the architecture-pattern level: natural-language data interfaces, "
            "controlled business workflows, backend integration, observability, and data safety."
        ),
    },
    {
        "id": "nl2sql",
        "tags": "nl2sql natural language sql erp 600 tables non-technical staff security redis langsmith latency",
        "content": (
            "One Paysoko workstream involves natural-language access to business and ERP data. "
            "The public-facing engineering value is schema-aware retrieval, guarded query generation, "
            "role-aware answers, and production backend integration. Keep details professional and avoid "
            "exposing internal schema, customer, or operational specifics."
        ),
    },
    {
        "id": "credit_memo",
        "tags": "credit memo langgraph multi-agent pipeline pii masking qa daemon financial ratio dscr ltv deterministic",
        "content": (
            "Another Paysoko workstream involves AI-assisted credit analysis and document workflows. "
            "The public-facing engineering value is multi-step workflow design, extraction, validation, "
            "PII-aware handling, and QA checks around model output. Do not over-share internal process "
            "details or present confidential operating metrics."
        ),
    },
    {
        "id": "lending_backend",
        "tags": "lending conversational backend par delinquency role-aware redis session",
        "content": (
            "David has also worked on conversational backend patterns for lending and portfolio insight "
            "workflows. The important public-facing skills are multi-turn state, role-aware responses, "
            "retrieval over business metrics, and production reliability."
        ),
    },
    {
        "id": "anchor_overview",
        "tags": "anchor voice ai interview platform product what is overview structured interviews browser rubric",
        "content": (
            "Anchor is David's own product — a voice AI interview platform that conducts structured interviews "
            "in a browser. The AI interviewer listens to participants, asks real-time follow-up questions "
            "from a configurable rubric, and extracts evidence-backed findings. "
            "The core idea is evidence-first: no floating summaries, no hallucinated insights — "
            "every finding is traceable to the participant's exact words. "
            "Local MVP demoable now. Contact david.mwiti.muthiru@gmail.com to book a demo."
        ),
    },
    {
        "id": "anchor_architecture",
        "tags": "anchor stack architecture tech technologies fastapi websockets postgresql redis streamlit docker "
                "evidence schema turn_id char_start char_end anchor_text async latency multi-tenant how built",
        "content": (
            "Anchor's stack: FastAPI, WebSockets, PostgreSQL, Redis, Streamlit, Docker. "
            "Evidence schema: every extracted claim carries turn_id, char_start, char_end, and verbatim "
            "anchor_text, so each finding is anchored to the exact span of the participant's words. "
            "Async architecture: fast response generation is separated from heavier background claim "
            "extraction, so voice latency stays conversational. "
            "Multi-tenant by design: tenant-scoped projects, sessions, rubrics, personas, API keys, "
            "configurable LLM/STT/TTS provider config, usage metering, and webhook-ready integration."
        ),
    },
    {
        "id": "anchor_verticals",
        "tags": "anchor verticals researchkit hiresignal research hiring recruitment ux market research "
                "customizable configurable different fields use cases industries cv verification demo",
        "content": (
            "Anchor is configurable for different fields via two verticals built on the same engine. "
            "ResearchKit: qualitative UX and market research with SID-style evidence scoring. "
            "HireSignal: STAR-format recruitment screening with CV claim verification. "
            "Because rubrics, personas, and providers are tenant-configurable, Anchor adapts to new "
            "interview domains without code changes. "
            "David is seeking customers and partners in research tech and HR tech — "
            "contact david.mwiti.muthiru@gmail.com to book a demo."
        ),
    },
    {
        "id": "bongalaw",
        "tags": "bongalaw rag kenyan constitution civic law retrieval grounded trulens benchmarking next.js chromadb",
        "content": (
            "BongaLaw is a RAG-grounded Q&A platform over Kenyan constitutional law. "
            "Every response is backed by retrieved source snippets with article citations — "
            "preventing hallucinated legal claims. "
            "Multi-agent debate system with SSE streaming: legal, economist, youth, and moderator agents "
            "argue bills from multiple stakeholder perspectives in real time. "
            "David benchmarked three retrieval strategies (sentence-level, chunk-merge, hybrid) using TruLens "
            "across Answer Relevance, Context Precision, and Groundedness metrics, with PCA/t-SNE visualisation. "
            "Full civic workflow: citizen voting/comments, sentiment analytics, constitutional scenario simulator, "
            "news-to-rights mapper, audio summaries via TTS. "
            "Stack: Next.js, FastAPI, ChromaDB, PostgreSQL, Docker, Claude API."
        ),
    },
    {
        "id": "biasharacredit",
        "tags": "biasharacredit sme loan east africa adk multi-agent human-in-the-loop approval checkpoint",
        "content": (
            "BiasharaCredit is a multi-agent loan processing workflow for East African SMEs, built on Google ADK. "
            "Pipeline: Orchestrator → Document Extraction → Underwriting → Risk Pricing → Human Approval → Decision. "
            "Pauses on missing data and resumes from checkpoints without repeating completed steps. "
            "Human-in-the-loop approval is a deliberate design choice: AI handles extraction and pricing, "
            "a human reviewer retains final approval for regulated credit decisions. "
            "LLM-as-judge validation at output boundaries, tool execution gates preventing unsafe continuation. "
            "Localized for Kenya/East Africa SME finance context."
        ),
    },
    {
        "id": "mtaascope",
        "tags": "mtaascope retail location intelligence nairobi east africa google places market research agent",
        "content": (
            "MtaaScope is a multi-agent retail location strategy system for East African entrepreneurs. "
            "Pipeline: intake parsing → live market research → competitor mapping (Google Places) "
            "→ gap analysis (Python/pandas scoring) → strategy advisory → HTML executive report + infographic. "
            "Each agent handles a distinct analytical responsibility. "
            "Output: viability score, opportunity gaps, risk factors, competitive positioning, "
            "alternative locations, validation checklist. "
            "Built on Google ADK, localized for Kenya/East Africa retail decisions."
        ),
    },
    {
        "id": "skills",
        "tags": "skills stack technologies python fastapi langgraph langchain openai claude groq redis postgresql docker",
        "content": (
            "David's technical skills: "
            "LLM & Agents: LangGraph (expert), LangChain, Claude API (expert), OpenAI API, Groq, Google ADK, multi-provider fallback. "
            "Backend: Python, FastAPI, Node.js, WebSockets, Redis, PostgreSQL, MySQL, Docker, GitHub Actions CI/CD. "
            "Vector & Eval: FAISS, ChromaDB, pgvector, LangSmith, TruLens. "
            "Frontend: Next.js, React, TypeScript, Tailwind CSS. "
            "Cloud: Vercel, Azure ML, Docker Compose, air-gapped Ollama deployment."
        ),
    },
    {
        "id": "availability",
        "tags": "available hire remote roles job open freelance consulting",
        "content": (
            "David is open to full-time remote AI engineering roles worldwide and to Anchor customer/partner "
            "conversations simultaneously. He is based in Nairobi, Kenya (UTC+3). "
            "For roles: david.mwiti.muthiru@gmail.com. "
            "For Anchor demos or partnerships: same email. Response within 24 hours."
        ),
    },
    {
        "id": "consulting",
        "tags": "consulting independent freelance clients rag faiss azure ml qualagents",
        "content": (
            "Before Paysoko, David worked on AI/ML consulting and prototype-to-product work. "
            "Public-facing themes include RAG pipelines, embeddings, evaluation, data workflows, "
            "and practical AI tooling for research or enterprise use cases. Avoid inventing client "
            "names, metrics, or unreleased project names."
        ),
    },
    {
        "id": "personality",
        "tags": "david personality hobbies interests life outside work fun facts personal human chess football gaming hiking night owl nairobi",
        "content": (
            "Outside of work, David is a chess player — find him at chess.com/member/Dave_Mwiti. "
            "He plays football, hikes (Nairobi has surprisingly good trails), and games. "
            "He's a night owl; a lot of his best code ships after midnight. "
            "He's genuinely curious — the kind of person who goes deep on a new idea at 1am "
            "and surfaces two days later with a working prototype. "
            "He speaks English and Swahili fluently. "
            "Based in Nairobi, Kenya, he's part of a growing East African AI engineering community "
            "that he finds genuinely exciting to be part of. "
            "His work ethic is shaped by building things that actually matter to real users — "
            "not demos, not hackathon projects, production systems."
        ),
    },
]

# ── BM25 Retrieval ─────────────────────────────────────────────────────────────

def tokenize(text: str) -> List[str]:
    """Simple whitespace + lowercase tokenizer."""
    return re.findall(r"[a-z0-9]+", text.lower())


def build_bm25(corpus: List[Dict[str, str]]):
    """Build BM25 index from knowledge base. Returns (bm25, docs).
    Falls back gracefully if rank_bm25 is not installed."""
    try:
        from rank_bm25 import BM25Okapi
        docs = [chunk["tags"] + " " + chunk["content"] for chunk in corpus]
        tokenized = [tokenize(doc) for doc in docs]
        return BM25Okapi(tokenized), docs
    except Exception:
        return None, corpus


# Module-level index (built once per cold start)
_bm25, _docs = build_bm25(KNOWLEDGE_BASE)


# Human-readable labels for each knowledge chunk
CHUNK_LABELS: Dict[str, str] = {
    "identity":         "David Mwiti",
    "paysoko_overview": "Paysoko Systems",
    "nl2sql":           "Paysoko · NL2SQL Engine",
    "credit_memo":      "Paysoko · Credit Memo Pipeline",
    "lending_backend":  "Paysoko · Lending Backend",
    "anchor_overview":     "Anchor · Voice AI Platform",
    "anchor_architecture": "Anchor · Architecture",
    "anchor_verticals":    "Anchor · Verticals",
    "bongalaw":         "BongaLaw · Civic AI",
    "biasharacredit":   "BiasharaCredit · Loan Agent",
    "mtaascope":        "MtaaScope · Location AI",
    "skills":           "Technical Skills",
    "availability":     "Availability",
    "consulting":       "Consulting Work",
    "personality":      "David · The Human",
}

# Minimum BM25 score to include a source in the citation list
CITATION_THRESHOLD = 0.8

# For button-triggered flows we know exactly which chunks are relevant.
# Skip BM25 and serve the right context directly.
FLOW_CHUNKS: Dict[str, List[str]] = {
    # Button-triggered narrative flows
    "recruiter":    ["identity", "paysoko_overview", "nl2sql", "credit_memo", "availability"],
    "anchor_intro": ["anchor_overview", "anchor_architecture", "anchor_verticals", "identity"],
    "builder":      ["anchor_overview", "nl2sql", "credit_memo", "lending_backend", "skills"],
    "explorer":     ["anchor_overview", "bongalaw", "nl2sql", "biasharacredit"],
    "about":        ["identity", "paysoko_overview", "anchor_overview", "consulting", "availability"],
    "skills":       ["skills", "nl2sql", "credit_memo", "lending_backend"],
    # Intent-pinned flows: detected from typed question patterns in ai-pitch.js
    "anchor_stack":     ["anchor_architecture", "anchor_overview"],
    "anchor_use_cases": ["anchor_verticals", "anchor_overview"],
    "anchor_evidence":  ["anchor_architecture", "anchor_overview"],
    "current_role":     ["identity", "paysoko_overview", "anchor_overview", "availability"],
    "paysoko_detail":   ["paysoko_overview", "nl2sql", "credit_memo", "lending_backend"],
    "hiring":           ["availability", "identity", "paysoko_overview"],
    "personal":         ["personality", "identity"],
}


def retrieve(query: str, k: int = 4) -> tuple:
    """Return (context_string, sources_list).

    sources_list is a list of dicts: {id, label, snippet}
    Only chunks with score >= CITATION_THRESHOLD are cited.
    """
    if _bm25 is None:
        context = "\n\n".join(chunk["content"] for chunk in KNOWLEDGE_BASE)
        return context, []

    scores = _bm25.get_scores(tokenize(query))
    ranked = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)
    top_k = ranked[:k]

    context_chunks = []
    sources = []

    for i in top_k:
        chunk = KNOWLEDGE_BASE[i]
        score = scores[i]
        if score <= 0:
            continue
        context_chunks.append(chunk["content"])
        if score >= CITATION_THRESHOLD:
            sources.append({
                "id":      chunk["id"],
                "label":   CHUNK_LABELS.get(chunk["id"], chunk["id"]),
                "snippet": chunk["content"][:120].rstrip() + "…",
                "score":   round(float(score), 2),
            })

    if not context_chunks:
        context_chunks = [KNOWLEDGE_BASE[0]["content"], KNOWLEDGE_BASE[-1]["content"]]

    return "\n\n".join(context_chunks), sources


# ── System Prompt ──────────────────────────────────────────────────────────────

BASE_SYSTEM_PROMPT = """You are the voice of David Mwiti Muthiru's portfolio — not a corporate chatbot, not a press release. Think of yourself as a sharp, slightly witty friend who knows David well and genuinely believes in his work.

WHO DAVID IS:
AI Engineer based in Nairobi, Kenya. 2+ years building production LLM infrastructure and agentic systems. Currently working at Paysoko Systems. Building Anchor. Open to remote roles worldwide and professional conversations about Anchor.

VOICE & TONE:
- Warm, direct, occasionally witty. Confident without being arrogant.
- Write like a human, not a LinkedIn post. Contractions are fine. Short punchy sentences are better than long ones.
- You can show personality — a light observation, a dry aside — but stay grounded in facts. Never force jokes.
- David is interesting as a person, not just a résumé. If someone asks about hobbies or life outside work, lean in — this is a feature, not a distraction.

BEHAVIOR RULES:
1. ANSWER THE SPECIFIC QUESTION FIRST. One direct sentence, then expand.
   - Stack question → name the actual technologies.
   - Customizable question → lead with the verticals/config options.
   - Personal question → answer it genuinely, then connect back to his work if natural.
2. DO NOT REPEAT yourself across turns. If you covered it, say "as I mentioned" and add something new.
3. When someone describes what they're building → match it to David's closest project, cite a real metric, argue the fit.
4. Technical questions → go deep on decisions, tradeoffs, specifics.
5. Only describe Anchor's evidence layer (turn_id / char spans) when the question is actually about how findings are captured.
6. Keep it tight: usually 1–2 short paragraphs. No bullet lists unless the user asks. No filler. No "great question!".
7. If asked something genuinely unknown → say so honestly and point to david.mwiti.muthiru@gmail.com.
8. Represent David with quiet confidence. Lead with evidence, not adjectives.
9. Do not invent projects, clients, metrics, employers, or credentials. Use only retrieved context.
10. Keep Paysoko/current-employer discussion professional and high-level. Do not expose internal details or overstate confidential metrics.

RETRIEVED CONTEXT (the actual facts — use these, don't invent):
{context}"""

VISITOR_NOTES = {
    "recruiter": "Recruiter or hiring manager. Lead with metrics and availability. Mention he's open to roles and conversations about Anchor simultaneously.",
    "builder":   "Someone building with AI. Go technical. Ask what they're building if it's not clear.",
    "anchor":    "Interested in Anchor specifically. Focus on what makes it different, the verticals, how to book a demo.",
    "explorer":  "Just browsing. Give them the most interesting, human version of David — not the most comprehensive.",
    "unknown":   "Unknown visitor. Be adaptive. Read what they're actually asking for.",
}


# ── Groq API call ──────────────────────────────────────────────────────────────

def call_groq(messages: List[Dict[str, str]], api_key: str, max_tokens: int = 450) -> str:
    payload = json.dumps({
        "model":       "llama-3.3-70b-versatile",
        "max_tokens":  max_tokens,
        "temperature": 0.7,
        "messages":    messages,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.groq.com/openai/v1/chat/completions",
        data=payload,
        headers={
            "Content-Type":  "application/json",
            "Authorization": f"Bearer {api_key}",
            "User-Agent":    "Mozilla/5.0 (compatible; portfolio-assistant/1.0)",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return data["choices"][0]["message"]["content"]


# ── Vercel handler ─────────────────────────────────────────────────────────────

class handler(BaseHTTPRequestHandler):

    def do_POST(self):
        try:
            length  = int(self.headers.get("Content-Length", 0))
            body    = json.loads(self.rfile.read(length))
        except Exception:
            self._send(400, {"error": "Invalid request body"})
            return

        message      = (body.get("message") or "").strip()
        history      = body.get("history", [])[-6:]   # last 3 turns
        visitor_type = body.get("visitorType", "unknown")
        max_tokens   = int(body.get("maxTokens", 450))
        flow_id      = (body.get("flowId") or "").strip()

        if not message:
            self._send(400, {"error": "message is required"})
            return

        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            self._send(500, {"error": "API key not configured"})
            return

        mongo_context = ""
        mongo_sources = []
        if portfolio_memory and portfolio_memory.is_configured():
            try:
                mongo_context, mongo_sources = portfolio_memory.search_knowledge(message)
            except Exception:
                mongo_context, mongo_sources = "", []

        # Context selection: prefer Mongo memory when configured, otherwise use
        # pre-selected chunks for known flows and BM25 for free-form queries.
        if mongo_context:
            context, sources = mongo_context, mongo_sources
        elif flow_id and flow_id in FLOW_CHUNKS:
            chunk_ids = FLOW_CHUNKS[flow_id]
            chunk_map = {c["id"]: c for c in KNOWLEDGE_BASE}
            selected  = [chunk_map[cid] for cid in chunk_ids if cid in chunk_map]
            context   = "\n\n".join(c["content"] for c in selected)
            # Still surface citations for the most relevant chunks
            sources   = [
                {
                    "id":      c["id"],
                    "label":   CHUNK_LABELS.get(c["id"], c["id"]),
                    "snippet": c["content"][:120].rstrip() + "…",
                    "score":   1.0,
                }
                for c in selected[:3]  # top 3 as citations
            ]
        else:
            context, sources = retrieve(message)

        visitor_note = VISITOR_NOTES.get(visitor_type, VISITOR_NOTES["unknown"])
        system_prompt = (
            BASE_SYSTEM_PROMPT.format(context=context)
            + f"\n\nVISITOR CONTEXT: {visitor_note}"
        )

        messages = [
            *[m for m in history if m.get("role") and m.get("content")],
            {"role": "user", "content": message},
        ]

        try:
            reply = call_groq(
                [{"role": "system", "content": system_prompt}, *messages],
                api_key,
                max_tokens,
            )
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            self._send(500, {"error": f"Groq error {e.code}: {err_body[:200]}"})
            return
        except Exception as e:
            self._send(500, {"error": str(e)})
            return

        self._send(200, {"reply": reply, "sources": sources})

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors_headers()
        self.end_headers()

    def _send(self, status: int, payload: dict):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self._cors_headers()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin",  "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def log_message(self, fmt, *args):  # suppress default access log noise
        pass
