import React, { useEffect, useState } from "react";
import axios from "axios";
import config from "../../config.js";
import DonutChart from "../../components/DonutChart";
import { Link, useNavigate } from "react-router-dom";
import "./style.scss";

const backendUrl = config.backend_url;

const Attendance = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [counts, setCounts] = useState([]);
  const [dateToFetch, setDateToFetch] = useState("");
  const [employee, setEmployee] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [latestAttendance, setLatestAttendance] = useState({});
  const [firmList, setFirmList] = useState([]);
  const [firm, setFirm] = useState({});
  const limit = 50;

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

  const getDateDaysAgo = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split("T")[0];
  };

  // Fetch attendance data
  const fetchAttendance = async (attempt = 1) => {
    if (attempt > 2) {
      setError("No attendance records found for the last two days.");
      return;
    }

    const selectedDate = getDateDaysAgo(attempt);
    setDateToFetch(selectedDate);
    const apiUrl = `${backendUrl}/get-attendance-by-date/${selectedDate}`;

    try {
      const response = await axios.get(apiUrl);

      if (response.data.attendance?.length > 0) {
        setCounts(response.data.counts);
      } else {
        fetchAttendance(attempt + 1);
      }
    } catch (err) {
      console.error("Error fetching attendance:", err);
      fetchAttendance(attempt + 1);
    }
  };

  // fetch latest attendance
  const getLatestAttendance = async () => {
    try {
      const res = await axios.get(
        `${backendUrl}/get-latest-attendance-by-date`,
        {
          params: {
            date: new Date(),
          },
        }
      );
      setLatestAttendance(res.data.data);
    } catch (error) {
      console.log(error);
    }
  };

  // Fetch employee data
  const getAllEmployee = async () => {
    try {
      const res = await axios.get(`${backendUrl}/get-emp-for-hr`, {
        params: {
          page: currentPage,
          limit,
          search,
          firm,
        },
      });
      setEmployee(res.data.data || []);
      setTotalRecords(res.data.totalRecords);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchAttendance();
    getAllEmployee();
    getAllActorTypes();
  }, [currentPage, search, firm]);

  useEffect(() => {
    getLatestAttendance();
    setInterval(() => {
      getLatestAttendance();
    }, 60000);
  }, []);


  const chartData = [
    { name: "Present", value: counts.present, color: "#28a745" },
    { name: "Absent", value: counts.absent, color: "#dc3545" },
    { name: "Leave", value: counts.leave, color: "#ffc107" },
    { name: "Half Day", value: counts.halfDay, color: "#17a2b8" },
  ];
  // const chartData = [
  //    { name: "Present", value: 100, color: "#28a745" },
  //    { name: "Absent", value: 40, color: "#dc3545" },
  //    { name: "Leave", value: 3, color: "#ffc107" },
  //    { name: "Half Day", value: 5, color: "#17a2b8" },
  // ];

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
  return (
    <div className="attendance-page">
      {/* <div className="attendance-header">Attendance</div> */}
      <div className="attendance-page-container">
        <div className="attendance-page-firstLine">
          {/* Chart Section */}
          <div className="attendance-page-chart">
            <div className="attendance-page-chart-header">
              Attendance Overview
            </div>

            {counts &&
            (counts.present ||
              counts.absent ||
              counts.leave ||
              counts.halfDay) ? (
              <>
                <div className="attendance-page-chart-date">{dateToFetch}</div>
                <div className="attendance-page-donutChart">
                  <DonutChart data={chartData} />
                </div>
              </>
            ) : (
              <div>No Previous Data</div>
            )}
          </div>

          {/* Recent Activities Section */}
          <div className="attendance-recent-activities">
            <div className="recent-activities-header">Recent Activities</div>
            <div className="recent-activities-first-line">
              <div className="recent-activity-date">
                {new Date().toLocaleDateString()}
              </div>
              <div className="recent-activity-show-more">
                <Link to={"/attendance/todaysAttendance"}>Show more</Link>
              </div>
            </div>
            <div className="recent-activities-content">
              <table>
                <thead>
                  <tr>
                    <th>Employee Code</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(latestAttendance).length > 0 ? (
                    Object.entries(latestAttendance).map(
                      ([category, records]) =>
                        records.slice(0, 4).map((record, index) => (
                          <tr key={record._id || index}>
                            <td>{record.code}</td>
                            <td>
                              {record.punchIn
                                ? new Date(record.punchIn).toLocaleTimeString()
                                : "N/A"}
                            </td>
                            <td>{record.status}</td>
                            {/* Show the category (Present, Absent, etc.) */}
                          </tr>
                        ))
                    )
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
                value={firm || ""} // Ensure it's a string
                onChange={(e) => {
                  setCurrentPage(1);
                  setFirm(e.target.value); // Store firm ID as a string
                }}
              >
                <option value="">Select Firm</option>
                {firmList.length > 0 &&
                  firmList.map((item, index) => (
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
                  employee.map(
                    (
                      item,
                      index // ✅ Fixed incorrect map usage
                    ) => (
                      <tr key={index}>
                        <td>{(currentPage - 1) * limit + index + 1}</td>
                        <td>{item.code}</td>
                        <td>{item.name}</td>
                        <td>{item.position}</td>
                        <td className="view-button">
                          <button
                            onClick={() => navigate(`/attendance/${item.code}`)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    )
                  )
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
    </div>
  );
};

export default Attendance;
