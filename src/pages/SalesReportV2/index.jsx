import React, { useEffect, useState } from "react";
import config from "../../config";
import "./style.scss";
import PriceSegmentTable from "./priceSegmentTable";

const backendUrl = config.backend_url;

/** ===============================
 *  SHIMMER / SKELETON COMPONENTS
 *  =============================== */

const ShimmerBlock = ({ height = 14, width = "100%", style = {} }) => (
  <div
    className="shimmer"
    style={{
      height,
      width,
      borderRadius: 6,
      ...style,
    }}
  />
);

const BlockRow = ({ items = 4 }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: `repeat(${items}, minmax(120px, 1fr))`,
      gap: 12,
    }}
  >
    {Array.from({ length: items }).map((_, i) => (
      <ShimmerBlock
        key={i}
        height={18}
        width={`${60 + (i * 10) % 35}%`} // varying widths
        style={{ borderRadius: 10 }}
      />
    ))}
  </div>
);

const SectionLoader = ({ title }) => (
  <div className="report-section">
    <h3 style={{ marginBottom: 10 }}>{title}</h3>

<div className="skeleton-box">
  <div className="skeleton-title">
    <ShimmerBlock height={22} width="220px" />
  </div>

  <div className="skeleton-cards">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="skeleton-card">
        <div className="skeleton-card-label">
          <ShimmerBlock height={12} width="45%" />
        </div>
        <ShimmerBlock height={22} width={`${55 + i * 8}%`} />
      </div>
    ))}
  </div>

  <div className="skeleton-rows">
    <div className="skeleton-row">
      <ShimmerBlock height={18} width="70%" />
      <ShimmerBlock height={18} width="55%" />
      <ShimmerBlock height={18} width="85%" />
      <ShimmerBlock height={18} width="60%" />
    </div>
  </div>
</div>
  </div>
);

