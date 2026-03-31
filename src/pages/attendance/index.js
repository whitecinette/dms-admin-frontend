import React, { useEffect, useState } from "react";
import axios from "axios";
import config from "../../config.js";
import { Link, useNavigate } from "react-router-dom";
import "./style.scss";

const backendUrl = config.backend_url;

const Attendance = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [counts, setCounts] = useState({});
  const [dateToFetch, setDateToFetch] = useState("");
  const [employee, setEmployee] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [latestAttendance, setLatestAttendance] = useState([]);
  const [firmList, setFirmList] = useState([]);
  const [firm, setFirm] = useState("");
  const [sliderValue, setSliderValue] = useState("All");
  const limit = 50;

  const getAllActorTypes = async () => {
    try {
      const res = await axios.get(
        `${backendUrl}/actorTypesHierarchy/get-all-by-admin`
      );
      setFirmList(res.data.data || []);
    } catch (error) {
      console.log(error);
    }
  };

  const getDateDaysAgo = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split("T")[0];
  };

  const fetchAttendance = async (attempt = 0) => {
    if (attempt > 3) {
      setError("No attendance records found for the last two days.");
      return;
    }

    const selectedDate = getDateDaysAgo(attempt);
    setDateToFetch(selectedDate);

    const apiUrl = `${backendUrl}/get-attendance-by-date/${selectedDate},`;

    try {
      const response = await axios.get(apiUrl, {
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });

      if (response?.data?.attendanceCount !== null) {
        setCounts(response.data.attendanceCount || {});
      } else {
        fetchAttendance(attempt + 1);
      }
    } catch (err) {
      console.error("Error fetching attendance:", err);
      fetchAttendance(attempt + 1);
    }
  };

  const getLatestAttendance = async () => {
    try {
      const res = await axios.get(`${backendUrl}/get-latest-attendance-by-date`, {
        params: {
          date: new Date(),
        },
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });
      setLatestAttendance(res?.data?.data || []);
    } catch (error) {
      console.log(error);
    }
  };

  const getAllEmployee = async () => {
    try {
      const res = await axios.get(`${backendUrl}/get-emp-for-hr`, {
        params: {
          page: currentPage,
          limit,
          search,
          firm,
          role: sliderValue === "All" ? ["employee", "admin"] : sliderValue,
        },
      });
      setEmployee(res?.data?.data || []);
      setTotalRecords(res?.data?.totalRecords || 0);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchAttendance();
    getAllEmployee();
    getAllActorTypes();
  }, [currentPage, search, firm, sliderValue]);

  useEffect(() => {
    getLatestAttendance();

    const interval = setInterval(() => {
      getLatestAttendance();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const presentCount = (counts?.present || 0) + (counts?.pending || 0);
  const absentCount = counts?.absent || 0;
  const leaveCount = counts?.leave || 0;
  const halfDayCount = counts?.halfDay || 0;

  const totalAttendance =
    presentCount + absentCount + leaveCount + halfDayCount;

  const safePercent = (value) =>
    totalAttendance > 0 ? ((value / totalAttendance) * 100).toFixed(1) : "0.0";

  const attendanceStats = [
    {
      key: "present",
      label: "Present",
      value: presentCount,
      percent: safePercent(presentCount),
      className: "present",
      helper: "On duty / punched in",
    },
    {
      key: "absent",
      label: "Absent",
      value: absentCount,
      percent: safePercent(absentCount),
      className: "absent",
      helper: "Not marked present",
    },
    {
      key: "leave",
      label: "Leave",
      value: leaveCount,
      percent: safePercent(leaveCount),
      className: "leave",
      helper: "Approved leave",
    },
    {
      key: "halfday",
      label: "Half Day",
      value: halfDayCount,
      percent: safePercent(halfDayCount),
      className: "halfday",
      helper: "Partial working day",
    },
  ];

  const highestStatValue = Math.max(...attendanceStats.map((item) => item.value), 1);

  const totalPages = Math.ceil(totalRecords / limit) || 1;

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

  return (
    <div className="attendance-page">
      <div className="page-title-row">
        <div>
          <h2 className="page-title">Attendance Dashboard</h2>
          <p className="page-subtitle">
            Clean overview of attendance, activity and employee records
          </p>
        </div>
      </div>

      <div className="attendance-page-container">
        <div className="attendance-page-firstLine">
          <div className="attendance-page-chart">
            <div className="attendance-summary-header">
              <div>
                <div className="attendance-page-chart-header">
                  Attendance Overview
                </div>
                <div className="attendance-page-chart-date">
                  Showing data for {dateToFetch || "latest available day"}
                </div>
              </div>

              <div className="attendance-total-pill">
                Total Employees: {totalAttendance}
              </div>
            </div>

            {error ? (
              <div className="no-data-box">{error}</div>
            ) : (
              <>
                <div className="attendance-stat-grid">
                  {attendanceStats.map((item) => (
                    <div
                      key={item.key}
                      className={`attendance-stat-card ${item.className}`}
                    >
                      <div className="stat-card-top">
                        <span className={`stat-dot ${item.className}`}></span>
                        <span className="stat-label">{item.label}</span>
                      </div>

                      <div className="stat-value">{item.value}</div>
                      <div className="stat-subtext">{item.percent}% of total</div>
                      <div className="stat-helper">{item.helper}</div>
                    </div>
                  ))}
                </div>

                <div className="attendance-composition-card">
                  <div className="section-title">Attendance Composition</div>

                  <div className="attendance-stacked-bar">
                    {attendanceStats.map((item) => (
                      <div
                        key={item.key}
                        className={`stack-segment ${item.className}`}
                        style={{ width: `${item.percent}%` }}
                        title={`${item.label}: ${item.value}`}
                      />
                    ))}
                  </div>

                  <div className="attendance-legend">
                    {attendanceStats.map((item) => (
                      <div key={item.key} className="legend-item">
                        <span className={`legend-dot ${item.className}`}></span>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="attendance-bar-list">
                  <div className="section-title">Status Comparison</div>

                  {attendanceStats.map((item) => {
                    const relativeWidth =
                      highestStatValue > 0
                        ? (item.value / highestStatValue) * 100
                        : 0;

                    return (
                      <div key={item.key} className="bar-row">
                        <div className="bar-row-top">
                          <span>{item.label}</span>
                          <strong>
                            {item.value} <small>({item.percent}%)</small>
                          </strong>
                        </div>
                        <div className="bar-track">
                          <div
                            className={`bar-fill ${item.className}`}
                            style={{ width: `${relativeWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="attendance-recent-activities">
            <div className="recent-activities-header-row">
              <div>
                <div className="recent-activities-header">Recent Activities</div>
                <div className="recent-activities-subtitle">
                  Latest attendance movement
                </div>
              </div>

              <Link to="/attendance/allAttendance" className="show-more-link">
                Show more
              </Link>
            </div>

            <div className="recent-activities-first-line">
              <div className="recent-activity-date">
                {new Date().toLocaleDateString()}
              </div>
              <div className="recent-activity-count">
                {latestAttendance?.length || 0} records
              </div>
            </div>

            <div className="recent-activities-content">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {latestAttendance.length > 0 ? (
                    latestAttendance
                      .flat()
                      .slice(0, 6)
                      .map((record, index) => (
                        <tr key={record._id || index}>
                          <td>{record.name || "N/A"}</td>
                          <td>
                            {record.punchIn
                              ? new Date(record.punchIn).toLocaleTimeString()
                              : "N/A"}
                          </td>
                          <td>
                            <span
                              className={`status-badge ${String(
                                record.status || ""
                              )
                                .toLowerCase()
                                .replace(/\s+/g, "")}`}
                            >
                              {record.status || "Unknown"}
                            </span>
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan="3" style={{ textAlign: "center" }}>
                        No recent activities
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="attendance-table-container">
          <div className="attendance-table-topbar">
            <div className="table-title-wrap">
              <div className="table-main-title">Employee Directory</div>
              <div className="table-subtitle">
                Browse employee attendance details
              </div>
            </div>

            <div className="slider-container">
              <div
                className={`slider-button ${sliderValue === "All" ? "active" : ""}`}
                onClick={() => {
                  setCurrentPage(1);
                  setSliderValue("All");
                }}
              >
                All
              </div>
              <div
                className={`slider-button ${
                  sliderValue === "employee" ? "active" : ""
                }`}
                onClick={() => {
                  setCurrentPage(1);
                  setSliderValue("employee");
                }}
              >
                Employee
              </div>
              <div
                className={`slider-button ${
                  sliderValue === "admin" ? "active" : ""
                }`}
                onClick={() => {
                  setCurrentPage(1);
                  setSliderValue("admin");
                }}
              >
                Admin
              </div>
            </div>
          </div>

          <div className="attendance-table-filter">
            <div className="search-filter">
              <input
                name="search"
                value={search}
                onChange={(e) => {
                  setCurrentPage(1);
                  setSearch(e.target.value);
                }}
                placeholder="Search employee..."
              />
            </div>

            <div className="firm-filter">
              <label>Firm:</label>
              <select
                value={firm || ""}
                onChange={(e) => {
                  setCurrentPage(1);
                  setFirm(e.target.value);
                }}
              >
                <option value="">Select Firm</option>
                {firmList.length > 0 &&
                  firmList.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>SNo.</th>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Position</th>
                  <th>View</th>
                </tr>
              </thead>
              <tbody>
                {employee.length > 0 ? (
                  employee.map((item, index) => (
                    <tr key={item._id || index}>
                      <td>{(currentPage - 1) * limit + index + 1}</td>
                      <td>{item.code}</td>
                      <td>{item.name}</td>
                      <td>
                        <span className="position-pill">{item.position}</span>
                      </td>
                      <td className="view-button">
                        <button
                          onClick={() => navigate(`/attendance/${item.code}`)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center" }}>
                      No data found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
};

export default Attendance;