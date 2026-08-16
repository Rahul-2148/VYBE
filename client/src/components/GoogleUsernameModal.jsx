import React from "react";
import { ClipLoader } from "react-spinners";
import { User, Sparkles, X } from "lucide-react";

export const GoogleUsernameModal = ({
  googleUsername,
  setGoogleUsername,
  usernameSuggestions = [],
  setUsernameSuggestions,
  googleLoading,
  handleSubmit,
  onClose,
  fetchUsernameSuggestions,
}) => {
  return (
    <div className="fixed inset-0 bg-surface-overlay backdrop-blur-md flex justify-center items-center z-[999] p-4">
      <div className="bg-surface-inset border border-border rounded-3xl p-6 w-full max-w-md flex flex-col gap-5 shadow-2xl relative text-text">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-text-secondary hover:text-text rounded-full hover:bg-surface transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
            <User className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-text tracking-tight">Choose Your Handle</h2>
          <p className="text-xs text-text-secondary">
            Welcome! Select a unique username for your new VYBE account to complete Google signup.
          </p>
        </div>

        <div className="space-y-2">
          <div className="relative w-full h-[54px] bg-surface border border-border focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/10 rounded-2xl px-4 flex items-center transition shadow-xs">
            <span className="text-sm font-bold text-primary mr-1.5">@</span>
            <input
              type="text"
              placeholder="username"
              className="w-full bg-transparent text-sm text-text outline-none font-medium placeholder:text-text-muted"
              value={googleUsername}
              onChange={(e) => {
                const val = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "");
                setGoogleUsername(val);
                if (fetchUsernameSuggestions) fetchUsernameSuggestions(val);
              }}
              autoFocus
            />
          </div>

          {/* Suggestions Dropdown */}
          {usernameSuggestions.length > 0 && (
            <div className="bg-surface border border-border rounded-2xl p-2 space-y-1 shadow-md">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-secondary px-2 py-1 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Suggested handles</span>
              </div>
              {usernameSuggestions.map((u, i) => (
                <div
                  key={i}
                  className="px-3 py-2.5 hover:bg-surface-hover rounded-xl cursor-pointer text-xs font-semibold text-text flex items-center justify-between transition"
                  onClick={() => {
                    setGoogleUsername(u);
                    if (setUsernameSuggestions) setUsernameSuggestions([]);
                  }}
                >
                  <span>@{u}</span>
                  <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">Available</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            className="px-4 py-2.5 rounded-xl border border-border text-xs font-semibold text-text hover:text-text hover:bg-surface transition cursor-pointer"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className="px-5 py-2.5 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            onClick={handleSubmit}
            disabled={googleLoading || !googleUsername.trim()}
          >
            {googleLoading ? <ClipLoader size={16} color="#ffffff" /> : "Complete Signup"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleUsernameModal;
