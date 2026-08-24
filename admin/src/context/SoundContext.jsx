import React, { createContext, useContext, useState, useRef } from "react";

const SoundContext = createContext(null);

export const SOUND_PRESETS = [
  // ── Signature Chimes ──
  {
    id: "vybe_pulse",
    name: "Vybe Signature Pulse ✨",
    description: "Warm harmonic chord with crystal overtone sparkle",
    category: "signature",
    badge: "Official",
  },
  {
    id: "neon_flare",
    name: "Neon Flare ⚡",
    description: "Crisp modern double-tap acoustic chime",
    category: "signature",
    badge: "Popular",
  },
  {
    id: "aura_drop",
    name: "Aura Harmonic Bell 🔔",
    description: "Deep soothing resonance with gentle decay",
    category: "signature",
    badge: "Clean",
  },

  // ── Safety & Moderation ──
  {
    id: "incident_strike",
    name: "Incident Strike 🚨",
    description: "Sharp staccato alert for incoming violation reports",
    category: "safety",
    badge: "Moderation",
    voice: "Incident Reported",
  },
  {
    id: "safety_ping",
    name: "Trust & Safety Ping 🛡️",
    description: "Dual-tone security notification",
    category: "safety",
    badge: "Security",
  },
  {
    id: "red_siren",
    name: "Priority Red Alert ⚠️",
    description: "Urgent low-pulse siren for live stream escalations",
    category: "safety",
    badge: "Urgent",
  },

  // ── Creator & VIP Desk ──
  {
    id: "blue_badge",
    name: "Blue Badge Fanfare 👑",
    description: "Triumphant ascending melody for verification approvals",
    category: "creator",
    badge: "VIP Desk",
  },
  {
    id: "live_wave",
    name: "Live Stream Intercept 📡",
    description: "Bouncy synth chirp for live broadcast activity",
    category: "creator",
    badge: "Live Telemetry",
  },
  {
    id: "spotlight",
    name: "Spotlight Glass Chime 💎",
    description: "High-end luxury glass tap for creator alerts",
    category: "creator",
    badge: "Minimal",
  },

  // ── Viral & Memes ──
  {
    id: "its_done",
    name: "It's Done, Bro! 🕶️",
    description: "Viral punchy vocal drop + energetic chime",
    category: "viral",
    badge: "Viral Beat",
    voice: "It's done, bro!",
  },
  {
    id: "dramatic_sting",
    name: "Dramatic Dun-Dun-DUN! 🎭",
    description: "Classic 3-hit suspense cinematic meme sting",
    category: "viral",
    badge: "Meme",
  },
  {
    id: "arcade_jump",
    name: "8-Bit Arcade Jump 👾",
    description: "Playful retro video game power-up pop",
    category: "viral",
    badge: "Arcade",
    voice: "Level Up!",
  },
  {
    id: "bubble_pop",
    name: "Bubble Pop & Snap 🫧",
    description: "Super satisfying acoustic bubble pop sound",
    category: "viral",
    badge: "Satisfying",
  },
];

