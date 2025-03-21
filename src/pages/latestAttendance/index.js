import axios from "axios";
import React, { useState, useEffect } from "react";
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

const backendUrl = config.backend_url;

export default function LatestAttendance() {
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
  const limit =50

  const getAttendance = async () => {
    try {
      console.log(date);
      const res = await axios.get(
        `${backendUrl}/get-latest-attendance-by-date`,
        {
          params: {
            date,
            page: currentPage,
            limit,
            search,
            status,
          },
        }
      );

      console.log(res);
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

  //handle save
  const handleSave = async () => {
    try {
      await axios.put(
        `${backendUrl}/edit-attendance/${editID}`,
        editData,
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );
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
  // Component to fix Leaflet rendering issues

  // // Fetch attendance when the component mounts
  // useEffect(() => {
  //   getAttendance();

  //   const interval = setInterval(() => {
  //     getAttendance();
  //     setCurrentPage(1);
  //   }, 60000); // ✅ Corrected setInterval syntax

  //   return () => clearInterval(interval); // ✅ Cleanup on unmount
  // }, []);

  useEffect(() => {
    getAttendance();
  }, [currentPage, search, date, status]);

  return (
    <div className="latestAttendance-page">
      <div className="latestAttendance-page-header">Attendance</div>
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
                const selectedDate = new Date(e.target.value); // Convert string to Date
                setdate(selectedDate.toLocaleDateString()); // Format date properly
              }}
            />
            <select
              value={status}
              onChange={(e) => {
                setCurrentPage(1); // Reset pagination on status change
                setStatus(e.target.value); // Update status state
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
                      <td>{(currentPage-1)*limit+index+1}</td>
                      <td>{record.code}</td>
                      <td>{record.name}</td>
                      <td>{new Date(record.date).toLocaleDateString()}</td>
                      <td>
                        {record.punchIn
                          ? new Date(record.punchIn).toLocaleTimeString(
                              "en-IN",
                              {
                                timeZone: "Asia/Kolkata",
                              }
                            )
                          : "N/A"}
                      </td>
                      <td>{record.punchInName || "N/A"}</td>
                      <td>
                        {record.punchOut
                          ? new Date(record.punchOut).toLocaleTimeString(
                              "en-IN",
                              {
                                timeZone: "Asia/Kolkata",
                              }
                            )
                          : "N/A"}
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
                          <FaEdit
                            color="#005bfe"
                            style={{ cursor: "pointer", marginRight: "10px" }}
                            onClick={() => handleEdit(record)}
                          />
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
                                    style={{
                                      width: "100%",
                                      height: "250px",
                                      border: "0",
                                      borderRadius: "10px",
                                    }}
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
    </div>
  );
}
