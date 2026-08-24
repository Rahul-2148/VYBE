// src/lib/sounds.js - World-Class Web Audio API Sound Synthesizer for VYBE
// Features realistic telephone ringback, dedicated voice & video call ringtones,
// call connect/decline/end chimes, message sounds, mobile vibration, and system alerts.

import { getSoundEffectsEnabled } from "./interactiveEffects";

let audioCtx = null;
let masterCompressor = null;
let isUnlocked = false;

/**
 * Universal Mobile & Desktop AudioContext Unlocker
 * Automatically hooks into the first touch/click anywhere on the viewport
 */
export const unlockAudioContext = () => {
  if (isUnlocked && audioCtx && audioCtx.state === "running") return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === "suspended") {
      audioCtx.resume().then(() => {
        isUnlocked = true;
      }).catch(() => {});
    } else if (audioCtx.state === "running") {
      isUnlocked = true;
    }
  } catch (e) {
    console.warn("[sounds] unlockAudioContext error:", e);
  }
};

// Global Event Listeners for Instant Audio Unlock on User Interaction
if (typeof window !== "undefined") {
  const unlockEvents = ["touchstart", "touchend", "click", "keydown", "pointerdown"];
  const triggerUnlock = () => {
    unlockAudioContext();
  };
  unlockEvents.forEach((evt) => {
    window.addEventListener(evt, triggerUnlock, { passive: true });
  });
}

const getAudioContext = () => {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return { ctx: null, destination: null };
    audioCtx = new AudioContextClass();
  }

  if (!masterCompressor && audioCtx) {
    try {
      masterCompressor = audioCtx.createDynamicsCompressor();
      masterCompressor.threshold.setValueAtTime(-18, audioCtx.currentTime);
      masterCompressor.knee.setValueAtTime(12, audioCtx.currentTime);
      masterCompressor.ratio.setValueAtTime(8, audioCtx.currentTime);
      masterCompressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
      masterCompressor.release.setValueAtTime(0.25, audioCtx.currentTime);
      masterCompressor.connect(audioCtx.destination);
    } catch {}
  }

  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }

  return { ctx: audioCtx, destination: masterCompressor || audioCtx?.destination };
};

/**
 * Play a rich synthesizer note with ADSR envelope and optional harmonics
 */
const playRichTone = ({
  freq,
  duration = 0.2,
  type = "sine",
  gain = 0.2,
  delay = 0,
  harmonics = [],
  frequencyRamp = null,
}) => {
  if (!getSoundEffectsEnabled()) return;
  try {
    const { ctx, destination } = getAudioContext();
    if (!ctx || !destination) return;

    const startTime = ctx.currentTime + delay;

    // Primary Oscillator
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    if (frequencyRamp) {
      osc.frequency.exponentialRampToValueAtTime(frequencyRamp, startTime + duration);
    }

    // ADSR Envelope
    const attack = Math.min(0.03, duration * 0.2);
    const decay = Math.min(0.1, duration * 0.3);
    const sustainGain = gain * 0.7;

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.linearRampToValueAtTime(gain, startTime + attack);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustainGain), startTime + attack + decay);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, startTime + duration);

    osc.connect(gainNode);
    gainNode.connect(destination);

    osc.start(startTime);
    osc.stop(startTime + duration);

    // Harmonics
    harmonics.forEach(({ ratio, gainRatio = 0.3, type: hType = "sine" }) => {
      const hOsc = ctx.createOscillator();
      const hGain = ctx.createGain();

      hOsc.type = hType;
      hOsc.frequency.setValueAtTime(freq * ratio, startTime);
      if (frequencyRamp) {
        hOsc.frequency.exponentialRampToValueAtTime(frequencyRamp * ratio, startTime + duration);
      }

      hGain.gain.setValueAtTime(0.0001, startTime);
      hGain.gain.linearRampToValueAtTime(gain * gainRatio, startTime + attack);
      hGain.gain.exponentialRampToValueAtTime(0.00001, startTime + duration);

      hOsc.connect(hGain);
      hGain.connect(destination);

      hOsc.start(startTime);
      hOsc.stop(startTime + duration);
    });
  } catch (e) {
    console.warn("[sounds] tone generation exception:", e?.message);
  }
};

/**
 * Play a sequence of tones
 */
const playSequence = (notes) => {
  notes.forEach((note) => playRichTone(note));
};

