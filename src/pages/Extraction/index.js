import React, { useEffect, useState } from "react";
import "./style.scss";
import { FaDownload, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { useFilters } from "../../context/filterContext";
import config from "../../config.js";
import axios from "axios";
import ExtractionReport from "./ExtractionReport/index.js";
import TextToggle from "../../components/toggle/index.js";
import TableBodyLoading from "../../components/tableLoading/index.js";
const backendUrl = config.backend_url;

const DealerPopUp = ({ dealer, close }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredDealers = dealer?.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="dealer-popup-overlay" onClick={close}>
      <div className="dealer-popup" onClick={(e) => e.stopPropagation()}>
        <div className="dealer-popup-header">
          <h3>Dealer Details</h3>
          <button className="close-button" onClick={close}>
            ×
          </button>
        </div>
        <div className="dealer-popup-filters">
          <input
            type="text"
            placeholder="Search by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="status-select"
          >
            <option value="all">All Status</option>
            <option value="done">Done</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div className="dealer-popup-content">
          <table className="dealer-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Code</th>
                <th>Name</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredDealers?.map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{item.code}</td>
                  <td>{item.name}</td>
                  <td>
                    <span className={`status-badge ${item.status}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

function Extraction() {
  //   const { startDate, setStartDate, endDate, setEndDate } = useFilters();
  const [dropdown, setDropdown] = useState("");
  const [subordinate, setSubordinate] = useState([]);
  const [dropdownValue, setDropdownValue] = useState([]);
  const [dropdownSearch, setDropdownSearch] = useState("");
  const [extractionData, setExtractionData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [search, setSearch] = useState("");
  const [showDealerPopUp, setDealerPopup] = useState({
    show: false,
    dealer: [],
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // const [uploadedBy, setUpLoadedBy] = useState("");

  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 2);
    return firstDay;
  });

  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return lastDay;
  });

  const position = ["SMD", "MDD", "ASM"];

  //get Subordinate data
  const getSubordinate = async (position) => {
    try {
      const res = await axios.post(
        `${backendUrl}/admin/get-users-by-positions`,
        {
          positions: [position.toLowerCase()],
        }
      );
      setSubordinate(res.data.data);
    } catch (error) {
      console.log(error);
    }
  };

  //get extraction status
  const getExtractionStatus = async () => {
    try {
      setIsLoading(true);
      const grouped = {
        smd: dropdownValue
          .filter((item) => item.position === "SMD")
          .map((item) => item.code),
        mdd: dropdownValue
          .filter((item) => item.position === "MDD")
          .map((item) => item.code),
        asm: dropdownValue
          .filter((item) => item.position === "ASM")
          .map((item) => item.code),
      };
      const res = await axios.post(`${backendUrl}/admin/extraction-status`, {
        startDate,
        endDate,
        ...grouped,
      });

      const data = res.data.data;

      if (data.length > 0) {
        setHeaders(
          Object.keys(data[0]).filter((header) => header !== "allDealers")
        );
      }

      setExtractionData(data);
    } catch (error) {
      console.error("Error fetching extraction status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);

    const grouped = {
      smd: dropdownValue
        .filter((item) => item.position === "SMD")
        .map((item) => item.code),
      mdd: dropdownValue
        .filter((item) => item.position === "MDD")
        .map((item) => item.code),
      asm: dropdownValue
        .filter((item) => item.position === "ASM")
        .map((item) => item.code),
    };

    try {
      const response = await axios.get(
        `${backendUrl}/admin/get-extraction-records/download`,
        {
          params: {
            startDate,
            endDate,
            ...grouped,
          },
          responseType: "blob",
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );

      const contentType = response.headers["content-type"];

      // Handle JSON response (e.g., error or no data)
      if (contentType.includes("application/json")) {
        const text = await response.data.text();
        const json = JSON.parse(text);
        alert(json.message || "No data found for the selected filters.");
        return;
      }

      // Handle XLSX download
      if (
        contentType.includes(
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
      ) {
        const blob = new Blob([response.data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "extraction_records.xlsx"; // Match backend filename
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        console.error("Unexpected content type:", contentType);
        alert("Unexpected file format received. Please try again.");
      }
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download data. Please check your network or filters.");
    } finally {
      setIsDownloading(false);
    }
  };

  //get done data
  // const getExtractionDoneRecodes = async () => {
  //   try {
  //     const res = await axios.get(
  //       `${backendUrl}/admin/get-extraction-for-uploaded-by`,
  //       {
  //         startDate,
  //         endDate,
  //         uploadedBy,
  //       }
  //     );
  //     console.log(res);
  //   } catch (error) {
  //     console.log(error);
  //   }
  // };

  const formatDateForInput = (date) => {
    return date.toISOString().split("T")[0];
  };

  useEffect(() => {
    if (startDate || endDate) {
      getExtractionStatus();
    }
  }, [startDate, endDate]);

  // Handle Previous Page
  useEffect(() => {
    const filtered = extractionData.filter((row) =>
      headers.some((header) =>
        row[header]?.toString().toLowerCase().includes(search.toLowerCase())
      )
    );
    setFilteredData(filtered);
  }, [search, extractionData, headers]);

  // Remove isGraphVisible
  // const [isGraphVisible, setIsGraphVisible] = useState(false);

  // Add metric state for toggle
  const [metric, setMetric] = useState("extractionData");

  return (
    <div className="extraction-page">
      <div className="toggle">
        <TextToggle
          textFirst="extractionData"
          textSecond="extractionReport"
          setText={setMetric}
          selectedText={metric}
          classStyle={{ minWidth: "300px" }}
        />
      </div>

      {/* Toggle logic: show ExtractionReport or Extraction Data table */}
      {metric === "extractionReport" ? (
        <ExtractionReport />
      ) : (
        <>
          <div className="extraction-header">Extraction Data</div>
          <div className="table-container">
            <div className="extraction-filter">
              <div className="extraction-filter-brand">
                <div className="filter">
                  <div className="extraction-filter-search">
                    <input
                      type="text"
                      placeholder="Search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="extraction-filter-date">
                    <div className="date">
                      <label htmlFor="startDate">From:</label>
                      <input
                        type="date"
                        id="startDate"
                        name="startDate"
                        value={formatDateForInput(startDate)}
                        onChange={(e) => setStartDate(new Date(e.target.value))}
                        max={formatDateForInput(endDate)}
                      />
                    </div>
                    <div className="date">
                      <label htmlFor="endDate">To:</label>
                      <input
                        type="date"
                        id="endDate"
                        name="endDate"
                        value={formatDateForInput(endDate)}
                        onChange={(e) => setEndDate(new Date(e.target.value))}
                        min={formatDateForInput(startDate)}
                      />
                    </div>
                  </div>
                  <div className="extraction-filter-dropdown">
                    {/* Position Selection Dropdown */}
                    {position.map((item, index) => {
                      const filteredCount = dropdownValue
                        ? dropdownValue.filter((val) => val.position === item)
                            .length
                        : 0;

                      return (
                        <div key={index} className="dropdown">
                          {dropdown === item ? (
                            <div
                              className="dropdown-content"
                              onClick={() => setDropdown("")}
                            >
                              {item} <FaChevronUp />
                              {filteredCount > 0 && (
                                <span> ({filteredCount})</span>
                              )}
                            </div>
                          ) : (
                            <div
                              className="dropdown-content"
                              onClick={() => {
                                setDropdown(item);
                                getSubordinate(item); // Fetch subordinates for this position
                              }}
                            >
                              {item} <FaChevronDown />
                              {filteredCount > 0 && (
                                <span> ({filteredCount})</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Dropdown Panel */}
                    {dropdown && (
                      <div className="dropdown-container">
                        {/* Search Input */}
                        <div className="dropdown-search">
                          <input
                            type="text"
                            placeholder="Search Name"
                            value={dropdownSearch}
                            onChange={(e) => setDropdownSearch(e.target.value)}
                          />
                        </div>

                        {/* Selected Items for current position */}
                        {dropdownValue?.filter(
                          (item) => item.position === dropdown
                        ).length > 0 && (
                          <div className="dropdown-selected-list">
                            {dropdownValue
                              .filter((item) => item.position === dropdown)
                              .map((item) => (
                                <div
                                  key={`${item.position}-${item.name}`}
                                  className="dropdown-selected-item"
                                  onClick={() =>
                                    setDropdownValue(
                                      dropdownValue.filter(
                                        (i) =>
                                          !(
                                            i.name === item.name &&
                                            i.position === item.position
                                          )
                                      )
                                    )
                                  }
                                >
                                  {item.name} ({item.code})
                                </div>
                              ))}
                          </div>
                        )}

                        {/* Subordinate List */}
                        {subordinate?.length > 0 ? (
                          <div className="dropdown-list">
                            {subordinate
                              .filter(
                                (item) =>
                                  !dropdownValue.some(
                                    (selected) =>
                                      selected.name === item.name &&
                                      selected.position === dropdown
                                  ) &&
                                  (item.name
                                    .toLowerCase()
                                    .includes(dropdownSearch.toLowerCase()) ||
                                    item.code
                                      .toLowerCase()
                                      .includes(dropdownSearch.toLowerCase()))
                              )
                              .map((item, index) => (
                                <div
                                  key={index}
                                  className="dropdown-item"
                                  onClick={() =>
                                    setDropdownValue([
                                      ...dropdownValue,
                                      { ...item, position: dropdown },
                                    ])
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
                                  getExtractionStatus();
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
                <div>
                  <button
                    className="download-extraction-button"
                    onClick={handleDownload}
                  >
                    <FaDownload />
                    {isDownloading ? "Downloading..." : "Download Extraction"}
                  </button>
                </div>
              </div>
            </div>
            <div className="extraction-table-container">
              <table className="extraction-table">
                <thead>
                  <tr>
                    {headers.map((header, i) => (
                      <th key={i}>
                        {header.charAt(0).toUpperCase() + header.slice(1)}
                      </th>
                    ))}
                  </tr>
                </thead>
                {isLoading ? (
                  <TableBodyLoading columnCount={7} />
                ) : (
                  <tbody>
                    {filteredData.length > 0 ? (
                      filteredData.map((row, i) => (
                        <tr key={i}>
                          {headers.map((header, j) => (
                            <td
                              onClick={() =>
                                setDealerPopup({
                                  show: true,
                                  dealer: row["allDealers"],
                                })
                              }
                              key={j}
                            >
                              {header === "total" ||
                              header === "pending" ||
                              header === "done" ? (
                                <span
                                  className={`${
                                    header === "total"
                                      ? "total-badge"
                                      : header === "done"
                                      ? "done-badge"
                                      : header === "pending"
                                      ? "pending-badge"
                                      : ""
                                  }`}
                                >
                                  {row[header]}
                                </span>
                              ) : (
                                row[header]
                              )}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={headers.length + 1}
                          style={{ textAlign: "center" }}
                        >
                          No data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                )}
              </table>
            </div>
            {showDealerPopUp.show && (
              <DealerPopUp
                dealer={showDealerPopUp.dealer}
                close={() =>
                  setDealerPopup({
                    show: false,
                    dealer: [],
                  })
                }
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Extraction;
