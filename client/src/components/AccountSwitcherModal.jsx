import React, { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { snackbar } from "../lib/snackbar";
import { X, Check, Plus, LogIn, UserPlus, Loader2, Trash2, Sun, Moon } from "lucide-react";
import dp from "../assets/dp3.png";
import api from "../lib/axios";
import { setUserData } from "../redux/features/userSlice";
import { useTheme } from "../lib/themeContext";
import {
  getLinkedAccounts,
  removeLinkedAccount,
  setActiveAccountId,
  addLinkedAccount,
} from "../lib/accountManager";
import { disconnectSocket, initializeSocket } from "../lib/socket";

const AccountSwitcherModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userData } = useSelector((state) => state.user);
  const currentUserId = userData?.user?._id || userData?._id;

  const [accounts, setAccounts] = useState(() => getLinkedAccounts());
  const [switching, setSwitching] = useState(null); // userId being switched to
  const [removingId, setRemovingId] = useState(null);

  const themeCtx = useTheme();

  // Load linked accounts when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setAccounts(getLinkedAccounts());
        setSwitching(null);
        setRemovingId(null);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle switching to another account
  const handleSwitch = useCallback(
    async (targetUserId) => {
      if (targetUserId === currentUserId) return;
      if (switching) return;

      setSwitching(targetUserId);

      try {
        const res = await api.post("/auth/switch-account", { targetUserId });

        if (res.data?.success && res.data?.user) {
          // Disconnect old socket
          disconnectSocket();

          // Update Redux
          dispatch(setUserData(res.data.user));

          // Update active account marker
          setActiveAccountId(res.data.user._id);

          // Sync registry with fresh data
          addLinkedAccount(res.data.user);

          // Update cached user
          try {
            localStorage.setItem("vybe_cached_user", JSON.stringify(res.data.user));
          } catch (e) {
            console.warn("AccountSwitcherModal: failed to write cached user", e);
          }

          // Reconnect socket with new user
          const newUserId = res.data.user._id;
          if (newUserId) {
            initializeSocket(newUserId);
          }

          snackbar.success(res.data.message || `Switched to @${res.data.user.userName}`);
          onClose();

          // Navigate to home to reset all page state
          navigate("/", { replace: true });
        }
      } catch (err) {
        const code = err.response?.data?.code;
        const msg = err.response?.data?.message || "Failed to switch account";

        if (code === "NEEDS_RELOGIN") {
          // Session expired for this account — remove from registry and prompt re-login
          removeLinkedAccount(targetUserId);
          setAccounts((prev) => prev.filter((a) => a.userId !== targetUserId));
          snackbar.error("Session expired for this account. Please log in again.");
        } else {
          snackbar.error(msg);
        }
      } finally {
        setSwitching(null);
      }
    },
    [currentUserId, switching, dispatch, navigate, onClose]
  );

  // Handle removing an account from the registry
  const handleRemoveAccount = useCallback(
    (e, userId) => {
      e.stopPropagation();
      if (userId === currentUserId) {
        snackbar.error("Cannot remove the active account");
        return;
      }
      setRemovingId(userId);
      removeLinkedAccount(userId);
      setAccounts((prev) => prev.filter((a) => a.userId !== userId));
      snackbar.success("Account removed from list");
      setTimeout(() => setRemovingId(null), 300);
    },
    [currentUserId]
  );

  // Handle "Log into existing account"
  const handleAddExistingAccount = useCallback(() => {
    onClose();
    navigate("/signin?addAccount=true");
  }, [onClose, navigate]);

  // Handle "Create new account"
  const handleCreateNewAccount = useCallback(() => {
    onClose();
    navigate("/signup?addAccount=true");
  }, [onClose, navigate]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-[10000]">
        <div
          className="bg-surface border border-border rounded-t-2xl sm:rounded-2xl w-full sm:w-[400px] sm:max-h-[80vh] shadow-2xl animate-in slide-in-from-bottom duration-300 sm:animate-in sm:zoom-in-95 sm:duration-200 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-base font-bold text-text">Switch Account</h2>
            
            <div className="flex items-center gap-2">
              {/* Pro-UX Quick Theme Toggle with Circular Ripple Animation */}
              <button
                onClick={(e) => themeCtx?.toggleThemeWithTransition?.(e)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-hover hover:bg-surface-active border border-border text-text text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-95 shadow-sm"
                title={`Switch to ${themeCtx?.resolvedTheme === "dark" ? "Light" : "Dark"} Mode`}
              >
                {themeCtx?.resolvedTheme === "dark" ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Dark</span>
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-hover-overlay text-text-secondary hover:text-text transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Drag handle for mobile */}
          <div className="sm:hidden flex justify-center pt-1 pb-0">
            <div className="w-10 h-1 rounded-full bg-border-strong/40" />
          </div>

          {/* Accounts list */}
          <div className="max-h-[360px] overflow-y-auto hide-scrollbar">
            {accounts.length === 0 ? (
              <div className="px-5 py-8 text-center text-text-muted text-sm">
                No linked accounts yet.
              </div>
            ) : (
              accounts.map((account) => {
                const isActive = account.userId === currentUserId;
                const isSwitching = switching === account.userId;

                return (
                  <div
                    key={account.userId}
                    onClick={() => !isActive && handleSwitch(account.userId)}
                    className={`flex items-center gap-3 px-5 py-3.5 transition-colors group ${
                      isActive
                        ? "bg-accent/5 cursor-default"
                        : "hover:bg-hover-overlay cursor-pointer"
                    } ${isSwitching ? "opacity-70 pointer-events-none" : ""}`}
                  >
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-full overflow-hidden border-2 shrink-0 ${
                      isActive ? "border-accent" : "border-border"
                    }`}>
                      <img
                        src={account.profileImageUrl || dp}
                        alt={account.userName}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-text truncate">
                          {account.userName}
                        </span>
                        {isActive && (
                          <Check className="w-4 h-4 text-accent shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-text-secondary truncate block">
                        {account.name}
                      </span>
                    </div>

                    {/* Right side actions */}
                    <div className="shrink-0 flex items-center gap-2">
                      {isSwitching && (
                        <Loader2 className="w-4.5 h-4.5 text-accent animate-spin" />
                      )}
                      {!isActive && !isSwitching && (
                        removingId === account.userId ? (
                          <Loader2 className="w-3.5 h-3.5 text-red-500 animate-spin" />
                        ) : (
                          <button
                            onClick={(e) => handleRemoveAccount(e, account.userId)}
                            className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-text-muted hover:text-red-500 transition-all cursor-pointer"
                            title="Remove from list"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Actions */}
          <div className="border-t border-border px-5 py-3 space-y-1.5">
            <button
              onClick={handleAddExistingAccount}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-hover-overlay transition-colors cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition shrink-0">
                <LogIn className="w-5 h-5 text-accent" />
              </div>
              <span className="text-sm font-semibold text-accent">
                Log into existing account
              </span>
            </button>

            <button
              onClick={handleCreateNewAccount}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-hover-overlay transition-colors cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-full bg-surface-alt flex items-center justify-center group-hover:bg-border/40 transition shrink-0">
                <UserPlus className="w-5 h-5 text-text-secondary" />
              </div>
              <span className="text-sm font-semibold text-text-secondary">
                Create new account
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AccountSwitcherModal;
