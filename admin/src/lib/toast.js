let toastListeners = [];

export const toast = {
  success: (msg) => notify(msg, "success"),
  error: (msg) => notify(msg, "error"),
  info: (msg) => notify(msg, "info"),
  warning: (msg) => notify(msg, "warning"),
  subscribe: (fn) => {
    toastListeners.push(fn);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== fn);
    };
  },
};

const notify = (message, type) => {
  const id = Date.now() + Math.random();
  toastListeners.forEach((fn) => fn({ id, message, type }));
};
