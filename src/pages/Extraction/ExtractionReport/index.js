import axios from "axios";
import { useEffect, useState, useRef } from "react";
import config from "../../../config";
import TextToggle from "../../../components/toggle";
import "./style.scss";
import TableBodyLoading from "../../../components/tableLoading";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

const backend_url = config.backend_url;

function ExtractionReport() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 2);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const [startDate, setStartDate] = useState(
    firstDay.toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(lastDay.toISOString().split("T")[0]);
  const [metric, setMetric] = useState("value");
  const [extractionReport, setExtractionReport] = useState([]);
  const [header, setHeaders] = useState([]);
  const [view, setView] = useState("default");
  const [isLoading, setIsLoading] = useState(false);
  const [hierarchy, setHierarchy] = useState({});
  const [subordinate, setSubordinate] = useState([]);
  const [position, setPosition] = useState([]);
  const [dropdown, setDropdown] = useState("");
  const [dropdownSearch, setDropdownSearch] = useState("");
  const [dropdownStyles, setDropdownStyles] = useState({ top: 0, left: 0 });
  const [dropdownValue, setDropdownValue] = useState([]);
  const [tempSelection, setTempSelection] = useState([]);
  const dropdownRefs = useRef({});
  const dropdownContainerRef = useRef(null);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownContainerRef.current &&
        !dropdownContainerRef.current.contains(event.target) &&
        !Object.values(dropdownRefs.current).some((ref) =>
          ref?.contains(event.target)
        )
      ) {
        setDropdown("");
        setDropdownSearch("");
        setTempSelection([...dropdownValue]); // Reset tempSelection to dropdownValue on close
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownValue]);

  const getExtractionReport = async () => {
    try {
      setIsLoading(true);
      const positionCodes = {};
      dropdownValue.forEach((item) => {
        if (!positionCodes[item.position]) {
          positionCodes[item.position] = [];
        }
        positionCodes[item.position].push(item.code);
      });

      const params = {
        startDate,
        endDate,
        metric,
        view,
        ...Object.fromEntries(
          Object.entries(positionCodes).map(([position, codes]) => [
            position,
            codes.join(","),
          ])
        ),
      };

      const res = await axios.get(
        `${backend_url}/get-extraction-report-for-admin`,
        {
          params,
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );

      setExtractionReport(res.data.data);
      setHeaders(Object.keys(res.data.data[0] || {}));
    } catch (err) {
      console.error("Error fetching extraction report:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHierarchy = async () => {
    try {
      const positionCodes = {};
      dropdownValue.forEach((item) => {
        if (!positionCodes[item.position]) {
          positionCodes[item.position] = [];
        }
        positionCodes[item.position].push(item.code);
      });

      const params = {
        ...Object.fromEntries(
          Object.entries(positionCodes).map(([position, codes]) => [
            position,
            codes.join(","),
          ])
        ),
      };

      const res = await axios.get(`${backend_url}/get-hierarchy-filter`, {
        params,
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });
      setHierarchy(res.data);

      const flat = [];
      const positions = [];
      Object.entries(res.data).forEach(([key, arr]) => {
        if (arr.length > 0) positions.push(key);
        arr.forEach((item) => flat.push({ ...item, position: key }));
      });
      setSubordinate(flat);
      setPosition(positions);
    } catch (err) {
      console.error("Error fetching hierarchy:", err);
    }
  };

  // Initial fetch for hierarchy
  useEffect(() => {
    fetchHierarchy();
  }, []);

  // Fetch hierarchy and report when dropdownValue or other dependencies change
  useEffect(() => {
    fetchHierarchy();
    getExtractionReport();
  }, [dropdownValue, startDate, endDate, metric, view]);

  // Ensure 'Total' is always in the header
  useEffect(() => {
    if (header.length > 0 && !header.includes("Total")) {
      setHeaders([...header, "Total"]);
    }
  }, [header]);

  const handleDropdownClick = (item) => {
    if (dropdown === item) {
      setDropdown("");
      setDropdownSearch("");
      setTempSelection([...dropdownValue]); // Reset tempSelection to dropdownValue
      return;
    }
    const element = dropdownRefs.current[item];
    if (element) {
      const rect = element.getBoundingClientRect();
      const scrollY = window.scrollY || window.pageYOffset;
      const scrollX = window.scrollX || window.pageXOffset;
      const screenWidth = window.innerWidth;
      const sidebar = document.querySelector(".sidebar");
      const NAVBAR_WIDTH = sidebar ? sidebar.offsetWidth : 0;
      let calculatedLeft = rect.left + scrollX;
      if (screenWidth > 768 && sidebar) {
        calculatedLeft = rect.left + scrollX - NAVBAR_WIDTH;
      }
      setDropdown(item);
      setDropdownSearch("");
      setTempSelection([...dropdownValue]); // Initialize tempSelection with current dropdownValue
      setDropdownStyles({
        top: rect.bottom + scrollY - 110,
        left: Math.max(calculatedLeft, 0) - 15,
      });
    }
  };
  // Helper function to parse string values to numbers when possible
  const parseNumericValue = (value) => {
    if (typeof value === "number") return value;
    if (typeof value !== "string") return NaN;

    // Remove commas and any other non-numeric characters (except decimal point)
    const numericString = value.replace(/[^0-9.-]/g, "");
    const num = parseFloat(numericString);
    return isNaN(num) ? NaN : num;
  };

// Modified heatmap color function using row-based min/max with orange shades
const getRedShadeColor = (value, rowMin, rowMax) => {
  const numValue = parseNumericValue(value);
  if (isNaN(numValue) || rowMin === rowMax) return { background: "", text: "" };

  // Normalize value between 0 and 1
  const normalized = (numValue - rowMin) / (rowMax - rowMin);

  // Use orange shades for the gradient
  // Lower values: light orange [255, 229, 204]
  // Middle values: medium orange [255, 153, 51]
  // Higher values: deep orange [204, 85, 0]

  let r, g, b;

  if (normalized < 0.5) {
    // Transition from light orange to medium orange
    const factor = normalized * 2; // Scale to 0-1 range for first half
    r = Math.floor(255);
    g = Math.floor(229 - (229 - 153) * factor);
    b = Math.floor(204 - (204 - 51) * factor);
  } else {
    // Transition from medium orange to deep orange
    const factor = (normalized - 0.5) * 2; // Scale to 0-1 range for second half
    r = Math.floor(255 - (255 - 204) * factor);
    g = Math.floor(153 - (153 - 85) * factor);
    b = Math.floor(51 - 51 * factor);
  }

  // Calculate luminance for dynamic text color
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const textColor = luminance < 0.5 ? "#ffffff" : "#333333";

  return {
    background: `rgb(${r},${g},${b})`,
    text: textColor
  };
};

// Calculate min and max values for each row
const calculateRowHeatmapRange = (row, header) => {
  let min = Infinity;
  let max = -Infinity;

  header.forEach((headerKey) => {
    if (!["Price Class", "Rank of Samsung", "Total"].includes(headerKey)) {
      const numValue = parseNumericValue(row[headerKey]);
      if (!isNaN(numValue)) {
        min = Math.min(min, numValue);
        max = Math.max(max, numValue);
      }
    }
  });

  return { min, max };
};

  // Inside your ExtractionReport component, replace the heatmap calculation and table rendering:

  // Calculate min and max values for the entire dataset (excluding special columns)
  const calculateHeatmapRange = () => {
    if (extractionReport.length === 0) return { min: 0, max: 0 };

    let min = Infinity;
    let max = -Infinity;

    extractionReport.forEach((row) => {
      header.forEach((headerKey) => {
        if (!["Price Class", "Rank of Samsung", "Total"].includes(headerKey)) {
          const numValue = parseNumericValue(row[headerKey]);
          if (!isNaN(numValue)) {
            min = Math.min(min, numValue);
            max = Math.max(max, numValue);
          }
        }
      });
    });

    return { min, max };
  };

  const { min, max } = calculateHeatmapRange();

  // Modified formatIndianNumber to handle string numbers
  const formatIndianNumber = (value) => {
    // Handle non-string/non-number values
    if (typeof value !== "string" && typeof value !== "number") return value;

    // Try to parse as number
    const num = parseNumericValue(value);
    if (isNaN(num)) return value; // Return original if not a number

    // Format as Indian number
    return num.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };
  return (
    <>
      <div className="extraction-header">Extraction Report</div>
      <div className="extraction-report-filter">
        <div className="first-line">
          <div className="filter">
            <div className="date-filter">
              <label htmlFor="startDate">From: </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <label htmlFor="endDate">To: </label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="second-line">
          <div className="extractionReport-filter-dropdown">
            {position.map((item, index) => {
              const filteredCount = dropdownValue.filter(
                (val) => val.position === item
              ).length;
              return (
                <div
                  key={item}
                  className="dropdown"
                  ref={(el) => (dropdownRefs.current[item] = el)}
                >
                  <div
                    className="dropdown-content"
                    onClick={() => handleDropdownClick(item)}
                  >
                    {item.toUpperCase()}{" "}
                    {dropdown === item ? <FaChevronUp /> : <FaChevronDown />}
                    {filteredCount > 0 && <span>({filteredCount})</span>}
                  </div>
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
                    placeholder="Search Name or Code"
                    value={dropdownSearch}
                    onChange={(e) => setDropdownSearch(e.target.value)}
                  />
                </div>

                {/* Selected Items */}
                {tempSelection.length > 0 && (
                  <div className="dropdown-selected-list">
                    {tempSelection
                      .filter((item) => item.position === dropdown)
                      .map((item) => (
                        <div
                          key={item.code}
                          className="dropdown-selected-item"
                          onClick={() =>
                            setTempSelection(
                              tempSelection.filter((i) => i.code !== item.code)
                            )
                          }
                        >
                          {item.name
                            ? `${item.name} (${item.code})`
                            : item.code}
                        </div>
                      ))}
                  </div>
                )}

                {/* Subordinate List */}
                {subordinate && subordinate.length > 0 ? (
                  <div className="dropdown-list">
                    {subordinate
                      .filter(
                        (item) =>
                          item.position === dropdown &&
                          !tempSelection.some(
                            (selected) => selected.code === item.code
                          ) &&
                          ((item.name &&
                            item.name
                              .toLowerCase()
                              .includes(dropdownSearch.toLowerCase())) ||
                            (item.code &&
                              item.code
                                .toLowerCase()
                                .includes(dropdownSearch.toLowerCase())))
                      )
                      .map((item) => (
                        <div
                          key={item.code}
                          className="dropdown-item"
                          onClick={() =>
                            setTempSelection([...tempSelection, item])
                          }
                        >
                          {item.name
                            ? `${item.name} (${item.code})`
                            : item.code}
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
        </div>
        <div className="toggle">
          <TextToggle
            textFirst="default"
            textSecond="share"
            setText={setView}
            selectedText={view}
          />
          <TextToggle
            textFirst="value"
            textSecond="volume"
            setText={setMetric}
            selectedText={metric}
          />
        </div>
      </div>
      <div className="extraction-report-table">
        <table>
          <thead>
            <tr>
              {header.map((key) => (
                <th key={key} className="heatmap-header">
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          {isLoading ? (
            <TableBodyLoading columnCount={header.length || 13} />
          ) : (
            <tbody>
              {extractionReport.length > 0 ? (
                extractionReport.map((row, i) => {
                  const { min: rowMin, max: rowMax } = calculateRowHeatmapRange(
                    row,
                    header
                  );
                  return (
                    <tr key={i}>
                      {header.map((headerKey) => {
                        const value =
                          row[headerKey] !== undefined
                            ? row[headerKey]
                            : headerKey === "Total"
                            ? "0"
                            : "";
                        const isHeatmapColumn = ![
                          "Price Class",
                          "Rank of Samsung",
                          "Total",
                        ].includes(headerKey);
                        const isNumeric = !isNaN(parseNumericValue(value));

                        const { background, text } =
                          isHeatmapColumn && isNumeric
                            ? getRedShadeColor(value, rowMin, rowMax)
                            : { background: "", text: "" };

                        return (
                          <td 
                            key={headerKey} 
                            style={{ 
                              textAlign: "center",
                              ...(isHeatmapColumn && isNumeric ? {
                                backgroundColor: background,
                                color: text,
                                fontWeight: "bold",
                                padding: "8px 5px"
                              } : {})
                            }}
                          >
                            {isHeatmapColumn && isNumeric ? (
                              view === "share" ? value : formatIndianNumber(value)
                            ) : headerKey === "Total" ? (
                              formatIndianNumber(value)
                            ) : (
                              value
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={header.length} style={{ textAlign: "center" }}>
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          )}
        </table>
      </div>
    </>
  );
}

export default ExtractionReport;
