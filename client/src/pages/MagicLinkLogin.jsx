import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { snackbar } from "../lib/snackbar";
import api from "../lib/axios";
import { useDispatch } from "react-redux";
import { setUserData } from "../redux/features/userSlice";
import { addLinkedAccount, setActiveAccountId } from "../lib/accountManager";

export const MagicLinkLogin = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [status, setStatus] = useState("verifying"); // 'verifying', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setStatus("error");
        setErrorMessage("Magic login token is missing.");
        return;
      }

      try {
        const res = await api.post("/auth/magic-link/verify", { token });
        if (res.data.success) {
          setStatus("success");
          const loggedInUser = res.data.user;
          if (loggedInUser) {
            dispatch(setUserData(loggedInUser));
            addLinkedAccount(loggedInUser);
            setActiveAccountId(loggedInUser._id);
          }
          snackbar.success(res.data.message || "Magic Link Login Successful!");
          setTimeout(() => navigate("/", { replace: true }), 1200);
        }
      } catch (err) {
        setStatus("error");
        setErrorMessage(err.response?.data?.message || "Invalid or expired Magic Link.");
      }
    };

    verifyToken();
  }, [token, navigate, dispatch]);

  return (
    <div className="min-h-screen bg-bg text-text flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-surface border border-border p-8 rounded-2xl shadow-2xl text-center space-y-6"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 flex items-center justify-center mx-auto shadow-lg">
          <Sparkles className="w-8 h-8 text-text animate-pulse" />
        </div>

        {status === "verifying" && (
          <div className="space-y-3">
            <h2 className="text-2xl font-bold tracking-tight">Authenticating...</h2>
            <p className="text-sm text-text-secondary">Verifying your secure Magic Login Link.</p>
            <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mt-4" />
          </div>
        )}

        {status === "success" && (
          <div className="space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h2 className="text-2xl font-bold tracking-tight text-emerald-400">Welcome Back!</h2>
            <p className="text-sm text-text-secondary">Magic Link verified. Redirecting to your feed...</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h2 className="text-2xl font-bold tracking-tight text-rose-500">Verification Failed</h2>
            <p className="text-sm text-text-secondary">{errorMessage}</p>

            <button
              onClick={() => navigate("/signin")}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-600 font-semibold rounded-xl text-sm transition shadow-lg mt-2"
            >
              Back to Sign In
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default MagicLinkLogin;
