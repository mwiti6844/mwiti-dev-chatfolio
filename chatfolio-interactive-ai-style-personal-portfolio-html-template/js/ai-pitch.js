/**
 * ai-pitch.js — David Mwiti's AI Pitch Agent
 * ─────────────────────────────────────────────
 * - Intercepts free-text chat and routes to /api/chat (Python FastAPI + BM25 RAG)
 * - Renders citation chips sourced from BM25 retrieval results
 * - Full voice conversation loop: Web Speech API (STT) + speechSynthesis (TTS)
 * - Visitor type adaptive (recruiter / builder / anchor / explorer)
 * - Rate limits: 10 AI messages per session
 * - Content guardrails: off-topic requests deflected
 * - Must be loaded AFTER app.js
 */

(function () {
  'use strict';

  /* ── Constants ─────────────────────────────────────────────── */
  const MAX_FREE_MESSAGES = 10;
  const RATE_LIMIT_KEY    = 'dm_ai_count';
  const VISITOR_KEY       = 'dm_visitor_type';
  const VOICE_MODE_KEY    = 'dm_voice_mode';

  /* ── State ─────────────────────────────────────────────────── */
  const conversationHistory = [];
  let aiResponsePending     = false;
  let visitorType           = sessionStorage.getItem(VISITOR_KEY) || 'unknown';
  let messageCount          = parseInt(sessionStorage.getItem(RATE_LIMIT_KEY) || '0', 10);
  let recognition           = null;
  let isListening           = false;
  let voiceModeOn           = sessionStorage.getItem(VOICE_MODE_KEY) === 'true';
  let currentUtterance      = null;
  let lastSourceIds         = ''; // fingerprint of the previous turn's citations (de-dup)

  /* ── Guardrail patterns ────────────────────────────────────── */
  const OFF_TOPIC_PATTERNS = [
    /\b(write me code|generate code for|build me a|create a script)\b/i,
    /\b(politics|religion|sex|adult|nsfw|drugs|violence)\b/i,
    /\b(your api key|anthropic key|system prompt|ignore previous)\b/i,
    /\b(jailbreak|pretend you are|act as if|forget you are)\b/i,
  ];
  function isOffTopic(msg) {
    return OFF_TOPIC_PATTERNS.some(p => p.test(msg));
  }

  /* ── Visitor type tracking ─────────────────────────────────── */
  function trackVisitorType(flowId) {
    const map = {
      recruiter: 'recruiter', builder: 'builder',
      anchor_intro: 'anchor', explorer: 'explorer',
    };
    if (map[flowId]) {
      visitorType = map[flowId];
      sessionStorage.setItem(VISITOR_KEY, visitorType);
    }
  }

  /* ── Rate limiting ─────────────────────────────────────────── */
  function isRateLimited()   { return messageCount >= MAX_FREE_MESSAGES; }
  function incrementCount()  { messageCount++; sessionStorage.setItem(RATE_LIMIT_KEY, String(messageCount)); }
  function remainingMessages() { return Math.max(0, MAX_FREE_MESSAGES - messageCount); }

  /* ── Citation chips ────────────────────────────────────────── */
  function buildCitationChips(sources) {
    if (!sources || sources.length === 0) return '';
    // Skip chips when this turn's sources are identical to the previous turn's —
    // repeating the same citations every message is noise, not signal.
    const fingerprint = sources.map(s => s.id || s.label).join('|');
    if (fingerprint === lastSourceIds) return '';
    lastSourceIds = fingerprint;
    const chips = sources.map(s => {
      const snippet = escapeHtml(s.snippet || '');
      const label   = escapeHtml(s.label  || s.id);
      return `<button
        class="citation-chip"
        aria-label="Source: ${label}"
        data-snippet="${snippet}"
        onclick="this.classList.toggle('expanded')"
      ><i class="fa-solid fa-database" aria-hidden="true"></i>${label}<span class="citation-snippet">${snippet}</span></button>`;
    }).join('');
    return `<div class="citation-row">${chips}</div>`;
  }

  /* ── Append user message ───────────────────────────────────── */
  function appendUserMessage(text) {
    const chatWindow = document.getElementById('chat-window');
    const intro = document.getElementById('intro-screen');
    if (intro && !intro.classList.contains('fade-out')) {
      intro.classList.add('fade-out');
      setTimeout(() => intro.remove(), 600);
    }
    const el = document.createElement('div');
    el.className = 'message-wrapper user-message';
    el.innerHTML = `<div class="message-bubble"><p>${escapeHtml(text)}</p></div>`;
    chatWindow.appendChild(el);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  /* ── Typing indicator ──────────────────────────────────────── */
  function showTyping() {
    const chatWindow = document.getElementById('chat-window');
    const avatarSrc  = document.getElementById('chat-avatar')?.getAttribute('src') || '';
    const el = document.createElement('div');
    el.id = 'ai-typing-indicator';
    el.className = 'message-wrapper ai-message first-in-group';
    el.innerHTML = `
      <div class="chat-avatar">
        <img src="${avatarSrc}" alt="David" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">
      </div>
      <div class="message-bubble typing-indicator">
        <span></span><span></span><span></span>
      </div>`;
    chatWindow.appendChild(el);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return el;
  }
  function hideTyping(el) { if (el && el.parentNode) el.parentNode.removeChild(el); }

  /* ── Disable / enable chat UI ──────────────────────────────── */
  function setUIEnabled(enabled) {
    const chatInput    = document.getElementById('chat-input');
    const sendButton   = document.getElementById('send-button');
    const inputWrapper = document.getElementById('input-nav-wrapper');
    const navLinks     = document.querySelectorAll('.btn-primary-nav');
    if (enabled) {
      if (inputWrapper) inputWrapper.classList.remove('disabled');
      navLinks.forEach(l => l.classList.remove('disabled'));
      if (chatInput)  chatInput.disabled  = false;
      if (sendButton) sendButton.disabled = (chatInput?.value.trim() === '');
    } else {
      if (inputWrapper) inputWrapper.classList.add('disabled');
      navLinks.forEach(l => l.classList.add('disabled'));
      if (chatInput)  chatInput.disabled  = true;
      if (sendButton) sendButton.disabled = true;
    }
  }

  /* ── Append AI message with optional citations ─────────────── */
  function appendAIMessage(text, sources = [], showActions = true) {
    const chatWindow = document.getElementById('chat-window');
    const avatarSrc  = document.getElementById('chat-avatar')?.getAttribute('src') || '';

    // Safely render AI text: escape HTML first, then apply markdown-style transforms
    const renderParagraph = (raw) => {
      const tmp = document.createElement('div');
      tmp.textContent = raw.trim();          // escapes < > & safely
      let safe = tmp.innerHTML;
      safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // bold
      safe = safe.replace(/\*(.*?)\*/g, '<em>$1</em>');             // italic
      safe = safe.replace(/\n/g, '<br>');
      return `<p>${safe}</p>`;
    };

    const paragraphs = text
      .split('\n\n')
      .filter(p => p.trim())
      .map(renderParagraph)
      .join('');

    const citationsHTML = buildCitationChips(sources);

    const actionsHTML = showActions ? `
      <div class="ai-inline-actions">
        <button class="btn btn-primary" onclick="window.generateAndProcessResponse('contact','Let\\'s Talk')">
          <span class="button-content"><span>Let's Talk</span></span>
        </button>
        <button class="btn btn-primary btn-secondary" onclick="window.generateAndProcessResponse('projects','View Projects')">
          <span class="button-content"><span>View Projects</span></span>
        </button>
      </div>` : '';

    const el = document.createElement('div');
    el.className = 'message-wrapper ai-message first-in-group';
    el.innerHTML = `
      <div class="chat-avatar">
        <img src="${avatarSrc}" alt="David" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">
      </div>
      <div class="message-bubble" style="opacity:0;transition:opacity 0.35s ease-out">
        ${paragraphs}
        ${citationsHTML}
        ${actionsHTML}
      </div>`;

    chatWindow.appendChild(el);
    requestAnimationFrame(() => {
      const bubble = el.querySelector('.message-bubble');
      if (bubble) bubble.style.opacity = '1';
    });
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  /* ── Rate limit message ────────────────────────────────────── */
  function showRateLimitMessage() {
    const chatWindow = document.getElementById('chat-window');
    const avatarSrc  = document.getElementById('chat-avatar')?.getAttribute('src') || '';
    const el = document.createElement('div');
    el.className = 'message-wrapper ai-message first-in-group';
    el.innerHTML = `
      <div class="chat-avatar">
        <img src="${avatarSrc}" alt="David" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">
      </div>
      <div class="message-bubble">
        <div class="rate-limit-message">
          <p>You've used your ${MAX_FREE_MESSAGES} free questions for this session.</p>
          <p>To keep the conversation going, email David directly:<br>
          <a href="mailto:david.mwiti.muthiru@gmail.com">david.mwiti.muthiru@gmail.com</a></p>
        </div>
      </div>`;
    chatWindow.appendChild(el);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    if (chatInput)  { chatInput.disabled = true; chatInput.placeholder = 'Session limit reached — email David to continue'; }
    if (sendButton) sendButton.disabled = true;
  }

  /* ── TTS: speak a reply ────────────────────────────────────── */
  function speak(text) {
    if (!voiceModeOn || !window.speechSynthesis) return;
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    // Strip markdown-ish characters before speaking
    const clean = text.replace(/[*_`#~]/g, '').replace(/\n+/g, ' ').trim();
    const utt = new SpeechSynthesisUtterance(clean);
    utt.rate  = 1.05;
    utt.pitch = 1.0;
    // Prefer a natural-sounding English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google'))
    ) || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utt.voice = preferred;
    currentUtterance = utt;
    // Update footer while speaking
    utt.onstart = () => {
      const footer = document.getElementById('chat-footer-text');
      if (footer) footer.innerHTML = '<i class="fa-solid fa-volume-high"></i> Speaking…';
    };
    utt.onend = utt.onerror = () => {
      currentUtterance = null;
      const footer = document.getElementById('chat-footer-text');
      if (footer) footer.innerHTML = '<i class="fa-regular fa-comment-dots"></i> Ask me anything — or tap the mic to speak';
    };
    window.speechSynthesis.speak(utt);
  }

  function stopSpeaking() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    currentUtterance = null;
  }

  /* ── Voice mode toggle button ──────────────────────────────── */
  function updateVoiceModeButton() {
    const btn = document.getElementById('voice-mode-toggle');
    if (!btn) return;
    if (voiceModeOn) {
      btn.classList.add('active');
      btn.title = 'Voice mode on — click to mute responses';
    } else {
      btn.classList.remove('active');
      btn.title = 'Enable voice responses';
    }
  }

  function injectVoiceModeToggle() {
    // Add a speaker-toggle button next to the voice mic button
    const voiceBtn = document.getElementById('voice-button');
    if (!voiceBtn || document.getElementById('voice-mode-toggle')) return;
    const btn = document.createElement('button');
    btn.id        = 'voice-mode-toggle';
    btn.className = 'voice-btn';
    btn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
    btn.addEventListener('click', () => {
      voiceModeOn = !voiceModeOn;
      sessionStorage.setItem(VOICE_MODE_KEY, String(voiceModeOn));
      if (!voiceModeOn) stopSpeaking();
      updateVoiceModeButton();
    });
    voiceBtn.parentNode.insertBefore(btn, voiceBtn.nextSibling);
    updateVoiceModeButton();
  }

  /* ── Intent detection → pinned backend context ────────────── */
  // When a typed question matches a known pattern we inject a flowId so the
  // backend uses a pinned chunk list instead of BM25 — guaranteed right context.
  const INTENT_PATTERNS = [
    // Anchor – stack / tech
    { re: /\b(stack|tech(nology|nologies)?|tools?|built with|using|framework)\b.{0,40}\banchor\b|\banchor\b.{0,40}\b(stack|tech|tools?|built with|framework)\b/i, flowId: 'anchor_stack' },
    // Anchor – customizable / fields / use cases
    { re: /\b(customiz|configur|different fields?|use cases?|industries|sector|verticals?|works? for|for (research|hr|hiring|recruitment))\b/i, flowId: 'anchor_use_cases' },
    // Anchor – evidence / extraction / how it works
    { re: /\b(evidence|extract|findings?|how.{0,20}(work|capture|tag|find)|anchor_text|turn_id|char_start|verbatim)\b/i, flowId: 'anchor_evidence' },
    // Where is David working / current role
    { re: /\b(where.{0,20}(work|based)|current (job|role|position|work)|working (now|currently|right now)|what.{0,10}do(ing)?.{0,10}now)\b/i, flowId: 'current_role' },
    // Paysoko details / what was built there
    { re: /\b(paysoko|nl2?sql|credit memo|lending|uliza|what.{0,15}(built|shipped|worked on|made))\b/i, flowId: 'paysoko_detail' },
    // Availability / hiring
    { re: /\b(available|open to (work|roles?)|looking for|hire|remote role|job offer|position)\b/i, flowId: 'hiring' },
    // Personal / human side
    { re: /\b(hobb(y|ies)|outside (of )?work|personal|fun fact|chess|football|gaming|hiking|interests?|person(ality)?|human|who is|life|free time|night owl)\b/i, flowId: 'personal' },
  ];
  function detectIntent(msg) {
    for (const { re, flowId } of INTENT_PATTERNS) {
      if (re.test(msg)) return flowId;
    }
    return '';
  }

  /* ── Main AI response handler ──────────────────────────────── */
  async function handleAIMessage(userMessage) {
    if (aiResponsePending) return;

    if (isOffTopic(userMessage)) {
      appendUserMessage(userMessage);
      await new Promise(r => setTimeout(r, 400));
      appendAIMessage("That's outside what I can help with here. Ask me about David's work, skills, or Anchor — or use the nav below.", [], false);
      return;
    }

    if (isRateLimited()) {
      appendUserMessage(userMessage);
      showRateLimitMessage();
      return;
    }

    aiResponsePending = true;
    setUIEnabled(false);
    stopSpeaking();
    appendUserMessage(userMessage);

    const typingEl = showTyping();
    await new Promise(r => setTimeout(r, 800));

    try {
      incrementCount();

      const response = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          message:    userMessage,
          history:    conversationHistory.slice(-8),
          visitorType,
          maxTokens:  220,
          flowId:     detectIntent(userMessage), // pin context for known question patterns
        })
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data    = await response.json();
      const reply   = data.reply   || "I couldn't generate a response. Try asking again.";
      const sources = data.sources || [];

      conversationHistory.push({ role: 'user',      content: userMessage });
      conversationHistory.push({ role: 'assistant', content: reply });

      hideTyping(typingEl);

      const remaining = remainingMessages();
      const showLimit = remaining <= 3 && remaining > 0;
      const displayReply = showLimit
        ? reply + `\n\n_(${remaining} free question${remaining === 1 ? '' : 's'} remaining this session)_`
        : reply;

      appendAIMessage(displayReply, sources);
      speak(reply); // TTS — speaks clean version, not the remaining-count note

    } catch (err) {
      hideTyping(typingEl);
      appendAIMessage("Something went wrong on my end. Try again in a moment, or email David directly at david.mwiti.muthiru@gmail.com", [], false);
    } finally {
      setUIEnabled(true);
      aiResponsePending = false;
    }
  }

  /* ── Voice Input (Web Speech API STT) ─────────────────────── */
  function initVoice() {
    const voiceBtn = document.getElementById('voice-button');
    if (!voiceBtn) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      voiceBtn.style.display = 'none';
      return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous     = false;
    recognition.interimResults = true;
    recognition.lang           = 'en-US';

    recognition.onresult = (event) => {
      const isFinal    = event.results[event.results.length - 1].isFinal;
      const transcript = event.results[event.results.length - 1][0].transcript;
      const chatInput  = document.getElementById('chat-input');
      if (chatInput) {
        chatInput.value = transcript;
        chatInput.dispatchEvent(new Event('input'));
      }
      if (isFinal) {
        stopListening();
        if (transcript.trim()) {
          // Stop any TTS before sending
          stopSpeaking();
          window.generateAndProcessResponse(transcript.trim());
        }
      }
    };

    recognition.onerror = () => stopListening();
    recognition.onend   = () => { if (isListening) stopListening(); };

    voiceBtn.addEventListener('click', () => {
      if (isListening) { stopListening(); }
      else             { stopSpeaking(); startListening(); }
    });

    injectVoiceModeToggle();
  }

  function startListening() {
    if (!recognition || isListening) return;
    isListening = true;
    try { recognition.start(); } catch (_) {}
    const voiceBtn = document.getElementById('voice-button');
    if (voiceBtn) { voiceBtn.classList.add('listening'); voiceBtn.title = 'Listening… click to stop'; }
    const footer = document.getElementById('chat-footer-text');
    if (footer) footer.innerHTML = '<i class="fa-solid fa-microphone" style="color:var(--primary-color)"></i> Listening…';
  }

  function stopListening() {
    if (!recognition) return;
    isListening = false;
    try { recognition.stop(); } catch (_) {}
    const voiceBtn = document.getElementById('voice-button');
    if (voiceBtn) { voiceBtn.classList.remove('listening'); voiceBtn.title = 'Voice input'; }
    const footer = document.getElementById('chat-footer-text');
    if (footer) footer.innerHTML = '<i class="fa-regular fa-comment-dots"></i> Ask me anything — or tap the mic to speak';
  }

  // ── AI enrichment: fires AFTER the static prefilled template runs ──
  // Static templates are always first — they're fast, streamed, and have real metrics.
  // These short AI additions layer on personality, context, or a human note.
  // Keep them SHORT: 1–2 sentences that add something the static didn't say.
  const ENRICHMENT_PROMPTS = {
    recruiter: "In one warm sentence: beyond the metrics, what kind of problem or team is David most energised to work on right now?",
    about:     "In one genuine sentence: share something human about David — a hobby, personality quirk, or interest — that doesn't fit in a résumé.",
    skills:    "In one sentence: which part of David's production stack has been most battle-tested, and what does that tell you about him as an engineer?",
  };

  /* ── Call AI without showing a user bubble (for button-triggered flows) */
  async function respondAsAI(prompt, showActions = true, flowId = '') {
    const typingEl = showTyping();
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, history: [], visitorType, maxTokens: 180, flowId })
      });
      hideTyping(typingEl);
      if (!res.ok) return;
      const data    = await res.json();
      const reply   = data.reply   || '';
      const sources = data.sources || [];
      if (reply) {
        appendAIMessage(reply, sources, showActions);
        if (voiceModeOn) speak(reply);
      }
    } catch (_) {
      hideTyping(typingEl);
    }
  }

  /* ── Patch the template's chat engine ─────────────────────── */
  function patchChatEngine() {
    if (typeof window.generateAndProcessResponse !== 'function') {
      setTimeout(patchChatEngine, 100);
      return;
    }

    const originalFn   = window.generateAndProcessResponse;
    const originalFlow = window.startConversationFlow;

    window.startConversationFlow = async function (flowId) {
      trackVisitorType(flowId);
      if (flowId === 'error' || !flowId) return;

      // Static template always runs first — immediate typewriter streaming, real metrics.
      await originalFlow.call(this, flowId);

      // AI enrichment follows for flows where a short personal addition adds value.
      const enrichPrompt = ENRICHMENT_PROMPTS[flowId];
      if (enrichPrompt) {
        await new Promise(r => setTimeout(r, 700));
        await respondAsAI(enrichPrompt, false, flowId);
      }
    };

    window.generateAndProcessResponse = async function (command, displayText) {
      // Strip leading/trailing slashes so /cv, cv/, /contact etc. all route correctly
      const text    = (command || '').trim().replace(/^\/+|\/+$/g, '');
      const display = (displayText || command || '').trim().replace(/^\/+|\/+$/g, '');

      const KNOWN_FLOWS = [
        'about','skills','projects','anchor_intro','contact','cv','experience',
        'recruiter','builder','explorer','hello','msg_success','open_contact_form',
      ];

      const isKnown =
        KNOWN_FLOWS.includes(text.toLowerCase()) ||
        text.startsWith('__') ||
        (typeof window.chatFlow !== 'undefined' && window.chatFlow[text]);

      if (isKnown) {
        trackVisitorType(text.toLowerCase());
        return originalFn.call(this, text, display);
      }

      // Free-text → go straight to AI, never touch app.js keyword matching
      await handleAIMessage(display || text);
    };
  }

  /* ── Helpers ───────────────────────────────────────────────── */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Init ──────────────────────────────────────────────────── */
  function init() {
    patchChatEngine();
    initVoice();
    // Pre-load voices (Chrome requires a call to getVoices() before they're populated)
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 250));
  } else {
    setTimeout(init, 250);
  }

})();
