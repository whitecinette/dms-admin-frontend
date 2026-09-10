import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import config from "../../config.js";
import "./style.scss";

const backendUrl = config.backend_url;

const todayInput = () => new Date().toISOString().split("T")[0];

export default function AttendanceRequests() {
  const [requests, setRequests] = useState([]);
  const [date, setDate] = useState(todayInput());
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(false);
  const [approvingId, setApprovingId] = useState("");
  const [error, setError] = useState("");

  const headers = useMemo(
    () => ({ Authorization: localStorage.getItem("authToken") }),
    []
  );
  const canApprove =
    String(localStorage.getItem("role") || "").toLowerCase() === "super_admin";

  const fetchRequests = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(
        `${backendUrl}/attendance-admin/dealer-point-requests`,
        {
          headers,
          params: { date, search, status },
        }
      );
      setRequests(res.data?.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to fetch attendance requests"
      );
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, status]);

  const approveRequest = async (item) => {
    if (!canApprove) {
      setError("Only superadmin can approve attendance requests.");
      return;
    }
    const ok = window.confirm(
      `Approve attendance request for ${item.name || item.code}?`
    );
    if (!ok) return;

    setApprovingId(item._id);
    setError("");
    try {
      await axios.patch(
        `${backendUrl}/attendance-admin/dealer-point-requests/${item._id}/approve`,
        {},
        { headers }
      );
      await fetchRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to approve request");
    } finally {
      setApprovingId("");
    }
  };

  return (
    <div className="attendance-requests-page">
      <div className="attendance-requests-header">
        <div>
          <h1>Attendance Requests</h1>
          <p>Dealer-point punch-in requests waiting for admin approval.</p>
        </div>
        <button onClick={fetchRequests} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="attendance-requests-filters">
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
        <input
          type="search"
          placeholder="Search name, code, point, reason"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") fetchRequests();
          }}
        />
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <button onClick={fetchRequests} disabled={loading}>
          Search
        </button>
      </div>

      {error ? <div className="attendance-requests-error">{error}</div> : null}

      <div className="attendance-requests-card">
        <div className="attendance-requests-count">
          {loading ? "Loading requests..." : `${requests.length} request(s)`}
        </div>
        <div className="attendance-requests-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>Punch In</th>
                <th>Dealer Point</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.length ? (
                requests.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <strong>{item.name}</strong>
                      <span>{item.code}</span>
                    </td>
                    <td>{item.date}</td>
                    <td>{item.punchIn || "-"}</td>
                    <td>
                      <strong>{item.punchInName || "-"}</strong>
                      <span>{item.punchInCode || ""}</span>
                    </td>
                    <td>{item.reason || "-"}</td>
                    <td>
                      <span className={`request-status ${String(item.approvalStatus || "").toLowerCase()}`}>
                        {item.approvalStatus || item.status || "Requested"}
                      </span>
                    </td>
                    <td>
                      {canApprove &&
                      String(item.approvalStatus || "").toLowerCase() === "pending" ? (
                        <button
                          className="approve-btn"
                          onClick={() => approveRequest(item)}
                          disabled={approvingId === item._id}
                        >
                          {approvingId === item._id ? "Approving..." : "Approve"}
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="empty-cell">
                    {loading ? "Loading..." : "No attendance requests found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
