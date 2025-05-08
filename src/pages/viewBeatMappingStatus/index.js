import React, { useState, useEffect } from "react";
import { FaDownload, FaFileUpload } from "react-icons/fa";
import config from "../../config.js";
import axios from "axios";
import "./style.scss"; // Import SCSS file for styling
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { GiPathDistance } from "react-icons/gi";
import CustomAlert from "../../components/CustomAlert/index.js";
import SecurityKeyPopup from "./SecurityKeyPopup/index.js";

const backendUrl = config.backend_url;

const ViewBeatMappingStatus = () => {
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [data, setData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [alert, setAlert] = useState({ show: false, type: "", message: "" });
  const [showSecurityKeyPopup, setShowSecurityKeyPopup] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [expandedRowData, setExpandedRowData] = useState([]);
  const [expandedSearch, setExpandedSearch] = useState("");

  const [startDay, setStartDay] = useState(() => {
    const date = new Date();
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(date.setDate(diff));
    return monday;
  });

  const [endDay, setEndDay] = useState(() => {
    const date = new Date();
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? 0 : 7); // adjust when day is sunday
    const sunday = new Date(date.setDate(diff));
    return sunday;
  });

  const getbeatmapping = async () => {
    if (!startDay || !endDay) {
      console.warn("Start and End dates are required.");
      return;
    }

    try {
      const res = await axios.get(
        `${backendUrl}/get-weekly-beat-mapping-schedule-for-admin`,
        {
          params: {
            startDate: startDay.toISOString().split("T")[0],
            endDate: endDay.toISOString().split("T")[0],
            search,
            status,
            page: currentPage,
            limit: 15,
          },
        }
      );
      setData(res.data.data);
      setTotalRecords(res.data.total);
    } catch (err) {
      setData([]);
      console.log(err);
    }
  };

  //add daily beat mapping
  const addDailyBeatMapping = async () => {
    try {
      const res = await axios.put(`${backendUrl}/add-daily-beat-mapping`);
      setAlert({
        show: true,
        type: "success",
        message: res.data.message || "Daily Beat Mapping Added Successfully",
      });
      setSuccess(res.data.message || "Daily Beat Mapping Added Successfully");
    } catch (err) {
      setErrorMessage(
        err.response.data.message || "Failed to Add Daily Beat Mapping"
      );
    }
  };

  useEffect(() => {
    if (expandedRow) {
      setExpandedRow(null);
    }
    const shouldFetch = startDay && endDay;
    if (shouldFetch) {
      getbeatmapping();
    }
  }, [currentPage, search, status, startDay, endDay]);

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

  const handleExpandedSearch = (e) => {
    setExpandedSearch(e.target.value);
  };

  const getFilteredSchedule = (schedule) => {
    if (!expandedSearch) return schedule;
    const searchTerm = expandedSearch.toLowerCase();
    return schedule.filter(
      (item) =>
        item.code.toLowerCase().includes(searchTerm) ||
        item.name.toLowerCase().includes(searchTerm) ||
        item.district.toLowerCase().includes(searchTerm) ||
        item.taluka.toLowerCase().includes(searchTerm) ||
        item.zone.toLowerCase().includes(searchTerm) ||
        item.position.toLowerCase().includes(searchTerm)
    );
  };

  return (
    <div className="viewBeatMappingStatus-page">
      {alert.show && (
        <CustomAlert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ show: false, type: "", message: "" })}
        />
      )}
      <div className="viewBeatMappingStatus-page-header">
        View Beat Mapping Status
      </div>

      {data.length > 0 && (
        <div className="viewBeatMapping-page-graph">
          <div className="viewBeatMappingStatus-calendar-header">
            <h2>
              {startDay.toDateString()} - {endDay.toDateString()}
            </h2>
          </div>
          {/* Graph */}
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} barCategoryGap="20%">
              <XAxis dataKey="code" fontSize={13} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="done" fill="#4CAF50" name="Done" />
              <Bar dataKey="pending" fill="#FFC107" name="Pending" />
              <Bar dataKey="total" fill="#2196F3" name="Total" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="viewBeatMappingStatus-page-container">
        {/* Filter Section */}
        <div className="viewBeatMapping-first-line">
          <div className="filters-container">
            <div className="viewBeatMappingStatus-filter">
              <input
                type="text"
                placeholder="Search Employee Code"
                name="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="viewBeatMappingStatus-date-filter">
                <div className="date">
                  <label>From:</label>
                  <input
                    type="date"
                    name="startDay"
                    value={startDay ? startDay.toISOString().split("T")[0] : ""}
                    onChange={(e) => setStartDay(new Date(e.target.value))}
                  />
                </div>
                <div className="date">
                  <label>To:</label>
                  <input
                    type="date"
                    name="endDay"
                    value={endDay ? endDay.toISOString().split("T")[0] : ""}
                    onChange={(e) => setEndDay(new Date(e.target.value))}
                  />
                </div>
              </div>
            </div>
            <div className="viewBeatMapping-status-filter">
              <div className="viewBeatMapping-status-filter-item">
                <label>Status</label>
                <select
                  name="status"
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">All</option>
                  <option value="done">Done</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
          </div>

          {/* Buttons Section */}
          <div className="buttons-container">
            <div
              className="viewBeatMappingStatus-upload-btn"
              onClick={addDailyBeatMapping}
            >
              <label htmlFor="file-upload" className="browse-btn">
                <FaFileUpload />
                Add Daily Beat Mapping
              </label>
            </div>
            <div className="viewBeatMappingStatus-download-btn">
              <div
                className="browse-btn"
                // onClick={downloadCSV}
              >
                <FaDownload />
                Download CSV
              </div>
            </div>
            {localStorage.getItem("role") === "super_admin" && (
              <div className="edit-security-key">
                <button
                  className="edit-security-key-btn"
                  onClick={() => setShowSecurityKeyPopup(true)}
                >
                  Edit Security Key
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Table Section */}
        <div className="viewBeatMapping-table-container">
          <table>
            <thead>
              <tr>
                <th>S.NO</th>
                <th>Employee Code</th>
                <th>Employee Name</th>
                <th>Route</th>
                <th>Total</th>
                <th>Pending</th>
                <th>Done</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>View</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: "center" }}>
                    No data available
                  </td>
                </tr>
              ) : (
                data.map((item, index) => {
                  const isExpanded = expandedRow === index;
                  return [
                    <tr key={item._id || `row-${index}`}>
                      <td>{(currentPage - 1) * 15 + index + 1}</td>
                      <td>{item.code}</td>
                      <td>{item.name}</td>
                      <td>{item.routeName || "N/A"}</td>
                      <td style={{ color: "#6666f2" }}>{item.total}</td>
                      <td style={{ color: "#f0b862" }}>{item.pending}</td>
                      <td style={{ color: "#00c853" }}>{item.done}</td>
                      <td>{item.startDate.split("T")[0]}</td>
                      <td>{item.endDate.split("T")[0]}</td>
                      <td
                        style={{
                          color:
                            item.routeStatus === "active" ? "green" : "red",
                        }}
                      >
                        {item.routeStatus || "N/A"}
                      </td>
                      <td>
                        <div
                          className="expand-btn"
                          onClick={() => {
                            setExpandedRow(isExpanded ? null : index);
                            setExpandedRowData(item.schedule || []);
                            setExpandedSearch("");
                          }}
                        >
                          Expand
                        </div>
                      </td>
                    </tr>,
                    isExpanded && (
                      <tr
                        key={`expanded-${index}`}
                        className="expand-container-row"
                      >
                        <td colSpan="11" className="expand-container">
                          <div className="expand-container-filter">
                            <input
                              type="text"
                              placeholder="Search by code, name, district, taluka, zone or position"
                              value={expandedSearch}
                              onChange={handleExpandedSearch}
                            />
                          </div>
                          <div className="expand-container-body">
                            <div className="schedule-cards">
                              {getFilteredSchedule(expandedRowData).map(
                                (scheduleItem, sIndex) => {
                                  const isDone = scheduleItem.status === "done";
                                  const isPending =
                                    scheduleItem.status === "pending";
                                  return (
                                    <div
                                      key={
                                        scheduleItem._id || `schedule-${sIndex}`
                                      }
                                      className={`schedule-card ${
                                        isDone ? "done" : "pending"
                                      }`}
                                    >
                                      <div className="card-top-row">
                                        <span className="card-code">
                                          {scheduleItem.code}
                                        </span>
                                        {scheduleItem.visitCount > 0 && (
                                          <span className="visit-badge">
                                            {scheduleItem.visitCount}
                                          </span>
                                        )}
                                      </div>
                                      <div className="card-name">
                                        {scheduleItem.name}
                                      </div>
                                      <div className="card-tags">
                                        {scheduleItem.zone && (
                                          <span className="tag">
                                            {scheduleItem.zone}
                                          </span>
                                        )}
                                        {scheduleItem.district && (
                                          <span className="tag">
                                            {scheduleItem.district}
                                          </span>
                                        )}
                                        {scheduleItem.taluka && (
                                          <span className="tag">
                                            {scheduleItem.taluka}
                                          </span>
                                        )}
                                        {scheduleItem.position && (
                                          <span className="tag">
                                            {scheduleItem.position}
                                          </span>
                                        )}
                                      </div>
                                      <div className="card-bottom-row">
                                        {scheduleItem.distance ? (
                                          <span className="distance-icon">
                                            <GiPathDistance size={24} />
                                            {scheduleItem.distance.slice(
                                              0,
                                              4
                                            )}{" "}
                                            Km
                                          </span>
                                        ) : (
                                          <span className="distance-icon">
                                            <GiPathDistance size={24} />
                                            N/A
                                          </span>
                                        )}
                                        <div className="card-status-row">
                                          {isDone ? (
                                            <span className="status-pill done">
                                              Done
                                              <span className="checkmark">
                                                ✔
                                              </span>
                                            </span>
                                          ) : (
                                            <span className="status-pill pending">
                                              Pending
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ),
                  ];
                })
              )}
            </tbody>
          </table>
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

      {/* Error and Success Message */}
      {errorMessage && <div className="error-message">{errorMessage}</div>}
      {success && <div className="success-message">{success}</div>}

      {showSecurityKeyPopup && (
        <SecurityKeyPopup
          onClose={() => setShowSecurityKeyPopup(false)}
          onSuccess={(msg) => {
            setAlert({ show: true, type: "success", message: msg });
            setShowSecurityKeyPopup(false);
          }}
        />
      )}
    </div>
  );
};

export default ViewBeatMappingStatus;
