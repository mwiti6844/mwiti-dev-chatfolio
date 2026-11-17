// PATCH: floating portfolio guide. Talks to /api/guide/* (Cloudflare Worker). All text rendered via textContent.
(() => {
  const EMAIL = 'david.mwiti.muthiru@gmail.com';
  const STORE = 'patch-chat-v2';
  // Spinner verbs, Claude Code style, tuned to what PATCH is actually doing.
  const VERBS = ['Grepping the case files', 'Tracing the evidence', 'Joining tables', 'Reranking', 'Grounding', 'Checking the shipping log',
    'Validating the numbers', 'Masking the PII', 'Consulting the notebook', 'Reading the trace', 'Filling the tanks', 'Running numerical QA'];
  const GLYPHS = ['·', '✢', '✳', '✶', '✻', '✽', '✻', '✶', '✳', '✢'];
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Entry points by visitor type, not guesses at their question.
  const STARTERS = ['What would my team get from David?', 'I’m hiring an AI engineer', 'My team drowns in manual reports', 'I’m technical, show me the hard parts'];

  const el = (tag, props = {}, ...kids) => {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...kids.filter(Boolean));
    return node;
  };
  // One conversation per tab: it follows the visitor across pages and ends when the tab closes.
  const load = () => { try { return JSON.parse(sessionStorage.getItem(STORE)) || {}; } catch { return {}; } };
  const save = (s) => { try { sessionStorage.setItem(STORE, JSON.stringify(s)); } catch { /* private mode: in-memory only */ } };
  const newSessionId = () => crypto.randomUUID?.() ?? String(Date.now());

  let state = load();
  state = { sessionId: state.sessionId || newSessionId(), turns: state.turns || [], trace: state.trace === true };

  const launcher = el('button', { type: 'button', className: 'patch-launcher', ariaExpanded: 'false' },
    el('span', { className: 'patch-dots', ariaHidden: 'true' }),
    el('span', { className: 'patch-launch-text' }, el('strong', { textContent: 'ask PATCH' }), el('small', { textContent: 'the portfolio has a guide' })));
  launcher.setAttribute('aria-controls', 'patch-panel');

  const status = el('span', { className: 'patch-status', textContent: 'checking…' });
  const closeBtn = el('button', { type: 'button', className: 'patch-close', textContent: 'close' });
  const resetBtn = el('button', { type: 'button', className: 'patch-close', textContent: 'new chat', title: 'Forget this conversation' });
  const log = el('div', { className: 'patch-log', role: 'log', tabIndex: 0 });
  log.setAttribute('aria-live', 'polite');
  log.setAttribute('aria-label', 'Conversation with PATCH');
  const starters = el('div', { className: 'patch-chips' });
  const input = el('textarea', { id: 'patch-input', rows: 2, maxLength: 600, placeholder: 'Ask about a project, a metric, a concept…' });
  const send = el('button', { type: 'submit', className: 'patch-send', textContent: 'send' });
  const traceBox = el('input', { type: 'checkbox', id: 'patch-trace', checked: state.trace });
  const form = el('form', { className: 'patch-form' },
    el('label', { htmlFor: 'patch-input', className: 'visually-hidden', textContent: 'Your question' }), input, send);
  const panel = el('section', { id: 'patch-panel', className: 'patch-panel', hidden: true },
    el('div', { className: 'patch-head' },
      el('div', {}, el('h2', { id: 'patch-title', textContent: 'PATCH' }), el('p', { textContent: 'A guide grounded in this portfolio’s published evidence.' })),
      status, resetBtn, closeBtn),
    log, starters, form,
    el('div', { className: 'patch-foot' },
      el('label', { className: 'patch-optin' }, traceBox, el('span', { textContent: ' Share this chat with David to help improve PATCH (opt-in trace)' })),
      el('p', {}, el('span', { textContent: 'Questions go to an LLM provider (Groq or OpenRouter) to answer. PATCH remembers this conversation until you close the tab. Nothing is kept on the server unless you opt in. Want a human? ' }),
        el('a', { href: `mailto:${EMAIL}`, textContent: 'Email David', onclick: (e) => { e.currentTarget.href = mailtoHref(); } }))));
  panel.setAttribute('aria-labelledby', 'patch-title');
  panel.setAttribute('role', 'dialog');
  document.body.append(launcher, panel);

  const badge = { live: 'LIVE MODEL', preview: 'PREVIEW · NOT A LIVE MODEL' };

  // Opens the visitor's own mail app with their questions already in it, so nothing they asked gets lost.
  function mailtoHref() {
    const asked = state.turns.filter((t) => t.role === 'user').slice(-3).map((t) => `- ${t.content}`);
    const body = ['Hi David,', '', asked.length ? 'I was chatting with PATCH on your portfolio and wanted to ask you directly:' : 'I found your portfolio and wanted to reach out.', ...asked, '', ''].join('\n');
    return `mailto:${EMAIL}?subject=${encodeURIComponent('From your portfolio')}&body=${encodeURIComponent(body)}`;
  }

  function renderTurn(turn) {
    if (turn.role === 'user') return log.append(el('div', { className: 'patch-msg user', textContent: turn.content }));
    const msg = el('div', { className: 'patch-msg bot' });
    if (turn.mode) msg.append(el('span', { className: `patch-mode ${turn.mode}`, textContent: badge[turn.mode] || turn.mode }));
    msg.append(...renderText(turn.content));
    for (const c of turn.cards || []) {
      msg.append(el('a', { className: 'patch-card', href: c.url },
        el('small', { textContent: c.status }), el('strong', { textContent: `${c.title} ↗` }), c.summary && el('span', { textContent: c.summary }),
        c.audience && el('em', { className: 'patch-for', textContent: `For: ${c.audience}` })));
    }
    if (turn.actions?.length) {
      const row = el('div', { className: 'patch-actions' });
      // Allowlisted on the server; the visitor clicks, PATCH never navigates on its own.
      for (const a of turn.actions) {
        row.append(a.href.startsWith('mailto:')
          ? el('a', { className: 'patch-mail', href: mailtoHref(), textContent: `${a.label} ↗` })
          : el('button', { type: 'button', textContent: a.label, onclick: () => location.assign(a.href) }));
      }
      msg.append(row);
    }
    log.append(msg);
    renderChips(turn.followups || []);
  }

  // "- item" lines become a real list; everything else stays paragraphs. textContent only.
  function renderText(text) {
    const out = [];
    let list = null;
    for (const line of String(text || '').split('\n').map((l) => l.trim()).filter(Boolean)) {
      const item = line.match(/^[-•*]\s+(.*)/);
      if (item) { if (!list) out.push(list = el('ul')); list.append(el('li', { textContent: item[1] })); }
      else { list = null; out.push(el('p', { textContent: line })); }
    }
    return out;
  }

  function thinkingIndicator() {
    const glyph = el('span', { className: 'patch-glyph', textContent: GLYPHS[0], ariaHidden: 'true' });
    const verb = el('span', { textContent: `${VERBS[Math.floor(Math.random() * VERBS.length)]}…` });
    const node = el('div', { className: 'patch-msg bot thinking', role: 'status' }, glyph, verb);
    let tick = 0;
    const timer = setInterval(() => {
      tick += 1;
      if (!calm) glyph.textContent = GLYPHS[tick % GLYPHS.length];
      if (tick % 12 === 0) verb.textContent = `${VERBS[Math.floor(Math.random() * VERBS.length)]}…`;
    }, 120);
    return { node, stop: () => { clearInterval(timer); node.remove(); } };
  }

  function renderChips(list) {
    starters.replaceChildren(...list.map((q) => el('button', { type: 'button', textContent: q, onclick: () => ask(q) })));
  }

  function setOpen(open) {
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', String(open));
    launcher.hidden = open;
    (open ? input : launcher).focus();
    if (open) log.scrollTop = log.scrollHeight;
  }

  // Reads the Worker's NDJSON stream: delta lines go to onDelta, the final 'done' object is returned.
  async function readStream(res, onDelta) {
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buf = '';
    let done = null;
    for (;;) {
      const { value, done: end } = await reader.read();
      if (end) break;
      buf += value;
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines.filter(Boolean)) {
        const evt = JSON.parse(line);
        if (evt.type === 'delta') onDelta(evt.text);
        else if (evt.type === 'done') done = evt;
      }
    }
    if (buf.trim()) { const evt = JSON.parse(buf); if (evt.type === 'done') done = evt; }
    return done;
  }

  let busy = false;
  async function ask(text) {
    const message = text.trim().slice(0, 600);
    if (!message || busy) return;
    busy = true;
    send.disabled = true;
    input.value = '';
    const history = state.turns.slice(-12).map(({ role, content }) => ({ role, content }));
    const userTurn = { role: 'user', content: message };
    state = { ...state, turns: [...state.turns, userTurn] };
    renderTurn(userTurn);
    renderChips([]);
    const thinking = thinkingIndicator();
    log.append(thinking.node);
    log.scrollTop = log.scrollHeight;
    let turn;
    let live = null; // plain-text bubble filled while the reply streams in
    try {
      const res = await fetch('/api/guide/chat', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message, history, sessionId: state.sessionId, trace: state.trace }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Request failed (${res.status}).`);
      const data = await readStream(res, (text) => {
        if (!live) {
          thinking.stop();
          live = el('p', { className: 'patch-streaming' });
          log.append(el('div', { className: 'patch-msg bot' }, live));
        }
        live.textContent += text;
        log.scrollTop = log.scrollHeight;
      });
      if (!data) throw new Error('The reply was cut off.');
      turn = { role: 'assistant', content: data.reply, mode: data.mode, cards: data.cards, actions: data.actions, followups: data.followups };
    } catch (err) {
      turn = {
        role: 'assistant', mode: 'preview',
        content: `${err.message.startsWith('Too many') || err.message.startsWith('Message') ? err.message : 'PATCH can’t reach its server right now.'} The case files and contact links still work.`,
        actions: [{ id: 'email_david', label: 'Ask David directly', href: `mailto:${EMAIL}` }],
      };
    }
    thinking.stop();
    live?.parentElement.remove(); // replaced by the final, formatted reply (lists, cards, actions)
    state = { ...state, turns: [...state.turns, turn].slice(-30) };
    save(state);
    renderTurn(turn);
    log.scrollTop = log.scrollHeight;
    busy = false;
    send.disabled = false;
    input.focus();
  }

  launcher.addEventListener('click', () => setOpen(true));
  closeBtn.addEventListener('click', () => setOpen(false));
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  form.addEventListener('submit', (e) => { e.preventDefault(); ask(input.value); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input.value); } });
  resetBtn.addEventListener('click', () => {
    state = { ...state, sessionId: newSessionId(), turns: [] };
    save(state);
    log.replaceChildren();
    greet();
    input.focus();
  });
  traceBox.addEventListener('change', () => { state = { ...state, trace: traceBox.checked }; save(state); });

  function greet() {
    renderTurn({ role: 'assistant', content: 'Hey, I’m PATCH. Tell me what your team is stuck on and I’ll show you what David’s work could change for you: time back, fewer errors, answers you can trust.' });
    renderChips(STARTERS);
  }
  if (state.turns.length) state.turns.forEach(renderTurn);
  else greet();

  fetch('/api/guide/status').then((r) => (r.ok ? r.json() : Promise.reject())).then((s) => {
    status.textContent = s.configured ? '● live' : '◌ preview';
    status.className = `patch-status ${s.configured ? 'live' : 'offline'}`;
  }).catch(() => { status.textContent = '◌ offline'; status.className = 'patch-status offline'; });
})();
