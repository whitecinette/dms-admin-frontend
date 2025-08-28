import React, { useEffect, useState } from "react";
import axios from "axios";
import config from "../../config";
import { TbSearch, TbPlus, TbPencil } from "react-icons/tb";
import "./style.scss";

const MetadataPage = () => {
  const [metadata, setMetadata] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

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
        setTotalPages(res.data.totalPages || 1);
    } catch (err) {
        console.error("❌ Failed to fetch metadata:", err);
        setError("Failed to fetch metadata");
    } finally {
        setLoading(false);
    }
    };

    useEffect(() => {
    fetchMetadata();
    }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchMetadata();
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <h1>Employee Metadata</h1>
        <button className="primary-button">
          <TbPlus size={18} style={{ marginRight: 6 }} /> Add Metadata
        </button>
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
                <td>{(page - 1) * limit + idx + 1}</td> {/* ✅ Fixed S. No. */}
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
                <td colSpan="9" style={{ textAlign: "center", padding: "20px" }}>
                  No metadata found
                </td>
              </tr>
            )}
          </tbody>
        </table>


         <div className="pagination">
            <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1}
            >
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
    </div>
  );
};

export default MetadataPage;
