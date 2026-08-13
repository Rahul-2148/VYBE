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
          <div className="relative w-full h-[52px] bg-surface border border-border focus-within:border-rose-500/80 rounded-xl px-3.5 flex items-center transition">
            <span className="text-xs font-bold text-rose-500 mr-1">@</span>
            <input
              type="text"
              placeholder="username"
              className="w-full bg-transparent text-xs text-text outline-none font-medium placeholder-text-muted"
              value={googleUsername}
              onChange={(e) => {
                const val = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "");
                setGoogleUsername(val);
                if (fetchUsernameSuggestions) fetchUsernameSuggestions(val);
              }}
            />
          </div>

          {/* Suggestions Dropdown */}
          {usernameSuggestions.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-2 space-y-1">
              <div className="flex items-center gap-1 text-[10px] font-semibold text-text-secondary px-2 py-0.5 uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-rose-500" />
                <span>Suggested handles</span>
              </div>
              {usernameSuggestions.map((u, i) => (
                <div
                  key={i}
                  className="px-3 py-2 hover:bg-surface-hover rounded-lg cursor-pointer text-xs font-medium text-text flex items-center justify-between transition"
                  onClick={() => {
                    setGoogleUsername(u);
                    if (setUsernameSuggestions) setUsernameSuggestions([]);
                  }}
                >
                  <span>@{u}</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">Available</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            className="px-4 py-2.5 rounded-xl border border-border text-xs font-semibold text-text hover:text-text hover:bg-surface transition"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:opacity-95 text-text font-semibold text-xs rounded-xl shadow-lg flex items-center justify-center min-w-[100px] transition disabled:opacity-50"
            onClick={handleSubmit}
            disabled={googleLoading || !googleUsername.trim()}
          >
            {googleLoading ? <ClipLoader size={16} color="white" /> : "Complete Signup"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleUsernameModal;
