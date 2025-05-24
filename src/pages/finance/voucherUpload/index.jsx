import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import config from "../../../config.js";
import "./style.scss";

const backendUrl = config.backend_url;

function parseExcelDate(serial) {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return date_info.toISOString().split("T")[0]; // Format: YYYY-MM-DD
}

function FinanceVoucherUpload() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [fullData, setFullData] = useState([]);
  const fileInputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const ext = file.name.split(".").pop().toLowerCase();
      const workbook = ext === "csv"
        ? XLSX.read(event.target.result, { type: "string" })
        : XLSX.read(new Uint8Array(event.target.result), { type: "array" });

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const headers = json[0];
      const dateIndex = headers.indexOf("Date");
      const dueDateIndex = headers.indexOf("Due Date");

      const parsedData = json.map((row, i) => {
        if (i === 0) return row;
        const newRow = [...row];

        if (!isNaN(newRow[dateIndex])) {
          newRow[dateIndex] = parseExcelDate(newRow[dateIndex]);
        }
        if (!isNaN(newRow[dueDateIndex])) {
          newRow[dueDateIndex] = parseExcelDate(newRow[dueDateIndex]);
        }
        return newRow;
      });

      setFullData(parsedData);
      setPreviewData(parsedData.slice(0, 6)); // header + top 5 rows
    };

    file.name.endsWith(".csv")
      ? reader.readAsText(file)
      : reader.readAsArrayBuffer(file);
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setPreviewData([]);
    setFullData([]);
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  const handleUpload = async () => {
    if (!selectedFile) return alert("No file selected!");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch(`${backendUrl}/finance-voucher/upload`, {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      console.log("Upload result:", result);
      alert(`Upload successful: ${result.inserted || 0} rows added.`);
      resetUpload();
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed. Check console.");
    }
  };

  return (
    <div className="finance-upload-container">
      <div className="upload-header">
        <h2>Upload Finance Vouchers</h2>
        {selectedFile && (
          <button className="reset-btn" onClick={resetUpload}>❌ Clear</button>
        )}
      </div>

      <div className="upload-box">
        <label htmlFor="file-upload">
          <p>📁 Click to upload or drag Excel/CSV file here</p>
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

      {previewData.length > 0 && (
        <div className="sheet-table">
          <table>
            <thead>
              <tr>
                {previewData[0]?.map((col, i) => <th key={i}>{col}</th>)}
              </tr>
            </thead>
            <tbody>
              {previewData.slice(1).map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => <td key={j}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedFile && (
        <>
          <div style={{ marginTop: "16px", fontSize: "14px", color: "#555", textAlign: "right" }}>
            Total Rows: {fullData.length - 1}
          </div>

          <button className="upload-all-btn" onClick={handleUpload}>
            📤 Upload Sheet
          </button>
        </>
      )}
    </div>
  );
}

export default FinanceVoucherUpload;
