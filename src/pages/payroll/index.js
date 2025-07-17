import { FiUsers } from "react-icons/fi";
import React, { useRef, useState, useEffect } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import axios from "axios";
import config from "../../config.js";
import DonutChart from "./donut/DonutChart";
import { IoMdCheckmarkCircleOutline } from "react-icons/io";
import { LuClock4, LuIndianRupee } from "react-icons/lu";
import PayrollTable from "./payrollTable/PayrollTable";
import "./style.scss";
import TextToggle from "../../components/toggle";
import PayRollProcess from "./process/index";

const backendUrl = config.backend_url;

const Payroll = () => {
    const [view, setView] = useState("overview");
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState([]);
    const [selectedFirm, setSelectedFirm] = useState([]);
    const [monthYear, setMonthYear] = useState(() => {
        const now = new Date();
        return `${now.getMonth() + 1}-${now.getFullYear()}`;
    });

    // Get overview data with month and year
    const getOverviewData = async () => {
        try {
            const [month, year] = monthYear.split("-");
            const response = await axios.get(`${backendUrl}/admin/get-overall-payroll`, {
                params: {
                    month,
                    year,
                },
                headers: {
                    Authorization: localStorage.getItem("authToken"),
                },
            });
            setOverview(response.data.data);
            console.log(response.data.data);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getOverviewData();
    }, [monthYear]);

    const formatValue = (value) => {
        if (isNaN(value)) return "0";
        const num = typeof value === "string" ? parseFloat(value) : value;
        return num.toLocaleString("en-IN", {
            maximumFractionDigits: 2,
        });
    };

    const scrollContainerRef = useRef(null);

    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({
                left: -800,
                behavior: "smooth",
            });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({
                left: 800,
                behavior: "smooth",
            });
        }
    };

    const handleChartCardClick = (firmName) => {
        setSelectedFirm((prevSelected) => {
            if (prevSelected.includes(firmName)) {
                // Remove firmName if already selected
                return prevSelected.filter(name => name !== firmName);
            } else {
                // Add firmName if not already selected
                return [...prevSelected, firmName];
            }
        });
    };


    // Callback to update monthYear
    const handleMonthYearChange = (newMonthYear) => {
        setMonthYear(newMonthYear);
    };

    return (
        <div className="payroll-page">
            <div className={"payroll-page-header"}>
                <div className={"payroll-page-header-title"}>
                    Payroll {view.charAt(0).toUpperCase() + view.slice(1)}
                </div>
                <TextToggle
                    textFirst="overview"
                    textSecond="process"
                    setText={setView}
                    selectedText={view}
                    classStyle={{ width: "200px" }}
                />
            </div>
            {view === "overview" ? (
                <>
                    <div className={"payroll-overview"}>
                        <div className={"payroll-overview-cards"}>
                            <div className={"payroll-overview-card"}>
                                <div>
                                    <div className={"payroll-overview-card-header"}>Total Employees</div>
                                    <div className={"payroll-overview-card-content"}>
                                        {formatValue(overview.reduce((acc, curr) => acc + curr.total, 0))}
                                    </div>
                                </div>
                                <div
                                    className="payroll-overview-card-icon"
                                    style={{ color: "#3b82f6", backgroundColor: "#dbeafe" }}
                                >
                                    <FiUsers size={20} aria-label="Users Icon" />
                                </div>
                            </div>
                            <div className={"payroll-overview-card"}>
                                <div>
                                    <div className={"payroll-overview-card-header"}>Total Payroll</div>
                                    <div className={"payroll-overview-card-content"}>
                                        {formatValue(overview.reduce((acc, curr) => acc + curr.amount, 0))}
                                    </div>
                                </div>
                                <div
                                    className="payroll-overview-card-icon"
                                    style={{ color: "#16a34a", backgroundColor: "#dcfce7" }}
                                >
                                    <LuIndianRupee size={20} aria-label="Indian Rupee Icon" />
                                </div>
                            </div>
                            <div className={"payroll-overview-card"}>
                                <div>
                                    <div className={"payroll-overview-card-header"}>Paid</div>
                                    <div className={"payroll-overview-card-content"}>
                                        {formatValue(overview.reduce((acc, curr) => acc + curr.paid, 0))}
                                    </div>
                                </div>
                                <div
                                    className="payroll-overview-card-icon"
                                    style={{ color: "#a453ee", backgroundColor: "#f3e8ff" }}
                                >
                                    <IoMdCheckmarkCircleOutline size={20} aria-label="Paid Icon" />
                                </div>
                            </div>
                            <div className={"payroll-overview-card"}>
                                <div>
                                    <div className={"payroll-overview-card-header"}>Pending</div>
                                    <div className={"payroll-overview-card-content"}>
                                        {formatValue(overview.reduce((acc, curr) => acc + curr.pending, 0))}
                                    </div>
                                </div>
                                <div
                                    className="payroll-overview-card-icon"
                                    style={{ color: "#ea580c", backgroundColor: "#ffedd5" }}
                                >
                                    <LuClock4 size={20} aria-label="Users Icon" />
                                </div>
                            </div>
                        </div>
                        <div className="charts-container">
                            <div className="charts-header">
                                <h3>Payroll Overview by Firm</h3>
                                <div className="charts-navigation">
                                    <button className="nav-arrow" onClick={scrollLeft}>
                                        <FaArrowLeft />
                                    </button>
                                    <button className="nav-arrow" onClick={scrollRight}>
                                        <FaArrowRight />
                                    </button>
                                </div>
                            </div>
                            <div className="charts-scroll-container" ref={scrollContainerRef}>
                                <div className="charts-wrapper">
                                    {overview.map((firm) => (
                                        <div
                                            key={firm.firmId}
                                            className={`chart-card ${
                                                selectedFirm.includes(firm.firmName) ? "selected" : ""}`}
                                            onClick={() => handleChartCardClick(firm.firmName)}
                                            style={{ cursor: "pointer" }}
                                        >
                                            <div className="firm-name">{firm.firmName}</div>
                                            <div className="chart-wrapper">
                                                <DonutChart
                                                    data={{
                                                        paid: firm.paid,
                                                        pending: firm.pending,
                                                        generated: firm.generated,
                                                        total: firm.total,
                                                    }}
                                                />
                                            </div>
                                            <div className="firm-amount">₹{firm.amount.toLocaleString("en-IN")}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <PayrollTable
                        selectedFirm={selectedFirm}
                        selectedMonthYear={monthYear}
                        onMonthYearChange={handleMonthYearChange}
                    />
                </>
            ) : (
                <PayRollProcess />
            )}
        </div>
    );
};

export default Payroll;