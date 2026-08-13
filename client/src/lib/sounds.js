// src/lib/sounds.js - Premium Web Audio API Sound Synthesizer for VYBE

let audioCtx = null;

const getAudioContext = () => {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
};

// Play dynamic tone sequence
const playTones = (sequence) => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    sequence.forEach(({ freq, duration, type = "sine", gain = 0.15, delay = 0 }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + delay);

      gainNode.gain.setValueAtTime(0.01, now + delay);
      gainNode.gain.exponentialRampToValueAtTime(gain, now + delay + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + duration);
    });
  } catch (e) {
    console.warn("[sounds] failed to play synth sound:", e);
  }
};

// Outgoing call Ringback beep (repeating "beep-beep")
let outgoingInterval = null;
export const startOutgoingSound = () => {
  if (outgoingInterval) return;
  
  const playOutgoingBeep = () => {
    playTones([
      { freq: 440, duration: 0.8, gain: 0.1, delay: 0 },
      { freq: 440, duration: 0.8, gain: 0.1, delay: 0.1 },
    ]);
  };
  playOutgoingBeep();
  outgoingInterval = setInterval(playOutgoingBeep, 3000);
};

export const stopOutgoingSound = () => {
  if (outgoingInterval) {
    clearInterval(outgoingInterval);
    outgoingInterval = null;
  }
};

// Incoming call ringtone (custom musical ring)
let incomingInterval = null;
export const startIncomingRingtone = () => {
  if (incomingInterval) return;

  const playIncomingMelody = () => {
    playTones([
      { freq: 523.25, duration: 0.15, delay: 0 }, // C5
      { freq: 587.33, duration: 0.15, delay: 0.15 }, // D5
      { freq: 659.25, duration: 0.15, delay: 0.3 }, // E5
      { freq: 783.99, duration: 0.3, delay: 0.45 }, // G5
      { freq: 659.25, duration: 0.15, delay: 0.8 }, // E5
      { freq: 783.99, duration: 0.4, delay: 0.95 }, // G5
    ]);
  };
  playIncomingMelody();
  incomingInterval = setInterval(playIncomingMelody, 2000);
};

export const stopIncomingRingtone = () => {
  if (incomingInterval) {
    clearInterval(incomingInterval);
    incomingInterval = null;
  }
};

// User joined room sound (ascending)
export const playJoinSound = () => {
  playTones([
    { freq: 440, duration: 0.1, delay: 0 },
    { freq: 554.37, duration: 0.1, delay: 0.08 },
    { freq: 659.25, duration: 0.2, delay: 0.16 },
  ]);
};

// User left room sound (descending)
export const playLeaveSound = () => {
  playTones([
    { freq: 659.25, duration: 0.1, delay: 0 },
    { freq: 554.37, duration: 0.1, delay: 0.08 },
    { freq: 440, duration: 0.2, delay: 0.16 },
  ]);
};

// Hand raise sound (alert chime)
export const playHandRaiseSound = () => {
  playTones([
    { freq: 880, duration: 0.12, gain: 0.15, delay: 0 },
    { freq: 1046.50, duration: 0.25, gain: 0.15, delay: 0.08 },
  ]);
};

// Message pop sound
export const playMessageSound = () => {
  playTones([
    { freq: 600, duration: 0.08, type: "sine", gain: 0.08, delay: 0 },
    { freq: 900, duration: 0.12, type: "sine", gain: 0.05, delay: 0.03 },
  ]);
};
