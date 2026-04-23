import React, { useMemo, useState } from "react";
import "./style.scss";

function SalesSnapshotRecalcModal({
  open,
  onClose,
  backendUrl,
  monthOptions,
  yearOptions,
  initialMonth,
  initialYear,
}) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [loading, setLoading] = useState(false);
  const [runningMode, setRunningMode] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const monthLabel = useMemo(() => {
    const match = monthOptions.find((m) => Number(m.value) === Number(month));
    return match?.label || month;
  }, [month, monthOptions]);

  if (!open) return null;

  const runRequest = async (dryRun) => {
    setLoading(true);
    setRunningMode(dryRun ? "dry" : "apply");
    setError("");

    try {
      const res = await fetch(
        `${backendUrl}/police/recalculate-sales-snapshots-by-month`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: localStorage.getItem("authToken"),
          },
          body: JSON.stringify({
            month: Number(month),
            year: Number(year),
            dryRun,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to process snapshot recalculation");
        return;
      }

      setResult(data);
    } catch (err) {
      console.error("Snapshot recalculation error:", err);
      setError("Network error");
    } finally {
      setLoading(false);
      setRunningMode("");
    }
  };

  const handleApply = async () => {
    const confirmed = window.confirm(
      `Recalculate sales snapshot fields for ${monthLabel} ${year}? This will update Activation, Tertiary, and Secondary rows for that month.`
    );
    if (!confirmed) return;
    await runRequest(false);
  };

  const renderDatasetCard = (title, data) => {
    if (!data) return null;

    return (
      <div className="flag-card">
        <h3>{title}</h3>
        <div><strong>Total Rows:</strong> {data.totalRows || 0}</div>
        <div><strong>Changed:</strong> {data.changedCount || 0}</div>
        <div><strong>Unchanged:</strong> {data.unchangedCount || 0}</div>
        <div><strong>Matched Product:</strong> {data.matchedProductCount || 0}</div>
        <div><strong>Derived Price:</strong> {data.derivedPriceCount || 0}</div>
        <div><strong>Blank Segment:</strong> {data.blankSegmentCount || 0}</div>
      </div>
    );
  };

  const renderPreviewTable = (title, rows) => {
    if (!rows?.length) return null;

    return (
      <div className="table-section">
        <h3>{title} Preview</h3>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Code</th>
              <th>Model</th>
              <th>Qty</th>
              <th>Value</th>
              <th>Old Price</th>
              <th>New Price</th>
              <th>Old Segment</th>
              <th>New Segment</th>
              <th>Product Match</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row._id || i}>
                <td>{i + 1}</td>
                <td>{row.code || "-"}</td>
                <td>{row.model || "-"}</td>
                <td>{row.qty ?? 0}</td>
                <td>{row.value ?? 0}</td>
                <td>{row.oldUnitPrice ?? 0}</td>
                <td>{row.newUnitPrice ?? 0}</td>
                <td>{row.oldSegment || "-"}</td>
                <td>{row.newSegment || "-"}</td>
                <td>{row.matchedFromProduct ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="duplicate-result-modal-overlay" onClick={onClose}>
      <div
        className="duplicate-result-modal sales-snapshot-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="duplicate-result-modal-header">
          <div>
            <h2>Sales Snapshot Recalculation</h2>
            <p>
              Recalculate <code>unit_price_snapshot</code> and{" "}
              <code>segment_snapshot</code> for Activation, Tertiary, and
              Secondary for one month.
            </p>
          </div>

          <button
            className="duplicate-result-modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="duplicate-result-modal-body">
          <div className="market-sales-download-controls" style={{ marginBottom: 16 }}>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              disabled={loading}
            >
              {monthOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              disabled={loading}
            >
              {yearOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <button
              className="secondary-feature-btn"
              onClick={() => runRequest(true)}
              disabled={loading}
            >
              {loading && runningMode === "dry" ? "Running Dry Run..." : "Run Dry Run"}
            </button>

            <button
              className="feature-btn"
              onClick={handleApply}
              disabled={loading}
            >
              {loading && runningMode === "apply" ? "Applying..." : "Apply Changes"}
            </button>
          </div>

          <div className="helper-text" style={{ marginBottom: 16 }}>
            Dry run shows how many rows would change and sample preview rows before updating anything.
          </div>

          {error && <div className="error">{error}</div>}

          {result && (
            <>
              <div className="duplicate-stats-grid">
                <div className="flag-card">
                  <div><strong>Mode:</strong> {result.dryRun ? "Dry Run" : "Applied"}</div>
                  <div><strong>Month:</strong> {result.month || "-"}</div>
                  <div><strong>Total Rows:</strong> {result.stats?.totalRows || 0}</div>
                  <div><strong>Total Changed:</strong> {result.stats?.totalChanged || 0}</div>
                  <div><strong>Message:</strong> {result.message || "-"}</div>
                </div>

                {renderDatasetCard("Activation", result.activation)}
                {renderDatasetCard("Tertiary", result.tertiary)}
                {renderDatasetCard("Secondary", result.secondary)}
              </div>

              {renderPreviewTable("Activation", result.activation?.preview)}
              {renderPreviewTable("Tertiary", result.tertiary?.preview)}
              {renderPreviewTable("Secondary", result.secondary?.preview)}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SalesSnapshotRecalcModal;