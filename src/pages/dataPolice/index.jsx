import React, { useState, useEffect } from "react";
import config from "../../config";
import CsvUploadModal from "./CsvUploadModal";
import "./style.scss";
import BeatMappingSyncModal from "./BeatMappingSyncModal";
import SalesSnapshotRecalcModal from "./SalesSnapshotRecalcModal";

const backendUrl = config.backend_url;

function DataPolice() {
  const role = localStorage.getItem("role");
  const isSuperAdmin = role === "super_admin";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [unmappedProducts, setUnmappedProducts] = useState([]);
  const [excludedData, setExcludedData] = useState(null);
  const [flagsData, setFlagsData] = useState(null);

  const [showUserCsvModal, setShowUserCsvModal] = useState(false);
  const [showBeatSyncModal, setShowBeatSyncModal] = useState(false);

  const today = new Date();
  const [downloadMonth, setDownloadMonth] = useState(today.getMonth() + 1);
  const [downloadYear, setDownloadYear] = useState(today.getFullYear());
  const [isDownloadingMarketSales, setIsDownloadingMarketSales] =
    useState(false);
  const [duplicateMonth, setDuplicateMonth] = useState(today.getMonth() + 1);
  const [duplicateYear, setDuplicateYear] = useState(today.getFullYear());
  const [dealerCodesInput, setDealerCodesInput] = useState("");
  const [isRunningDuplicateDryRun, setIsRunningDuplicateDryRun] =
    useState(false);
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);
  const [duplicateDryRunResult, setDuplicateDryRunResult] = useState(null);
  const [duplicateCleanupResult, setDuplicateCleanupResult] = useState(null);
  const [showDuplicateResultModal, setShowDuplicateResultModal] = useState(false);

  const [isRecalculatingSegments, setIsRecalculatingSegments] = useState(false);
  const [segmentRecalcResult, setSegmentRecalcResult] = useState(null);

  const [showSalesSnapshotModal, setShowSalesSnapshotModal] = useState(false);


  const monthOptions = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const yearOptions = Array.from(
    { length: 7 },
    (_, i) => today.getFullYear() - 3 + i
  );

  useEffect(() => {
    const todayDate = new Date();
    const firstDay = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);

    setStartDate(firstDay.toISOString().split("T")[0]);
    setEndDate(todayDate.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    setDuplicateDryRunResult(null);
    setDuplicateCleanupResult(null);
    setShowDuplicateResultModal(false);
  }, [duplicateMonth, duplicateYear, dealerCodesInput]);

  const getDealerCodesPayload = () =>
    dealerCodesInput
      .split(/[\n,]+/)
      .map((code) => code.trim())
      .filter(Boolean);

  const downloadMarketSalesData = async () => {
    setIsDownloadingMarketSales(true);
    setError("");

    try {
      const res = await fetch(
        `${backendUrl}/download-market-sales-data-month-wise`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: localStorage.getItem("authToken"),
          },
          body: JSON.stringify({
            month: Number(downloadMonth),
            year: Number(downloadYear),
          }),
        }
      );

      const contentType = res.headers.get("content-type") || "";

      if (!res.ok) {
        if (contentType.includes("application/json")) {
          const data = await res.json();
          setError(data.message || "Download failed");
        } else {
          setError("Download failed");
        }
        return;
      }

      if (
        contentType.includes(
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
      ) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `Market_Sales_Data_${String(downloadMonth).padStart(
          2,
          "0"
        )}_${downloadYear}.xlsx`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else if (contentType.includes("application/json")) {
        const data = await res.json();
        setError(data.message || "No data found");
      } else {
        setError("Unexpected response received");
      }
    } catch (err) {
      console.error("Error downloading market sales data:", err);
      setError("Network error");
    } finally {
      setIsDownloadingMarketSales(false);
    }
  };

  const fetchUnmappedProducts = async () => {
    setLoading(true);
    setError("");
    setActiveTab("unmapped");

    try {
      const res = await fetch(`${backendUrl}/police/unmapped-products`, {
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Error");
      } else {
        setUnmappedProducts(data.missingModels || []);
      }
    } catch {
      setError("Network error");
    }

    setLoading(false);
  };

  const runDuplicateDryRun = async () => {
    setIsRunningDuplicateDryRun(true);
    setError("");
    setDuplicateCleanupResult(null);

    try {
      const res = await fetch(
        `${backendUrl}/police/extraction-duplicates/dry-run`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: localStorage.getItem("authToken"),
          },
          body: JSON.stringify({
            month: Number(duplicateMonth),
            year: Number(duplicateYear),
            dealerCodes: getDealerCodesPayload(),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to run duplicate dry run");
        return;
      }

      setDuplicateDryRunResult(data);
      setShowDuplicateResultModal(true);
    } catch (err) {
      console.error("Error in duplicate dry run:", err);
      setError("Network error");
    } finally {
      setIsRunningDuplicateDryRun(false);
    }
  };

  const cleanupDuplicates = async () => {
    const confirmed = window.confirm(
      "Delete duplicate extraction copies for the selected month and dealer codes? One record per duplicate group will be kept."
    );

    if (!confirmed) return;

    setIsCleaningDuplicates(true);
    setError("");

    try {
      const res = await fetch(`${backendUrl}/police/extraction-duplicates/cleanup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.getItem("authToken"),
        },
        body: JSON.stringify({
          month: Number(duplicateMonth),
          year: Number(duplicateYear),
          dealerCodes: getDealerCodesPayload(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to clean duplicate records");
        return;
      }

      setDuplicateCleanupResult(data);
      setDuplicateDryRunResult(data);
      setShowDuplicateResultModal(true);
    } catch (err) {
      console.error("Error cleaning extraction duplicates:", err);
      setError("Network error");
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  const fetchExcludedData = async () => {
    setLoading(true);
    setError("");
    setActiveTab("excluded");

    try {
      const res = await fetch(`${backendUrl}/police/excluded-raw-data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.getItem("authToken"),
        },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          filters: {},
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Error");
      } else {
        setExcludedData(data);
      }
    } catch {
      setError("Network error");
    }

    setLoading(false);
  };

  const fetchSalesReportFlags = async () => {
    setLoading(true);
    setError("");
    setActiveTab("flags");

    try {
      const res = await fetch(`${backendUrl}/reports/sales-report-flags`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.getItem("authToken"),
        },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          filters: {},
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Error fetching flags");
      } else {
        setFlagsData(data);
      }
    } catch {
      setError("Network error");
    }

    setLoading(false);
  };

  const recalculateExtractionSegments = async () => {
    setIsRecalculatingSegments(true);
    setError("");
    setSegmentRecalcResult(null);

    try {
      const res = await fetch(
        `${backendUrl}/recalculate-extraction-segments-by-date-range`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: localStorage.getItem("authToken"),
          },
          body: JSON.stringify({
            startDate,
            endDate,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to recalculate extraction segments");
      } else {
        setSegmentRecalcResult(data);
      }
    } catch (err) {
      console.error("Error recalculating extraction segments:", err);
      setError("Network error");
    } finally {
      setIsRecalculatingSegments(false);
    }
  };

  const renderExcludedTable = (title, dataset, valueField, qtyField) => {
    if (!dataset?.rows?.length) return null;

    return (
      <div className="table-section">
        <h3>{title}</h3>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Code</th>
              <th>Value</th>
              <th>Qty</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {dataset.rows.map((row, i) => (
              <tr key={row._id || i}>
                <td>{i + 1}</td>
                <td>{row.activation_date_raw || row.invoice_date_raw}</td>
                <td>
                  {row.tertiary_buyer_code || row.dealer_code || row.mdd_code}
                </td>
                <td>{row[valueField]}</td>
                <td>{row[qtyField]}</td>
                <td>{row.exclusionReason}</td>
              </tr>
            ))}

            <tr className="total-row">
              <td colSpan="3">TOTAL</td>
              <td>{dataset.totalVal}</td>
              <td>{dataset.totalQty}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderFlagCard = (title, dataset) => {
    if (!dataset) return null;

    return (
      <div className="flag-card">
        <h3>{title}</h3>

        <div>
          <strong>Excluded Rows:</strong> {dataset.totalExcluded}
        </div>
        <div>
          <strong>Total Value:</strong> {dataset.totalVal}
        </div>
        <div>
          <strong>Total Qty:</strong> {dataset.totalQty}
        </div>

        <div className="flag-breakdown">
          {Object.entries(dataset.breakdown || {}).map(([reason, count]) => (
            <div key={reason}>
              {count} → {reason}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderWodCard = (dataset) => {
    if (!dataset) return null;

    return (
      <div className="flag-card">
        <h3>WOD</h3>

        <div>
          <strong>Total Dealers (Active):</strong> {dataset.totalDealers}
        </div>

        <div>
          <strong>Excluded Dealers:</strong> {dataset.excludedDealers}
        </div>
      </div>
    );
  };

  if (!isSuperAdmin) {
    return (
      <div className="data-police-page">
        <div className="container">
          <div className="tool-card restricted-card">
            <h3>Data Manager</h3>
            <p>This page is available only to super admins.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="data-police-page">
      <div className="container">
        <div className="data-police-header">
          <div>
            <h3>Data Manager</h3>
            <p>
              Manage sync tools, validations, flags, and bulk master uploads.
            </p>
          </div>

          <button
            className="primary-action-btn"
            onClick={() => setShowUserCsvModal(true)}
          >
            Update Users From CSV
          </button>
        </div>

        <div className="date-controls">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="market-sales-download-box">
          <h3>Download Market Sales Data</h3>

          <div className="market-sales-download-controls">
            <select
              value={downloadMonth}
              onChange={(e) => setDownloadMonth(Number(e.target.value))}
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>

            <select
              value={downloadYear}
              onChange={(e) => setDownloadYear(Number(e.target.value))}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <button
              onClick={downloadMarketSalesData}
              disabled={isDownloadingMarketSales}
            >
              {isDownloadingMarketSales
                ? "Downloading..."
                : "Download Market Sales"}
            </button>
          </div>
        </div>

        <div className="tool-card feature-card duplicate-cleanup-card">
          <div className="tool-card-top">
            <h3>Extraction Duplicate Cleanup</h3>
            <span className="pill danger-pill">Super Admin Only</span>
          </div>

          <p>
            Scan extraction records by `createdAt` month and optional dealer codes,
            preview duplicate groups, and delete only the extra copies while keeping
            one record per group.
          </p>

          <div className="duplicate-cleanup-controls">
            <select
              value={duplicateMonth}
              onChange={(e) => setDuplicateMonth(Number(e.target.value))}
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>

            <select
              value={duplicateYear}
              onChange={(e) => setDuplicateYear(Number(e.target.value))}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <button
              className="secondary-feature-btn"
              onClick={runDuplicateDryRun}
              disabled={isRunningDuplicateDryRun}
            >
              {isRunningDuplicateDryRun ? "Running Dry Run..." : "Run Dry Run"}
            </button>

            <button
              className="danger-feature-btn"
              onClick={cleanupDuplicates}
              disabled={
                isCleaningDuplicates ||
                !duplicateDryRunResult?.stats?.duplicateCopyCount
              }
            >
              {isCleaningDuplicates ? "Deleting..." : "Delete Duplicate Copies"}
            </button>
          </div>

          <textarea
            className="dealer-codes-input"
            value={dealerCodesInput}
            onChange={(e) => setDealerCodesInput(e.target.value)}
            placeholder={`Optional dealer codes. Paste comma-separated or one per line, for example:\nRAJD8361\nRAJD9001`}
          />

          <div className="helper-text">
            Leave dealer codes empty to scan the full selected month. Duplicate rule:
            same date, uploaded by, dealer, brand, product code, product name,
            segment, price, quantity, and amount.
          </div>
        </div>

        <div className="tool-grid">
          <div className="tool-card feature-card">
            <div className="tool-card-top">
              <h3>User Master Sync</h3>
              <span className="pill">CSV</span>
            </div>
            <p>
              Bulk update users by code using CSV upload with dry run and field
              creation support.
            </p>
            <button
              className="feature-btn"
              onClick={() => setShowUserCsvModal(true)}
            >
              Open Upload Tool
            </button>
          </div>

          <div className="tool-card feature-card">
            <div className="tool-card-top">
              <h3>Beat Mapping Dealer Sync</h3>
              <span className="pill">Schedule Repair</span>
            </div>
            <p>
              Update dealer info inside beat mapping schedules using User master data with
              date range, actor code, and dry run support.
            </p>
            <button
              className="feature-btn"
              onClick={() => setShowBeatSyncModal(true)}
            >
              Open Sync Tool
            </button>
          </div>

          <div className="tool-card">
            <div className="button-group">
              <button onClick={fetchUnmappedProducts}>Unmapped Products</button>
              <button onClick={fetchExcludedData}>Excluded Raw Data</button>
              <button onClick={fetchSalesReportFlags}>Sales Report Flags</button>
            </div>
          </div>

          <div className="tool-card feature-card">
            <div className="tool-card-top">
              <h3>Sales Snapshot Recalculation</h3>
              <span className="pill">Month-wise</span>
            </div>
            <p>
              Recalculate unit price and segment snapshots for Activation, Tertiary, and
              Secondary for a selected month. Includes dry run preview before applying.
            </p>
            <button
              className="feature-btn"
              onClick={() => setShowSalesSnapshotModal(true)}
            >
              Open Snapshot Tool
            </button>
          </div>
        </div>

        <div className="tool-card feature-card">
          <div className="tool-card-top">
            <h3>Recalculate Extraction Segments</h3>
            <span className="pill">Price Bucket Fix</span>
          </div>

          <p>
            Recalculate extraction record price segments for all entries between the
            selected start and end dates.
          </p>

          <button
            className="feature-btn"
            onClick={recalculateExtractionSegments}
            disabled={isRecalculatingSegments || !startDate || !endDate}
          >
            {isRecalculatingSegments
              ? "Recalculating..."
              : "Recalculate Segments"}
          </button>
        </div>

        {loading && <div className="loader">Loading...</div>}
        {error && <div className="error">{error}</div>}

        {segmentRecalcResult && (
          <div className="table-section">
            <h3>Extraction Segment Recalculation Result</h3>

            <div className="flag-card" style={{ marginBottom: "16px" }}>
              <div>
                <strong>Matched Count:</strong> {segmentRecalcResult.matchedCount || 0}
              </div>
              <div>
                <strong>Modified Count:</strong> {segmentRecalcResult.modifiedCount || 0}
              </div>
              <div>
                <strong>Message:</strong> {segmentRecalcResult.message || "-"}
              </div>
            </div>

            {segmentRecalcResult.preview?.length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Dealer</th>
                    <th>Brand</th>
                    <th>Product Code</th>
                    <th>Product Name</th>
                    <th>Price</th>
                    <th>Old Segment</th>
                    <th>New Segment</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {segmentRecalcResult.preview.map((row, i) => (
                    <tr key={row._id || i}>
                      <td>{i + 1}</td>
                      <td>{row.dealer}</td>
                      <td>{row.brand}</td>
                      <td>{row.product_code}</td>
                      <td>{row.product_name}</td>
                      <td>{row.price}</td>
                      <td>{row.oldSegment}</td>
                      <td>{row.newSegment}</td>
                      <td>
                        {row.createdAt
                          ? new Date(row.createdAt).toLocaleString()
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "unmapped" && (
          <div className="table-section">
            <h3>Unmapped Products</h3>
            <table>
              <tbody>
                {unmappedProducts.map((model, i) => (
                  <tr key={model}>
                    <td>{i + 1}</td>
                    <td>{model}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "excluded" && excludedData && (
          <>
            {renderExcludedTable(
              "Activation",
              excludedData.activation,
              "val",
              "qty"
            )}
            {renderExcludedTable(
              "Tertiary",
              excludedData.tertiary,
              "net_value",
              "qty"
            )}
            {renderExcludedTable(
              "Secondary",
              excludedData.secondary,
              "net_value",
              "qty"
            )}
          </>
        )}

        {activeTab === "flags" && flagsData && (
          <div className="flags-grid">
            {renderFlagCard("Activation", flagsData.activation)}
            {renderFlagCard("Tertiary", flagsData.tertiary)}
            {renderFlagCard("Secondary", flagsData.secondary)}
            {renderWodCard(flagsData.wod)}
          </div>
        )}
      </div>

      <CsvUploadModal
        open={showUserCsvModal}
        onClose={() => setShowUserCsvModal(false)}
        title="Update Users From CSV"
        subtitle="Match by user code, preview with dry run, and optionally create new fields in user documents."
        endpoint={`${backendUrl}/master/update-users-from-csv`}
        fileFieldName="file"
        onSuccess={() => {
          setError("");
        }}
      />
      
      <BeatMappingSyncModal
        open={showBeatSyncModal}
        onClose={() => setShowBeatSyncModal(false)}
        backendUrl={backendUrl}
      />

      <SalesSnapshotRecalcModal
        open={showSalesSnapshotModal}
        onClose={() => setShowSalesSnapshotModal(false)}
        backendUrl={backendUrl}
        monthOptions={monthOptions}
        yearOptions={yearOptions}
        initialMonth={today.getMonth() + 1}
        initialYear={today.getFullYear()}
      />

      {showDuplicateResultModal && duplicateDryRunResult && (
        <div
          className="duplicate-result-modal-overlay"
          onClick={() => setShowDuplicateResultModal(false)}
        >
          <div
            className="duplicate-result-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="duplicate-result-modal-header">
              <div>
                <h2>Duplicate Cleanup Preview</h2>
                <p>
                  Review the stats and sample duplicate groups for{" "}
                  {duplicateDryRunResult.month}/{duplicateDryRunResult.year}.
                </p>
              </div>

              <button
                className="duplicate-result-modal-close"
                onClick={() => setShowDuplicateResultModal(false)}
              >
                ×
              </button>
            </div>

            <div className="duplicate-result-modal-body">
              <div className="duplicate-stats-grid">
                <div className="flag-card">
                  <div>
                    <strong>Total Scanned:</strong>{" "}
                    {duplicateDryRunResult.stats?.totalRecordsScanned || 0}
                  </div>
                  <div>
                    <strong>Duplicate Groups:</strong>{" "}
                    {duplicateDryRunResult.stats?.duplicateGroupCount || 0}
                  </div>
                  <div>
                    <strong>Duplicate Records:</strong>{" "}
                    {duplicateDryRunResult.stats?.duplicateRecordCount || 0}
                  </div>
                  <div>
                    <strong>Copies To Delete:</strong>{" "}
                    {duplicateDryRunResult.stats?.duplicateCopyCount || 0}
                  </div>
                  <div>
                    <strong>Records To Keep:</strong>{" "}
                    {duplicateDryRunResult.stats?.recordsToKeep ||
                      duplicateDryRunResult.stats?.recordsKept ||
                      0}
                  </div>
                  <div>
                    <strong>Message:</strong> {duplicateDryRunResult.message || "-"}
                  </div>
                </div>

                {duplicateCleanupResult && (
                  <div className="flag-card">
                    <div>
                      <strong>Deleted Count:</strong>{" "}
                      {duplicateCleanupResult.stats?.deletedCount || 0}
                    </div>
                    <div>
                      <strong>Month:</strong> {duplicateCleanupResult.month}/
                      {duplicateCleanupResult.year}
                    </div>
                    <div>
                      <strong>Dealer Filter Count:</strong>{" "}
                      {duplicateCleanupResult.dealerCodes?.length || 0}
                    </div>
                  </div>
                )}
              </div>

              {duplicateDryRunResult.sampleGroups?.length > 0 ? (
                <div className="duplicate-result-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Date</th>
                        <th>Uploaded By</th>
                        <th>Dealer</th>
                        <th>Brand</th>
                        <th>Product Code</th>
                        <th>Product Name</th>
                        <th>Segment</th>
                        <th>Price</th>
                        <th>Qty</th>
                        <th>Amount</th>
                        <th>Total Rows</th>
                        <th>Keep</th>
                        <th>Delete</th>
                      </tr>
                    </thead>
                    <tbody>
                      {duplicateDryRunResult.sampleGroups.map((group, i) => (
                        <tr key={group.key || i}>
                          <td>{i + 1}</td>
                          <td>{group.sample?.date || "-"}</td>
                          <td>{group.sample?.uploaded_by || "-"}</td>
                          <td>{group.sample?.dealer || "-"}</td>
                          <td>{group.sample?.brand || "-"}</td>
                          <td>{group.sample?.product_code || "-"}</td>
                          <td>{group.sample?.product_name || "-"}</td>
                          <td>{group.sample?.segment || "-"}</td>
                          <td>{group.sample?.price ?? "-"}</td>
                          <td>{group.sample?.quantity ?? "-"}</td>
                          <td>{group.sample?.amount ?? "-"}</td>
                          <td>{group.totalRecords || 0}</td>
                          <td>{group.keepRecordId || "-"}</td>
                          <td>
                            {group.duplicateRecordIds?.join(", ") ||
                              group.deletedRecordIds?.join(", ") ||
                              "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flag-card">
                  <strong>No duplicate groups found for this filter set.</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataPolice;
