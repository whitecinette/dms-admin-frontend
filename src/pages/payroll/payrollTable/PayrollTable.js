import React, { useEffect, useRef, useState } from 'react';
import { payrollEmployees } from "../dummyData";
import { ChevronDown, ChevronUp, CreditCard, Clock, Mail, Phone, FileText, Calculator } from 'lucide-react';
import './PayrollTable.scss';
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import axios from "axios";
import config from "../../../config.js";

const backendUrl = config.backend_url;

const PayrollTable = ({ showCheckbox = false }) => {
    const [expandedRows, setExpandedRows] = useState("");
    const [search, setSearch] = useState("");
    const [selectedMonthYear, setSelectedMonthYear] = useState(() => {
        const now = new Date();
        return `${now.getMonth() + 1}-${now.getFullYear()}`;
    });
    const [status, setStatus] = useState("");
    const [selectedRows, setSelectedRows] = useState(() =>
        showCheckbox ? new Set(payrollEmployees.map(emp => emp._id)) : new Set()
    );

    const toggleRowExpansion = (id) => {
        if (expandedRows === id) {
            setExpandedRows("");
        } else {
            setExpandedRows(id);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    const getStatusBadge = (status) => {
        const baseClasses = 'status-badge';
        switch (status) {
            case 'Paid':
                return `${baseClasses} status-paid`;
            case 'Pending':
                return `${baseClasses} status-pending`;
            case 'Generated':
                return `${baseClasses} status-generated`;
            default:
                return `${baseClasses} status-default`;
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Paid':
                return <CreditCard className="icon green" />;
            case 'Pending':
                return <Clock className="icon orange" />;
            case 'Generated':
                return <FileText className="icon purple" />;
            default:
                return <Clock className="icon gray" />;
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedRows(new Set(payrollEmployees.map(emp => emp._id)));
        } else {
            setSelectedRows(new Set());
        }
    };

    const handleRowSelect = (id, e) => {
        // Prevent row selection when clicking the action button
        if (e.target.closest('.action-button')) {
            return;
        }

        const newSelectedRows = new Set(selectedRows);
        if (newSelectedRows.has(id)) {
            newSelectedRows.delete(id);
        } else {
            newSelectedRows.add(id);
        }
        setSelectedRows(newSelectedRows);
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
                </div>
                <div className={"payroll-page-buttons"}>
                    <button className={"reset-button"}>
                        Reset Filters
                    </button>
                </div>
            </div>
            <div className="table-container">
                <table className="payroll-table">
                    <thead className="table-header">
                    <tr>
                        {showCheckbox && (
                            <th className="table-header-cell">
                                <input
                                    type="checkbox"
                                    checked={selectedRows.size === payrollEmployees.length}
                                    onChange={handleSelectAll}
                                />
                            </th>
                        )}
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
                    <tbody className="table-body">
                    {payrollEmployees.map((employee) => (
                        <React.Fragment key={employee._id}>
                            <tr
                                className="table-row"
                                onClick={(e) => showCheckbox && handleRowSelect(employee._id, e)}
                            >
                                {showCheckbox && (
                                    <td className="table-cell">
                                        <input
                                            type="checkbox"
                                            checked={selectedRows.has(employee._id)}
                                            onChange={() => {}}
                                        />
                                    </td>
                                )}
                                <td className="table-cell">
                                    <div className="employee-info">
                                        <div className="avatar">
                                            <div className="avatar-circle">
                                                    <span className="avatar-initials">
                                                        {employee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                    </span>
                                            </div>
                                        </div>
                                        <div className="employee-details">
                                            <div className="employee-name">{employee.name}</div>
                                            <div className="employee-meta">{employee.code} • {employee.position}</div>
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
                                        <span>{employee.workingDaysCounted}/{employee.salaryDays}</span>
                                        <span className="working-days-percentage">
                                                {((employee.workingDaysCounted / employee.salaryDays) * 100).toFixed(0)}%
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
                                            {expandedRows && expandedRows === employee._id ? 'Hide' : 'Details'}
                                        </button>
                                    )}
                                </td>
                            </tr>
                            {expandedRows && expandedRows === employee._id && (
                                <tr className="expanded-row">
                                    <td colSpan={showCheckbox ? 7 : 6} className="expanded-content">
                                        <div className="expanded-grid">
                                            {/* Contact Information */}
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
                                            {/* Salary Breakdown */}
                                            <div className="section">
                                                <h4 className="section-title">
                                                    <Calculator className="section-icon" />
                                                    Salary Breakdown
                                                </h4>
                                                <div className="section-content">
                                                    <div className="info-item">
                                                        <span className="info-label">Base Salary:</span>
                                                        <span className="info-value">{formatCurrency(employee.salaryDetails.baseSalary)}</span>
                                                    </div>
                                                    <div className="info-item">
                                                        <span className="info-label">Calculated Salary:</span>
                                                        <span className="info-value">{formatCurrency(employee.calculatedSalary)}</span>
                                                    </div>
                                                    <div className="info-item">
                                                        <span className="info-label">Gross Pay:</span>
                                                        <span className="info-value text-green-600">{formatCurrency(employee.grossPay)}</span>
                                                    </div>
                                                    <div className="info-item">
                                                        <span className="info-label">Total Deductions:</span>
                                                        <span className="info-value text-red-600">-{formatCurrency(employee.totalDeductions)}</span>
                                                    </div>
                                                    <div className="info-item border-top">
                                                        <span className="info-label font-semibold">Net Payable:</span>
                                                        <span className="info-value text-blue-600 font-bold">{formatCurrency(employee.netPayable)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Bonuses & Additions */}
                                            <div className="section">
                                                <h4 className="section-title">Bonuses & Additions</h4>
                                                <div className="section-content">
                                                    {employee.salaryDetails.bonuses.map((bonus, index) => (
                                                        <div key={index} className="info-item">
                                                            <span className="info-label">{bonus.name}:</span>
                                                            <span className="info-value text-green-600">+{formatCurrency(bonus.amount)}</span>
                                                        </div>
                                                    ))}
                                                    {employee.salaryDetails.other
                                                        .filter(item => item.type === 'addition')
                                                        .map((addition, index) => (
                                                            <div key={index} className="info-item">
                                                                <span className="info-label">{addition.name}:</span>
                                                                <span className="info-value text-green-600">+{formatCurrency(addition.amount)}</span>
                                                            </div>
                                                        ))}
                                                    {employee.salaryDetails.reimbursedExpenses > 0 && (
                                                        <div className="info-item">
                                                            <span className="info-label">Reimbursements:</span>
                                                            <span className="info-value text-green-600">+{formatCurrency(employee.salaryDetails.reimbursedExpenses)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Deductions */}
                                            <div className="section">
                                                <h4 className="section-title">Deductions</h4>
                                                <div className="section-content">
                                                    {employee.salaryDetails.deductions
                                                        .filter(deduction => deduction.isActive)
                                                        .map((deduction, index) => (
                                                            <div key={index} className="info-item">
                                                                    <span className="info-label">
                                                                        {deduction.name} ({deduction.type === 'percentage' ? `${deduction.value}%` : formatCurrency(deduction.value)}):
                                                                    </span>
                                                                <span className="info-value text-red-600">
                                                                        -{formatCurrency(
                                                                    deduction.type === 'percentage'
                                                                        ? (employee.calculatedSalary * deduction.value) / 100
                                                                        : deduction.value
                                                                )}
                                                                    </span>
                                                            </div>
                                                        ))}
                                                    {employee.salaryDetails.other
                                                        .filter(item => item.type === 'deduction')
                                                        .map((deduction, index) => (
                                                            <div key={index} className="info-item">
                                                                <span className="info-label">{deduction.name}:</span>
                                                                <span className="info-value text-red-600">-{formatCurrency(deduction.amount)}</span>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                            {/* Carry Forward */}
                                            {(employee.carryForward.pendingSalary > 0 || employee.carryForward.unpaidExpenses > 0) && (
                                                <div className="section full-width">
                                                    <h4 className="section-title">Carry Forward</h4>
                                                    <div className="section-content grid-2">
                                                        {employee.carryForward.pendingSalary > 0 && (
                                                            <div className="info-item">
                                                                <span className="info-label">Pending Salary:</span>
                                                                <span className="info-value text-blue-600">{formatCurrency(employee.carryForward.pendingSalary)}</span>
                                                            </div>
                                                        )}
                                                        {employee.carryForward.unpaidExpenses > 0 && (
                                                            <div className="info-item">
                                                                <span className="info-label">Unpaid Expenses:</span>
                                                                <span className="info-value text-orange-600">{formatCurrency(employee.carryForward.unpaidExpenses)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {employee.carryForward.remarks && (
                                                        <div className="info-item">
                                                            <span className="info-label">Remarks: </span>
                                                            <span className="info-value">{employee.carryForward.remarks}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {/* Additional Info */}
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
                    ))}
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default PayrollTable;