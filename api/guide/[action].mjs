// Vercel adapter: reuses the Cloudflare Worker handler for /api/guide/* (static site is served by Vercel).
import { waitUntil } from '@vercel/functions';
import worker from '../../server/worker.js';

const env = {
  GROQ_MODEL: 'openai/gpt-oss-120b',
  OPENROUTER_MODEL: 'openai/gpt-oss-20b',
  LANGSMITH_PROJECT: 'patch-portfolio',
  ...process.env,
};

export default {
  fetch: (request) => worker.fetch(request, env, { waitUntil }),
};
