/**
 * LiveKit voice transport for David's portfolio.
 * Keeps the existing text chat intact and upgrades the mic button to realtime
 * room audio when LiveKit credentials are configured on the backend.
 */
(function () {
  'use strict';

  const STATE = {
    room: null,
    connecting: false,
    connected: false,
    audioEls: [],
  };

  function footer(message, icon = 'fa-microphone') {
    const el = document.getElementById('chat-footer-text');
    if (el) el.innerHTML = `<i class="fa-solid ${icon}"></i> ${message}`;
  }

  function setButton(active) {
    const btn = document.getElementById('voice-button');
    if (!btn) return;
    btn.classList.toggle('listening', active);
    btn.title = active ? 'LiveKit voice connected - click to stop' : 'Talk live';
  }

  function attachAudio(track) {
    const audio = track.attach();
    audio.autoplay = true;
    audio.dataset.livekitVoice = 'true';
    document.body.appendChild(audio);
    STATE.audioEls.push(audio);
  }

  function cleanupAudio() {
    STATE.audioEls.forEach((audio) => {
      try {
        audio.pause();
        audio.remove();
      } catch (_) {}
    });
    STATE.audioEls = [];
  }

  async function disconnect() {
    if (STATE.room) {
      try {
        await STATE.room.localParticipant.setMicrophoneEnabled(false);
        STATE.room.disconnect();
      } catch (_) {}
    }
    cleanupAudio();
    STATE.room = null;
    STATE.connected = false;
    STATE.connecting = false;
    setButton(false);
    footer('Ask me anything - or tap the mic to speak', 'fa-comment-dots');
  }

  async function connect() {
    if (STATE.connecting) return;
    if (STATE.connected) {
      await disconnect();
      return;
    }

    const LK = window.LivekitClient;
    if (!LK || !LK.Room) {
      throw new Error('LiveKit browser SDK is unavailable');
    }

    STATE.connecting = true;
    setButton(true);
    footer('Connecting live voice...', 'fa-circle-notch');

    const tokenRes = await fetch('/api/livekit-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorType: sessionStorage.getItem('dm_visitor_type') || 'unknown',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      throw new Error(tokenData.error || 'LiveKit token request failed');
    }

    const room = new LK.Room({
      adaptiveStream: true,
      dynacast: true,
    });

    const RoomEvent = LK.RoomEvent;
    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === LK.Track.Kind.Audio) attachAudio(track);
    });
    room.on(RoomEvent.Disconnected, () => {
      cleanupAudio();
      STATE.connected = false;
      STATE.connecting = false;
      setButton(false);
      footer('Ask me anything - or tap the mic to speak', 'fa-comment-dots');
    });

    await room.connect(tokenData.url, tokenData.token);
    await room.localParticipant.setMicrophoneEnabled(true);

    STATE.room = room;
    STATE.connected = true;
    STATE.connecting = false;
    footer('Live voice connected - speak naturally', 'fa-microphone');
  }

  function install() {
    const btn = document.getElementById('voice-button');
    if (!btn) return;

    btn.title = 'Talk live';
    btn.addEventListener(
      'click',
      async (event) => {
        if (!window.LivekitClient || !window.LivekitClient.Room) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        try {
          await connect();
        } catch (error) {
          await disconnect();
          footer('Live voice is not configured yet - text chat still works', 'fa-triangle-exclamation');
          console.warn('LiveKit voice unavailable:', error);
        }
      },
      true
    );

    window.addEventListener('beforeunload', () => {
      if (STATE.room) STATE.room.disconnect();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(install, 400));
  } else {
    setTimeout(install, 400);
  }
})();
