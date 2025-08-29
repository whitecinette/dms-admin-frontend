import React, { useEffect, useState } from "react";
import axios from "axios";
import config from "../../../config";
import './style.scss';


const backendUrl = config.backend_url;

const GeneratePayrollModal = ({ closeModal, onGenerated }) => {
  const [firms, setFirms] = useState([]);
  const [selectedFirms, setSelectedFirms] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth()); // 0-11
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  // Fetch firms
  useEffect(() => {
    const fetchFirms = async () => {
      try {
        const res = await axios.get(`${backendUrl}/get-firms-for-dropdown`, {
          headers: { Authorization: localStorage.getItem("authToken") },
        });
        setFirms(res.data.data || []);
      } catch (err) {
        console.error("❌ Error fetching firms:", err);
      }
    };
    fetchFirms();
  }, []);

  const toggleFirm = (code) => {
    setSelectedFirms((prev) =>
      prev.includes(code) ? prev.filter((f) => f !== code) : [...prev, code]
    );
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
        { firmCodes: selectedFirms, month: month + 1, year }, // month 1-12
        { headers: { Authorization: localStorage.getItem("authToken") } }
      );
      alert("Payroll generated successfully!");
      onGenerated();
    } catch (err) {
      console.error("❌ Error generating payroll:", err);
      alert("Failed to generate payroll");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content medium">
        <h2>Generate Payroll</h2>

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

        <div className="field-row">
          <label>Select Firms</label>
          <div className="firm-checkboxes">
            {firms.map((firm) => (
              <label key={firm.code} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedFirms.includes(firm.code)}
                  onChange={() => toggleFirm(firm.code)}
                />
                {firm.name} ({firm.code})
              </label>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button className="secondary-button" onClick={closeModal}>
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
