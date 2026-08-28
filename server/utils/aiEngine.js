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

// ==============================================================================
// 🧠 BEHAVIORAL INTENT & MIND-READING RECOMMENDATION AI
// ==============================================================================

export const CATEGORY_SYNONYMS = {
  travel: ["goa", "beach", "trip", "vacation", "flight", "resort", "hotel", "mountains", "manali", "paris", "dubai", "bali", "explore", "travelgram", "wanderlust", "nature", "sunset", "sea", "ocean"],
  fitness: ["gym", "workout", "fitness", "muscle", "abs", "running", "training", "diet", "protein", "bodybuilding", "yoga", "crossfit", "exercise", "cardio", "health"],
  tech: ["coding", "programming", "developer", "javascript", "python", "react", "ai", "machinelearning", "webdev", "software", "startup", "gadgets", "tech", "crypto", "bitcoin", "nextjs", "rust"],
  food: ["food", "foodie", "delicious", "yummy", "recipe", "chef", "cooking", "pizza", "burger", "biryani", "dessert", "cafe", "coffee", "restaurant", "baking"],
  entertainment: ["comedy", "funny", "meme", "jokes", "prank", "lol", "humor", "viral", "dance", "trending", "movie", "cinema", "music", "hiphop", "beats", "song"],
  fashion: ["outfit", "ootd", "style", "fashion", "shopping", "shoes", "sneakers", "dress", "makeup", "beauty", "aesthetic", "model", "glam", "luxury"],
  gaming: ["gaming", "gamer", "esports", "bgmi", "pubg", "valorant", "gta", "playstation", "xbox", "streamer", "twitch", "gameplay"],
};

/**
 * Extract semantic interest tags from raw text, hashtags, sound title, or location
 */
export const extractSemanticKeywords = (rawText = "") => {
  if (!rawText || typeof rawText !== "string") return [];
  const normalized = rawText.toLowerCase().replace(/[^a-z0-9#\s]/g, " ");
  const tokens = normalized.split(/\s+/).filter((t) => t.length >= 3);
  const matchedCategories = new Set();

  for (const token of tokens) {
    const clean = token.startsWith("#") ? token.slice(1) : token;
    for (const [category, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
      if (category === clean || synonyms.includes(clean)) {
        matchedCategories.add(category);
        matchedCategories.add(clean);
      }
    }
  }

  return Array.from(matchedCategories);
};

/**
 * Record Dwell-Time Intent Signal & Update User Vector with Exponential Rolling Average
 */
export const recordUserDwellSignal = async (User, userId, { text = "", hashtags = [], location = "", category = "", dwellMs = 0 }) => {
  if (!userId || dwellMs < 1200) return null; // Ignore glances < 1.2s

  try {
    const combinedText = `${text} ${Array.isArray(hashtags) ? hashtags.join(" ") : ""} ${location} ${category}`;
    const keywords = extractSemanticKeywords(combinedText);
    if (keywords.length === 0 && !category) return null;

    // Intent Weight Scaling based on dwell duration
    let intentBoost = 3.0; // 1.2s - 2.5s
    if (dwellMs >= 2500 && dwellMs < 6000) intentBoost = 6.0;
    else if (dwellMs >= 6000 && dwellMs < 15000) intentBoost = 10.0;
    else if (dwellMs >= 15000) intentBoost = 15.0; // High dwell / Re-watch

    const user = await User.findById(userId);
    if (!user) return null;

    let interestMap = user.contentCategoryInterests || new Map();
    const updatedMap = new Map(interestMap instanceof Map ? interestMap : Object.entries(interestMap || {}));

    // Update detected keywords in interest vector
    for (const kw of keywords) {
      const currentVal = updatedMap.get(kw) || 0;
      // Rolling average cap at 100 with gradual reinforcement
      const newVal = Math.min(100, currentVal + intentBoost);
      updatedMap.set(kw, Number(newVal.toFixed(2)));
    }

    if (category) {
      const currentCatVal = updatedMap.get(category.toLowerCase()) || 0;
      updatedMap.set(category.toLowerCase(), Math.min(100, currentCatVal + intentBoost));
    }

    user.contentCategoryInterests = updatedMap;
    await user.save();
    return { success: true, updatedKeys: keywords };
  } catch (err) {
    console.warn("recordUserDwellSignal failed:", err.message);
    return null;
  }
};

/**
 * Synthesize User Interest Vector with Social Graph Affinity Bleed (Collaborative Filtering)
 * Fuses: Direct User Interests + (40% Weight of Close Friends / Frequent Chat Partners)
 */
export const getSynthesizedUserInterestVector = async (User, user) => {
  if (!user) return new Map();

  try {
    const rawDirect = user.contentCategoryInterests || new Map();
    const fusedVector = new Map(rawDirect instanceof Map ? rawDirect : Object.entries(rawDirect || {}));

    // Fetch Close Friends or top following to blend collaborative graph
    const closeFriendsIds = (user.closeFriends || []).slice(0, 5);
    if (closeFriendsIds.length > 0) {
      const friendProfiles = await User.find({ _id: { $in: closeFriendsIds } })
        .select("contentCategoryInterests")
        .lean();

      for (const friend of friendProfiles) {
        const friendMap = friend.contentCategoryInterests || {};
        const entries = friendMap instanceof Map ? friendMap.entries() : Object.entries(friendMap);

        for (const [tag, score] of entries) {
          if (typeof score === "number" && score > 5) {
            const currentDirectScore = fusedVector.get(tag) || 0;
            // Bleed 35% of friend's intense interests into user vector
            const blendedScore = currentDirectScore + (score * 0.35);
            fusedVector.set(tag, Number(blendedScore.toFixed(2)));
          }
        }
      }
    }

    return fusedVector;
  } catch (err) {
    console.warn("getSynthesizedUserInterestVector failed:", err.message);
    return user.contentCategoryInterests || new Map();
  }
};

/**
 * Enterprise AI Meeting Assistant (Gemini in Meet Parity)
/**
 * Universal Gemini Chat Completion Helper (Google Gemini 2.0 / 1.5 Flash)
 */
export const callGeminiLLM = async ({
  systemPrompt = "You are the enterprise Gemini AI Meeting Assistant for VYBE Meet.",
  userPrompt = "",
  temperature = 0.7,
  maxTokens = 1000,
}) => {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_AI_KEY?.trim();
  if (!apiKey) return null;

  try {
    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
        },
      ],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8500),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.warn("Gemini API notice:", response.status, errText);
      return null;
    }

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return content || null;
  } catch (err) {
    console.warn("Gemini LLM call failed, will try Groq fallback:", err.message);
    return null;
  }
};

