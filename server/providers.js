// LLM providers (OpenAI-compatible) and opt-in LangSmith tracing. Keys come only from Worker secrets.

const PROVIDERS = [
  // `extra`: low reasoning keeps first-token latency ~1s and leaves the token budget for the visible reply.
  { name: 'groq', url: 'https://api.groq.com/openai/v1/chat/completions', key: 'GROQ_API_KEY', model: 'GROQ_MODEL', extra: { reasoning_effort: 'low' } },
  { name: 'openrouter', url: 'https://openrouter.ai/api/v1/chat/completions', key: 'OPENROUTER_API_KEY', model: 'OPENROUTER_MODEL', extra: { reasoning: { effort: 'low' } } },
];
const DEFAULT_MODEL = 'openai/gpt-oss-20b';
const TIMEOUT_MS = 12000;
const MAX_TOKENS = 1400; // per-call spend guard; reasoning models spend part of this before the visible reply
const MAX_RETRY_WAIT_S = 6;

export const configuredProviders = (env) => PROVIDERS.filter((p) => env[p.key]).map((p) => p.name);

async function open(p, env, messages, fetchImpl) {
  const res = await fetchImpl(p.url, {
    method: 'POST',
    headers: { authorization: `Bearer ${env[p.key]}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: env[p.model] || DEFAULT_MODEL, messages, temperature: 0.4, max_tokens: MAX_TOKENS, stream: true, ...p.extra }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok || !res.body) {
    const err = new Error(`${p.name} HTTP ${res.status}`);
    err.retryAfter = res.status === 429 ? Number(res.headers.get('retry-after')) : NaN;
    throw err;
  }
  return res;
}

async function openWithRetry(p, env, messages, fetchImpl) {
  try {
    return await open(p, env, messages, fetchImpl);
  } catch (err) {
    // Free-tier per-minute limits clear fast: one short wait beats a canned preview.
    if (!(err.retryAfter >= 0 && err.retryAfter <= MAX_RETRY_WAIT_S)) throw err;
    await new Promise((ok) => setTimeout(ok, err.retryAfter * 1000 + 250));
    return open(p, env, messages, fetchImpl);
  }
}

// Reads OpenAI-style SSE, calling onDelta for each content chunk. Returns the full text.
async function readSSE(res, onDelta) {
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = '';
  let full = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      const data = line.startsWith('data:') ? line.slice(5).trim() : '';
      if (!data || data === '[DONE]') continue;
      let delta = '';
      try { delta = JSON.parse(data)?.choices?.[0]?.delta?.content || ''; } catch { /* keep-alive or partial noise */ }
      if (delta) { full += delta; onDelta(delta); }
    }
  }
  return full;
}

// Groq first, OpenRouter fallback (only if nothing has streamed yet). Returns { text, provider }.
export async function streamComplete(env, messages, onDelta, fetchImpl = fetch) {
  const errors = [];
  for (const p of PROVIDERS.filter((x) => env[x.key])) {
    let streamed = '';
    try {
      const res = await openWithRetry(p, env, messages, fetchImpl);
      const text = await readSSE(res, (d) => { streamed += d; onDelta(d); });
      if (!text.trim()) throw new Error(`${p.name} returned no content`);
      return { text, provider: p.name };
    } catch (err) {
      if (streamed.trim()) return { text: streamed, provider: p.name }; // mid-stream drop: keep what the visitor already saw
      errors.push(`${p.name}: ${err.message}`); // message only: never echo headers or keys
    }
  }
  throw new Error(errors.length ? errors.join('; ') : 'no provider configured');
}

// Only called when the visitor ticked the opt-in box AND LANGSMITH_API_KEY is set.
export async function traceRun(env, run, fetchImpl = fetch) {
  const endpoint = (env.LANGSMITH_ENDPOINT || 'https://api.smith.langchain.com').replace(/\/$/, '');
  const res = await fetchImpl(`${endpoint}/runs`, {
    method: 'POST',
    headers: { 'x-api-key': env.LANGSMITH_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      name: 'patch-chat',
      run_type: 'llm',
      session_name: env.LANGSMITH_PROJECT || 'patch-portfolio',
      start_time: run.start,
      end_time: new Date().toISOString(),
      inputs: { question: run.message },
      outputs: { reply: run.reply, cards: run.cards, actions: run.actions },
      extra: { metadata: { session_id: run.sessionId, provider: run.provider, mode: run.mode } },
    }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`LangSmith HTTP ${res.status}`);
}
