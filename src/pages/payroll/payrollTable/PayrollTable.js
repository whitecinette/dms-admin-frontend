import React, { useEffect, useRef, useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import axios from "axios";
import config from "../../../config.js";
import "./PayrollTable.scss";

const backendUrl = config.backend_url;

const PayrollTable = ({ selectedFirm, selectedMonthYear: propMonthYear, onMonthYearChange }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState("");
  const [search, setSearch] = useState("");
  const [selectedMonthYear, setSelectedMonthYear] = useState(() => {
    return propMonthYear || `${new Date().getMonth() + 1}-${new Date().getFullYear()}`;
  });
  const [status, setStatus] = useState("");
  const [payrollData, setPayrollData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [firmList, setFirmList] = useState([]);
  const [firms, setFirms] = useState([]);
  const [tempFirms, setTempFirms] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState("");
  const dropdownRef = useRef(null);

  // props change
  useEffect(() => {
    if (selectedFirm && selectedFirm.length > 0) {
      setFirms(selectedFirm);
      setTempFirms(selectedFirm);
    }
    if (propMonthYear && propMonthYear !== selectedMonthYear) {
      setSelectedMonthYear(propMonthYear);
    }
  }, [selectedFirm, propMonthYear]);

  // notify parent
  useEffect(() => {
    if (onMonthYearChange) onMonthYearChange(selectedMonthYear);
  }, [selectedMonthYear, onMonthYearChange]);

  // outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
        setTempFirms([...firms]);
        setDropdownSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [firms]);

  // fetch payrolls
  const getPayrollData = async () => {
    try {
      setIsLoading(true);
      const [month, year] = selectedMonthYear.split("-");
      const res = await axios.get(`${backendUrl}/get-all-payrolls`, {
        params: {
          search,
          status,
          firmCodes: firms.join(","),
          month,
          year,
          page: currentPage,
          limit: 10,
        },
        headers: { Authorization: localStorage.getItem("authToken") },
      });

      setPayrollData(res.data.data || []);
      setTotalRecords(res.data.pagination?.total || 0);
    } catch (error) {
      console.error("❌ Payroll fetch error:", error);
      setPayrollData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // fetch firm list
  const getFirmDropdown = async () => {
    try {
      const res = await axios.get(`${backendUrl}/get-firms-for-dropdown`, {
        headers: { Authorization: localStorage.getItem("authToken") },
      });
      setFirmList(res.data.data || []);
    } catch (err) {
      console.error("❌ Firm dropdown fetch error:", err);
    }
  };

  useEffect(() => {
    getFirmDropdown();
    getPayrollData();
  }, [firms, search, selectedMonthYear, status, currentPage]);

  // dropdown
  const handleDropdownClick = () => {
    setDropdownOpen(!dropdownOpen);
    if (!dropdownOpen) setTempFirms([...firms]);
  };
  const handleFirmSelect = (firm) => {
    if (tempFirms.includes(firm.code)) {
      setTempFirms(tempFirms.filter((c) => c !== firm.code));
    } else {
      setTempFirms([...tempFirms, firm.code]);
    }
  };
  const handleClearFirms = () => setTempFirms([]);
  const handleApplyFirms = () => {
    setFirms([...tempFirms]);
    setDropdownOpen(false);
    setDropdownSearch("");
    setCurrentPage(1);
  };
  const handleResetFilters = () => {
    setSearch("");
    setStatus("");
    setFirms([]);
    setTempFirms([]);
    setCurrentPage(1);
    const now = new Date();
    setSelectedMonthYear(`${now.getMonth() + 1}-${now.getFullYear()}`);
  };

  // pagination
  const totalPages = Math.ceil(totalRecords / 10);
  const prevPage = () => currentPage > 1 && setCurrentPage((p) => p - 1);
  const nextPage = () => currentPage < totalPages && setCurrentPage((p) => p + 1);

  // helpers
  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0, // ✅ Rounded values
    }).format(amount);

  const toggleRowExpansion = (id) => setExpandedRows(expandedRows === id ? "" : id);

  return (
    <>
      {/* filters */}
      <div className="payroll-filter-container">
        <div className="payroll-filter">
          {/* search */}
          <div className="payroll-search-filter">
            <label>Search</label>
            <input
              type="text"
              placeholder="Search by name/code/role/firm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* month */}
          <div className="payroll-month-filter">
            <label>Month</label>
            <select value={selectedMonthYear} onChange={(e) => setSelectedMonthYear(e.target.value)}>
              {(() => {
                const opts = [];
                const now = new Date();
                const cy = now.getFullYear();
                for (let y = cy - 1; y <= cy; y++) {
                  for (let m = 0; m < 12; m++) {
                    const date = new Date(y, m);
                    const mn = date.toLocaleString("default", { month: "long" });
                    opts.push(
                      <option key={`${m + 1}-${y}`} value={`${m + 1}-${y}`}>
                        {mn} {y}
                      </option>
                    );
                  }
                }
                return opts;
              })()}
            </select>
          </div>

          {/* status */}
          <div className="payroll-status-filter">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Generated">Generated</option>
            </select>
          </div>

          {/* firm dropdown */}
          <div className="custom-dropdown" ref={dropdownRef}>
            <div className="dropdown-header" onClick={handleDropdownClick}>
              {tempFirms.length > 0 ? (
                <span>{tempFirms.length} firm(s) selected</span>
              ) : (
                <span>Select Firms</span>
              )}
              {dropdownOpen ? <FaChevronUp /> : <FaChevronDown />}
            </div>
            {dropdownOpen && (
              <div className="dropdown-content">
                <div className="dropdown-search">
                  <input
                    type="text"
                    placeholder="Search firms..."
                    value={dropdownSearch}
                    onChange={(e) => setDropdownSearch(e.target.value)}
                  />
                </div>
                {firmList
                  .filter(
                    (f) =>
                      f.name.toLowerCase().includes(dropdownSearch.toLowerCase()) ||
                      f.code.toLowerCase().includes(dropdownSearch.toLowerCase())
                  )
                  .map((firm) => (
                    <div
                      key={firm.code}
                      className={`firm-item ${tempFirms.includes(firm.code) ? "selected" : ""}`}
                      onClick={() => handleFirmSelect(firm)}
                    >
                      {firm.name} ({firm.code})
                    </div>
                  ))}
                <div className="dropdown-actions">
                  <button className="clear-btn" onClick={handleClearFirms}>Clear</button>
                  <button className="apply-btn" onClick={handleApplyFirms}>Apply</button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="payroll-page-buttons">
          <button className="reset-button" onClick={handleResetFilters}>Reset Filters</button>
        </div>
      </div>

      {/* table */}
      <div className="table-container">
        <table className="payroll-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Employee Code</th>
              <th>Name</th>
              <th>Position</th>
              <th>Role</th>
              <th>Firm</th>
              <th>Month</th>
              <th>Gross</th>
              <th>Net</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payrollData.map((p, idx) => (
              <tr key={p._id}>
                <td>{(currentPage - 1) * 10 + idx + 1}</td>
                <td>{p.code}</td>
                <td>{p.employeeName}</td>
                <td>{p.position}</td>
                <td>{p.role}</td>
                <td>{p.firmName} ({p.firmCode})</td>
                <td>{p.month}-{p.year}</td>
                <td>{formatCurrency(p.gross_salary)}</td>
                <td>{formatCurrency(p.net_salary)}</td>
                <td>
                  <span className={`status-badge status-${p.status?.toLowerCase() || "default"}`}>
                    {p.status}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => toggleRowExpansion(p._id)}
                    className="action-button details-button"
                  >
                    {expandedRows === p._id ? "▲ Hide" : "▼ Details"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      <div className="pagination">
        <button onClick={prevPage} disabled={currentPage === 1}>{"<"}</button>
        <span>Page {currentPage} of {totalPages}</span>
        <button onClick={nextPage} disabled={currentPage === totalPages}>{">"}</button>
      </div>
    </>
  );
};

export default PayrollTable;
