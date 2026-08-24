// server/lib/aiMetadataDetector.js
// Server-side C2PA, SynthID, EXIF, and PNG AI Metadata Detector for VYBE

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
  { keyword: "elevenlabs", tool: "ElevenLabs Voice AI", confidence: 0.95 },
];

/**
 * Detect AI metadata from a Buffer or Uint8Array
 */
export const detectAIMetadataFromBuffer = (buffer) => {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    return { isAIGenerated: false, tool: "", detectionSource: null };
  }

  try {
    // Read up to first 128KB
    const slice = buffer.slice(0, 131072);
    const text = slice.toString("latin1").toLowerCase();

    // 1. Check for PNG Generation Parameters
    if (text.includes("steps: ") && text.includes("sampler: ") && (text.includes("cfg scale:") || text.includes("model:"))) {
      let tool = "Stable Diffusion";
      if (text.includes("flux")) tool = "Flux.1";
      if (text.includes("sdxl") || text.includes("sd_xl")) tool = "Stable Diffusion XL";
      return {
        isAIGenerated: true,
        tool,
        detectionSource: "PNG Generation Parameters",
        confidence: 0.99,
      };
    }

    // 2. Check for ComfyUI Workflow
    if (text.includes('"class_type": "ksampler"') || text.includes('"workflow": {')) {
      return {
        isAIGenerated: true,
        tool: "ComfyUI Diffusion",
        detectionSource: "ComfyUI Workflow Metadata",
        confidence: 0.99,
      };
    }

    // 3. Check for C2PA Manifest
    if (text.includes("c2pa") || text.includes("c2pa.claim") || text.includes("urn:c2pa:")) {
      let tool = "C2PA Content Credentials";
      if (text.includes("dall-e") || text.includes("openai")) tool = "ChatGPT / DALL·E 3 (C2PA Signed)";
      else if (text.includes("adobe") || text.includes("firefly")) tool = "Adobe Firefly (C2PA Signed)";
      else if (text.includes("google") || text.includes("synthid")) tool = "Google SynthID / Imagen (C2PA)";

      return {
        isAIGenerated: true,
        tool,
        detectionSource: "C2PA Content Credentials Manifest",
        confidence: 0.99,
      };
    }

    // 4. Check for Specific AI Tool Signatures in EXIF/XMP/Software
    for (const sig of AI_TOOL_SIGNATURES) {
      if (text.includes(sig.keyword)) {
        return {
          isAIGenerated: true,
          tool: sig.tool,
          detectionSource: `EXIF/XMP Signature (${sig.keyword})`,
          confidence: sig.confidence,
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
    console.warn("Server AI metadata error:", err);
    return {
      isAIGenerated: false,
      tool: "",
      detectionSource: null,
      confidence: 0,
    };
  }
};

export default {
  detectAIMetadataFromBuffer,
};
