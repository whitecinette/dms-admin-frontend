import React, { useEffect, useState } from "react";
import axios from "axios";
import config from "../../config.js";
import DonutChart from "../../components/DonutChart";
import { useNavigate } from "react-router-dom";
import "./style.scss";

const backendUrl = config.backend_url;

const Attendance = () => {
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState([]);
  const [error, setError] = useState("");
  const [counts, setCounts] = useState([]);
  const [dateToFetch, setDateToFetch] = useState("");
  const [employee, setEmployee] = useState([]); // ✅ Changed from "" to []
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 50;

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
        setAttendance(response.data.attendance);
        setCounts(response.data.counts);
      } else {
        fetchAttendance(attempt + 1);
      }
    } catch (err) {
      console.error("Error fetching attendance:", err);
      fetchAttendance(attempt + 1);
    }
  };

  // Fetch employee data
  const getAllEmployee = async () => {
    try {
      const res = await axios.get(`${backendUrl}/get-emp-for-hr`, {
        params: {
          // ✅ Fixed `param` -> `params`
          page: currentPage,
          limit,
          search,
        },
      });
      setEmployee(res.data.data || []); // ✅ Ensure it's always an array
      setTotalRecords(res.data.totalRecords)
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchAttendance();
    getAllEmployee();
  }, [currentPage, search]);

  useEffect(() => {
    console.log(employee);
  }, [employee]);

  //   const chartData = [
  //     { name: "Present", value: counts.present, color: "#28a745" },
  //     { name: "Absent", value: counts.absent, color: "#dc3545" },
  //     { name: "Leave", value: counts.leave, color: "#ffc107" },
  //     { name: "Half Day", value: counts.halfDay, color: "#17a2b8" }
  //   ];
  const chartData = [
    { name: "Present", value: 100, color: "#28a745" },
    { name: "Absent", value: 40, color: "#dc3545" },
    { name: "Leave", value: 3, color: "#ffc107" },
    { name: "Half Day", value: 5, color: "#17a2b8" },
  ];

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
      <div className="attendance-header">Attendance</div>
      <div className="attendance-page-container">
        <div className="attendance-page-firstLine">
          <div className="attendance-page-chart">
            <div className="attendance-page-chart-header">
              Attendance Overview
            </div>
            <div className="attendance-page-chart-date">{dateToFetch}</div>
            <div className="attendance-page-donutChart">
              <DonutChart data={chartData} />
            </div>
          </div>
        </div>
        <div className="attendance-table-container">
          <div className="attendance-table-filter">
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
