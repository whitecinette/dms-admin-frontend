import React, { useState, useEffect } from "react";
import axios from "axios";
import config from "../../config.js";
import "./style.scss";
import { FaDownload } from "react-icons/fa";
import CustomAlert from "../../components/CustomAlert";

const backendUrl = config.backend_url;

function Geotagging() {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [geotagData, setGeotagData] = useState([]);
  const [search, setSearch] = useState("");
  const [firmList, setFirmList] = useState([]);
  const [selectedFirm, setSelectedFirm] = useState("");
  const [alert, setAlert] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [updateCount, setUpdateCount] = useState(0);
  const [showUpdates, setShowUpdates] = useState(false);
  const [updatedData, setUpdatedData] = useState([]);
  const [updateSearch, setUpdateSearch] = useState("");
  const [updateDateFrom, setUpdateDateFrom] = useState("");
  const [updateDateTo, setUpdateDateTo] = useState("");

  // Add header mapping for better display names
  const headerMapping = {
    name: "Name",
    code: "Code",
    image: "Location Image",
    status: "Status",
    latitude: "Latitude",
    longitude: "Longitude",
  };

  // Function to format header name
  const formatHeaderName = (header) => {
    // If we have a custom mapping, use it
    if (headerMapping[header]) {
      return headerMapping[header];
    }
    // Otherwise format the header name by replacing underscores with spaces and capitalizing
    return header
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Function to get visible headers
  const getVisibleHeaders = (data) => {
    if (!data || data.length === 0) return [];
    // Get all keys except internal ones
    const headers = Object.keys(data[0]).filter(
      (key) =>
        ![
          "_id",
          "latitude",
          "longitude",
          "hierarchy_name",
          "parent_firm",
        ].includes(key)
    );
    return headers;
  };

  // Fetch firm list
  const getAllActorTypes = async () => {
    try {
      const res = await axios.get(
        `${backendUrl}/actorTypesHierarchy/get-all-by-admin`
      );
      // Filter firms that have dealers in their hierarchy
      const firmsWithDealers = res.data.data.filter(
        (firm) => firm.hierarchy && firm.hierarchy.includes("dealer")
      );
      setFirmList(firmsWithDealers);
    } catch (error) {
      console.error("Error fetching firms:", error);
      setAlert({
        type: "error",
        message: "Failed to fetch firms",
      });
    }
  };

  const markSeen = async () => {
    const token = localStorage.getItem("authToken");
    try {
      await axios.post(
        `${backendUrl}/updated-data/geo-tag/mark-seen`,
        {}, // empty body
        {
          headers: {
            Authorization: token,
          },
        }
      );
      getUpdateCount();
      setShowUpdates(false);
    } catch (error) {
      console.error("Error marking seen:", error);
    }
  };

  // Fetch geotag data
  const fetchGeotagData = async () => {
    try {
      const response = await axios.get(
        `${backendUrl}/get-geo-tag-dealers-for-admin`,
        {
          params: {
            hierarchy_name: selectedFirm,
            page: currentPage,
            limit: 10,
            search,
            status: selectedStatus,
          },
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );

      setGeotagData(response.data);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      console.error("Error fetching geotag data:", error);
      setGeotagData([]);
      setAlert({
        type: "error",
        message: "Failed to fetch geotag data",
      });
    }
  };

  // Handle download
  const handleDownload = async () => {
    if (!selectedFirm) {
      setAlert({
        type: "warning",
        message: "Please select a firm",
      });
      return;
    }
    try {
      const response = await axios.get(`${backendUrl}/get-geo-tag-dealers`, {
        params: {
          hierarchy_name: selectedFirm,
          status: selectedStatus,
        },
        responseType: "blob",
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });

      // Create a Blob URL
      const url = window.URL.createObjectURL(new Blob([response.data]));

      // Create a download link
      const a = document.createElement("a");
      a.href = url;
      a.download = "geotag_data.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Cleanup Blob URL
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      setAlert({
        type: "error",
        message: "Failed to download geotag data",
      });
    }
  };

  const getUpdateCount = async () => {
    try {
      const response = await axios.get(
        `${backendUrl}/updated-data/geo-tag/count`,
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );
      setUpdateCount(response.data.data);
    } catch (error) {
      console.error("Error fetching update count:", error);
    }
  };

  const fetchUpdatedData = async () => {
    try {
      const response = await axios.get(`${backendUrl}/updated-data/geo-tag`, {
        params: {
          search: updateSearch,
          dateFrom: updateDateFrom,
          dateTo: updateDateTo,
        },
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });
      setUpdatedData(response.data.data);
    } catch (error) {
      console.error("Error fetching updated data:", error);
      setAlert({
        type: "error",
        message: "Failed to fetch updated data",
      });
    }
  };

  useEffect(() => {
    getAllActorTypes();
    getUpdateCount();
  
    const intervalId = setInterval(() => {
      getUpdateCount();
    }, 60000); // 60 seconds
  
    // Clean up on component unmount
    return () => clearInterval(intervalId);
  }, []);
  

  useEffect(() => {
    fetchGeotagData();
  }, [currentPage, search, selectedFirm, selectedStatus]);

  useEffect(() => {
    if (showUpdates) {
      fetchUpdatedData();
    }
  }, [showUpdates, updateSearch, updateDateFrom, updateDateTo]);

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
    <div className="geotagging-page">
      {alert && (
        <CustomAlert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
      <div className="geotagging-page-header">
        <div className="geotagging-page-header-title">Geotagging</div>
        <div className="geotagging-icon">
          <div className="update-count-container">
            <div className="update-count" onClick={() => setShowUpdates(true)}>
              <span className="update-icon">↻</span>
              <span className="update-text">
                {updateCount > 0
                  ? updateCount === 1
                    ? "1 update available"
                    : `${updateCount} updates available`
                  : " See Recent Updates"}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="geotagging-page-content">
        <div className="geotagging-page-first-line">
          <div className="geotagging-page-filters">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setCurrentPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Search..."
            />
            <select
              value={selectedFirm}
              onChange={(e) => {
                setCurrentPage(1);
                setSelectedFirm(e.target.value);
              }}
            >
              <option value="">All Firms</option>
              {firmList.map((firm) => (
                <option key={firm._id} value={firm.name}>
                  {firm.name}
                </option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setCurrentPage(1);
                setSelectedStatus(e.target.value);
              }}
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="DONE">Done</option>
            </select>
          </div>
          <button className="download-button" onClick={handleDownload}>
            <FaDownload />
            Download Geotag Data
          </button>
        </div>

        <div className="geotagging-table-container">
          {geotagData.data && geotagData.data.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>S.No</th>
                  {getVisibleHeaders(geotagData.data).map((header, index) => (
                    <th key={index}>{formatHeaderName(header)}</th>
                  ))}
                  <th>Map</th>
                </tr>
              </thead>
              <tbody>
                {geotagData.data.map((row, index) => (
                  <React.Fragment key={row._id || index}>
                    <tr>
                      <td>{(currentPage - 1) * 10 + index + 1}</td>
                      {getVisibleHeaders(geotagData.data).map(
                        (header, headerIndex) => (
                          <td key={headerIndex}>
                            {header === "image" ? (
                              row[header] && row[header] !== "Not Available" ? (
                                <img
                                  src={row[header]}
                                  alt="Location"
                                  className="location-image"
                                />
                              ) : (
                                "N/A"
                              )
                            ) : header === "status" ? (
                              <span
                                style={{
                                  color:
                                    row[header] === "DONE" ? "green" : "orange",
                                }}
                              >
                                {row[header]}
                              </span>
                            ) : (
                              row[header] || "N/A"
                            )}
                          </td>
                        )
                      )}
                      <td>
                        {row.latitude &&
                        row.longitude &&
                        row.latitude !== "0.000000" &&
                        row.longitude !== "0.000000" ? (
                          <iframe
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            src={`https://maps.google.com/maps?q=${row.latitude},${row.longitude}&z=16&output=embed`}
                            title="Location Map"
                          ></iframe>
                        ) : (
                          "N/A"
                        )}
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-data-container">
              <div className="no-data-message">No Data Available</div>
            </div>
          )}
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

      {/* Updates Slider */}
      {showUpdates && (
        <>
          <div
            className="updates-overlay"
            onClick={() => setShowUpdates(false)}
          />
          <div className="updates-slider">
            <div className="updates-header">
              <h3>Recent Updates</h3>
              <div className="updates-filters">
                <input
                  type="text"
                  placeholder="Search Dealer Name"
                  value={updateSearch}
                  onChange={(e) => setUpdateSearch(e.target.value)}
                  className="update-search-input"
                />
                <div className="date-filters">
                  <input
                    type="date"
                    value={updateDateFrom}
                    onChange={(e) => setUpdateDateFrom(e.target.value)}
                    className="date-input"
                  />
                  <input
                    type="date"
                    value={updateDateTo}
                    onChange={(e) => setUpdateDateTo(e.target.value)}
                    className="date-input"
                  />
                </div>
              </div>
              <button
                className="close-button"
                onClick={() => {
                  markSeen();
                }}
              >
                ×
              </button>
            </div>
            <div className="updates-content">
              {updatedData.length > 0 ? (
                updatedData.map((update, index) => (
                  <div
                    key={index}
                    className={`update-card ${
                      index < updateCount ? "update-card-active" : ""
                    }`}
                  >
                    <div className="update-card-header">
                      <span className="update-name">
                        Dealer Name: {update.modelId.name}
                      </span>
                      <span className="update-status">
                        {update.updateReason}
                      </span>
                    </div>
                    <div className="update-card-body">
                      <div className="update-info">
                        <div className="update-row">
                          <span className="update-label">Updated By:</span>
                          <span className="update-value">
                            {update.updatedBy.name} ({update.updatedBy.code})
                          </span>
                        </div>
                        <div className="update-row">
                          <span className="update-label">
                            Previous Location:
                          </span>
                          <span className="update-value">
                            Lat: {update.previousData.latitude}, Long:{" "}
                            {update.previousData.longitude}
                          </span>
                        </div>
                        <div className="update-row">
                          <span className="update-label">New Location:</span>
                          <span className="update-value">
                            Lat: {update.newData.latitude}, Long:{" "}
                            {update.newData.longitude}
                          </span>
                        </div>
                        <div className="update-row">
                          <span className="update-label">Updated At:</span>
                          <span className="update-value">
                            {new Date(update.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="update-maps">
                        <div className="map-container">
                          <h4>Previous Location</h4>
                          <iframe
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            src={`https://maps.google.com/maps?q=${update.previousData.latitude},${update.previousData.longitude}&z=16&output=embed`}
                            title="Previous Location"
                          ></iframe>
                        </div>
                        <div className="map-container">
                          <h4>New Location</h4>
                          <iframe
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            src={`https://maps.google.com/maps?q=${update.newData.latitude},${update.newData.longitude}&z=16&output=embed`}
                            title="New Location"
                          ></iframe>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-updates">No updates available</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Geotagging;
