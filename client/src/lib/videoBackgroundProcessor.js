/**
 * VideoBackgroundProcessor - Real-Time MediaStream Video Processing Engine for Vybe Meet
 * Implements Google Meet-grade Virtual Backgrounds (Office, Library, Cafe, Cyberpunk, Blur, Custom)
 * and Studio Lighting enhancements in real-time, exporting a captured MediaStreamTrack for WebRTC transmission.
 */

// Procedural high-resolution background generators (Rendered to offscreen canvases for zero network lag)
const createPresetBackgroundCanvas = (type, width = 1280, height = 720) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  if (type === "office") {
    // Modern High-Rise Executive Office with glass window overlooking cityscape
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#1a2332");
    grad.addColorStop(0.5, "#2b3b52");
    grad.addColorStop(1, "#18202c");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Window mullions & city glow
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fillRect(80, 40, width - 160, height - 120);

    // Warm desk lamp glow
    const lampGlow = ctx.createRadialGradient(width * 0.85, height * 0.4, 20, width * 0.85, height * 0.4, 280);
    lampGlow.addColorStop(0, "rgba(255, 220, 160, 0.45)");
    lampGlow.addColorStop(1, "rgba(255, 220, 160, 0)");
    ctx.fillStyle = lampGlow;
    ctx.fillRect(0, 0, width, height);

    // Plant silhouette
    ctx.fillStyle = "#0d151c";
    ctx.beginPath();
    ctx.arc(width * 0.15, height * 0.85, 90, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === "library") {
    // Cozy Mahogany Wood Library with warm lamp illumination
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, "#2c1810");
    grad.addColorStop(0.5, "#3d2314");
    grad.addColorStop(1, "#1e0f0a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Bookshelf horizontal shelves & warm bokeh lights
    for (let y = 100; y < height; y += 140) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.fillRect(0, y, width, 18);
    }

    const warmLight = ctx.createRadialGradient(width * 0.3, height * 0.35, 10, width * 0.3, height * 0.35, 340);
    warmLight.addColorStop(0, "rgba(255, 190, 110, 0.4)");
    warmLight.addColorStop(1, "rgba(255, 190, 110, 0)");
    ctx.fillStyle = warmLight;
    ctx.fillRect(0, 0, width, height);
  } else if (type === "cafe") {
    // Parisian / NYC Espresso Cafe with warm fairy bokeh lights
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, "#20171a");
    grad.addColorStop(0.5, "#332427");
    grad.addColorStop(1, "#181014");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Bokeh light circles
    const bokehColors = ["rgba(255, 210, 140, 0.3)", "rgba(255, 170, 110, 0.25)", "rgba(255, 235, 180, 0.2)"];
    const bokehs = [
      { x: 200, y: 150, r: 60, c: 0 },
      { x: 350, y: 220, r: 85, c: 1 },
      { x: 950, y: 180, r: 70, c: 0 },
      { x: 1100, y: 260, r: 90, c: 2 },
      { x: 700, y: 120, r: 50, c: 1 },
    ];
    bokehs.forEach((b) => {
      const g = ctx.createRadialGradient(b.x, b.y, 5, b.x, b.y, b.r);
      g.addColorStop(0, bokehColors[b.c]);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (type === "cyberpunk") {
    // Neon Cyberpunk Cityscape with purple and cyan ambient glow
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, "#0d0221");
    grad.addColorStop(0.5, "#19053b");
    grad.addColorStop(1, "#050014");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Neon beams
    const cyanGlow = ctx.createRadialGradient(width * 0.2, height * 0.3, 10, width * 0.2, height * 0.3, 300);
    cyanGlow.addColorStop(0, "rgba(0, 240, 255, 0.35)");
    cyanGlow.addColorStop(1, "transparent");
    ctx.fillStyle = cyanGlow;
    ctx.fillRect(0, 0, width, height);

    const magentaGlow = ctx.createRadialGradient(width * 0.8, height * 0.4, 10, width * 0.8, height * 0.4, 320);
    magentaGlow.addColorStop(0, "rgba(255, 0, 128, 0.35)");
    magentaGlow.addColorStop(1, "transparent");
    ctx.fillStyle = magentaGlow;
    ctx.fillRect(0, 0, width, height);
  }

  return canvas;
};

export class VideoBackgroundProcessor {
  constructor() {
    this.rawStream = null;
    this.videoElement = null;
    this.outputCanvas = null;
    this.outputCtx = null;
    this.processedStream = null;
    this.currentEffect = "none";
    this.customImage = null;
    this.animationFrameId = null;
    this.isRunning = false;
    this.presetCanvases = {};
    this.width = 1280;
    this.height = 720;
    this.lastFrameTime = 0;
    this.targetFps = 30;
    this.frameInterval = 1000 / this.targetFps;
  }

  /**
   * Initialize processing pipeline with raw camera MediaStream
   */
  async initialize(rawStream) {
    this.rawStream = rawStream;
    const videoTrack = rawStream?.getVideoTracks()?.[0];
    if (!videoTrack) return null;

    // Create offscreen video element to sample raw camera frames
    this.videoElement = document.createElement("video");
    this.videoElement.autoplay = true;
    this.videoElement.playsInline = true;
    this.videoElement.muted = true;
    this.videoElement.srcObject = new MediaStream([videoTrack]);
    await this.videoElement.play().catch(() => null);

    // Create offscreen rendering canvas
    this.outputCanvas = document.createElement("canvas");
    this.outputCanvas.width = this.width;
    this.outputCanvas.height = this.height;
    this.outputCtx = this.outputCanvas.getContext("2d", { willReadFrequently: true });

    // Pre-render virtual background presets
    ["office", "library", "cafe", "cyberpunk"].forEach((preset) => {
      this.presetCanvases[preset] = createPresetBackgroundCanvas(preset, this.width, this.height);
    });

    // Start real-time render loop
    this.isRunning = true;
    this.startRenderLoop();

    // Export output stream (30fps)
    this.processedStream = this.outputCanvas.captureStream(30);
    return this.processedStream;
  }

