// Upload Schemes 
import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import config from "../../../config.js";
import "./style.scss";

const backendUrl = config.backend_url;

function FinanceDataUpload() {
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
  };

  const handleUploadAll = async () => {
    if (!selectedFile) return alert("No file selected");

    const formData = new FormData();
    formData.append("file", selectedFile);

    setIsUploading(true); // Start loader

    try {
      const res = await fetch(`${backendUrl}/finance/upload-data`, {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        console.error("Upload failed:", result.message || result.error);
        alert("Upload failed: " + (result.message || "Unknown error"));
      } else {
        console.log("✅ Upload successful:", result);
        alert(`Upload successful. Sheets inserted: ${result.inserted}`);
        resetUpload();
      }
    } catch (err) {
      console.error("Error uploading file:", err);
      alert("Upload failed due to network or server error.");
    } finally {
    setIsUploading(false); // Stop loader
  }
  };


  return (
    <div className="finance-upload-container">
      <div className="upload-header">
        <h2>Scheme & Working Upload</h2>
        {sheetsData.length > 0 && (
          <button className="reset-btn" onClick={resetUpload}>
            ❌ Clear All
          </button>
        )}
      </div>

      <div className="upload-instructions">
        <h3>💡 How to Name the Finance File</h3>
        <ul>
          <li><strong>File name format:</strong> <code>[SchemeName]_[StartDate]_to_[EndDate].xlsx</code></li>
          <li>Use <strong>DD-MM-YYYY</strong> date format</li>
          <li>Replace spaces with <code>_</code></li>
          <li>Use <code>_and_</code> instead of <code>&</code>, avoid special characters</li>
          <li><strong>✅ Example:</strong><br />
            <code>Scheme_5.2_and_5.3_RCM_Additional_SDP_Payout_01-04-2025_to_30-04-2025.xlsx</code>
          </li>
        </ul>
        <h3>Allowed Sheet Names (case-insensitive):</h3>
        <ul>
          <li><code>Credit Note Voucher</code> → <strong>credit / main</strong></li>
          <li><code>Debit Note Voucher</code> → <strong>debit / main</strong></li>
          <li><code>Credit Note Working</code> → <strong>credit / sub</strong></li>
          <li><code>Debit Note Working</code> → <strong>debit / sub</strong></li>
        </ul>
        <p>
          ✔ You can include both main and working sheets.<br />
          ❌ Don’t add any unrelated sheets.<br />
          📅 Make sure the date range in the file name reflects the actual data period.
        </p>
      </div>


      <div className="upload-box">
        <label htmlFor="file-upload">
          <p>📁 Click to upload or drag your Excel/CSV file here</p>
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
  );
}

export default FinanceDataUpload;
