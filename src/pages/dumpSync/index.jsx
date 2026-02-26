import React, { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";

import "./style.scss";
import config from "../../config";

const backendUrl = config.backend_url;

// ✅ Your dump-sync endpoints (add more here later)
const DUMP_APIS = [
  {
    key: "samsung_products",
    title: "Samsung Dump → Product Master",
    subtitle: "Creates only missing products (brand+samsung, product_code).",
    endpoint: "/dump-sync/samsung-products/upload",
    accept: [".xlsx", ".xls", ".csv"],
    hint: "Headers needed: MarketName, ProductCode, Modelcode, Segment, Category, Price Per Unit, Segment New, Price Band",
  },
  {
    key: "mdd_dealer_sync",
    title: "Dump → ActorCodes (MDD + Dealer)",
    subtitle: "Creates/updates missing ActorCodes for mdd + dealer, then syncs Users from ActorCodes.",
    endpoint: "/admin/sync-mdd-dealer-from-dump", // <-- put your route here
    accept: [".csv"], // since you said no xlsx
    hint: "Headers used: MDD Code, MDD Name, Buyer Type, BuyerCode, BuyerName",
    }
];

function DumpSyncUpload() {
  const [selectedApiKey, setSelectedApiKey] = useState(DUMP_APIS[0].key);
  const selectedApi = useMemo(
    () => DUMP_APIS.find((x) => x.key === selectedApiKey),
    [selectedApiKey]
  );

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null); // array of arrays
  const [loading, setLoading] = useState(false);

  const [dryRun, setDryRun] = useState(true);
  const [result, setResult] = useState(null);

  const fileRef = useRef();

  // =============================
  // PREVIEW PARSERS (xlsx/csv)
  // =============================
  const parseExcelPreview = async (file) => {
    const buf = await file.arrayBuffer();
    const workbook = XLSX.read(buf, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    return json;
  };

  const parseCsvPreview = async (file) => {
    const text = await file.text();
    const parsed = Papa.parse(text, {
      header: false,
      skipEmptyLines: true,
    });
    return parsed.data;
  };

  const handleFile = async (f) => {
    if (!f) return;

    setResult(null);
    setFile(f);

    const name = (f.name || "").toLowerCase();
    try {
      let table = null;

      if (name.endsWith(".csv")) table = await parseCsvPreview(f);
      else table = await parseExcelPreview(f);

      setPreview(table);
    } catch (err) {
      console.error(err);
      setPreview(null);
      alert("Could not preview file. Please ensure file is valid.");
    }
  };

  // =============================
  // UPLOAD
  // =============================
  const uploadDump = async () => {
    if (!file) return alert("Please select a file first.");

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const url = `${backendUrl}${selectedApi.endpoint}${
        dryRun ? "?dryRun=true" : ""
      }`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Upload failed");
      }

      setResult(data);
    } catch (err) {
      console.error(err);
      alert(err.message || "Upload failed");
    }

    setLoading(false);
  };

  // =============================
  // UI HELPERS
  // =============================
  const renderPreview = (data) => {
    if (!data || !data.length) return null;

    const head = data[0] || [];
    const rows = data.slice(1, 6);

    return (
      <div className="dumpsync-preview">
        <div className="dumpsync-preview__title">Preview (first 5 rows)</div>
        <div className="dumpsync-preview__tableWrap">
          <table>
            <thead>
              <tr>
                {head.map((c, i) => (
                  <th key={i}>{String(c)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {head.map((_, j) => (
                    <td key={j}>{row?.[j] !== undefined ? String(row[j]) : ""}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderResult = () => {
    if (!result) return null;

    return (
      <div className="dumpsync-result">
        <div className="dumpsync-result__head">
          <div className="dumpsync-result__title">
            {result.dryRun ? "Dry Run Result" : "Upload Result"}
          </div>
          <div className={`dumpsync-pill ${result.success ? "ok" : "bad"}`}>
            {result.success ? "Success" : "Failed"}
          </div>
        </div>

        <div className="dumpsync-result__grid">
        {selectedApiKey === "samsung_products" ? (
            <>
            <div className="kpi"><div className="kpi__label">Total Rows</div><div className="kpi__value">{result.totalRows ?? "-"}</div></div>
            <div className="kpi"><div className="kpi__label">Unique Products</div><div className="kpi__value">{result.uniqueProductsInFile ?? "-"}</div></div>
            <div className="kpi"><div className="kpi__label">Existing In DB</div><div className="kpi__value">{result.existingInDb ?? "-"}</div></div>
            <div className="kpi"><div className="kpi__label">New To Insert</div><div className="kpi__value">{result.toInsert ?? "-"}</div></div>
            <div className="kpi"><div className="kpi__label">Inserted</div><div className="kpi__value">{result.inserted ?? "-"}</div></div>
            <div className="kpi"><div className="kpi__label">Skipped</div><div className="kpi__value">{result.skipped ?? "-"}</div></div>
            </>
        ) : selectedApiKey === "mdd_dealer_sync" ? (
            <>
            <div className="kpi"><div className="kpi__label">Total Rows</div><div className="kpi__value">{result.totalRows ?? "-"}</div></div>
            <div className="kpi"><div className="kpi__label">Unique Actors</div><div className="kpi__value">{result.uniqueActorsInFile ?? "-"}</div></div>
            <div className="kpi"><div className="kpi__label">Matched Existing</div><div className="kpi__value">{result.existingMatched ?? "-"}</div></div>
            <div className="kpi"><div className="kpi__label">Will Insert</div><div className="kpi__value">{result.willInsert ?? "-"}</div></div>
            <div className="kpi"><div className="kpi__label">Will Update</div><div className="kpi__value">{result.willUpdate ?? "-"}</div></div>
            <div className="kpi"><div className="kpi__label">Users Synced</div><div className="kpi__value">{result.usersSynced ? "Yes" : "No"}</div></div>
            </>
        ) : null}
        </div>

        {Array.isArray(result.sampleNewProducts) && result.sampleNewProducts.length > 0 && (
          <div className="dumpsync-result__sample">
            <div className="dumpsync-result__title2">Sample New Products</div>
            <div className="dumpsync-result__tableWrap">
              <table>
                <thead>
                  <tr>
                    {[
                      "product_name",
                      "product_code",
                      "model_code",
                      "product_category",
                      "category",
                      "price",
                      "segment",
                      "source",
                      "extraction_active",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.sampleNewProducts.slice(0, 10).map((p, i) => (
                    <tr key={i}>
                      <td>{p.product_name}</td>
                      <td>{p.product_code}</td>
                      <td>{p.model_code}</td>
                      <td>{p.product_category}</td>
                      <td>{p.category}</td>
                      <td>{p.price}</td>
                      <td>{p.segment}</td>
                      <td>{p.source}</td>
                      <td>{p.extraction_active}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="dumpsync-muted">
              Tip: Turn off Dry Run to actually insert.
            </div>
          </div>
        )}

        {Array.isArray(result.sampleActors) && result.sampleActors.length > 0 && (
        <div className="dumpsync-result__sample">
            <div className="dumpsync-result__title2">Sample Actors</div>
            <div className="dumpsync-result__tableWrap">
            <table>
                <thead>
                <tr>
                    {["code", "name", "position", "role", "status"].map((h) => (
                    <th key={h}>{h}</th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {result.sampleActors.slice(0, 15).map((a, i) => (
                    <tr key={i}>
                    <td>{a.code}</td>
                    <td>{a.name}</td>
                    <td>{a.position}</td>
                    <td>{a.role}</td>
                    <td>{a.status}</td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
            <div className="dumpsync-muted">Tip: Turn off Dry Run to apply changes.</div>
        </div>
        )}

        {result.message ? (
          <div className="dumpsync-alert">{result.message}</div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="dumpsync-page">
      <div className="dumpsync-card">
        <div className="dumpsync-header">
          <div className="dumpsync-header__left">
            <div className="dumpsync-title">📥 Dump Sync Upload</div>
            <div className="dumpsync-subtitle">
              Upload Samsung dump (Excel/CSV) and auto-create missing products in Product Master.
            </div>
          </div>
          <div className="dumpsync-header__right">
            <label className="switch">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
              />
              <span className="slider" />
            </label>
            <div className="dumpsync-toggleText">
              Dry Run: <b>{dryRun ? "ON" : "OFF"}</b>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="dumpsync-steps">
          <div className="dumpsync-steps__title">Steps</div>
          <ul>
            <li>Upload .xlsx / .xls / .csv file.</li>
            <li>Do not rename headers.</li>
            <li>Dry Run shows what will be inserted.</li>
            <li>Turn Dry Run OFF to insert new products.</li>
          </ul>
        </div>

        {/* API Select */}
        <div className="dumpsync-controls">
          <div className="field">
            <label>Dump Sync Type</label>
            <select
              value={selectedApiKey}
              onChange={(e) => {
                setSelectedApiKey(e.target.value);
                setFile(null);
                setPreview(null);
                setResult(null);
              }}
            >
              {DUMP_APIS.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.title}
                </option>
              ))}
            </select>
            <div className="help">{selectedApi.subtitle}</div>
          </div>

          <div className="field">
            <label>File</label>

            <input
              type="file"
              hidden
              ref={fileRef}
              accept={selectedApi.accept.join(",")}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            <div
              className={`dropzone ${file ? "hasFile" : ""}`}
              onClick={() => fileRef.current.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFile(e.dataTransfer.files?.[0]);
              }}
            >
              <div className="dropzone__icon">📄</div>
              <div className="dropzone__text">
                {file ? (
                  <>
                    <div className="dropzone__name">{file.name}</div>
                    <div className="dropzone__meta">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </>
                ) : (
                  <>
                    <div className="dropzone__name">Drag & Drop or Click</div>
                    <div className="dropzone__meta">
                      Allowed: {selectedApi.accept.join(" , ")}
                    </div>
                  </>
                )}
              </div>

              {file ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setPreview(null);
                    setResult(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  Clear
                </button>
              ) : null}
            </div>

            <div className="help">{selectedApi.hint}</div>
          </div>
        </div>

        {/* Preview */}
        {renderPreview(preview)}

        {/* Actions */}
        <div className="dumpsync-actions">
          <button
            className="btn btn-primary"
            onClick={uploadDump}
            disabled={loading || !file}
          >
            {loading ? "Uploading..." : dryRun ? "🧪 Run Dry Sync" : "🚀 Sync Now"}
          </button>

          <button
            className="btn btn-ghost"
            onClick={() => {
              setFile(null);
              setPreview(null);
              setResult(null);
              if (fileRef.current) fileRef.current.value = "";
            }}
            disabled={loading}
          >
            Reset
          </button>
        </div>

        {/* Result */}
        {renderResult()}
      </div>
    </div>
  );
}

export default DumpSyncUpload;