import { createContext, useContext } from "react";

export const SnackbarContext = createContext(null);

let globalShowSnackbar = null;
let globalDismissSnackbar = null;

export const setGlobalSnackbarEmitters = (show, dismiss) => {
  globalShowSnackbar = show;
  globalDismissSnackbar = dismiss;
};

export const snackbar = (message, options = {}) => {
  if (typeof message === "object" && message !== null) {
    return snackbar.show(message);
  }
  return snackbar.show({ message, ...options });
};

snackbar.show = (options) => {
  if (globalShowSnackbar) return globalShowSnackbar(options);
  console.warn("SnackbarProvider is not mounted yet.");
};

snackbar.simple = (message, options = {}) => {
  return snackbar.show({ message, severity: "info", variant: "simple", ...options });
};

snackbar.success = (message, options = {}) => {
  return snackbar.show({ message, severity: "success", variant: "success", ...options });
};

snackbar.error = (message, options = {}) => {
  return snackbar.show({ message, severity: "error", variant: "error", ...options });
};

snackbar.warning = (message, options = {}) => {
  return snackbar.show({ message, severity: "warning", variant: "warning", ...options });
};

snackbar.info = (message, options = {}) => {
  return snackbar.show({ message, severity: "info", variant: "info", ...options });
};

snackbar.loading = (message, options = {}) => {
  return snackbar.show({ message, severity: "info", variant: "info", duration: 8000, ...options });
};

snackbar.undo = (message, onUndo, options = {}) => {
  return snackbar.show({
    message,
    severity: "success",
    variant: "undo",
    duration: 6000,
    action: {
      label: "UNDO",
      onClick: onUndo,
    },
    ...options,
  });
};

snackbar.action = (message, actionLabel, onAction, options = {}) => {
  return snackbar.show({
    message,
    variant: "action",
    action: {
      label: actionLabel,
      onClick: onAction,
    },
    ...options,
  });
};

snackbar.persistent = (message, options = {}) => {
  return snackbar.show({
    message,
    variant: "persistent",
    duration: null,
    ...options,
  });
};

snackbar.dismiss = (key) => {
  if (globalDismissSnackbar) globalDismissSnackbar(key);
};

export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) {
    return snackbar;
  }
  return context;
};
