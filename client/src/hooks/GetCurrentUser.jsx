import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setUserData, setAuthInitialized } from "../redux/features/userSlice";
import api from "../lib/axios";
import { addLinkedAccount, setActiveAccountId } from "../lib/accountManager";

const GetCurrentUser = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    let active = true;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    // Load cached session for instant zero-flash startup
    try {
      const cached = localStorage.getItem("vybe_cached_user");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && (parsed._id || parsed.userName)) {
          dispatch(setUserData(parsed));
        }
      }
    } catch (e) {
      console.warn("GetCurrentUser: failed to read cached user", e);
    }

    const fetchUser = async () => {
      try {
        const result = await api.get("/user/current-user");
        if (!active) return;

        if (result.data?.user) {
          try {
            localStorage.setItem("vybe_cached_user", JSON.stringify(result.data.user));
          } catch (e) {
            console.warn("GetCurrentUser: failed to write cached user", e);
          }
          dispatch(setUserData(result.data.user));
          dispatch(setAuthInitialized(true));

          // Sync multi-account registry
          addLinkedAccount(result.data.user);
          setActiveAccountId(result.data.user._id);
        } else {
          try {
            localStorage.removeItem("vybe_cached_user");
          } catch (e) {
            console.warn("GetCurrentUser: failed to remove cached user", e);
          }
          dispatch(setUserData(null));
          dispatch(setAuthInitialized(true));
        }
      } catch (error) {
        if (!active) return;

        const isNetworkError =
          !error.response || error.code === "ERR_NETWORK" || error.message === "Network Error";
        const isServerError = error.response?.status >= 500;
        const isRateLimit = error.response?.status === 429;

        if ((isNetworkError || isServerError || isRateLimit) && retryCount < MAX_RETRIES) {
          retryCount++;
          console.warn(`Connection to server failed. Retrying initial auth check (${retryCount}/${MAX_RETRIES})...`);
          setTimeout(fetchUser, 1500);
        } else {
          // If 401/403 or network retries exhausted, clear invalid cache & set unauthenticated state
          const isAuthRevoked = error.response?.status === 401 || error.response?.status === 403;
          if (isAuthRevoked) {
            try {
              localStorage.removeItem("vybe_cached_user");
            } catch (e) {
              console.warn("GetCurrentUser: failed to remove cached user on auth revoke", e);
            }
            dispatch(setUserData(null));
          }
          dispatch(setAuthInitialized(true));
        }
      }
    };

    fetchUser();

    return () => {
      active = false;
    };
  }, [dispatch]);

  return null;
};

export default GetCurrentUser;
