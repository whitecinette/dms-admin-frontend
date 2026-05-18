import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FiCheckSquare, FiSquare } from "react-icons/fi";
import config from "../../../config";
import "./style.scss";

const backendUrl = config.backend_url;

const GeneratePayrollModal = ({ closeModal, onGenerated }) => {
  const [firms, setFirms] = useState([]);
  const [selectedFirms, setSelectedFirms] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth()); // 0-11
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchFirms = async () => {
      try {
        const res = await axios.get(`${backendUrl}/get-firms-for-dropdown`, {
          headers: { Authorization: localStorage.getItem("authToken") },
        });
        setFirms(res.data.data || []);
      } catch (err) {
        console.error("Error fetching firms:", err);
      }
    };
    fetchFirms();
  }, []);

  const allFirmCodes = useMemo(
    () => firms.map((firm) => firm.code).filter(Boolean),
    [firms]
  );

  const isAllSelected = allFirmCodes.length > 0 && selectedFirms.length === allFirmCodes.length;

  const toggleFirm = (code) => {
    setSelectedFirms((prev) =>
      prev.includes(code) ? prev.filter((f) => f !== code) : [...prev, code]
    );
  };

  const handleSelectAll = () => {
    setSelectedFirms(allFirmCodes);
  };

  const handleClearAll = () => {
    setSelectedFirms([]);
  };

  const handleGenerate = async () => {
    if (selectedFirms.length === 0) {
      alert("Please select at least one firm.");
      return;
    }

    try {
      setLoading(true);
      await axios.post(
        `${backendUrl}/payroll/bulk-generate`,
        { firmCodes: selectedFirms, month: month + 1, year },
        { headers: { Authorization: localStorage.getItem("authToken") } }
      );
      alert("Payroll generated successfully!");
      onGenerated();
    } catch (err) {
      console.error("Error generating payroll:", err);
      alert("Failed to generate payroll");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay payroll-generate-modal-overlay">
      <div className="modal-content medium payroll-generate-modal">
        <div className="generate-payroll-head">
          <h2>Generate Payroll</h2>
          <p>Select month, year and firms to run payroll in one click.</p>
        </div>

        <div className="payroll-form-grid">
          <div className="field-row">
            <label>Month</label>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>
                  {new Date(0, i).toLocaleString("default", { month: "long" })}
                </option>
              ))}
            </select>
          </div>

          <div className="field-row">
            <label>Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="field-row">
          <div className="firms-header">
            <label>Select Firms</label>
            <div className="firm-tools">
              <span className="selected-count">
                {selectedFirms.length}/{allFirmCodes.length} selected
              </span>
              {!isAllSelected ? (
                <button type="button" className="ghost-button" onClick={handleSelectAll}>
                  <FiCheckSquare /> Select all
                </button>
              ) : (
                <button type="button" className="ghost-button" onClick={handleClearAll}>
                  <FiSquare /> Clear
                </button>
              )}
            </div>
          </div>

          <div className="firm-checkboxes">
            {firms.map((firm) => {
              const checked = selectedFirms.includes(firm.code);
              return (
                <label
                  key={firm.code}
                  className={`checkbox-label ${checked ? "active" : ""}`}
                  title={`${firm.name} (${firm.code})`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleFirm(firm.code)}
                  />
                  <span className="firm-name">{firm.name}</span>
                  <span className="firm-code">{firm.code}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="modal-actions">
          <button className="secondary-button" onClick={closeModal} disabled={loading}>
            Cancel
          </button>
          <button className="primary-button" onClick={handleGenerate} disabled={loading}>
            {loading ? "Generating..." : "Start Generating"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeneratePayrollModal;
