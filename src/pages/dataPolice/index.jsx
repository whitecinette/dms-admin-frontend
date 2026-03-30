import React, { useState, useEffect } from "react";
import config from "../../config";
import CsvUploadModal from "./CsvUploadModal";
import "./style.scss";

const backendUrl = config.backend_url;

function DataPolice() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [unmappedProducts, setUnmappedProducts] = useState([]);
  const [excludedData, setExcludedData] = useState(null);
  const [flagsData, setFlagsData] = useState(null);

  const [showUserCsvModal, setShowUserCsvModal] = useState(false);

  const today = new Date();
  const [downloadMonth, setDownloadMonth] = useState(today.getMonth() + 1);
  const [downloadYear, setDownloadYear] = useState(today.getFullYear());
  const [isDownloadingMarketSales, setIsDownloadingMarketSales] =
    useState(false);

  const [isRecalculatingSegments, setIsRecalculatingSegments] = useState(false);
  const [segmentRecalcResult, setSegmentRecalcResult] = useState(null);


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

          <div className="tool-card">
            <div className="button-group">
              <button onClick={fetchUnmappedProducts}>Unmapped Products</button>
              <button onClick={fetchExcludedData}>Excluded Raw Data</button>
              <button onClick={fetchSalesReportFlags}>Sales Report Flags</button>
            </div>
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
    </div>
  );
}

export default DataPolice;