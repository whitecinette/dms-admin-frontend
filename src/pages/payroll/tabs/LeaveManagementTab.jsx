import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import config from "../../../config";

const backendUrl = config.backend_url;

const normalize = (value) => String(value || "").trim().toLowerCase();

function LeaveManagementTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [firmOptions, setFirmOptions] = useState([]);
  const [metaMap, setMetaMap] = useState({});
  const [selectedFirmCodes, setSelectedFirmCodes] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${localStorage.getItem("authToken")}` }),
    []
  );

  const fetchFirms = async () => {
    try {
      const res = await axios.get(`${backendUrl}/get-firms-for-dropdown`, {
        headers: { Authorization: localStorage.getItem("authToken") },
      });
      setFirmOptions(res.data?.data || []);
    } catch (error) {
      console.error("Error fetching firms:", error);
      setFirmOptions([]);
    }
  };

  const fetchMetadata = async () => {
    try {
      const res = await axios.get(`${backendUrl}/metadata/list`, {
        headers: { Authorization: localStorage.getItem("authToken") },
        params: { page: 1, limit: 5000 },
      });

      const map = {};
      (res.data?.data || []).forEach((item) => {
        map[item.code] = item;
      });
      setMetaMap(map);
    } catch (error) {
      console.error("Error fetching metadata map:", error);
      setMetaMap({});
    }
  };

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${backendUrl}/all-leaves/admin`, {
        headers: authHeaders,
        params: {
          status,
          type,
          fromDate,
          toDate,
          page: 1,
          limit: 500,
        },
      });
      setRows(res.data?.leaves || []);
    } catch (error) {
      console.error("Error fetching leaves:", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFirms();
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchLeaves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, type, fromDate, toDate]);

  const toggleFirm = (code) => {
    setSelectedFirmCodes((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]
    );
  };

  const filteredRows = rows.filter((row) => {
    const meta = metaMap[row.employeeCode] || {};
    const firmCode = meta.firm_code || "";
    const position = meta.position || row.employeeRole || "";

    const matchesFirm =
      selectedFirmCodes.length === 0 || selectedFirmCodes.includes(firmCode);

    const q = normalize(search);
    const matchesSearch =
      q.length === 0 ||
      normalize(row.employeeName).includes(q) ||
      normalize(row.employeeCode).includes(q) ||
      normalize(position).includes(q);

    return matchesFirm && matchesSearch;
  });

  const updateStatus = async (leaveId, nextStatus) => {
    try {
      const comment = window.prompt("Add comment (optional)", "") || "";
      await axios.post(
        `${backendUrl}/edit-leave`,
        {
          leaveId,
          status: nextStatus,
          comment,
        },
        { headers: authHeaders }
      );

      setRows((prev) =>
        prev.map((row) =>
          row._id === leaveId ? { ...row, status: nextStatus } : row
        )
      );
    } catch (error) {
      console.error("Error updating leave status:", error);
      window.alert("Failed to update leave status");
    }
  };

  return (
    <div className="hr-tab-section">
      <div className="hr-filter-grid">
        <div className="hr-field">
          <label>Search</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name / code / position"
          />
        </div>

        <div className="hr-field">
          <label>Leave Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All</option>
            <option value="sick">Sick</option>
            <option value="casual">Casual</option>
            <option value="earned">Earned</option>
            <option value="maternity">Maternity</option>
            <option value="paternity">Paternity</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="hr-field">
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="hr-field">
          <label>From</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>

        <div className="hr-field">
          <label>To</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>

        <div className="hr-field">
          <label>Firms</label>
          <details className="hr-multiselect">
            <summary>
              {selectedFirmCodes.length
                ? `${selectedFirmCodes.length} selected`
                : "Select firms"}
            </summary>
            <div className="hr-multiselect-list">
              {firmOptions.map((f) => (
                <label key={f.code}>
                  <input
                    type="checkbox"
                    checked={selectedFirmCodes.includes(f.code)}
                    onChange={() => toggleFirm(f.code)}
                  />
                  {f.name} ({f.code})
                </label>
              ))}
            </div>
          </details>
        </div>
      </div>

      <div className="hr-table-wrap">
        <table className="hr-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>Position</th>
              <th>Firm</th>
              <th>Type</th>
              <th>Days</th>
              <th>Allowed Leaves</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9">Loading leaves...</td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan="9">No leave applications found</td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const meta = metaMap[row.employeeCode] || {};
                const allowedLeaves =
                  meta.allowed_leaves !== undefined && meta.allowed_leaves !== null
                    ? meta.allowed_leaves
                    : 1;
                const isDefault =
                  meta.allowed_leaves === undefined || meta.allowed_leaves === null;

                return (
                  <tr key={row._id}>
                    <td>{row.employeeName || "N/A"}</td>
                    <td>{row.employeeCode || "N/A"}</td>
                    <td>{meta.position || row.employeeRole || "N/A"}</td>
                    <td>{meta.firm_code || "N/A"}</td>
                    <td>{row.leaveType || "N/A"}</td>
                    <td>{row.totalDays || 0}</td>
                    <td>
                      {allowedLeaves}
                      {isDefault ? <span className="hr-default-pill">default</span> : null}
                    </td>
                    <td>{row.status || "N/A"}</td>
                    <td className="hr-actions-cell">
                      <button
                        disabled={row.status === "approved"}
                        onClick={() => updateStatus(row._id, "approved")}
                      >
                        Approve
                      </button>
                      <button
                        disabled={row.status === "rejected"}
                        onClick={() => updateStatus(row._id, "rejected")}
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default LeaveManagementTab;
