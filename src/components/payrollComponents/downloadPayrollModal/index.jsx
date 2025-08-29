import React, { useState } from "react";
import axios from "axios";
import config from "../../../config";
import './style.scss';

const backendUrl = config.backend_url;

const DownloadPayrollModal = ({ closeModal }) => {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const handleDownload = async () => {
    try {
      const response = await axios.get(`${backendUrl}/payroll/download`, {
        params: { month, year },
        responseType: "blob",
        headers: { Authorization: localStorage.getItem("authToken") },
      });

      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `payroll_${month}_${year}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      closeModal();
    } catch (err) {
      console.error("❌ Error downloading payroll:", err);
      alert("Failed to download payroll.");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Download Payroll</h3>
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
        <div className="modal-actions">
          <button className="primary-button" onClick={handleDownload}>
            Download CSV
          </button>
          <button className="secondary-button" onClick={closeModal}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DownloadPayrollModal;
