import React, { useState } from "react";

/**
 * Ultra-Professional Floating-Label Input Field
 *
 * Design Spec:
 *   • Height: 54px (spacious, ergonomic, easy tap target)
 *   • Background: var(--surface)
 *   • Border: 1px solid var(--border) → transitions to var(--primary) on focus
 *   • Border-radius: 14px
 *   • Font: 15px for input text (comfortable & prevents mobile iOS auto-zoom)
 *   • Floating label: sits at 7px with 11px font-size when active
 *   • Focus: smooth 3.5px primary-muted ring glow
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
        className={`vybe-input-shell ${focused ? "vybe-input-shell--focused" : ""} ${isFloated ? "vybe-input-shell--floated" : ""}`}
      >
        {/* Notched Floating Label sitting on top border */}
        <label
          htmlFor={id}
          className={`vybe-input-label ${isFloated ? "vybe-input-label--floated" : ""} ${focused ? "vybe-input-label--focused" : ""}`}
        >
          {label}
        </label>

        {/* Optional leading icon (for search fields) */}
        {Icon && (
          <Icon
            className="vybe-input-icon"
            style={{
              width: 18,
              height: 18,
              flexShrink: 0,
              color: focused ? "var(--primary)" : "var(--text-muted)",
              transition: "color 0.18s",
            }}
          />
        )}

        <div className="vybe-input-inner">
          {/* Actual input — perfectly centered */}
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
            className="vybe-input-field"
          />
        </div>

        {/* Show / Hide toggle */}
        {isPassword && isFilled && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="vybe-input-toggle"
            title={showPassword ? "Hide password" : "Show password"}
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

