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

const backendUrl = config.backend_url;

const Payroll = () => {
  const [view, setView] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState([]);
  const [selectedFirm, setSelectedFirm] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [downloadModal, setDownloadModal] = useState(false);
    const [uploadModal, setUploadModal] = useState(false);
    const [summary, setSummary] = useState({ selectedCount: 0, totalAmount: 0 });
  const [monthYear, setMonthYear] = useState(() => {
    const now = new Date();
    return `${now.getMonth() + 1}-${now.getFullYear()}`;
  });

  const getSummaryData = async (codes = []) => {
  try {
    const [month, year] = monthYear.split("-");
    const response = await axios.post(
      `${backendUrl}/payroll/summary/two-blocks`,
      { month, year, codes },
      { headers: { Authorization: localStorage.getItem("authToken") } }
    );
    setSummary({
      selectedCount: response.data.selectedCount,
      totalAmount: response.data.totalAmount,
    });
  } catch (err) {
    console.error("❌ Error fetching payroll summary:", err);
    setSummary({ selectedCount: 0, totalAmount: 0 });
  }
};


  // fetch overview
  const getOverviewData = async () => {
    try {
      const [month, year] = monthYear.split("-");
      const response = await axios.get(`${backendUrl}/get-all-payrolls`, {
        params: { month, year },
        headers: { Authorization: localStorage.getItem("authToken") },
      });
      setOverview(response.data.data || []);
    } catch (error) {
      console.error("❌ Error fetching data:", error);
      setOverview([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getOverviewData();
  }, [monthYear]);

  // helper: safe number formatting
  const formatValue = (value) => {
    if (value === undefined || value === null || isNaN(value)) return "0";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  };

  const scrollContainerRef = useRef(null);
  const scrollLeft = () =>
    scrollContainerRef.current?.scrollBy({ left: -800, behavior: "smooth" });
  const scrollRight = () =>
    scrollContainerRef.current?.scrollBy({ left: 800, behavior: "smooth" });

  const handleChartCardClick = (firmName) => {
    setSelectedFirm((prev) =>
      prev.includes(firmName)
        ? prev.filter((name) => name !== firmName)
        : [...prev, firmName]
    );
  };

  const handleMonthYearChange = (newMonthYear) => setMonthYear(newMonthYear);

  return (
    <div className="payroll-page">
      <div className="payroll-page-header">
        <div className="payroll-page-header-title">
          Payroll {view.charAt(0).toUpperCase() + view.slice(1)}
        </div>

        <div className="payroll-actions">
        <button className="primary-button" onClick={() => setModalOpen(true)}>
            + Generate Payroll
        </button>

        <button className="secondary-button" onClick={() => setDownloadModal(true)}>
            ⬇ Download Payroll
        </button>

        <button className="secondary-button" onClick={() => setUploadModal(true)}>
            ⬆ Upload Bulk
        </button>
        </div>


        <TextToggle
          textFirst="overview"
          textSecond="process"
          setText={setView}
          selectedText={view}
          classStyle={{ width: "200px" }}
        />
      </div>

      {modalOpen && (
        <GeneratePayrollModal
          closeModal={() => setModalOpen(false)}
          onGenerated={() => {
            setModalOpen(false);
            getOverviewData();
          }}
        />
      )}

      {view === "overview" ? (
        <>
          <div className="payroll-overview">
            <div className="payroll-overview-cards">
              <div className="payroll-overview-card">
                <div>
                  <div className="payroll-overview-card-header">
                    Total Employees
                  </div>
                  <div className="payroll-overview-card-content">
                    {formatValue(
                      overview.reduce((acc, curr) => acc + (curr.total ?? 0), 0)
                    )}
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
                  <div className="payroll-overview-card-header">
                    Total Payroll
                  </div>
                  <div className="payroll-overview-card-content">
                    {formatValue(
                      overview.reduce((acc, curr) => acc + (curr.amount ?? 0), 0)
                    )}
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
                    {formatValue(
                      overview.reduce((acc, curr) => acc + (curr.paid ?? 0), 0)
                    )}
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
                    {formatValue(
                      overview.reduce(
                        (acc, curr) => acc + (curr.pending ?? 0),
                        0
                      )
                    )}
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
                        selectedFirm.includes(firm.firmName) ? "selected" : ""
                      }`}
                      onClick={() => handleChartCardClick(firm.firmName)}
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
                      <div className="firm-amount">
                        ₹{formatValue(firm.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        {downloadModal && (
            <DownloadPayrollModal closeModal={() => setDownloadModal(false)} />
            )}

            {uploadModal && (
            <UploadPayrollModal
                closeModal={() => setUploadModal(false)}
                refresh={getOverviewData}
            />
            )}

          <PayrollTable
            selectedFirm={selectedFirm}
            selectedMonthYear={monthYear}
            onMonthYearChange={handleMonthYearChange}
            onSelectionChange={(codes) => getSummaryData(codes)}
          />
        </>
      ) : (
        <PayRollProcess />
      )}
    </div>
  );
};

export default Payroll;
