import React, { useEffect, useState } from "react";
import axios from "axios";
import config from "../../config";
import AddFirmModal from "../../components/firmComponents/addFirmModal";
import { TbBuildingSkyscraper, TbPlus } from "react-icons/tb";
import './style.scss';

const FirmsPage = () => {
  const [firms, setFirms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const fetchFirms = async () => {
    const backendUrl = config?.backend_url;
    const token = localStorage.getItem("authToken");
    if (!backendUrl || !token) return;

    try {
      setLoading(true);
      const res = await axios.get(`${backendUrl}/get-all-firms`, {
        headers: { Authorization: token },
      });
      setFirms(res.data.data || []);
    } catch (err) {
      console.error("❌ Failed to fetch firms:", err);
      setError("Failed to fetch firms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFirms();
  }, []);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-title">
          <TbBuildingSkyscraper size={28} style={{ marginRight: 8 }} />
          <h1>Firms</h1>
        </div>
        <button className="primary-button" onClick={() => setModalOpen(true)}>
          <TbPlus size={18} style={{ marginRight: 6 }} /> Add Firm
        </button>
      </div>

      {/* Error / Loader */}
      {loading && <p className="loading-text">Loading firms...</p>}
      {error && <p className="error-text">{error}</p>}

      {/* Table */}
      <div className="card">
        <table className="data-table styled-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Organization</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {firms.map((firm) => (
              <tr key={firm._id}>
                <td>{firm.code}</td>
                <td className="firm-name">{firm.name}</td>
                <td>{firm.orgName}</td>
                <td>
                  <span
                    className={`status-badge ${
                      firm.status?.toLowerCase() === "active"
                        ? "status-active"
                        : "status-inactive"
                    }`}
                  >
                    {firm.status || "N/A"}
                  </span>
                </td>
                <td>{new Date(firm.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <AddFirmModal
          closeModal={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            fetchFirms();
          }}
        />
      )}
    </div>
  );
};

export default FirmsPage;
