import React, { useEffect, useMemo, useState } from "react";

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function BeatMappingSyncModal({ open, onClose, backendUrl }) {
  const today = useMemo(() => getTodayDate(), []);

  const [actorCode, setActorCode] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [dryRun, setDryRun] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open) return;

    setActorCode("");
    setStartDate(today);
    setEndDate(today);
    setDryRun(true);
    setLoading(false);
    setError("");
    setResult(null);
  }, [open, today]);

  useEffect(() => {
    if (!open) return;

    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const runSync = async (forceDryRun = dryRun) => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(
        `${backendUrl}/admin/beat-mapping/sync-dealer-info?dryRun=${forceDryRun}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: localStorage.getItem("authToken"),
          },
          body: JSON.stringify({
            actorCode: actorCode.trim() || undefined,
            startDate,
            endDate,
            dryRun: forceDryRun,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to sync beat mapping dealer info");
        return;
      }

      setResult(data);
    } catch (err) {
      console.error("Error syncing beat mapping dealer info:", err);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleDryRun = () => {
    runSync(true);
  };

  const handleApplyUpdate = () => {
    const confirmed = window.confirm(
      "This will update beat mapping dealer info for the selected filters. Continue?"
    );
    if (!confirmed) return;
    runSync(false);
  };

  if (!open) return null;

  return (
    <div className="beat-sync-modal-overlay" onClick={onClose}>
      <div
        className="beat-sync-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="beat-sync-modal__header">
          <div>
            <h2>Beat Mapping Dealer Info Sync</h2>
            <p>
              Sync zone, district, taluka, town, latitude, longitude, name and
              position from User master into beat mapping schedule records.
            </p>
          </div>

          <button
            className="beat-sync-modal__close"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="beat-sync-modal__body">
          <div className="beat-sync-form-grid">
            <div className="beat-sync-field">
              <label>Actor Code</label>
              <input
                type="text"
                value={actorCode}
                onChange={(e) => setActorCode(e.target.value)}
                placeholder="Optional, e.g. SID001"
              />
              <small>Leave empty to sync all matching schedules.</small>
            </div>

            <div className="beat-sync-field">
              <label>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="beat-sync-field">
              <label>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="beat-sync-field beat-sync-checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                />
                Run as dry run by default
              </label>
            </div>
          </div>

          <div className="beat-sync-actions">
            <button
              className="secondary-feature-btn"
              onClick={handleDryRun}
              disabled={loading || !startDate || !endDate}
            >
              {loading && dryRun ? "Running..." : "Run Dry Run"}
            </button>

            <button
              className="feature-btn"
              onClick={handleApplyUpdate}
              disabled={loading || !startDate || !endDate}
            >
              {loading && !dryRun ? "Updating..." : "Apply Update"}
            </button>
          </div>

          {error && <div className="error">{error}</div>}

          {result && (
            <div className="beat-sync-result">
              <div className="beat-sync-stats-grid">
                <div className="flag-card">
                  <div><strong>Dry Run:</strong> {String(result.dryRun)}</div>
                  <div><strong>Actor Code:</strong> {result.actorCode || "All"}</div>
                  <div><strong>Matched Schedules:</strong> {result.matchedSchedules || 0}</div>
                  <div><strong>Matched Entries:</strong> {result.matchedEntries || 0}</div>
                  <div><strong>Updated Schedules:</strong> {result.updatedSchedules || 0}</div>
                  <div><strong>Updated Entries:</strong> {result.updatedEntries || 0}</div>
                  <div><strong>Skipped Entries:</strong> {result.skippedEntries || 0}</div>
                </div>

                <div className="flag-card">
                  <div>
                    <strong>Message:</strong> {result.message || "-"}
                  </div>
                  <div>
                    <strong>Missing Users:</strong> {result.missingUsers?.length || 0}
                  </div>
                  <div>
                    <strong>Start Date:</strong>{" "}
                    {result.startDate ? new Date(result.startDate).toLocaleString() : "-"}
                  </div>
                  <div>
                    <strong>End Date:</strong>{" "}
                    {result.endDate ? new Date(result.endDate).toLocaleString() : "-"}
                  </div>
                </div>
              </div>

              {!!result.missingUsers?.length && (
                <div className="beat-sync-missing-users">
                  <h4>Missing Users</h4>
                  <div className="beat-sync-chip-wrap">
                    {result.missingUsers.map((code) => (
                      <span key={code} className="pill danger-pill">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {!!result.preview?.length && (
                <div className="beat-sync-preview-table-wrap">
                  <h4>Preview</h4>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Actor Code</th>
                        <th>Dealer Code</th>
                        <th>Dealer Name</th>
                        <th>Changed Fields</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.preview.map((row, index) => (
                        <tr key={`${row.scheduleId}-${row.dealerCode}-${index}`}>
                          <td>{index + 1}</td>
                          <td>{row.actorCode || "-"}</td>
                          <td>{row.dealerCode || "-"}</td>
                          <td>{row.dealerName || "-"}</td>
                          <td>
                            {row.changes
                              ? Object.keys(row.changes).join(", ")
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!result.dryRun && (
                <div className="helper-text" style={{ marginTop: 12 }}>
                  Update completed. You can run another dry run to verify latest state.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BeatMappingSyncModal;