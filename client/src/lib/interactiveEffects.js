/**
 * interactiveEffects.js - Global Micro-Interactions, Haptics & Audio Synthesizer for VYBE
 * Provides Instagram-tier sensory feedback, micro-haptics, pleasant audio chimes, and particle dynamics.
 */

// Web Audio API Synthesizer (Zero asset dependency, zero lag)
class MicroAudioSynthesizer {
  constructor() {
    this.ctx = null;
  }

  getAudioContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => null);
    }
    return this.ctx;
  }

  playPop() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const now = ctx.currentTime;
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // Audio playback fails silently if browser policy blocks
    }
  }

  playLikeBurst() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // 2-tone melodic harmonic pop
      [587.33, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + i * 0.04;

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, start);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, start + 0.1);

        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.1);
      });
    } catch {
      // Fallback
    }
  }

  playBubble() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const now = ctx.currentTime;
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.06);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch {
      // Fallback
    }
  }

  playNotificationChime() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Crystal chime chords (G5, B5, D6)
      [783.99, 987.77, 1174.66].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + i * 0.05;

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.35);
      });
    } catch {
      // Fallback
    }
  }

  playShimmer() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      [1046.50, 1318.51, 1567.98].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + i * 0.03;

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.08, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.2);
      });
    } catch {
      // Fallback
    }
  }
}

export const microAudio = new MicroAudioSynthesizer();

/**
 * Trigger micro-haptics across devices (Android, iOS web, haptic touchpads)
 */
export const triggerHaptic = (type = "light") => {
  if (typeof window === "undefined" || !window.navigator?.vibrate) return;
  try {
    switch (type) {
      case "light":
        window.navigator.vibrate(10);
        break;
      case "medium":
        window.navigator.vibrate(25);
        break;
      case "heavy":
        window.navigator.vibrate(40);
        break;
      case "like":
        window.navigator.vibrate([15, 30, 20]);
        break;
      case "notification":
        window.navigator.vibrate([20, 40, 25, 40]);
        break;
      case "success":
        window.navigator.vibrate([15, 50, 20]);
        break;
      default:
        window.navigator.vibrate(15);
    }
  } catch {
    // Vibration blocked or unsupported
  }
};
