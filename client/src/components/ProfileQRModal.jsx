import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  X, 
  Share2, 
  Copy, 
  Download, 
  Check, 
  Sparkles, 
  Palette, 
  FileText, 
  Image as ImageIcon,
  QrCode
} from "lucide-react";
import dotsBg from "../assets/dot-bg.png";
import emojiBg from "../assets/emoji-bg.png";
import dp from "../assets/dp3.png";

const THEMES = [
  {
    id: "ig-gradient",
    label: "Instagram",
    bgStyle: "linear-gradient(to bottom right, #f43f5e, #c084fc, #6366f1)",
    textColor: "text-white",
    badgeBg: "bg-black/25 text-white border-white/20",
    previewClass: "bg-gradient-to-br from-rose-500 via-purple-500 to-indigo-600",
  },
  {
    id: "sunset",
    label: "Sunset",
    bgStyle: "linear-gradient(135deg, #ff0844 0%, #ffb199 100%)",
    textColor: "text-white",
    badgeBg: "bg-black/25 text-white border-white/20",
    previewClass: "bg-gradient-to-tr from-rose-600 to-orange-300",
  },
  {
    id: "midnight",
    label: "Midnight",
    bgStyle: "linear-gradient(135deg, #09090b 0%, #18181b 50%, #27272a 100%)",
    textColor: "text-white",
    badgeBg: "bg-white/10 text-white border-white/15",
    previewClass: "bg-zinc-900 border border-zinc-700",
  },
  {
    id: "neon",
    label: "Neon Cyber",
    bgStyle: "linear-gradient(135deg, #0f172a, #0284c7, #10b981)",
    textColor: "text-white",
    badgeBg: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    previewClass: "bg-gradient-to-tr from-slate-900 via-sky-600 to-emerald-400",
  },
  {
    id: "cosmic",
    label: "Cosmic",
    bgStyle: "linear-gradient(135deg, #4c1d95, #7c3aed, #c084fc)",
    textColor: "text-white",
    badgeBg: "bg-white/15 text-white border-white/20",
    previewClass: "bg-gradient-to-tr from-indigo-900 via-purple-600 to-pink-400",
  },
  {
    id: "minimal-light",
    label: "Light",
    bgStyle: "#ffffff",
    textColor: "text-zinc-900",
    badgeBg: "bg-zinc-100 text-zinc-800 border-zinc-300",
    previewClass: "bg-white border border-zinc-300",
  },
  {
    id: "emoji-bg",
    label: "Emoji Fun",
    bgStyle: `url(${emojiBg}) center/cover no-repeat`,
    textColor: "text-white drop-shadow-md",
    badgeBg: "bg-black/40 text-white backdrop-blur-md border-white/20",
    previewClass: "bg-yellow-400 border border-yellow-500",
  },
  {
    id: "dots-bg",
    label: "Dots Grid",
    bgStyle: `url(${dotsBg}) center/cover no-repeat`,
    textColor: "text-white drop-shadow-md",
    badgeBg: "bg-black/40 text-white backdrop-blur-md border-white/20",
    previewClass: "bg-zinc-800 border border-zinc-600",
  },
  {
    id: "custom-picker",
    label: "Custom",
    bgStyle: "custom",
    textColor: "text-white",
    badgeBg: "bg-black/20 text-white border-white/20",
    previewClass: "bg-gradient-to-tr from-pink-500 via-rose-500 to-yellow-500",
  },
];

