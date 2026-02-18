import React, { useState } from "react";
import config from "../../config";
import "./style.scss";

const backendUrl = config.backend_url;

function DataPolice() {
  const [loading, setLoading] = useState(false);
  const [unmappedProducts, setUnmappedProducts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  // ==============================
  // FETCH UNMAPPED PRODUCTS
  // ==============================
  const fetchUnmappedProducts = async () => {
    setLoading(true);
    setError("");
    setUnmappedProducts([]);
    setSummary(null);

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
        setError(data.message || "Something went wrong");
      } else {
        setUnmappedProducts(data.missingModels || []);
        setSummary({
          totalSalesModels: data.totalSalesModels,
          totalMasterModels: data.totalMasterModels,
          missingCount: data.missingCount,
        });
      }
    } catch (err) {
      setError("Network error");
    }

    setLoading(false);
  };

  // ==============================
  // UI
  // ==============================
  return (
    <div className="data-police-page">
      <div className="container">
        <h2>🚨 Data Police</h2>

        <div className="button-group">
          <button
            onClick={fetchUnmappedProducts}
            disabled={loading}
            className="action-btn"
          >
            {loading ? "Checking..." : "Check Unmapped Products"}
          </button>
        </div>

        {error && <div className="error-box">{error}</div>}

        {summary && (
          <div className="summary-box">
            <div>
              <strong>Total Sales Models:</strong>{" "}
              {summary.totalSalesModels}
            </div>
            <div>
              <strong>Total Product Master Models:</strong>{" "}
              {summary.totalMasterModels}
            </div>
            <div>
              <strong>Missing Models:</strong>{" "}
              {summary.missingCount}
            </div>
          </div>
        )}

        {unmappedProducts.length > 0 && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Model Code</th>
                </tr>
              </thead>
              <tbody>
                {unmappedProducts.map((model, index) => (
                  <tr key={model}>
                    <td>{index + 1}</td>
                    <td>{model}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {summary && unmappedProducts.length === 0 && (
          <div className="success-box">
            ✅ No Unmapped Products Found
          </div>
        )}
      </div>
    </div>
  );
}

export default DataPolice;
