import React, { useState, useEffect } from "react";
import config from "../../config";
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

  // ===============================
  // DEFAULT DATE RANGE
  // ===============================
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    setStartDate(firstDay.toISOString().split("T")[0]);
    setEndDate(today.toISOString().split("T")[0]);
  }, []);

  // ===============================
  // UNMAPPED PRODUCTS
  // ===============================
  const fetchUnmappedProducts = async () => {
    setLoading(true);
    setError("");
    setActiveTab("unmapped");

    try {
      const res = await fetch(
        `${backendUrl}/police/unmapped-products`,
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );

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

  // ===============================
  // EXCLUDED RAW DATA
  // ===============================
  const fetchExcludedData = async () => {
    setLoading(true);
    setError("");
    setActiveTab("excluded");

    try {
      const res = await fetch(
        `${backendUrl}/police/excluded-raw-data`,
        {
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
        }
      );

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

  // ===============================
  // SALES REPORT FLAGS
  // ===============================
  const fetchSalesReportFlags = async () => {
    setLoading(true);
    setError("");
    setActiveTab("flags");

    try {
      const res = await fetch(
        `${backendUrl}/reports/sales-report-flags`,
        {
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
        }
      );

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

  // ===============================
  // RENDER EXCLUDED TABLE
  // ===============================
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
              <tr key={row._id}>
                <td>{i + 1}</td>
                <td>
                  {row.activation_date_raw ||
                    row.invoice_date_raw}
                </td>
                <td>
                  {row.tertiary_buyer_code ||
                    row.dealer_code ||
                    row.mdd_code}
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

  // ===============================
  // FLAG CARD
  // ===============================
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
          {Object.entries(dataset.breakdown || {}).map(
            ([reason, count]) => (
              <div key={reason}>
                {count} → {reason}
              </div>
            )
          )}
        </div>
      </div>
    );
  };

    // ===============================
  // WOD CARD
  // ===============================
  const renderWodCard = (dataset) => {
    if (!dataset) return null;

    return (
      <div className="flag-card">
        <h3>WOD</h3>

        <div>
          <strong>Total Dealers (Active):</strong>{" "}
          {dataset.totalDealers}
        </div>

        <div>
          <strong>Excluded Dealers:</strong>{" "}
          {dataset.excludedDealers}
        </div>
      </div>
    );
  };


  // ===============================
  // UI
  // ===============================
  return (
    <div className="data-police-page">
      <div className="container">
        <h2>🚨 Data Police</h2>

        {/* DATE RANGE */}
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

        {/* BUTTONS */}
        <div className="button-group">
          <button onClick={fetchUnmappedProducts}>
            Unmapped Products
          </button>

          <button onClick={fetchExcludedData}>
            Excluded Raw Data
          </button>

          <button onClick={fetchSalesReportFlags}>
            Sales Report Flags
          </button>
        </div>

        {loading && <div className="loader">Loading...</div>}
        {error && <div className="error">{error}</div>}

        {/* UNMAPPED */}
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

        {/* EXCLUDED RAW */}
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

        {/* FLAGS */}
        {activeTab === "flags" && flagsData && (
        <div className="flags-grid">
            {renderFlagCard("Activation", flagsData.activation)}
            {renderFlagCard("Tertiary", flagsData.tertiary)}
            {renderFlagCard("Secondary", flagsData.secondary)}
            {renderWodCard(flagsData.wod)} {/* ✅ Added */}
        </div>
        )}

      </div>
    </div>
  );
}

export default DataPolice;
