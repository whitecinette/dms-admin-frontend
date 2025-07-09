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
import { Link, Navigate, useNavigate } from "react-router-dom";
import CustomAlert from "../../components/CustomAlert";
import AttendanceCards from "../../layout/AttendanceCard.js";
 import TableBodyLoading from "../../components/tableLoading";
// the flow things instead of firms is created by nameera but it is used to fetches the firms and have to be changed
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
  const [attendanceByFirms, setAttendanceByFirms] = useState([]);
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  // nameera
  const [flow, setFlowList] = useState([]);
  const [selectedFlows, setSelectedFlows] = useState([]);
  const [firmsDropdownOpen, setFirmsDropdownOpen] = useState(false);
  const [firmsDropdownSearch, setFirmsDropdownSearch] = useState("");
  // nameera
  const [dropdownSearch, setDropdownSearch] = useState("");
  const [dropdownStyles, setDropdownStyles] = useState({ top: 30 });
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
  const dropdownRef = useRef(null);
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

  // Get Attendance added by admin
  const getAddedAttendance = async () => {
    const [month, year] = selectedMonthYear.split("-");
    setIsLoading(true); // Set loading to true before making the API call

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
      // console.log("API Response (getAddedAttendance):", res.data.data); // Debugging
      setAddedAttendance(res.data.data);
      setIsLoading(false); // Set loading to false after data is loaded
    } catch (error) {
      setAddedAttendance([]);
      setShowAddAttendanceTable(false);
      console.error("Error fetching added attendance:", error);
      setIsLoading(false); // Set loading to false if there's an error
    }
  };

  // Get all actor types
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
  // nameeraaa
  const getFirms = async () => {
    try {
      const res = await axios.get(`${backendUrl}/get-all-firms`);
      setFlowList(res.data.data);
      console.log("response data", res.data.data);
    } catch (error) {
      console.log("error fetching firms");
    }
  };
  // nameeraaa

  // Get attendance count
  // const getAttendanceCount = async () => {
  //   let newDate = "";
  //   if (!date) {
  //     const date = new Date();
  //     newDate = date.toISOString().split("T")[0];
  //   } else {
  //     newDate = new Date(date).toISOString().split("T")[0];
  //   }
  //   try {
  //     const response = await axios.get(
  //       `${backendUrl}/get-attendance-by-date/${newDate}`,
  //       {
  //         params: {
  //           firms,
  //           tag,
  //         },
  //         headers: {
  //           Authorization: localStorage.getItem("authToken"),
  //         },
  //       }
  //     );
  //     setCount(response.data.attendanceCount);
  //   } catch (err) {
  //     console.error("Error fetching attendance count:", err);
  //   }
  // };
  // new api nameera

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

  // Get attendance
  // const getAttendance = async () => {
  //   try {
  //     const [month, year] = selectedMonthYear.split("-");
  //     const res = await axios.get(
  //       `${backendUrl}/get-latest-attendance-by-date`,
  //       {
  //         params: {
  //           date,
  //           page: currentPage,
  //           limit,
  //           search,
  //           status,
  //           firms,
  //           month,
  //           year,
  //           tag,
  //         },
  //         headers: {
  //           Authorization: localStorage.getItem("authToken"),
  //         },
  //       }
  //     );
  //     // console.log("API Response (getAttendance):", res.data.data); // Debugging
  //     setAttendance(res.data.data);
  //     console.log("get the data", res.data.data);
  //     setTotalpages(res.data.totalPages);
  //   } catch (error) {
  //     console.log("Error fetching attendance:", error);
  //   }
  // };
  // Nameera

  const getAttendance = async () => {
    try {
      const [month, year] = selectedMonthYear.split("-");
      setIsLoading(true);
      // const firmCodes = selectedFlows.length > 0 ? selectedFlows.join(",") : "";
      const firmCodes = selectedFlows || ""; // 👈 selected firm from card
      console.log("firm codes", firmCodes);

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
            firmCodes, // Always include firmCodes
            month,
            year,
            tag,
          },
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );
      // console.log("API Response (getAttendance):", res.data.data); // Debugging
      setAttendance(res.data.data);
      console.log("get the data", res.data.data);
      setTotalpages(res.data.totalPages);
      setIsLoading(false); // Set loading to false after data is loaded
    } catch (error) {
      console.log("Error fetching attendance:", error);
      setIsLoading(false); // Set loading to false if there's an error
    }
  };
  // const getAttendanceByFirms = async () => {
  //  try {
  //    // Ensure selectedFlows is defined and not empty
  //    if (!selectedFlows || selectedFlows.length === 0) {
  //      console.log("No firms selected, skipping API call.");
  //      setAttendance([]);
  //      setTotalpages(0);
  //      return;
  //    }

  //    const [month, year] = selectedMonthYear.split("-");
  //    const firmCodes = Array.isArray(selectedFlows) ? selectedFlows.join(",") : selectedFlows;

  //    // Validate firmCodes
  //    if (!firmCodes || firmCodes.trim() === "") {
  //      console.log("Invalid firmCodes, skipping API call.");
  //      setAttendance([]);
  //      setTotalpages(0);
  //      return;
  //    }

  //    const res = await axios.get(
  //      `${backendUrl}/get-attendance-by-firms`,
  //      {
  //        params: {
  //          firmCodes, // Send firmCodes as a comma-separated string
  //          date,
  //          month,
  //          year,
  //          status,
  //          search,
  //          page: currentPage,
  //          limit,
  //        },
  //        headers: {
  //          Authorization: localStorage.getItem("authToken"),
  //        },
  //      }
  //    );

  //    console.log("API Response (getAttendanceByFirms):", res.data);
  //    setAttendance(res.data.data);
  //    setTotalpages(res.data.totalPages);
  //  } catch (error) {
  //    console.error("Error fetching attendance by firms:", error);
  //    if (error.response) {
  //      console.error("Server response:", error.response.data);
  //      // Optionally display error to user
  //      alert(`Error: ${error.response.data.message || "Failed to fetch attendance data"}`);
  //    }
  //    setAttendance([]);
  //    setTotalpages(0);
  //  }
  // };

  // Fetch address from coordinates
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

  // Handle download
  // const handleDownload = async () => {
  //   const [month, year] = selectedMonthYear.split("-");
  //   try {
  //     const response = await axios.get(
  //       `${backendUrl}/download-all-attendance/`,
  //       {
  //         params: {
  //           date,
  //           search,
  //           status,
  //           firms,
  //           month,
  //           year,
  //           tag,
  //         },
  //         responseType: "blob",
  //         headers: {
  //           Authorization: localStorage.getItem("authToken"),
  //         },
  //       }
  //     );

  //     const url = window.URL.createObjectURL(new Blob([response.data]));
  //     const a = document.createElement("a");
  //     a.href = url;
  //     a.download = "all_attendance_data.csv";
  //     document.body.appendChild(a);
  //     a.click();
  //     document.body.removeChild(a);
  //     window.URL.revokeObjectURL(url);
  //     showAlert("Attendance data downloaded successfully!", "success");
  //   } catch (error) {
  //     console.error("Download failed:", error);
  //     showAlert("Error downloading the file. Please try again.", "error");
  //   }
  // };

  // nameera
  const handleDownload = async () => {
    const [month, year] = selectedMonthYear.split("-");
    console.log("selectedFlows", selectedFlows);
    const firmCodes = selectedFlows || "";

    try {
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
    }
  };


  // Delete employee attendance by id
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

  // Handle save
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

  // Handle edit
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

  // Handle dropdown click
  const handleDropdownClick = (event) => {
    setDropdownOpen(!dropdownOpen);
  };
  // nameera
  const handleDropdownClickForFirms = (event) => {
    setFirmsDropdownOpen(!firmsDropdownOpen);
  };
  // Handle firm selection
  const handleFirmSelect = (firm) => {
    if (firms.includes(firm._id)) {
      setFirms(firms.filter((id) => id !== firm._id));
    } else {
      setFirms([...firms, firm._id]);
    }
    setCurrentPage(1);
  };

  // Clear firms
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
  // nameeraaa
  // const handleFlowSelect = (flow) => {
  //   if (selectedFlows.includes(flow.code)) {
  //     setSelectedFlows(selectedFlows.filter((code) => code !== flow.code));
  //   } else {
  //     setSelectedFlows([...selectedFlows, flow.code]);
  //   }
  // };

  // const handleClearFlows = () => {
  //   setSelectedFlows([]);
  //   setCurrentPage(1);
  // };
  // const handleApplyFlows = () => {
  //   setFirmsDropdownOpen(false);
  //   setFirmsDropdownSearch("");
  //   getAttendanceCount();
  //   // getAttendanceByFirms();
  //   getAttendance();
  // };
  // yha tk nameera
  // Handle expand
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

  // Handle add attendance
  const handleAddAttendance = async () => {
    console.log("enterrringgggg");
    if (!newAttendance.code || !newAttendance.remark) {
      showAlert("Please fill in Code and Remark fields", "error");
      return;
    }

    console.log("enterrringgggg222");

    try {
      console.log("enterrringgggg333");
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
          console.log("yes...");

          try {
            console.log("enterrringgggg");
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

  // Check if record is absent
  const isAbsent = (record) => {
    if (!record || !record.status) {
      // console.warn("Invalid record or status:", record);
      return false;
    }
    // console.log("Record Status:", record.status); // Debugging
    const status = record.status.trim().toLowerCase();
    return status === "absent" || status === "leave";
  };
  // Effect to fetch data
  useEffect(() => {
    getAllActorTypes();
    getAddedAttendance();
    getAttendance();
    getAttendanceCount();
    getFirms();
  }, [currentPage, search, date, status, selectedMonthYear, tag, selectedFlows]);

  // Show alert
  const showAlert = (message, type = "info") => {
    setAlert({ show: true, message, type });
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    alertTimeoutRef.current = setTimeout(() => {
      setAlert({ show: false, message: "", type: "info" });
    }, 3000);
  };

  // Cleanup alert timeout
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
          {/* <Link to="/attendance">Attendance</Link> */}
          <span>Attendance</span>
        </div>
        <button
          className="add-attendance-button"
          onClick={() => setShowAddAttendance(true)}
        >
          Add Attendance
        </button>
      </div>
      {/* <div className="latestAttendance-page-counter-container">
        <div className="latestAttendance-page-counter-container-header">
          {date ? (
            <>{new Date(date).toISOString().split("T")[0]} Attendance</>
          ) : (
            <>Todays Attendance</>
          )}
        </div>
        <div className="latestAttendance-page-counter">
          <div className="latestAttendance-page-total-count counts">
            <span className="latestAttendance-page-counter-header">
              Total Employee:
            </span>
            <span>{count.total || 0}</span>
          </div>
          <div className="latestAttendance-page-present-count counts">
            <span className="latestAttendance-page-counter-header">
              Total Present:
            </span>
            <span>{(count.present || 0) + (count.pending || 0)}</span>
          </div>
          <div className="latestAttendance-page-absent-count counts">
            <span className="latestAttendance-page-counter-header">
              Total Absent:
            </span>
            <span>{count.absent || 0}</span>
          </div>
          <div className="latestAttendance-page-half-day-count counts">
            <span className="latestAttendance-page-counter-header">
              Total Half-Day:
            </span>
            <span>{count.halfDay || 0}</span>
          </div>
          <div className="latestAttendance-page-leave-count counts">
            <span className="latestAttendance-page-counter-header">
              Total Leave:
            </span>
            <span>{count.leave || 0}</span>
          </div>
        </div>
      </div> */}
      <div className="latestAttendance-page-counter-container">
        {/* <div className="latestAttendance-page-counter-container-header">
        {date ? (
          <>{new Date(date).toISOString().split('T')[0]} Attendance</>
        ) : (
          <>Today's Attendance</>
        )}
      </div> */}
       <div className="latestAttendance-page-counter">
  <AttendanceCards
    date={date}
    selectedFlows={selectedFlows}
    setSelectedFlows={setSelectedFlows}
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
                  // Update month dropdown when date changes
                  setSelectedMonthYear(`${newDate.getMonth() + 1}-${newDate.getFullYear()}`);
                }
              }}
            />
            <select
              value={selectedMonthYear}
              onChange={(e) => {
                setCurrentPage(1);
                const newMonthYear = e.target.value;
                setSelectedMonthYear(newMonthYear);

                // Update date if a date is already selected
                if (date) {
                  const [month, year] = newMonthYear.split("-");
                  const currentDate = new Date(date);
                  const newDate = new Date(
                    parseInt(year),
                    parseInt(month) - 1,
                    currentDate.getDate()
                  );

                  // Handle invalid dates (e.g., Feb 30)
                  if (newDate.getMonth() !== parseInt(month) - 1) {
                    // Set to last day of the month
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
                  <option value={""}>Select Tag</option>
                  <option value={"office"}>Office</option>
                </select>


                {/* flows dropdown */}
                <div className="custom-dropdown" ref={dropdownRef}>
                  <div
                    className="dropdown-header"
                    onClick={handleDropdownClick}
                  >
                    {firms.length > 0 ? (
                      <span>
                        {firms.length} firm{firms.length > 1 ? "s" : ""}{" "}
                        selected
                      </span>
                    ) : (
                      <span>Select Flows</span>
                    )}
                    {dropdownOpen ? <FaChevronUp /> : <FaChevronDown />}
                  </div>

                  {dropdownOpen && (
                    <div
                      className="dropdown-content"
                      style={{
                        position: "absolute",
                        top: dropdownStyles.top,
                        left: dropdownStyles.left,
                      }}
                    >
                      <div className="dropdown-search">
                        <input
                          type="text"
                          placeholder="Search flows..."
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
              Download All Attendance
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
                  <TableBodyLoading columnCount = {13}/>
                ) :AddedAttendance.length > 0 ? (
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
                          <td>{record.status}</td>
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
                        <TableBodyLoading columnCount = {13}/>
                    ) : attendance.length > 0 ? (
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
                          <td>{record.status}</td>
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
                                {/* nameera */}
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
