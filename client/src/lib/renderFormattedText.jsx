import React from "react";
import { ExternalLink } from "lucide-react";

// Robust regex matching http://, https://, and www. links
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

/**
 * Highlights search matches within a plain string
 */
const renderHighlightedSegment = (text, query) => {
  if (!query || !query.trim() || !text) return text;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-amber-400 text-black font-semibold rounded-xs px-0.5 shadow-xs">
        {part}
      </mark>
    ) : (
      part
    )
  );
};

/**
 * Parses message text and renders clickable URLs + search query highlighting
 */
export const renderFormattedMessageText = (
  text,
  { isSender = false, isGradientTheme = false, searchQuery = "" } = {}
) => {
  if (!text) return null;

  const parts = text.split(URL_REGEX);
  return parts.map((part, index) => {
    if (part && part.match(URL_REGEX)) {
      // Strip trailing punctuation like .,!?:;)"' from the URL
      const match = part.match(/^(.*?)([.,!?:;)"']*)$/);
      const rawUrl = match ? match[1] : part;
      const trailingPunct = match ? match[2] : "";

      const href =
        rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
          ? rawUrl
          : `https://${rawUrl}`;

      return (
        <React.Fragment key={index}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`inline-flex items-center gap-0.5 underline font-semibold underline-offset-2 break-all transition ${
              isSender
                ? isGradientTheme
                  ? "text-cyan-200 hover:text-white"
                  : "text-blue-500 hover:text-blue-600 dark:text-blue-400"
                : "text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-500"
            }`}
            title={href}
          >
            <span>{rawUrl}</span>
            <ExternalLink className="w-3 h-3 shrink-0 opacity-80 inline ml-0.5" />
          </a>
          {trailingPunct}
        </React.Fragment>
      );
    }
    return (
      <React.Fragment key={index}>
        {searchQuery ? renderHighlightedSegment(part, searchQuery) : part}
      </React.Fragment>
    );
  });
};

export default renderFormattedMessageText;
