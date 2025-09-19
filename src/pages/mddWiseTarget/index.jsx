import React, { useEffect, useState } from "react";
import axios from "axios";
import config from "../../config";
import { Search, Upload } from "lucide-react";
import "./style.scss";
import MddWiseTargetsUploadModal from "../../components/mddWiseTargetUpload";

const backendUrl = config.backend_url;

// Dummy JSON for MDD filter
const dummyMdds = [
  { code: "MDD001", name: "MDD One" },
  { code: "MDD002", name: "MDD Two" },
  { code: "MDD003", name: "MDD Three" },
];

const MddWiseTargets = () => {
  const [data, setData] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState("");
  const [mdd, setMdd] = useState("");
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
 

  // Fetch targets
  const fetchData = async () => {
    try {
    const token = localStorage.getItem("authToken");
      setLoading(true);
      const res = await axios.get(`${backendUrl}/get/mdd-wise-targets`, {
        headers: { Authorization: token },
        params: { month, year },
      });
      
      setData(res.data.data || []);
    } catch (err) {
      console.error("Error fetching targets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [month, year]);

  // Filter data in frontend (search + mdd filter)
  const filteredData = data.filter((row) => {
    const matchesSearch =
      !search ||
      Object.values(row)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesMdd = !mdd || row.mdd_code === mdd;
    return matchesSearch && matchesMdd;
  });

  return (
    <div className="mdd-targets-page">
      <h2>MDD Wise Targets</h2>

      {/* Filters */}
      <div className="filters-row">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {[...Array(12).keys()].map((m) => (
            <option key={m + 1} value={m + 1}>
              {new Date(0, m).toLocaleString("default", { month: "long" })}
            </option>
          ))}
        </select>

        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          min="2000"
          max="2100"
        />

        <select value={mdd} onChange={(e) => setMdd(e.target.value)}>
          <option value="">All MDDs</option>
          {dummyMdds.map((d) => (
            <option key={d.code} value={d.code}>
              {d.name}
            </option>
          ))}
        </select>

        <button className="upload-btn" onClick={() => setIsModalOpen(true)}>
            <Upload size={16} /> Upload
         </button>
      </div>

      <MddWiseTargetsUploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUploadSuccess={fetchData} // refresh table after upload
        />

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <p>Loading data...</p>
        ) : filteredData.length === 0 ? (
          <p>No records found</p>
        ) : (
          <table>
            <thead>
              <tr>
                {Object.keys(filteredData[0]).map((key) => (
                  <th key={key}>{key.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, idx) => (
                <tr key={idx}>
                  {Object.values(row).map((val, i) => (
                    <td key={i}>{String(val)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default MddWiseTargets;
