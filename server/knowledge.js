// Curated public evidence for PATCH. Everything here already appears on the public site.
// Extend ONLY with evidence David has approved. Never add confidential client or programme names,
// and never load the original (non-anonymized) CV into this file or any retrieval corpus.

export const CASES = {
  'credit-memo': {
    title: '95 minutes → under five',
    status: 'Shipped · PaySoko',
    url: '/projects/credit-memo/',
    summary: 'Five-stage agent workflow for credit memo preparation: extract, mask private data, analyse, draft, then independent numerical QA. Preparation went from up to 95 minutes to under five.',
    role: "David shipped it as founding / lead AI-ML engineer at PaySoko.",
    problem: "Analysts spent up to 95 minutes assembling each credit memo by hand, and the numbers had to agree with each other before anyone could rely on them.",
    audience: "Credit, risk, lending and finance-ops teams",
    fitsWhen: "A team spends hours turning documents and spreadsheets into a standard memo or report, and wrong numbers are expensive: underwriting, insurance claims, audit and compliance packs, investment memos, procurement reviews.",
    keywords: ['credit', 'memo', 'paysoko', 'speed', 'faster', 'minutes', 'qa', 'numerical', 'finance', 'lending'],
  },
  nl2sql: {
    title: 'Ask data. Get answers.',
    status: 'Shipped · PaySoko',
    url: '/projects/nl2sql/',
    summary: 'David improved an internal natural-language-to-SQL assistant used by 200+ nontechnical colleagues. Answer relevance +40%, latency ~60% lower (about 4s → under 1.6s), measured with LangSmith.',
    role: "David improved an existing internal assistant at PaySoko. He did not build it from scratch.",
    problem: "Nontechnical colleagues needed answers from company data without queuing for an analyst, and needed to trust those answers.",
    audience: "Ops, finance, sales and support teams who wait on analysts",
    fitsWhen: "Business teams wait days for routine numbers, the data team drowns in ad-hoc requests, or leadership wants self-serve analytics with guardrails.",
    keywords: ['sql', 'nl2sql', 'nl-to-sql', 'query', 'database', 'latency', 'relevance', 'langsmith', 'analytics', 'assistant'],
  },
  anchor: {
    title: 'Interviews with a memory',
    status: 'Live pilot · Anchor',
    url: '/projects/anchor/',
    summary: 'Anchor is a voice AI research interviewer in live pilot with researchers: structured questions, adaptive follow-ups, and insights linked to exact participant turns, quotes and character spans.',
    role: "David founded Anchor and builds it as its AI engineer.",
    problem: "Qualitative interviews are slow to run at scale, and findings often lose the link back to what participants actually said.",
    audience: "UX research, product, customer-insight and academic research teams",
    fitsWhen: "A team runs many customer or user interviews, wants adaptive follow-up questions without a moderator on every call, or needs every insight traceable to the exact quote.",
    keywords: ['anchor', 'voice', 'interview', 'research', 'stt', 'tts', 'speech', 'duplex', 'pilot', 'founder', 'audio'],
  },
  'enterprise-agents': {
    title: 'Agents with a seatbelt',
    status: 'In development · client confidential',
    url: '/projects/enterprise-agents/',
    summary: 'With Invent Consulting, governed multi-agent workflows for a financial-services client (confidential). In development: source-grounded checks, versioned deterministic business rules, human approvals and audit trails.',
    role: "David designs these as a senior AI engineer with Invent Consulting.",
    problem: "Regulated organisations want agents doing real work, but cannot let them skip eligibility rules, approvals or audit requirements.",
    audience: "Banks, insurers, fintechs and other regulated operations",
    fitsWhen: "An organisation wants AI agents inside a regulated workflow and needs deterministic rules, human sign-off, audit trails and answers grounded in source documents.",
    keywords: ['enterprise', 'agent', 'agents', 'multi-agent', 'governed', 'bank', 'banking', 'client', 'consulting', 'invent', 'approval', 'audit'],
  },
  'production-ml': {
    title: 'It works on their machine, too',
    status: 'Shipped · PaySoko + consulting',
    url: '/projects/production-ml/',
    summary: 'AWS ECS services supporting 1,000+ concurrent users with CI/CD, structured logs and alerts at PaySoko; Azure batch scoring of 100,000+ records and retrieval benchmarking in independent consulting.',
    role: "David deployed and ran these at PaySoko and as an independent consultant.",
    problem: "Models that work in a notebook break under real traffic, real data volumes and nobody watching.",
    audience: "Teams taking ML or LLM features from prototype to production",
    fitsWhen: "A team has a promising prototype but needs it containerised, deployed, monitored and able to take real concurrency or large batch jobs.",
    keywords: ['production', 'mlops', 'deploy', 'docker', 'aws', 'ecs', 'azure', 'batch', 'ci/cd', 'cicd', 'monitoring', 'concurrent', 'cloud'],
  },
};

