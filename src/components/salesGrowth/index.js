import { useEffect, useState, useRef } from "react";
import "./style.scss";
import axios from "axios";
import config from "../../config.js";
import { Link } from "react-router-dom";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { useFilters } from "../../context/filterContext.js";

const backend_url = config.backend_url;

const SalesGrowth = ({ moreFilter }) => {
  // Check if it’s undefined
  const {
    selectedValue,
    setSelectedValue,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    dropdownValue,
    setDropdownValue,
    setLoading,
    loading,
  } = useFilters(); // Use context values

  const [data, setData] = useState({});
  const [position, setPosition] = useState([]);
  const [dropdown, setDropdown] = useState("");
  const [subordinate, setSubordinate] = useState([]);
  const [dropdownSearch, setDropdownSearch] = useState("");
  const dropdownRefs = useRef({}); // store refs for each dropdown]
  const [dropdownStyles, setDropdownStyles] = useState({ top: 0, left: 0 });



  //get metrics data
  const getMetrics = async () => {
    if (!startDate || !endDate) return; // Ensure both dates are set before making the API request

    try {
      const res = await axios.post(
        `${backend_url}/user/sales-data/dashboard/metrics/self`,
        {
          subordinate_codes: dropdownValue.map((item) => item.code),
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
          filter_type: selectedValue,
        },
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );
      setData(res.data.data); // Update state with the response data
    } catch (error) {
      console.log("Error fetching data: ", error);
    }
  };

  //get position and subordinate information
  const getPositionAndSubordinate = async () => {
    try {
      const res = await axios.post(
        `${backend_url}/user/get-subordinates`,
        {
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
          filter_type: selectedValue,
        },
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );
      setPosition(res.data.positions);
      setSubordinate(res.data.subordinates);
      setLoading(false);
    } catch (err) {
      console.log(err);
    }
  };

  // // Set the start and end dates for the last month
  // const getLastMonthStartAndEndDates = () => {
  //   const currentDate = new Date();
  //   currentDate.setDate(1);

  //   const startDate = new Date(currentDate);
  //   startDate.setMonth(currentDate.getMonth() - 1);

  //   const endDate = new Date(
  //     startDate.getFullYear(),
  //     startDate.getMonth() + 1,
  //     0
  //   );

  //   setStartDate(startDate);
  //   setEndDate(endDate);
  // };

  // Handle radio button change
  const handleRadioChange = (e) => {
    setSelectedValue(e.target.value);
  };
  const formatValue = (value) => {
    if (value >= 10000000) {
      return (value / 10000000).toFixed(2) + " Cr"; // Format for crores
    } else if (value >= 100000) {
      return (value / 100000).toFixed(2) + " Lakh"; // Format for lakhs
    } else {
      return value; // Return as is for smaller values
    }
  };
  const NAVBAR_WIDTH = 350;

const handleDropdownClick = (item) => {
  const element = dropdownRefs.current[item];
  if (element) {
    const rect = element.getBoundingClientRect();
    const screenWidth = window.innerWidth;

    const hasNavbar = screenWidth > 768;
    const calculatedLeft = rect.left  - (hasNavbar ? NAVBAR_WIDTH : 0);

    setDropdown(item);
    setDropdownStyles({
      top: rect.bottom + window.scrollY,
      left: Math.max(calculatedLeft, 0), // 👈 clamp to minimum 0
    });
  }
};


  // useEffect(() => {
  //   if (!startDate && !endDate) {
  //     getLastMonthStartAndEndDates(); // Set last month's dates if not already set
  //   }
  // }, []);

  // Fetch data whenever startDate or endDate changes
  useEffect(() => {
    if (startDate && endDate) {
      getMetrics(); // Call getMetrics only after dates are set
      getPositionAndSubordinate();
    }
  }, [startDate, endDate, selectedValue]); // Re-run when startDate or endDate changes

  if (moreFilter) {
    if (loading) return <p>Loading...</p>;
  }

  return (
    <div className="salesGrowth-component">
      <div className="salesGrowth-first-line">
        <div className="salesGrowth-radio-filter">
          <div className="mtd-filter">
            <input type="radio" name="MTD" value="MTD" checked />
            <label>MTD</label>
          </div>
          <div className="valueAndVolume">
            <input
              type="radio"
              name="value"
              value="value"
              checked={selectedValue === "value"}
              onChange={handleRadioChange}
            />
            <label>Value</label>

            <input
              type="radio"
              name="volume"
              value="volume"
              checked={selectedValue === "volume"}
              onChange={handleRadioChange}
            />
            <label>Volume</label>
          </div>
        </div>
        {moreFilter ? (
          <>
            <div className="salesGrowth-filter-date">
              <div className="date">
                <label>From:</label>
                <input
                  type="date"
                  name="startDate"
                  value={startDate ? startDate.toISOString().split("T")[0] : ""}
                  onChange={(e) => setStartDate(new Date(e.target.value))}
                />
              </div>
              <div className="date">
                <label>To:</label>
                <input
                  type="date"
                  name="endDate"
                  value={endDate ? endDate.toISOString().split("T")[0] : ""}
                  onChange={(e) => setEndDate(new Date(e.target.value))}
                />
              </div>
            </div>
          </>
        ) : (
          <Link to="/salesDashboard">see more</Link>
        )}
      </div>
      {moreFilter && (
        <div className="salesGrowth-filter-dropdown">
          {/* Position Selection Dropdown */}
          {position.map((item, index) => {
            const filteredCount = dropdownValue
              ? dropdownValue.filter((val) => val.position === item).length
              : null;

            return (
              <div key={index} className="dropdown" ref={(el) => (dropdownRefs.current[item] = el)}>
                {dropdown === item ? (
                  <div
                    className="dropdown-content"
                    onClick={() => setDropdown("")}
                  >
                    {item} <FaChevronUp />
                    {filteredCount > 0 && <span>({filteredCount})</span>}
                  </div>
                ) : (
                  <div
                    className="dropdown-content"
                    onClick={() => handleDropdownClick(item)}

                  >
                    {item} <FaChevronDown />
                    {filteredCount > 0 && <span>({filteredCount})</span>}
                  </div>
                )}
              </div>
            );
          })}
          {dropdown && (
            <div className="dropdown-container"
            style={{
              position: "absolute",
              top: `${dropdownStyles.top}px`,
              left: `${dropdownStyles.left}px`,
            }}
            >
              <div className="dropdown-search">
                <input
                  type="text"
                  placeholder="Search Name"
                  value={dropdownSearch}
                  onChange={(e) => setDropdownSearch(e.target.value)}
                />
              </div>

              {/* Selected Items List */}
              {dropdownValue && dropdownValue.length > 0 ? (
                <div className="dropdown-selected-list">
                  {dropdownValue
                    .filter((item) =>
                      dropdown ? item.position === dropdown : true
                    ) // Filter by position
                    .map((item) => (
                      <div
                        key={item.id || item.name} // Use a unique identifier instead of index
                        className="dropdown-selected-item"
                        onClick={() =>
                          setDropdownValue(
                            dropdownValue.filter((i) => i.name !== item.name)
                          )
                        }
                      >
                        {item.name}
                      </div>
                    ))}
                </div>
              ) : null}

              {/* Filter subordinate list based on selected position and remove already selected ones */}
              {subordinate && subordinate.length > 0 ? (
                <div className="dropdown-list">
                  {subordinate
                    .filter(
                      (item) =>
                        // Check if item position matches the selected dropdown position
                        (dropdown ? item.position === dropdown : true) &&
                        // Remove already selected subordinates
                        !dropdownValue.some(
                          (selected) => selected.name === item.name
                        ) &&
                        // Search by name OR code
                        ((item.name &&
                          item.name
                            .toLowerCase()
                            .includes((dropdownSearch || "").toLowerCase())) ||
                          (item.code &&
                            item.code
                              .toLowerCase()
                              .includes((dropdownSearch || "").toLowerCase())))
                    )
                    .map((item, index) => (
                      <div
                        key={index}
                        className="dropdown-item"
                        onClick={() =>
                          setDropdownValue([...dropdownValue, item])
                        }
                      >
                        {item.name} ({item.code})
                      </div>
                    ))}
                  <div className="dropdown-actions">
                    <div
                      className="dropdown-item-clear-btn"
                      onClick={() => {
                        setDropdownValue(
                          dropdownValue.filter(
                            (item) => item.position !== dropdown
                          )
                        );
                      }}
                    >
                      Clear
                    </div>
                    <div
                      className="dropdown-item-apply-btn"
                      onClick={() => {
                        setDropdown("");
                        setDropdownSearch("");
                        getMetrics();
                      }}
                    >
                      Apply
                    </div>
                  </div>
                </div>
              ) : (
                <div className="dropdown-item">No data found</div>
              )}
            </div>
          )}
        </div>
      )}
      <div className="salesGrowth-cards">
        <div
          className="salesGrowth-container"
          style={{ backgroundColor: "#F3E8FF" }}
        >
          <div className="salesGrowth-header">MTD Sell In</div>
          <div className="salesGrowth-content" style={{ color: "#BF83FF" }}>
            {formatValue(data.mtd_sell_in)}
          </div>
        </div>
        <div
          className="salesGrowth-container"
          style={{ backgroundColor: "#FFF4DE" }}
        >
          <div className="salesGrowth-header">LMTD Sell In</div>
          <div className="salesGrowth-content" style={{ color: "#f0b862" }}>
            {formatValue(data.lmtd_sell_in)}
          </div>
        </div>
        <div
          className="salesGrowth-container"
          style={{
            backgroundColor: data.sell_in_growth < 0 ? "#FFE2E5" : "#DCFCE7",
          }}
        >
          <div className="salesGrowth-header">Growth &#37;</div>
          <div
            className="salesGrowth-content"
            style={{ color: data.sell_in_growth < 0 ? "#FA5A7D" : "#3CD856" }}
          >
            {data.sell_in_growth ? `${data.sell_in_growth}%` : "-"}
          </div>
        </div>
        <div
          className="salesGrowth-container"
          style={{ backgroundColor: "#F3E8FF" }}
        >
          <div className="salesGrowth-header">MTD Sell Out</div>
          <div className="salesGrowth-content" style={{ color: "#BF83FF" }}>
            {formatValue(data.mtd_sell_out)}
          </div>
        </div>
        <div
          className="salesGrowth-container"
          style={{ backgroundColor: "#FFF4DE" }}
        >
          <div className="salesGrowth-header">LMTD Sell Out</div>
          <div className="salesGrowth-content" style={{ color: "#f0b862" }}>
            {formatValue(data.lmtd_sell_out)}
          </div>
        </div>
        <div
          className="salesGrowth-container"
          style={{
            backgroundColor: data.sell_out_growth < 0 ? "#FFE2E5" : "#DCFCE7",
          }}
        >
          <div className="salesGrowth-header">Growth &#37;</div>
          <div
            className="salesGrowth-content"
            style={{ color: data.sell_out_growth < 0 ? "#FA5A7D" : "#3CD856" }}
          >
            {data.sell_out_growth ? `${data.sell_out_growth}%` : "-"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesGrowth;