// ============================================================================
// 1. OUTGOING CALL RINGBACK TONE (Authentic Realistic Telephone Double-Ring "Trrr-Trrr")
// ============================================================================
let outgoingInterval = null;

export const startOutgoingSound = () => {
  if (outgoingInterval) return;
  unlockAudioContext();

  const playRealisticRingback = () => {
    try {
      const { ctx, destination } = getAudioContext();
      if (!ctx || !destination) return;
      const now = ctx.currentTime;

      // Realistic double-ring pulse (Trrr-Trrr ..... Trrr-Trrr)
      [0.0, 0.6].forEach((offset) => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        // Dual frequencies (400Hz + 450Hz telecom standard)
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(400, now + offset);
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(450, now + offset);

        const startTime = now + offset;
        const duration = 0.4;

        gainNode.gain.setValueAtTime(0.0001, startTime);
        gainNode.gain.linearRampToValueAtTime(0.12, startTime + 0.03);
        gainNode.gain.setValueAtTime(0.12, startTime + 0.35);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, startTime + duration);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(destination);

        osc1.start(startTime);
        osc2.start(startTime);
        osc1.stop(startTime + duration);
        osc2.stop(startTime + duration);
      });
    } catch (e) {
      console.warn("[sounds] outgoing ringback error:", e?.message);
    }
  };

  playRealisticRingback();
  outgoingInterval = setInterval(playRealisticRingback, 3200); // 1.0s double-ring + 2.2s silence
};

export const stopOutgoingSound = () => {
  if (outgoingInterval) {
    clearInterval(outgoingInterval);
    outgoingInterval = null;
  }
};

// ============================================================================
// 2. INCOMING CALL RINGTONES & MOBILE VIBRATION
// ============================================================================
let incomingInterval = null;
let vibrationInterval = null;

const triggerMobileVibration = () => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate([400, 200, 400, 200, 400, 1000]);
    } catch {}
  }
};

/**
 * Dedicated incoming ringtone:
 * - 'voice': Catchy Marimba smartphone phone ringtone (iPhone / Pixel style)
 * - 'video': Modern Crystal Arpeggio chime ringtone
 */
