import React, { useEffect, useState } from "react";
import axios from "axios";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import config from "../../../config";
import "./style.scss";
import CustomTooltip from "../../../components/expensesComponents/pieCustomTooltips";
import DownloadPayrollModal from "../../../components/payrollComponents/downloadPayrollModal";
import UploadPayrollModal from "../../../components/payrollComponents/uploadPayrollModal";



const backendUrl = config.backend_url;

const COLORS = [
  "#4E79A7", "#F28E2B", "#E15759", "#76B7B2", "#59A14F",
  "#EDC949", "#AF7AA1", "#FF9DA7", "#9C755F", "#BAB0AC",
  "#2E93fA", "#66DA26", "#546E7A", "#E91E63", "#FF9800",
  "#8E44AD", "#1ABC9C", "#2ECC71", "#F39C12", "#D35400"
];


const ExpenseMatrix = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [monthStr, setMonthStr] = useState(new Date().getMonth() + 1);
  const [yearStr, setYearStr] = useState(new Date().getFullYear());

  const [firms, setFirms] = useState([]);
  const [firmDropdownOpen, setFirmDropdownOpen] = useState(false);
  const [selectedFirms, setSelectedFirms] = useState([]);
  const [tempSelectedFirms, setTempSelectedFirms] = useState([]);

  const [downloadModal, setDownloadModal] = useState(false);
  const [uploadModal, setUploadModal] = useState(false);


  useEffect(() => {
    const fetchFirms = async () => {
      try {
        const res = await axios.get(`${backendUrl}/get-firms-for-dropdown`);
        setFirms(res.data.data || []);
      } catch (err) {
        console.error("Error fetching firms:", err);
      }
    };
    fetchFirms();
  }, []);

  const getHeatmapColor = (value, min, max, type) => {
    if (value === "-" || value === null || value === undefined) return "transparent";
    if (max === min) return "transparent"; // all equal → no color

    const ratio = (value - min) / (max - min);

    // green-blue for additions, red-orange for deductions
    return type === "addition"
        ? `rgba(33, 150, 243, ${0.2 + ratio * 0.6})` // blue shades
        : `rgba(244, 67, 54, ${0.2 + ratio * 0.6})`; // red shades
    };


  const getExpensesData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${backendUrl}/expenses`, {
        params: {
          month: monthStr,
          year: yearStr,
        },
      });

      let merged = res.data.data || [];
      if (selectedFirms.length > 0) {
        merged = merged.filter((u) => selectedFirms.includes(u.firmCode));
      }

      setData(merged);
    } catch (err) {
      console.error("Error fetching expenses:", err);
    } finally {
      setLoading(false);
    }
  };

  // additions
    const allAdditions = data.flatMap(u => [
    u.totalAdditions?.current || 0,
    u.totalAdditions?.m1 || 0,
    u.totalAdditions?.m2 || 0,
    ]);
    const minAdd = Math.min(...allAdditions);
    const maxAdd = Math.max(...allAdditions);

    // deductions
    const allDeductions = data.flatMap(u => [
    u.totalDeductions?.current || 0,
    u.totalDeductions?.m1 || 0,
    u.totalDeductions?.m2 || 0,
    ]);
    const minDed = Math.min(...allDeductions);
    const maxDed = Math.max(...allDeductions);


  useEffect(() => {
    if (monthStr && yearStr) {
      getExpensesData();
    }
  }, [monthStr, yearStr, selectedFirms]);

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(0, i).toLocaleString("default", { month: "long" }),
  }));

  const yearOptions = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - 1 + i);

    const renderPie = (items) => {
    if (!items || items.length === 0) return "-";

    const chartData = items.map((x) => ({
        name: x.name,
        value: x.amount,
    }));

    return (
        <ResponsiveContainer width={60} height={60}>
        <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={25}>
            {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
            </Pie>
            {/* ✅ Pass chartData manually to tooltip */}
            <Tooltip content={(props) => <CustomTooltip {...props} data={chartData} />} />
        </PieChart>
        </ResponsiveContainer>
    );
    };



  return (
    <div className="expense-matrix-wrapper">
      <div className="matrix-top-bar">
        <div className="left">
          <h3>Expenses Overview</h3>
        </div>
        <div className="right">
          {/* Firm Dropdown */}
          <div className="firm-dropdown">
            <button
              className="firm-select-btn"
              onClick={() => setFirmDropdownOpen(!firmDropdownOpen)}
            >
              {selectedFirms.length > 0
                ? `${selectedFirms.length} Firm(s) Selected`
                : "Select Firm(s)"}
              <span className="arrow">{firmDropdownOpen ? "▲" : "▼"}</span>
            </button>

            {firmDropdownOpen && (
              <div className="firm-dropdown-menu">
                <div className="firm-options">
                  {firms.map((firm) => (
                    <label key={firm.code} className="firm-option">
                      <input
                        type="checkbox"
                        checked={tempSelectedFirms.includes(firm.code)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTempSelectedFirms([...tempSelectedFirms, firm.code]);
                          } else {
                            setTempSelectedFirms(tempSelectedFirms.filter((c) => c !== firm.code));
                          }
                        }}
                      />
                      {firm.name}
                    </label>
                  ))}
                </div>
                <div className="firm-actions">
                  <button
                    className="apply-btn"
                    onClick={() => {
                      setSelectedFirms(tempSelectedFirms);
                      setFirmDropdownOpen(false);
                    }}
                  >
                    Apply
                  </button>
                  <button
                    className="cancel-btn"
                    onClick={() => {
                      setTempSelectedFirms(selectedFirms);
                      setFirmDropdownOpen(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <select value={monthStr} onChange={(e) => setMonthStr(e.target.value)}>
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <select value={yearStr} onChange={(e) => setYearStr(e.target.value)}>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

        <button className="download-btn" onClick={() => setDownloadModal(true)}>
        ⬇ Download All
        </button>
        <button className="upload-btn" onClick={() => setUploadModal(true)}>
        ⬆ Upload Bulk
        </button>

        </div>
      </div>

      {loading ? (
        <p className="loading-msg">Loading...</p>
      ) : (
        <div className="expense-matrix-table-container">
          <table className="expense-matrix-table">
            <thead>
              <tr>
                <th><input type="checkbox" /></th>
                <th>S.No</th>
                <th>Name</th>
                <th>Code</th>
                <th>Firm</th>
                <th>Additions</th>
                <th>Add m-1</th>
                <th>Add m-2</th>
                <th>Deductions</th>
                <th>Ded m-1</th>
                <th>Ded m-2</th>
                <th>Additions Pie</th>
                <th>Add m-1 Pie</th>
                <th>Add m-2 Pie</th>
                <th>Deductions Pie</th>
                <th>Ded m-1 Pie</th>
                <th>Ded m-2 Pie</th>
              </tr>
            </thead>
            <tbody>
              {data.map((user, idx) => (
                <tr key={idx}>
                  <td><input type="checkbox" /></td>
                  <td>{idx + 1}</td>
                  <td>{user.name}</td>
                  <td>{user.code}</td>
                  <td>{user.firmName}</td>
                <td style={{ backgroundColor: getHeatmapColor(user.totalAdditions?.current, minAdd, maxAdd, "addition") }}>
                {user.totalAdditions?.current || "-"}
                </td>
                <td style={{ backgroundColor: getHeatmapColor(user.totalAdditions?.m1, minAdd, maxAdd, "addition") }}>
                {user.totalAdditions?.m1 || "-"}
                </td>
                <td style={{ backgroundColor: getHeatmapColor(user.totalAdditions?.m2, minAdd, maxAdd, "addition") }}>
                {user.totalAdditions?.m2 || "-"}
                </td>

                <td style={{ backgroundColor: getHeatmapColor(user.totalDeductions?.current, minDed, maxDed, "deduction") }}>
                {user.totalDeductions?.current || "-"}
                </td>
                <td style={{ backgroundColor: getHeatmapColor(user.totalDeductions?.m1, minDed, maxDed, "deduction") }}>
                {user.totalDeductions?.m1 || "-"}
                </td>
                <td style={{ backgroundColor: getHeatmapColor(user.totalDeductions?.m2, minDed, maxDed, "deduction") }}>
                {user.totalDeductions?.m2 || "-"}
                </td>



                    <td>{renderPie(user.additions?.current)}</td>
                    <td>{renderPie(user.additions?.m1)}</td>
                    <td>{renderPie(user.additions?.m2)}</td>
                    <td>{renderPie(user.deductions?.current)}</td>
                    <td>{renderPie(user.deductions?.m1)}</td>
                    <td>{renderPie(user.deductions?.m2)}</td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {downloadModal && (
        <DownloadPayrollModal closeModal={() => setDownloadModal(false)} />
        )}

        {uploadModal && (
        <UploadPayrollModal
            closeModal={() => setUploadModal(false)}
            refresh={getExpensesData}   // so table refreshes after upload
        />
        )}

    </div>
  );
};

export default ExpenseMatrix;