// Allowlisted UI actions. The model may only name these ids; the browser maps them to fixed hrefs.
export const ACTIONS = {
  open_lab: { label: 'Open the RAG lab', href: '/#lab' },
  open_tanks: { label: 'Open the toolkit tanks', href: '/#stack' },
  open_anchor: { label: 'Open the Anchor case', href: '/projects/anchor/' },
  open_credit: { label: 'Open the credit memo case', href: '/projects/credit-memo/' },
  open_sql: { label: 'Open the NL-to-SQL case', href: '/projects/nl2sql/' },
  open_contact: { label: 'Contact David', href: '/#contact' },
  // The browser pre-fills this email with the visitor's own questions so nothing they asked is lost.
  email_david: { label: 'Ask David directly', href: 'mailto:david.mwiti.muthiru@gmail.com' },
};

// What David can do for a team, each tied to evidence. Used when a visitor asks "what could he do for us?".
export const CAPABILITIES = `
- Turn slow, document-heavy reporting into automated workflows whose numbers are checked before anyone uses them (credit-memo).
- Give nontechnical teams self-serve answers from company data, and measure whether those answers are relevant and fast (nl2sql).
- Build voice AI and research tooling where every insight traces back to its evidence (anchor).
- Put agents into regulated workflows with fixed rules, human approvals and audit trails (enterprise-agents, in development).
- Take ML and LLM features from prototype to deployed, monitored services that handle real load (production-ml).
- Evaluate LLM systems: relevance, latency, grounding and tracing with tools like LangSmith (nl2sql, RAG lab).
`.trim();

export const PROFILE = `
David Mwiti Muthiru: Applied AI Engineer, Nairobi. Positioning: "Data at the core. Intelligence by design."
Path: data science → applied AI engineering (ML, data quality, RAG, agent orchestration, agent harnesses, evaluation,
observability, Python APIs, Docker, CI/CD, cloud infrastructure, production support).

Roles (status vocabulary matters: shipped, live pilot, in development, educational demonstration are different things):
- PaySoko Systems, Founding / Lead AI-ML Engineer, Sep 2024 - Jun 2026. SHIPPED: credit memo workflow (up to 95 min → under 5),
  NL-to-SQL assistant (200+ staff, +40% relevance, ~60% lower latency, ~4s → <1.6s, LangSmith), AWS ECS services for 1,000+
  concurrent users, offline model variant for restricted environments, pricing experiments, numerical validation, logging, alerts.
- Anchor, Founder / AI Engineer, Feb 2025 - present. LIVE PILOT: adaptive voice interviewing and follow-up probing; findings
  traceable to participant turns and spans; piloted with researchers. Site: https://studyanchor.org/
- Invent Consulting, Senior AI Engineer, Jul 2026 - present, financial-services client (identity confidential). IN DEVELOPMENT:
  governed multi-agent workflows, versioned business rules agents cannot bypass, human approvals, audit trails, integration design.
- Alphasoft Limited, AI/ML Engineer (contract), Mar 2026 - present. Workstream: conversational ERP copilot and governed analytics,
  approved actions and checks on model-produced figures.
- Independent consulting, AI/ML Consultant, Nov 2023 - Sep 2024. DELIVERED: retrieval benchmarking, Azure batch scoring of
  100,000+ records, QualAgents (a multi-agent research-analysis prototype).

Startup builder programs (program acceptance / startup grants: NOT certifications):
- Cartesia Startups Grant: accepted; 12 months of voice-service and agent allowances.
- LiveKit Startups program: approved; Cloud and Inference credits plus one year of Scale-plan benefits.

Site features (educational demonstrations, simulated, not live models): RAG / agent quality lab (Query → Retrieve → Ground →
Generate → Evaluate, with simulated failure modes and an illustrative trace); Anchor speech-architecture explorer comparing
STT→LLM→TTS, speech-to-speech and full duplex: educational, NOT a claim that all patterns ship in Anchor; toolkit tanks show
illustrative experience depth, not measured proficiency; Engineering Notebook with 16 concepts; downloadable one-page CV.

Contact: david.mwiti.muthiru@gmail.com (primary), david.mwiti@studyanchor.org.
LinkedIn https://www.linkedin.com/in/david-mwiti-38316b18b/ · GitHub https://github.com/mwiti6844
`.trim();
