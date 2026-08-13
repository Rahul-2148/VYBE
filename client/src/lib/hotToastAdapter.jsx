import React from "react";
import { toast as sonnerToast, Toaster as SonnerToaster } from "sonner";

// High-fidelity Sonner toast wrapper that matches react-hot-toast API signature
const toast = (message, options) => {
  return sonnerToast(message, options);
};

toast.success = (message, options) => sonnerToast.success(message, options);
toast.error = (message, options) => sonnerToast.error(message, options);
toast.info = (message, options) => sonnerToast.info(message, options);
toast.warning = (message, options) => sonnerToast.warning(message, options);
toast.loading = (message, options) => sonnerToast.loading(message, options);
toast.dismiss = (id) => sonnerToast.dismiss(id);

// Pre-styled Toaster matching custom dark/light premium theme styles
export const Toaster = (props) => {
  return (
    <SonnerToaster
      position="bottom-right"
      richColors
      closeButton
      theme="system"
      toastOptions={{
        style: {
          borderRadius: "16px",
          padding: "14px 18px",
          fontSize: "13px",
          fontWeight: "600",
          fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
          background: "var(--surface-inset)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          boxShadow: "0 12px 36px rgba(0, 0, 0, 0.25)",
        },
      }}
      {...props}
    />
  );
};

export { toast };
export default toast;
