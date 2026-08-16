import { api } from "../../lib/axios";

/**
 * Custom baseQuery using our configured axios instance.
 * Automatically inherits:
 * - Silent 401 token refresh interceptors
 * - HttpOnly cookie / withCredentials support
 * - Offline / Retry handling
 */
export const axiosBaseQuery =
  ({ baseUrl } = { baseUrl: "" }) =>
  async ({ url, method = "GET", data, params, headers }) => {
    try {
      const result = await api({
        url: baseUrl + url,
        method,
        data,
        params,
        headers,
      });
      return { data: result.data };
    } catch (axiosError) {
      return {
        error: {
          status: axiosError.response?.status,
          data: axiosError.response?.data || { message: axiosError.message },
        },
      };
    }
  };

export default axiosBaseQuery;
