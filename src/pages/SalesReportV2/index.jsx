import React, { useEffect, useState } from "react";
import config from "../../config";
import "./style.scss";

const backendUrl = config.backend_url;

const REPORT_TYPES = [
  { label: "Activation", value: "activation", color: "#ff9800" },
  { label: "Tertiary", value: "tertiary", color: "#2196f3" },
  { label: "Secondary", value: "secondary", color: "#9c27b0" },
];

function SalesReportV2() {
  const [reportType, setReportType] = useState("activation");
  const [selectedMonth, setSelectedMonth] = useState("2026-02");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/reports/summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.getItem("authToken"),
        },
        body: JSON.stringify({
          type: reportType,
          selectedMonth,
          filters: {},
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        alert(result.message || "Error fetching report");
      } else {
        setData(result.data);
      }
    } catch (err) {
      alert("Network error");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, selectedMonth]);

  const formatNumber = (num) =>
    num?.toLocaleString("en-IN", { maximumFractionDigits: 2 });

  return (
    <div className="sales-report-page">
      <div className="report-container">
        <div className="report-header">
          <h2>📊 Sales Report</h2>

          <div className="controls">
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              {REPORT_TYPES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />

            <button onClick={fetchReport}>
              🔄 Refresh
            </button>
          </div>
        </div>

        {loading && <div className="loader">Loading...</div>}

        {data && (
          <>
            {/* Summary Cards */}
            <div className="summary-cards">
              <div className="card">
                <h4>MTD Value</h4>
                <p>₹ {formatNumber(data.mtd.totalValue)}</p>
              </div>

              <div className="card">
                <h4>MTD Volume</h4>
                <p>{formatNumber(data.mtd.totalQty)}</p>
              </div>

              <div className="card">
                <h4>FTD (Yesterday)</h4>
                <p>₹ {formatNumber(data.ftd.totalValue)}</p>
              </div>

              <div
                className={`card growth ${
                  data.growthPercent >= 0 ? "positive" : "negative"
                }`}
              >
                <h4>Growth %</h4>
                <p>{data.growthPercent}%</p>
              </div>
            </div>

            {/* Monthly Table */}
            <div className="monthly-table">
              <table>
                <thead>
                  <tr>
                    <th>Metric</th>
                    {data.monthly &&
                      Object.keys(data.monthly).map((m) => (
                        <th key={m}>{m}</th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Value</td>
                    {Object.keys(data.monthly).map((m) => (
                      <td key={m}>
                        ₹ {formatNumber(data.monthly[m]?.totalValue || 0)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Volume</td>
                    {Object.keys(data.monthly).map((m) => (
                      <td key={m}>
                        {formatNumber(data.monthly[m]?.totalQty || 0)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SalesReportV2;
