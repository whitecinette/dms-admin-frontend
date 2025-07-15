import {FiUsers} from "react-icons/fi";
import React, {useRef, useState, useEffect} from "react";
import {FaChevronDown, FaChevronUp} from "react-icons/fa";
import {FaArrowLeft, FaArrowRight} from "react-icons/fa";
import axios from "axios";
import config from "../../config.js";
import DonutChart from "./donut/DonutChart";
import {payrollData, overview, payrollEmployees} from "./dummyData";
import {IoMdCheckmarkCircleOutline} from "react-icons/io";
import {LuClock4, LuIndianRupee} from "react-icons/lu";
import PayrollTable from "./payrollTable/PayrollTable";
import "./style.scss";
import TextToggle from "../../components/toggle";
import PayRollProcess from "./process/index"

const backendUrl = config.backend_url;

const Payroll = () => {
    const [view, setView] = useState("overview");


    const formatValue = (value) => {
        if (isNaN(value)) return "0"; // Handle non-numbers

        // Convert to number if it's a string
        const num = typeof value === 'string' ? parseFloat(value) : value;

        // Format with Indian locale (en-IN)
        return num.toLocaleString('en-IN', {
            maximumFractionDigits: 2,
            // These options are optional based on your needs:
            // minimumFractionDigits: 2,  // Force 2 decimal places
            // style: 'currency',        // Add currency symbol
            // currency: 'INR'           // Indian Rupees symbol
        });
    };

    const scrollContainerRef = useRef(null);

    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({
                left: -800,
                behavior: 'smooth',
            });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({
                left: 800,
                behavior: 'smooth',
            });
        }
    };


    return (
        <div className="payroll-page">
            <div className={"payroll-page-header"}>
                <div className={"payroll-page-header-title"}>Payroll {view.charAt(0).toUpperCase() + view.slice(1)}</div>
                <TextToggle
                    textFirst="overview"
                    textSecond="process"
                    setText={setView}
                    selectedText={view}
                    classStyle={{width: "200px"}}
                />

            </div>
            {
                view === "overview" ? (
                    <>
                        <div className={"payroll-overview"}>
                            <div className={"payroll-overview-cards"}>
                                <div className={"payroll-overview-card"}>
                                    <div>
                                        <div className={"payroll-overview-card-header"}>Total Employees</div>
                                        <div
                                            className={"payroll-overview-card-content"}>{formatValue(overview.totalEmployees)}</div>
                                    </div>
                                    <div className="payroll-overview-card-icon"
                                         style={{color: "#3b82f6", backgroundColor: "#dbeafe"}}>
                                        <FiUsers size={20} aria-label="Users Icon"/>
                                    </div>
                                </div>
                                <div className={"payroll-overview-card"}>
                                    <div>
                                        <div className={"payroll-overview-card-header"}>Previous Month Payroll</div>
                                        <div
                                            className={"payroll-overview-card-content"}>{formatValue(overview.payRoll)}</div>
                                    </div>
                                    <div className="payroll-overview-card-icon"
                                         style={{color: "#16a34a", backgroundColor: "#dcfce7"}}>
                                        <LuIndianRupee size={20} aria-label="Indinian Rupee Icon"/>
                                    </div>
                                </div>
                                <div className={"payroll-overview-card"}>
                                    <div>
                                        <div className={"payroll-overview-card-header"}>Paid</div>
                                        <div
                                            className={"payroll-overview-card-content"}>{formatValue(overview.paid)}</div>
                                    </div>
                                    <div className="payroll-overview-card-icon"
                                         style={{color: "#a453ee", backgroundColor: "#f3e8ff"}}>
                                        <IoMdCheckmarkCircleOutline size={20} aria-label="Paid Icon"/>
                                    </div>
                                </div>
                                <div className={"payroll-overview-card"}>
                                    <div>
                                        <div className={"payroll-overview-card-header"}>Pending</div>
                                        <div
                                            className={"payroll-overview-card-content"}>{formatValue(overview.pending)}</div>
                                    </div>
                                    <div className="payroll-overview-card-icon"
                                         style={{color: "#ea580c", backgroundColor: "#ffedd5"}}>
                                        <LuClock4 size={20} aria-label="Users Icon"/>
                                    </div>
                                </div>
                            </div>
                            <div className="charts-container">
                                <div className="charts-header">
                                    <h3>Payroll Overview by Firm</h3>
                                    <div className="charts-navigation">
                                        <button className="nav-arrow" onClick={scrollLeft}>
                                            <FaArrowLeft/>
                                        </button>
                                        <button className="nav-arrow" onClick={scrollRight}>
                                            <FaArrowRight/>
                                        </button>
                                    </div>
                                </div>

                                <div className="charts-scroll-container" ref={scrollContainerRef}>
                                    <div className="charts-wrapper">
                                        {payrollData.map((firm) => (
                                            <div key={firm.firmId} className="chart-card">
                                                <div className="firm-name">{firm.firmName}</div>
                                                <div className="chart-wrapper">
                                                    <DonutChart
                                                        data={{
                                                            paid: firm.paid,
                                                            pending: firm.pending,
                                                            generated: firm.generated,
                                                            total: firm.total
                                                        }}
                                                        title={`${firm.paid}/${firm.total} Paid`}
                                                    />
                                                </div>
                                                <div className="firm-amount">
                                                    ₹{firm.amount.toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <PayrollTable/>
                    </>
                ) : (
                    <PayRollProcess/>
                )
            }


        </div>
    );
};

export default Payroll;