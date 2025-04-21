import axios from "axios";
import React, { useState, useEffect, useRef } from "react";
import "./style.scss";
import config from "../../config.js";
import {
  FaChevronDown,
  FaChevronUp,
  FaDownload,
  FaEdit,
  FaSave,
  FaTimes,
} from "react-icons/fa";
import { RiDeleteBin6Line } from "react-icons/ri";
import { Link } from "react-router-dom";

const backendUrl = config.backend_url;

export default function LatestAttendance() {
  const [deleteId, setDeleteId] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalpages] = useState(0);
  const [search, setSearch] = useState("");
  const [editID, setEditId] = useState("");
  const [editData, setEditData] = useState({});
  const [date, setdate] = useState("");
  const [expand, setExpand] = useState("");
  const [address, setAddresses] = useState("");
  const [status, setStatus] = useState("");
  const [count, setCount] = useState({});
  const [firmList, setFirmList] = useState([]);
  const [firms, setFirms] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState("");
  const [dropdownStyles, setDropdownStyles] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef(null);
  const limit = 100;

  const getAllActorTypes = async () => {
    try {
      const res = await axios.get(
        `${backendUrl}/actorTypesHierarchy/get-all-by-admin`
      );
      setFirmList(res.data.data);
    } catch (error) {
      console.log(error);
    }
  };

  //get getAttendanceCount
  const getAttendanceCount = async () => {
    let newDate = "";
    if (!date) {
      const date = new Date();
      newDate = date.toISOString().split("T")[0];
    } else {
      newDate = new Date(date).toISOString().split("T")[0];
    }
    console.log(newDate);
    try {
      const response = await axios.get(
        `${backendUrl}/get-attendance-by-date/${newDate}`,
        {
          params: {
            firms,
          },
        }
      );
      setCount(response.data.attendanceCount);
    } catch (err) {
      console.error("Error fetching attendance:", err);
    }
  };

  const getAttendance = async () => {
    try {
      // console.log(date);
      const res = await axios.get(
        `${backendUrl}/get-latest-attendance-by-date`,
        {
          params: {
            date,
            page: currentPage,
            limit,
            search,
            status,
            firms,
          },
        }
      );

      // console.log(res);
      setAttendance(res.data.data);
      setTotalpages(res.data.totalPages);
    } catch (error) {
      console.log("Error fetching attendance:", error);
    }
  };

  const fetchAddress = async (lat, lon) => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
      );

      setAddresses(response.data.display_name);
    } catch (error) {
      console.error("Error fetching address:", error);
    }
  };

  //handle download
  const handleDownload = async () => {
    try {
      const response = await axios.get(
        `${backendUrl}/download-all-attendance/`,
        {
          params: {
            date,
            search,
            status,
            firms,
          },
          responseType: "blob", // ✅ Important for file downloads

          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );

      // Create a Blob URL
      const url = window.URL.createObjectURL(new Blob([response.data]));

      // Create a download link
      const a = document.createElement("a");
      a.href = url;
      a.download = "all_attendance_data.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Cleanup Blob URL
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Error downloading the file. Please try again.");
    }
  };

  //delete employee attendance by id
  const deleteRow = async () => {
    try {
      await axios.delete(
        `${backendUrl}/delete-employee-attendance/${deleteId}`,
        {
          headers: {
            Authorization: localStorage.getItem("authToken") || "",
          },
        }
      );

      setDeleteId(null); // Reset deleteId after successful deletion
      getAttendance(); // Refresh data
    } catch (error) {
      console.error("Error deleting attendance record:", error);
    }
  };

  //handle save
  const handleSave = async () => {
    try {
      await axios.put(`${backendUrl}/edit-attendance/${editID}`, editData, {
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });
      getAttendance();
    } catch (error) {
      console.log(error);
    }
  };
  //Handle edit
  const handleEdit = (row) => {
    setEditId(row._id);
    setEditData(row);
  };

  // Handle Previous Page
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  // Handle Next Page
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handleDropdownClick = (event) => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setDropdownStyles({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
    setDropdownOpen(!dropdownOpen);
  };

  const handleFirmSelect = (firm) => {
    if (firms.includes(firm._id)) {
      setFirms(firms.filter((id) => id !== firm._id));
    } else {
      setFirms([...firms, firm._id]);
    }
    setCurrentPage(1);
  };

  const handleClearFirms = () => {
    setFirms([]);
    setCurrentPage(1);
  };

  const handleApplyFirms = () => {
    setDropdownOpen(false);
    setDropdownSearch("");
    getAttendance();
    getAttendanceCount();
  };

  useEffect(() => {
    getAllActorTypes();
    getAttendance();
    getAttendanceCount();
  }, [currentPage, search, date, status]);

  useEffect(() => {
    const total = Object.values(count).reduce((sum, value) => sum + value, 0);
    if (!Object.keys(count).includes("totalEmployees")) {
      setCount((prev) => ({ ...prev, totalEmployees: total }));
    }
    // console.log(count);
  }, [count]);

  return (
    <div className="latestAttendance-page">
      <div className="latestAttendance-page-header">
        <Link to="/attendance">Attendance</Link> &#47;
        <span>All Attendance</span>
      </div>
      <div className="latestAttendance-page-counter-container">
        <div className="latestAttendance-page-counter-container-header">
          {date ? (
            <>{new Date(date).toISOString().split("T")[0]} Attendance</>
          ) : (
            <>Today&apos;s Attendance</>
          )}
        </div>
        <div className="latestAttendance-page-counter">
          <div className="latestAttendance-page-total-count counts">
            <span className="latestAttendance-page-counter-header">
              Total Employee:
            </span>
            <span>{count.totalEmployees}</span>
          </div>
          <div className="latestAttendance-page-present-count counts">
            <span className="latestAttendance-page-counter-header">
              Total Present:
            </span>
            <span>{count.present + count.pending}</span>
          </div>
          <div className="latestAttendance-page-absent-count counts">
            <span className="latestAttendance-page-counter-header">
              Total Absent:
            </span>
            <span>{count.absent}</span>
          </div>
          <div className="latestAttendance-page-half-day-count counts">
            <span className="latestAttendance-page-counter-header">
              Total Half-Day:
            </span>
            <span>{count.halfDay}</span>
          </div>
          <div className="latestAttendance-page-leave-count counts">
            <span className="latestAttendance-page-counter-header">
              Total Leave:
            </span>
            <span>{count.leave}</span>
          </div>
        </div>
      </div>

      <div className="latestAttendance-page-container">
        <div className="latestAttendance-page-first-line">
          <div className="latestAttendance-page-filters">
            <input
              value={search}
              onChange={(e) => {
                setCurrentPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Search code"
            />
            <input
              type="date"
              onChange={(e) => {
                setCurrentPage(1);

                const dateValue = e.target.value; // Get the input value

                if (!dateValue) {
                  setdate(""); // If cleared, set an empty string
                } else {
                  setdate(new Date(dateValue).toISOString().split("T")[0]); // Convert to YYYY-MM-DD
                }
              }}
            />
            <select
              value={status}
              onChange={(e) => {
                setCurrentPage(1);
                setStatus(e.target.value);
              }}
            >
              <option value="">Select Status</option>
              <option value="Present">Present</option>
              <option value="Pending">Pending</option>
              <option value="Absent">Absent</option>
              <option value="Half Day">Half Day</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>

            <div className="custom-dropdown" ref={dropdownRef}>
              <div className="dropdown-header" onClick={handleDropdownClick}>
                {firms.length > 0 ? (
                  <span>
                    {firms.length} firm{firms.length > 1 ? "s" : ""} selected
                  </span>
                ) : (
                  <span>Select Firms</span>
                )}
                {dropdownOpen ? <FaChevronUp /> : <FaChevronDown />}
              </div>

              {dropdownOpen && (
                <div
                  className="dropdown-content"
                  style={{
                    position: "absolute",
                  }}
                >
                  <div className="dropdown-search">
                    <input
                      type="text"
                      placeholder="Search firms..."
                      value={dropdownSearch}
                      onChange={(e) => setDropdownSearch(e.target.value)}
                    />
                  </div>

                  {firms.length > 0 && (
                    <div className="selected-firms">
                      <div className="selected-firms-header"></div>
                      {firmList
                        .filter((firm) => firms.includes(firm._id))
                        .map((firm) => (
                          <div
                            key={firm._id}
                            className="selected-firm-item"
                            onClick={() => handleFirmSelect(firm)}
                          >
                            {firm.name}
                          </div>
                        ))}
                    </div>
                  )}

                  <div className="firms-list">
                    {firmList
                      .filter(
                        (firm) =>
                          !firms.includes(firm._id) &&
                          firm.name
                            .toLowerCase()
                            .includes(dropdownSearch.toLowerCase())
                      )
                      .map((firm) => (
                        <div
                          key={firm._id}
                          className="firm-item"
                          onClick={() => handleFirmSelect(firm)}
                        >
                          {firm.name}
                        </div>
                      ))}
                  </div>

                  <div className="dropdown-actions">
                    <button className="clear-btn" onClick={handleClearFirms}>
                      Clear
                    </button>
                    <button className="apply-btn" onClick={handleApplyFirms}>
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="latestAttendance-page-button">
            <button
              className="download-attendance-button"
              onClick={handleDownload}
            >
              <FaDownload />
              Download All Attendance
            </button>
          </div>
        </div>
        <div className="latestAttendance-table-container">
          <table>
            <thead>
              <tr className="main-header">
                <th rowSpan={2}>SNo.</th>
                <th rowSpan={2}>code</th>
                <th rowSpan={2}>Name</th>
                <th rowSpan={2}>Position</th>
                <th rowSpan={2}>Date</th>
                <th colSpan={2}>Punch In</th>
                <th colSpan={2}>Punch Out</th>
                <th rowSpan={2}>Status</th>
                <th rowSpan={2}>Hours Worked</th>
                <th rowSpan={2}>Expand</th>
                <th rowSpan={2}>Action</th>
              </tr>
              <tr>
                {/**
                  <th>Image</th>
                  */}
                <th>Time</th>
                <th>Shop Name</th>
                {/**
                  <th>Image</th> 
                  */}
                <th>Time</th>
                <th>Shop Name</th>
              </tr>
            </thead>

            <tbody>
              {attendance.length > 0 ? (
                attendance.map((record, index) => (
                  <React.Fragment key={record._id || index}>
                    <tr>
                      <td>{(currentPage - 1) * limit + index + 1}</td>
                      <td>{record.code}</td>
                      <td>{record.name}</td>
                      <td>{record.position}</td>
                      <td>
                        {new Date(record.date).toISOString().split("T")[0]}
                      </td>
                      <td>
                        {editID === record._id ? (
                          <input
                            type="time"
                            value={
                              editData.punchIn
                                ? new Date(editData.punchIn).toLocaleTimeString(
                                    "en-IN",
                                    {
                                      timeZone: "Asia/Kolkata",
                                      hour12: false,
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )
                                : ""
                            }
                            onChange={(e) => {
                              const [hours, minutes] =
                                e.target.value.split(":");
                              const newDate = new Date(
                                editData.punchIn || new Date()
                              );
                              newDate.setHours(hours);
                              newDate.setMinutes(minutes);
                              setEditData({
                                ...editData,
                                punchIn: newDate.toISOString(),
                              });
                            }}
                          />
                        ) : record.punchIn ? (
                          new Date(record.punchIn).toLocaleTimeString("en-IN", {
                            timeZone: "Asia/Kolkata",
                          })
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td>{record.punchInName || "N/A"}</td>
                      <td>
                        {editID === record._id ? (
                          <input
                            type="time"
                            value={
                              editData.punchOut
                                ? new Date(
                                    editData.punchOut
                                  ).toLocaleTimeString("en-IN", {
                                    timeZone: "Asia/Kolkata",
                                    hour12: false,
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""
                            }
                            onChange={(e) => {
                              const [hours, minutes] =
                                e.target.value.split(":");
                              const newDate = new Date(
                                editData.punchOut || new Date()
                              );
                              newDate.setHours(hours);
                              newDate.setMinutes(minutes);
                              setEditData({
                                ...editData,
                                punchOut: newDate.toISOString(),
                              });
                            }}
                          />
                        ) : record.punchOut ? (
                          new Date(record.punchOut).toLocaleTimeString(
                            "en-IN",
                            {
                              timeZone: "Asia/Kolkata",
                            }
                          )
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td>{record.punchOutName || "N/A"}</td>

                      {editID === record._id ? (
                        <td>
                          <select
                            value={editData.status}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                status: e.target.value,
                              })
                            }
                          >
                            <option value="Present">Present</option>
                            <option value="Pending">Pending</option>
                            <option value="Absent">Absent</option>
                            <option value="Half Day">Half Day</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </td>
                      ) : (
                        <td>{record.status}</td>
                      )}

                      <td>{record.hoursWorked || "N/A"}</td>

                      <td className="expand-btn">
                        <button
                          onClick={() => {
                            setExpand(
                              expand === record._id ? null : record._id
                            );
                            fetchAddress(record.latitude, record.longitude);
                          }}
                        >
                          {expand === record._id ? (
                            <>
                              Collapse <FaChevronUp />
                            </>
                          ) : (
                            <>
                              Expand <FaChevronDown />
                            </>
                          )}
                        </button>
                      </td>

                      <td>
                        {editID === record._id ? (
                          <>
                            <FaSave
                              color="green"
                              style={{ cursor: "pointer", marginRight: "10px" }}
                              onClick={() => {
                                handleSave();
                                setEditId(null);
                              }}
                            />
                            <FaTimes
                              color="red"
                              style={{ cursor: "pointer" }}
                              onClick={() => setEditId(null)}
                            />
                          </>
                        ) : (
                          <>
                            <FaEdit
                              color="#005bfe"
                              style={{ cursor: "pointer", marginRight: "10px" }}
                              onClick={() => handleEdit(record)}
                            />
                            <RiDeleteBin6Line
                              color="#F21E1E"
                              style={{ cursor: "pointer" }}
                              onClick={() => setDeleteId(record._id)}
                            />
                          </>
                        )}
                      </td>
                    </tr>

                    {expand === record._id && (
                      <tr>
                        <td colSpan="13" className="inner-code">
                          <table className="expanded-table">
                            <thead>
                              <tr>
                                <th>Address</th>
                                <th>Map</th>
                                <th>Punch In Image</th>
                                <th>Punch Out Image</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="inner-table-address">
                                  {address}
                                </td>
                                <td className="inner-table-map">
                                  <iframe
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    src={`https://maps.google.com/maps?q=${record.latitude},${record.longitude}&z=16&output=embed`}
                                    title="Google Map"
                                  ></iframe>
                                </td>
                                <td>
                                  {record.punchInImage ? (
                                    <img
                                      src={record.punchInImage}
                                      alt="Punch In"
                                    />
                                  ) : (
                                    "N/A"
                                  )}
                                </td>
                                <td>
                                  {record.punchOutImage ? (
                                    <img
                                      src={record.punchOutImage}
                                      alt="Punch Out"
                                    />
                                  ) : (
                                    "N/A"
                                  )}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan="13" style={{ textAlign: "center" }}>
                    No recent activities
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Pagination */}
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
      {deleteId !== null && (
        <div className="delete-modal" onClick={() => setDeleteId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-content">
              <div className="delete-model-header">
                Are you sure you want to delete this row?
              </div>
              <div className="delete-modal-buttons">
                <button
                  className="cancel-btn"
                  onClick={() => setDeleteId(null)}
                >
                  Cancel
                </button>
                <button className="delete-btn" onClick={deleteRow}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