function SalesReportV2() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [compactMode, setCompactMode] = useState(true);

  // data
  const [activation, setActivation] = useState(null);
  const [tertiary, setTertiary] = useState(null);
  const [secondary, setSecondary] = useState(null);
  const [wodTables, setWodTables] = useState(null);
  const [priceSegmentTables, setPriceSegmentTables] = useState(null);
  const [priceSegmentSplit40k, setPriceSegmentSplit40k] = useState(null);

  // loaders
  const [loadingActivation, setLoadingActivation] = useState(false);
  const [loadingTertiary, setLoadingTertiary] = useState(false);
  const [loadingSecondary, setLoadingSecondary] = useState(false);
  const [loadingWod, setLoadingWod] = useState(false);
  const [loadingPriceSegment, setLoadingPriceSegment] = useState(false);
  const [loadingPriceSegmentSplit40k, setLoadingPriceSegmentSplit40k] =
    useState(false);

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
      formatted = (abs / 10000000).toFixed(2).replace(/\.00$/, "") + " Cr";
    } else if (abs >= 100000) {
      formatted = (abs / 100000).toFixed(2).replace(/\.00$/, "") + " Lac";
    } else if (abs >= 1000) {
      formatted = (abs / 1000).toFixed(2).replace(/\.00$/, "") + " K";
    } else {
      formatted = abs.toLocaleString("en-IN");
    }

    if (isCurrency) return (isNegative ? "-₹ " : "₹ ") + formatted;
    return isNegative ? "-" + formatted : formatted;
  };

  const formatNormal = (num, isCurrency = false) => {
    if (num === null || num === undefined || isNaN(num)) return "-";

    const n = Number(num);
    const formatted = Math.abs(n).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    });

    if (isCurrency) return n < 0 ? `-₹ ${formatted}` : `₹ ${formatted}`;
    return n < 0 ? `-${formatted}` : formatted;
  };

  const formatValue = (num, isCurrency = false) =>
    compactMode ? formatCompact(num, isCurrency) : formatNormal(num, isCurrency);

  // ===============================
  // RESET SECTIONS
  // ===============================
  const resetAllSections = () => {
    setActivation(null);
    setTertiary(null);
    setSecondary(null);
    setWodTables(null);
    setPriceSegmentTables(null);
    setPriceSegmentSplit40k(null);

    setLoadingActivation(true);
    setLoadingTertiary(true);
    setLoadingSecondary(true);
    setLoadingWod(true);
    setLoadingPriceSegment(true);
    setLoadingPriceSegmentSplit40k(true);
  };

  // ===============================
  // FETCH DASHBOARD
  // ===============================
  const fetchDashboard = async () => {
    resetAllSections();

    try {
      const body = { filters: {} };

      if (startDate && endDate) {
        body.start_date = startDate;
        body.end_date = endDate;
      }

      const res = await fetch(`${backendUrl}/reports/dashboard-summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.getItem("authToken"),
        },
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.message || "Error fetching report");
        setLoadingActivation(false);
        setLoadingTertiary(false);
        setLoadingSecondary(false);
        setLoadingWod(false);
        setLoadingPriceSegment(false);
        setLoadingPriceSegmentSplit40k(false);
        return;
      }

      requestAnimationFrame(() => {
        setActivation(result.activation || null);
        setLoadingActivation(false);

        requestAnimationFrame(() => {
          setTertiary(result.tertiary || null);
          setLoadingTertiary(false);

          requestAnimationFrame(() => {
            setSecondary(result.secondary || null);
            setLoadingSecondary(false);

            requestAnimationFrame(() => {
              setWodTables(result.wodTables || null);
              setLoadingWod(false);

              requestAnimationFrame(() => {
                setPriceSegmentTables(result.priceSegmentTables || null);
                setLoadingPriceSegment(false);

                requestAnimationFrame(() => {
                  setPriceSegmentSplit40k(result.priceSegmentTables40k || null);
                  setLoadingPriceSegmentSplit40k(false);
                });
              });
            });
          });
        });
      });
    } catch (err) {
      alert("Network error");
      setLoadingActivation(false);
      setLoadingTertiary(false);
      setLoadingSecondary(false);
      setLoadingWod(false);
      setLoadingPriceSegment(false);
      setLoadingPriceSegmentSplit40k(false);
    }
  }; // ✅ IMPORTANT: close fetchDashboard

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===============================
  // GENERIC TABLE RENDERER
  // ===============================
  const renderTable = (title, reportData) => {
    if (!reportData?.table) return null;

    const { value = {}, volume = {} } = reportData.table;
    const columns = Object.keys(value || {});

    return (
      <div className="report-section">
        <h3>{title}</h3>

        <table className="report-table">
          <thead>
            <tr>
              <th>Metric</th>
              {columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            <tr>
              <td className="metric-title">Value</td>
              {columns.map((key) => {
                const val = value?.[key];
                return (
                  <td
                    key={key}
                    className={
                      key === "G/D%"
                        ? Number(val || 0) >= 0
                          ? "positive"
                          : "negative"
                        : ""
                    }
                  >
                    {key.includes("%")
                      ? `${Number(val || 0).toFixed(2)}%`
                      : formatValue(val, true)}
                  </td>
                );
              })}
            </tr>

            <tr>
              <td className="metric-title">Volume</td>
              {columns.map((key) => {
                const val = volume?.[key];
                return (
                  <td
                    key={key}
                    className={
                      key === "G/D%"
                        ? Number(val || 0) >= 0
                          ? "positive"
                          : "negative"
                        : ""
                    }
                  >
                    {key.includes("%")
                      ? `${Number(val || 0).toFixed(2)}%`
                      : formatValue(val, false)}
                  </td>
                );
              })}
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
    if (!wodTables) return null;

    const sellIn = wodTables.sellInWOD || {};
    const sellOut = wodTables.sellOutWOD || {};
    const columns = Object.keys(sellIn);

    return (
      <div className="wod-section">
        <div className="report-section">
          <h3>WOD</h3>

          <table className="report-table">
            <thead>
              <tr>
                <th>Metric</th>
                {columns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              <tr>
                <td className="metric-title">Sell-In WOD</td>
                {columns.map((col) => (
                  <td key={col}>{formatValue(sellIn[col])}</td>
                ))}
              </tr>

              <tr>
                <td className="metric-title">Sell-Out WOD</td>
                {columns.map((col) => (
                  <td key={col}>{formatValue(sellOut[col])}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {wodTables.sellInBreakdown?.length > 0 && (
          <div className="report-section">
            <h3>Sell-In WOD</h3>

            <table className="report-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  {columns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {wodTables.sellInBreakdown.map((row, idx) => (
                  <tr key={idx}>
                    <td className="metric-title">{row.label}</td>
                    {columns.map((col) => (
                      <td key={col}>{formatValue(row.data?.[col])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {wodTables.sellOutBreakdown?.length > 0 && (
          <div className="report-section">
            <h3>Sell-Out WOD</h3>

            <table className="report-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  {columns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {wodTables.sellOutBreakdown.map((row, idx) => (
                  <tr key={idx}>
                    <td className="metric-title">{row.label}</td>
                    {columns.map((col) => (
                      <td key={col}>{formatValue(row.data?.[col])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ marginLeft: "8px" }}
            />

            <button onClick={fetchDashboard}>Refresh</button>

            <button
              onClick={() => setCompactMode(!compactMode)}
              style={{ marginLeft: "10px" }}
            >
              {compactMode ? "Switch to Normal View" : "Switch to Cr/Lac View"}
            </button>
          </div>
        </div>

        {loadingActivation ? (
          <SectionLoader title="Activation (Sell-Out)" rows={2} cols={6} />
        ) : (
          renderTable("Activation (Sell-Out)", activation)
        )}

        {loadingTertiary ? (
          <SectionLoader title="Tertiary (Sell-In)" rows={2} cols={6} />
        ) : (
          renderTable("Tertiary (Sell-In)", tertiary)
        )}

        {loadingSecondary ? (
          <SectionLoader title="Secondary (SPD → MDD)" rows={2} cols={6} />
        ) : (
          renderTable("Secondary (SPD → MDD)", secondary)
        )}

        {loadingWod ? (
          <SectionLoader title="WOD" rows={3} cols={6} />
        ) : (
          renderWodTables()
        )}

        {loadingPriceSegment ? (
          <SectionLoader title="Activation – Price Segment Wise" rows={6} cols={8} />
        ) : (
          priceSegmentTables && (
            <PriceSegmentTable
              data={priceSegmentTables}
              title="Activation – Price Segment Wise"
              formatValue={formatValue}
            />
          )
        )}

        {loadingPriceSegmentSplit40k ? (
          <SectionLoader title="Activation – 40K vs >40K" rows={3} cols={8} />
        ) : (
          priceSegmentSplit40k && (
            <PriceSegmentTable
              data={priceSegmentSplit40k}
              title="Activation – 40K vs >40K"
              formatValue={formatValue}
            />
          )
        )}
      </div>
    </div>
  );
}

export default SalesReportV2;