export const startIncomingRingtone = (type = "video") => {
  if (incomingInterval) {
    clearInterval(incomingInterval);
    incomingInterval = null;
  }
  if (vibrationInterval) {
    clearInterval(vibrationInterval);
    vibrationInterval = null;
  }

  unlockAudioContext();

  const isVoice = type === "voice" || type === "audio";

  const playMelody = () => {
    triggerMobileVibration();

    if (isVoice) {
      // Voice Call: Catchy Marimba phone ringtone (iPhone / Pixel style rhythmic motif)
      playSequence([
        { freq: 659.25, duration: 0.12, delay: 0.0, gain: 0.28, type: "sine", harmonics: [{ ratio: 2, gainRatio: 0.35 }, { ratio: 3, gainRatio: 0.15 }] }, // E5
        { freq: 783.99, duration: 0.12, delay: 0.14, gain: 0.28, type: "sine", harmonics: [{ ratio: 2, gainRatio: 0.35 }] }, // G5
        { freq: 880.00, duration: 0.12, delay: 0.28, gain: 0.28, type: "sine", harmonics: [{ ratio: 2, gainRatio: 0.35 }] }, // A5
        { freq: 659.25, duration: 0.12, delay: 0.42, gain: 0.28, type: "sine", harmonics: [{ ratio: 2, gainRatio: 0.35 }] }, // E5
        { freq: 783.99, duration: 0.14, delay: 0.56, gain: 0.3, type: "sine", harmonics: [{ ratio: 2, gainRatio: 0.35 }] }, // G5
        { freq: 987.77, duration: 0.22, delay: 0.72, gain: 0.32, type: "sine", harmonics: [{ ratio: 2, gainRatio: 0.4 }] }, // B5
        { freq: 880.00, duration: 0.35, delay: 0.96, gain: 0.3, type: "sine", harmonics: [{ ratio: 2, gainRatio: 0.35 }] }, // A5

        // Response phrase
        { freq: 659.25, duration: 0.12, delay: 1.35, gain: 0.28, type: "sine", harmonics: [{ ratio: 2, gainRatio: 0.35 }] }, // E5
        { freq: 783.99, duration: 0.12, delay: 1.49, gain: 0.28, type: "sine", harmonics: [{ ratio: 2, gainRatio: 0.35 }] }, // G5
        { freq: 880.00, duration: 0.12, delay: 1.63, gain: 0.28, type: "sine", harmonics: [{ ratio: 2, gainRatio: 0.35 }] }, // A5
        { freq: 1174.66, duration: 0.2, delay: 1.77, gain: 0.32, type: "sine", harmonics: [{ ratio: 2, gainRatio: 0.35 }] }, // D6
        { freq: 1046.50, duration: 0.45, delay: 1.99, gain: 0.35, type: "sine", harmonics: [{ ratio: 2, gainRatio: 0.4 }] }, // C6
      ]);
    } else {
      // Video Call: Modern Crystal Arpeggio Ringtone
      playSequence([
        { freq: 739.99, duration: 0.1, delay: 0.0, gain: 0.26, type: "triangle", harmonics: [{ ratio: 2, gainRatio: 0.4 }] }, // F#5
        { freq: 932.33, duration: 0.1, delay: 0.12, gain: 0.26, type: "triangle", harmonics: [{ ratio: 2, gainRatio: 0.4 }] }, // A#5
        { freq: 1108.73, duration: 0.1, delay: 0.24, gain: 0.28, type: "triangle", harmonics: [{ ratio: 2, gainRatio: 0.4 }] }, // C#6
        { freq: 1479.98, duration: 0.24, delay: 0.36, gain: 0.32, type: "triangle", harmonics: [{ ratio: 2, gainRatio: 0.45 }] }, // F#6

        { freq: 830.61, duration: 0.1, delay: 0.65, gain: 0.26, type: "triangle", harmonics: [{ ratio: 2, gainRatio: 0.4 }] }, // G#5
        { freq: 1046.50, duration: 0.1, delay: 0.77, gain: 0.26, type: "triangle", harmonics: [{ ratio: 2, gainRatio: 0.4 }] }, // C6
        { freq: 1244.51, duration: 0.1, delay: 0.89, gain: 0.28, type: "triangle", harmonics: [{ ratio: 2, gainRatio: 0.4 }] }, // D#6
        { freq: 1661.22, duration: 0.24, delay: 1.01, gain: 0.32, type: "triangle", harmonics: [{ ratio: 2, gainRatio: 0.45 }] }, // G#6

        { freq: 1479.98, duration: 0.12, delay: 1.35, gain: 0.28, type: "triangle", harmonics: [{ ratio: 2, gainRatio: 0.4 }] }, // F#6
        { freq: 1108.73, duration: 0.12, delay: 1.49, gain: 0.28, type: "triangle", harmonics: [{ ratio: 2, gainRatio: 0.4 }] }, // C#6
        { freq: 932.33, duration: 0.12, delay: 1.63, gain: 0.26, type: "triangle", harmonics: [{ ratio: 2, gainRatio: 0.4 }] }, // A#5
        { freq: 739.99, duration: 0.45, delay: 1.77, gain: 0.3, type: "sine", harmonics: [{ ratio: 2, gainRatio: 0.35 }] }, // F#5
      ]);
    }
  };

  playMelody();
  incomingInterval = setInterval(playMelody, 2800);
  vibrationInterval = setInterval(triggerMobileVibration, 2600);
};

export const stopIncomingRingtone = () => {
  if (incomingInterval) {
    clearInterval(incomingInterval);
    incomingInterval = null;
  }
  if (vibrationInterval) {
    clearInterval(vibrationInterval);
    vibrationInterval = null;
  }
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate(0);
    } catch {}
  }
};

// ============================================================================
// 3. CALL LIFECYCLE EVENT SOUNDS
// ============================================================================

/**
 * Call Accepted / Connected chime (Upward resolving cheerful triad)
 */
export const playCallConnectedSound = () => {
  unlockAudioContext();
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try { navigator.vibrate([100, 50, 100]); } catch {}
  }
  playSequence([
    { freq: 523.25, duration: 0.12, delay: 0.0, gain: 0.2, type: "sine" },   // C5
    { freq: 659.25, duration: 0.12, delay: 0.09, gain: 0.22, type: "sine" },  // E5
    { freq: 783.99, duration: 0.15, delay: 0.18, gain: 0.24, type: "sine" },  // G5
    { freq: 1046.50, duration: 0.4, delay: 0.28, gain: 0.28, type: "triangle", harmonics: [{ ratio: 2, gainRatio: 0.3 }] }, // C6
  ]);
};

/**
 * Call Declined / Cancelled / Rejected Sound (Soft muted double low buzz)
 */
