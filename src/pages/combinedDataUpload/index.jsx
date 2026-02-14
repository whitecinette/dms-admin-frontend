import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";

import "./style.scss";
import config from "../../config";

const backendUrl = config.backend_url;

function CombinedDataUpload() {
  const [activationFile, setActivationFile] = useState(null);
  const [secondaryFile, setSecondaryFile] = useState(null);
  const [tertiaryFile, setTertiaryFile] = useState(null);
  const [combinedFile, setCombinedFile] = useState(null);

  const [previewData, setPreviewData] = useState({
    activation: null,
    secondary: null,
    tertiary: null,
  });

  const [loading, setLoading] = useState(false);

  const fileInputRefs = {
    activation: useRef(),
    secondary: useRef(),
    tertiary: useRef(),
    combined: useRef(),
  };

  // =============================
  // FILE HANDLER
  // =============================

  const handleFile = (file, type) => {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      // SINGLE FILE
      if (type !== "combined") {
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        setPreviewData((prev) => ({
          ...prev,
          [type]: json,
        }));
      }

      // COMBINED FILE
      if (type === "combined") {
        workbook.SheetNames.forEach((name) => {
          const sheet = workbook.Sheets[name];
          const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

          const lower = name.toLowerCase().trim();

          if (lower === "activation") {
            setPreviewData((prev) => ({ ...prev, activation: json }));
            setActivationFile(file);
          }

          if (lower === "secondary") {
            setPreviewData((prev) => ({ ...prev, secondary: json }));
            setSecondaryFile(file);
          }

          if (lower === "tertiary") {
            setPreviewData((prev) => ({ ...prev, tertiary: json }));
            setTertiaryFile(file);
          }
        });
      }
    };

    reader.readAsArrayBuffer(file);

    if (type === "activation") setActivationFile(file);
    if (type === "secondary") setSecondaryFile(file);
    if (type === "tertiary") setTertiaryFile(file);
    if (type === "combined") setCombinedFile(file);
  };

  // =============================
  // UPLOAD FUNCTION
  // =============================

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${backendUrl}/combined-data-upload`, {
      method: "POST",
      headers: {
        Authorization: localStorage.getItem("authToken"),
      },
      body: formData,
    });

    return res.json();
  };

  const handleUpload = async () => {
    setLoading(true);
    try {
      if (combinedFile) {
        await uploadFile(combinedFile);
        alert("Combined upload successful");
      } else {
        if (activationFile) await uploadFile(activationFile);
        if (secondaryFile) await uploadFile(secondaryFile);
        if (tertiaryFile) await uploadFile(tertiaryFile);
        alert("Upload successful");
      }
    } catch (err) {
      alert("Upload failed");
    }
    setLoading(false);
  };

  // =============================
  // UI
  // =============================

  const renderPreview = (data) => {
    if (!data) return null;

    return (
      <div className="preview-table">
        <table>
          <thead>
            <tr>
              {data[0]?.map((col, i) => (
                <th key={i}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(1, 6).map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div
      className="combined-upload-page"
      style={{
        backgroundImage: `url("/images/your-bg.jpg")`,
      }}
    >
      <div className="content-wrapper">
        <h2>📊 Combined Data Upload</h2>

        <div className="instructions">
          <h3>🏃 Steps</h3>
          <ul>
            <li>Download the correct Excel format.</li>
            <li>⚠️ Do not change header names.</li>
            <li>Upload Activation / Secondary / Tertiary separately</li>
            <li>OR upload a combined Excel file with 3 sheets</li>
            <li>Only one month per file is allowed.</li>
          </ul>
        </div>

        {/* Upload Cards */}
        <div className="upload-grid">
          {["activation", "secondary", "tertiary"].map((type) => (
            <div key={type} className="upload-card">
              <h4>{type.toUpperCase()}</h4>

              <input
                type="file"
                accept=".xlsx"
                hidden
                ref={fileInputRefs[type]}
                onChange={(e) =>
                  handleFile(e.target.files[0], type)
                }
              />

              <div
                className="drop-zone"
                onClick={() => fileInputRefs[type].current.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFile(e.dataTransfer.files[0], type);
                }}
              >
                📁 Drag & Drop or Click
              </div>

              {renderPreview(previewData[type])}
            </div>
          ))}
        </div>

        {/* Combined Upload */}
        <div className="combined-section">
          <h3>📦 Upload Combined Sheet</h3>

          <input
            type="file"
            accept=".xlsx"
            hidden
            ref={fileInputRefs.combined}
            onChange={(e) =>
              handleFile(e.target.files[0], "combined")
            }
          />

          <div
            className="combined-drop"
            onClick={() => fileInputRefs.combined.current.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFile(e.dataTransfer.files[0], "combined");
            }}
          >
            Drop Combined Excel Here
          </div>
        </div>

        <button
          className="upload-btn"
          onClick={handleUpload}
          disabled={loading}
        >
          {loading ? "Uploading..." : "🚀 Upload Data"}
        </button>
      </div>
    </div>
  );
}

export default CombinedDataUpload;
