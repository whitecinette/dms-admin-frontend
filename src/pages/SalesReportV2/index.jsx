import React, { useEffect, useState } from "react";
import config from "../../config";
import "./style.scss";

const backendUrl = config.backend_url;

function SalesReportV2() {
  const [selectedMonth, setSelectedMonth] = useState("2026-02");
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);

  const getMonthRange = (month) => {
    const [year, mon] = month.split("-");
    const start = `${year}-${mon}-01`;
    const lastDay = new Date(year, mon, 0).getDate();
    const end = `${year}-${mon}-${lastDay}`;
    return { start, end };
  };

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const { start, end } = getMonthRange(selectedMonth);

      const res = await fetch(`${backendUrl}/reports/dashboard-summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.getItem("authToken"),
        },
        body: JSON.stringify({
          start_date: start,
          end_date: end,
          filters: {},
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.message || "Error fetching report");
      } else {
        setDashboardData(result);
      }
    } catch (err) {
      alert("Network error");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboard();
  }, [selectedMonth]);

  const formatNumber = (num) =>
    num?.toLocaleString("en-IN", { maximumFractionDigits: 2 });

  const renderTable = (title, reportData) => {
    if (!reportData?.table) return null;

    const { value, volume, wod } = reportData.table;

    return (
      <div className="report-section">
        <h3>{title}</h3>

        <div className="report-table-wrapper">
          <table className="report-table">
            <thead>
              <tr>
                <th>Metric</th>
                {Object.keys(value).map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              <tr>
                <td className="metric-title">Value</td>
                {Object.entries(value).map(([key, val]) => (
                  <td
                    key={key}
                    className={
                      key === "G/D%"
                        ? val >= 0
                          ? "positive"
                          : "negative"
                        : ""
                    }
                  >
                    {key.includes("%")
                      ? `${val}%`
                      : key === "WFM" || key === "ExpAch"
                      ? formatNumber(val)
                      : `₹ ${formatNumber(val)}`}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="metric-title">Volume</td>
                {Object.entries(volume).map(([key, val]) => (
                  <td
                    key={key}
                    className={
                      key === "G/D%"
                        ? val >= 0
                          ? "positive"
                          : "negative"
                        : ""
                    }
                  >
                    {key.includes("%")
                      ? `${val}%`
                      : formatNumber(val)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>

          {wod !== undefined && (
            <div className="wod-box">
              <span>WOD:</span> {formatNumber(wod)}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="sales-report-page">
      <div className="report-container">
        <div className="report-header">
          <h2>📊 Sales Dashboard</h2>

          <div className="controls">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />

            <button onClick={fetchDashboard}>Refresh</button>
          </div>
        </div>

        {loading && <div className="loader">Loading...</div>}

        {dashboardData && (
          <>
            {renderTable("Activation (Sell-Out)", dashboardData.activation)}
            {renderTable("Tertiary (Sell-In)", dashboardData.tertiary)}
            {renderTable("Secondary (SPD → MDD)", dashboardData.secondary)}
          </>
        )}
      </div>
    </div>
  );
}

export default SalesReportV2;