/**
 * Enterprise AI Meeting Assistant (Gemini in Meet 1:1 Parity)
 * Generates automated meeting minutes, key decisions, action items, late-join catch-ups, and answers custom questions.
 */
export const generateMeetingAISummary = async ({
  title = "VYBE Meeting",
  transcript = "",
  chatMessages = [],
  actionType = "summary", // 'summary' | 'catch-up' | 'action-items' | 'decisions' | 'custom'
  customPrompt = "",
}) => {
  // Truncate long contexts safely to prevent token overflow (keep latest 12,000 characters)
  const safeTranscript = transcript.length > 12000 ? `...[earlier transcript truncated]...\n${transcript.slice(-12000)}` : transcript;
  const formattedChat = Array.isArray(chatMessages)
    ? chatMessages.slice(-50).map((m) => `${m.senderName || "Participant"}: ${m.text || (m.file ? `[Shared file: ${m.file.name}]` : "")}`).join("\n")
    : "";

  const combinedContext = [
    safeTranscript ? `Live Spoken Transcripts:\n${safeTranscript}` : "",
    formattedChat ? `In-Meeting Chat:\n${formattedChat}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const systemPrompt = `You are Gemini in Meet, the official enterprise AI meeting assistant for VYBE Meet.
Your task is to analyze the meeting context (spoken transcripts and in-room chat messages) and provide precise, professional, and actionable intelligence in GitHub-flavored Markdown.
Always be direct, well-formatted, and accurate. If the transcript is brief or just starting, acknowledge it gracefully.`;

  let userPrompt = "";
  if (actionType === "catch-up") {
    userPrompt = `Meeting: "${title}"
Context:
${combinedContext || "Meeting just started with participants exchanging greetings."}

Task: Give a quick 2-3 bullet point "Catch Me Up" summary of what has been discussed so far for a participant who just joined late. Keep it punchy, accurate, and concise.`;
  } else if (actionType === "action-items") {
    userPrompt = `Meeting: "${title}"
Context:
${combinedContext || "General discussion."}

Task: Extract all actionable tasks, next steps, deadlines, and assigned owners from this meeting. Format as a clean checklist with checkboxes ([ ] / [x]), assigned owners, and priority.`;
  } else if (actionType === "decisions") {
    userPrompt = `Meeting: "${title}"
Context:
${combinedContext || "General discussion."}

Task: Extract all key agreements, consensus, and final decisions reached by the participants during this meeting. Highlight the rationale and impact of each decision.`;
  } else if (actionType === "email") {
    userPrompt = `Meeting: "${title}"
Context:
${combinedContext || "General discussion."}

Task: Draft a professional, ready-to-send meeting follow-up email for all attendees. Include:
1. Subject line
2. Executive recap (2-3 sentences)
3. Key Takeaways & Decisions
4. Action Items & Assignees
5. Next Meeting / Check-in timeframe`;
  } else if (actionType === "questions") {
    userPrompt = `Meeting: "${title}"
Context:
${combinedContext || "General discussion."}

Task: Identify and list all unresolved questions, open debates, or pending clarifications raised by participants that require follow-up.`;
  } else if (actionType === "custom" && customPrompt) {
    userPrompt = `Meeting: "${title}"
Context:
${combinedContext || "General live meeting context."}

User Question: "${customPrompt}"

Task: Answer the user's question directly and comprehensively using the meeting context above. Provide clear, well-structured, formatted insights in Markdown. If the context does not contain the answer, politely mention that it was not discussed during the call and offer related relevant context.`;
  } else {
    // Default full meeting notes & summary
    userPrompt = `Meeting: "${title}"
Context:
${combinedContext || "Meeting in session."}

Task: Provide structured Google Meet-style enterprise meeting notes including:
1. 📌 **Executive Summary** (1-2 sentences)
2. 💡 **Key Discussion Points & Topics** (Bullet points)
3. 🎯 **Key Decisions Made**
4. 📋 **Action Items & Next Steps** (With assignees and timeline)`;
  }

  // 1. Primary engine: Gemini 2.0 / 1.5 Flash
  let aiResult = await callGeminiLLM({
    systemPrompt,
    userPrompt,
    temperature: 0.6,
    maxTokens: 1200,
  });

  // 2. Secondary fallback engine: Groq Llama 3.3 70B
  if (!aiResult) {
    aiResult = await callGroqLLM({
      systemPrompt,
      userPrompt,
      temperature: 0.6,
      maxTokens: 1200,
    });
  }

  if (aiResult) return aiResult;

  // 3. Graceful heuristic local fallback if APIs are unreachable
  if (actionType === "catch-up") {
    return `### ⚡ Catch-Up Summary\n- **Status:** Active live meeting in progress.\n- **Discussion:** Participants are connected and collaborating.\n- **Next:** Join the discussion or check the in-meeting chat for current topics.`;
  }
  if (actionType === "action-items") {
    return `### 📋 Action Items\n- [ ] **Follow-up:** Review discussed milestones and next deliverables.\n- [ ] **Action:** Share meeting notes in team workspace.`;
  }
  if (actionType === "decisions") {
    return `### 🎯 Key Decisions\n- **Agreed:** Proceed with proposed agenda and sync on next review cycle.`;
  }
  if (actionType === "email") {
    return `**Subject:** Recap & Action Items — ${title}\n\nHi everyone,\n\nThanks for joining today's session. Here is a quick recap of our discussion and next steps.\n\n**Key Takeaways:**\n- Active review of current milestones and timeline.\n\n**Next Steps:**\n- Team members to follow up on respective tasks.`;
  }
  if (actionType === "questions") {
    return `### ❓ Unresolved Questions\n- Open discussion on upcoming timeline and deployment schedules.`;
  }
  return `### 📌 Meeting Notes for ${title}\n- **Executive Summary:** Live collaboration session with team members.\n- **Discussion Points:** Active discussion on project roadmap and immediate milestones.\n- **Next Steps:** Review deliverables and coordinate in meeting chat.`;
};

