import { BadgeCheck } from "lucide-react";

const VerifiedBadge = ({ size = "md", className = "" }) => {
  const sizeClasses = {
    xs: "w-3.5 h-3.5",
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const iconSize = sizeClasses[size] || sizeClasses.md;

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      title="Verified Account"
    >
      <BadgeCheck className={`${iconSize} text-[#0095f6] fill-[#0095f6] stroke-white stroke-[2] drop-shadow-sm`} />
    </span>
  );
};

export default VerifiedBadge;
