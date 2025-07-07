import { useEffect, useState, useRef } from "react";
import "./style.scss";
import axios from "axios";
import config from "../../../config.js";
import { Link } from "react-router-dom";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { useFilters } from "../../../context/filterContext.js";
import LoadingCards from "../../../components/LoadingCards/index.js";

const backend_url = config.backend_url;

const formatValue = (value) => {
  if (value >= 10000000) {
    return (value / 10000000).toFixed(2) + " Cr";
  } else if (value >= 100000) {
    return (value / 100000).toFixed(2) + " Lakh";
  } else {
    return value;
  }
};

const DropdownItemsCards = (item) => {
  return (
    <div className="dropdown-item-cards">
      <div className="card">
        <div className="card-header">MTD</div>
        <div className="card-content blue">
          {formatValue(item.mtd_sell_out)}
        </div>
      </div>
      <div className="card">
        <div className="card-header">LMTD</div>
        <div className="card-content yellow">
          {formatValue(item.lmtd_sell_out)}
        </div>
      </div>
      <div className="card">
        <div className="card-header">% Growth</div>
        <div
          className="card-content"
          style={{ color: item.sell_out_growth < 0 ? "#FA5A7D" : "#3CD856" }}
        >
          {item.sell_out_growth}
        </div>
      </div>
    </div>
  );
};

const SalesGrowth = ({ moreFilter }) => {
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
  } = useFilters();

  const [data, setData] = useState({});
  const [position, setPosition] = useState([]);
  const [dropdown, setDropdown] = useState("");
  const [subordinate, setSubordinate] = useState([]);
  const [dropdownSearch, setDropdownSearch] = useState("");
  const [tempSelection, setTempSelection] = useState([]); // Temporary selection storage
  const dropdownRefs = useRef({});
  const dropdownContainerRef = useRef(null); // Ref for dropdown container
  const [dropdownStyles, setDropdownStyles] = useState({ top: 0, left: 0 });
  const [isLoading, setIsLoading] = useState(false);

  // Get metrics data
  const getMetrics = async () => {
    if (!startDate || !endDate) return;

    try {
      setIsLoading(true);
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
      setData(res.data.data);
    } catch (error) {
      console.log("Error fetching data: ", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get position and subordinate information
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

  // Handle radio button change
  const handleRadioChange = (e) => {
    setSelectedValue(e.target.value);
  };

  const NAVBAR_WIDTH = document.querySelector(".sidebar")?.offsetWidth || 0;

  const handleDropdownClick = (item) => {
    const element = dropdownRefs.current[item];
    if (element) {
      const rect = element.getBoundingClientRect();
      const screenWidth = window.innerWidth;
      const hasNavbar = screenWidth > 768;
      const calculatedLeft = rect.left - (hasNavbar ? NAVBAR_WIDTH : 0);

      setDropdown(item);
      setTempSelection([...dropdownValue]); // Initialize temp with current selection
      setDropdownStyles({
        top: rect.bottom + window.scrollY,
        left: Math.max(calculatedLeft, 0),
      });
    }
  };

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdown &&
        dropdownContainerRef.current &&
        !dropdownContainerRef.current.contains(event.target) &&
        !Object.values(dropdownRefs.current).some((ref) =>
          ref?.contains(event.target)
        )
      ) {
        setDropdown(""); // Close dropdown
        setDropdownSearch(""); // Clear search
        setTempSelection([...dropdownValue]); // Revert to original selection
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdown, dropdownValue]);

  // Fetch data whenever startDate, endDate, or selectedValue changes
  useEffect(() => {
    if (startDate && endDate) {
      getMetrics();
      getPositionAndSubordinate();
    }
  }, [startDate, endDate, selectedValue, dropdownValue]);

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
        ) : (
          <Link to="/salesDashboard">see more</Link>
        )}
      </div>
      {moreFilter && (
        <div className="salesGrowth-filter-dropdown">
          {position.map((item, index) => {
            const filteredCount = tempSelection
              ? tempSelection.filter((val) => val.position === item).length
              : null;

            return (
              <div
                key={index}
                className="dropdown"
                ref={(el) => (dropdownRefs.current[item] = el)}
              >
                {dropdown === item ? (
                  <div
                    className="dropdown-content"
                    onClick={() => setDropdown("")}
                  >
                    {item.toUpperCase()} <FaChevronUp />
                    {filteredCount > 0 && <span>({filteredCount})</span>}
                  </div>
                ) : (
                  <div
                    className="dropdown-content"
                    onClick={() => handleDropdownClick(item)}
                  >
                    {item.toUpperCase()} <FaChevronDown />
                    {filteredCount > 0 && <span>({filteredCount})</span>}
                  </div>
                )}
              </div>
            );
          })}
          {dropdown && (
            <div
              className="dropdown-container"
              style={{
                position: "absolute",
                top: `${dropdownStyles.top}px`,
                left: `${dropdownStyles.left}px`,
              }}
              ref={dropdownContainerRef}
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
              {tempSelection && tempSelection.length > 0 ? (
                <div className="dropdown-selected-list">
                  {tempSelection
                    .filter((item) =>
                      dropdown ? item.position === dropdown : true
                    )
                    .map((item) => (
                      <div
                        key={item.id || item.name}
                        className="dropdown-selected-item"
                        onClick={() =>
                          setTempSelection(
                            tempSelection.filter((i) => i.name !== item.name)
                          )
                        }
                      >
                        {item.name}({item.code}){DropdownItemsCards(item)}
                      </div>
                    ))}
                </div>
              ) : null}

              {/* Filter subordinate list */}
              {subordinate && subordinate.length > 0 ? (
                <div className="dropdown-list">
                  {subordinate
                    .filter(
                      (item) =>
                        (dropdown ? item.position === dropdown : true) &&
                        !tempSelection.some(
                          (selected) => selected.name === item.name
                        ) &&
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
                          setTempSelection([...tempSelection, item])
                        }
                      >
                        {item.name} ({item.code}){DropdownItemsCards(item)}
                      </div>
                    ))}
                  <div className="dropdown-actions">
                    <div
                      className="dropdown-item-clear-btn"
                      onClick={() => {
                        setTempSelection(
                          tempSelection.filter(
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
                        setDropdownValue([...tempSelection]);
                        setDropdown("");
                        setDropdownSearch("");
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
      {isLoading ? (
        <LoadingCards />
      ) : (
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
            <div className="salesGrowth-header">Growth %</div>
            <div
              className="salesGrowth-content"
              style={{ color: data.sell_in_growth < 0 ? "#FA6A7D" : "#3CD856" }}
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
            <div className="salesGrowth-header">Growth %</div>
            <div
              className="salesGrowth-content"
              style={{
                color: data.sell_out_growth < 0 ? "#FA5A7D" : "#3CD856",
              }}
            >
              {data.sell_out_growth ? `${data.sell_out_growth}%` : "-"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesGrowth;