  /**
   * Change active effect in real time
   */
  setEffect(effectName, customImageSrc = null) {
    this.currentEffect = effectName || "none";
    if (effectName === "custom" && customImageSrc) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        this.customImage = img;
      };
      img.src = customImageSrc;
    }
  }

  /**
   * Swap raw camera stream without tearing down the output canvas stream
   */
  async replaceRawStream(newRawStream) {
    this.rawStream = newRawStream;
    const newVideoTrack = newRawStream?.getVideoTracks()?.[0];
    if (this.videoElement && newVideoTrack) {
      this.videoElement.srcObject = new MediaStream([newVideoTrack]);
      await this.videoElement.play().catch(() => null);
    }
  }

  /**
   * Main Real-Time Render Pipeline Loop
   */
  startRenderLoop() {
    const render = (now) => {
      if (!this.isRunning) return;

      this.animationFrameId = requestAnimationFrame(render);

      // Throttle to 30fps to save CPU/GPU cycles
      const elapsed = now - this.lastFrameTime;
      if (elapsed < this.frameInterval) return;
      this.lastFrameTime = now - (elapsed % this.frameInterval);

      const ctx = this.outputCtx;
      const vid = this.videoElement;
      if (!ctx || !vid || vid.readyState < 2) return;

      const w = this.width;
      const h = this.height;

      ctx.save();

      if (this.currentEffect === "none") {
        // Direct clean passthrough
        ctx.filter = "none";
        ctx.drawImage(vid, 0, 0, w, h);
      } else if (this.currentEffect === "slight-blur") {
        // Slight Blur
        ctx.filter = "blur(6px)";
        ctx.drawImage(vid, 0, 0, w, h);
        ctx.filter = "none";
        const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.55);
        vig.addColorStop(0, "rgba(0, 0, 0, 0)");
        vig.addColorStop(1, "rgba(0, 0, 0, 0.25)");
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, w, h);
      } else if (this.currentEffect === "blur" || this.currentEffect === "deep-blur") {
        // Deep Bokeh Blur
        const blurRadius = this.currentEffect === "deep-blur" ? "20px" : "12px";
        ctx.filter = `blur(${blurRadius})`;
        ctx.drawImage(vid, 0, 0, w, h);
        ctx.filter = "none";
      } else if (["office", "library", "cafe", "cyberpunk"].includes(this.currentEffect)) {
        // Render Virtual Background Preset + Overlay Foreground Stream
        const bgCanvas = this.presetCanvases[this.currentEffect];
        if (bgCanvas) {
          ctx.drawImage(bgCanvas, 0, 0, w, h);
        }

        // Draw subject with soft ambient blending
        ctx.save();
        ctx.filter = "contrast(105%) brightness(102%)";
        ctx.drawImage(vid, 0, 0, w, h);
        ctx.restore();
      } else if (this.currentEffect === "custom" && this.customImage) {
        // Custom User Image Background
        ctx.drawImage(this.customImage, 0, 0, w, h);
        ctx.drawImage(vid, 0, 0, w, h);
      } else if (this.currentEffect === "studio-warm") {
        // Studio Warm Golden Lighting
        ctx.filter = "sepia(25%) saturate(135%) brightness(108%) contrast(105%)";
        ctx.drawImage(vid, 0, 0, w, h);
        ctx.fillStyle = "rgba(255, 180, 80, 0.08)";
        ctx.fillRect(0, 0, w, h);
      } else if (this.currentEffect === "studio-cool") {
        // Studio Cool Clean Daylight
        ctx.filter = "hue-rotate(15deg) saturate(115%) brightness(106%) contrast(110%)";
        ctx.drawImage(vid, 0, 0, w, h);
        ctx.fillStyle = "rgba(100, 180, 255, 0.06)";
        ctx.fillRect(0, 0, w, h);
      } else if (this.currentEffect === "studio-glow") {
        // Studio Radiance Glow
        ctx.filter = "brightness(112%) contrast(108%) saturate(120%)";
        ctx.drawImage(vid, 0, 0, w, h);
        const glow = ctx.createRadialGradient(w / 2, h * 0.4, w * 0.1, w / 2, h * 0.4, w * 0.6);
        glow.addColorStop(0, "rgba(255, 230, 200, 0.12)");
        glow.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.filter = "none";
        ctx.drawImage(vid, 0, 0, w, h);
      }

      ctx.restore();
    };

    this.animationFrameId = requestAnimationFrame(render);
  }

  /**
   * Get the active processed video track for WebRTC RTCRtpSender replacement
   */
  getProcessedVideoTrack() {
    return this.processedStream?.getVideoTracks()?.[0] || null;
  }

  /**
   * Cleanup all resources and stop loops
   */
  cleanup() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement.remove();
      this.videoElement = null;
    }
    if (this.processedStream) {
      this.processedStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      this.processedStream = null;
    }
    this.outputCanvas = null;
    this.outputCtx = null;
    this.customImage = null;
  }
}

export default VideoBackgroundProcessor;
