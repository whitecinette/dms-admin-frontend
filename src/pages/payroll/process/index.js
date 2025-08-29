import { Calculator, Clock, CreditCard, Edit3, FileText, Mail, Phone, User2 } from "lucide-react";
import './style.scss';
import React, { useState, useEffect } from "react";
import BulkSalaryManagement from "./BulkSalaryManagement";
import { LuIndianRupee } from "react-icons/lu";
import axios from "axios";
import config from "../../../config.js";

const backendUrl = config.backend_url;

const PayRollProcess = () => {
  const [expandedRows, setExpandedRows] = useState("");
  const [payrollEmployees, setPayrollEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedMonthYear, setSelectedMonthYear] = useState(() => {
    const now = new Date();
    return `${now.getMonth() + 1}-${now.getFullYear()}`;
  });
  const [status, setStatus] = useState("");
  const [selectedRows, setSelectedRows] = useState(() => new Set(payrollEmployees));

  // firm filter
  const [selectedFirms, setSelectedFirms] = useState([]);
  const [allFirms, setAllFirms] = useState([]);
  const [firmDropdownOpen, setFirmDropdownOpen] = useState(false);
  const [firmSearch, setFirmSearch] = useState("");

  useEffect(() => {
    const fetchFirms = async () => {
      try {
        const res = await axios.get(`${backendUrl}/get-firms-for-dropdown`, {
          headers: { Authorization: localStorage.getItem("authToken") },
        });
        setAllFirms(res.data.firms || []);
      } catch (err) {
        console.error("❌ Error fetching firms", err);
      }
    };
    fetchFirms();
  }, []);

  const toggleFirmSelect = (firm) => {
    if (selectedFirms.some(sf => sf.code === firm.code)) {
      setSelectedFirms(selectedFirms.filter(sf => sf.code !== firm.code));
    } else {
      setSelectedFirms([...selectedFirms, firm]);
    }
  };

  const getPayrollData = async () => {
    try {
      const [month, year] = selectedMonthYear.split("-");
      const res = await axios.get(`${backendUrl}/get-all-payrolls`, {
        params: {
          search,
          status,
          month,
          year,
          firmCodes: selectedFirms.map(f => f.code),
          page: 1,
          limit: 100,
        },
        headers: { Authorization: localStorage.getItem("authToken") },
      });
      setPayrollEmployees(res.data.data || []);
    } catch (err) {
      console.error("❌ Payroll fetch error", err);
      setPayrollEmployees([]);
    }
  };

  useEffect(() => {
    getPayrollData();
  }, [search, selectedMonthYear, status, selectedFirms]);

  const toggleRowExpansion = (id) => {
    setExpandedRows(expandedRows === id ? "" : id);
  };

  const [showEditModal, setShowEditModal] = useState(false);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    const normalized = status ? status.toLowerCase() : '';
    const baseClasses = 'status-badge';
    switch (normalized) {
      case 'paid': return `${baseClasses} status-paid`;
      case 'pending': return `${baseClasses} status-pending`;
      case 'generated': return `${baseClasses} status-generated`;
      default: return `${baseClasses} status-default`;
    }
  };

  const getStatusIcon = (status) => {
    const normalized = status ? status.toLowerCase() : '';
    switch (normalized) {
      case 'paid': return <CreditCard className="icon green" />;
      case 'pending': return <Clock className="icon orange" />;
      case 'generated': return <FileText className="icon purple" />;
      default: return <Clock className="icon gray" />;
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(new Set(payrollEmployees));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleRowSelect = (employee, e) => {
    if (e.target.closest('.action-button')) return;
    const newSelectedRows = new Set(selectedRows);
    const exists = Array.from(newSelectedRows).find(emp => emp._id === employee._id);
    if (exists) {
      newSelectedRows.delete(exists);
    } else {
      newSelectedRows.add(employee);
    }
    setSelectedRows(newSelectedRows);
  };

  const resetFilters = () => {
    setSearch("");
    setStatus("");
    setSelectedFirms([]);
    setFirmSearch("");
    setSelectedMonthYear(() => {
      const now = new Date();
      return `${now.getMonth() + 1}-${now.getFullYear()}`;
    });
  };

  return (
    <div className={"payroll-process-process"}>
      {/* Cards */}
      <div className={"payroll-process-cards"}>
        <div className={"payroll-process-card"}>
          <div className={"payroll-process-card-right"}>
            <div className={"payroll-process-card-right-top"}>Selected Employees</div>
            <div className={"payroll-process-card-right-center"}>{selectedRows.size}</div>
            <div className={"payroll-process-card-right-bottom blue"}>of {payrollEmployees.length} total</div>
          </div>
          <div className={"payroll-process-card-left-blue"}>
            <User2 className={"payroll-process-card-icon blue"} />
          </div>
        </div>
        <div className={"payroll-process-card"}>
          <div className={"payroll-process-card-right"}>
            <div className={"payroll-process-card-right-top"}>Total Amount</div>
            <div className={"payroll-process-card-right-center"}>
              {formatCurrency(
                Array.from(selectedRows).reduce(
                  (total, employee) => total + (employee.calculatedSalary || 0),
                  0
                )
              )}
            </div>
          </div>
          <div className={"payroll-process-card-left-green"}>
            <LuIndianRupee size={20} className={"payroll-process-card-icon green"} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={"payroll-process-filter-container"}>
        <div className={"payroll-process-filter"}>
          <div className={"payroll-process-search-filter"}>
            <label htmlFor={"search"}>Search</label>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name" />
          </div>

          <div className={"payroll-process-month-filter"}>
            <label>Month</label>
            <select value={selectedMonthYear} onChange={(e) => setSelectedMonthYear(e.target.value)}>
              {(() => {
                const options = [];
                const currentDate = new Date();
                const currentYear = currentDate.getFullYear();
                for (let year = currentYear - 1; year <= currentYear; year++) {
                  for (let month = 0; month < 12; month++) {
                    const date = new Date(year, month);
                    const monthName = date.toLocaleString("default", { month: "long" });
                    const value = `${month + 1}-${year}`;
                    options.push(<option key={value} value={value}>{monthName} {year}</option>);
                  }
                }
                return options;
              })()}
            </select>
          </div>

          <div className={"payroll-process-status-filter"}>
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="Pending">Pending</option>
              <option value="Generated">Generated</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          {/* Firm Multi-select */}
          <div className="payroll-process-firm-filter">
            <label>Select Firms</label>
            <div className="dropdown-header" onClick={() => setFirmDropdownOpen(!firmDropdownOpen)}>
              {selectedFirms.length > 0
                ? selectedFirms.map(f => f.name).join(", ")
                : "Select Firms"}
              <span className="caret">▼</span>
            </div>
            {firmDropdownOpen && (
              <div className="dropdown-content">
                <div className="dropdown-search">
                  <input
                    type="text"
                    placeholder="Search firms..."
                    value={firmSearch}
                    onChange={(e) => setFirmSearch(e.target.value)}
                  />
                </div>
                <div className="firms-list">
                  {allFirms
                    .filter(f => f.name.toLowerCase().includes(firmSearch.toLowerCase()))
                    .map(firm => (
                      <div
                        key={firm.code}
                        className={`firm-item ${selectedFirms.some(sf => sf.code === firm.code) ? "selected" : ""}`}
                        onClick={() => toggleFirmSelect(firm)}
                      >
                        {firm.name} ({firm.code})
                      </div>
                    ))}
                </div>
                <div className="dropdown-actions">
                  <button className="clear-btn" onClick={() => setSelectedFirms([])}>Clear</button>
                  <button className="apply-btn" onClick={() => setFirmDropdownOpen(false)}>Apply</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={"payroll-process-page-buttons"}>
          <button className={"generate-button"} onClick={() => setShowEditModal(true)}>
            <Edit3 className="icon" /> Edit Selected Payroll
          </button>
          <button className={"reset-button"} onClick={resetFilters}>
            Reset Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="payroll-process-table">
          <thead className="table-header">
            <tr>
              <th className="table-header-cell">S.No</th>
              <th className="table-header-cell checkbox">
                <input type="checkbox"
                  checked={selectedRows.size === payrollEmployees.length}
                  onChange={handleSelectAll}
                />
              </th>
              <th className="table-header-cell">Employee</th>
              <th className="table-header-cell">Firm</th>
              <th className="table-header-cell">Current Pay</th>
              <th className="table-header-cell">Status</th>
              <th className="table-header-cell">Working Days</th>
              <th className="table-header-cell">Actions</th>
            </tr>
          </thead>
          <tbody className="table-body">
            {payrollEmployees.map((employee, idx) => (
              <tr
                key={employee._id}
                className={`table-row ${Array.from(selectedRows).some(emp => emp._id === employee._id) ? 'selected' : ''}`}
                onClick={(e) => handleRowSelect(employee, e)}
              >
                <td className="table-cell">{idx + 1}</td>
                <td className="table-cell checkbox">
                  <input type="checkbox"
                    checked={Array.from(selectedRows).some(emp => emp._id === employee._id)}
                    onChange={() => {}} />
                </td>
                <td className="table-cell">
                  <div className="employee-info">
                    <div className="avatar">
                      <div className="avatar-circle">
                        <span className="avatar-initials">
                          {employee.employeeName
                            ? employee.employeeName.split(" ").map(n => n[0]).join("").slice(0, 2)
                            : "NA"}
                        </span>
                      </div>
                    </div>
                    <div className="employee-details">
                      <div className="employee-name">{employee.employeeName}</div>
                      <div className="employee-meta">{employee.code} • {employee.position}</div>
                    </div>
                  </div>
                </td>
                <td className="table-cell">{employee.firmName} ({employee.firmCode})</td>
                <td className="table-cell">
                  <div className="pay-amount">{formatCurrency(employee.net_salary)}</div>
                  <div className="pay-meta">Gross: {formatCurrency(employee.gross_salary)}</div>
                </td>
                <td className="table-cell">
                  <div className="status-container">
                    {getStatusIcon(employee.status)}
                    <span className={getStatusBadge(employee.status)}>{employee.status}</span>
                  </div>
                </td>
                <td className="table-cell">
                  <div className="working-days">
                    <span>{employee.days_present}/{employee.working_days}</span>
                    <span className="working-days-percentage">
                      {employee.working_days > 0
                        ? ((employee.days_present / employee.working_days) * 100).toFixed(0)
                        : 0}%
                    </span>
                  </div>
                </td>
                <td className="table-cell" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => toggleRowExpansion(employee._id)} className="action-button details-button">
                    {expandedRows === employee._id ? "Hide" : "Details"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showEditModal && (
        <BulkSalaryManagement
          onClose={() => setShowEditModal(false)}
          selectedEmployees={selectedRows}
        />
      )}
    </div>
  );
};

export default PayRollProcess;
