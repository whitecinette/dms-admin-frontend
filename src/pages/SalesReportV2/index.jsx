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
        width={`${60 + (i * 10) % 35}%`}
        style={{ borderRadius: 10 }}
      />
    ))}
  </div>
);

const SectionLoader = ({ title, tone = "blue" }) => (
  <div className={`report-card report-card--${tone}`}>
    <div className="report-card__header">
      <div>
        <h3>{title}</h3>
        <p>Loading report data...</p>
      </div>
      <span className="report-card__badge">REPORT</span>
    </div>

    <div className="report-card__content">
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
  </div>
);

const ReportGroup = ({
  title,
  subtitle,
  tone = "blue",
  children,
  defaultOpen = true,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`report-group report-group--${tone}`}>
      <div className="report-group__header" onClick={() => setOpen(!open)}>
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <span className="report-group__toggle">{open ? "−" : "+"}</span>
      </div>

      {open && <div className="report-group__body">{children}</div>}
    </section>
  );
};

const ReportCard = ({ title, subtitle, tone = "blue", children }) => (
  <div className={`report-card report-card--${tone}`}>
    <div className="report-card__header">
      <div>
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <span className="report-card__badge">REPORT</span>
    </div>

    <div className="report-card__content">{children}</div>
  </div>
);

function SalesReportV2() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [compactMode, setCompactMode] = useState(true);

  // data (existing)
  const [activation, setActivation] = useState(null);
  const [tertiary, setTertiary] = useState(null);
  const [secondary, setSecondary] = useState(null);
  const [wodTables, setWodTables] = useState(null);
  const [priceSegmentTables, setPriceSegmentTables] = useState(null);
  const [priceSegmentSplit40k, setPriceSegmentSplit40k] = useState(null);

  // ✅ NEW: YTD pace report data
  const [activationValueYtd, setActivationValueYtd] = useState(null);
  const [activationVolYtd, setActivationVolYtd] = useState(null);
  const [tertiaryValueYtd, setTertiaryValueYtd] = useState(null);
  const [tertiaryVolYtd, setTertiaryVolYtd] = useState(null);

    // ✅ NEW: YTD actual report data
  const [activationValueYtdActual, setActivationValueYtdActual] = useState(null);
  const [activationVolYtdActual, setActivationVolYtdActual] = useState(null);
  const [tertiaryValueYtdActual, setTertiaryValueYtdActual] = useState(null);
  const [tertiaryVolYtdActual, setTertiaryVolYtdActual] = useState(null);

  // loaders (existing)
  const [loadingActivation, setLoadingActivation] = useState(false);
  const [loadingTertiary, setLoadingTertiary] = useState(false);
  const [loadingSecondary, setLoadingSecondary] = useState(false);
  const [loadingWod, setLoadingWod] = useState(false);
  const [loadingPriceSegment, setLoadingPriceSegment] = useState(false);
  const [loadingPriceSegmentSplit40k, setLoadingPriceSegmentSplit40k] =
    useState(false);

  // ✅ NEW: YTD loaders
  const [loadingActivationValueYtd, setLoadingActivationValueYtd] =
    useState(false);
  const [loadingActivationVolYtd, setLoadingActivationVolYtd] = useState(false);
  const [loadingTertiaryValueYtd, setLoadingTertiaryValueYtd] = useState(false);
  const [loadingTertiaryVolYtd, setLoadingTertiaryVolYtd] = useState(false);

    // ✅ NEW: YTD actual loaders
  const [loadingActivationValueYtdActual, setLoadingActivationValueYtdActual] =
    useState(false);
  const [loadingActivationVolYtdActual, setLoadingActivationVolYtdActual] =
    useState(false);
  const [loadingTertiaryValueYtdActual, setLoadingTertiaryValueYtdActual] =
    useState(false);
  const [loadingTertiaryVolYtdActual, setLoadingTertiaryVolYtdActual] =
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

  const formatPercent = (num) => {
    if (num === null || num === undefined || isNaN(num)) return "-";
    return `${Number(num).toFixed(2)}%`;
  };

  // ===============================
  // FETCH HELPERS
  // ===============================
  const setAllLoadingFalse = () => {
    setLoadingActivation(false);
    setLoadingTertiary(false);
    setLoadingSecondary(false);
    setLoadingWod(false);
    setLoadingPriceSegment(false);
    setLoadingPriceSegmentSplit40k(false);

    // ✅ YTD
    setLoadingActivationValueYtd(false);
    setLoadingActivationVolYtd(false);
    setLoadingTertiaryValueYtd(false);
    setLoadingTertiaryVolYtd(false);

        // ✅ YTD Actual
    setLoadingActivationValueYtdActual(false);
    setLoadingActivationVolYtdActual(false);
    setLoadingTertiaryValueYtdActual(false);
    setLoadingTertiaryVolYtdActual(false);
  };

  const getRequestBody = (report_type) => {
    const body = { filters: { report_type } };
    if (startDate && endDate) {
      body.start_date = startDate;
      body.end_date = endDate;
    }
    return body;
  };

  const postReport = async (report_type) => {
    const res = await fetch(`${backendUrl}/reports/dashboard-summary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: localStorage.getItem("authToken"),
      },
      body: JSON.stringify(getRequestBody(report_type)),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || "Error fetching report");
    return result;
  };

  // ===============================
  // FETCH DASHBOARD (multi-call, simultaneous)
  // ===============================
  const fetchDashboard = async () => {
    // clear old data
    setActivation(null);
    setTertiary(null);
    setSecondary(null);
    setWodTables(null);
    setPriceSegmentTables(null);
    setPriceSegmentSplit40k(null);

    // ✅ clear YTD
    setActivationValueYtd(null);
    setActivationVolYtd(null);
    setTertiaryValueYtd(null);
    setTertiaryVolYtd(null);

    setActivationValueYtdActual(null);
    setActivationVolYtdActual(null);
    setTertiaryValueYtdActual(null);
    setTertiaryVolYtdActual(null);

    // turn on all loaders
    setLoadingActivation(true);
    setLoadingTertiary(true);
    setLoadingSecondary(true);
    setLoadingWod(true);
    setLoadingPriceSegment(true);
    setLoadingPriceSegmentSplit40k(true);

    // ✅ YTD loaders
    setLoadingActivationValueYtd(true);
    setLoadingActivationVolYtd(true);
    setLoadingTertiaryValueYtd(true);
    setLoadingTertiaryVolYtd(true);

    setLoadingActivationValueYtdActual(true);
    setLoadingActivationVolYtdActual(true);
    setLoadingTertiaryValueYtdActual(true);
    setLoadingTertiaryVolYtdActual(true);

    const tasks = [
      // existing
      postReport("activation")
        .then((r) => setActivation(r.activation || r.data || null))
        .catch((e) => alert(e.message))
        .finally(() => setLoadingActivation(false)),

      postReport("tertiary")
        .then((r) => setTertiary(r.tertiary || r.data || null))
        .catch((e) => alert(e.message))
        .finally(() => setLoadingTertiary(false)),

      postReport("secondary")
        .then((r) => setSecondary(r.secondary || r.data || null))
        .catch((e) => alert(e.message))
        .finally(() => setLoadingSecondary(false)),

      postReport("wod")
        .then((r) => setWodTables(r.wod || r.wodTables || r.data || null))
        .catch((e) => alert(e.message))
        .finally(() => setLoadingWod(false)),

      postReport("price_segment")
        .then((r) =>
          setPriceSegmentTables(
            r.price_segment || r.priceSegmentTables || r.data || null
          )
        )
        .catch((e) => alert(e.message))
        .finally(() => setLoadingPriceSegment(false)),

      postReport("price_segment_40k")
        .then((r) =>
          setPriceSegmentSplit40k(
            r.price_segment_40k || r.priceSegmentTables40k || r.data || null
          )
        )
        .catch((e) => alert(e.message))
        .finally(() => setLoadingPriceSegmentSplit40k(false)),

      // ✅ NEW: YTD pace reports
      postReport("activation_value_ytd")
        .then((r) => setActivationValueYtd(r.activation_value_ytd || r.data || null))
        .catch((e) => alert(e.message))
        .finally(() => setLoadingActivationValueYtd(false)),

      postReport("activation_vol_ytd")
        .then((r) => setActivationVolYtd(r.activation_vol_ytd || r.data || null))
        .catch((e) => alert(e.message))
        .finally(() => setLoadingActivationVolYtd(false)),

      postReport("tertiary_value_ytd")
        .then((r) => setTertiaryValueYtd(r.tertiary_value_ytd || r.data || null))
        .catch((e) => alert(e.message))
        .finally(() => setLoadingTertiaryValueYtd(false)),

      postReport("tertiary_vol_ytd")
        .then((r) => setTertiaryVolYtd(r.tertiary_vol_ytd || r.data || null))
        .catch((e) => alert(e.message))
        .finally(() => setLoadingTertiaryVolYtd(false)),

              // ✅ NEW: YTD actual reports
      postReport("activation_value_ytd_actual")
        .then((r) =>
          setActivationValueYtdActual(
            r.activation_value_ytd_actual || r.data || null
          )
        )
        .catch((e) => alert(e.message))
        .finally(() => setLoadingActivationValueYtdActual(false)),

      postReport("activation_vol_ytd_actual")
        .then((r) =>
          setActivationVolYtdActual(
            r.activation_vol_ytd_actual || r.data || null
          )
        )
        .catch((e) => alert(e.message))
        .finally(() => setLoadingActivationVolYtdActual(false)),

      postReport("tertiary_value_ytd_actual")
        .then((r) =>
          setTertiaryValueYtdActual(
            r.tertiary_value_ytd_actual || r.data || null
          )
        )
        .catch((e) => alert(e.message))
        .finally(() => setLoadingTertiaryValueYtdActual(false)),

      postReport("tertiary_vol_ytd_actual")
        .then((r) =>
          setTertiaryVolYtdActual(
            r.tertiary_vol_ytd_actual || r.data || null
          )
        )
        .catch((e) => alert(e.message))
        .finally(() => setLoadingTertiaryVolYtdActual(false)),
    ];

    await Promise.allSettled(tasks);
  };

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===============================
  // GENERIC TABLE CONTENT RENDERER
  // ===============================
  const renderTableContent = (reportData) => {
    if (!reportData?.table) return null;

    const { value = {}, volume = {} } = reportData.table;
    const columns = Object.keys(value || {});

    return (
      <div className="report-table-wrapper">
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
  // ✅ YTD TABLE CONTENT RENDERER
  // ===============================
  const renderYtdTableContent = (report, { isCurrency = false } = {}) => {
    if (!report?.columns || !report?.rows) return null;

    const { columns, rows } = report;

    return (
      <div className="report-table-wrapper">
        <table className="report-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, idx) => {
              const isGdRow =
                String(row?.Year || "").toLowerCase().includes("g/d") ||
                String(row?.Year || "").toLowerCase().includes("gd");

              return (
                <tr key={idx}>
                  {columns.map((col) => {
                    const v = row?.[col];

                    let cell = "-";
                    if (col === "Year") cell = row?.Year ?? "-";
                    else if (v === null || v === undefined) cell = "-";
                    else if (isGdRow) cell = formatPercent(v);
                    else cell = formatValue(v, isCurrency);

                    const cls =
                      isGdRow && col !== "Year"
                        ? Number(v || 0) >= 0
                          ? "positive"
                          : "negative"
                        : "";

                    return (
                      <td key={col} className={cls}>
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // ===============================
  // WOD TABLES CONTENT
  // ===============================
  const renderWodTablesContent = () => {
    if (!wodTables) return null;

    const sellIn = wodTables.sellInWOD || {};
    const sellOut = wodTables.sellOutWOD || {};
    const columns = Object.keys(sellIn);

    return (
      <div className="wod-section">
        <div className="sub-report-block">
          <div className="sub-report-heading">WOD Summary</div>
          <div className="report-table-wrapper">
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
        </div>

        {wodTables.sellInBreakdown?.length > 0 && (
          <div className="sub-report-block">
            <div className="sub-report-heading">Sell-In WOD Breakdown</div>
            <div className="report-table-wrapper">
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
          </div>
        )}

        {wodTables.sellOutBreakdown?.length > 0 && (
          <div className="sub-report-block">
            <div className="sub-report-heading">Sell-Out WOD Breakdown</div>
            <div className="report-table-wrapper">
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

        <ReportGroup
          title="Core Sales Reports"
          subtitle="Primary value and volume summaries"
          tone="blue"
          defaultOpen={true}
        >
          {loadingActivation ? (
            <SectionLoader title="Activation (Sell-Out)" tone="blue" />
          ) : (
            <ReportCard
              title="Activation (Sell-Out)"
              subtitle="Sell-out value and volume summary"
              tone="blue"
            >
              {renderTableContent(activation)}
            </ReportCard>
          )}

          {loadingTertiary ? (
            <SectionLoader title="Tertiary (Sell-In)" tone="blue" />
          ) : (
            <ReportCard
              title="Tertiary (Sell-In)"
              subtitle="Sell-in value and volume summary"
              tone="blue"
            >
              {renderTableContent(tertiary)}
            </ReportCard>
          )}

          {loadingSecondary ? (
            <SectionLoader title="Secondary (SPD → MDD)" tone="blue" />
          ) : (
            <ReportCard
              title="Secondary (SPD → MDD)"
              subtitle="Movement summary across channel"
              tone="blue"
            >
              {renderTableContent(secondary)}
            </ReportCard>
          )}
        </ReportGroup>

        <ReportGroup
          title="WOD Reports"
          subtitle="Week of distribution insights"
          tone="purple"
          defaultOpen={true}
        >
          {loadingWod ? (
            <SectionLoader title="WOD" tone="purple" />
          ) : (
            <ReportCard
              title="WOD"
              subtitle="Sell-in and sell-out WOD overview"
              tone="purple"
            >
              {renderWodTablesContent()}
            </ReportCard>
          )}
        </ReportGroup>

        <ReportGroup
          title="Price Segment Reports"
          subtitle="Price-wise performance breakdown"
          tone="orange"
          defaultOpen={false}
        >
          {loadingPriceSegment ? (
            <SectionLoader title="Activation – Price Segment Wise" tone="orange" />
          ) : (
            priceSegmentTables && (
              <ReportCard
                title="Activation – Price Segment Wise"
                subtitle="Segment-based activation distribution"
                tone="orange"
              >
                <PriceSegmentTable
                  data={priceSegmentTables}
                  title=""
                  formatValue={formatValue}
                />
              </ReportCard>
            )
          )}

          {loadingPriceSegmentSplit40k ? (
            <SectionLoader title="Activation – 40K vs >40K" tone="orange" />
          ) : (
            priceSegmentSplit40k && (
              <ReportCard
                title="Activation – 40K vs >40K"
                subtitle="Premium split analysis"
                tone="orange"
              >
                <PriceSegmentTable
                  data={priceSegmentSplit40k}
                  title=""
                  formatValue={formatValue}
                />
              </ReportCard>
            )
          )}
        </ReportGroup>

        <ReportGroup
          title="YTD Actual Reports"
          subtitle="Full-month year-to-date actual monthly analysis"
          tone="teal"
          defaultOpen={false}
        >
          {loadingActivationValueYtdActual ? (
            <SectionLoader title="Activation Value YTD Actual" tone="teal" />
          ) : (
            <ReportCard
              title="Activation Value YTD Actual"
              subtitle="Full-month activation value trend"
              tone="teal"
            >
              {renderYtdTableContent(activationValueYtdActual, {
                isCurrency: true,
              })}
            </ReportCard>
          )}

          {loadingActivationVolYtdActual ? (
            <SectionLoader title="Activation Vol YTD Actual" tone="teal" />
          ) : (
            <ReportCard
              title="Activation Vol YTD Actual"
              subtitle="Full-month activation volume trend"
              tone="teal"
            >
              {renderYtdTableContent(activationVolYtdActual, {
                isCurrency: false,
              })}
            </ReportCard>
          )}

          {loadingTertiaryValueYtdActual ? (
            <SectionLoader title="Tertiary Value YTD Actual" tone="teal" />
          ) : (
            <ReportCard
              title="Tertiary Value YTD Actual"
              subtitle="Full-month tertiary value performance"
              tone="teal"
            >
              {renderYtdTableContent(tertiaryValueYtdActual, {
                isCurrency: true,
              })}
            </ReportCard>
          )}

          {loadingTertiaryVolYtdActual ? (
            <SectionLoader title="Tertiary Vol YTD Actual" tone="teal" />
          ) : (
            <ReportCard
              title="Tertiary Vol YTD Actual"
              subtitle="Full-month tertiary volume performance"
              tone="teal"
            >
              {renderYtdTableContent(tertiaryVolYtdActual, {
                isCurrency: false,
              })}
            </ReportCard>
          )}
        </ReportGroup>

        <ReportGroup
          title="YTD Pace Reports "
          subtitle="Pace-based YTD analysis using same day-of-month comparison"
          tone="green"
          defaultOpen={false}
        >
          {loadingActivationValueYtd ? (
            <SectionLoader title="Activation Value YTD G/D" tone="green" />
          ) : (
            <ReportCard
              title="Activation Value YTD G/D"
              subtitle="Year-to-date value trend"
              tone="green"
            >
              {renderYtdTableContent(activationValueYtd, { isCurrency: true })}
            </ReportCard>
          )}

          {loadingActivationVolYtd ? (
            <SectionLoader title="Activation Vol YTD G/D" tone="green" />
          ) : (
            <ReportCard
              title="Activation Vol YTD G/D"
              subtitle="Year-to-date volume trend"
              tone="green"
            >
              {renderYtdTableContent(activationVolYtd, { isCurrency: false })}
            </ReportCard>
          )}

          {loadingTertiaryValueYtd ? (
            <SectionLoader title="Tertiary Value YTD G/D" tone="green" />
          ) : (
            <ReportCard
              title="Tertiary Value YTD G/D"
              subtitle="Year-to-date value performance"
              tone="green"
            >
              {renderYtdTableContent(tertiaryValueYtd, { isCurrency: true })}
            </ReportCard>
          )}

          {loadingTertiaryVolYtd ? (
            <SectionLoader title="Tertiary Vol YTD G/D" tone="green" />
          ) : (
            <ReportCard
              title="Tertiary Vol YTD G/D"
              subtitle="Year-to-date volume performance"
              tone="green"
            >
              {renderYtdTableContent(tertiaryVolYtd, { isCurrency: false })}
            </ReportCard>
          )}
        </ReportGroup>


      </div>
    </div>
  );
}

export default SalesReportV2;