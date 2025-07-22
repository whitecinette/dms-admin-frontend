import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import config from "../../config";
import axios from "axios";
import { FaChevronUp, FaChevronDown } from "react-icons/fa";
import "./style.scss";
import { AiOutlineLoading } from "react-icons/ai";
import { FiMap } from "react-icons/fi";
import LoadingCards from "../../components/LoadingCards";
import NoCardsFound from "../../components/NoCardsFound";
import TextToggle from "../../components/toggle";
import { MdDelete } from "react-icons/md";
import { FaLocationDot } from "react-icons/fa6";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const GraphComponent = ({ done = 0, pending = 0, total = 0 }) => {
  // Ensure values are numbers and non-negative
  const doneValue = Number(done) || 0;
  const pendingValue = Number(pending) || 0;
  const totalValue = Number(total) || 0;

  // Calculate max for y-axis dynamically (add padding for better visuals)
  const maxScale = Math.max(doneValue, pendingValue, totalValue) * 1.2 || 10;

  const data = {
    labels: ["", ""], // Empty labels to remove default titles
    datasets: [
      {
        data: [doneValue, pendingValue],
        backgroundColor: ["#90ee90", "#ffcccc"],
        borderColor: ["#90ee90", "#ffcccc"],
        borderWidth: 1,
        barPercentage: 0.6, // Adjust bar width to match image
        categoryPercentage: 0.8,
      },
    ],
  };

  const options = {
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: "#000",
        titleColor: "#fff",
        bodyColor: "#fff",
        borderColor: "#374151",
        borderWidth: 1,
        cornerRadius: 6,
        zIndex: 10000,
        callbacks: {
          title: () => null, // Remove the title/header
          label: function (context) {
            const label = context.dataIndex === 0 ? "Done" : "Pending";
            return `${label}: ${context.parsed.y}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          display: false, // Hide x-axis labels
        },
      },
      y: {
        beginAtZero: true,
        max: maxScale,
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          display: false, // Hide y-axis ticks
        },
      },
    },
    
    maintainAspectRatio: false,
    responsive: true,
  };

  return (
    <div style={{ height: "80px", width: "100px", position: "relative"}}>
      <div style={{ display: "flex", alignItems: "center", marginRight: "20px", width: "100px", height: "60px" }}>
        <Bar data={data} options={options} />
      </div>
      <div style={{ color: "#666", fontSize: "12px" }}>Total: {totalValue}</div>
    </div>
  );
};

const backend_url = config.backend_url;

function RoutesPlan() {
  const location = useLocation();
  const navigate = useNavigate();
  const [successMsg, setSuccessMsg] = useState("");
  const [messageType, setMessageType] = useState(""); // ✅ new
  // Parse query parameters from the URL
  const queryParams = new URLSearchParams(location.search);
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

  const [search, setSearch] = useState(initialSearch);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [status, setStatus] = useState("");
  const [approved, setApproved] = useState("");
  const [routePlan, setRoutePlan] = useState([]);
  const [itinerary, setItinerary] = useState([]);
  const [dropdown, setDropdown] = useState("");
  const [dropdownSearch, setDropdownSearch] = useState("");
  const [dropdownValue, setDropdownValue] = useState([]);
  const [prevDropdownValue, setPrevDropdownValue] = useState([]);
  const dropdownRefs = useRef({});
  const dropdownContainerRef = useRef(null);
  const [dropdownStyles, setDropdownStyles] = useState({ top: 0, left: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isRouteLoading, setIsRouteLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState(null);
  const [view, setView] = useState("requestedRoute");

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
        left: Math.max(calculatedLeft, 0),
      });
    }
  };

  // Update prevDropdownValue when dropdown is opened
  useEffect(() => {
    if (dropdown) {
      setPrevDropdownValue(dropdownValue);
    }
  }, [dropdown]);

  // Handle click outside to close dropdown and manage dropdownValue
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdownContainer = dropdownContainerRef.current;
      const isClickInsideDropdown =
        dropdownContainer && dropdownContainer.contains(event.target);
      const isClickInsideTrigger = Object.values(dropdownRefs.current).some(
        (ref) => ref && ref.contains(event.target)
      );

      if (!isClickInsideDropdown && !isClickInsideTrigger) {
        setDropdown("");
        setDropdownSearch("");
        // Reset to empty or restore previous state based on prevDropdownValue
        setDropdownValue((prev) => {
          if (prevDropdownValue[dropdown]?.length > 0) {
            return { ...prev, [dropdown]: prevDropdownValue[dropdown] };
          }
          return { ...prev, [dropdown]: [] };
        });
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdown, prevDropdownValue]);

  const formatDate = (dateInput) => {
    // Get only the date part to avoid time zone shift
    const datePart = dateInput?.slice(0, 10); // "YYYY-MM-DD"
    if (!datePart) return "N/A";

    const [year, month, day] = datePart.split("-");
    const dateObj = new Date(year, month - 1, day); // month is 0-indexed

    const formattedDate = dateObj.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    return formattedDate || "N/A";
  };
  const getRequestedRoutes = async () => {
    try {
      console.log("req route");
      setIsRouteLoading(true);
      const res = await axios.get(
        `${backend_url}/get-requested-route-for-admin`,
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
          params: {
            search,
            startDate,
            endDate,
            status, // can be "requested", "approved", "rejected"
            approved,
            itinerary: JSON.stringify(dropdownValue),
          },
        }
      );
      console.log(res);
      setRoutePlan(res.data.data);
    } catch (err) {
      console.log("Error fetching requested routes", err);
    } finally {
      setIsRouteLoading(false);
    }
  };
  // const getRoutePlan = async () => {
  //   if (!startDate || !endDate) {
  //     return;
  //   }
  //   setIsRouteLoading(true);
  //   try {
  //     const res = await axios.get(`${backend_url}/admin/route-plan/get`, {
  //       headers: {
  //         Authorization: localStorage.getItem("authToken"),
  //       },
  //       params: {
  //         search,
  //         startDate,
  //         endDate,
  //         status,
  //         approved,
  //         itinerary: JSON.stringify(dropdownValue),
  //       },
  //     });
  //     setRoutePlan(res.data.data);
  //   } catch (err) {
  //     console.log(err);
  //     setRoutePlan([]);
  //   } finally {
  //     setIsRouteLoading(false);
  //   }
  // };

  const getRoutePlan = async () => {
    if (!startDate || !endDate) return;
    setIsRouteLoading(true);

    try {
      const routePlanRes = await axios.get(
        `${backend_url}/admin/route-plan/get`,
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
          params: {
            search,
            startDate,
            endDate,
            approved,
            itinerary: JSON.stringify(dropdownValue),
          },
        }
      );
      setRoutePlan(routePlanRes.data.data);

      // getRequestedRoutes(),

      // const formattedRequestedRoutes = (requestedRoutes || []).map((item) => ({
      //   ...item,
      //   approved: false,
      //   source: "requested", // 👈 add this to identify it's a requested route
      //   status: item.status,
      //   // approved: false,
      //   // status: "requested", // Custom status to differentiate
      // }));
    } catch (err) {
      console.log("Error in getRoutePlan", err);
      setRoutePlan([]);
    } finally {
      setIsRouteLoading(false);
    }
  };

  const getItinerary = async () => {
    try {
      // setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (view === "requestedRoute") {
      getRequestedRoutes();
    } else {
      getRoutePlan();
    }
  }, [view, startDate, endDate, status, approved, search]);

  useEffect(() => {
    getItinerary();
  }, []);

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
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
    setStatus("");
    setApproved("");
    setDropdownValue({});
    setPrevDropdownValue({});
    setDropdown("");
    setDropdownSearch("");
    navigate("/routePlan", { replace: true });
    getRoutePlan();
  };

  // const handleApproval = async (routeId, isApproved, status = "active") => {
  //   try {
  //     await axios.put(
  //       `${backend_url}/admin/route-plan/update/${routeId}`,
  //       { approved: isApproved, status },
  //       {
  //         headers: {
  //           Authorization: localStorage.getItem("authToken"),
  //         },
  //       }
  //     );
  //     getRoutePlan();
  //   } catch (err) {
  //     console.log(err);
  //   }
  // };

  const handleRejectRequestedRoute = async (requestId) => {
    try {
      await axios.post(
        `${backend_url}/reject-requested-route/${requestId}`,
        { status: "rejected" },
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );
      setSuccessMsg("Route Rejected Successfully");
      setMessageType("success");
      getRoutePlan(); // Refresh the list
    } catch (err) {
      console.error("Error rejecting requested route:", err);
      setSuccessMsg("Failed to reject the requested route");
    }
    setMessageType("error"); // ✅ red
  };

  const handleApproveRequestedRoute = async (requestId) => {
    try {
      const res = await axios.post(
        `${backend_url}/requested-route/approve/${requestId}`,
        {},
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );
      setSuccessMsg("Route Approved Successfully");
      setMessageType("success");
      getRoutePlan(); // refresh list
    } catch (err) {
      console.error("Error approving requested route:", err);
      const backendMsg = err.response?.data?.message;
      if (backendMsg?.includes("already exists")) {
        setSuccessMsg(`❌ Approval failed: ${backendMsg}`);
      } else {
        setSuccessMsg("❌ Failed to approve the requested route");
      }
      setMessageType("error"); // ✅ red
    }
  };

  if (isLoading) {
    return (
      <div className="RoutePlan-page">
        <div className="routePlan-header">
          <div className="toggle">
            <TextToggle
              textFirst="requestedRoute"
              textSecond="routePlan"
              setText={setView}
              selectedText={view}
              classStyle={{ minWidth: "300px" }}
            />
          </div>
        </div>
        <div className="routePlan-container">
          <div className="spinner-container">
            <AiOutlineLoading className="spinner" size={40} />
          </div>
        </div>
      </div>
    );
  }

  const handleRouteClick = (route) => {
    navigate(
      `/marketCoverage?search=${encodeURIComponent(route.EmpName)}&startDate=${
        route.startDate
      }&endDate=${route.endDate}&route=${route.id}`
    );
  };

  const renderRouteCard = (route) => {
    return (
      <div key={route.id} className="route-card">
        <div className="route-card-header">
          <div className="route-card-emp">
            <div className="route-card-emp-name">{route.EmpName}</div>
            <div className="route-card-emp-post gray">
              {route.code} | {route.position.toUpperCase()}
            </div>
          </div>

          {view === "requestedRoute" ? (
            <div className={`badge ${route.status}`}>
              <span>{route.status.toUpperCase()}</span>
            </div>
          ) : (
            <button
              className="badge delete"
              onClick={() => {
                setRouteToDelete(route.id);
                setShowDeleteModal(true);
              }}
            >
              {" "}
              <MdDelete style={{ color: "white" }} />{" "}
            </button>
          )}
        </div>
        <div className="route-card-content">
          <div className="route-card-content-icon">
            <FaLocationDot />
          </div>
          <div className="route-card-content-detail">
            <div className="route-card-content-date gray">
              {formatDate(route.endDate)}
            </div>
            <div className="route-card-content-name">{route.name}</div>
            <div className="route-card-content-town gray">
              {route.itinerary?.town?.length > 0 &&
                route.itinerary.town.join(", ")}
            </div>
          </div>
          {view === "requestedRoute" ? (
            <div className="route-card-action">
              <button
                className="action-btn reject"
                onClick={() => handleRejectRequestedRoute(route.id)}
              >
                Reject
              </button>
              <button
                className="action-btn approve"
                onClick={() => handleApproveRequestedRoute(route.id)}
              >
                Approve
              </button>
            </div>
          ) : (
            <div className="route-card-content-graph">
            <GraphComponent
              done={route.done}
              pending={route.pending}
              total={route.total}
            />
            </div>
          )}
        </div>
      </div>
    );
  };

  //   const renderRouteCard = (route) => (
  //     <div key={route.id} className="route-card">
  //       <div
  //         className="route-card-clickable"
  //         onClick={() => handleRouteClick(route)}
  //       >
  //         <div className="route-card-header">
  //           <div className="header-left">
  //             <h3>
  //               {route.EmpName} ({route.position})
  //             </h3>
  //             <div className="header-code-status">
  //               <span className="route-code">{route.code}</span>
  //               {/* {route.approved && (
  //                 <span className="approved-header">Approved</span>
  //               )} */}
  //             </div>
  //           </div>
  //           <span className={`status ${route.status}`}>{route.status}</span>
  //         </div>
  //         <div className="route-card-content">
  //           <div className="route-info">
  //             <p>
  //               <strong>Route Name:</strong> {route.name}
  //             </p>
  //             <p>
  //               <strong>Date:</strong> {formatDate(route.startDate)} -{" "}
  //               {formatDate(route.endDate)}
  //             </p>
  //           </div>
  //           <div className="route-itinerary">
  //             <h4 className="route-itinerary-header">Itinerary</h4>
  //             {route.itinerary?.district?.length > 0 && (
  //               <div className="route-itinerary-content">
  //                 <strong>District:</strong> {route.itinerary.district.join(", ")}
  //               </div>
  //             )}
  //             {route.itinerary?.zone?.length > 0 && (
  //               <div className="route-itinerary-content">
  //                 <strong>Zone:</strong> {route.itinerary.zone.join(", ")}
  //               </div>
  //             )}
  //             {route.itinerary?.taluka?.length > 0 && (
  //               <div className="route-itinerary-content">
  //                 <strong>Taluka:</strong> {route.itinerary.taluka.join(", ")}
  //               </div>
  //             )}
  //             {route.itinerary?.town?.length > 0 && (
  //               <div className="route-itinerary-content">
  //                 <strong>Town:</strong> {route.itinerary.town.join(", ")}
  //               </div>
  //             )}
  //           </div>
  //           {view === "routePlan" && (
  //             <div className="status-count">
  //               <div className="status-item">
  //                 <strong>Total:</strong>
  //                 <span className="badge total">{route.total}</span>
  //               </div>
  //               <div className="status-item">
  //                 <strong>Done:</strong>
  //                 <span className="badge done">{route.done}</span>
  //               </div>
  //               <div className="status-item">
  //                 <strong>Pending:</strong>
  //                 <span className="badge pending">{route.pending}</span>
  //               </div>
  //             </div>
  //           )}
  //         </div>
  //       </div>
  //       {/* <div className="route-card-actions">
  //         {route.approved ? (
  //           route.status === "active" ? (
  //             <button
  //               className="action-btn reject"
  //               onClick={() => handleApproval(route.id, true, "inactive")}
  //             >
  //               Change to Inactive
  //             </button>
  //           ) : (
  //             <button
  //               className="action-btn approve"
  //               onClick={() => handleApproval(route.id, true)}
  //             >
  //               Change to Active
  //             </button>
  //           )
  //         ) : (
  //           <>
  //             <button
  //               className="action-btn approve"
  //               onClick={() => handleApproval(route.id, true)}
  //             >
  //               Approve
  //             </button>
  //             <button
  //               className="action-btn reject"
  //               onClick={() => handleApproval(route.id, false, "inactive")}
  //             >
  //               Reject
  //             </button>
  //           </>
  //         )}
  //       </div> */}
  //       {/* {route.status === "requested" && (
  //   <div className="route-card-actions">
  //     {route.approved ? (
  //       route.status === "active" ? (
  //         <button
  //           className="action-btn reject"
  //           onClick={() => handleApproval(route.id, true, "inactive")}
  //         >
  //           Change to Inactive
  //         </button>
  //       ) : (
  //         <button
  //           className="action-btn approve"
  //           onClick={() => handleApproval(route.id, true)}
  //         >
  //           Change to Active
  //         </button>
  //       )
  //     ) : (
  //       <>
  //         <button
  //           className="action-btn approve"
  //           onClick={() => handleApproveRequestedRoute(route.id, true)}
  //         >
  //           Approve
  //         </button>
  //         <button
  //           className="action-btn reject"
  //           onClick={() => handleApproval(route.id, false, "inactive")}
  //         >
  //           Reject
  //         </button>
  //       </>
  //     )}
  //   </div>
  // )} */}
  //       {route.status === "requested" && (
  //         <div className="route-card-actions">
  //           <button
  //             className="action-btn approve"
  //             onClick={() => handleApproveRequestedRoute(route.id)}
  //           >
  //             Approve
  //           </button>
  //           <button
  //             className="action-btn reject"
  //             onClick={() => handleRejectRequestedRoute(route.id)}
  //           >
  //             Reject
  //           </button>
  //         </div>
  //       )}
  //       {route.status?.toLowerCase() === "approved" && (
  //         <div className="route-card-actions">
  //           <button
  //             className="action-btn delete"
  //             onClick={() => {
  //               console.log("Clicked Delete Button");
  //               setRouteToDelete(route.id);
  //               setShowDeleteModal(true);
  //             }}
  //           >
  //             Delete Route Plan
  //           </button>
  //         </div>
  //       )}
  //     </div>
  //   );

  return (
    <div className="RoutePlan-page">
      <div className="routePlan-header">
        <div className="toggle">
          <TextToggle
            textFirst="requestedRoute"
            textSecond="routePlan"
            setText={setView}
            selectedText={view}
            classStyle={{ minWidth: "300px" }}
          />
        </div>
      </div>

      {successMsg && (
        <div
          style={{
            background: messageType === "success" ? "#d4edda" : "#f8d7da",
            color: messageType === "success" ? "#155724" : "#721c24",
            padding: "10px 15px",
            borderRadius: "5px",
            margin: "10px 0",
            border: `1px solid ${
              messageType === "success" ? "#c3e6cb" : "#f5c6cb"
            }`,
            fontWeight: "500",
          }}
        >
          {successMsg}
        </div>
      )}

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
              {view === "requestedRoute" && (
                <>
                  <div className="routePlan-status-filter">
                    <label htmlFor="status">Status </label>
                    {/* <select
                      id="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="">All</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select> */}
                    <select
                      id="status"
                      value={status}
                      onChange={(e) => {
                        setStatus(e.target.value);
                        getRoutePlan(e.target.value); // fetch with selected status
                      }}
                    >
                      <option value="">All</option>
                      <option value="requested">Requested</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div className="routePlan-status-filter">
                    <label htmlFor="approved">Approved </label>
                    <select
                      id="approved"
                      value={approved}
                      onChange={(e) => setApproved(e.target.value)}
                    >
                      <option value="">All</option>
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  </div>
                </>
              )}
              <div className="routePlan-reset-filter">
                <button className="reset-btn" onClick={handleReset}>
                  Reset Filters
                </button>
              </div>
            </div>
          </div>
          <div className="routePlan-filter-dropdown">
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
                        handleDropdownClick(type);
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
            {dropdown && (
              <div
                className="dropdown-container"
                ref={dropdownContainerRef}
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
                        }}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                )}
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
                        getRoutePlan();
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
        {isRouteLoading ? (
          <LoadingCards />
        ) : routePlan.length > 0 ? (
          <div className="route-cards-container">
            {routePlan.map((route) => renderRouteCard(route))}
          </div>
        ) : (
          <NoCardsFound icon={<FiMap size={60} />} text={"No Routes Found"} />
        )}
      </div>
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Are you sure?</h3>
            <p>
              This will delete the approved route and its beat mapping data.
            </p>
            <div className="modal-buttons">
              <button
                className="confirm-btn"
                onClick={async () => {
                  try {
                    const res = await axios.delete(
                      `${backend_url}/route-plan/delete/${routeToDelete}`,
                      {
                        headers: {
                          Authorization: localStorage.getItem("authToken"),
                        },
                      }
                    );
                    setSuccessMsg("✅ Route and beat mapping deleted.");
                    setMessageType("success");
                    getRoutePlan(); // Refresh
                  } catch (err) {
                    console.error("❌ Error:", err);
                    const error = err.response?.data?.message || "Server error";
                    setSuccessMsg("❌ Failed: ", error);
                    setMessageType("error");
                  } finally {
                    setShowDeleteModal(false);
                    setRouteToDelete(null);
                  }
                }}
              >
                Yes, Delete
              </button>
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowDeleteModal(false);
                  setRouteToDelete(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoutesPlan;
