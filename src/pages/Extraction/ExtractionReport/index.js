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
  const [isDownloadingExtraction, setIsDownloadingExtraction] = useState(false);

  const [downloadMonth, setDownloadMonth] = useState(today.getMonth() + 1);
  const [downloadYear, setDownloadYear] = useState(today.getFullYear());

  const dropdownRefs = useRef({});
  const dropdownContainerRef = useRef(null);

  const monthOptions = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const yearOptions = Array.from({ length: 6 }, (_, i) => today.getFullYear() - 3 + i);

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
        setTempSelection([...dropdownValue]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownValue]);

  const getPositionCodes = () => {
    const positionCodes = {};

    dropdownValue.forEach((item) => {
      if (!positionCodes[item.position]) {
        positionCodes[item.position] = [];
      }
      positionCodes[item.position].push(item.code);
    });

    return positionCodes;
  };

  const getExtractionReport = async () => {
    try {
      setIsLoading(true);

      const positionCodes = getPositionCodes();

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

      setExtractionReport(res.data.data || []);
      setHeaders(Object.keys(res.data.data?.[0] || {}));
    } catch (err) {
      console.error("Error fetching extraction report:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHierarchy = async () => {
    try {
      const positionCodes = getPositionCodes();

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

  const handleDownloadExtraction = async () => {
    try {
      setIsDownloadingExtraction(true);

      const positionCodes = getPositionCodes();

      const payload = {
        month: Number(downloadMonth),
        year: Number(downloadYear),
        ...positionCodes,
      };

      const response = await axios.post(
        `${backend_url}/download-extraction-month-wise-excel`,
        payload,
        {
          responseType: "blob",
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const fileName = `Extraction_Month_Wise_${String(downloadMonth).padStart(
        2,
        "0"
      )}_${downloadYear}.xlsx`;

      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading extraction file:", err);
      alert("Failed to download extraction data");
    } finally {
      setIsDownloadingExtraction(false);
    }
  };

  useEffect(() => {
    fetchHierarchy();
  }, []);

  useEffect(() => {
    fetchHierarchy();
    getExtractionReport();
  }, [dropdownValue, startDate, endDate, metric, view]);

  useEffect(() => {
    if (header.length > 0 && !header.includes("Total")) {
      setHeaders([...header, "Total"]);
    }
  }, [header]);

  const handleDropdownClick = (item) => {
    if (dropdown === item) {
      setDropdown("");
      setDropdownSearch("");
      setTempSelection([...dropdownValue]);
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
      setTempSelection([...dropdownValue]);
      setDropdownStyles({
        top: rect.bottom + scrollY - 110,
        left: Math.max(calculatedLeft, 0) - 15,
      });
    }
  };

  const parseNumericValue = (value) => {
    if (typeof value === "number") return value;
    if (typeof value !== "string") return NaN;

    const numericString = value.replace(/[^0-9.-]/g, "");
    const num = parseFloat(numericString);
    return isNaN(num) ? NaN : num;
  };

  const getRedShadeColor = (value, rowMin, rowMax) => {
    const numValue = parseNumericValue(value);
    if (isNaN(numValue) || rowMin === rowMax) return { background: "", text: "" };

    const normalized = (numValue - rowMin) / (rowMax - rowMin);

    let r, g, b;

    if (normalized < 0.5) {
      const factor = normalized * 2;
      r = Math.floor(255);
      g = Math.floor(229 - (229 - 153) * factor);
      b = Math.floor(204 - (204 - 51) * factor);
    } else {
      const factor = (normalized - 0.5) * 2;
      r = Math.floor(255 - (255 - 204) * factor);
      g = Math.floor(153 - (153 - 85) * factor);
      b = Math.floor(51 - 51 * factor);
    }

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const textColor = luminance < 0.5 ? "#ffffff" : "#333333";

    return {
      background: `rgb(${r},${g},${b})`,
      text: textColor,
    };
  };

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

  const formatIndianNumber = (value) => {
    if (typeof value !== "string" && typeof value !== "number") return value;

    const num = parseNumericValue(value);
    if (isNaN(num)) return value;

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
            {position.map((item) => {
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
                          {item.name ? `${item.name} (${item.code})` : item.code}
                        </div>
                      ))}
                  </div>
                )}

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
                          {item.name ? `${item.name} (${item.code})` : item.code}
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

        <div
          className="toggle"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
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

          <div
            className="download-extraction-controls"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
              marginLeft: "auto",
            }}
          >
            <select
              value={downloadMonth}
              onChange={(e) => setDownloadMonth(Number(e.target.value))}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                minWidth: "140px",
              }}
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>

            <select
              value={downloadYear}
              onChange={(e) => setDownloadYear(Number(e.target.value))}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                minWidth: "100px",
              }}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleDownloadExtraction}
              disabled={isDownloadingExtraction}
              style={{
                padding: "9px 16px",
                borderRadius: "8px",
                border: "none",
                background: isDownloadingExtraction ? "#cfcfcf" : "#ff7a00",
                color: "#fff",
                cursor: isDownloadingExtraction ? "not-allowed" : "pointer",
                fontWeight: 600,
              }}
            >
              {isDownloadingExtraction
                ? "Downloading..."
                : "Download Extraction Data"}
            </button>
          </div>
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
                              ...(isHeatmapColumn && isNumeric
                                ? {
                                    backgroundColor: background,
                                    color: text,
                                    fontWeight: "bold",
                                    padding: "8px 5px",
                                  }
                                : {}),
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
                  <td colSpan={header.length || 1} style={{ textAlign: "center" }}>
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