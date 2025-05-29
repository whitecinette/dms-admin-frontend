import React, { useState, useRef } from "react";
import Papa from "papaparse";
import config from "../../../config";
import axios from "axios";
import CancelIcon from "@mui/icons-material/Cancel";
import "./style.scss";

const backendUrl = config.backend_url;

const UpdateProducts = () => {
  const [csvData, setCsvData] = useState(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [newProductList, setNewProductList] = useState([]);
  const [showNewProducts, setShowNewProducts] = useState(false);
  const fileInputRef = useRef();

  const handleFiles = (files) => {
    setError("");
    setMessage("");
    if (files.length === 0) return;

    const file = files[0];
    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      setError("Please upload a valid CSV file");
      setCsvData(null);
      setFile(null);
      return;
    }

    setFile(file);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          setError("CSV is empty or invalid");
          setCsvData(null);
          return;
        }
        setCsvData(results.data);
      },
      error: () => {
        setError("Failed to parse CSV file");
        setCsvData(null);
      },
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFileSelect = (e) => {
    handleFiles(e.target.files);
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("No file selected for upload");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.put(
        `${backendUrl}/product/update-products`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const added = res.data.added || 0;
      const newList = res.data.newProductList || [];

      setNewProductList(newList);
      setShowNewProducts(true);
      setMessage(`✅ ${res.data.message} — Newly added products: ${added}`);

      // No reload here!
    } catch (err) {
      const msg = err.response?.data?.message || "Upload failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "brand",
      "product_name",
      "product_category",
      "price",
      "segment",
      "product_code",
      "model_code",
      "status",
    ];

    const csvContent = [headers].map((e) => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "update_products_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const handleDownloadNewProducts = () => {
    if (newProductList.length === 0) return;

    const headers = ["product_code", "product_name", "product_price"];
    const csvContent = [
      headers.join(","),
      ...newProductList.map(
        (p) => `${p.product_code},${p.product_name},${p.product_price ?? 0}`
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "newly_added_products.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // ✅ Reload after short delay to allow download
    setTimeout(() => {
      window.location.reload();
    }, 1000); // wait 1 second before reload
  };

  const displayedColumns = csvData ? Object.keys(csvData[0]).slice(0, 6) : [];

  return (
    <div className="update-products-container">
      <div className="download-template-btn-wrapper">
        <button
          className="download-template-btn"
          onClick={handleDownloadTemplate}
        >
          📥 Download CSV Format
        </button>
      </div>

      <div
        className="drop-zone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current.click()}
      >
        <p>Drag & Drop CSV file here or click to update</p>
        <small>Only CSV files allowed.</small>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileSelect}
          ref={fileInputRef}
          style={{ display: "none" }}
        />
      </div>

      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}

      {showNewProducts && newProductList.length > 0 && (
        <div className="new-products-banner">
          <div className="banner-header">
            <h4>🆕 Newly Added Products</h4>
            <CancelIcon
              className="close-icon"
              onClick={() => setShowNewProducts(false)}
            />
          </div>
          <p>
            {newProductList
              .slice(0, 5)
              .map((p) => `${p.product_code} (${p.product_name})`)
              .join(", ")}
            {newProductList.length > 5 && " ...and more"}
          </p>

          <button
            className="download-new-btn"
            onClick={handleDownloadNewProducts}
          >
            📤 Download New Products CSV
          </button>
        </div>
      )}

      {csvData && (
        <>
          <div className="csv-preview">
            <table>
              <thead>
                <tr>
                  {displayedColumns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvData.slice(0, 5).map((row, idx) => (
                  <tr key={idx}>
                    {displayedColumns.map((col) => (
                      <td key={col}>{row[col]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="preview-note">Showing up to 5 rows.</p>
          </div>
          {file && (
            <div className="file-info">
              <span>{file.name}</span>
              <span
                className="remove-file-icon"
                onClick={() => {
                  setFile(null);
                  setCsvData(null);
                  fileInputRef.current.value = null;
                }}
              >
                ❌
              </span>
            </div>
          )}
          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Updating..." : "Update Products"}
          </button>
        </>
      )}
    </div>
  );
};

export default UpdateProducts;
