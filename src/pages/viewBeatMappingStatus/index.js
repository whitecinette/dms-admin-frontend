import React, { useState, useEffect } from "react";
import { FaDownload, FaFileUpload } from "react-icons/fa";
import config from "../../config.js";
import axios from "axios";
import "./style.scss";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Pie,
  PieChart,
  Cell,
} from "recharts";
import { GiPathDistance } from "react-icons/gi";
import CustomAlert from "../../components/CustomAlert/index.js";
import SecurityKeyPopup from "./SecurityKeyPopup/index.js";
import { useLocation, useNavigate } from "react-router-dom";
import EmployeeSchedule from "./employeeSchedule";

const backendUrl = config.backend_url;

const ViewBeatMappingStatus = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);

  // Initialize state from query parameters
  const initialSearch = queryParams.get("search") || "";
  const initialStartDate = queryParams.get("startDate")
    ? new Date(queryParams.get("startDate"))
    : (() => {
        const date = new Date();
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(date.setDate(diff));
      })();
  const initialEndDate = queryParams.get("endDate")
    ? new Date(queryParams.get("endDate"))
    : (() => {
        const date = new Date();
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? 0 : 7);
        return new Date(date.setDate(diff));
      })();
  const initialSelectedRoute = queryParams.get("route")
    ? [queryParams.get("route")]
    : [];

  // State declarations
  const [data, setData] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState(initialSearch);
  const [startDay, setStartDay] = useState(initialStartDate);
  const [endDay, setEndDay] = useState(initialEndDate);
  const [selectedRoute, setSelectedRoute] = useState(initialSelectedRoute);
  const [alert, setAlert] = useState({ show: false, type: "", message: "" });
  const [showSecurityKeyPopup, setShowSecurityKeyPopup] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [expandedRowData, setExpandedRowData] = useState([]);


  const getbeatmapping = async () => {
    if (!startDay || !endDay) {
      setAlert({
        show: true,
        type: "error",
        message: "Start and end dates are required.",
      });
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
            page: currentPage,
            limit: 15,
          },
        }
      );

      if (res.data.success && Array.isArray(res.data.data)) {
        setData(res.data.data); // Set the data array from response
        setTotalRecords(res.data.total || 0);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      setData([]);
      setTotalRecords(0);
      setAlert({
        show: true,
        type: "error",
        message:
          err.response?.data?.message || "Failed to fetch beat mapping data",
      });
      console.error("Error fetching beat mapping:", err);
    }
  };

  useEffect(() => {
    if (startDay && endDay) {
      getbeatmapping();
    }
  }, [currentPage, search, startDay, endDay]);

  useEffect(() => {
    if (expandedRow !== null) {
      setExpandedRow(null);
      setExpandedRowData([]);
    }
  }, [currentPage, search, startDay, endDay]);

  const addDailyBeatMapping = async () => {
    try {
      const res = await axios.put(`${backendUrl}/add-daily-beat-mapping`);
      setAlert({
        show: true,
        type: "success",
        message: res.data.message || "Daily Beat Mapping Added Successfully",
      });
    } catch (err) {
      setAlert({
        show: true,
        type: "error",
        message:
          err.response?.data?.message || "Failed to add daily beat mapping",
      });
    }
  };

  const totalPages = Math.ceil(totalRecords / 15);

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





  const getRouteFilteredCounts = (schedule = [], routeId, routes = []) => {
    if (!routeId) {
      return {
        total: schedule.length,
        done: schedule.filter((s) => s.status === "done").length,
        pending: schedule.filter((s) => s.status === "pending").length,
      };
    }

    const route = routes.find((r) => r.id === routeId);
    if (!route) {
      return {
        total: schedule.length,
        done: schedule.filter((s) => s.status === "done").length,
        pending: schedule.filter((s) => s.status === "pending").length,
      };
    }

    const { zones, districts, talukas } = route.itinerary || {};
    const filteredSchedule = schedule.filter((item) => {
      return (
        (zones?.length === 0 || zones?.includes(item.zone)) &&
        (districts?.length === 0 || districts?.includes(item.district)) &&
        (talukas?.length === 0 || talukas?.includes(item.taluka))
      );
    });

    return {
      total: filteredSchedule.length,
      done: filteredSchedule.filter((s) => s.status === "done").length,
      pending: filteredSchedule.filter((s) => s.status === "pending").length,
    };
  };

  const handleRouteChange = (routeId, index) => {
    setSelectedRoute((prev) => ({
      ...prev,
      [index]: routeId,
    }));
  };

  // Reset all filters and URL
  const handleReset = () => {
    setSearch("");
    const defaultStartDate = (() => {
      const date = new Date();
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(date.setDate(diff));
    })();
    const defaultEndDate = (() => {
      const date = new Date();
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? 0 : 7);
      return new Date(date.setDate(diff));
    })();
    setStartDay(defaultStartDate);
    setEndDay(defaultEndDate);
    navigate("/viewBeatMappingStatus", { replace: true });
    getbeatmapping();
  };

  const stackedData = data.map((emp) => {
    const total = emp.done + emp.pending;
    return {
      ...emp,
      done: ((emp.done / total) * 100).toFixed(1),
      pending: ((emp.pending / total) * 100).toFixed(1),
    };
  });

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
          <ResponsiveContainer width="100%" height={300}>
            <BarChart width={600} height={300} data={stackedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey={(entry) => entry.name.split(" ")[0]}
                textAnchor="end"
                height={60}
                fontSize={13}
                angle={-45}
              />
              <YAxis domain={[0, 100]}  tickFormatter={(tick) => `${tick}%`} />
              <Tooltip />
              <Legend />
              <Bar dataKey="done" name={"Done"} stackId="a" fill="#2E7D32" />
              <Bar dataKey="pending" stackId="a" fill="#FFB300" name={"Pending"}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="viewBeatMappingStatus-page-container">
        <div className="viewBeatMapping-first-line">
          <div className="filters-container">
            <div className="viewBeatMappingStatus-filter">
              <input
                type="text"
                placeholder="Search Employee Code"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="viewBeatMappingStatus-date-filter">
                <div className="date">
                  <label>From:</label>
                  <input
                    type="date"
                    value={startDay ? startDay.toISOString().split("T")[0] : ""}
                    onChange={(e) => setStartDay(new Date(e.target.value))}
                  />
                </div>
                <div className="date">
                  <label>To:</label>
                  <input
                    type="date"
                    value={endDay ? endDay.toISOString().split("T")[0] : ""}
                    onChange={(e) => setEndDay(new Date(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="buttons-container">
            <div
              className="viewBeatMappingStatus-upload-btn"
              onClick={addDailyBeatMapping}
            >
              <label className="browse-btn">
                <FaFileUpload />
                Add Daily Beat Mapping
              </label>
            </div>
            <div className="viewBeatMappingStatus-download-btn">
              <div className="browse-btn">
                <FaDownload />
                Download CSV
              </div>
            </div>
            <div className="viewBeatMappingStatus-reset-filter">
              <button className="reset-btn" onClick={handleReset}>
                Reset Filters
              </button>
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

        <div className="viewBeatMapping-table-container">
          <table>
            <thead>
              <tr>
                <th>S.NO</th>
                <th>Employee Code</th>
                <th>Employee Name</th>
                <th>Total</th>
                <th>Pending</th>
                <th>Done</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>View</th>
                <th>Route</th>
                <th>Status</th>
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

                  const counts = getRouteFilteredCounts(
                    item.schedule || [],
                    selectedRoute[index],
                    item.routes || []
                  );
                  return [
                    <tr key={item._id || `row-${index}`} onClick={() => {
                      setExpandedRow(isExpanded ? null : index);
                      setExpandedRowData(item.schedule || []);
                    }}>
                      <td>{(currentPage - 1) * 15 + index + 1}</td>
                      <td>{item.code}</td>
                      <td>{item.name}</td>

                      <td
                        style={{
                          color: "#1E88E5",
                          fontWeight: "600",
                          fontSize: "14px",
                        }}
                      >
                        {counts.total}
                      </td>
                      <td
                        style={{
                          color: "#F57C00",
                          fontWeight: "600",
                          fontSize: "14px",
                        }}
                      >
                        {counts.pending}
                      </td>
                      <td
                        style={{
                          color: "#2E7D32",
                          fontWeight: "600",
                          fontSize: "14px",
                        }}
                      >
                        {counts.done}
                      </td>
                      <td>{item.startDate?.split("T")[0] || "N/A"}</td>
                      <td>{item.endDate?.split("T")[0] || "N/A"}</td>
                      <td>
                        <div
                          className="expand-btn"
                        >
                          {isExpanded ? "Collapse" : "Expand"}
                        </div>
                      </td>
                      <td>
                        {item.routes && item.routes.length > 1 ? (
                          <div className="route-select-container" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={selectedRoute[index] || ""}
                              onChange={(e) =>
                                handleRouteChange(e.target.value, index)
                              }
                            >
                              <option value="">All Routes</option>
                              {item.routes.map((route) => (
                                <option key={route.id} value={route.id}>
                                  {route.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          item.routes?.[0]?.name || "N/A"
                        )}
                      </td>
                      <td
                        style={{
                          color: selectedRoute[index]
                            ? item.routes?.find(
                                (r) => r.id === selectedRoute[index]
                              )?.status === "active"
                              ? "green"
                              : "red"
                            : item.routes?.[0]?.status === "active"
                            ? "green"
                            : "red",
                        }}
                      >
                        {selectedRoute[index]
                          ? item.routes?.find(
                              (r) => r.id === selectedRoute[index]
                            )?.status || "N/A"
                          : item.routes?.[0]?.status || "N/A"}
                      </td>
                    </tr>,


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

      {showSecurityKeyPopup && (
        <SecurityKeyPopup
          onClose={() => setShowSecurityKeyPopup(false)}
          onSuccess={(msg) => {
            setAlert({ show: true, type: "success", message: msg });
            setShowSecurityKeyPopup(false);
          }}
        />
      )}
          {expandedRow !== null && (
              <EmployeeSchedule
                  schedule={expandedRowData}
                  isClose={() => setExpandedRow(null)}
                  selectedRoute={selectedRoute}
                  data={data}
                  expandedRow={expandedRow}
              />

      )}
    </div>
  );
};

export default ViewBeatMappingStatus;
