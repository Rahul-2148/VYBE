import {
  generateAICaption,
  generateHashtags,
  generateSmartReplies,
  generateAltText,
  analyzeToxicity,
  generateAIBio,
  translateText,
} from "../utils/aiEngine.js";
import { ModerationLog } from "../models/moderationLog.model.js";

// 1. Generate AI Caption & Hashtags
export const generateCaptionAndHashtags = async (req, res) => {
  try {
    const { prompt, tone, category } = req.body;

    const caption = await generateAICaption(prompt || "daily vibes", tone || "aesthetic");
    const hashtags = await generateHashtags(prompt || "vybe");
    const altText = generateAltText(category || "photo");

    return res.status(200).json({
      success: true,
      caption,
      hashtags,
      altText,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `AI Caption error: ${error.message}` });
  }
};

// 2. Generate AI Profile Bio
export const generateBio = async (req, res) => {
  try {
    const { profession, vibe } = req.body;
    const bio = await generateAIBio(profession || "Creator", vibe || "aesthetic");

    return res.status(200).json({
      success: true,
      bio,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `AI Bio error: ${error.message}` });
  }
};

// 3. AI Content Auto-Translation
export const translateContent = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "Text is required for translation" });

    // Auto-detect Hindi/Hinglish Roman keywords or Devnagari characters
    const isHindiOrHinglish = /[\u0900-\u097F]/.test(text) || 
      /\b(suno|kya|accha|hai|aur|toh|kaise|yaar|tm|hu|nhi|rha|rhi|tha|thi|se|sare|sari|bhot|lg|rha|kro|hi|kar|raha|rahi|chal|pe|par|kuch|rkhna|niche|kuch|sab|sb|hai|h)\b/i.test(text);

    // If Hindi/Hinglish -> translate to English. If English -> translate to Hindi.
    const targetLang = isHindiOrHinglish ? "en" : "hi";

    let translatedText = "";
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      const apiRes = await fetch(url, { signal: AbortSignal.timeout(3500) });
      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data && data[0]) {
          translatedText = data[0].map(item => item[0]).join("");
        }
      }
    } catch (e) {
      console.error("Google Translate API error, using local fallback:", e);
    }

    if (!translatedText) {
      translatedText = translateText(text, targetLang);
    }

    return res.status(200).json({
      success: true,
      translatedText,
      targetLang,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Translation error: ${error.message}` });
  }
};

// 4. Fetch Smart DM Reply Suggestions
export const getSmartReplies = async (req, res) => {
  try {
    const { messageText } = req.query;

    const suggestions = await generateSmartReplies(messageText || "");

    return res.status(200).json({
      success: true,
      suggestions,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Smart Replies error: ${error.message}` });
  }
};

// 5. Analyze Toxicity & Log Flagged Attempts
export const analyzeTextSafety = async (req, res) => {
  try {
    const userId = req.userId;
    const { text, contentType = "comment" } = req.body;

    const analysis = analyzeToxicity(text);

    if (analysis.isFlagged && userId) {
      await ModerationLog.create({
        user: userId,
        contentType,
        content: text,
        toxicityScore: analysis.score,
        flagReason: analysis.reason,
        severity: analysis.score > 0.6 ? "high" : "medium",
        actionTaken: "blocked",
      });
    }

    return res.status(200).json({
      success: true,
      isFlagged: analysis.isFlagged,
      score: analysis.score,
      reason: analysis.reason,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Safety analysis error: ${error.message}` });
  }
};

// 6. Get Safety Moderation Audit Logs
export const getModerationAuditLogs = async (req, res) => {
  try {
    const logs = await ModerationLog.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .limit(30);

    return res.status(200).json({
      success: true,
      logs,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Moderation logs error: ${error.message}` });
  }
};
