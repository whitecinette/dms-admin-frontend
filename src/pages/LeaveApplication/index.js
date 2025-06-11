import React, { useState, useEffect } from "react";
import "./style.scss";
import axios from "axios";
import config from "../../config";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import CustomAlert from "../../components/CustomAlert";

const backend_url = config.backend_url;

function LeaveApplication() {
  const location = useLocation();
  const navigate = useNavigate();

  // Parse query parameters from the URL
  const queryParams = new URLSearchParams(location.search);
  const initialSearch = queryParams.get("search") || "";
  const initialStartDate = queryParams.get("startDate") || "";
  const initialEndDate = queryParams.get("endDate") || "";
  const [search, setSearch] = useState(initialSearch);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [leaveApplications, setLeaveApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState({
    applicationId: null,
    newStatus: "",
  });
  const [comment, setComment] = useState("");
  const userRole = localStorage.getItem("role"); // Get user role from localStorage
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "", // "success" or "error"
  });

  const formatDate = (dateInput) => {
    // Get only the date part to avoid time zone shift
    const datePart = dateInput?.slice(0, 10); // "YYYY-MM-DD"
    if (!datePart) return "N/A";

    const [year, month, day] = datePart.split("-");
    const dateObj = new Date(year, month - 1, day); // month is 0-indexed

    const formattedDate = dateObj.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    return formattedDate || "N/A";
  };

  const fetchLeaveApplications = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${backend_url}/all-leaves/admin`, {
        params: {
          search,
          type,
          status,
          fromDate: startDate,
          toDate: endDate,
          page: currentPage,
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });
      setLeaveApplications(res.data.leaves);
      setTotalRecords(res.data.totalRecords);
    } catch (error) {
      setLeaveApplications([]);
      console.error("Error fetching leave applications:", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchLeaveApplications();
  }, [search, type, status, startDate, endDate]);

  const toggleRow = (id) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const initiateStatusChange = (applicationId, newStatus) => {
    setPendingStatusChange({ applicationId, newStatus });
    setShowConfirmation(true);
  };

  const confirmStatusChange = async () => {
    try {
      const res = await axios.post(
        `${backend_url}/edit-leave`,
        {
          leaveId: pendingStatusChange.applicationId,
          status: pendingStatusChange.newStatus,
          comment: comment || undefined, // Only send if comment exists
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        }
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
        message: error.response.data?.message || "Error updating status",
        type: error.response.data?.status || "error",
      });
      console.error("Error updating status:", error);
    }finally {
      setPendingStatusChange({ applicationId: null, newStatus: "" });
      setComment("");
      closeConfirmation();
    }
  };

  const closeConfirmation = () => {
    setShowConfirmation(false);
    setPendingStatusChange({ applicationId: null, newStatus: "" });
    setComment("");
  };

  const canChangeStatus = (application) => {
    // Prevent status change if the leave is in the past
    if (new Date(application.fromDate) < new Date()) {
      return false;
    }

    if (userRole === "admin") {
      // Prevent change if super_admin has already approved
      return !application.approvalHistory.some(
        (history) => history.approverId?.role === "super_admin"
      );
    }

    // Super admin can change status if not blocked by past-date rule
    return true;
  };
  const totalPages = Math.ceil(totalRecords / 50);

  // ✅ Handle Pagination
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  // Format date for input value
  const formatDateForInput = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  };

  // Update the reset function
  const handleReset = () => {
    setSearch("");
    setType("");
    setStatus("");
    setStartDate("");
    setEndDate("");
    navigate("/leaveApplication", { replace: true });
  };

  return (
    <div className="leave-application">
      {alert.show && (
        <CustomAlert
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert({ show: false, message: "", type: "" })}
        />
      )}
      <div className="leave-application-header">Leave Application</div>
      <div className="leave-application-container">
        <div className="leave-application-filter">
          <div className="search-filter">
            <input
              type="text"
              placeholder="Search by Name or Code"
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
              <option value="unpaid">Unpaid Leave</option>
              <option value="maternity">Maternity Leave</option>
              <option value="paternity">Paternity Leave</option>
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
                <th>Employee Name</th>
                <th>Employee Code</th>
                <th>Leave Type</th>
                <th>From Date</th>
                <th>To Date</th>
                <th>Total Days</th>
                <th>Status</th>
                <th>Applied At</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center" }}>
                    loading...
                  </td>
                </tr>
              ) : leaveApplications.length > 0 ? (
                leaveApplications.map((application) => (
                  <React.Fragment key={application._id}>
                    <tr className="leave-row">
                      <td>
                        <button
                          className="expand-button"
                          onClick={() => toggleRow(application._id)}
                        >
                          {expandedRows[application._id] ? (
                            <FaChevronUp />
                          ) : (
                            <FaChevronDown />
                          )}
                        </button>
                      </td>
                      <td>{application.employeeName}</td>
                      <td>{application.employeeCode}</td>
                      <td>{application.leaveType}</td>
                      <td>{formatDate(application.fromDate)}</td>
                      <td>{formatDate(application.toDate)}</td>
                      <td>{application.totalDays}</td>
                      <td>
                        {canChangeStatus(application) ? (
                          <select
                            value={application.status}
                            onChange={(e) =>
                              initiateStatusChange(
                                application._id,
                                e.target.value
                              )
                            }
                            className={`status-select ${application.status.toLowerCase()}`}
                          >
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        ) : (
                          <span
                            className={`status-badge ${application.status.toLowerCase()}`}
                          >
                            {application.status}
                          </span>
                        )}
                      </td>
                      <td>{formatDate(application.appliedAt)}</td>
                    </tr>
                    {expandedRows[application._id] && (
                      <tr className="expanded-row">
                        <td colSpan="9">
                          <div className="leave-expanded-content">
                            <div className="reason-section">
                              <strong>Reason:</strong> {application.reason}
                            </div>
                            {application.attachmentUrl && (
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
                            )}
                          </div>
                          {application.approvalHistory &&
                            application.approvalHistory.length > 0 && (
                              <div className="approval-history">
                                <strong>Approval History:</strong>
                                <table className="history-table">
                                  <thead>
                                    <tr>
                                      <th>Name</th>
                                      <th>Role</th>
                                      <th>Status</th>
                                      <th>Comment</th>
                                      <th>Date</th>
                                      <th>Action</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {application.approvalHistory.map(
                                      (history, index) => (
                                        <tr key={index}>
                                          <td>{history.approverId?.name}</td>
                                          <td>{history.approverId?.role}</td>
                                          <td>{history.action}</td>
                                          <td>{history.comment}</td>
                                          <td>{formatDate(history.date)}</td>
                                          <td>{history.action}</td>
                                        </tr>
                                      )
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center" }}>
                    No data found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* ✅ Pagination */}
      <div className="pagination">
        <button
          onClick={prevPage}
          className="page-btn"
          disabled={currentPage === 1}
        >
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
      {showConfirmation && (
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
      )}
    </div>
  );
}

export default LeaveApplication;
