import React, { useState } from "react";

/**
 * Instagram-exact floating-label input field.
 *
 * Design spec (pixel-perfect Instagram web login, July 2026):
 *   • Height: 36px
 *   • Background: var(--input-bg) → #fafafa light / #121212 dark
 *   • Border: 1px solid var(--input-border) → #dbdbdb light / #363636 dark
 *   • Border-radius: 3px (Instagram signature — almost square)
 *   • Font: system-ui 12px, label 10px when floated
 *   • Focus: border darkens to var(--input-focus), no ring glow
 *   • Floating label: smooth 100ms ease-out transform + font-size change
 *   • Show/Hide password: text button, 14px semibold, right-aligned
 */
const VybeInput = ({
  id,
  label,
  type = "text",
  value,
  onChange,
  isPassword,
  showPassword,
  setShowPassword,
  required,
  autoFocus,
  suggestions,
  onSelectSuggestion,
  icon: Icon,
}) => {
  const [focused, setFocused] = useState(false);
  const isFilled = Boolean(value);
  const isFloated = focused || isFilled;

  return (
    <div className="vybe-input-wrapper">
      <div
        className={`vybe-input-shell ${focused ? "vybe-input-shell--focused" : ""}`}
      >
        {/* Optional leading icon (for search fields) */}
        {Icon && (
          <Icon
            className="vybe-input-icon"
            style={{
              width: 16,
              height: 16,
              flexShrink: 0,
              color: "var(--text-muted)",
              transition: "color 0.15s",
              ...(focused ? { color: "var(--text-secondary)" } : {}),
            }}
          />
        )}

        <div className="vybe-input-inner">
          {/* Floating label */}
          <label
            htmlFor={id}
            className={`vybe-input-label ${isFloated ? "vybe-input-label--floated" : ""}`}
          >
            {label}
          </label>

          {/* Actual input */}
          <input
            id={id}
            type={isPassword ? (showPassword ? "text" : "password") : type}
            value={value}
            onChange={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            required={required}
            autoFocus={autoFocus}
            autoComplete="off"
            className={`vybe-input-field ${isFloated ? "vybe-input-field--active" : ""}`}
          />
        </div>

        {/* Show / Hide toggle */}
        {isPassword && isFilled && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="vybe-input-toggle"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        )}
      </div>

      {/* Username Suggestions Dropdown */}
      {suggestions && suggestions.length > 0 && (
        <div className="vybe-input-suggestions">
          <div className="vybe-input-suggestions-header">
            <span>Suggested Usernames</span>
          </div>
          {suggestions.map((u, i) => (
            <div
              key={i}
              onClick={() => onSelectSuggestion(u)}
              className="vybe-input-suggestion-item"
            >
              <span>@{u}</span>
              <span className="vybe-input-suggestion-badge">Available</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VybeInput;
