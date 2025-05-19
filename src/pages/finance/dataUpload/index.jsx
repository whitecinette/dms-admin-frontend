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
            };
            });

            setSheetsData(parsedSheets);
        }
        };

        if (file.name.endsWith(".csv")) {
        reader.readAsText(file); // read CSV as text
        } else {
        reader.readAsArrayBuffer(file); // read Excel as array buffer
        }
  };


const resetUpload = () => {
  setSheetsData([]);
  setSelectedFile(null);
  if (fileInputRef.current) {
    fileInputRef.current.value = null;
  }
};


  const removeSheet = (sheetName) => {
    setSheetsData((prev) => prev.filter((s) => s.name !== sheetName));
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
        accept=".xlsx, .xls"
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

                {/* New Inputs */}
                <div className="sheet-meta">
                    <input
                    type="text"
                    placeholder="Enter label / name"
                    className="sheet-input"
                    />
                    <select className="sheet-dropdown">
                    <option>Credit Note Voucher</option>
                    <option>Credit Note Working</option>
                    <option>Debit Note Voucher</option>
                    <option>Debit Note Working</option>
                    </select>
                    <div className="sheet-date-range">
                    <input type="date" defaultValue="2025-05-18" />
                    <span>to</span>
                    <input type="date" defaultValue="2025-05-18" />
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
    </div>
  );
}

export default FinanceDataUpload;
