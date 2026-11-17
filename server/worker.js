// Cloudflare Worker: serves the static site (ASSETS binding) and PATCH's API.
//   GET  /api/guide/status -> { configured, providers, tracing }
//   POST /api/guide/chat   -> NDJSON: {type:'delta',text}* then {type:'done', mode: live|preview, provider?, reply, cards, actions, followups}
import { LIMITS, BadRequest, validateChat, buildMessages, parseStreamed, createStreamFilter, previewReply } from './chat.js';
import { streamComplete, configuredProviders, traceRun } from './providers.js';

const SECURITY_HEADERS = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', ...SECURITY_HEADERS },
});

// ponytail: per-isolate fallback only. Production relies on the GUIDE_LIMITER rate-limit binding (wrangler.toml).
const localHits = new Map();
function localLimit(key, limit = 12, windowMs = 60000) {
  const now = Date.now();
  const recent = (localHits.get(key) || []).filter((t) => now - t < windowMs);
  localHits.set(key, [...recent, now]);
  if (localHits.size > 5000) localHits.clear();
  return recent.length < limit;
}

async function allowed(request, env) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || 'local';
  if (env.GUIDE_LIMITER) return (await env.GUIDE_LIMITER.limit({ key: ip })).success;
  return localLimit(ip);
}

const forbiddenTerms = (env) => String(env.FORBIDDEN_TERMS || '').split(',').map((t) => t.trim()).filter(Boolean);

async function handleChat(request, env, ctx, fetchImpl) {
  if (!(await allowed(request, env))) return json({ error: 'Too many messages. Take a breather and try again in a minute.' }, 429);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > LIMITS.bodyBytes) return json({ error: 'Request too large.' }, 413);
  let input;
  try {
    input = validateChat(JSON.parse(raw));
  } catch (err) {
    return json({ error: err instanceof BadRequest ? err.message : 'Invalid JSON.' }, 400);
  }

  // NDJSON stream: {"type":"delta","text"} lines while the model writes, then one {"type":"done", ...result}.
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const send = (obj) => writer.write(encoder.encode(`${JSON.stringify(obj)}\n`));
  ctx.waitUntil(answer(input, env, ctx, fetchImpl, send).finally(() => writer.close()));
  return new Response(readable, { headers: { 'content-type': 'application/x-ndjson; charset=utf-8', ...SECURITY_HEADERS } });
}

async function answer(input, env, ctx, fetchImpl, send) {
  const start = new Date().toISOString();
  const forbidden = forbiddenTerms(env);
  const filter = createStreamFilter(forbidden);
  let result;
  try {
    const { text, provider } = await streamComplete(env, buildMessages(input), (d) => {
      const out = filter.push(d);
      if (out) send({ type: 'delta', text: out });
    }, fetchImpl);
    const clean = parseStreamed(text, forbidden);
    result = clean ? { mode: 'live', provider, ...clean } : { mode: 'preview', ...previewReply(input.message) };
  } catch (err) {
    console.error('PATCH provider failure:', err.message);
    result = { mode: 'preview', ...previewReply(input.message) };
  }
  await send({ type: 'done', ...result });

  if (input.trace && env.LANGSMITH_API_KEY) {
    const run = { ...input, ...result, start, cards: result.cards.map((c) => c.id), actions: result.actions.map((a) => a.id) };
    ctx.waitUntil(traceRun(env, run, fetchImpl).catch((err) => console.error('LangSmith trace failed:', err.message)));
  }
}

export default {
  async fetch(request, env, ctx, fetchImpl = fetch) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/guide/status' && request.method === 'GET') {
      const providers = configuredProviders(env);
      return json({ configured: providers.length > 0, providers, tracing: Boolean(env.LANGSMITH_API_KEY) });
    }
    if (pathname === '/api/guide/chat') {
      if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
      return handleChat(request, env, ctx, fetchImpl);
    }
    if (pathname.startsWith('/api/')) return json({ error: 'Not found.' }, 404);
    return env.ASSETS.fetch(request);
  },
};
