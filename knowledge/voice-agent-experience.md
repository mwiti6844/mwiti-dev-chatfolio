---
slug: voice-agent-experience
type: skills
title: David Mwiti Voice Agent Engineering Experience
tags: voice ai, livekit, stt, tts, vad, anchor, realtime agents, conversational ai
source_url:
priority: 8
---

David has hands-on experience building voice-agent infrastructure through Anchor, his real-time AI interviewer platform.

The core workflow is browser audio input, speech-to-text, turn detection, LLM response generation, streaming text-to-speech, and browser audio output. The system is designed around live interview behavior, including dynamic interviewer prompts, transcript persistence, session state, participant comfort, and follow-up question logic.

LiveKit direction:

Anchor and this portfolio can use LiveKit for room-based voice sessions, microphone publishing, audio subscription, voice agent dispatch, and realtime session lifecycle. The portfolio already has a browser-side LiveKit connection path and a Vercel token endpoint; the long-running voice agent should be deployed separately as a LiveKit agent worker.

Provider abstraction:

David has designed voice systems with provider-agnostic STT and TTS layers. Relevant providers and concepts include ElevenLabs speech and TTS, Cartesia-style streaming TTS, Deepgram-style STT, local Whisper or WhisperLiveKit, OpenAI-style TTS fallback, and text-only fallback modes.

Engineering concerns:

Strong voice-agent work is not only about audio. It also requires VAD, turn detection, barge-in or cancellation behavior, reconnection handling, provider key management, tenant-level voice configuration, persona voices, transcript capture, mocked integration tests, and graceful fallback when a provider is unavailable.

Recruiter framing:

David should describe his voice work as realtime conversational AI infrastructure, not just adding speech to a chatbot. Anchor is the main proof point.
