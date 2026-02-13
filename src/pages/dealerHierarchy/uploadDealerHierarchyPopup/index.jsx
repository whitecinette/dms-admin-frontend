// Upload Schemes
import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import config from "../../../config.js";
import "./style.scss";

const backendUrl = config.backend_url;

function UploadDealerHierarchyPopup({ close }) {
  const [sheetsData, setSheetsData] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const fileExt = file.name.split(".").pop().toLowerCase();

      if (fileExt === "csv") {
        const text = event.target.result;
        const workbook = XLSX.read(text, { type: "string" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        setSheetsData([
          {
            name: file.name.replace(".csv", ""),
            data: json,
            label: "",
            type: "Credit Note Voucher",
            startDate: "2025-05-18",
            endDate: "2025-05-18",
          },
        ]);
      } else {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        const parsedSheets = workbook.SheetNames.map((name) => {
          const worksheet = workbook.Sheets[name];
          const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          return {
            name,
            data: json,
            label: "",
            type: "Credit Note Voucher",
            startDate: "2025-05-18",
            endDate: "2025-05-18",
          };
        });

        setSheetsData(parsedSheets);
      }
    };

    file.name.endsWith(".csv")
      ? reader.readAsText(file)
      : reader.readAsArrayBuffer(file);
  };

  const resetUpload = () => {
    setSheetsData([]);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  const removeSheet = (sheetName) => {
    setSheetsData((prev) => prev.filter((s) => s.name !== sheetName));
    setSelectedFile(null);
  };

  const handleUploadAll = async () => {
    if (!selectedFile) return alert("No file selected");

    const formData = new FormData();
    formData.append("file", selectedFile);

    setIsUploading(true); // Start loader

    try {
      const res = await fetch(`${backendUrl}/dealer-hierarchy/upload`, {
        method: "POST",
        body: formData,
                    headers: {
              Authorization: localStorage.getItem("authToken"),
            },
      });

      const result = await res.json();

      if (!res.ok) {
        console.error("Upload failed:", result.message || result.error);
        alert("Upload failed: " + (result.message || "Unknown error"));
      } else {
        console.log("✅ Upload successful:", result);
        alert(`Upload successful. Sheets inserted`);
        resetUpload();
      }
    } catch (err) {
      console.error("Error uploading file:", err);
      alert("Upload failed due to network or server error.");
    } finally {
      setIsUploading(false); // Stop loader
      close();
    }
  };

  return (
    <div className="upload-popup-overlay" onClick={() => close()}>
      <div
        className="UploadPopup-upload-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="upload-header">
          {sheetsData.length > 0 && (
            <button className="reset-btn" onClick={resetUpload}>
              ❌ Clear All
            </button>
          )}
        </div>

        <div className="upload-instructions">
          <h3>🏃‍♂️ Steps</h3>
          <ul>
            <li>
              Download the CSV file using the{" "}
              <strong>Download CSV Format</strong> button.
            </li>
            <li>
              ⚠️ Do <strong>not</strong> change any of the headers in the
              downloaded CSV file.
            </li>
            <li>
              Fill in all the data you want to upload in the given CSV file.
            </li>
            <li>Upload the file below.</li>
            <li>Review your file before uploading.</li>
          </ul>
        </div>

        <div className="upload-box">
          <label htmlFor="file-upload">
            <p>📁 Click to upload or drag your CSV file here</p>
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFile}
            ref={fileInputRef}
          />

          {selectedFile && (
            <div className="selected-file">
              <span>{selectedFile.name}</span>
            </div>
          )}
        </div>

        <div className="sheet-preview-wrapper">
          {sheetsData.map((sheet, idx) => (
            <div className="sheet-preview-card" key={idx}>
              <div className="sheet-header">
                <div>
                  <h4>{sheet.name}</h4>
                  <p style={{ fontSize: "12px", margin: 0, textAlign: "left" }}>
                    Total Rows: {sheet.data.length - 1}
                  </p>
                </div>
                <button onClick={() => removeSheet(sheet.name)}>❌</button>
              </div>

              <div className="sheet-table">
                <table>
                  <thead>
                    <tr>
                      {sheet.data[0]?.map((col, i) => (
                        <th key={i}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.data.slice(1, 6).map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {sheetsData.length > 0 && (
          <button
            className="upload-all-btn"
            onClick={handleUploadAll}
            disabled={isUploading}
          >
            {isUploading ? "⏳ Uploading..." : "📤 Upload All Sheets"}
          </button>
        )}

        {isUploading && <div className="loader">Uploading... Please wait</div>}
      </div>
    </div>
  );
}

export default UploadDealerHierarchyPopup;
