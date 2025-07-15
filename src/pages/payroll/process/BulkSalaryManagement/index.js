import React, { useState, useEffect } from 'react';
import {
    X,
    Save,
    Calculator,
    Award,
    Minus,
    TrendingUp,
    Plus,
    Trash2,
    Copy, SearchIcon
} from 'lucide-react';
import './style.scss';

const BulkSalaryManagement = ({  onClose, selectedEmployees}) => {
    const [bulkSalaryData, setBulkSalaryData] = useState({});
    const [activeEmployeeTab, setActiveEmployeeTab] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredEmployees, setFilteredEmployees] = useState([
        ...selectedEmployees
    ]);

    // Initialize bulk salary data when component mounts or selectedEmployees changes
    useEffect(() => {
        if (selectedEmployees && selectedEmployees.size > 0) {
            const initialData = {};
            let firstEmployeeId = '';
            
            // Convert Set to array and process each employee
            Array.from(selectedEmployees).forEach((employee, index) => {
                // Use employee._id as the key
                const empId = employee._id;
                
                // Set the first employee as active
                if (index === 0) {
                    firstEmployeeId = empId;
                }
                
                // Initialize employee data with their existing salary details
                initialData[empId] = {
                    ...employee,
                    salaryDetails: {
                        ...employee.salaryDetails,
                        // Ensure arrays exist even if empty
                        bonuses: employee.salaryDetails.bonuses || [],
                        deductions: employee.salaryDetails.deductions || [],
                        increments: employee.salaryDetails.increments || [],
                        other: employee.salaryDetails.other || [],
                    },
                    // Calculate initial salary values
                    ...calculateEmployeeSalary(employee)
                };
            });
            
            setBulkSalaryData(initialData);
            
            // Set the first employee as active tab if not already set
            if (firstEmployeeId && !activeEmployeeTab) {
                setActiveEmployeeTab(firstEmployeeId);
            }
        }
    }, [selectedEmployees]);

    const onSave = (data) => {
        console.log(data);
    };
    useEffect(()=>{
        setFilteredEmployees(
            Array.from(selectedEmployees).filter((employee) =>
                employee.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    },[searchTerm])

    const calculateEmployeeSalary = (employee) => {
        // Calculate prorated base salary based on working days
        const proratedSalary = (employee.salaryDetails.baseSalary / employee.salaryDays) * employee.workingDaysCounted;

        // Add bonuses
        const totalBonuses = employee.salaryDetails.bonuses.reduce((sum, bonus) => sum + bonus.amount, 0);

        // Add increments
        const totalIncrements = employee.salaryDetails.increments.reduce((sum, increment) => sum + increment.amount, 0);

        // Add other additions
        const totalAdditions = employee.salaryDetails.other
            .filter(item => item.type === 'addition')
            .reduce((sum, item) => sum + item.amount, 0);

        // Calculate gross pay
        const grossPay = proratedSalary + totalBonuses + totalIncrements + totalAdditions + employee.salaryDetails.reimbursedExpenses + employee.carryForward.pendingSalary;

        // Calculate deductions
        let totalDeductions = 0;

        // Percentage deductions
        employee.salaryDetails.deductions
            .filter(deduction => deduction.isActive && deduction.type === 'percentage')
            .forEach(deduction => {
                totalDeductions += (proratedSalary * deduction.value) / 100;
            });

        // Fixed deductions
        employee.salaryDetails.deductions
            .filter(deduction => deduction.isActive && deduction.type === 'fixed')
            .forEach(deduction => {
                totalDeductions += deduction.value;
            });

        // Other deductions
        const otherDeductions = employee.salaryDetails.other
            .filter(item => item.type === 'deduction')
            .reduce((sum, item) => sum + item.amount, 0);

        totalDeductions += otherDeductions;

        // Calculate net payable
        const netPayable = grossPay - totalDeductions;

        return {
            calculatedSalary: proratedSalary,
            grossPay,
            totalDeductions,
            netPayable
        };
    };

    const updateEmployeeSalaryData = (employeeId, updates) => {
        setBulkSalaryData(prev => ({
            ...prev,
            [employeeId]: {
                ...prev[employeeId],
                ...updates
            }
        }));
    };

    const addBonus = (employeeId) => {
        const employee = bulkSalaryData[employeeId];
        if (employee) {
            const newBonuses = [...employee.salaryDetails.bonuses, { name: 'New Bonus', amount: 0 }];
            updateEmployeeSalaryData(employeeId, {
                salaryDetails: {
                    ...employee.salaryDetails,
                    bonuses: newBonuses
                }
            });
        }
    };

    const updateBonus = (employeeId, index, field, value) => {
        const employee = bulkSalaryData[employeeId];
        if (employee) {
            const newBonuses = [...employee.salaryDetails.bonuses];
            newBonuses[index] = { ...newBonuses[index], [field]: value };
            updateEmployeeSalaryData(employeeId, {
                salaryDetails: {
                    ...employee.salaryDetails,
                    bonuses: newBonuses
                }
            });
        }
    };

    const removeBonus = (employeeId, index) => {
        const employee = bulkSalaryData[employeeId];
        if (employee) {
            const newBonuses = employee.salaryDetails.bonuses.filter((_, i) => i !== index);
            updateEmployeeSalaryData(employeeId, {
                salaryDetails: {
                    ...employee.salaryDetails,
                    bonuses: newBonuses
                }
            });
        }
    };

    const addDeduction = (employeeId) => {
        const employee = bulkSalaryData[employeeId];
        if (employee) {
            const newDeductions = [...employee.salaryDetails.deductions, {
                name: 'New Deduction',
                type: 'fixed',
                value: 0,
                isActive: true
            }];
            updateEmployeeSalaryData(employeeId, {
                salaryDetails: {
                    ...employee.salaryDetails,
                    deductions: newDeductions
                }
            });
        }
    };

    const updateDeduction = (employeeId, index, field, value) => {
        const employee = bulkSalaryData[employeeId];
        if (employee) {
            const newDeductions = [...employee.salaryDetails.deductions];
            newDeductions[index] = { ...newDeductions[index], [field]: value };
            updateEmployeeSalaryData(employeeId, {
                salaryDetails: {
                    ...employee.salaryDetails,
                    deductions: newDeductions
                }
            });
        }
    };

    const removeDeduction = (employeeId, index) => {
        const employee = bulkSalaryData[employeeId];
        if (employee) {
            const newDeductions = employee.salaryDetails.deductions.filter((_, i) => i !== index);
            updateEmployeeSalaryData(employeeId, {
                salaryDetails: {
                    ...employee.salaryDetails,
                    deductions: newDeductions
                }
            });
        }
    };

    const addIncrement = (employeeId) => {
        const employee = bulkSalaryData[employeeId];
        if (employee) {
            const newIncrements = [...employee.salaryDetails.increments, {
                name: 'New Increment',
                amount: 0,
                type: 'one-time',
                effectiveFrom: new Date(),
                approvedBy: 'HR001'
            }];
            updateEmployeeSalaryData(employeeId, {
                salaryDetails: {
                    ...employee.salaryDetails,
                    increments: newIncrements
                }
            });
        }
    };

    const updateIncrement = (employeeId, index, field, value) => {
        const employee = bulkSalaryData[employeeId];
        if (employee) {
            const newIncrements = [...employee.salaryDetails.increments];
            newIncrements[index] = { ...newIncrements[index], [field]: value };
            updateEmployeeSalaryData(employeeId, {
                salaryDetails: {
                    ...employee.salaryDetails,
                    increments: newIncrements
                }
            });
        }
    };

    const removeIncrement = (employeeId, index) => {
        const employee = bulkSalaryData[employeeId];
        if (employee) {
            const newIncrements = employee.salaryDetails.increments.filter((_, i) => i !== index);
            updateEmployeeSalaryData(employeeId, {
                salaryDetails: {
                    ...employee.salaryDetails,
                    increments: newIncrements
                }
            });
        }
    };

    const copyToAllEmployees = (sourceEmployeeId, type) => {
        const sourceEmployee = bulkSalaryData[sourceEmployeeId];
        if (!sourceEmployee) return;

        const updates = {};
        
        // Convert selectedEmployees Set to array and iterate
        Array.from(selectedEmployees).forEach(employee => {
            const empId = employee._id;
            if (empId !== sourceEmployeeId && bulkSalaryData[empId]) {
                updates[empId] = {
                    ...bulkSalaryData[empId],
                    salaryDetails: {
                        ...bulkSalaryData[empId].salaryDetails,
                        [type]: sourceEmployee.salaryDetails[type] ? 
                            JSON.parse(JSON.stringify(sourceEmployee.salaryDetails[type])) : []
                    }
                };
                
                // Recalculate salary after updating deductions/bonuses/increments
                updates[empId] = {
                    ...updates[empId],
                    ...calculateEmployeeSalary(updates[empId])
                };
            }
        });

        setBulkSalaryData(prev => ({
            ...prev,
            ...updates
        }));
    };

    const saveBulkChanges = () => {
        onSave(bulkSalaryData);
        onClose();
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    return (
        <div className="bulk-salary-management" onClick={onClose}>
            <div className="bulk-salary-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="bulk-salary-modal-flex">
                    {/* Employee Tabs Sidebar */}
                    <div className="bulk-salary-sidebar">
                        <div className="bulk-salary-sidebar-header">
                            <h3 className="bulk-salary-sidebar-title">Selected Employees</h3>
                            <div className="bulk-salary-sidebar-subtitle">{selectedEmployees.size} employees selected</div>
                            <div className="bulk-salary-sidebar-search">
                                <input
                                    className="search-input"
                                    type="text"
                                    placeholder="Search employees..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <SearchIcon className="search-icon"/>
                            </div>
                        </div>
                        <div className="employee-list">
                            {Array.from(filteredEmployees).map((employee) => {
                                const empId = employee._id;
                                const isActive = activeEmployeeTab === empId;
                                
                                // Calculate total for this employee
                                const employeeData = bulkSalaryData[empId];
                                const total = employeeData ? 
                                    formatCurrency(employeeData.netPayable || 0) : 'Calculating...';
                                
                                return (
                                    <button
                                        key={empId}
                                        onClick={() => setActiveEmployeeTab(empId)}
                                        className={`employee-tab ${isActive ? 'active' : ''}`}
                                    >
                                        <div className="employee-tab-content">
                                            <div className="employee-avatar">
                                                <span className="avatar-text">
                                                    {employee.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="employee-info">
                                                <div className="employee-name">{employee.name}</div>
                                                <div className="employee-department">{employee.code} • {employee.firm || 'N/A'}</div>
                                                <div className="employee-salary">{total}</div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="bulk-salary-main-content">
                        {/* Header */}
                        <div className="bulk-salary-main-header">
                            <div className="bulk-salary-header-content">
                                <div>
                                    <div className="bulk-salary-header-title">Bulk Salary Management</div>
                                    <p className="bulk-salary-header-subtitle">Edit bonuses, deductions, and increments for selected employees</p>
                                </div>
                                <div className="bulk-salary-header-buttons">
                                    <button
                                        onClick={saveBulkChanges}
                                        className="save-button"
                                    >
                                        <Save className="icon" />
                                        <span>Save Changes</span>
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="close-button"
                                    >
                                        <X className="icon" />
                                        <span>Close</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="content-area">
                            {activeEmployeeTab && bulkSalaryData[activeEmployeeTab] && (
                                <div className="content-padding">
                                    <div className="content-grid">
                                        {/* Bonuses Section */}
                                        <div className="section">
                                            <div className="section-header">
                                                <h3 className="section-title">
                                                    <Award className="section-icon bonus" />
                                                    Bonuses & Incentives
                                                </h3>
                                                <div className="section-buttons">
                                                    <button
                                                        onClick={() => copyToAllEmployees(activeEmployeeTab, 'bonuses')}
                                                        className="copy-button"
                                                    >
                                                        <Copy className="copy" />
                                                        <span>Copy to All</span>
                                                    </button>
                                                    <button
                                                        onClick={() => addBonus(activeEmployeeTab)}
                                                        className="add-button bonus"
                                                    >
                                                        <Plus className="icon" />
                                                        <span>Add</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="items-list">
                                                {bulkSalaryData[activeEmployeeTab].salaryDetails.bonuses.map((bonus, index) => (
                                                    <div key={index} className="item-card bonus">
                                                        <div className="item-content">
                                                            <div>
                                                                <label className="item-label">Bonus Name</label>
                                                                <input
                                                                    type="text"
                                                                    value={bonus.name}
                                                                    onChange={(e) => updateBonus(activeEmployeeTab, index, 'name', e.target.value)}
                                                                    className="item-input"
                                                                />
                                                            </div>
                                                            <div className="item-amount">
                                                                <div className="amount-input">
                                                                    <label className="item-label">Amount</label>
                                                                    <input
                                                                        type="number"
                                                                        value={bonus.amount}
                                                                        onChange={(e) => updateBonus(activeEmployeeTab, index, 'amount', parseFloat(e.target.value) || 0)}
                                                                        className="item-input"
                                                                    />
                                                                </div>
                                                                <button
                                                                    onClick={() => removeBonus(activeEmployeeTab, index)}
                                                                    className="delete-button"
                                                                >
                                                                    <Trash2 className="icon" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Deductions Section */}
                                        <div className="section">
                                            <div className="section-header">
                                                <h3 className="section-title">
                                                    <Minus className="section-icon deduction" />
                                                    Deductions
                                                </h3>
                                                <div className="section-buttons">
                                                    <button
                                                        onClick={() => copyToAllEmployees(activeEmployeeTab, 'deductions')}
                                                        className="copy-button"
                                                    >
                                                        <Copy className="copy" />
                                                        <span>Copy to All</span>
                                                    </button>
                                                    <button
                                                        onClick={() => addDeduction(activeEmployeeTab)}
                                                        className="add-button deduction"
                                                    >
                                                        <Plus className="icon" />
                                                        <span>Add</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="items-list">
                                                {bulkSalaryData[activeEmployeeTab].salaryDetails.deductions.map((deduction, index) => (
                                                    <div key={index} className="item-card deduction">
                                                        <div className="item-content">
                                                            <div className="item-checkbox">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={deduction.isActive}
                                                                    onChange={(e) => updateDeduction(activeEmployeeTab, index, 'isActive', e.target.checked)}
                                                                    className="checkbox"
                                                                />
                                                                <label className="item-label">Active</label>
                                                            </div>
                                                            <div>
                                                                <label className="item-label">Deduction Name</label>
                                                                <input
                                                                    type="text"
                                                                    value={deduction.name}
                                                                    onChange={(e) => updateDeduction(activeEmployeeTab, index, 'name', e.target.value)}
                                                                    className="item-input"
                                                                />
                                                            </div>
                                                            <div className="item-grid">
                                                                <div>
                                                                    <label className="item-label">Type</label>
                                                                    <select
                                                                        value={deduction.type}
                                                                        onChange={(e) => updateDeduction(activeEmployeeTab, index, 'type', e.target.value)}
                                                                        className="item-input"
                                                                    >
                                                                        <option value="fixed">Fixed Amount</option>
                                                                        <option value="percentage">Percentage</option>
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="item-label">
                                                                        Value {deduction.type === 'percentage' ? '(%)' : '($)'}
                                                                    </label>
                                                                    <input
                                                                        type="number"
                                                                        value={deduction.value}
                                                                        onChange={(e) => updateDeduction(activeEmployeeTab, index, 'value', parseFloat(e.target.value) || 0)}
                                                                        className="item-input"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="item-footer">
                                                                <button
                                                                    onClick={() => removeDeduction(activeEmployeeTab, index)}
                                                                    className="delete-button"
                                                                >
                                                                    <Trash2 className="icon" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Increments Section */}
                                        <div className="section">
                                            <div className="section-header">
                                                <h3 className="section-title ">
                                                    <TrendingUp className="section-icon increment" />
                                                    Increments
                                                </h3>
                                                <div className="section-buttons">
                                                    <button
                                                        onClick={() => copyToAllEmployees(activeEmployeeTab, 'increments')}
                                                        className="copy-button"
                                                    >
                                                        <Copy className="copy" />
                                                        <span>Copy to All</span>
                                                    </button>
                                                    <button
                                                        onClick={() => addIncrement(activeEmployeeTab)}
                                                        className="add-button increment"
                                                    >
                                                        <Plus className="icon" />
                                                        <span>Add</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="items-list">
                                                {bulkSalaryData[activeEmployeeTab].salaryDetails.increments.map((increment, index) => (
                                                    <div key={index} className="item-card increment">
                                                        <div className="item-content">
                                                            <div>
                                                                <label className="item-label">Increment Name</label>
                                                                <input
                                                                    type="text"
                                                                    value={increment.name}
                                                                    onChange={(e) => updateIncrement(activeEmployeeTab, index, 'name', e.target.value)}
                                                                    className="item-input"
                                                                />
                                                            </div>
                                                            <div className="item-grid">
                                                                <div>
                                                                    <label className="item-label">Amount</label>
                                                                    <input
                                                                        type="number"
                                                                        value={increment.amount}
                                                                        onChange={(e) => updateIncrement(activeEmployeeTab, index, 'amount', parseFloat(e.target.value) || 0)}
                                                                        className="item-input"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="item-label">Type</label>
                                                                    <select
                                                                        value={increment.type}
                                                                        onChange={(e) => updateIncrement(activeEmployeeTab, index, 'type', e.target.value)}
                                                                        className="item-input"
                                                                    >
                                                                        <option value="one-time">One-time</option>
                                                                        <option value="permanent">Permanent</option>
                                                                    </select>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="item-label">Effective From</label>
                                                                <input
                                                                    type="date"
                                                                    value={new Date(increment.effectiveFrom).toISOString().split('T')[0]}
                                                                    onChange={(e) => updateIncrement(activeEmployeeTab, index, 'effectiveFrom', new Date(e.target.value))}
                                                                    className="item-input"
                                                                />
                                                            </div>
                                                            <div className="item-footer">
                                                                <button
                                                                    onClick={() => removeIncrement(activeEmployeeTab, index)}
                                                                    className="delete-button"
                                                                >
                                                                    <Trash2 className="icon" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Salary Summary */}
                                    <div className="summary-section">
                                        <h3 className="summary-title">
                                            <Calculator className="section-icon" />
                                            Salary Summary for {bulkSalaryData[activeEmployeeTab].name}
                                        </h3>

                                        {(() => {
                                            const calculations = calculateEmployeeSalary(bulkSalaryData[activeEmployeeTab]);
                                            return (
                                                <div className="summary-grid">
                                                    <div className="summary-card">
                                                        <div className="summary-label">Base Salary</div>
                                                        <div className="summary-value">
                                                            {formatCurrency(calculations.calculatedSalary)}
                                                        </div>
                                                        <div className="summary-subtext">
                                                            {bulkSalaryData[activeEmployeeTab].workingDaysCounted}/{bulkSalaryData[activeEmployeeTab].salaryDays} days
                                                        </div>
                                                    </div>

                                                    <div className="summary-card">
                                                        <div className="summary-label">Gross Pay</div>
                                                        <div className="summary-value gross">
                                                            {formatCurrency(calculations.grossPay)}
                                                        </div>
                                                        <div className="summary-subtext">Including bonuses</div>
                                                    </div>

                                                    <div className="summary-card">
                                                        <div className="summary-label">Total Deductions</div>
                                                        <div className="summary-value deduction">
                                                            -{formatCurrency(calculations.totalDeductions)}
                                                        </div>
                                                        <div className="summary-subtext">Taxes & others</div>
                                                    </div>

                                                    <div className="summary-card net">
                                                        <div className="summary-label">Net Payable</div>
                                                        <div className="summary-value net">
                                                            {formatCurrency(calculations.netPayable)}
                                                        </div>
                                                        <div className="summary-subtext">Final amount</div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkSalaryManagement;