import React, { useState } from "react";
import { ExternalLink, Sparkles, Heart, MessageCircle, Share2, Megaphone } from "lucide-react";
import dp from "../assets/dp3.png";
import api from "../lib/axios";

export const SponsoredPost = ({ ad }) => {
  const [hasClicked, setHasClicked] = useState(false);

  const handleCtaClick = async () => {
    try {
      await api.post(`/monetization/ad/click/${ad._id}`, { type: "click" });
    } catch (e) {
      console.warn("SponsoredPost: handleCtaClick failed", e);
    }
    setHasClicked(true);
    window.open(ad.targetUrl, "_blank");
  };

  return (
    <div className="w-full max-w-[500px] bg-surface border border-border rounded-3xl overflow-hidden shadow-xl space-y-3">
      {/* Header Bar with Sponsored Badge */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <img
            src={ad.advertiser?.profileImage?.url || dp}
            alt=""
            className="w-10 h-10 rounded-full object-cover border border-border"
          />
          <div>
            <p className="text-xs font-bold text-text">@{ad.advertiser?.userName || "Brand"}</p>
            <p className="text-[10px] text-text-muted font-semibold flex items-center gap-1">
              <Megaphone className="w-3 h-3 text-accent" />
              <span>Sponsored</span>
            </p>
          </div>
        </div>

        <span className="px-2.5 py-0.5 bg-accent-muted border border-accent/20 text-accent text-[10px] font-bold rounded-full">
          Ad
        </span>
      </div>

      {/* Media Image */}
      <div className="w-full aspect-square bg-surface relative overflow-hidden">
        <img src={ad.mediaUrl} alt="" className="w-full h-full object-cover" />
      </div>

      {/* Call To Action (CTA) Interactive Banner */}
      <div
        onClick={handleCtaClick}
        className="w-full bg-surface hover:bg-bg text-text px-4 py-3 flex items-center justify-between cursor-pointer transition shadow-inner"
      >
        <div>
          <p className="text-xs font-extrabold tracking-tight">{ad.title}</p>
          <p className="text-[11px] text-text-secondary truncate max-w-[280px]">{ad.targetUrl}</p>
        </div>
        <button className="px-4 py-1.5 bg-gradient-to-r from-pink-500 to-rose-600 font-bold text-xs rounded-xl flex items-center gap-1 shadow">
          <span>{ad.ctaType || "Learn More"}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Caption */}
      {ad.caption && (
        <div className="px-4 pb-4 text-xs text-text-muted space-y-1">
          <span className="font-bold text-text mr-2">@{ad.advertiser?.userName}</span>
          <span>{ad.caption}</span>
        </div>
      )}
    </div>
  );
};

export default SponsoredPost;
