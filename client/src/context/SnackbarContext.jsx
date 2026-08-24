import React, { useState, useCallback, useRef, useEffect } from "react";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Slide from "@mui/material/Slide";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X, RotateCcw } from "lucide-react";
import { SnackbarContext, setGlobalSnackbarEmitters } from "./snackbarStore";

// Slide transition direction
function SlideTransition({ onExited, ...props }) {
  return <Slide {...props} onExited={onExited} direction="up" />;
}

// Severity Icon Mapping
const SEVERITY_ICONS = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
  error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
  info: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
};

// Default Durations per Severity / Variant
const DURATION_MAP = {
  simple: 3000,
  success: 3200,
  info: 3500,
  warning: 4500,
  error: 5500,
  undo: 6000,
  action: 6000,
  persistent: null,
};

export const SnackbarProvider = ({ children }) => {
  const [snackPack, setSnackPack] = useState([]);
  const [open, setOpen] = useState(false);
  const [currentSnack, setCurrentSnack] = useState(undefined);

  // Recent notifications map to prevent duplicates (1.5s window)
  const recentMapRef = useRef(new Map());

  // Show Snackbar API
  const showSnackbar = useCallback((options) => {
    if (!options) return;

    const normalized = typeof options === "string" ? { message: options } : options;
    const {
      message = "",
      severity = "info",
      variant = "simple",
      duration,
      action,
      key = `${severity}-${message}-${Date.now()}`,
      preventDuplicate = true,
      onClose,
    } = normalized;

    // Normalizing error message strings
    let displayMessage = message;
    if (typeof message !== "string") {
      displayMessage = message?.message || String(message || "An unexpected event occurred");
    }

    // Deduplication check
    const dedupKey = `${severity}:${displayMessage}`;
    const now = Date.now();
    if (preventDuplicate) {
      const lastSeen = recentMapRef.current.get(dedupKey);
      if (lastSeen && now - lastSeen < 1500) {
        return; // Suppress duplicate within 1.5s
      }
      recentMapRef.current.set(dedupKey, now);
    }

    // Determine auto-hide duration
    const finalDuration = duration !== undefined ? duration : DURATION_MAP[variant] || DURATION_MAP[severity] || 4000;

    const item = {
      key,
      message: displayMessage,
      severity,
      variant,
      duration: finalDuration,
      action,
      onCloseCallback: onClose,
    };

    setSnackPack((prev) => [...prev, item]);
  }, []);

  const dismiss = useCallback((key) => {
    if (!key || (currentSnack && currentSnack.key === key)) {
      setOpen(false);
    } else {
      setSnackPack((prev) => prev.filter((item) => item.key !== key));
    }
  }, [currentSnack]);

  // Expose to global singleton
  useEffect(() => {
    setGlobalSnackbarEmitters(showSnackbar, dismiss);
    return () => {
      setGlobalSnackbarEmitters(null, null);
    };
  }, [showSnackbar, dismiss]);

  // Queue transition processor
  useEffect(() => {
    if (snackPack.length && !currentSnack) {
      // Set a new snack when we don't have an active one
      const timer = setTimeout(() => {
        setCurrentSnack({ ...snackPack[0] });
        setSnackPack((prev) => prev.slice(1));
        setOpen(true);
      }, 0);
      return () => clearTimeout(timer);
    } else if (snackPack.length && currentSnack && open) {
      // If a new one arrives while one is already open, close current to process next
      const timer = setTimeout(() => {
        setOpen(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [snackPack, currentSnack, open]);

  const handleClose = (event, reason) => {
    if (reason === "clickaway" && currentSnack?.variant === "persistent") {
      return; // Do not dismiss persistent on outside click
    }
    setOpen(false);
  };

  const handleExited = () => {
    if (currentSnack?.onCloseCallback) {
      try {
        currentSnack.onCloseCallback();
      } catch (e) {
        console.warn("Snackbar onClose error:", e);
      }
    }
    setCurrentSnack(undefined);
  };

  const handleActionClick = (e) => {
    if (currentSnack?.action?.onClick) {
      try {
        currentSnack.action.onClick(e);
      } catch (err) {
        console.warn("Snackbar action onClick error:", err);
      }
    }
    setOpen(false);
  };

  return (
    <SnackbarContext.Provider
      value={{
        showSnackbar,
        dismiss,
        success: (msg, opts) => showSnackbar({ message: msg, severity: "success", variant: "success", ...opts }),
        error: (msg, opts) => showSnackbar({ message: msg, severity: "error", variant: "error", ...opts }),
        warning: (msg, opts) => showSnackbar({ message: msg, severity: "warning", variant: "warning", ...opts }),
        info: (msg, opts) => showSnackbar({ message: msg, severity: "info", variant: "info", ...opts }),
        undo: (msg, onUndo, opts) =>
          showSnackbar({
            message: msg,
            severity: "success",
            variant: "undo",
            duration: 6000,
            action: { label: "UNDO", onClick: onUndo, icon: <RotateCcw className="w-3.5 h-3.5 mr-1" /> },
            ...opts,
          }),
        action: (msg, label, onAction, opts) =>
          showSnackbar({ message: msg, variant: "action", duration: 6000, action: { label, onClick: onAction }, ...opts }),
        persistent: (msg, opts) => showSnackbar({ message: msg, variant: "persistent", duration: null, ...opts }),
      }}
    >
      {children}

      {/* MUI SNACKBAR NOTIFICATION ENGINE */}
      <Snackbar
        key={currentSnack ? currentSnack.key : undefined}
        open={open}
        autoHideDuration={currentSnack ? currentSnack.duration : null}
        onClose={handleClose}
        TransitionComponent={SlideTransition}
        onTransitionExited={handleExited}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        sx={{
          zIndex: 10000,
          bottom: { xs: 84, sm: 28 }, // Respects mobile bottom navigation bar
          right: { xs: 16, sm: 28 },
          left: { xs: 16, sm: "auto" },
          maxWidth: { xs: "calc(100vw - 32px)", sm: 460 },
        }}
      >
        {currentSnack ? (
          <Alert
            elevation={6}
            variant="outlined"
            severity={["success", "error", "warning", "info"].includes(currentSnack.severity) ? currentSnack.severity : "info"}
            icon={currentSnack.variant === "simple" && !currentSnack.severity ? false : SEVERITY_ICONS[currentSnack.severity] || <Info className="w-5 h-5 text-blue-500 shrink-0" />}
            action={
              <div className="flex items-center gap-2 pl-2">
                {currentSnack.action && (
                  <Button
                    size="small"
                    onClick={handleActionClick}
                    sx={{
                      color: currentSnack.severity === "error" ? "#f43f5e" : currentSnack.severity === "success" ? "#10b981" : "#0095f6",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      padding: "4px 10px",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.06)",
                      "&:hover": {
                        background: "rgba(255, 255, 255, 0.12)",
                      },
                    }}
                  >
                    {currentSnack.action.icon}
                    {currentSnack.action.label}
                  </Button>
                )}
                <IconButton
                  size="small"
                  aria-label="close"
                  onClick={handleClose}
                  sx={{
                    color: "var(--text-secondary, #94a3b8)",
                    padding: "4px",
                    "&:hover": {
                      color: "var(--text, #ffffff)",
                      background: "rgba(255, 255, 255, 0.08)",
                    },
                  }}
                >
                  <X className="w-4 h-4" />
                </IconButton>
              </div>
            }
            sx={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 16px",
              borderRadius: "14px",
              background: "var(--surface-inset, #18181b)",
              backdropFilter: "blur(16px)",
              color: "var(--text, #f4f4f5)",
              border: "1px solid var(--border, rgba(255, 255, 255, 0.12))",
              boxShadow: "0 12px 36px -4px rgba(0, 0, 0, 0.45), 0 4px 12px rgba(0, 0, 0, 0.25)",
              fontFamily: "'Outfit', 'Inter', system-ui, -apple-system, sans-serif",
              fontSize: "0.875rem",
              fontWeight: 500,
              lineHeight: 1.45,
              wordBreak: "break-word",
              "& .MuiAlert-icon": {
                padding: 0,
                marginRight: 0,
                display: "flex",
                alignItems: "center",
              },
              "& .MuiAlert-message": {
                padding: "2px 0",
                display: "flex",
                alignItems: "center",
                flex: 1,
                fontWeight: 500,
                letterSpacing: "-0.01em",
              },
              "& .MuiAlert-action": {
                padding: 0,
                marginRight: 0,
                alignItems: "center",
              },
            }}
          >
            {currentSnack.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </SnackbarContext.Provider>
  );
};

export default SnackbarProvider;
