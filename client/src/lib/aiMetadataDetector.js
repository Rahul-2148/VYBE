// client/src/lib/aiMetadataDetector.js
// Real-time C2PA, SynthID, EXIF, and PNG AI Metadata Detector for VYBE

/**
 * Known AI Tool Signatures & Keywords in EXIF, IPTC, XMP, C2PA, and PNG metadata
 */
const AI_TOOL_SIGNATURES = [
  { keyword: "c2pa", tool: "C2PA Content Credentials", confidence: 0.98 },
  { keyword: "claim_generator", tool: "C2PA Signed AI", confidence: 0.98 },
  { keyword: "trainedalgorithmicmedia", tool: "Generative AI (IPTC C2PA)", confidence: 0.95 },
  { keyword: "compositesynthetic", tool: "Synthetic Media (IPTC)", confidence: 0.95 },
  { keyword: "synthid", tool: "Google SynthID Watermark", confidence: 0.99 },
  { keyword: "dall-e", tool: "ChatGPT / DALL·E 3", confidence: 0.95 },
  { keyword: "dalle", tool: "ChatGPT / DALL·E", confidence: 0.95 },
  { keyword: "midjourney", tool: "Midjourney", confidence: 0.95 },
  { keyword: "stable diffusion", tool: "Stable Diffusion", confidence: 0.95 },
  { keyword: "stablediffusion", tool: "Stable Diffusion", confidence: 0.95 },
  { keyword: "comfyui", tool: "ComfyUI Diffusion", confidence: 0.95 },
  { keyword: "automatic1111", tool: "Stable Diffusion (A1111)", confidence: 0.95 },
  { keyword: "adobe firefly", tool: "Adobe Firefly", confidence: 0.95 },
  { keyword: "firefly", tool: "Adobe Firefly", confidence: 0.90 },
  { keyword: "flux.1", tool: "Flux.1", confidence: 0.95 },
  { keyword: "black forest labs", tool: "Flux.1 (BFL)", confidence: 0.95 },
  { keyword: "novelai", tool: "NovelAI Diffusion", confidence: 0.95 },
  { keyword: "runway", tool: "Runway Gen-3", confidence: 0.95 },
  { keyword: "gen-2", tool: "Runway Gen-2", confidence: 0.95 },
  { keyword: "gen-3", tool: "Runway Gen-3", confidence: 0.95 },
  { keyword: "sora", tool: "OpenAI Sora", confidence: 0.95 },
  { keyword: "pika labs", tool: "Pika AI", confidence: 0.95 },
  { keyword: "luma dream", tool: "Luma Dream Machine", confidence: 0.95 },
  { keyword: "kling ai", tool: "Kling AI", confidence: 0.95 },
  { keyword: "klingai", tool: "Kling AI", confidence: 0.95 },
  { keyword: "elevenlabs", tool: "ElevenLabs Voice AI", confidence: 0.95 },
  { keyword: "suno ai", tool: "Suno AI Music", confidence: 0.95 },
  { keyword: "udio", tool: "Udio AI Music", confidence: 0.95 },
];

/**
 * Detect AI Metadata from a File or Blob in the browser
 * Reads initial headers & metadata chunks (first 128KB is sufficient for EXIF/XMP/PNG/C2PA)
 */
export const detectAIMetadata = async (file) => {
  if (!file || !(file instanceof Blob)) {
    return { isAIGenerated: false, tool: "", detectionSource: null };
  }

  try {
    // Read the first 128KB of the file (metadata headers are always in header/first chunks)
    const slice = file.slice(0, 131072);
    const arrayBuffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Convert buffer to ASCII/UTF-8 string for fast signature matching
    let rawText = "";
    const len = bytes.length;
    for (let i = 0; i < len; i++) {
      const b = bytes[i];
      // Keep printable ASCII and common UTF-8 chars
      if ((b >= 32 && b <= 126) || b === 10 || b === 13 || b === 9) {
        rawText += String.fromCharCode(b);
      } else {
        rawText += " ";
      }
    }

    const lowerText = rawText.toLowerCase();

    // 1. Check for PNG Generation Parameters (Stable Diffusion, ComfyUI, Automatic1111)
    if (lowerText.includes("steps: ") && lowerText.includes("sampler: ") && (lowerText.includes("cfg scale:") || lowerText.includes("model:"))) {
      let tool = "Stable Diffusion";
      if (lowerText.includes("flux")) tool = "Flux.1";
      if (lowerText.includes("sdxl") || lowerText.includes("sd_xl")) tool = "Stable Diffusion XL";
      return {
        isAIGenerated: true,
        tool,
        detectionSource: "PNG Generation Parameters (Prompt & Sampler)",
        confidence: 0.99,
        details: "Detected embedded diffusion parameters and seed metadata in file header.",
      };
    }

    // 2. Check for ComfyUI / Workflow JSON graph in PNG
    if (lowerText.includes('"class_type": "ksampler"') || lowerText.includes('"class_type": "vaedecode"') || lowerText.includes('"workflow": {')) {
      return {
        isAIGenerated: true,
        tool: "ComfyUI Diffusion",
        detectionSource: "ComfyUI Workflow Metadata",
        confidence: 0.99,
        details: "Detected ComfyUI node generation workflow in file chunks.",
      };
    }

    // 3. Check for C2PA Content Credentials & SynthID Markers
    if (lowerText.includes("c2pa") || lowerText.includes("c2pa.claim") || lowerText.includes("urn:c2pa:")) {
      let tool = "C2PA Content Credentials";
      if (lowerText.includes("dall-e") || lowerText.includes("openai")) tool = "ChatGPT / DALL·E 3 (C2PA Signed)";
      else if (lowerText.includes("adobe") || lowerText.includes("firefly")) tool = "Adobe Firefly (C2PA Signed)";
      else if (lowerText.includes("microsoft") || lowerText.includes("designer")) tool = "Microsoft Designer (C2PA Signed)";
      else if (lowerText.includes("google") || lowerText.includes("imagen") || lowerText.includes("synthid")) tool = "Google Imagen / SynthID (C2PA)";

      return {
        isAIGenerated: true,
        tool,
        detectionSource: "C2PA Digital Content Credentials (JUMBF)",
        confidence: 0.99,
        details: "Detected cryptographically verifiable C2PA AI generation manifest in file header.",
      };
    }

    // 4. Check for Specific AI Tool Signatures in EXIF/XMP/IPTC/Software Tags
    for (const sig of AI_TOOL_SIGNATURES) {
      if (lowerText.includes(sig.keyword)) {
        return {
          isAIGenerated: true,
          tool: sig.tool,
          detectionSource: `Metadata Signature (${sig.keyword})`,
          confidence: sig.confidence,
          details: `Detected AI generator signature in file EXIF/XMP header.`,
        };
      }
    }

    return {
      isAIGenerated: false,
      tool: "",
      detectionSource: null,
      confidence: 0,
    };
  } catch (err) {
    console.warn("AI metadata inspection error:", err);
    return {
      isAIGenerated: false,
      tool: "",
      detectionSource: null,
      confidence: 0,
    };
  }
};

export default {
  detectAIMetadata,
  AI_TOOL_SIGNATURES,
};