export const SoundProvider = ({ children }) => {
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem("vybe_sound_muted") === "true";
  });

  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("vybe_sound_volume");
    return saved ? parseFloat(saved) : 0.85;
  });

  const [selectedSound, setSelectedSound] = useState(() => {
    return localStorage.getItem("vybe_sound_preset") || "vybe_pulse";
  });

  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    return localStorage.getItem("vybe_voice_enabled") !== "false";
  });

  const audioCtxRef = useRef(null);

  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Web Speech API Voice Drop
  const playVoiceDrop = (text) => {
    if (isMuted || !voiceEnabled || !text || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = volume;
      utterance.rate = 1.05;
      utterance.pitch = 1.1;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Fallback
    }
  };

  // Studio-Quality Synthesizer
  const playSoundPreset = (presetName = selectedSound) => {
    if (isMuted) return;

    const presetObj = SOUND_PRESETS.find((p) => p.id === presetName) || SOUND_PRESETS[0];

    // Trigger voice line if enabled
    if (presetObj.voice && voiceEnabled) {
      playVoiceDrop(presetObj.voice);
    }

    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(volume * 0.7, now);
      masterGain.connect(ctx.destination);

      // Lowpass Filter for warmer acoustic texture
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(8000, now);
      filter.connect(masterGain);

      if (presetName === "vybe_pulse") {
        // Vybe Signature Pulse: Layered C Major Sparkle
        const freqs = [523.25, 659.25, 783.99, 1046.5, 1318.51];
        freqs.forEach((f, i) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(f, now + i * 0.04);
          g.gain.setValueAtTime(0.01, now + i * 0.04);
          g.gain.exponentialRampToValueAtTime(0.5 / (i + 1), now + i * 0.04 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.45);
          osc.connect(g);
          g.connect(filter);
          osc.start(now + i * 0.04);
          osc.stop(now + i * 0.04 + 0.5);
        });
      } else if (presetName === "neon_flare") {
        // Neon Flare: High-energy dual snap
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const g1 = ctx.createGain();
        const g2 = ctx.createGain();

        osc1.type = "triangle";
        osc1.frequency.setValueAtTime(1174.66, now); // D6
        osc1.frequency.exponentialRampToValueAtTime(1760.0, now + 0.08); // A6
        g1.gain.setValueAtTime(0.8, now);
        g1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc2.type = "sine";
        osc2.frequency.setValueAtTime(2349.32, now + 0.08); // D7
        g2.gain.setValueAtTime(0.01, now + 0.08);
        g2.gain.exponentialRampToValueAtTime(0.6, now + 0.1);
        g2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc1.connect(g1);
        osc2.connect(g2);
        g1.connect(filter);
        g2.connect(filter);

        osc1.start(now);
        osc2.start(now + 0.08);
        osc1.stop(now + 0.35);
        osc2.stop(now + 0.45);
      } else if (presetName === "aura_drop") {
        // Aura Harmonic Bell: Resonant Warm Bell
        const osc = ctx.createOscillator();
        const overtone = ctx.createOscillator();
        const g = ctx.createGain();
        const og = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(659.25, now); // E5
        g.gain.setValueAtTime(0.01, now);
        g.gain.linearRampToValueAtTime(0.85, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

        overtone.type = "sine";
        overtone.frequency.setValueAtTime(1318.51, now); // E6
        og.gain.setValueAtTime(0.01, now);
        og.gain.linearRampToValueAtTime(0.3, now + 0.02);
        og.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(g);
        overtone.connect(og);
        g.connect(filter);
        og.connect(filter);

        osc.start(now);
        overtone.start(now);
        osc.stop(now + 0.75);
        overtone.stop(now + 0.55);
      } else if (presetName === "incident_strike") {
        // Incident Strike: Sharp Staccato Alert
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1320, now + 0.08);
        g.gain.setValueAtTime(0.7, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(g);
        g.connect(filter);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (presetName === "safety_ping") {
        // Trust & Safety Ping: Dual-Frequency High Ping
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const g = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(987.77, now);
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(1479.98, now);
        g.gain.setValueAtTime(0.6, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc1.connect(g);
        osc2.connect(g);
        g.connect(filter);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.4);
        osc2.stop(now + 0.4);
      } else if (presetName === "red_siren") {
        // Priority Red Alert Siren
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(1100, now + 0.18);
        osc.frequency.linearRampToValueAtTime(600, now + 0.36);
        osc.frequency.linearRampToValueAtTime(1100, now + 0.54);
        g.gain.setValueAtTime(0.5, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
        osc.connect(g);
        g.connect(filter);
        osc.start(now);
        osc.stop(now + 0.7);
      } else if (presetName === "blue_badge") {
        // Blue Badge Fanfare: Triumphant 4-note ascending chord
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((f, i) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(f, now + i * 0.08);
          g.gain.setValueAtTime(0.01, now + i * 0.08);
          g.gain.linearRampToValueAtTime(0.6, now + i * 0.08 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);
          osc.connect(g);
          g.connect(filter);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.45);
        });
      } else if (presetName === "live_wave") {
        // Live Stream Wave
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.15);
        g.gain.setValueAtTime(0.7, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(g);
        g.connect(filter);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (presetName === "spotlight") {
        // Spotlight Glass Chime
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(2637.02, now); // E7
        g.gain.setValueAtTime(0.8, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(g);
        g.connect(filter);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (presetName === "its_done") {
        // It's Done, Bro! punchy synth snap
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const g = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(987.77, now);
        osc1.frequency.setValueAtTime(1479.98, now + 0.08);
        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(1975.53, now + 0.08);
        g.gain.setValueAtTime(0.8, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc1.connect(g);
        osc2.connect(g);
        g.connect(filter);
        osc1.start(now);
        osc2.start(now + 0.08);
        osc1.stop(now + 0.5);
        osc2.stop(now + 0.5);
      } else if (presetName === "dramatic_sting") {
        // Dramatic Dun-Dun-DUN! 3-hit meme chords
        const hits = [
          { chord: [220, 261.63], time: 0.0, dur: 0.18 },
          { chord: [196, 233.08], time: 0.22, dur: 0.18 },
          { chord: [293.66, 349.23, 440, 587.33], time: 0.5, dur: 0.5 },
        ];
        hits.forEach(({ chord, time, dur }) => {
          chord.forEach((f) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(f, now + time);
            g.gain.setValueAtTime(0.01, now + time);
            g.gain.exponentialRampToValueAtTime(0.25, now + time + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, now + time + dur);
            osc.connect(g);
            g.connect(filter);
            osc.start(now + time);
            osc.stop(now + time + dur + 0.05);
          });
        });
      } else if (presetName === "arcade_jump") {
        // 8-Bit Retro Jump Pop
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15);
        g.gain.setValueAtTime(0.25, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(g);
        g.connect(filter);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (presetName === "bubble_pop") {
        // Satisfying Bubble Pop
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);
        g.gain.setValueAtTime(0.9, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(g);
        g.connect(filter);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch (err) {
      console.warn("Audio engine error:", err);
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      localStorage.setItem("vybe_sound_muted", String(next));
      if (!next) {
        setTimeout(() => playSoundPreset(selectedSound), 50);
      }
      return next;
    });
  };

  const setSoundVolume = (val) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolume(clamped);
    localStorage.setItem("vybe_sound_volume", String(clamped));
  };

  const setSoundPreset = (presetId) => {
    setSelectedSound(presetId);
    localStorage.setItem("vybe_sound_preset", presetId);
    playSoundPreset(presetId);
  };

  const toggleVoice = () => {
    setVoiceEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("vybe_voice_enabled", String(next));
      return next;
    });
  };

  return (
    <SoundContext.Provider
      value={{
        isMuted,
        volume,
        selectedSound,
        voiceEnabled,
        toggleMute,
        toggleVoice,
        setSoundVolume,
        setSoundPreset,
        playSound: playSoundPreset,
        SOUND_PRESETS,
      }}
    >
      {children}
    </SoundContext.Provider>
  );
};

export const useSound = () => {
  const context = useContext(SoundContext);
  if (!context) {
    return {
      isMuted: false,
      volume: 0.8,
      selectedSound: "vybe_pulse",
      voiceEnabled: true,
      toggleMute: () => {},
      toggleVoice: () => {},
      setSoundVolume: () => {},
      setSoundPreset: () => {},
      playSound: () => {},
      SOUND_PRESETS: SOUND_PRESETS || [],
    };
  }
  return context;
};

export default SoundContext;
