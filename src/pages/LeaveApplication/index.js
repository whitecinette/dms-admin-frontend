import React, { useState, useEffect, useMemo } from "react";
import "./style.scss";
import axios from "axios";
import config from "../../config";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { useLocation, useNavigate, Link } from "react-router-dom";
import CustomAlert from "../../components/CustomAlert";

const backend_url = config.backend_url;
const PAGE_SIZE = 50;

function LeaveApplication() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);

  const [search, setSearch] = useState(queryParams.get("search") || "");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState(queryParams.get("startDate") || "");
  const [endDate, setEndDate] = useState(queryParams.get("endDate") || "");

  const [leaveApplications, setLeaveApplications] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const [firmOptions, setFirmOptions] = useState([]);
  const [selectedFirmCodes, setSelectedFirmCodes] = useState([]);
  const [metaMap, setMetaMap] = useState({});

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState({
    applicationId: null,
    newStatus: "",
  });
  const [comment, setComment] = useState("");

  const [alert, setAlert] = useState({ show: false, message: "", type: "" });

  const authBearer = useMemo(
    () => ({ Authorization: `Bearer ${localStorage.getItem("authToken")}` }),
    []
  );

  const authPlain = useMemo(
    () => ({ Authorization: localStorage.getItem("authToken") }),
    []
  );

  const formatDate = (dateInput) => {
    const datePart = dateInput?.slice?.(0, 10);
    if (!datePart) return "N/A";
    const [year, month, day] = datePart.split("-");
    const dateObj = new Date(year, month - 1, day);
    return (
      dateObj.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }) || "N/A"
    );
  };

  const fetchFirms = async () => {
    try {
      const res = await axios.get(`${backend_url}/get-firms-for-dropdown`, {
        headers: authPlain,
      });
      setFirmOptions(res.data?.data || []);
    } catch (error) {
      console.error("Error fetching firms:", error);
      setFirmOptions([]);
    }
  };

  const fetchMetadata = async () => {
    try {
      const res = await axios.get(`${backend_url}/metadata/list`, {
        headers: authPlain,
        params: { page: 1, limit: 5000 },
      });

      const map = {};
      (res.data?.data || []).forEach((row) => {
        map[row.code] = row;
      });
      setMetaMap(map);
    } catch (error) {
      console.error("Error fetching metadata:", error);
      setMetaMap({});
    }
  };

  const fetchLeaveApplications = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${backend_url}/all-leaves/admin`, {
        params: {
          type,
          status,
          fromDate: startDate,
          toDate: endDate,
          page: 1,
          limit: 500,
        },
        headers: authBearer,
      });
      setLeaveApplications(res.data?.leaves || []);
    } catch (error) {
      setLeaveApplications([]);
      console.error("Error fetching leave applications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFirms();
    fetchMetadata();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchLeaveApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, status, startDate, endDate]);

  const toggleFirm = (code) => {
    setSelectedFirmCodes((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]
    );
  };

  const filteredLeaves = leaveApplications.filter((application) => {
    const meta = metaMap[application.employeeCode] || {};
    const firmCode = meta.firm_code || "";
    const position = meta.position || application.employeeRole || "";

    const query = String(search || "").trim().toLowerCase();

    const matchesSearch =
      !query ||
      String(application.employeeName || "").toLowerCase().includes(query) ||
      String(application.employeeCode || "").toLowerCase().includes(query) ||
      String(position || "").toLowerCase().includes(query);

    const matchesFirm =
      selectedFirmCodes.length === 0 || selectedFirmCodes.includes(firmCode);

    return matchesSearch && matchesFirm;
  });

  const totalPages = Math.max(1, Math.ceil(filteredLeaves.length / PAGE_SIZE));
  const paginatedLeaves = filteredLeaves.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const toggleRow = (id) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const initiateStatusChange = (applicationId, newStatus) => {
    setPendingStatusChange({ applicationId, newStatus });
    setShowConfirmation(true);
  };

  const closeConfirmation = () => {
    setShowConfirmation(false);
    setPendingStatusChange({ applicationId: null, newStatus: "" });
    setComment("");
  };

  const confirmStatusChange = async () => {
    try {
      const res = await axios.post(
        `${backend_url}/edit-leave`,
        {
          leaveId: pendingStatusChange.applicationId,
          status: pendingStatusChange.newStatus,
          comment: comment || undefined,
        },
        { headers: authBearer }
      );

      fetchLeaveApplications();
      setAlert({
        show: true,
        message: res.data?.message || "Status updated successfully",
        type: res.data.status,
      });
    } catch (error) {
      setAlert({
        show: true,
        message: error.response?.data?.message || "Error updating status",
        type: error.response?.data?.status || "error",
      });
      console.error("Error updating status:", error);
    } finally {
      closeConfirmation();
    }
  };

  const prevPage = () => currentPage > 1 && setCurrentPage((prev) => prev - 1);
  const nextPage = () =>
    currentPage < totalPages && setCurrentPage((prev) => prev + 1);

  const formatDateForInput = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
  };

  const handleReset = () => {
    setSearch("");
    setType("");
    setStatus("");
    setStartDate("");
    setEndDate("");
    setSelectedFirmCodes([]);
    setCurrentPage(1);
    navigate("/leaveApplication", { replace: true });
  };

  return (
    <div className="leave-application">
      {alert.show ? (
        <CustomAlert
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert({ show: false, message: "", type: "" })}
        />
      ) : null}

      <div className="leave-application-header">Leave Application</div>
      <div className="leave-application-container">
        <div className="leave-application-filter">
          <div className="search-filter">
            <input
              type="text"
              placeholder="Search by Name / Code / Position"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="date-filter">
            <span>From</span>
            <input
              type="date"
              value={formatDateForInput(startDate)}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span>to</span>
            <input
              type="date"
              value={formatDateForInput(endDate)}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="leave-type">
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Leave Type</option>
              <option value="sick">Sick Leave</option>
              <option value="casual">Casual Leave</option>
              <option value="earned">Earned Leave</option>
              <option value="maternity">Maternity Leave</option>
              <option value="paternity">Paternity Leave</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="leave-status">
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="leave-type">
            <select
              value=""
              onChange={() => {}}
              style={{ display: "none" }}
              aria-hidden="true"
            />
            <details style={{ width: "100%" }}>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>Firms</summary>
              <div style={{ marginTop: 8, maxHeight: 140, overflowY: "auto" }}>
                {firmOptions.map((f) => (
                  <label
                    key={f.code}
                    style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}
                  >
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

          <div className="reset-filter">
            <button className="reset-button" onClick={handleReset}>
              Reset Filters
            </button>
          </div>
        </div>

        <div className="leave-table-container">
          <table className="leave-table">
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>Code</th>
                <th>Position</th>
                <th>Firm</th>
                <th>Allowed Leaves</th>
                <th>Leave Type</th>
                <th>Total Days</th>
                <th>Status</th>
                <th>Applied At</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: "center" }}>
                    loading...
                  </td>
                </tr>
              ) : paginatedLeaves.length > 0 ? (
                paginatedLeaves.map((application) => {
                  const meta = metaMap[application.employeeCode] || {};
                  const allowedLeaves =
                    meta.allowed_leaves !== undefined && meta.allowed_leaves !== null
                      ? meta.allowed_leaves
                      : 1;
                  const isDefaultLeave =
                    meta.allowed_leaves === undefined || meta.allowed_leaves === null;

                  return (
                    <React.Fragment key={application._id}>
                      <tr className="leave-row">
                        <td>
                          <button
                            className="expand-button"
                            onClick={() => toggleRow(application._id)}
                          >
                            {expandedRows[application._id] ? <FaChevronUp /> : <FaChevronDown />}
                          </button>
                        </td>
                        <td>{application.employeeName}</td>
                        <td>{application.employeeCode}</td>
                        <td>{meta.position || application.employeeRole || "N/A"}</td>
                        <td>{meta.firm_code || "N/A"}</td>
                        <td>
                          {allowedLeaves}
                          {isDefaultLeave ? (
                            <span style={{ marginLeft: 6, fontSize: 11, color: "#92400e" }}>
                              (default)
                            </span>
                          ) : null}
                        </td>
                        <td>{application.leaveType}</td>
                        <td>{application.totalDays}</td>
                        <td>
                          <select
                            value={application.status}
                            onChange={(e) =>
                              initiateStatusChange(application._id, e.target.value)
                            }
                            className={`status-select ${application.status.toLowerCase()}`}
                          >
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </td>
                        <td>{formatDate(application.appliedAt)}</td>
                      </tr>
                      {expandedRows[application._id] ? (
                        <tr className="expanded-row">
                          <td colSpan="10">
                            <div className="leave-expanded-content">
                              <div className="reason-section">
                                <strong>Reason:</strong> {application.reason}
                              </div>
                              {application.attachmentUrl ? (
                                <div className="attachment-section">
                                  <strong>Attachment:</strong>
                                  <Link
                                    to={application.attachmentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    View Attachment
                                  </Link>
                                </div>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="10" style={{ textAlign: "center" }}>
                    No data found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pagination">
        <button onClick={prevPage} className="page-btn" disabled={currentPage === 1}>
          &lt;
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={nextPage}
          className="page-btn"
          disabled={currentPage === totalPages}
        >
          &gt;
        </button>
      </div>

      {showConfirmation ? (
        <>
          <div className="popup-overlay" onClick={closeConfirmation}></div>
          <div className="status-confirmation-popup">
            <h3>Confirm Status Change</h3>
            <p>Are you sure you want to change the status?</p>
            <div className="comment-section">
              <label>Add Comment (Optional)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Enter your comment here..."
              />
            </div>
            <div className="popup-buttons">
              <button className="cancel-btn" onClick={closeConfirmation}>
                Cancel
              </button>
              <button className="confirm-btn" onClick={confirmStatusChange}>
                Confirm
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default LeaveApplication;
