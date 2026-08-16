import React from "react";

/**
 * VerifiedBadge - Pixel-Perfect High-Definition Blue Tick
 * Authentic 12-scalloped rosette in vibrant electric blue (#0095F6) with crisp pure white checkmark.
 */
const VerifiedBadge = ({ size = "sm", className = "", title = "Verified Account" }) => {
  const sizeClasses = {
    xs: "w-3.5 h-3.5",
    sm: "w-4 h-4",
    md: "w-[18px] h-[18px]",
    lg: "w-5 h-5",
    xl: "w-6 h-6",
    "2xl": "w-7 h-7",
  };

  const dimensionClass = sizeClasses[size] || sizeClasses.sm;

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 align-middle ${dimensionClass} ${className}`}
      title={title}
      aria-label={title}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_1px_2px_rgba(0,149,246,0.25)]"
      >
        <path
          d="M19.965 8.521C19.988 8.347 20 8.173 20 8c0-2.379-2.143-4.288-4.521-3.965C14.786 2.802 13.466 2 12 2s-2.786.802-3.479 2.035C6.138 3.712 4 5.621 4 8c0 .173.012.347.035.521C2.802 9.214 2 10.534 2 12s.802 2.786 2.035 3.479C4.012 15.653 4 15.827 4 16c0 2.379 2.138 4.288 4.521 3.965C9.214 21.198 10.534 22 12 22s2.786-.802 3.479-2.035C17.857 20.288 20 18.379 20 16c0-.173-.012-.347-.035-.521C21.198 14.786 22 13.466 22 12s-.802-2.786-2.035-3.479z"
          fill="#0095F6"
        />
        <path
          d="M10.956 16.758L7.032 12.834l1.414-1.414 2.51 2.51 5.797-5.798 1.414 1.414-7.211 7.212z"
          fill="#ffffff"
        />
      </svg>
    </span>
  );
};

export default VerifiedBadge;
