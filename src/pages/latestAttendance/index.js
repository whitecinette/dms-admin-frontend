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
import CustomAlert from "../../components/CustomAlert";

const backendUrl = config.backend_url;

const AddAttendancePopup = ({
  showAddAttendance,
  setShowAddAttendance,
  newAttendance,
  setNewAttendance,
  handleAddAttendance,
}) => {
  if (!showAddAttendance) return null;

  return (
    <div
      className="add-attendance-modal"
      onClick={() => setShowAddAttendance(false)}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Attendance</h2>
          <button
            className="close-btn"
            onClick={() => setShowAddAttendance(false)}
          >
            <FaTimes />
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Employee Code</label>
            <input
              type="text"
              value={newAttendance.code}
              onChange={(e) =>
                setNewAttendance({ ...newAttendance, code: e.target.value })
              }
              placeholder="Enter employee code"
              required
            />
          </div>
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              value={newAttendance.date}
              onChange={(e) =>
                setNewAttendance({ ...newAttendance, date: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>Punch In Time</label>
            <input
              type="time"
              value={newAttendance.punchIn}
              onChange={(e) =>
                setNewAttendance({
                  ...newAttendance,
                  punchIn: e.target.value,
                })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Punch Out Time</label>
            <input
              type="time"
              value={newAttendance.punchOut}
              onChange={(e) =>
                setNewAttendance({
                  ...newAttendance,
                  punchOut: e.target.value,
                })
              }
            />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select
              value={newAttendance.status}
              onChange={(e) =>
                setNewAttendance({ ...newAttendance, status: e.target.value })
              }
            >
              <option value="Present">Present</option>
              <option value="Half Day">Half Day</option>
            </select>
          </div>
          <div className="form-group">
            <label>Remark</label>
            <textarea
              value={newAttendance.remark}
              onChange={(e) =>
                setNewAttendance({ ...newAttendance, remark: e.target.value })
              }
              placeholder="Enter any remarks"
            />
          </div>
          <div className="modal-footer">
            <button
              className="cancel-btn"
              onClick={() => setShowAddAttendance(false)}
            >
              Cancel
            </button>
            <button className="submit-btn" onClick={handleAddAttendance}>
              Add Attendance
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  const [punchInAddress, setPunchInAddress] = useState({});
  const [punchOutAddress, setPunchOutAddress] = useState({});
  const [loadingAddresses, setLoadingAddresses] = useState({});
  const [status, setStatus] = useState("");
  const [count, setCount] = useState({});
  const [firmList, setFirmList] = useState([]);
  const [firms, setFirms] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState("");
  const [dropdownStyles, setDropdownStyles] = useState({ top: 0, left: 0 });
  const [showAddAttendance, setShowAddAttendance] = useState(false);
  const [newAttendance, setNewAttendance] = useState({
    code: "",
    date: new Date().toISOString().split("T")[0],
    punchIn: "",
    punchOut: "",
    status: "Present",
    latitude: null,
    longitude: null,
    remark: "",
    punchOutLatitude: null,
    punchOutLongitude: null,
  });
  const dropdownRef = useRef(null);
  const limit = 100;
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "info",
  });
  const [punchInImage, setPunchInImage] = useState({});
  const [punchOutImage, setPunchOutImage] = useState({});
  const [loadingImages, setLoadingImages] = useState({});

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
          headers: {
            Authorization: localStorage.getItem("authToken"),
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
          headers: {
            Authorization: localStorage.getItem("authToken"),
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
    if (!lat || !lon) return "N/A";
    try {
      // Convert MongoDB decimal to string if needed
      const latitude =
        typeof lat === "object" && lat.$numberDecimal
          ? lat.$numberDecimal
          : lat;
      const longitude =
        typeof lon === "object" && lon.$numberDecimal
          ? lon.$numberDecimal
          : lon;

      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
      );
      return response.data.display_name;
    } catch (error) {
      console.error("Error fetching address:", error);
      return "N/A";
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
      showAlert("Attendance data downloaded successfully!", "success");
    } catch (error) {
      console.error("Download failed:", error);
      showAlert("Error downloading the file. Please try again.", "error");
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
      showAlert("Attendance deleted successfully!", "success");
    } catch (error) {
      console.error("Error deleting attendance record:", error);
      showAlert("Error deleting attendance record", "error");
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
      showAlert("Attendance updated successfully!", "success");
    } catch (error) {
      console.log(error);
      showAlert(
        error.response?.data.message ||
          "Error adding attendance. Please try again.",
        "error"
      );
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

  const handleExpand = async (record) => {
    const newExpandState = expand === record._id ? null : record._id;
    setExpand(newExpandState);

    if (newExpandState) {
      setLoadingAddresses((prev) => ({ ...prev, [record._id]: true }));
      setLoadingImages((prev) => ({ ...prev, [record._id]: true }));
      try {
        const [inAddress, outAddress] = await Promise.all([
          fetchAddress(record.punchInLatitude, record.punchInLongitude),
          fetchAddress(record.punchOutLatitude, record.punchOutLongitude),
        ]);
        setPunchInAddress((prev) => ({ ...prev, [record._id]: inAddress }));
        setPunchOutAddress((prev) => ({ ...prev, [record._id]: outAddress }));

        // Load images only when expanding
        if (record.punchInImage) {
          const inImage = new Image();
          inImage.src = record.punchInImage;
          inImage.onload = () => {
            setPunchInImage((prev) => ({
              ...prev,
              [record._id]: record.punchInImage,
            }));
          };
        }
        if (record.punchOutImage) {
          const outImage = new Image();
          outImage.src = record.punchOutImage;
          outImage.onload = () => {
            setPunchOutImage((prev) => ({
              ...prev,
              [record._id]: record.punchOutImage,
            }));
          };
        }
      } catch (error) {
        console.error("Error fetching addresses:", error);
      } finally {
        setLoadingAddresses((prev) => ({ ...prev, [record._id]: false }));
        setLoadingImages((prev) => ({ ...prev, [record._id]: false }));
      }
    } else {
      // Clear images when collapsing
      setPunchInImage((prev) => {
        const newState = { ...prev };
        delete newState[record._id];
        return newState;
      });
      setPunchOutImage((prev) => {
        const newState = { ...prev };
        delete newState[record._id];
        return newState;
      });
    }
  };

  const handleAddAttendance = async () => {
    if (!newAttendance.code || !newAttendance.remark) {
      showAlert("Please fill in Code and Remark fields", "error");
      return;
    }

    try {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const updatedAttendance = {
            ...newAttendance,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            punchOutLatitude: newAttendance.punchOut
              ? position.coords.latitude
              : null,
            punchOutLongitude: newAttendance.punchOut
              ? position.coords.longitude
              : null,
          };

          try {
            await axios.post(
              `${backendUrl}/add-attendance-by-admin`,
              updatedAttendance,
              {
                headers: {
                  Authorization: localStorage.getItem("authToken"),
                },
              }
            );

            setShowAddAttendance(false);
            setNewAttendance({
              code: "",
              date: new Date().toISOString().split("T")[0],
              punchIn: "",
              punchOut: "",
              status: "Present",
              latitude: null,
              longitude: null,
              remark: "",
              punchOutLatitude: null,
              punchOutLongitude: null,
            });
            getAttendance();
            getAttendanceCount();
            showAlert("Attendance added successfully!", "success");
          } catch (error) {
            console.error("Error adding attendance:", error.response?.data);
            showAlert(
              error.response?.data.message ||
                "Error adding attendance. Please try again.",
              "error"
            );
          }
        });
      } else {
        showAlert("Geolocation is not supported by your browser", "error");
      }
    } catch (error) {
      console.error("Error in handleAddAttendance:", error.response?.data);
      showAlert(
        error.response?.data.message ||
          "Error adding attendance. Please try again.",
        "error"
      );
    }
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

  const showAlert = (message, type = "info") => {
    setAlert({ show: true, message, type });
  };

  const hideAlert = () => {
    setAlert({ show: false, message: "", type: "info" });
  };

  return (
    <div className="latestAttendance-page">
      {alert.show && (
        <CustomAlert
          message={alert.message}
          type={alert.type}
          onClose={hideAlert}
        />
      )}
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
            <button
              className="add-attendance-button"
              onClick={() => setShowAddAttendance(true)}
            >
              Add Attendance
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
                        <button onClick={() => handleExpand(record)}>
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
                                <th>Punch In Address</th>
                                <th>Map</th>
                                <th>Punch In Image</th>
                                <th>Punch Out Address</th>
                                <th>Map</th>
                                <th>Punch Out Image</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="inner-table-address">
                                  {loadingAddresses[record._id]
                                    ? "Loading..."
                                    : punchInAddress[record._id] || "N/A"}
                                </td>
                                <td className="inner-table-map">
                                  {record.punchInLatitude &&
                                  record.punchInLongitude ? (
                                    <iframe
                                      loading="lazy"
                                      referrerPolicy="no-referrer-when-downgrade"
                                      src={`https://maps.google.com/maps?q=${
                                        typeof record.punchInLatitude ===
                                        "object"
                                          ? record.punchInLatitude
                                              .$numberDecimal
                                          : record.punchInLatitude
                                      },${
                                        typeof record.punchInLongitude ===
                                        "object"
                                          ? record.punchInLongitude
                                              .$numberDecimal
                                          : record.punchInLongitude
                                      }&z=16&output=embed`}
                                      title="Google Map"
                                    ></iframe>
                                  ) : (
                                    "N/A"
                                  )}
                                </td>
                                <td>
                                  {loadingImages[record._id] ? (
                                    "Loading..."
                                  ) : punchInImage[record._id] ? (
                                    <img
                                      src={punchInImage[record._id]}
                                      alt="Punch In"
                                    />
                                  ) : (
                                    "N/A"
                                  )}
                                </td>
                                <td className="inner-table-address">
                                  {loadingAddresses[record._id]
                                    ? "Loading..."
                                    : punchOutAddress[record._id] || "N/A"}
                                </td>
                                <td className="inner-table-map">
                                  {record.punchOutLatitude &&
                                  record.punchOutLongitude ? (
                                    <iframe
                                      loading="lazy"
                                      referrerPolicy="no-referrer-when-downgrade"
                                      src={`https://maps.google.com/maps?q=${
                                        typeof record.punchOutLatitude ===
                                        "object"
                                          ? record.punchOutLatitude
                                              .$numberDecimal
                                          : record.punchOutLatitude
                                      },${
                                        typeof record.punchOutLongitude ===
                                        "object"
                                          ? record.punchOutLongitude
                                              .$numberDecimal
                                          : record.punchOutLongitude
                                      }&z=16&output=embed`}
                                      title="Google Map"
                                    ></iframe>
                                  ) : (
                                    "N/A"
                                  )}
                                </td>
                                <td>
                                  {loadingImages[record._id] ? (
                                    "Loading..."
                                  ) : punchOutImage[record._id] ? (
                                    <img
                                      src={punchOutImage[record._id]}
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
      {showAddAttendance && (
        <AddAttendancePopup
          showAddAttendance={showAddAttendance}
          setShowAddAttendance={setShowAddAttendance}
          newAttendance={newAttendance}
          setNewAttendance={setNewAttendance}
          handleAddAttendance={handleAddAttendance}
        />
      )}
    </div>
  );
}