export const playCallDeclinedSound = () => {
  unlockAudioContext();
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try { navigator.vibrate([150, 100, 150]); } catch {}
  }
  playSequence([
    { freq: 440, duration: 0.15, delay: 0.0, gain: 0.18, type: "sawtooth" },
    { freq: 330, duration: 0.25, delay: 0.16, gain: 0.18, type: "sawtooth" },
  ]);
};

/**
 * Busy Line Tone (3 quick repeating pulses: 480Hz + 620Hz)
 */
export const playBusyTone = () => {
  unlockAudioContext();
  [0, 0.3, 0.6].forEach((d) => {
    playRichTone({ freq: 480, duration: 0.18, delay: d, gain: 0.16, type: "sine" });
    playRichTone({ freq: 620, duration: 0.18, delay: d, gain: 0.14, type: "sine" });
  });
};

/**
 * Call Ended / Hang-up Sound (Warm descending soft chime)
 */
export const playCallEndedSound = () => {
  unlockAudioContext();
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try { navigator.vibrate(80); } catch {}
  }
  playSequence([
    { freq: 783.99, duration: 0.12, delay: 0.0, gain: 0.18, type: "sine" },  // G5
    { freq: 659.25, duration: 0.12, delay: 0.1, gain: 0.16, type: "sine" },  // E5
    { freq: 523.25, duration: 0.35, delay: 0.2, gain: 0.15, type: "sine" },  // C5
  ]);
};

/**
 * User Joined WebRTC Room Sound
 */
export const playJoinSound = () => {
  unlockAudioContext();
  playSequence([
    { freq: 587.33, duration: 0.1, delay: 0.0, gain: 0.16, type: "sine" },  // D5
    { freq: 880.00, duration: 0.25, delay: 0.09, gain: 0.2, type: "sine", harmonics: [{ ratio: 2, gainRatio: 0.25 }] }, // A5
  ]);
};

/**
 * User Left WebRTC Room Sound
 */
export const playLeaveSound = () => {
  unlockAudioContext();
  playSequence([
    { freq: 880.00, duration: 0.1, delay: 0.0, gain: 0.16, type: "sine" },  // A5
    { freq: 587.33, duration: 0.25, delay: 0.09, gain: 0.16, type: "sine" }, // D5
  ]);
};

/**
 * Hand Raised Sound (Alert Chime)
 */
export const playHandRaiseSound = () => {
  unlockAudioContext();
  playSequence([
    { freq: 880.00, duration: 0.1, delay: 0.0, gain: 0.2, type: "triangle" },
    { freq: 1174.66, duration: 0.3, delay: 0.08, gain: 0.24, type: "triangle", harmonics: [{ ratio: 2, gainRatio: 0.35 }] },
  ]);
};

/**
 * In-Call Reaction / Floating Emoji Sparkle Sound
 */
export const playReactionSound = () => {
  unlockAudioContext();
  playRichTone({
    freq: 1200,
    frequencyRamp: 1800,
    duration: 0.12,
    gain: 0.12,
    type: "sine",
  });
};

// ============================================================================
// 4. MESSAGING & NOTIFICATION SOUND EFFECTS
// ============================================================================

/**
 * Incoming Message Pop (Crisp acoustic water droplet bubble)
 */
export const playMessageReceivedSound = () => {
  unlockAudioContext();
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try { navigator.vibrate(40); } catch {}
  }
  playRichTone({
    freq: 650,
    frequencyRamp: 1350,
    duration: 0.09,
    gain: 0.2,
    type: "sine",
    harmonics: [{ ratio: 2, gainRatio: 0.25 }],
  });
};

/**
 * Legacy alias for playMessageReceivedSound
 */
export const playMessageSound = playMessageReceivedSound;

/**
 * Outgoing Message Sent (Subtle pleasant swoosh pop)
 */
export const playMessageSentSound = () => {
  unlockAudioContext();
  playRichTone({
    freq: 520,
    frequencyRamp: 880,
    duration: 0.06,
    gain: 0.12,
    type: "sine",
  });
};

/**
 * System Notification Alert (Crisp dual bell chime)
 */
export const playNotificationSound = () => {
  unlockAudioContext();
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try { navigator.vibrate([60, 40, 60]); } catch {}
  }
  playSequence([
    { freq: 880.00, duration: 0.12, delay: 0.0, gain: 0.2, type: "sine" },
    { freq: 1318.51, duration: 0.28, delay: 0.1, gain: 0.22, type: "sine", harmonics: [{ ratio: 2, gainRatio: 0.3 }] },
  ]);
};
