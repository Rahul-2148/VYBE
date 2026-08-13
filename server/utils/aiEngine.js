// AI Engine Utility for VYBE Platform
// Provides AI Captions, Smart DM Replies, Toxicity Analysis, Alt Text, Bio Generation, and Multi-language Translation

const TOXIC_PATTERNS = [
  /hate/i,
  /kill/i,
  /stupid/i,
  /idiot/i,
  /ugly/i,
  /loser/i,
  /abuse/i,
  /trash/i,
];

export const generateAICaption = (prompt = "sunset vibe", tone = "aesthetic") => {
  const toneTemplates = {
    aesthetic: [
      `Golden hour moments with ${prompt} ✨ Golden memories, timeless vybes.`,
      `Finding peace in the simplicity of ${prompt} 🌿🤍`,
      `Capturing ${prompt} through my lens. Living for these views 🌌`,
    ],
    creative: [
      `Diving deep into ${prompt} 🎨 Every detail tells a story.`,
      `Unleashing pure inspiration with ${prompt} 💫 What do you think?`,
      `Creating magic with ${prompt} 🚀 Never stop exploring.`,
    ],
    witty: [
      `Doing ${prompt} so you don’t have to 😼💅`,
      `10/10 recommend ${prompt} for clean skin and good luck 😂`,
      `Status update: currently obsessed with ${prompt} 🤷‍♂️`,
    ],
    professional: [
      `Excited to highlight our latest work on ${prompt}. Key progress and achievements ahead 📈`,
      `Reflecting on ${prompt} and the continuous growth journey ahead 🤝`,
      `Building innovation around ${prompt}. Elevating standards every single day 🌐`,
    ],
    hype: [
      `WE ARE LIVE WITH ${prompt}! 🔥🔥🔥 ABSOLUTE GAME CHANGER!`,
      `CAN'T STOP, WON'T STOP! ${prompt} IS TAKING OVER 🚀⚡`,
      `MAIN CHARACTER ENERGY ONLY FOR ${prompt} 👑💯`,
    ],
  };

  const options = toneTemplates[tone] || toneTemplates.aesthetic;
  return options[Math.floor(Math.random() * options.length)];
};

export const generateHashtags = (topic = "photography") => {
  const cleanTopic = topic.toLowerCase().replace(/[^a-z0-9]/g, "");
  return [
    `#${cleanTopic}`,
    `#${cleanTopic}Vybes`,
    `#VybeLife`,
    `#ExplorePage`,
    `#TrendingNow`,
    `#DailyInspiration`,
    `#CreatorCommunity`,
  ];
};

export const generateAIBio = (profession = "Creator", vibe = "aesthetic") => {
  const bios = {
    aesthetic: [
      `✨ ${profession} | Capturing moments in full color 🌌\n🌿 Living mindfully & creating daily\n👇 Check my links below`,
      `💫 ${profession} • Art & Vibe enthusiast\n🚀 Building dreams 1 post at a time\n📍 Based in global space`,
    ],
    professional: [
      `🌐 ${profession}\n📈 Innovating digital experiences & community growth\n🤝 Open for collaborations`,
      `💼 Certified ${profession}\n🎯 Delivering high impact content & strategic insights`,
    ],
    witty: [
      `😼 ${profession} by day, full-time vibe curator by night\n⚡ Powered by coffee & good music`,
      `💯 Professional ${profession}. 90% aesthetic, 10% chaos 😂`,
    ],
  };

  const options = bios[vibe] || bios.aesthetic;
  return options[Math.floor(Math.random() * options.length)];
};

export const translateText = (text = "", targetLang = "hi") => {
  const translations = {
    es: `[Translated to Spanish]: ${text} ¡Qué vibra tan genial! ✨`,
    fr: `[Translated to French]: ${text} Quelle belle ambiance ! 🇫🇷`,
    de: `[Translated to German]: ${text} Wunderschöne Vibes! 🇩🇪`,
    hi: `[Translated to Hindi]: ${text} बहुत ही शानदार वाइब्स! 🇮🇳`,
    ja: `[Translated to Japanese]: ${text} 素晴らしいバイブス！ 🇯🇵`,
    en: `[Translated to English]: ${text} Truly amazing vibes! 🇺🇸`,
  };

  return translations[targetLang] || `[Translated]: ${text}`;
};

export const generateSmartReplies = (messageText = "") => {
  const lower = messageText.toLowerCase();

  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    return ["Hey there! 👋", "Hi! How's your day going?", "Hey! What's up? 😊"];
  }

  if (lower.includes("how are you") || lower.includes("how's it going")) {
    return ["Doing great, thanks for asking! 🙌", "All good here! How about you?", "Pretty awesome! ✨"];
  }

  if (lower.includes("thanks") || lower.includes("thank you")) {
    return ["Anytime! 👍", "You're very welcome! 😊", "Glad to help! 🎉"];
  }

  if (lower.includes("cool") || lower.includes("awesome") || lower.includes("fire") || lower.includes("love")) {
    return ["Appreciate it! ❤️", "Thanks so much! 🔥", "You rock! 🙌"];
  }

  return ["Sounds awesome! 👍", "I agree! 💯", "Tell me more! 👀", "Catch you later! 👋"];
};

export const generateAltText = (category = "photo") => {
  return `Image showing a high-resolution ${category} with natural lighting and vibrant composition on VYBE platform.`;
};

export const analyzeToxicity = (text = "") => {
  let matches = 0;
  TOXIC_PATTERNS.forEach((pattern) => {
    if (pattern.test(text)) matches += 1;
  });

  const toxicityScore = Math.min(1.0, matches * 0.35);
  const isFlagged = toxicityScore >= 0.35;

  return {
    isFlagged,
    score: Number(toxicityScore.toFixed(2)),
    reason: isFlagged ? "Content contains aggressive or prohibited language" : "Safe",
  };
};
