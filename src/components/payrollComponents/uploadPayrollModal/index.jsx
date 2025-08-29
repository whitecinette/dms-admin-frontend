import React, { useState } from "react";
import axios from "axios";
import config from "../../../config";

const backendUrl = config.backend_url;

const UploadPayrollModal = ({ closeModal, refresh }) => {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    // optional: preview rows count
    const reader = new FileReader();
    reader.onload = (event) => {
      const lines = event.target.result.split("\n");
      setRows(lines.length - 1);
    };
    reader.readAsText(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a CSV file.");
    try {
      setLoading(true); // start spinner
      const formData = new FormData();
      formData.append("file", file);
      formData.append("month", month);
      formData.append("year", year);

      const response = await axios.put(`${backendUrl}/payroll/upload/csv`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: localStorage.getItem("authToken"),
        },
      });

      alert(
        `Upload complete: ${response.data.new} new, ${response.data.updated} updated, total ${response.data.total}`
      );

      refresh?.();
      closeModal();
    } catch (err) {
      console.error("❌ Error uploading payroll:", err);
      alert("Failed to upload payroll.");
    } finally {
      setLoading(false); // stop spinner
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Upload Bulk Payroll</h3>
        <div className="form-row">
          <label>Month</label>
          <input
            type="number"
            value={month}
            min="1"
            max="12"
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
        <div className="form-row">
          <label>Year</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
        </div>
        <div className="form-row">
          <label>CSV File</label>
          <input type="file" accept=".csv" onChange={handleFileChange} />
          {rows && <p>Detected approx. {rows} rows</p>}
        </div>
        <div className="modal-actions">
          <button
            className="primary-button"
            onClick={handleUpload}
            disabled={loading}
          >
            {loading ? (
              <span className="spinner"></span>
            ) : (
              "Upload"
            )}
          </button>
          <button
            className="secondary-button"
            onClick={closeModal}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadPayrollModal;
