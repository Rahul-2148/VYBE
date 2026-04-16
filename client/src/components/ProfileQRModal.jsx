// src/components/ProfileQrModal.jsx
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useRef, useState } from "react";
import { AiOutlineLink } from "react-icons/ai";
import { IoClose, IoShareSocialOutline } from "react-icons/io5";
import { LiaDownloadSolid } from "react-icons/lia";
import dotsBg from "../assets/dot-bg.png";
import emojiBg from "../assets/emoji-bg.png";

const themes = [
  { id: "white", label: "Classic", class: "bg-white" },
  { id: "emoji", label: "Emoji", class: "", image: emojiBg },
  {
    id: "gradient",
    label: "Gradient",
    class: "bg-gradient-to-br from-pink-500 to-purple-600",
  },
  { id: "dark", label: "Dark", class: "bg-black" },
  { id: "dots", label: "Dots", class: "", image: dotsBg },
  { id: "colorPicker", label: "Custom Color", class: "" },
];

const ProfileQrModal = ({ isOpen, onClose, user }) => {
  const [theme, setTheme] = useState("gradient");
  const [customColor, setCustomColor] = useState("#ffffff");
  const qrRef = useRef(null);

  if (!isOpen) return null;

  const currentTheme =
    theme === "colorPicker"
      ? { class: "", label: "Custom Color" }
      : themes.find((t) => t.id === theme);

  const handleShare = async () => {
    try {
      const shareData = {
        title: "My Profile",
        text: "Check out my profile!",
        url: `${import.meta.env.VITE_CLIENT_URL}/profile/${user.userName}`,
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy link to clipboard and notify
        const link = `${import.meta.env.VITE_CLIENT_URL}/profile/${
          user.userName
        }`;
        await navigator.clipboard.writeText(link);
        alert("Sharing not supported — profile link copied to clipboard.");
      }
    } catch (error) {
      console.error("Sharing failed", error);
      alert("Sharing failed. Please try copying the link instead.");
    }
  };

  const handleCopyLink = async () => {
    const link = `${import.meta.env.VITE_CLIENT_URL}/profile/${user.userName}`;
    try {
      await navigator.clipboard.writeText(link);
      alert("Profile link copied!");
    } catch (err) {
      console.error("Copy failed", err);
      alert("Unable to copy link. Please copy manually: " + link);
    }
  };

  const handleDownloadImage = async () => {
    try {
      const canvas = await html2canvas(qrRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      const img = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = img;
      a.download = `${user.userName}-qr.png`;
      a.click();
    } catch (err) {
      console.error("Download image failed", err);
      alert("Failed to download image.");
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const canvas = await html2canvas(qrRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(img);
      const pdfWidth = 180;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(img, "PNG", 15, 20, pdfWidth, pdfHeight);
      pdf.save(`${user.userName}-qr.pdf`);
    } catch (err) {
      console.error("Download PDF failed", err);
      alert("Failed to download PDF.");
    }
  };

  const getUsernameTextColor = () => {
    if (theme === "white" || theme === "colorPicker") return "text-black";
    return "text-white drop-shadow-lg";
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center pt-6 z-50 overflow-x-hidden">
      <div className="bg-white rounded-t-3xl w-full max-w-[380px] pb-6 animate-slideUp md:max-h-[calc(100vh-110px)] md:overflow-auto hide-scrollbar">
        {/* Header */}
        <div className="flex justify-between px-5 py-4 border-b">
          <span className="text-lg font-semibold">Share Profile</span>
          <IoClose size={28} onClick={onClose} className="cursor-pointer" />
        </div>

        {/* QR Container */}
        <div className="flex justify-center py-5 relative">
          <div
            ref={qrRef}
            className="w-[240px] h-[260px] rounded-3xl p-4 flex flex-col items-center justify-center"
            style={{
              background:
                theme === "white"
                  ? "#ffffff"
                  : theme === "dark"
                  ? "#000000"
                  : theme === "gradient"
                  ? "linear-gradient(to bottom right, #ec4899, #8b5cf6)"
                  : theme === "colorPicker"
                  ? customColor
                  : currentTheme && currentTheme.image
                  ? `url(${currentTheme.image}) center/cover no-repeat`
                  : "#ffffff",
            }}
          >
            <div className="bg-white p-4 rounded-2xl w-full">
              <img
                src={user?.qrCode?.url}
                className="w-full"
                alt="QR"
                crossOrigin="anonymous"
              />
            </div>

            <div
              className={`text-center mt-3 font-bold text-lg ${getUsernameTextColor()}`}
            >
              @{user.userName}
            </div>
          </div>
        </div>

        {/* Theme Selector */}
        <div className="flex gap-4 overflow-x-auto px-5 py-3">
          {themes.map((t) => (
            <div
              key={t.id}
              onClick={() => setTheme(t.id)}
              className="flex flex-col items-center cursor-pointer"
            >
              <div
                className={`w-10 h-10 rounded-full border-2 ${
                  theme === t.id ? "border-black" : "border-transparent"
                } ${t.class}`}
                style={
                  t.image
                    ? {
                        backgroundImage: `url(${t.image})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : {}
                }
              />
              <span className="text-xs mt-1">{t.label}</span>
            </div>
          ))}
        </div>

        {/* Custom Color Picker */}
        {theme === "colorPicker" && (
          <div className="px-5 mb-3">
            <input
              type="color"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              className="w-full h-10 rounded-lg cursor-pointer"
            />
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-around px-5 mt-5">
          <button
            className="flex flex-col items-center text-gray-700 hover:text-black transition-colors"
            onClick={handleShare}
          >
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center shadow-md">
              <IoShareSocialOutline size={25} />
            </div>
            <span className="mt-1 text-xs font-medium">Share Profile</span>
          </button>

          <button
            className="flex flex-col items-center text-gray-700 hover:text-black transition-colors"
            onClick={handleCopyLink}
          >
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center shadow-md">
              <AiOutlineLink size={25} />
            </div>
            <span className="mt-1 text-xs font-medium">Copy Link</span>
          </button>

          <div className="relative">
            <DownloadButtonGroup
              onImage={handleDownloadImage}
              onPDF={handleDownloadPDF}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Small download button group component
const DownloadButtonGroup = ({ onImage, onPDF }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((s) => !s)}
        className="flex flex-col items-center text-gray-700 hover:text-black transition-colors"
      >
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center shadow-md">
          <LiaDownloadSolid size={25} />
        </div>
        <span className="mt-1 text-xs font-medium">Download</span>
      </button>

      {open && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg py-2 w-36 flex flex-col z-50 animate-slideUp">
          <button
            onClick={() => {
              onImage();
              setOpen(false);
            }}
            className="px-4 py-2 hover:bg-gray-100 text-sm text-left rounded-t-lg"
          >
            Download Image
          </button>
          <button
            onClick={() => {
              onPDF();
              setOpen(false);
            }}
            className="px-4 py-2 hover:bg-gray-100 text-sm text-left rounded-b-lg"
          >
            Download PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileQrModal;
