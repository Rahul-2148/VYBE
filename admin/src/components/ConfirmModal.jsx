import React from "react";
import { AlertTriangle, ShieldAlert, X, Check, Trash2, Ban, ShieldOff } from "lucide-react";

/**
 * ConfirmModal — High-end Vybe branded confirmation dialog to replace browser native 'window.confirm'.
 */
export const ConfirmModal = ({
  isOpen,
  title = "Confirm Action",
  message = "Are you sure you want to proceed with this operation?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger", // "danger", "warning", "info", "primary"
  icon: CustomIcon,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case "warning":
        return {
          icon: CustomIcon || AlertTriangle,
          iconBg: "bg-amber-500/20 text-amber-400 border-amber-500/30",
          btn: "bg-gradient-to-r from-amber-500 to-orange-600 text-black font-bold shadow-lg shadow-amber-500/20 hover:brightness-110",
          border: "border-amber-500/30",
        };
      case "primary":
      case "info":
        return {
          icon: CustomIcon || Check,
          iconBg: "bg-purple-500/20 text-purple-400 border-purple-500/30",
          btn: "bg-gradient-to-r from-purple-600 to-rose-600 text-white font-bold shadow-lg shadow-purple-500/25 hover:brightness-110",
          border: "border-purple-500/30",
        };
      case "danger":
      default:
        return {
          icon: CustomIcon || ShieldAlert,
          iconBg: "bg-rose-500/20 text-rose-400 border-rose-500/30",
          btn: "bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold shadow-lg shadow-rose-600/30 hover:brightness-110",
          border: "border-rose-500/30",
        };
    }
  };

  const style = getVariantStyles();
  const IconComponent = style.icon;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none font-sans">
      <div
        className={`w-full max-w-md bg-[#0d111a] border ${style.border} rounded-3xl p-6 shadow-2xl space-y-5 animate-fade-in-up`}
      >
        <div className="flex items-start gap-3.5">
          <div className={`w-11 h-11 rounded-2xl ${style.iconBg} border flex items-center justify-center shrink-0`}>
            <IconComponent className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="text-base font-black text-white font-['Outfit']">{title}</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">{message}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-zinc-500 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2.5 pt-2 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${style.btn}`}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
