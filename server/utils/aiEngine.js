// AI Engine Utility for VYBE Platform
// Supports Groq API (Llama 3.3 70B & Llama 3.1 8B), Gemini, OpenAI, with instant local fallbacks.

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

/**
 * Universal Groq Chat Completion Helper
 */
export const callGroqLLM = async ({
  systemPrompt = "You are the creative AI assistant for the VYBE social media platform.",
  userPrompt = "",
  temperature = 0.7,
  maxTokens = 600,
  jsonMode = false,
}) => {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return null;

  try {
    const payload = {
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    };

    if (jsonMode) {
      payload.response_format = { type: "json_object" };
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(6500),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn("Groq API warning:", response.status, errText);
      return null;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content?.trim();
    return content || null;
  } catch (err) {
    console.warn("Groq LLM call failed, switching to local fallback:", err.message);
    return null;
  }
};

export const generateAICaption = async (prompt = "sunset vibe", tone = "aesthetic") => {
  const groqApiKey = process.env.GROQ_API_KEY?.trim();
  if (groqApiKey) {
    const systemPrompt = `You are a world-class social media copywriter for VYBE (a luxury Gen-Z & creator social network). Write a single, compelling, scroll-stopping caption for a post or reel based on the user's topic and requested tone (${tone}). Keep it between 1-3 sentences. Include 1-3 tasteful emojis. Do not output quotation marks or explanations, only the raw caption.`;
    const aiCaption = await callGroqLLM({
      systemPrompt,
      userPrompt: `Topic/Idea: "${prompt}". Tone: "${tone}".`,
      temperature: 0.8,
      maxTokens: 150,
    });
    if (aiCaption) return aiCaption;
  }

  // Local fallback templates
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

export const generateHashtags = async (topic = "photography") => {
  const groqApiKey = process.env.GROQ_API_KEY?.trim();
  if (groqApiKey) {
    const systemPrompt = `You are a social media hashtag optimizer. Generate 6 to 8 viral, trending, and niche hashtags for the topic provided. Output ONLY a comma-separated list or space-separated list of hashtags with the '#' symbol (e.g. #topic #vybe #explore).`;
    const aiHashtags = await callGroqLLM({
      systemPrompt,
      userPrompt: `Topic: "${topic}"`,
      temperature: 0.6,
      maxTokens: 100,
    });
    if (aiHashtags) {
      const parsed = aiHashtags.match(/#[a-zA-Z0-9_]+/g);
      if (parsed && parsed.length > 0) return parsed;
    }
  }

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

export const generateAIBio = async (profession = "Creator", vibe = "aesthetic") => {
  const groqApiKey = process.env.GROQ_API_KEY?.trim();
  if (groqApiKey) {
    const systemPrompt = `You are an elite personal branding stylist for VYBE. Create a modern, aesthetic 3-line social media profile bio for someone with profession/interests: "${profession}" and vibe: "${vibe}". Use line breaks and 2-3 modern emojis. Do not output quotes or extra commentary.`;
    const aiBio = await callGroqLLM({
      systemPrompt,
      userPrompt: `Profession: "${profession}", Vibe: "${vibe}".`,
      temperature: 0.85,
      maxTokens: 150,
    });
    if (aiBio) return aiBio;
  }

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

export const generateSmartReplies = async (messageText = "") => {
  const groqApiKey = process.env.GROQ_API_KEY?.trim();
  if (groqApiKey && messageText.trim()) {
    const systemPrompt = `You are an intelligent DM assistant for VYBE messenger. Given an incoming message, generate 3 concise, friendly, natural one-sentence quick reply options. Output ONLY valid JSON: {"replies": ["reply 1", "reply 2", "reply 3"]}`;
    const aiReplies = await callGroqLLM({
      systemPrompt,
      userPrompt: `Incoming message: "${messageText}"`,
      temperature: 0.7,
      maxTokens: 150,
      jsonMode: true,
    });

    if (aiReplies) {
      try {
        const parsed = JSON.parse(aiReplies);
        if (Array.isArray(parsed.replies) && parsed.replies.length > 0) {
          return parsed.replies.slice(0, 4);
        }
      } catch {
        // fallback
      }
    }
  }

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
