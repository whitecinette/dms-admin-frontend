import React, { useState, useEffect } from "react";
import axios from "axios";
import config from "../../config.js";
import "./style.scss";
import { FaCheck, FaDownload, FaTimes } from "react-icons/fa";
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
  const [showRequests, setShowRequests] = useState(false);
  const [requestData, setRequestData] = useState([]);
  const [requestCount, setRequestCount] = useState(0);
  const [requestStatus, setRequestStatus] = useState("pending");
  const [requestSearch, setRequestSearch] = useState("");
  const [requestPage, setRequestPage] = useState(1);
  const [requestTotalPages, setRequestTotalPages] = useState(0);
  const [reviewingRequestId, setReviewingRequestId] = useState(null);

  // Add header mapping for better display names
  const headerMapping = {
    name: "Name",
    code: "Code",
    image: "Location Image",
    status: "Status",
    latitude: "Latitude",
    longitude: "Longitude",
    geotagChangeCount: "Changes",
    latestChangedBy: "Last Changed By",
    latestChangedAt: "Last Changed At",
    pendingRequestedBy: "Requested By",
    pendingRequestedAt: "Requested At",
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
          "pendingRequest",
          "pendingRequestedAt",
          "latestChangedAt",
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

  const getRequestCount = async () => {
    try {
      const response = await axios.get(`${backendUrl}/geo-tag-requests/count`, {
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });
      setRequestCount(response.data.data || 0);
    } catch (error) {
      console.error("Error fetching geotag request count:", error);
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

  const fetchGeoTagRequests = async () => {
    try {
      const response = await axios.get(`${backendUrl}/geo-tag-requests`, {
        params: {
          status: requestStatus,
          search: requestSearch,
          page: requestPage,
          limit: 10,
        },
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });

      setRequestData(response.data.data || []);
      setRequestTotalPages(response.data.pagination?.pages || 0);
    } catch (error) {
      console.error("Error fetching geotag requests:", error);
      setRequestData([]);
      setAlert({
        type: "error",
        message: "Failed to fetch geotag requests",
      });
    }
  };

  const handleReviewGeoTagRequest = async (requestId, action) => {
    setReviewingRequestId(requestId);
    try {
      const response = await axios.patch(
        `${backendUrl}/geo-tag-requests/${requestId}/review`,
        { action },
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );

      setAlert({
        type: "success",
        message: response.data.message || `Request ${action}d successfully`,
      });
      fetchGeoTagRequests();
      fetchGeotagData();
      getRequestCount();
      getUpdateCount();
    } catch (error) {
      console.error(`Error ${action}ing geotag request:`, error);
      setAlert({
        type: "error",
        message:
          error.response?.data?.message || `Failed to ${action} geotag request`,
      });
    } finally {
      setReviewingRequestId(null);
    }
  };

  // New utility function to handle display values
  function getDisplayValue(val) {
    if (val && typeof val === "object" && "$numberDecimal" in val) {
      return val.$numberDecimal;
    }
    return val !== undefined && val !== null ? val : "N/A";
  }

  const formatDateTime = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isValidCoordinate = (latitude, longitude) => {
    const lat = Number(getDisplayValue(latitude));
    const lng = Number(getDisplayValue(longitude));
    return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
  };

  const renderMiniMap = (latitude, longitude, title) => {
    if (!isValidCoordinate(latitude, longitude)) return <span className="map-empty">N/A</span>;

    return (
      <iframe
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        src={`https://maps.google.com/maps?q=${getDisplayValue(latitude)},${getDisplayValue(
          longitude
        )}&z=16&output=embed`}
        title={title}
      ></iframe>
    );
  };

  const renderGeoImage = (src, label, className = "location-image") => {
    const value = getDisplayValue(src);
    if (value === "N/A" || String(value).toLowerCase() === "not available") {
      return <span className="image-empty">N/A</span>;
    }
    return <img src={value} alt={label} className={className} />;
  };

  useEffect(() => {
    getAllActorTypes();
    getUpdateCount();
    getRequestCount();

    const intervalId = setInterval(() => {
      getUpdateCount();
      getRequestCount();
    }, 60000); // 60 seconds

    // Clean up on component unmount
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchGeotagData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, search, selectedFirm, selectedStatus]);

  useEffect(() => {
    if (showUpdates) {
      fetchUpdatedData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showUpdates, updateSearch, updateDateFrom, updateDateTo]);

  useEffect(() => {
    if (showRequests) {
      fetchGeoTagRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRequests, requestStatus, requestSearch, requestPage]);

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

  const prevRequestPage = () => {
    if (requestPage > 1) {
      setRequestPage((prev) => prev - 1);
    }
  };

  const nextRequestPage = () => {
    if (requestPage < requestTotalPages) {
      setRequestPage((prev) => prev + 1);
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
        <div>
          <div className="geotagging-page-header-title">Geotagging</div>
          <p className="geotagging-page-subtitle">
            Manage dealer locations, approval requests, and change history.
          </p>
        </div>
        <div className="geotagging-icon">
          <button className="header-pill request-pill" onClick={() => setShowRequests(true)}>
            <span className="request-icon">✓</span>
            {requestCount > 0
              ? requestCount === 1
                ? "1 request pending"
                : `${requestCount} requests pending`
              : "Requests"}
          </button>
          <button className="header-pill update-pill" onClick={() => setShowUpdates(true)}>
            <span className="update-icon">↻</span>
            {updateCount > 0
              ? updateCount === 1
                ? "1 update available"
                : `${updateCount} updates available`
              : "Recent Updates"}
          </button>
        </div>
      </div>

      <div className="geotagging-summary-grid">
        <button className="summary-card" onClick={() => setShowRequests(false)}>
          <span className="summary-label">Dealer Records</span>
          <strong>{geotagData.pagination?.total || geotagData.data?.length || 0}</strong>
          <small>matching current filters</small>
        </button>
        <button className="summary-card accent-warning" onClick={() => setShowRequests(true)}>
          <span className="summary-label">Pending Requests</span>
          <strong>{requestCount}</strong>
          <small>waiting for admin review</small>
        </button>
        <button className="summary-card accent-info" onClick={() => setShowUpdates(true)}>
          <span className="summary-label">Recent Updates</span>
          <strong>{updateCount}</strong>
          <small>new unseen changes</small>
        </button>
      </div>

      <div className="geotagging-page-content">
        <div className="geotagging-tabs">
          <button
            className={!showRequests ? "active" : ""}
            onClick={() => setShowRequests(false)}
          >
            Dealers
          </button>
          <button
            className={showRequests ? "active" : ""}
            onClick={() => {
              setShowRequests(true);
              fetchGeoTagRequests();
            }}
          >
            Requests
            {requestCount > 0 && <span>{requestCount}</span>}
          </button>
        </div>

        {!showRequests ? (
          <>
            <div className="geotagging-page-first-line">
              <div className="geotagging-page-filters">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setCurrentPage(1);
                    setSearch(e.target.value);
                  }}
                  placeholder="Search dealer name or code"
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
                  <option value="REQUESTED">Requested</option>
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
                          {getVisibleHeaders(geotagData.data).map((header, headerIndex) => (
                            <td key={headerIndex}>
                              {header === "image" ? (
                                renderGeoImage(row[header], "Location")
                              ) : header === "status" ? (
                                <span className={`status-badge status-${String(row[header]).toLowerCase()}`}>
                                  {row[header]}
                                </span>
                              ) : (
                                getDisplayValue(row[header])
                              )}
                            </td>
                          ))}
                          <td>{renderMiniMap(row.latitude, row.longitude, "Location Map")}</td>
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
              <button onClick={prevPage} className="page-btn" disabled={currentPage === 1}>
                &lt;
              </button>
              <span>
                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                onClick={nextPage}
                className="page-btn"
                disabled={currentPage === (totalPages || 1)}
              >
                &gt;
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="geotagging-page-first-line request-toolbar">
              <div className="geotagging-page-filters">
                <input
                  type="text"
                  value={requestSearch}
                  onChange={(e) => {
                    setRequestPage(1);
                    setRequestSearch(e.target.value);
                  }}
                  placeholder="Search dealer or requester"
                />
                <select
                  value={requestStatus}
                  onChange={(e) => {
                    setRequestPage(1);
                    setRequestStatus(e.target.value);
                  }}
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="all">All Requests</option>
                </select>
              </div>
              <div className="request-record-count">{requestData.length} shown</div>
            </div>

            {requestData.length > 0 ? (
              <div className="geo-request-list">
                {requestData.map((request) => {
                  const isPending = request.status === "pending";
                  const isReviewing = reviewingRequestId === request._id;
                  const dealer = request.dealerId || {};
                  const previous = request.previousData || {};
                  const requested = request.requestedData || {};
                  const current = request.status === "approved"
                    ? {
                        latitude: dealer.latitude ?? requested.latitude,
                        longitude: dealer.longitude ?? requested.longitude,
                        geotag_picture: dealer.geotag_picture ?? requested.geotag_picture,
                      }
                    : previous;
                  const currentTitle =
                    request.status === "approved" ? "Updated Dealer Location" : "Current Location";

                  return (
                    <div className="geo-request-card" key={request._id}>
                      <div className="geo-request-card-header">
                        <div>
                          <h3>{request.dealerName || request.dealerId?.name || "N/A"}</h3>
                          <p>
                            {request.dealerCode || request.dealerId?.code || "N/A"} · Requested by{" "}
                            {request.requestedBy?.name || "N/A"} · {formatDateTime(request.createdAt)}
                          </p>
                        </div>
                        <span className={`status-badge status-${request.status}`}>
                          {request.status}
                        </span>
                      </div>

                      <div className="geo-request-compare">
                        <div className="geo-location-panel">
                          <div className="geo-location-panel-title">
                            <span>{currentTitle}</span>
                            <small>
                              {getDisplayValue(current.latitude)}, {getDisplayValue(current.longitude)}
                            </small>
                          </div>
                          <div className="geo-location-media">
                            {renderGeoImage(
                              current.geotag_picture,
                              currentTitle,
                              "request-location-image"
                            )}
                            {renderMiniMap(current.latitude, current.longitude, currentTitle)}
                          </div>
                        </div>
                        <div className="geo-location-panel requested">
                          <div className="geo-location-panel-title">
                            <span>Requested Location</span>
                            <small>
                              {getDisplayValue(requested.latitude)}, {getDisplayValue(requested.longitude)}
                            </small>
                          </div>
                          <div className="geo-location-media">
                            {renderGeoImage(
                              requested.geotag_picture,
                              "Requested location",
                              "request-location-image"
                            )}
                            {renderMiniMap(requested.latitude, requested.longitude, "Requested Location")}
                          </div>
                        </div>
                      </div>

                      <div className="geo-request-footer">
                        <div>
                          <strong>{request.changeStats?.totalChanges || 0}</strong>
                          <span>previous approved changes</span>
                        </div>
                        {isPending ? (
                          <div className="request-actions">
                            <button
                              className="reject-button"
                              disabled={isReviewing}
                              onClick={() => handleReviewGeoTagRequest(request._id, "reject")}
                            >
                              <FaTimes /> Reject
                            </button>
                            <button
                              className="approve-button"
                              disabled={isReviewing}
                              onClick={() => handleReviewGeoTagRequest(request._id, "approve")}
                            >
                              <FaCheck /> Approve
                            </button>
                          </div>
                        ) : (
                          <span className="reviewed-copy">
                            Reviewed by {request.reviewedBy?.name || "N/A"} on{" "}
                            {formatDateTime(request.reviewedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="no-data-container">
                <div className="no-data-message">No Geotagging Requests Found</div>
              </div>
            )}

            <div className="pagination">
              <button
                onClick={prevRequestPage}
                className="page-btn"
                disabled={requestPage === 1}
              >
                &lt;
              </button>
              <span>
                Page {requestPage} of {requestTotalPages || 1}
              </span>
              <button
                onClick={nextRequestPage}
                className="page-btn"
                disabled={requestPage === (requestTotalPages || 1)}
              >
                &gt;
              </button>
            </div>
          </>
        )}
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
                        Dealer Name: {update.modelId?.name || "N/A"}
                      </span>
                      <span className="update-status">
                        {update.updateReason || "N/A"}
                      </span>
                    </div>
                    <div className="update-card-body">
                      <div className="update-info">
                        <div className="update-row">
                          <span className="update-label">Updated By:</span>
                          <span className="update-value">
                            {update.updatedBy?.name || "N/A"} (
                            {update.updatedBy?.code || "N/A"})
                          </span>
                        </div>
                        <div className="update-row">
                          <span className="update-label">
                            Previous Location:
                          </span>
                          <span className="update-value">
                            Lat:{" "}
                            {getDisplayValue(update.previousData?.latitude)},
                            Long:{" "}
                            {getDisplayValue(update.previousData?.longitude)}
                          </span>
                        </div>
                        <div className="update-row">
                          <span className="update-label">New Location:</span>
                          <span className="update-value">
                            Lat: {getDisplayValue(update.newData?.latitude)},
                            Long: {getDisplayValue(update.newData?.longitude)}
                          </span>
                        </div>
                        <div className="update-row">
                          <span className="update-label">Updated At:</span>
                          <span className="update-value">
                            {update.timestamp
                              ? new Date(update.timestamp).toLocaleString()
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                      <div className="update-maps">
                        {update.previousData?.latitude &&
                          update.previousData?.longitude &&
                          getDisplayValue(update.previousData.latitude) !==
                            "N/A" &&
                          getDisplayValue(update.previousData.longitude) !==
                            "N/A" && (
                            <div className="map-container">
                              <h4>Previous Location</h4>
                              <iframe
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                src={`https://maps.google.com/maps?q=${getDisplayValue(
                                  update.previousData.latitude
                                )},${getDisplayValue(
                                  update.previousData.longitude
                                )}&z=16&output=embed`}
                                title="Previous Location"
                              ></iframe>
                            </div>
                          )}
                        {update.newData?.latitude &&
                          update.newData?.longitude &&
                          getDisplayValue(update.newData.latitude) !== "N/A" &&
                          getDisplayValue(update.newData.longitude) !==
                            "N/A" && (
                            <div className="map-container">
                              <h4>New Location</h4>
                              <iframe
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                src={`https://maps.google.com/maps?q=${getDisplayValue(
                                  update.newData.latitude
                                )},${getDisplayValue(
                                  update.newData.longitude
                                )}&z=16&output=embed`}
                                title="New Location"
                              ></iframe>
                            </div>
                          )}
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
