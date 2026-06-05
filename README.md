# David Mwiti Portfolio

AI engineer portfolio with an interactive chat assistant, LiveKit-ready voice transport, and shared MongoDB Atlas Vector Search memory.

## Project Shape

- `chatfolio-interactive-ai-style-personal-portfolio-html-template/` - static portfolio site
- `api/chat.py` - Vercel Python function for the portfolio chat assistant
- `api/livekit-token.py` - Vercel Python function that mints browser LiveKit room tokens
- `api/portfolio_memory.py` - shared MongoDB Atlas Vector Search memory helper
- `knowledge/` - editable source-of-truth files for David's profile, projects, CV, skills, and voice-agent experience
- `scripts/` - MongoDB index setup and memory ingestion scripts
- `vercel.json` - Vercel routing and static output config

## Local Setup

```bash
cp .env.example .env
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
vercel dev --listen 0.0.0.0:3001
```

Open `http://localhost:3001`.

## Required Environment Variables

Set these in `.env` for local development and in Vercel Project Settings for production:

```bash
GROQ_API_KEY=

LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_AGENT_NAME=

MONGODB_URI=
MONGODB_DB=chatfolio
VOYAGE_API_KEY=
```

`LIVEKIT_AGENT_NAME` is optional unless the LiveKit worker uses explicit dispatch.

## Memory Workflow

Edit portfolio knowledge in:

```bash
knowledge/
```

Then create/update Atlas indexes and ingest the memory:

```bash
set -a; source .env; set +a; .venv/bin/python scripts/init_mongodb_indexes.py
set -a; source .env; set +a; .venv/bin/python scripts/ingest_knowledge.py
```

The chat endpoint automatically uses MongoDB memory when `MONGODB_URI` and `VOYAGE_API_KEY` are configured. If they are missing or unavailable, it falls back to the built-in knowledge in `api/chat.py`.

## Deployment

Deploy from the repository root:

```bash
vercel --prod
```

For GitHub-based deploys, import this repository into Vercel and set the production environment variables listed above.

## Docker

Docker is not required for this portfolio. Vercel serves the static site and Python serverless functions directly. Use Docker only if you later add a long-running self-hosted LiveKit voice agent or a separate backend service.
