import React from "react";
import "./style.scss";

const TextToggle = ({ textFirst, textSecond, setText, selectedText, classStyle }) => {
  const handleToggle = (value) => {
    setText(value);
  };

  function formatToggleText(text) {
    if (!text) return "";
    if (text === "extractionReport") return "Extraction Report";
    // Convert camelCase to words and capitalize each word
    return text
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .replace(/\b\w/g, (str) => str.toUpperCase())
      .trim();
  }

  return (
    <div className="toggle-wrapper" role="group" aria-label="Toggle switch">
      <div className="toggle-container" style={classStyle}>
        <button
          className={`toggle-option ${
            selectedText === textFirst ? "active" : ""
          }`}
          onClick={() => handleToggle(textFirst)}
          role="radio"
          aria-checked={selectedText === textFirst}
          tabIndex={selectedText === textFirst ? 0 : -1}
        >
          {formatToggleText(textFirst)}
        </button>
        <button
          className={`toggle-option ${
            selectedText === textSecond ? "active" : ""
          }`}
          onClick={() => handleToggle(textSecond)}
          role="radio"
          aria-checked={selectedText === textSecond}
          tabIndex={selectedText === textSecond ? 0 : -1}
        >
          {formatToggleText(textSecond)}
        </button>
        <div
          className="toggle-slider"
          style={{
            transform:
              selectedText === textFirst
                ? "translateX(0%)"
                : "translateX(100%)",
          }}
        />
      </div>
    </div>
  );
};

export default TextToggle;
