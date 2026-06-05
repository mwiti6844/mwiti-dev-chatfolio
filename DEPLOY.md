# Deploy David's Portfolio to Vercel

## Before you deploy

1. **Add your photo**
   Copy your photo as `david.jpg` into:
   `chatfolio-interactive-ai-style-personal-portfolio-html-template/img/david.jpg`

2. **Add your CV**
   Copy `CV_David_Mwiti_LangGraph_MultiAgent.docx` (converted to PDF) as:
   `chatfolio-interactive-ai-style-personal-portfolio-html-template/assets/CV_David_Mwiti.pdf`

3. **Fix your LinkedIn URL**
   In `index.html`, find `linkedin.com/in/david-mwiti-muthiru` and replace with your actual LinkedIn slug.

---

## Deploy (5 minutes)

### Step 1 — Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2 — Login
```bash
vercel login
```

### Step 3 — Deploy from the ChatFolio folder
```bash
cd /Users/mac/Desktop/ChatFolio
vercel --prod
```

### Step 4 — Add your API key
In the Vercel dashboard → your project → Settings → Environment Variables:
```
GROQ_API_KEY = gsk_...your key...
LIVEKIT_URL = wss://your-project.livekit.cloud
LIVEKIT_API_KEY = your_livekit_api_key
LIVEKIT_API_SECRET = your_livekit_api_secret
LIVEKIT_AGENT_NAME = david-portfolio-agent
MONGODB_URI = mongodb+srv://...
MONGODB_DB = chatfolio
VOYAGE_API_KEY = pa_...or al-...
```
Then redeploy:
```bash
vercel --prod
```

---

## Shared memory with MongoDB Atlas Vector Search

The editable source of truth for David's portfolio facts is:
`knowledge/*.md`

Add CV links, project details, personal details, recruiter notes, and Anchor updates there. The same MongoDB collection can be used by:

- `/api/chat` on Vercel
- the LiveKit voice agent worker
- future admin/editing tools

### Setup

1. Create a MongoDB Atlas cluster.
2. Create a database user and copy the connection string into `MONGODB_URI`.
3. Create a Voyage embedding key, or an Atlas embedding key that starts with `al-`.
4. Put these values in local `.env` and Vercel Environment Variables:

```bash
MONGODB_URI=mongodb+srv://...
MONGODB_DB=chatfolio
VOYAGE_API_KEY=pa_...or al-...
```

5. From the project root, create indexes and ingest memory:

```bash
python3 scripts/init_mongodb_indexes.py
python3 scripts/ingest_knowledge.py
```

Atlas Vector Search indexes can take 1-2 minutes before they are queryable. Until these env vars exist, the chat endpoint safely falls back to the built-in portfolio knowledge inside `api/chat.py`.

---

## LiveKit voice deployment

The portfolio uses Vercel only to mint short-lived LiveKit tokens at:
`/api/livekit-token`

The realtime voice agent should be deployed separately on LiveKit Cloud:

```bash
lk cloud auth
lk agent create
lk agent status
lk agent logs
```

Recommended deployment shape:

```
Portfolio on Vercel
  └─ /api/livekit-token signs LiveKit room tokens
LiveKit Cloud
  └─ realtime room + deployed voice agent
MongoDB Atlas
  └─ shared portfolio memory for chat + voice
```

Do not run the long-lived voice agent as a Vercel serverless function. LiveKit agents are realtime workers and should run on LiveKit Cloud or a container host.

---

## File structure
```
ChatFolio/
├── api/
│   └── chat.py              ← Groq API serverless function
│   └── livekit-token.py     ← LiveKit browser token endpoint
│   └── portfolio_memory.py  ← MongoDB Atlas Vector Search memory helper
├── knowledge/               ← Editable facts about David, projects, CV, links
├── scripts/
│   ├── init_mongodb_indexes.py
│   └── ingest_knowledge.py
├── chatfolio-interactive-ai-style-personal-portfolio-html-template/
│   ├── index.html           ← Your customised portfolio
│   ├── js/
│   │   ├── app.js           ← Original template JS (unchanged)
│   │   ├── typewriter.js    ← Original template JS (unchanged)
│   │   └── ai-pitch.js      ← Your AI pitch agent hook
│   ├── css/                 ← Template CSS (unchanged)
│   └── img/
│       └── david.jpg        ← YOUR PHOTO (add this)
├── vercel.json              ← Deployment config
└── package.json
```

---

## Testing locally (optional)
```bash
npm install -g vercel
vercel dev
```
Then open http://localhost:3000

The AI chat won't work locally without setting:
```bash
export GROQ_API_KEY=gsk_...
export LIVEKIT_URL=wss://your-project.livekit.cloud
export LIVEKIT_API_KEY=...
export LIVEKIT_API_SECRET=...
export MONGODB_URI=mongodb+srv://...
export MONGODB_DB=chatfolio
export VOYAGE_API_KEY=...
```
