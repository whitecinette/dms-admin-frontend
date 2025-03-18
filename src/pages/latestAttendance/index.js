import axios from "axios";
import React, { useState, useEffect } from "react";
import "./style.scss";
import config from "../../config.js";
import { FaEdit, FaSave, FaTimes } from "react-icons/fa";

const backendUrl = config.backend_url;

export default function LatestAttendance() {
  const [attendance, setAttendance] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalpages] = useState(0);
  const [search, setSearch] = useState("");
  const [editID, setEditId] = useState("");
  const [editData, setEditData] = useState({});

  const getAttendance = async () => {
    try {
      const res = await axios.get(
        `${backendUrl}/get-latest-attendance-by-date`,
        {
          params: {
            date: new Date(),
            page: currentPage,
            limit: 10,
            search,
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
  //handle save
  const handleSave = async () => {
    try {
      const res = await axios.put(
        `${backendUrl}/edit-attendance/${editID}`,
        editData,
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );
      getAttendance()
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

  // Fetch attendance when the component mounts
  useEffect(() => {
    getAttendance();
    const interval = setInterval(getAttendance, 60000);

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  useEffect(() => {
    getAttendance();
  }, [currentPage, search]);

  return (
    <div className="latestAttendance-page">
      <div className="latestAttendance-page-header">Attendance</div>
      <div className="latestAttendance-page-container">
        <div className="latestAttendance-page-filters">
          <input
            value={search}
            onChange={(e) => {
              setCurrentPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search code"
          />
        </div>
        <div className="latestAttendance-table-container">
          <table>
            <thead>
              <tr className="main-header">
                <th colSpan={6}>Punch In</th>
                <th colSpan={6}>Punch Out</th>
              </tr>
              <tr>
                <th>SNo.</th>
                <th>code</th>
                <th>Image</th>
                <th>Date</th>
                <th>Time</th>
                <th>Shop Name</th>
                <th>Image</th>
                <th>Time</th>
                <th>Shop Name</th>
                <th>Status</th>
                <th>Hours Worked</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {Object.keys(attendance).length > 0 ? (
                Object.entries(attendance)
                  .filter(([category, records]) => records.length > 0) // Exclude empty categories
                  .map(([category, records]) => (
                    <React.Fragment key={category}>
                      <tr>
                        <td
                          colSpan="12"
                          style={{ fontWeight: "bold", textAlign: "center" }}
                        >
                          {category}
                        </td>
                      </tr>
                      {records.map((record, index) => (
                        <tr key={record._id || index}>
                          <td>{index + 1}</td>
                          <td>{record.code}</td>
                          <td>
                            {record.punchInImage ? (
                              <img src={record.punchInImage} alt="Punch Img" />
                            ) : (
                              "N/A"
                            )}
                          </td>
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
                          <td>{record.punchInName || "N/A "}</td>
                          <td>
                            {record.punchOutImage ? (
                              <img src={record.punchOutImage} alt="Punch Img" />
                            ) : (
                              "N/A"
                            )}
                          </td>
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
                          <td>{record.punchOutName || "N/A "}</td>
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
                          <td>
                            {editID === record._id ? (
                              <>
                                <FaSave
                                  color="green"
                                  style={{
                                    cursor: "pointer",
                                    marginRight: "10px",
                                  }}
                                  onClick={() => {
                                    handleSave();
                                    setEditId(null); // Exit edit mode
                                  }}
                                />
                                <FaTimes
                                  color="red"
                                  style={{ cursor: "pointer" }}
                                  onClick={() => {
                                    setEditId(null); // Exit edit mode without saving
                                  }}
                                />
                              </>
                            ) : (
                              <FaEdit
                                color="#005bfe"
                                style={{
                                  cursor: "pointer",
                                  marginRight: "10px",
                                }}
                                onClick={() => handleEdit(record)}
                              />
                            )}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
              ) : (
                <tr>
                  <td colSpan="12" style={{ textAlign: "center" }}>
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
