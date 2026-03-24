import React, { useEffect, useMemo, useState } from "react";
import "./style.scss";

function CsvUploadModal({
  open,
  onClose,
  title = "Upload CSV",
  subtitle = "",
  endpoint,
  fileFieldName = "file",
  extraFields = [],
  onSuccess,
}) {
  const [file, setFile] = useState(null);
  const [dryRun, setDryRun] = useState(true);
  const [createMissingUser, setCreateMissingUser] = useState(true);
    const [createMissingActorCode, setCreateMissingActorCode] = useState(true);

    const [createNewFieldsUser, setCreateNewFieldsUser] = useState(false);
    const [createNewFieldsActorCode, setCreateNewFieldsActorCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [syncTarget, setSyncTarget] = useState("user");

  useEffect(() => {
    if (!open) {
      setFile(null);
      setDryRun(true);
      setCreateMissingUser(true);
        setCreateMissingActorCode(true);

        setCreateNewFieldsUser(false);
        setCreateNewFieldsActorCode(false);
      setLoading(false);
      setError("");
      setResult(null);
      setSyncTarget("user");
    }
  }, [open]);

  const selectedFileName = useMemo(() => file?.name || "", [file]);

  const handleUpload = async () => {
    try {
      setError("");
      setResult(null);

      if (!file) {
        setError("Please select a CSV file.");
        return;
      }

      const formData = new FormData();
      formData.append(fileFieldName, file);
      formData.append("syncTarget", syncTarget);

formData.append("createMissingUser", String(createMissingUser));
formData.append("createMissingActorCode", String(createMissingActorCode));

formData.append("createNewFieldsUser", String(createNewFieldsUser));
formData.append("createNewFieldsActorCode", String(createNewFieldsActorCode));

      if (Array.isArray(extraFields)) {
        extraFields.forEach((field) => {
          if (
            field &&
            field.name &&
            field.value !== undefined &&
            field.value !== null
          ) {
            formData.append(field.name, field.value);
          }
        });
      }

      setLoading(true);

      const authToken = localStorage.getItem("authToken") || "";
      const finalUrl = `${endpoint}?dryRun=${dryRun}`;

      const res = await fetch(finalUrl, {
        method: "POST",
        headers: {
          Authorization: authToken,
        },
        body: formData,
      });

      const contentType = res.headers.get("content-type") || "";
      let data = null;

      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        data = { message: text || "Unexpected response from server" };
      }

      if (!res.ok) {
        setError(data?.message || "Upload failed");
        setResult(data || null);
        return;
      }

      setResult(data);

      if (!dryRun && typeof onSuccess === "function") {
        onSuccess(data);
      }
    } catch (err) {
      console.error("CSV upload failed:", err);
      setError("Network error while uploading CSV.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

const userSummary = result?.user || {};
const actorSummary = result?.actorCode || {};

const userSkipped = userSummary?.skipped || [];
const actorSkipped = actorSummary?.skipped || [];

const userFailed = userSummary?.failedUsers || [];
const actorFailed = actorSummary?.failedUsers || [];

const userSample = userSummary?.sampleUsers || [];
const actorSample = actorSummary?.sampleUsers || [];

  return (
    <div className="csv-modal-overlay" onClick={onClose}>
      <div
        className="csv-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="csv-modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>

          <button className="csv-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="csv-modal-body">
          <div className="csv-upload-card">
            <label className="csv-file-picker">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <span>{selectedFileName || "Choose CSV file"}</span>
            </label>

            <div className="csv-target-selector">

            <label className={`csv-target-card ${syncTarget === "user" ? "active" : ""}`}>
                <input
                type="radio"
                name="syncTarget"
                value="user"
                checked={syncTarget === "user"}
                onChange={(e) => setSyncTarget(e.target.value)}
                />
                <div>
                <strong>User</strong>
                <span>Update only User model entries matched by code.</span>
                </div>
            </label>

            <label className={`csv-target-card ${syncTarget === "actorcode" ? "active" : ""}`}>
                <input
                type="radio"
                name="syncTarget"
                value="actorcode"
                checked={syncTarget === "actorcode"}
                onChange={(e) => setSyncTarget(e.target.value)}
                />
                <div>
                <strong>ActorCode</strong>
                <span>
                    Update ActorCode fields like code, name, position, role, status.
                </span>
                </div>
            </label>

            <label className={`csv-target-card ${syncTarget === "both" ? "active" : ""}`}>
                <input
                type="radio"
                name="syncTarget"
                value="both"
                checked={syncTarget === "both"}
                onChange={(e) => setSyncTarget(e.target.value)}
                />
                <div>
                <strong>Both</strong>
                <span>Update both User and ActorCode in one upload.</span>
                </div>
            </label>
            </div>

            <div className="csv-toggles">
              <label className="csv-toggle-row">
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                />
                <div>
                  <strong>Dry Run</strong>
                  <span>Preview what will happen without updating users.</span>
                </div>
              </label>

<div className="csv-section">
  <h4>Creation Rules</h4>

  {["user", "both"].includes(syncTarget) && (
    <label className="csv-toggle-row">
      <input
        type="checkbox"
        checked={createMissingUser}
        onChange={(e) => setCreateMissingUser(e.target.checked)}
      />
      <div>
        <strong>Create Missing Users</strong>
        <span>
          If a user code is not found, create a new user document.
        </span>
      </div>
    </label>
  )}

  {["actorcode", "both"].includes(syncTarget) && (
    <label className="csv-toggle-row">
      <input
        type="checkbox"
        checked={createMissingActorCode}
        onChange={(e) => setCreateMissingActorCode(e.target.checked)}
      />
      <div>
        <strong>Create Missing Actor Codes</strong>
        <span>
          If actor is not found, create a new ActorCode entry.
        </span>
      </div>
    </label>
  )}
</div>

<div className="csv-section">
  <h4>Field Rules</h4>

  {["user", "both"].includes(syncTarget) && (
    <label className="csv-toggle-row">
      <input
        type="checkbox"
        checked={createNewFieldsUser}
        onChange={(e) => setCreateNewFieldsUser(e.target.checked)}
      />
      <div>
        <strong>Allow New Fields in User</strong>
        <span>
          Add new fields from CSV into user documents.
        </span>
      </div>
    </label>
  )}

  {["actorcode", "both"].includes(syncTarget) && (
    <label className="csv-toggle-row">
      <input
        type="checkbox"
        checked={createNewFieldsActorCode}
        onChange={(e) => setCreateNewFieldsActorCode(e.target.checked)}
      />
      <div>
        <strong>Allow New Fields in ActorCode</strong>
        <span>
          Add extra CSV columns to ActorCode documents.
        </span>
      </div>
    </label>
  )}
</div>
            </div>

            {error ? <div className="csv-inline-error">{error}</div> : null}

            <div className="csv-actions">
              <button
                className="csv-secondary-btn"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>

              <button
                className="csv-primary-btn"
                onClick={handleUpload}
                disabled={loading}
              >
                {loading
                  ? dryRun
                    ? "Running Preview..."
                    : "Uploading..."
                  : dryRun
                  ? "Run Dry Preview"
                  : "Upload & Update Users"}
              </button>
            </div>
          </div>

            {result ? (
            <div className="csv-result-card">
                <div className="csv-result-header">
                <h3>{dryRun ? "Dry Run Result" : "Upload Result"}</h3>
                {result?.message ? <p>{result.message}</p> : null}
                </div>

                <div className="csv-summary-grid">
                <div className="csv-summary-item">
                    <span>Total Rows</span>
                    <strong>{result?.totalRows ?? 0}</strong>
                </div>
                <div className="csv-summary-item">
                    <span>Valid Rows</span>
                    <strong>{result?.validRows ?? 0}</strong>
                </div>
                <div className="csv-summary-item">
                    <span>Unique Codes</span>
                    <strong>{result?.uniqueCodesInFile ?? 0}</strong>
                </div>
                <div className="csv-summary-item">
                    <span>Sync Target</span>
                    <strong>{result?.syncTarget || "-"}</strong>
                </div>
                </div>

                {["user", "both"].includes(result?.syncTarget) ? (
                <div className="csv-result-section">
                    <h4>User Summary</h4>
                    <div className="csv-summary-grid">
                    <div className="csv-summary-item">
                        <span>Found</span>
                        <strong>{userSummary?.found ?? 0}</strong>
                    </div>
                    <div className="csv-summary-item">
                        <span>Updated</span>
                        <strong>{userSummary?.updated ?? 0}</strong>
                    </div>
                    <div className="csv-summary-item">
                        <span>Unchanged</span>
                        <strong>{userSummary?.unchanged ?? 0}</strong>
                    </div>
                    <div className="csv-summary-item">
                        <span>Failed</span>
                        <strong>{userSummary?.failed ?? 0}</strong>
                    </div>
                    </div>
                </div>
                ) : null}

                {["actorcode", "both"].includes(result?.syncTarget) ? (
                <div className="csv-result-section">
                    <h4>ActorCode Summary</h4>
                    <div className="csv-summary-grid">
                    <div className="csv-summary-item">
                        <span>Found</span>
                        <strong>{actorSummary?.found ?? 0}</strong>
                    </div>
                    <div className="csv-summary-item">
                        <span>Updated</span>
                        <strong>{actorSummary?.updated ?? 0}</strong>
                    </div>
                    <div className="csv-summary-item">
                        <span>Unchanged</span>
                        <strong>{actorSummary?.unchanged ?? 0}</strong>
                    </div>
                    <div className="csv-summary-item">
                        <span>Failed</span>
                        <strong>{actorSummary?.failed ?? 0}</strong>
                    </div>
                    </div>
                </div>
                ) : null}

                {userSample.length > 0 ? (
                <div className="csv-result-section">
                    <h4>User Preview Sample</h4>
                    <div className="csv-table-wrap">
                    <table>
                        <thead>
                        <tr>
                            <th>Row</th>
                            <th>Code</th>
                            <th>Name</th>
                            <th>Updated Fields</th>
                        </tr>
                        </thead>
                        <tbody>
                        {userSample.map((item, idx) => (
                            <tr key={`${item.code}-${idx}`}>
                            <td>{item.rowNumber}</td>
                            <td>{item.code}</td>
                            <td>{item.name || "-"}</td>
                            <td>{(item.updatedFields || []).join(", ") || "-"}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    </div>
                </div>
                ) : null}

                {actorSample.length > 0 ? (
                <div className="csv-result-section">
                    <h4>ActorCode Preview Sample</h4>
                    <div className="csv-table-wrap">
                    <table>
                        <thead>
                        <tr>
                            <th>Row</th>
                            <th>Code</th>
                            <th>Name</th>
                            <th>Updated Fields</th>
                        </tr>
                        </thead>
                        <tbody>
                        {actorSample.map((item, idx) => (
                            <tr key={`${item.code}-${idx}`}>
                            <td>{item.rowNumber}</td>
                            <td>{item.code}</td>
                            <td>{item.name || "-"}</td>
                            <td>{(item.updatedFields || []).join(", ") || "-"}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    </div>
                </div>
                ) : null}

                {userSkipped.length > 0 ? (
                <div className="csv-result-section">
                    <h4>User Skipped / Not Found</h4>
                    <div className="csv-table-wrap">
                    <table>
                        <thead>
                        <tr>
                            <th>Row</th>
                            <th>Code</th>
                            <th>Reason</th>
                        </tr>
                        </thead>
                        <tbody>
                        {userSkipped.slice(0, 50).map((item, idx) => (
                            <tr key={`${item.code || "no-code"}-${idx}`}>
                            <td>{item.rowNumber || "-"}</td>
                            <td>{item.code || "-"}</td>
                            <td>{item.reason || "-"}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    </div>
                </div>
                ) : null}

                {actorSkipped.length > 0 ? (
                <div className="csv-result-section">
                    <h4>ActorCode Skipped / Not Found</h4>
                    <div className="csv-table-wrap">
                    <table>
                        <thead>
                        <tr>
                            <th>Row</th>
                            <th>Code</th>
                            <th>Reason</th>
                        </tr>
                        </thead>
                        <tbody>
                        {actorSkipped.slice(0, 50).map((item, idx) => (
                            <tr key={`${item.code || "no-code"}-${idx}`}>
                            <td>{item.rowNumber || "-"}</td>
                            <td>{item.code || "-"}</td>
                            <td>{item.reason || "-"}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    </div>
                </div>
                ) : null}

                {userFailed.length > 0 ? (
                <div className="csv-result-section">
                    <h4>User Failed Updates</h4>
                    <div className="csv-table-wrap">
                    <table>
                        <thead>
                        <tr>
                            <th>Row</th>
                            <th>Code</th>
                            <th>Name</th>
                            <th>Reason</th>
                        </tr>
                        </thead>
                        <tbody>
                        {userFailed.slice(0, 50).map((item, idx) => (
                            <tr key={`${item.code}-${idx}`}>
                            <td>{item.rowNumber || "-"}</td>
                            <td>{item.code || "-"}</td>
                            <td>{item.name || "-"}</td>
                            <td>{item.reason || "-"}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    </div>
                </div>
                ) : null}

                {actorFailed.length > 0 ? (
                <div className="csv-result-section">
                    <h4>ActorCode Failed Updates</h4>
                    <div className="csv-table-wrap">
                    <table>
                        <thead>
                        <tr>
                            <th>Row</th>
                            <th>Code</th>
                            <th>Name</th>
                            <th>Reason</th>
                        </tr>
                        </thead>
                        <tbody>
                        {actorFailed.slice(0, 50).map((item, idx) => (
                            <tr key={`${item.code}-${idx}`}>
                            <td>{item.rowNumber || "-"}</td>
                            <td>{item.code || "-"}</td>
                            <td>{item.name || "-"}</td>
                            <td>{item.reason || "-"}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    </div>
                </div>
                ) : null}
            </div>
            ) : null}
        </div>
      </div>
    </div>
  );
}

export default CsvUploadModal;