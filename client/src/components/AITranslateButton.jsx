import React, { useState } from "react";
import { Languages, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/axios";

export const AITranslateButton = ({ originalText }) => {
  const [translatedText, setTranslatedText] = useState(null);
  const [isTranslated, setIsTranslated] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleToggleTranslation = async () => {
    if (isTranslated) {
      setIsTranslated(false);
      return;
    }

    if (translatedText) {
      setIsTranslated(true);
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/ai/translate", { text: originalText });
      if (res.data.success) {
        setTranslatedText(res.data.translatedText);
        setIsTranslated(true);
      }
    } catch {
      toast.error("Translation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-1 mt-1 select-none">
      {isTranslated && (
        <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl italic">
          {translatedText}
        </p>
      )}

      <button
        onClick={handleToggleTranslation}
        disabled={loading}
        className="text-[11px] font-bold text-rose-400 hover:underline flex items-center gap-1 transition cursor-pointer"
      >
        {loading ? (
          <RefreshCw className="w-3 h-3 animate-spin text-rose-400" />
        ) : (
          <Languages className="w-3 h-3" />
        )}
        <span>{isTranslated ? "See Original" : "See Translation"}</span>
      </button>
    </div>
  );
};

export default AITranslateButton;
