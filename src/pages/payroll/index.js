import { FiUsers } from "react-icons/fi";
import React, { useRef, useState, useEffect } from "react";
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
import GeneratePayrollModal from "../../components/payrollComponents/generatePayrollModal/index.jsx";
import DownloadPayrollModal from "../../components/payrollComponents/downloadPayrollModal/index.jsx";
import UploadPayrollModal from "../../components/payrollComponents/uploadPayrollModal/index.jsx";
import PayslipsTab from "./tabs/PayslipsTab";
import LeaveManagementTab from "./tabs/LeaveManagementTab";
import PayrollConfigTab from "./tabs/PayrollConfigTab";

const backendUrl = config.backend_url;

const Payroll = () => {
  const [workspaceTab, setWorkspaceTab] = useState("runs");
  const [view, setView] = useState("overview");
  const [overview, setOverview] = useState([]);
  const [kpis, setKpis] = useState({
    totalEmployees: 0,
    totalPayroll: 0,
    paid: 0,
    pending: 0,
    generated: 0,
  });
  const [selectedFirm, setSelectedFirm] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [downloadModal, setDownloadModal] = useState(false);
  const [uploadModal, setUploadModal] = useState(false);
  const [monthYear, setMonthYear] = useState(() => {
    const now = new Date();
    return `${now.getMonth() + 1}-${now.getFullYear()}`;
  });

  const getOverviewData = async () => {
    try {
      const [month, year] = monthYear.split("-");
      const response = await axios.get(`${backendUrl}/get-all-payrolls`, {
        params: { month, year, page: 1, limit: 1 },
        headers: { Authorization: localStorage.getItem("authToken") },
      });

      const overviewByFirm = Array.isArray(response.data?.overviewByFirm)
        ? response.data.overviewByFirm
        : [];
      const apiKpis = response.data?.kpis || {};

      setOverview(overviewByFirm);
      setKpis({
        totalEmployees: Number(apiKpis.totalEmployees || 0),
        totalPayroll: Number(apiKpis.totalPayroll || 0),
        paid: Number(apiKpis.paid || 0),
        pending: Number(apiKpis.pending || 0),
        generated: Number(apiKpis.generated || 0),
      });
    } catch (error) {
      console.error("Error fetching payroll overview:", error);
      setOverview([]);
      setKpis({
        totalEmployees: 0,
        totalPayroll: 0,
        paid: 0,
        pending: 0,
        generated: 0,
      });
    }
  };

  useEffect(() => {
    if (workspaceTab === "runs") {
      getOverviewData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthYear, workspaceTab]);

  const formatValue = (value) => {
    if (value === undefined || value === null || Number.isNaN(value)) return "0";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  };

  const scrollContainerRef = useRef(null);
  const scrollLeft = () =>
    scrollContainerRef.current?.scrollBy({ left: -800, behavior: "smooth" });
  const scrollRight = () =>
    scrollContainerRef.current?.scrollBy({ left: 800, behavior: "smooth" });

  const handleChartCardClick = (firmCode) => {
    setSelectedFirm((prev) =>
      prev.includes(firmCode)
        ? prev.filter((code) => code !== firmCode)
        : [...prev, firmCode]
    );
  };

  const handleMonthYearChange = (newMonthYear) => setMonthYear(newMonthYear);

  const sectionTitleMap = {
    runs: "Payroll Runs",
    payslips: "Payslips",
    leaves: "Leave Management",
    config: "Payroll Config",
  };

  return (
    <div className="payroll-page">
      <div className="payroll-page-header">
        <div className="payroll-page-header-title">
          {sectionTitleMap[workspaceTab] || "Payroll"}
        </div>

        {workspaceTab === "runs" ? (
          <div className="payroll-actions">
            <button className="primary-button" onClick={() => setModalOpen(true)}>
              + Generate Payroll
            </button>

            <button className="secondary-button" onClick={() => setDownloadModal(true)}>
              Download Payroll
            </button>

            <button className="secondary-button" onClick={() => setUploadModal(true)}>
              Upload Bulk
            </button>
          </div>
        ) : null}
      </div>

      <div className="payroll-workspace-tabs">
        <button
          className={workspaceTab === "runs" ? "active" : ""}
          onClick={() => setWorkspaceTab("runs")}
        >
          Payroll Runs
        </button>
        <button
          className={workspaceTab === "payslips" ? "active" : ""}
          onClick={() => setWorkspaceTab("payslips")}
        >
          Salary Slips
        </button>
        <button
          className={workspaceTab === "leaves" ? "active" : ""}
          onClick={() => setWorkspaceTab("leaves")}
        >
          Leave Management
        </button>
        <button
          className={workspaceTab === "config" ? "active" : ""}
          onClick={() => setWorkspaceTab("config")}
        >
          Firm Config
        </button>
      </div>

      {workspaceTab === "runs" ? (
        <>
          <div className="payroll-subtabs-wrap">
            <TextToggle
              textFirst="overview"
              textSecond="process"
              setText={setView}
              selectedText={view}
              classStyle={{ width: "200px" }}
            />
          </div>

          {modalOpen ? (
            <GeneratePayrollModal
              closeModal={() => setModalOpen(false)}
              onGenerated={() => {
                setModalOpen(false);
                getOverviewData();
              }}
            />
          ) : null}

          {view === "overview" ? (
            <>
              <div className="payroll-overview">
                <div className="payroll-overview-cards">
                  <div className="payroll-overview-card">
                    <div>
                      <div className="payroll-overview-card-header">Total Employees</div>
                      <div className="payroll-overview-card-content">
                        {formatValue(kpis.totalEmployees)}
                      </div>
                    </div>
                    <div
                      className="payroll-overview-card-icon"
                      style={{ color: "#3b82f6", backgroundColor: "#dbeafe" }}
                    >
                      <FiUsers size={20} />
                    </div>
                  </div>

                  <div className="payroll-overview-card">
                    <div>
                      <div className="payroll-overview-card-header">Total Payroll</div>
                      <div className="payroll-overview-card-content">
                        {formatValue(kpis.totalPayroll)}
                      </div>
                    </div>
                    <div
                      className="payroll-overview-card-icon"
                      style={{ color: "#16a34a", backgroundColor: "#dcfce7" }}
                    >
                      <LuIndianRupee size={20} />
                    </div>
                  </div>

                  <div className="payroll-overview-card">
                    <div>
                      <div className="payroll-overview-card-header">Paid</div>
                      <div className="payroll-overview-card-content">
                        {formatValue(kpis.paid)}
                      </div>
                    </div>
                    <div
                      className="payroll-overview-card-icon"
                      style={{ color: "#a453ee", backgroundColor: "#f3e8ff" }}
                    >
                      <IoMdCheckmarkCircleOutline size={20} />
                    </div>
                  </div>

                  <div className="payroll-overview-card">
                    <div>
                      <div className="payroll-overview-card-header">Pending</div>
                      <div className="payroll-overview-card-content">
                        {formatValue(kpis.pending)}
                      </div>
                    </div>
                    <div
                      className="payroll-overview-card-icon"
                      style={{ color: "#ea580c", backgroundColor: "#ffedd5" }}
                    >
                      <LuClock4 size={20} />
                    </div>
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
                        key={firm.firmCode || firm.firmName}
                        className={`chart-card ${
                          selectedFirm.includes(firm.firmCode) ? "selected" : ""
                        }`}
                        onClick={() => handleChartCardClick(firm.firmCode)}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="firm-name">{firm.firmName}</div>
                        <div className="chart-wrapper">
                          <DonutChart
                            data={{
                              paid: firm.paid ?? 0,
                              pending: firm.pending ?? 0,
                              generated: firm.generated ?? 0,
                              total: firm.total ?? 0,
                            }}
                          />
                        </div>
                        <div className="firm-amount">₹{formatValue(firm.amount)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {downloadModal ? (
                <DownloadPayrollModal closeModal={() => setDownloadModal(false)} />
              ) : null}

              {uploadModal ? (
                <UploadPayrollModal
                  closeModal={() => setUploadModal(false)}
                  refresh={getOverviewData}
                />
              ) : null}

              <PayrollTable
                selectedFirm={selectedFirm}
                selectedMonthYear={monthYear}
                onMonthYearChange={handleMonthYearChange}
              />
            </>
          ) : (
            <PayRollProcess />
          )}
        </>
      ) : null}

      {workspaceTab === "payslips" ? <PayslipsTab /> : null}
      {workspaceTab === "leaves" ? <LeaveManagementTab /> : null}
      {workspaceTab === "config" ? <PayrollConfigTab /> : null}
    </div>
  );
};

export default Payroll;
