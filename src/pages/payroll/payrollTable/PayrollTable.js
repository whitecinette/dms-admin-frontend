import React, { useEffect, useRef, useState } from "react";
import { payrollEmployees } from "../dummyData";
import { ChevronDown, ChevronUp, CreditCard, Clock, Mail, Phone, FileText, Calculator } from "lucide-react";
import "./PayrollTable.scss";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import axios from "axios";
import config from "../../../config.js";
import TableLoading from "../../../components/tableLoading";

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

    // Update firms and monthYear when props change
    useEffect(() => {
        if (selectedFirm && selectedFirm.length > 0) {
            setFirms(selectedFirm);
            setTempFirms(selectedFirm);
        }
        if (propMonthYear && propMonthYear !== selectedMonthYear) {
            setSelectedMonthYear(propMonthYear);
        }
    }, [selectedFirm, propMonthYear]);

    // Notify parent when selectedMonthYear changes
    useEffect(() => {
        if (onMonthYearChange) {
            onMonthYearChange(selectedMonthYear);
        }
    }, [selectedMonthYear, onMonthYearChange]);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
                setTempFirms([...firms]);
                setDropdownSearch("");
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [firms]);

    // Get payroll data
    const getPayrollData = async () => {
        try {
            setIsLoading(true);
            const response = await axios.get(`${backendUrl}/admin/get-payroll`, {
                params: {
                    search,
                    status,
                    firm: firms,
                    month: selectedMonthYear.split("-")[0],
                    year: selectedMonthYear.split("-")[1],
                    page: currentPage,
                    limit: 10,
                },
                headers: {
                    Authorization: localStorage.getItem("authToken"),
                },
            });
            setPayrollData(response.data.data);
            setTotalRecords(response.data.total);
        } catch (error) {
            console.error(error);
            setPayrollData([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Get firm dropdown
    const getFirmDropdown = async () => {
        try {
            const response = await axios.get(`${backendUrl}/get-firms-for-dropdown`, {
                headers: {
                    Authorization: localStorage.getItem("authToken"),
                },
            });
            setFirmList(response.data.data);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        console.log("firms", firms);
    }, [firms]);

    useEffect(() => {
        getFirmDropdown();
        getPayrollData();
    }, [firms, search, selectedMonthYear, status, currentPage]);

    const handleDropdownClick = (event) => {
        setDropdownOpen(!dropdownOpen);
        if (!dropdownOpen) {
            setTempFirms([...firms]);
        }
    };

    const handleFirmSelect = (firm) => {
        if (tempFirms.includes(firm.name)) {
            setTempFirms(tempFirms.filter((name) => name !== firm.name));
        } else {
            setTempFirms([...tempFirms, firm.name]);
        }
    };

    const handleClearFirms = () => {
        setTempFirms([]);
    };

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
        const defaultMonthYear = `${now.getMonth() + 1}-${now.getFullYear()}`;
        setSelectedMonthYear(defaultMonthYear);
        // No need to call onMonthYearChange here as useEffect will handle it
    };

    const totalPages = Math.ceil(totalRecords / 50);

    const prevPage = () => {
        if (currentPage > 1) {
            setCurrentPage((prev) => prev - 1);
        }
    };

    const nextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage((prev) => prev + 1);
        }
    };

    const toggleRowExpansion = (id) => {
        if (expandedRows === id) {
            setExpandedRows("");
        } else {
            setExpandedRows(id);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
        }).format(amount);
    };

    const getStatusBadge = (status) => {
        const baseClasses = "status-badge";
        switch (status) {
            case "Paid":
                return `${baseClasses} status-paid`;
            case "Pending":
                return `${baseClasses} status-pending`;
            case "Generated":
                return `${baseClasses} status-generated`;
            default:
                return `${baseClasses} status-default`;
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case "Paid":
                return <CreditCard className="icon green" />;
            case "Pending":
                return <Clock className="icon orange" />;
            case "Generated":
                return <FileText className="icon purple" />;
            default:
                return <Clock className="icon gray" />;
        }
    };

    return (
        <>
            <div className={"payroll-filter-container"}>
                <div className={"payroll-filter"}>
                    <div className={"payroll-search-filter"}>
                        <label htmlFor={"search"}>Search</label>
                        <input
                            type={"text"}
                            name={"search"}
                            id={"search"}
                            placeholder={"Search by name"}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className={"payroll-month-filter"}>
                        <label htmlFor={"month"}>Month</label>
                        <select
                            value={selectedMonthYear}
                            onChange={(e) => setSelectedMonthYear(e.target.value)}
                        >
                            {(() => {
                                const options = [];
                                const currentDate = new Date();
                                const currentYear = currentDate.getFullYear();

                                for (let year = currentYear - 1; year <= currentYear; year++) {
                                    for (let month = 0; month < 12; month++) {
                                        const date = new Date(year, month);
                                        const monthName = date.toLocaleString("default", {
                                            month: "long",
                                        });
                                        const value = `${month + 1}-${year}`;
                                        options.push(
                                            <option key={value} value={value}>
                                                {monthName} {year}
                                            </option>
                                        );
                                    }
                                }
                                return options;
                            })()}
                        </select>
                    </div>
                    <div className={"payroll-status-filter"}>
                        <label htmlFor={"status"}>Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <option value={""}>All</option>
                            <option value={"Paid"}>Paid</option>
                            <option value={"Pending"}>Pending</option>
                            <option value={"Generated"}>Generated</option>
                        </select>
                    </div>
                    <div className="custom-dropdown" ref={dropdownRef}>
                        <div className="dropdown-header" onClick={handleDropdownClick}>
                            {tempFirms.length > 0 ? (
                                <span>
                  {tempFirms.length} firm{tempFirms.length > 1 ? "s" : ""} selected
                </span>
                            ) : (
                                <span>Select Firms</span>
                            )}
                            {dropdownOpen ? <FaChevronUp /> : <FaChevronDown />}
                        </div>
                        {dropdownOpen && (
                            <div className="dropdown-content" style={{ position: "absolute" }}>
                                <div className="dropdown-search">
                                    <input
                                        type="text"
                                        placeholder="Search firms..."
                                        value={dropdownSearch}
                                        onChange={(e) => setDropdownSearch(e.target.value)}
                                    />
                                </div>
                                {tempFirms.length > 0 && (
                                    <div className="selected-firms">
                                        {firmList
                                            .filter((firm) => tempFirms.includes(firm.name))
                                            .map((firm) => (
                                                <div
                                                    key={firm._id}
                                                    className="selected-firm-item"
                                                    onClick={() => handleFirmSelect(firm)}
                                                >
                                                    {firm.name}
                                                </div>
                                            ))}
                                    </div>
                                )}
                                <div className="firms-list">
                                    {firmList
                                        .filter(
                                            (firm) =>
                                                !tempFirms.includes(firm.name) &&
                                                firm.name.toLowerCase().includes(dropdownSearch.toLowerCase())
                                        )
                                        .map((firm) => (
                                            <div
                                                key={firm._id}
                                                className="firm-item"
                                                onClick={() => handleFirmSelect(firm)}
                                            >
                                                {firm.name}
                                            </div>
                                        ))}
                                </div>
                                <div className="dropdown-actions">
                                    <button className="clear-btn" onClick={handleClearFirms}>
                                        Clear
                                    </button>
                                    <button className="apply-btn" onClick={handleApplyFirms}>
                                        Apply
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className={"payroll-page-buttons"}>
                    <button className={"reset-button"} onClick={handleResetFilters}>
                        Reset Filters
                    </button>
                </div>
            </div>
            <div className="table-container">
                <table className="payroll-table">
                    <thead className="table-header">
                    <tr>
                        <th className="table-header-cell">
                            <span>Employee</span>
                        </th>
                        <th className="table-header-cell">
                            <span>Firm</span>
                        </th>
                        <th className="table-header-cell">
                            <span>Net Pay</span>
                        </th>
                        <th className="table-header-cell">Status</th>
                        <th className="table-header-cell">Working Days</th>
                        <th className="table-header-cell">Actions</th>
                    </tr>
                    </thead>
                    {isLoading ? (
                        <TableLoading />
                    ) : (
                        <tbody className="table-body">
                        {payrollData.length === 0 ? (
                            <tr>
                                <td className={"table-cell no-data"} colSpan="6">
                                    No data available
                                </td>
                            </tr>
                        ) : (
                            payrollData.map((employee) => (
                                <React.Fragment key={employee._id}>
                                    <tr className="table-row">
                                        <td className="table-cell">
                                            <div className="employee-info">
                                                <div className="avatar">
                                                    <div className="avatar-circle">
                              <span className="avatar-initials">
                                {employee.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .slice(0, 2)}
                              </span>
                                                    </div>
                                                </div>
                                                <div className="employee-details">
                                                    <div className="employee-name">{employee.name}</div>
                                                    <div className="employee-meta">
                                                        {employee.code} • {employee.position}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="table-cell">{employee.firm}</td>
                                        <td className="table-cell">
                                            <div className="pay-amount">{formatCurrency(employee.netPayable)}</div>
                                            <div className="pay-meta">Gross: {formatCurrency(employee.grossPay)}</div>
                                        </td>
                                        <td className="table-cell">
                                            <div className="status-container">
                                                {getStatusIcon(employee.status)}
                                                <span className={getStatusBadge(employee.status)}>
                            {employee.status}
                          </span>
                                            </div>
                                        </td>
                                        <td className="table-cell">
                                            <div className="working-days">
                          <span>
                            {employee.workingDaysCounted}/{employee.salaryDays}
                          </span>
                                                <span className="working-days-percentage">
                            {(
                                (employee.workingDaysCounted / employee.salaryDays) *
                                100
                            ).toFixed(0)}
                                                    %
                          </span>
                                            </div>
                                        </td>
                                        <td className="table-cell">
                                            {employee.status === "Pending" ? (
                                                <button className="action-button details-button">
                                                    Start Payroll Process
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => toggleRowExpansion(employee._id)}
                                                    className="action-button details-button"
                                                >
                                                    {expandedRows && expandedRows === employee._id ? "Hide" : "Details"}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                    {expandedRows && expandedRows === employee._id && (
                                        <tr className="expanded-row">
                                            <td colSpan={6} className="expanded-content">
                                                <div className="expanded-grid">
                                                    <div className="section">
                                                        <h4 className="section-title">
                                                            <Mail className="section-icon" />
                                                            Contact Information
                                                        </h4>
                                                        <div className="section-content">
                                                            <div className="info-item">
                                                                <Mail className="info-icon" />
                                                                <span>{employee.email}</span>
                                                            </div>
                                                            <div className="info-item">
                                                                <Phone className="info-icon" />
                                                                <span>{employee.phone}</span>
                                                            </div>
                                                            <div className="info-item">
                                                                <CreditCard className="info-icon" />
                                                                <span>{employee.bankAccount}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="section">
                                                        <h4 className="section-title">
                                                            <Calculator className="section-icon" />
                                                            Salary Breakdown
                                                        </h4>
                                                        <div className="section-content">
                                                            <div className="info-item">
                                                                <span className="info-label">Base Salary:</span>
                                                                <span className="info-value">
                                    {formatCurrency(employee.salaryDetails.baseSalary)}
                                  </span>
                                                            </div>
                                                            <div className="info-item">
                                                                <span className="info-label">Calculated Salary:</span>
                                                                <span className="info-value">
                                    {formatCurrency(employee.calculatedSalary)}
                                  </span>
                                                            </div>
                                                            <div className="info-item">
                                                                <span className="info-label">Gross Pay:</span>
                                                                <span className="info-value text-green-600">
                                    {formatCurrency(employee.grossPay)}
                                  </span>
                                                            </div>
                                                            <div className="info-item">
                                                                <span className="info-label">Total Deductions:</span>
                                                                <span className="info-value text-red-600">
                                    -{formatCurrency(employee.totalDeductions)}
                                  </span>
                                                            </div>
                                                            <div className="info-item border-top">
                                                                <span className="info-label font-semibold">Net Payable:</span>
                                                                <span className="info-value text-blue-600 font-bold">
                                    {formatCurrency(employee.netPayable)}
                                  </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="section">
                                                        <h4 className="section-title">Bonuses & Additions</h4>
                                                        <div className="section-content">
                                                            {employee.salaryDetails.bonuses.map((bonus, index) => (
                                                                <div key={index} className="info-item">
                                                                    <span className="info-label">{bonus.name}:</span>
                                                                    <span className="info-value text-green-600">
                                      +{formatCurrency(bonus.amount)}
                                    </span>
                                                                </div>
                                                            ))}
                                                            {employee.salaryDetails.other
                                                                .filter((item) => item.type === "addition")
                                                                .map((addition, index) => (
                                                                    <div key={index} className="info-item">
                                                                        <span className="info-label">{addition.name}:</span>
                                                                        <span className="info-value text-green-600">
                                        +{formatCurrency(addition.amount)}
                                      </span>
                                                                    </div>
                                                                ))}
                                                            {employee.salaryDetails.reimbursedExpenses > 0 && (
                                                                <div className="info-item">
                                                                    <span className="info-label">Reimbursements:</span>
                                                                    <span className="info-value text-green-600">
                                      +{formatCurrency(employee.salaryDetails.reimbursedExpenses)}
                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="section">
                                                        <h4 className="section-title">Deductions</h4>
                                                        <div className="section-content">
                                                            {employee.salaryDetails.deductions
                                                                .filter((deduction) => deduction.isActive)
                                                                .map((deduction, index) => (
                                                                    <div key={index} className="info-item">
                                      <span className="info-label">
                                        {deduction.name} (
                                          {deduction.type === "percentage"
                                              ? `${deduction.value}%`
                                              : formatCurrency(deduction.value)}
                                          ):
                                      </span>
                                                                        <span className="info-value text-red-600">
                                        -{formatCurrency(
                                                                            deduction.type === "percentage"
                                                                                ? (employee.calculatedSalary * deduction.value) / 100
                                                                                : deduction.value
                                                                        )}
                                      </span>
                                                                    </div>
                                                                ))}
                                                            {employee.salaryDetails.other
                                                                .filter((item) => item.type === "deduction")
                                                                .map((deduction, index) => (
                                                                    <div key={index} className="info-item">
                                                                        <span className="info-label">{deduction.name}:</span>
                                                                        <span className="info-value text-red-600">
                                        -{formatCurrency(deduction.amount)}
                                      </span>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    </div>
                                                    {(employee.carryForward.pendingSalary > 0 ||
                                                        employee.carryForward.unpaidExpenses > 0) && (
                                                        <div className="section full-width">
                                                            <h4 className="section-title">Carry Forward</h4>
                                                            <div className="section-content grid-2">
                                                                {employee.carryForward.pendingSalary > 0 && (
                                                                    <div className="info-item">
                                                                        <span className="info-label">Pending Salary:</span>
                                                                        <span className="info-value text-blue-600">
                                        {formatCurrency(employee.carryForward.pendingSalary)}
                                      </span>
                                                                    </div>
                                                                )}
                                                                {employee.carryForward.unpaidExpenses > 0 && (
                                                                    <div className="info-item">
                                                                        <span className="info-label">Unpaid Expenses:</span>
                                                                        <span className="info-value text-orange-600">
                                        {formatCurrency(employee.carryForward.unpaidExpenses)}
                                      </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {employee.carryForward.remarks && (
                                                                <div className="info-item">
                                                                    <span className="info-label">Remarks: </span>
                                                                    <span className="info-value">
                                      {employee.carryForward.remarks}
                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    <div className="section full-width additional-info">
                                                        <div className="grid-3">
                                                            <div>
                                                                <span className="info-label">Salary Month: </span>
                                                                <span className="info-value">{employee.salaryMonth}</span>
                                                            </div>
                                                            <div>
                                                                <span className="info-label">Created By: </span>
                                                                <span className="info-value">{employee.createdBy}</span>
                                                            </div>
                                                            {employee.payslipUrl && (
                                                                <div>
                                                                    <a
                                                                        href={employee.payslipUrl}
                                                                        className="payslip-link"
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                    >
                                                                        <FileText className="info-icon" />
                                                                        <span>View Payslip</span>
                                                                    </a>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {employee.remarks && (
                                                            <div className="info-item">
                                                                <span className="info-label">Remarks: </span>
                                                                <span className="info-value">{employee.remarks}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))
                        )}
                        </tbody>
                    )}
                </table>
            </div>
            <div className="pagination" style={{ marginBottom: "1rem" }}>
                <button
                    onClick={prevPage}
                    className="page-btn"
                    disabled={currentPage === 1}
                >
                    {"<"}
                </button>
                <span>
          Page {currentPage} of {totalPages}
        </span>
                <button
                    onClick={nextPage}
                    className="page-btn"
                    disabled={currentPage === totalPages}
                >
                    {">"}
                </button>
            </div>
        </>
    );
};

export default PayrollTable;