// src/pages/MetadataPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import config from "../../config";
import { TbSearch, TbPlus, TbPencil, TbUpload, TbDownload } from "react-icons/tb";
import "./style.scss";

const MetadataPage = () => {
  const [metadata, setMetadata] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  // bulk upload modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [rowCount, setRowCount] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fetchMetadata = async () => {
    const backendUrl = config?.backend_url;
    const token = localStorage.getItem("authToken");
    if (!backendUrl || !token) return;

    try {
      setLoading(true);
      const res = await axios.get(`${backendUrl}/metadata/list`, {
        headers: { Authorization: token },
        params: { search, page, limit },
      });

      setMetadata(res.data.data || []);
      setTotalPages(Math.ceil(res.data.total / limit) || 1);
    } catch (err) {
      console.error("❌ Failed to fetch metadata:", err);
      setError("Failed to fetch metadata");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchMetadata();
  };

  // 🔹 Download metadata CSV
  const handleDownload = async () => {
    const backendUrl = config?.backend_url;
    const token = localStorage.getItem("authToken");
    try {
      const res = await axios.get(`${backendUrl}/metadata/download`, {
        headers: { Authorization: token },
        responseType: "blob", // important
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "metadata_export.csv");
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      alert("Failed to download metadata");
    }
  };

  // 🔹 Handle file select
  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    setFile(selected);

    if (selected) {
      // quick row count
      const reader = new FileReader();
      reader.onload = () => {
        const lines = reader.result.split("\n");
        setRowCount(lines.length - 1); // minus header
      };
      reader.readAsText(selected);
    }
  };

  // 🔹 Upload bulk CSV
  const handleUpload = async () => {
    if (!file) return alert("Please select a CSV file first");
    const backendUrl = config?.backend_url;
    const token = localStorage.getItem("authToken");

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      const res = await axios.put(`${backendUrl}/upsert-metadata`, formData, {
        headers: { Authorization: token, "Content-Type": "multipart/form-data" },
      });

      alert(`✅ Upload complete: Inserted ${res.data.inserted}, Updated ${res.data.modified}`);
      setModalOpen(false);
      setFile(null);
      setRowCount(null);
      fetchMetadata();
    } catch (err) {
      console.error("Upload failed:", err);
      alert(err.response?.data?.message || "Failed to upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <h1>Employee Metadata</h1>
        <div className="header-actions">
        <button className="secondary-button icon-btn" onClick={handleDownload}>
            <TbDownload size={16} /> Download All Data CSV
        </button>
        <button className="primary-button icon-btn" onClick={() => setModalOpen(true)}>
            <TbUpload size={16} /> Bulk Upload
        </button>
        </div>

      </div>

      {/* Search */}
      <form className="search-bar" onSubmit={handleSearch}>
        <TbSearch size={18} className="search-icon" />
        <input
          type="text"
          placeholder="Search by code, name, or firm..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>

      {/* Loader / Error */}
      {loading && <p className="loading-text">Loading metadata...</p>}
      {error && <p className="error-text">{error}</p>}

      {/* Table */}
      <div className="card">
        <table className="data-table styled-table">
          <thead>
            <tr>
              <th>S. No.</th>
              <th>Code</th>
              <th>Name</th>
              <th>Firm Code</th>
              <th>Firm Name</th>
              <th>Role</th>
              <th>Position</th>
              <th>Attendance</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {metadata.map((emp, idx) => (
              <tr key={emp._id}>
                <td>{(page - 1) * limit + idx + 1}</td>
                <td>{emp.code}</td>
                <td className="emp-name">{emp.name}</td>
                <td>{emp.firm_code}</td>
                <td>{emp.firm_name || "N/A"}</td>
                <td>{emp.role || "—"}</td>
                <td>{emp.position || "—"}</td>
                <td>
                  <span
                    className={`status-badge ${
                      emp.attendance ? "status-active" : "status-inactive"
                    }`}
                  >
                    {emp.attendance ? "Yes" : "No"}
                  </span>
                </td>
                <td>{new Date(emp.createdAt).toLocaleDateString()}</td>
                <td>
                  <button className="icon-button">
                    <TbPencil size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {metadata.length === 0 && !loading && (
              <tr>
                <td colSpan="10" style={{ textAlign: "center", padding: "20px" }}>
                  No metadata found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="pagination">
          <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1}>
            Prev
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      </div>

      {/* Bulk Upload Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Bulk Upload Metadata</h2>
            <input type="file" accept=".csv" onChange={handleFileChange} />
            {file && (
              <p>
                Selected file: <b>{file.name}</b> ({rowCount || 0} rows)
              </p>
            )}
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button className="primary-button" onClick={handleUpload} disabled={uploading}>
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetadataPage;
