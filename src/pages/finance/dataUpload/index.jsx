import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import config from "../../../config.js";
import "./style.scss";

const backendUrl = config.backend_url;

function FinanceDataUpload() {
  const [sheetsData, setSheetsData] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

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
    for (let sheet of sheetsData) {
      const rows = sheet.data;
      const headers = rows[0];
      const rowData = rows.slice(1);

      const structuredRows = rowData.map((row) => {
        const obj = {};
        headers.forEach((key, index) => {
          obj[key] = row[index] ?? "";
        });
        return obj;
      });

      const payload = {
        label: sheet.label,
        type: sheet.type,
        startDate: sheet.startDate,
        endDate: sheet.endDate,
        rows: structuredRows,
      };

      try {
        const res = await fetch(`${backendUrl}/finance/upload-data`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await res.json();
        console.log(`Uploaded ${sheet.name}:`, result);
      } catch (err) {
        console.error(`Error uploading ${sheet.name}:`, err);
      }
    }

    alert("All sheets uploaded!");
    resetUpload();
  };

  return (
    <div className="finance-upload-container">
      <div className="upload-header">
        <h2>Finance Data Upload</h2>
        {sheetsData.length > 0 && (
          <button className="reset-btn" onClick={resetUpload}>
            ❌ Clear All
          </button>
        )}
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

                <div className="sheet-meta">
                  <input
                    type="text"
                    placeholder="Enter label / name"
                    className="sheet-input"
                    value={sheet.label}
                    onChange={(e) => {
                      const updated = [...sheetsData];
                      updated[idx].label = e.target.value;
                      setSheetsData(updated);
                    }}
                  />
                  <select
                    className="sheet-dropdown"
                    value={sheet.type}
                    onChange={(e) => {
                      const updated = [...sheetsData];
                      updated[idx].type = e.target.value;
                      setSheetsData(updated);
                    }}
                  >
                    <option>Credit Note Voucher</option>
                    <option>Credit Note Working</option>
                    <option>Debit Note Voucher</option>
                    <option>Debit Note Working</option>
                  </select>
                  <div className="sheet-date-range">
                    <input
                      type="date"
                      value={sheet.startDate}
                      onChange={(e) => {
                        const updated = [...sheetsData];
                        updated[idx].startDate = e.target.value;
                        setSheetsData(updated);
                      }}
                    />
                    <span>to</span>
                    <input
                      type="date"
                      value={sheet.endDate}
                      onChange={(e) => {
                        const updated = [...sheetsData];
                        updated[idx].endDate = e.target.value;
                        setSheetsData(updated);
                      }}
                    />
                  </div>
                </div>
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
        <button className="upload-all-btn" onClick={handleUploadAll}>
          📤 Upload All Sheets
        </button>
      )}
    </div>
  );
}

export default FinanceDataUpload;
