import React, { useEffect, useMemo, useState } from "react";
import "./style.scss";

function StockUploadModal({
  open,
  onClose,
  endpoint,
  fileFieldName = "file",
  onSuccess,
}) {
  const [file, setFile] = useState(null);
  const [dryRun, setDryRun] = useState(true);
  const [replaceLatest, setReplaceLatest] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setDryRun(true);
      setReplaceLatest(true);
      setLoading(false);
      setError("");
      setResult(null);
    }
  }, [open]);

  const selectedFileName = useMemo(() => file?.name || "", [file]);

  const handleUpload = async () => {
    try {
      setError("");
      setResult(null);

      if (!file) {
        setError("Please select an Excel file.");
        return;
      }

      const lowerName = file.name.toLowerCase();

      if (!lowerName.endsWith(".xlsx") && !lowerName.endsWith(".xls")) {
        setError("Only .xlsx or .xls files are allowed.");
        return;
      }

      const formData = new FormData();
      formData.append(fileFieldName, file);
      formData.append("replaceLatest", String(replaceLatest));

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
        setError(data?.message || "Stock upload failed");
        setResult(data || null);
        return;
      }

      setResult(data);

      if (!dryRun && typeof onSuccess === "function") {
        onSuccess(data);
      }
    } catch (err) {
      console.error("Stock upload failed:", err);
      setError("Network error while uploading stock file.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const previewRows = result?.preview || [];
  const errors = result?.errors || [];

  return (
    <div className="csv-modal-overlay" onClick={onClose}>
      <div className="csv-modal stock-upload-modal" onClick={(e) => e.stopPropagation()}>
        <div className="csv-modal-header">
          <div>
            <h2>Upload Stock Report</h2>
            <p>
              Upload cleaned stock Excel or raw Samsung stock report. Run dry preview first,
              then upload to replace latest stock snapshot.
            </p>
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
                accept=".xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <span>{selectedFileName || "Choose Excel stock file"}</span>
            </label>

            <div className="csv-section">
              <h4>Upload Rules</h4>

              <label className="csv-toggle-row">
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                />
                <div>
                  <strong>Dry Run</strong>
                  <span>
                    Preview valid rows, invalid rows, and duplicate IMEIs without saving.
                  </span>
                </div>
              </label>

              <label className="csv-toggle-row">
                <input
                  type="checkbox"
                  checked={replaceLatest}
                  onChange={(e) => setReplaceLatest(e.target.checked)}
                  disabled={dryRun}
                />
                <div>
                  <strong>Replace Latest Stock</strong>
                  <span>
                    Mark previous stock as old and make this upload the latest stock snapshot.
                  </span>
                </div>
              </label>
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
                    : "Uploading Stock..."
                  : dryRun
                  ? "Run Stock Preview"
                  : "Upload Stock"}
              </button>
            </div>
          </div>

          {result ? (
            <div className="csv-result-card">
              <div className="csv-result-header">
                <h3>{result?.dryRun ? "Stock Dry Run Result" : "Stock Upload Result"}</h3>
                {result?.message ? <p>{result.message}</p> : null}
              </div>

              <div className="csv-summary-grid">
                <div className="csv-summary-item">
                  <span>Total Rows</span>
                  <strong>{result?.totalRows ?? 0}</strong>
                </div>

                <div className="csv-summary-item">
                  <span>Valid Rows</span>
                  <strong>{result?.validRows ?? result?.insertedRows ?? 0}</strong>
                </div>

                <div className="csv-summary-item">
                  <span>Invalid Rows</span>
                  <strong>{result?.invalidRows ?? 0}</strong>
                </div>

                <div className="csv-summary-item">
                  <span>Replace Latest</span>
                  <strong>{String(result?.replaceLatest ?? replaceLatest)}</strong>
                </div>
              </div>

              {result?.batchId ? (
                <div className="csv-result-section">
                  <h4>Batch</h4>
                  <div className="csv-summary-grid">
                    <div className="csv-summary-item">
                      <span>Batch ID</span>
                      <strong>{result.batchId}</strong>
                    </div>
                  </div>
                </div>
              ) : null}

              {previewRows.length > 0 ? (
                <div className="csv-result-section">
                  <h4>Preview Sample</h4>

                  <div className="csv-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Holder Code</th>
                          <th>Holder Name</th>
                          <th>Product Code</th>
                          <th>IMEI / Serial</th>
                          <th>Aging</th>
                          <th>Bucket</th>
                        </tr>
                      </thead>

                      <tbody>
                        {previewRows.slice(0, 50).map((item, idx) => (
                          <tr key={`${item.imeiOrSerialNo || idx}-${idx}`}>
                            <td>{item.rowNumber || "-"}</td>
                            <td>{item.holderCode || "-"}</td>
                            <td>{item.holderName || "-"}</td>
                            <td>{item.productCode || "-"}</td>
                            <td>{item.imeiOrSerialNo || "-"}</td>
                            <td>{item.agingDays ?? "-"}</td>
                            <td>{item.agingBucket || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {errors.length > 0 ? (
                <div className="csv-result-section">
                  <h4>Errors</h4>

                  <div className="csv-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Reason</th>
                        </tr>
                      </thead>

                      <tbody>
                        {errors.slice(0, 100).map((item, idx) => (
                          <tr key={`${item.rowNumber || idx}-${idx}`}>
                            <td>{item.rowNumber || "-"}</td>
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

export default StockUploadModal;