const ProfileQrModal = ({ isOpen, onClose, user }) => {
  const [selectedThemeId, setSelectedThemeId] = useState("ig-gradient");
  const [customColor, setCustomColor] = useState("#ec4899");
  const [copied, setCopied] = useState(false);
  const [showSaveDropdown, setShowSaveDropdown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const qrRef = useRef(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentTheme = THEMES.find((t) => t.id === selectedThemeId) || THEMES[0];

  const getCardBackground = () => {
    if (selectedThemeId === "custom-picker") return customColor;
    return currentTheme.bgStyle;
  };

  const handleShare = async () => {
    const profileUrl = `${window.location.origin}/profile/${user?.userName}`;
    const shareData = {
      title: `${user?.name || user?.userName} on VYBE`,
      text: `Check out @${user?.userName}'s profile on VYBE!`,
      url: profileUrl,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(profileUrl);
        setCopied(true);
        toast.success("Profile link copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        await navigator.clipboard.writeText(profileUrl);
        toast.success("Profile link copied!");
      }
    }
  };

  const handleCopyLink = async () => {
    const profileUrl = `${window.location.origin}/profile/${user?.userName}`;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast.success("Profile link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link.");
    }
  };

  const handleDownloadPNG = async () => {
    if (!qrRef.current) return;
    try {
      setIsExporting(true);
      setShowSaveDropdown(false);
      const canvas = await html2canvas(qrRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `VYBE_${user?.userName}_QR.png`;
      link.click();
      toast.success("Saved QR image to device!");
    } catch (err) {
      console.error("PNG export error", err);
      toast.error("Failed to save image.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!qrRef.current) return;
    try {
      setIsExporting(true);
      setShowSaveDropdown(false);
      const canvas = await html2canvas(qrRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("portrait", "mm", "a4");
      const imgWidth = 160;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 25, 30, imgWidth, imgHeight);
      pdf.save(`VYBE_${user?.userName}_QR.pdf`);
      toast.success("Downloaded PDF document!");
    } catch (err) {
      console.error("PDF export error", err);
      toast.error("Failed to generate PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xl p-0 sm:p-4 animate-fadeIn transition-all">
      {/* Tap backdrop to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Bottom Sheet Drawer Modal Card */}
      <div 
        className="relative w-full sm:max-w-[420px] max-h-[92vh] flex flex-col rounded-t-[2.5rem] sm:rounded-3xl border-t sm:border border-zinc-800/90 bg-zinc-950 text-white shadow-2xl overflow-hidden animate-slideUp z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator Bar */}
        <div className="sm:hidden w-full flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-zinc-800" />
        </div>
        {/* Integrated Clean Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900/80 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight text-white">Share Profile QR</h2>
              <p className="text-[10px] text-zinc-400 font-medium">Scan to connect on VYBE</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-zinc-800"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto hide-scrollbar p-6 space-y-6 flex-1">
          
          {/* Exportable QR Card Frame */}
          <div className="flex justify-center">
            <div
              ref={qrRef}
              className="w-full max-w-[300px] aspect-[4/5] rounded-[2.5rem] p-6 flex flex-col items-center justify-between shadow-2xl relative overflow-hidden transition-all duration-300 select-none"
              style={{
                background: getCardBackground(),
              }}
            >
              {/* Card Header Pill */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/25 backdrop-blur-md border border-white/20 text-white text-[10px] font-black uppercase tracking-widest shadow-sm">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>VYBE</span>
              </div>

              {/* QR Code Container with Centered Profile Avatar */}
              <div className="relative w-full aspect-square bg-white p-4 rounded-[2rem] shadow-xl border border-white/40 flex items-center justify-center">
                <img
                  src={user?.qrCode?.url}
                  alt={`QR code for ${user?.userName}`}
                  className="w-full h-full object-contain pointer-events-none"
                  crossOrigin="anonymous"
                  draggable="false"
                />

                {/* Center Badge Avatar */}
                <div className="absolute w-12 h-12 rounded-full border-2 border-white bg-black shadow-md overflow-hidden flex items-center justify-center p-0.5">
                  <img
                    src={user?.profileImage?.url || dp}
                    alt=""
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
              </div>

              {/* Card Footer Username */}
              <div className={`text-center font-black text-lg tracking-tight truncate w-full px-2 ${currentTheme.textColor}`}>
                @{user?.userName || "user"}
              </div>
            </div>
          </div>

          {/* Theme Selector Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-rose-400" />
                Card Theme
              </span>
              <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                {currentTheme.label}
              </span>
            </div>

            {/* Horizontal Scroll Theme Bubbles */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 hide-scrollbar">
              {THEMES.map((t) => {
                const isSelected = selectedThemeId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedThemeId(t.id)}
                    className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none cursor-pointer"
                  >
                    <div
                      className={`w-10 h-10 rounded-full border-2 transition-all duration-200 flex items-center justify-center overflow-hidden ${
                        isSelected 
                          ? "border-rose-500 scale-110 shadow-lg shadow-rose-500/30" 
                          : "border-zinc-800 hover:border-zinc-600 hover:scale-105"
                      } ${t.previewClass}`}
                      style={
                        t.id === "custom-picker"
                          ? { background: customColor }
                          : t.id === "minimal-light"
                          ? { background: "#ffffff" }
                          : {}
                      }
                    >
                      {isSelected && (
                        <Check className={`w-4 h-4 ${t.id === "minimal-light" ? "text-zinc-900" : "text-white"}`} />
                      )}
                    </div>
                    <span className={`text-[10px] font-medium transition-colors ${
                      isSelected ? "text-white font-bold" : "text-zinc-500 group-hover:text-zinc-300"
                    }`}>
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Color Input if Color Picker Selected */}
            {selectedThemeId === "custom-picker" && (
              <div className="mt-3 flex items-center gap-3 bg-zinc-900 p-3 rounded-2xl border border-zinc-800 animate-fadeIn">
                <span className="text-xs font-bold text-zinc-300">Choose Hex Color:</span>
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="w-10 h-8 rounded-lg border-0 bg-transparent cursor-pointer"
                />
                <span className="text-xs font-mono text-zinc-400 uppercase">{customColor}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action Footer */}
        <div className="p-4 border-t border-zinc-900 bg-zinc-950/80 backdrop-blur-md grid grid-cols-3 gap-2 shrink-0">
          {/* Share */}
          <button
            onClick={handleShare}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all border border-zinc-850 active:scale-95 cursor-pointer group"
          >
            <Share2 className="w-4 h-4 group-hover:text-rose-400 transition-colors" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Share</span>
          </button>

          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all border border-zinc-850 active:scale-95 cursor-pointer group"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4 group-hover:text-rose-400 transition-colors" />
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider">{copied ? "Copied!" : "Copy Link"}</span>
          </button>

          {/* Download Dropdown Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowSaveDropdown((prev) => !prev)}
              disabled={isExporting}
              className="w-full flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white font-bold transition-all shadow-lg shadow-rose-500/20 active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">{isExporting ? "Saving..." : "Save"}</span>
            </button>

            {/* Dropdown Options for Save */}
            {showSaveDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSaveDropdown(false)} />
                <div className="absolute bottom-full mb-2 right-0 w-44 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-1.5 z-50 animate-slideUp backdrop-blur-xl space-y-1">
                  <button
                    onClick={handleDownloadPNG}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-zinc-800 text-xs font-bold text-zinc-200 hover:text-white transition text-left cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4 text-rose-400" />
                    <span>Save Image (PNG)</span>
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-zinc-800 text-xs font-bold text-zinc-200 hover:text-white transition text-left cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-purple-400" />
                    <span>Save PDF Document</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileQrModal;
