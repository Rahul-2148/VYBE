import { toast as sonnerToast } from "sonner";

const toast = (message, options) => {
  return sonnerToast(message, options);
};

toast.success = (message, options) => sonnerToast.success(message, options);
toast.error = (message, options) => sonnerToast.error(message, options);
toast.info = (message, options) => sonnerToast.info(message, options);
toast.warning = (message, options) => sonnerToast.warning(message, options);
toast.loading = (message, options) => sonnerToast.loading(message, options);
toast.dismiss = (id) => sonnerToast.dismiss(id);

export default toast;
