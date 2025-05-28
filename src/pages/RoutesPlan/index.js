import React, { useEffect, useState, useRef } from "react";
import config from "../../config";
import axios from "axios";
import { FaChevronUp, FaChevronDown } from "react-icons/fa";
import "./style.scss";

const backend_url = config.backend_url;

function RoutesPlan() {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(date.setDate(diff));
    return monday;
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? 0 : 7); // adjust when day is sunday
    const sunday = new Date(date.setDate(diff));
    return sunday;
  });
  const [status, setStatus] = useState("");
  const [approved, setApproved] = useState("");
  const [routePlan, setRoutePlan] = useState([]);
  const [itinerary, setItinerary] = useState([]);
  const [dropdown, setDropdown] = useState("");
  const [dropdownSearch, setDropdownSearch] = useState("");
  const [dropdownValue, setDropdownValue] = useState([]);
  const dropdownRefs = useRef({});
  const [dropdownStyles, setDropdownStyles] = useState({ top: 0, left: 0 });

  const NAVBAR_WIDTH = document.querySelector(".sidebar")?.offsetWidth || 0;

  const handleDropdownClick = (item) => {
    const element = dropdownRefs.current[item];
    if (element) {
      const rect = element.getBoundingClientRect();
      const screenWidth = window.innerWidth;

      const hasNavbar = screenWidth > 768;
      const calculatedLeft = rect.left - (hasNavbar ? NAVBAR_WIDTH : 0);

      setDropdown(item);
      setDropdownStyles({
        top: rect.bottom + window.scrollY,
        left: Math.max(calculatedLeft, 0), // 👈 clamp to minimum 0
      });
    }
  };
  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const getRoutePlan = async () => {
    if ((startDate && endDate) === "") {
      return;
    }
    try {
      const res = await axios.get(`${backend_url}/admin/route-plan/get`, {
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
        params: {
          search,
          startDate,
          endDate,
          status,
          approved,
          itinerary: JSON.stringify(dropdownValue),
        },
      });
      setRoutePlan(res.data.data);
    } catch (err) {
      console.log(err);
      setRoutePlan([]);
    }
  };

  const getItinerary = async () => {
    try {
      const res = await axios.get(
        `${backend_url}/user/market-coverage/dropdown`,
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );
      setItinerary(res.data.data);
    } catch (err) {
      console.log(err);
      setItinerary([]);
    }
  };

  useEffect(() => {
    getRoutePlan();
  }, [startDate, endDate, status, approved, search]);

  useEffect(() => {
    getItinerary();
  }, []);

  const handleApproval = async (routeId, isApproved, status = "active") => {
    try {
      await axios.put(
        `${backend_url}/admin/route-plan/update/${routeId}`,
        { approved: isApproved, status },
        
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );
      getRoutePlan(); // Refresh the list after approval/rejection
    } catch (err) {
      console.log(err);
    }
  };

  const renderRouteCard = (route) => (
    <div key={route._id} className="route-card">
      <div className="route-card-header">
      <h3>{route.EmpName} ({route.position})</h3>
        <span className={`status ${route.status}`}>{route.status}</span>
      </div>
      <div className="route-card-content">
        <div className="route-info">
          <p>
            <strong>Code:</strong> {route.code}
          </p>
          <p>
            <strong>Route Name:</strong> {route.name} 
          </p>
          <p>
            <strong>Date:</strong> {formatDate(route.startDate)} -{" "}
            {formatDate(route.endDate)}
          </p>
        </div>
        <div className="route-itinerary">
          <h4>Itinerary</h4>
          {route.itinerary.district.length > 0 && (
            <p>
              <strong>District:</strong> {route.itinerary.district.join(", ")}
            </p>
          )}
          {route.itinerary.zone.length > 0 && (
            <p>
              <strong>Zone:</strong> {route.itinerary.zone.join(", ")}
            </p>
          )}
          {route.itinerary.taluka.length > 0 && (
            <p>
              <strong>Taluka:</strong> {route.itinerary.taluka.join(", ")}
            </p>
          )}
        </div>
      </div>
      <div className="route-card-actions">
        {route.approved ? (
          <>
            <span className="status-badge approved">Approved</span>
            {route.status === "active"? 
                (

                    <button
                      className="action-btn reject"
                      onClick={() => handleApproval(route._id, true, "inactive")}
                    >
                      Change to Inactive
                    </button>
                ):(
                    <button
                      className="action-btn approve"
                      onClick={() => handleApproval(route._id, true)}
                    >
                      Change to Active
                    </button>
                )
            }
          </>
        ) : (
          <>
            <span className="status-badge rejected">Rejected</span>
            <button
              className="action-btn approve"
              onClick={() => handleApproval(route._id, true )}
            >
              Approve
            </button>
            <button
              className="action-btn approve"
              onClick={() => handleApproval(route._id, false, "inactive")}
            >
              Reject
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="RoutePlan-page">
      <div className="routePlan-header">Route Plans</div>
      <div className="routePlan-container">
        <div className="content">
          <div className="routePlan-first-line">
            <div className="routePlan-filter">
              <div>
                <input
                  type="text"
                  placeholder="Search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="routePlan-date-filter">
                <label htmlFor="startDate">From</label>
                <input
                  type="date"
                  id="startDate"
                  value={
                    startDate
                      ? new Date(startDate).toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <label htmlFor="endDate">To</label>
                <input
                  type="date"
                  id="endDate"
                  value={
                    endDate ? new Date(endDate).toISOString().split("T")[0] : ""
                  }
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="routePlan-status-filter">
                <label htmlFor="status">Status{" "}</label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="routePlan-status-filter">
              <label htmlFor="approved">Approved{" "}</label>
                <select
                  id="approved"
                  value={approved}
                  onChange={(e) => setApproved(e.target.value)}
                >
                  <option value="">All</option>
                  <option value="true">True</option>
                  <option value="false">Fasle</option>
                </select>
              </div>
            </div>
          </div>
          <div className="routePlan-filter-dropdown">
            {/* Dynamic Dropdown from itinerary object keys */}
            {Object.keys(itinerary || {}).map((type) => {
              const filteredCount = dropdownValue?.[type]?.length || 0;

              return (
                <div
                  key={type}
                  className="dropdown"
                  ref={(el) => (dropdownRefs.current[type] = el)}
                >
                  <div
                    className="dropdown-content"
                    onClick={() => {
                      if (dropdown === type) {
                        setDropdown("");
                      } else {
                        handleDropdownClick(type); // ✅ Update position + open dropdown
                      }
                    }}
                  >
                    {type.toUpperCase()}{" "}
                    {dropdown === type ? <FaChevronUp /> : <FaChevronDown />}
                    {filteredCount > 0 && <span>({filteredCount})</span>}
                  </div>
                </div>
              );
            })}

            {/* Dropdown container */}
            {dropdown && (
              <div
                className="dropdown-container"
                style={{
                  position: "absolute",
                  top: `${dropdownStyles.top}px`,
                  left: `${dropdownStyles.left}px`,
                }}
              >
                <div className="dropdown-search">
                  <input
                    type="text"
                    placeholder="Search"
                    value={dropdownSearch}
                    onChange={(e) => setDropdownSearch(e.target.value)}
                  />
                </div>

                {/* Selected Items List */}
                {dropdownValue?.[dropdown]?.length > 0 && (
                  <div className="dropdown-selected-list">
                    {dropdownValue[dropdown].map((item, index) => (
                      <div
                        key={index}
                        className="dropdown-selected-item"
                        onClick={() => {
                          setDropdownValue((prev) => ({
                            ...prev,
                            [dropdown]: prev[dropdown].filter(
                              (i) => i !== item
                            ),
                          }));
                          handleDropdownClick(item);
                        }}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                )}

                {/* List of items based on selected dropdown type */}
                <div className="dropdown-list">
                  {(itinerary?.[dropdown] || [])
                    .filter(
                      (item) =>
                        item
                          .toLowerCase()
                          .includes(dropdownSearch.toLowerCase()) &&
                        !dropdownValue?.[dropdown]?.includes(item)
                    )
                    .map((item, index) => (
                      <div
                        key={index}
                        className="dropdown-item"
                        onClick={() =>
                          setDropdownValue((prev) => ({
                            ...prev,
                            [dropdown]: [...(prev?.[dropdown] || []), item],
                          }))
                        }
                      >
                        {item}
                      </div>
                    ))}
                  <div className="dropdown-actions">
                    <div
                      className="dropdown-item-clear-btn"
                      onClick={() =>
                        setDropdownValue((prev) => ({
                          ...prev,
                          [dropdown]: [],
                        }))
                      }
                    >
                      Clear
                    </div>
                    <div
                      className="dropdown-item-apply-btn"
                      onClick={() => {
                        setDropdown("");
                        setDropdownSearch("");
                        getRoutePlan(); // Optional callback for fetch/update
                      }}
                    >
                      Apply
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="route-cards-container">
          {routePlan.map((route) => renderRouteCard(route))}
        </div>
      </div>
    </div>
  );
}

export default RoutesPlan;
