import React from "react";
import { Toaster as SonnerToaster } from "sonner";

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

export default Toaster;
