import React, { useEffect, useState } from "react";
import config from "../../config";
import "./style.scss";

const backendUrl = config.backend_url;

function SalesReportV2() {
  const [selectedMonth, setSelectedMonth] = useState("2026-02");
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🔥 NEW TOGGLE STATE
  const [compactMode, setCompactMode] = useState(true); 
  // true = Cr/Lac
  // false = normal exact numbers

  // ===============================
  // FORMATTERS
  // ===============================

  const formatCompact = (num, isCurrency = false) => {
    if (num === null || num === undefined || isNaN(num)) return "-";

    const n = Number(num);
    const isNegative = n < 0;
    const abs = Math.abs(n);

    let formatted;

    if (abs >= 10000000) {
      formatted =
        (abs / 10000000)
          .toFixed(2)
          .replace(/\.00$/, "") + " Cr";
    } else if (abs >= 100000) {
      formatted =
        (abs / 100000)
          .toFixed(2)
          .replace(/\.00$/, "") + " Lac";
    } else if (abs >= 1000) {
      formatted =
        (abs / 1000)
          .toFixed(2)
          .replace(/\.00$/, "") + " K";
    } else {
      formatted = abs.toLocaleString("en-IN");
    }

    if (isCurrency) {
      return (isNegative ? "-₹ " : "₹ ") + formatted;
    }

    return isNegative ? "-" + formatted : formatted;
  };

  const formatNormal = (num, isCurrency = false) => {
    if (num === null || num === undefined || isNaN(num)) return "-";

    const n = Number(num);
    const formatted = Math.abs(n).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    });

    if (isCurrency) {
      return n < 0 ? `-₹ ${formatted}` : `₹ ${formatted}`;
    }

    return n < 0 ? `-${formatted}` : formatted;
  };

  const formatValue = (num, isCurrency = false) => {
    return compactMode
      ? formatCompact(num, isCurrency)
      : formatNormal(num, isCurrency);
  };

  // ===============================
  // DATE RANGE HELPER
  // ===============================
  const getMonthRange = (month) => {
    const [year, mon] = month.split("-");
    const start = `${year}-${mon}-01`;
    const lastDay = new Date(year, mon, 0).getDate();
    const end = `${year}-${mon}-${lastDay}`;
    return { start, end };
  };

  // ===============================
  // FETCH DASHBOARD API
  // ===============================
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

  // ===============================
  // GENERIC TABLE RENDERER
  // ===============================
  const renderTable = (title, reportData) => {
    if (!reportData?.table) return null;

    const { value, volume } = reportData.table;

    return (
      <div className="report-section">
        <h3>{title}</h3>

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
                    : formatValue(val, true)}
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
                    : formatValue(val, false)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // ===============================
  // WOD TABLES
  // ===============================
  const renderWodTables = () => {
    const wodTables = dashboardData?.wodTables;
    if (!wodTables) return null;

    return (
      <div className="wod-section">
        <div className="report-section">
          <h3>WOD</h3>
          <table className="report-table">
            <tbody>
              <tr>
                <td className="metric-title">Sell-In WOD</td>
                {Object.values(wodTables.sellInWOD || {}).map((val, i) => (
                  <td key={i}>{formatValue(val)}</td>
                ))}
              </tr>

              <tr>
                <td className="metric-title">Sell-Out WOD</td>
                {Object.values(wodTables.sellOutWOD || {}).map((val, i) => (
                  <td key={i}>{formatValue(val)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="report-section">
          <h3>Sell-In WOD</h3>
          <table className="report-table">
            <tbody>
              {wodTables.sellInBreakdown?.map((row, idx) => (
                <tr key={idx}>
                  <td className="metric-title">{row.label}</td>
                  {Object.values(row.data).map((val, i) => (
                    <td key={i}>{formatValue(val)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="report-section">
          <h3>Sell-Out WOD</h3>
          <table className="report-table">
            <tbody>
              {wodTables.sellOutBreakdown?.map((row, idx) => (
                <tr key={idx}>
                  <td className="metric-title">{row.label}</td>
                  {Object.values(row.data).map((val, i) => (
                    <td key={i}>{formatValue(val)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ===============================
  // UI
  // ===============================
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

            {/* 🔥 NEW TOGGLE */}
            <button
              onClick={() => setCompactMode(!compactMode)}
              style={{ marginLeft: "10px" }}
            >
              {compactMode ? "Switch to Normal View" : "Switch to Cr/Lac View"}
            </button>
          </div>
        </div>

        {loading && <div className="loader">Loading...</div>}

        {dashboardData && (
          <>
            {renderTable("Activation (Sell-Out)", dashboardData.activation)}
            {renderTable("Tertiary (Sell-In)", dashboardData.tertiary)}
            {renderTable("Secondary (SPD → MDD)", dashboardData.secondary)}
            {renderWodTables()}
          </>
        )}
      </div>
    </div>
  );
}

export default SalesReportV2;
