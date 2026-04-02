import axios from "axios";
import React, { useState, useEffect, useRef } from "react";
import "./style.scss";
import config from "../../config.js";
import {
  FaChevronDown,
  FaChevronUp,
  FaDownload,
  FaEdit,
  FaEye,
  FaSave,
  FaTimes,
} from "react-icons/fa";
import { RiDeleteBin6Line } from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import CustomAlert from "../../components/CustomAlert";
import AttendanceCards from "../../layout/AttendanceCard.js";
import TableBodyLoading from "../../components/tableLoading";

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
  const [attendance, setAttendance] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalpages] = useState(0);
  const [search, setSearch] = useState("");
  const [editID, setEditId] = useState("");
  const [editData, setEditData] = useState({});
  const [date, setdate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [expand, setExpand] = useState("");
  const [punchInAddress, setPunchInAddress] = useState({});
  const [punchOutAddress, setPunchOutAddress] = useState({});
  const [loadingAddresses, setLoadingAddresses] = useState({});
  const [status, setStatus] = useState("");
  const [count, setCount] = useState({});
  const [firmList, setFirmList] = useState([]);
  const [firms, setFirms] = useState([]);

  const [attendanceFirmOptions, setAttendanceFirmOptions] = useState([]);
  const [selectedFirmCodes, setSelectedFirmCodes] = useState([]);
  const [firmsDropdownOpen, setFirmsDropdownOpen] = useState(false);
  const [firmsDropdownSearch, setFirmsDropdownSearch] = useState("");

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

  const navigate = useNavigate();
  const firmsDropdownRef = useRef(null);
  const limit = 100;

  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "info",
  });

  const [punchInImage, setPunchInImage] = useState({});
  const [punchOutImage, setPunchOutImage] = useState({});
  const [loadingImages, setLoadingImages] = useState({});
  const [selectedMonthYear, setSelectedMonthYear] = useState(() => {
    const now = new Date();
    return `${now.getMonth() + 1}-${now.getFullYear()}`;
  });
  const alertTimeoutRef = useRef(null);
  const [AddedAttendance, setAddedAttendance] = useState([]);
  const [showAddAttendanceTable, setShowAddAttendanceTable] = useState(false);
  const role = localStorage.getItem("role");
  const [tag, setTag] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  const getAddedAttendance = async () => {
    const [month, year] = selectedMonthYear.split("-");
    setIsLoading(true);

    try {
      const res = await axios.get(
        `${backendUrl}/get-all-attendance-add-by-admin`,
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
          params: {
            search,
            status,
            date,
            month,
            year,
            tag,
          },
        }
      );

      setAddedAttendance(res.data.data);
      setIsLoading(false);
    } catch (error) {
      setAddedAttendance([]);
      setShowAddAttendanceTable(false);
      console.error("Error fetching added attendance:", error);
      setIsLoading(false);
    }
  };

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

  const getAttendanceFirmOptions = async () => {
    try {
      const res = await axios.get(`${backendUrl}/attendance-firm-options`, {
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });

      setAttendanceFirmOptions(res.data?.data || []);
    } catch (error) {
      console.log("error fetching attendance firm options", error);
      setAttendanceFirmOptions([]);
    }
  };

  const getAttendanceCount = async () => {
    try {
      let newDate = "";
      if (!date) {
        const today = new Date();
        newDate = today.toISOString().split("T")[0];
      } else {
        newDate = new Date(date).toISOString().split("T")[0];
      }

      const response = await axios.get(`${backendUrl}/get-total-employee-count`, {
        params: { date: newDate },
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });

      setCount({
        present: response.data.presentCount,
        absent: response.data.absentCount,
        leave: response.data.leaveCount,
        halfDay: response.data.halfDayCount,
        pending: response.data.pendingCount,
        total: response.data.total,
      });
    } catch (err) {
      console.error("Error fetching total employee attendance:", err);
    }
  };

  const getAttendance = async () => {
    try {
      const [month, year] = selectedMonthYear.split("-");
      setIsLoading(true);

      const firmCodes =
        selectedFirmCodes.length > 0 ? selectedFirmCodes.join(",") : "";

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
            firmCodes,
            month,
            year,
            tag,
          },
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );

      setAttendance(res.data.data);
      setTotalpages(res.data.totalPages);
      setIsLoading(false);
    } catch (error) {
      console.log("Error fetching attendance:", error);
      setIsLoading(false);
    }
  };

  const fetchAddress = async (lat, lon) => {
    if (!lat || !lon) return "N/A";
    try {
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

  const handleDownload = async () => {
    const [month, year] = selectedMonthYear.split("-");
    const firmCodes =
      selectedFirmCodes.length > 0 ? selectedFirmCodes.join(",") : "";

    try {
      setIsDownloading(true);
      const response = await axios.get(
        `${backendUrl}/download-all-attendance/`,
        {
          params: {
            date,
            search,
            status,
            firms,
            month,
            year,
            tag,
            firmCodes,
          },
          responseType: "blob",
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "all_attendance_data.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showAlert("Attendance data downloaded successfully!", "success");
    } catch (error) {
      console.error("Download failed:", error);
      showAlert("Error downloading the file. Please try again.", "error");
    } finally {
      setIsDownloading(false);
    }
  };

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

      setDeleteId(null);
      getAttendance();
      getAddedAttendance();
      showAlert("Attendance deleted successfully!", "success");
    } catch (error) {
      console.error("Error deleting attendance record:", error);
      showAlert("Error deleting attendance record", "error");
    }
  };

  const handleSave = async () => {
    const { name, position, ...data } = editData;
    try {
      await axios.put(`${backendUrl}/edit-attendance/${editID}`, data, {
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });
      getAttendance();
      getAddedAttendance();
      showAlert("Attendance updated successfully!", "success");
      setEditId(null);
    } catch (error) {
      console.log(error);
      showAlert(
        error.response?.data.message ||
          "Error updating attendance. Please try again.",
        "error"
      );
    }
  };

  const handleEdit = (row) => {
    setEditId(row._id);
    setEditData(row);
  };

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

  const handleDropdownClickForFirms = () => {
    setFirmsDropdownOpen(!firmsDropdownOpen);
  };

  const handleFirmSelect = (firm) => {
    if (selectedFirmCodes.includes(firm.code)) {
      setSelectedFirmCodes(
        selectedFirmCodes.filter((code) => code !== firm.code)
      );
    } else {
      setSelectedFirmCodes([...selectedFirmCodes, firm.code]);
    }
    setCurrentPage(1);
  };

  const handleClearFirms = () => {
    setSelectedFirmCodes([]);
    setCurrentPage(1);
  };

  const handleApplyFirms = () => {
    setFirmsDropdownOpen(false);
    setFirmsDropdownSearch("");
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
            getAddedAttendance();
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

  const isAbsent = (record) => {
    if (!record || !record.status) {
      return false;
    }
    const status = record.status.trim().toLowerCase();
    return status === "absent" || status === "leave";
  };

  useEffect(() => {
    getAllActorTypes();
    getAddedAttendance();
    getAttendance();
    getAttendanceCount();
    getAttendanceFirmOptions();
  }, [currentPage, search, date, status, selectedMonthYear, tag, selectedFirmCodes]);

  const showAlert = (message, type = "info") => {
    setAlert({ show: true, message, type });
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    alertTimeoutRef.current = setTimeout(() => {
      setAlert({ show: false, message: "", type: "info" });
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    };
  }, []);

  return (
    <div className="latestAttendance-page">
      {alert.show && (
        <CustomAlert
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert({ show: false, message: "", type: "info" })}
        />
      )}

      <div className="latestAttendance-page-header-line">
        <div className="latestAttendance-page-header">
          <span>Attendance</span>
        </div>
        <button
          className="add-attendance-button"
          onClick={() => setShowAddAttendance(true)}
        >
          Add Attendance
        </button>
      </div>

      <div className="latestAttendance-page-counter-container">
        <div className="latestAttendance-page-counter">
          <AttendanceCards
            date={date}
            selectedFlows={selectedFirmCodes}
            setSelectedFlows={setSelectedFirmCodes}
          />
        </div>
      </div>

      <div className="latestAttendance-page-container">
        <div className="latestAttendance-page-first-line">
          <div className="latestAttendance-page-filters">
            {!showAddAttendanceTable && (
              <input
                value={search}
                onChange={(e) => {
                  setCurrentPage(1);
                  setSearch(e.target.value);
                }}
                placeholder="Search code"
              />
            )}

            <input
              type="date"
              value={date}
              onChange={(e) => {
                setCurrentPage(1);
                const dateValue = e.target.value;
                if (!dateValue) {
                  setdate("");
                } else {
                  const newDate = new Date(dateValue);
                  setdate(newDate.toISOString().split("T")[0]);
                  setSelectedMonthYear(
                    `${newDate.getMonth() + 1}-${newDate.getFullYear()}`
                  );
                }
              }}
            />

            <select
              value={selectedMonthYear}
              onChange={(e) => {
                setCurrentPage(1);
                const newMonthYear = e.target.value;
                setSelectedMonthYear(newMonthYear);

                if (date) {
                  const [month, year] = newMonthYear.split("-");
                  const currentDate = new Date(date);
                  const newDate = new Date(
                    parseInt(year),
                    parseInt(month) - 1,
                    currentDate.getDate()
                  );

                  if (newDate.getMonth() !== parseInt(month) - 1) {
                    newDate.setDate(0);
                  }

                  setdate(newDate.toISOString().split("T")[0]);
                }
              }}
            >
              {(() => {
                const options = [];
                const currentDate = new Date();
                const currentYear = currentDate.getFullYear();

                for (let year = currentYear - 1; year <= currentYear; year++) {
                  for (let month = 0; month < 12; month++) {
                    const date = new Date(year, month);
                    const monthName = date.toLocaleString("default", {
                      month: "long",
                    });
                    const value = `${month + 1}-${year}`;
                    options.push(
                      <option key={value} value={value}>
                        {monthName} {year}
                      </option>
                    );
                  }
                }
                return options;
              })()}
            </select>

            {!showAddAttendanceTable && (
              <>
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
                  <option value="Leave">Leave</option>
                </select>

                <select
                  value={tag}
                  onChange={(e) => {
                    setCurrentPage(1);
                    setTag(e.target.value);
                  }}
                >
                  <option value="">Select Tag</option>
                  <option value="office">Office</option>
                </select>

                <div className="custom-dropdown" ref={firmsDropdownRef}>
                  <div
                    className="dropdown-header"
                    onClick={handleDropdownClickForFirms}
                  >
                    {selectedFirmCodes.length > 0 ? (
                      <span>
                        {selectedFirmCodes.length} firm
                        {selectedFirmCodes.length > 1 ? "s" : ""} selected
                      </span>
                    ) : (
                      <span>Select Firms</span>
                    )}
                    {firmsDropdownOpen ? <FaChevronUp /> : <FaChevronDown />}
                  </div>

                  {firmsDropdownOpen && (
                    <div
                      className="dropdown-content"
                      style={{ position: "absolute" }}
                    >
                      <div className="dropdown-search">
                        <input
                          type="text"
                          placeholder="Search firms..."
                          value={firmsDropdownSearch}
                          onChange={(e) =>
                            setFirmsDropdownSearch(e.target.value)
                          }
                        />
                      </div>

                      {selectedFirmCodes.length > 0 && (
                        <div className="selected-firms">
                          <div className="selected-firms-header"></div>
                          {attendanceFirmOptions
                            .filter((firm) =>
                              selectedFirmCodes.includes(firm.code)
                            )
                            .map((firm) => (
                              <div
                                key={firm.code}
                                className="selected-firm-item"
                                onClick={() => handleFirmSelect(firm)}
                              >
                                {firm.label || firm.name || firm.code}
                              </div>
                            ))}
                        </div>
                      )}

                      <div className="firms-list">
                        {attendanceFirmOptions
                          .filter(
                            (firm) =>
                              !selectedFirmCodes.includes(firm.code) &&
                              `${firm.label || firm.name || firm.code}`
                                .toLowerCase()
                                .includes(firmsDropdownSearch.toLowerCase())
                          )
                          .map((firm) => (
                            <div
                              key={firm.code}
                              className="firm-item"
                              onClick={() => handleFirmSelect(firm)}
                            >
                              {firm.label || firm.name || firm.code}
                            </div>
                          ))}
                      </div>

                      <div className="dropdown-actions">
                        <button
                          className="clear-btn"
                          onClick={handleClearFirms}
                        >
                          Clear
                        </button>
                        <button
                          className="apply-btn"
                          onClick={handleApplyFirms}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="latestAttendance-page-button">
            <button
              className="download-attendance-button"
              onClick={handleDownload}
            >
              <FaDownload />
              {isDownloading ? "Downloading..." : "Download Attendance"}
            </button>

            {role === "super_admin" && (
              <button
                className="show-add-attendance-button"
                onClick={() => setShowAddAttendanceTable((pre) => !pre)}
              >
                {showAddAttendanceTable
                  ? "Show All Attendance"
                  : "Show Attendance Add by Admin"}
              </button>
            )}
          </div>
        </div>

        {showAddAttendanceTable ? (
          <div className="AddedAttendance-table-container">
            <table>
              <thead>
                <tr className="main-header">
                  <th rowSpan={2}>SNo.</th>
                  <th rowSpan={2}>Code</th>
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
                  <th>Time</th>
                  <th>Shop Name</th>
                  <th>Time</th>
                  <th>Shop Name</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <TableBodyLoading columnCount={13} />
                ) : AddedAttendance.length > 0 ? (
                  AddedAttendance.map((record, index) => (
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
                                  ? new Date(
                                      editData.punchIn
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
                            new Date(record.punchIn).toLocaleTimeString(
                              "en-IN",
                              {
                                timeZone: "Asia/Kolkata",
                              }
                            )
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
                            </select>
                          </td>
                        ) : (
                          <td>
                            <span
                              className={
                                "status-badge " +
                                record.status.toLowerCase() +
                                "-badge"
                              }
                            >
                              {record.status}
                            </span>
                          </td>
                        )}
                        <td>{record.hoursWorked || "N/A"}</td>
                        <td className="expand-btn">
                          {isAbsent(record) ? (
                            <button disabled className="disabled-expand">
                              No Data Available
                            </button>
                          ) : (
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
                          )}
                        </td>
                        <td className="action-buttons">
                          {isAbsent(record) ? (
                            <div className="absent-notice">
                              <span title="Cannot edit absent record">
                                Not Editable
                              </span>
                            </div>
                          ) : (
                            <>
                              {editID === record._id ? (
                                <>
                                  <button
                                    className="action-btn save"
                                    onClick={() => {
                                      handleSave();
                                      setEditId(null);
                                    }}
                                    title="Save changes"
                                  >
                                    <FaSave />
                                    <span>Save</span>
                                  </button>
                                  <button
                                    className="action-btn cancel"
                                    onClick={() => setEditId(null)}
                                    title="Cancel editing"
                                  >
                                    <FaTimes />
                                    <span>Cancel</span>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    className="action-btn edit"
                                    onClick={() => handleEdit(record)}
                                    title="Edit record"
                                  >
                                    <FaEdit />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    className="action-btn delete"
                                    onClick={() => setDeleteId(record._id)}
                                    title="Delete record"
                                  >
                                    <RiDeleteBin6Line />
                                    <span>Delete</span>
                                  </button>
                                </>
                              )}
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
        ) : (
          <div className="latestAttendance-table-container">
            <table>
              <thead>
                <tr className="main-header">
                  <th rowSpan={2}>SNo.</th>
                  <th rowSpan={2}>Code</th>
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
                  <th>Time</th>
                  <th>Shop Name</th>
                  <th>Time</th>
                  <th>Shop Name</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <TableBodyLoading columnCount={13} />
                ) : attendance.length > 0 ? (
                  attendance.map((record, index) => (
                    <React.Fragment key={record._id || index}>
                      <tr
                        className={`${record.status
                          ?.toLowerCase()
                          .replace(/\s/g, "-")}-row`}
                      >
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
                                  ? new Date(
                                      editData.punchIn
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
                            new Date(record.punchIn).toLocaleTimeString(
                              "en-IN",
                              {
                                timeZone: "Asia/Kolkata",
                              }
                            )
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
                            </select>
                          </td>
                        ) : (
                          <td>
                            <span
                              className={
                                "status-badge " +
                                record.status.toLowerCase() +
                                "-badge"
                              }
                            >
                              {record.status}
                            </span>
                          </td>
                        )}
                        <td>{record.hoursWorked || "N/A"}</td>
                        <td className="expand-btn">
                          {isAbsent(record) ? (
                            <button disabled className="disabled-expand">
                              No Data Available
                            </button>
                          ) : (
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
                          )}
                        </td>
                        <td className="action-buttons">
                          {isAbsent(record) ? (
                            <div className="absent-notice">
                              <span title="Cannot edit absent record">
                                Not Editable
                              </span>
                            </div>
                          ) : (
                            <>
                              {editID === record._id ? (
                                <>
                                  <button
                                    className="action-btn save"
                                    onClick={() => {
                                      handleSave();
                                      setEditId(null);
                                    }}
                                    title="Save changes"
                                  >
                                    <FaSave />
                                    <span>Save</span>
                                  </button>
                                  <button
                                    className="action-btn cancel"
                                    onClick={() => setEditId(null)}
                                    title="Cancel editing"
                                  >
                                    <FaTimes />
                                    <span>Cancel</span>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    className="action-btn view"
                                    onClick={() =>
                                      navigate(`/attendance/${record.code}`)
                                    }
                                    title="View full record"
                                  >
                                    <FaEye />
                                    <span>View</span>
                                  </button>
                                  <button
                                    className="action-btn edit"
                                    onClick={() => handleEdit(record)}
                                    title="Edit record"
                                  >
                                    <FaEdit />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    className="action-btn delete"
                                    onClick={() => setDeleteId(record._id)}
                                    title="Delete record"
                                  >
                                    <RiDeleteBin6Line />
                                    <span>Delete</span>
                                  </button>
                                </>
                              )}
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
        )}
      </div>

      {!showAddAttendanceTable && (
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
      )}

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