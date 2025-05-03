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
import { useNavigate } from "react-router-dom";
import CustomAlert from "../../components/CustomAlert/index.js";
import SecurityKeyPopup from "./SecurityKeyPopup/index.js";

const backendUrl = config.backend_url;

const ViewBeatMappingStatus = () => {
  const navigation = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setsearch] = useState("");
  const [status, setstatus] = useState("");
  const [data, setData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [alert, setAlert] = useState({ show: false, type: "", message: "" });
  const [showSecurityKeyPopup, setShowSecurityKeyPopup] = useState(false);

  const [startDay, setStartDay] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date;
  });

  const [endDay, setEndDay] = useState(new Date());

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
          <div className="viewBeatMappingStatus-filter">
            <input
              type="text"
              placeholder="Search Employee Code"
              name="search"
              value={search}
              onChange={(e) => setsearch(e.target.value)}
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
          {/* Buttons */}
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
          <div className="viewBeatMapping-buttons">
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
                <th>Done</th>
                <th>Pending</th>
                <th>Total</th>
                <th>View</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center" }}>
                    No data available
                  </td>
                </tr>
              ) : (
                data.map((item, index) => (
                  <>
                    <tr key={item._id || index}>
                      <td>{(currentPage - 1) * 15 + index + 1}</td>
                      <td>{item.code}</td>
                      <td>{item.name}</td>
                      <td style={{ color: "green" }}>{item.done}</td>
                      <td style={{ color: "#f0b862" }}>{item.pending}</td>
                      <td style={{ color: "#6666f2" }}>{item.total}</td>
                      <td className="expand-btn">
                        <button
                          onClick={() => navigation(`schedules/${item.code}`)}
                        >
                          View Detail
                        </button>
                      </td>
                    </tr>
                  </>
                ))
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
