import React, { useEffect, useState } from "react";
import BarGraph from "../../components/barGraph";
import "./style.scss";
import { FaDownload, FaGripHorizontal } from "react-icons/fa";
import { VscGraph } from "react-icons/vsc";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { useFilters } from "../../context/filterContext";
import config from "../../config.js";
import axios from "axios";
const backendUrl = config.backend_url;

function Extraction() {
  const { startDate, setStartDate, endDate, setEndDate } = useFilters();
  const [dropdown, setDropdown] = useState("");
  const [subordinate, setSubordinate] = useState([]);
  const [dropdownValue, setDropdownValue] = useState([]);
  const [dropdownSearch, setDropdownSearch] = useState("");
  const [extractionData, setExtractionData] = useState([]);
  const [isGraphVisible, setIsGraphVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [headers, setHeaders] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [search, setSearch] = useState("");
  const [uploadedBy, setUpLoadedBy] = useState("");

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
        setHeaders(Object.keys(data[0])); // set headers from first item
      }

      setExtractionData(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching extraction status:", error);
    }
  };

  const handleDownload = async () => {
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
  
      // If it's JSON, handle as error or warning
      if (contentType.includes("application/json")) {
        const text = await response.data.text(); // Read blob as text
        const json = JSON.parse(text);
        alert(json.message || "No data found for the selected filters.");
        return;
      }
  
      // Otherwise, proceed with CSV download
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "extraction_data.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download data. Please check your network or filters.");
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

  const extractionDataGraph = [
    {
      month: "Jan",
      iPhone: 320,
      Samsung: 290,
      OnePlus: 340,
      Realme: 270,
      "Google Pixel": 180,
      Motorola: 200,
      Oppo: 310,
      Vivo: 290,
      Xiaomi: 330,
    },
    {
      month: "Feb",
      iPhone: 300,
      Samsung: 260,
      OnePlus: 330,
      Realme: 280,
      "Google Pixel": 190,
      Motorola: 210,
      Oppo: 300,
      Vivo: 280,
      Xiaomi: 320,
    },
    {
      month: "Mar",
      iPhone: 280,
      Samsung: 230,
      OnePlus: 310,
      Realme: 290,
      "Google Pixel": 200,
      Motorola: 220,
      Oppo: 290,
      Vivo: 270,
      Xiaomi: 310,
    },
    {
      month: "Apr",
      iPhone: 260,
      Samsung: 220,
      OnePlus: 290,
      Realme: 300,
      "Google Pixel": 210,
      Motorola: 230,
      Oppo: 280,
      Vivo: 260,
      Xiaomi: 300,
    },
    {
      month: "May",
      iPhone: 250,
      Samsung: 300,
      OnePlus: 270,
      Realme: 310,
      "Google Pixel": 220,
      Motorola: 240,
      Oppo: 270,
      Vivo: 250,
      Xiaomi: 290,
    },
    {
      month: "Jun",
      iPhone: 290,
      Samsung: 350,
      OnePlus: 310,
      Realme: 320,
      "Google Pixel": 230,
      Motorola: 250,
      Oppo: 260,
      Vivo: 240,
      Xiaomi: 280,
    },
    {
      month: "Jul",
      iPhone: 320,
      Samsung: 400,
      OnePlus: 350,
      Realme: 330,
      "Google Pixel": 240,
      Motorola: 260,
      Oppo: 250,
      Vivo: 230,
      Xiaomi: 270,
    },
    {
      month: "Aug",
      iPhone: 330,
      Samsung: 370,
      OnePlus: 360,
      Realme: 340,
      "Google Pixel": 250,
      Motorola: 270,
      Oppo: 240,
      Vivo: 220,
      Xiaomi: 260,
    },
    {
      month: "Sep",
      iPhone: 310,
      Samsung: 340,
      OnePlus: 330,
      Realme: 350,
      "Google Pixel": 260,
      Motorola: 280,
      Oppo: 230,
      Vivo: 210,
      Xiaomi: 250,
    },
    {
      month: "Oct",
      iPhone: 290,
      Samsung: 310,
      OnePlus: 300,
      Realme: 360,
      "Google Pixel": 270,
      Motorola: 290,
      Oppo: 220,
      Vivo: 200,
      Xiaomi: 240,
    },
    {
      month: "Nov",
      iPhone: 270,
      Samsung: 280,
      OnePlus: 290,
      Realme: 370,
      "Google Pixel": 280,
      Motorola: 300,
      Oppo: 210,
      Vivo: 190,
      Xiaomi: 230,
    },
    {
      month: "Dec",
      iPhone: 250,
      Samsung: 260,
      OnePlus: 270,
      Realme: 380,
      "Google Pixel": 290,
      Motorola: 310,
      Oppo: 200,
      Vivo: 180,
      Xiaomi: 220,
    },
  ];

  useEffect(() => {
    getExtractionStatus();
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

  return (
    <div className="extraction-page">
      <div className="extraction-header">Extraction</div>
      <div className="toggle-container">
        <div
          className={`toggle-button ${!isGraphVisible ? "active" : ""}`}
          onClick={() => setIsGraphVisible(false)}
        >
          <FaGripHorizontal />
        </div>
        <div
          className={`toggle-button ${isGraphVisible ? "active" : ""}`}
          onClick={() => setIsGraphVisible(true)}
        >
          <VscGraph />
        </div>
      </div>

      {/* Conditional rendering of graph or table */}
      {isGraphVisible ? (
        <div className="graph-container">
          <BarGraph data={extractionDataGraph} />
        </div>
      ) : (
        <div className="table-container">
          <div className="extraction-filter">
            <div className="extraction-filter-date">
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

            <div className="extraction-filter-brand">
              <div className="extraction-filter-search">
                <input
                  type="text"
                  placeholder="Search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
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
                          {filteredCount > 0 && <span> ({filteredCount})</span>}
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
                          {filteredCount > 0 && <span> ({filteredCount})</span>}
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
                    {dropdownValue?.filter((item) => item.position === dropdown)
                      .length > 0 && (
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
              <div className="latestAttendance-page-button">
                <button
                  className="download-extraction-button"
                  onClick={handleDownload}
                >
                  <FaDownload />
                  Download Extraction
                </button>
              </div>
            </div>
          </div>
          <div className="extraction-table-container">
            {loading ? (
              <p>Loading...</p>
            ) : (
              <table className="extraction-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    {headers.map((header, i) => (
                      <th key={i}>
                        {header.charAt(0).toUpperCase() + header.slice(1)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length > 0 ? (
                    filteredData.map((row, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        {headers.map((header, j) => (
                          <td key={j}>{row[header]}</td>
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
              </table>
            )}
          </div>
          {/* Pagination
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
          </div> */}
        </div>
      )}
    </div>
  );
}

export default Extraction;
