import React, { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import axios from 'axios';
import config from "../config";
import './attendanceStyle.scss';

const backendUrl = config.backend_url;

const AttendanceCards = ({ date, selectedFlows, setSelectedFlows }) => {
  const [firmAttendanceData, setFirmAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overviewCounts, setOverviewCounts] = useState({
    present: 0,
    absent: 0,
    leave: 0,
    halfDay: 0,
    pending: 0,
    total: 0,
  });

  const fetchData = async () => {
    try {
      const res = await axios.get(`${backendUrl}/get-attendance-count-by-firms`, {
        headers: { Authorization: localStorage.getItem('authToken') },
      });
      setFirmAttendanceData(res.data.data || []);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceCount = async () => {
    try {
      let newDate = "";
      if (!date) {
        const today = new Date();
        newDate = today.toISOString().split("T")[0];
      } else {
        newDate = new Date(date).toISOString().split("T")[0];
      }

      const response = await axios.get(`${backendUrl}/get-total-employee-count`, {
        params: { date: newDate },
        headers: { Authorization: localStorage.getItem("authToken") },
      });

      setOverviewCounts({
        present: response.data.presentCount,
        absent: response.data.absentCount,
        leave: response.data.leaveCount,
        halfDay: response.data.halfDayCount,
        pending: response.data.pendingCount,
        total: response.data.total,
      });
    } catch (err) {
      console.error("Error fetching total employee attendance:", err);
    }
  };

  useEffect(() => {
    fetchData();
    getAttendanceCount();
  }, [date]);

  const overviewChartOptions = {
    chart: { type: 'donut' },
    labels: ['Present', 'Absent', 'Leave', 'Half Day'],
    colors: ['#a855f7', '#e9d5ff', '#d8b4fe', '#4842ee'],
    legend: { show: false },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: '75%',
          labels: {
            show: true,
            name: {
              show: true,
              offsetY: -10,
              fontSize: '20px',
              fontWeight: 800,
              color: '#000',
            },
            value: {
              show: true,
              fontSize: '22px',
              fontWeight: 700,
              color: '#000',
              offsetY: 10,
            },
            total: {
              show: true,
              label: 'Total',
              fontSize: '14px',
              fontWeight: 500,
              color: '#888',
              formatter: () => overviewCounts.total.toString(),
            },
          },
        },
      },
    },
  };

  const overviewSeries = [
    overviewCounts.present,
    overviewCounts.absent,
    overviewCounts.leave,
    overviewCounts.halfDay,
  ];

  const lineChartOptions = {
    chart: {
      type: 'area',
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    stroke: {
      curve: 'smooth',
      width: 3,
      colors: ['#a855f7'],
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.3,
        opacityTo: 0.05,
        stops: [0, 90, 100],
      },
      colors: ['#a855f7'],
    },
    xaxis: {
      categories: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
      labels: { style: { colors: '#666', fontSize: '12px' } },
    },
    yaxis: {
      labels: { style: { colors: '#666', fontSize: '12px' } },
    },
    grid: { show: false },
    dataLabels: { enabled: false },
  };

  const lineChartSeries = [
    {
      name: 'Attendance',
      data: [12, 22, 35, 27, 44, 30, 52],
    },
  ];

  if (loading) return <div>Loading...</div>;

  return (
    <div className="attendance-cards-container">
      <h2 className="overview-heading">Attendance Overview</h2>

      {/* ✅ Overview Section */}
      <div className="overview-section">
        <div className="overview-chart">
          <ReactApexChart
            options={overviewChartOptions}
            series={overviewSeries}
            type="donut"
            height={200}
          />
          <div className="overview-legend">
            <div className="legend-item">
              <span className="dot present-dot" />
              <span>Present</span>
            </div>
            <div className="legend-item">
              <span className="dot absent-dot" />
              <span>Absent</span>
            </div>
            <div className="legend-item">
              <span className="dot leave-dot" />
              <span>Leave</span>
            </div>
            <div className="legend-item">
              <span className="dot halfday-dot" />
              <span>Half Day</span>
            </div>
          </div>
        </div>

        {/* ✅ Line Chart */}
        <div className="overview-line-chart">
          <h3 className="line-chart-title">Last 7 Days</h3>
          <ReactApexChart
            options={lineChartOptions}
            series={lineChartSeries}
            type="area"
            height={200}
          />
        </div>
      </div>

      {/* ✅ Firm Cards */}
      <div className="attendance-cards-grid">
        {firmAttendanceData.map((firm, index) => {
          const count = firm.attendanceCounts || { present: 0, leave: 0, absent: 0 };
          const total = firm.totalUsers || 0;

          const chartOptions = {
            chart: { type: 'donut', sparkline: { enabled: true } },
            labels: ['Absent', 'Present', 'Leave'],
            colors: ['#d0a3f5', '#9b5de5', '#c084fc'],
            dataLabels: {
              enabled: true,
              formatter: (val, opts) =>
                `${opts.w.globals.labels[opts.seriesIndex]}: ${opts.w.globals.series[opts.seriesIndex]}`,
              style: {
                fontSize: '12px',
                fontWeight: 500,
                colors: ['#6b21a8'],
              },
              background: {
                enabled: true,
                foreColor: '#f0f0f0',
                padding: 4,
                borderRadius: 2,
                borderWidth: 1,
                borderColor: '#ccc',
                opacity: 0.8,
              },
              dropShadow: {
                enabled: true,
                top: 1,
                left: 1,
                blur: 1,
                opacity: 0.45,
              },
            },
            legend: { show: false },
            plotOptions: {
              pie: {
                donut: {
                  size: '75%',
                  labels: {
                    show: true,
                    name: {
                      show: true,
                      fontSize: '20px',
                      fontWeight: 800,
                      color: '#000',
                      offsetY: -10,
                    },
                    value: {
                      show: true,
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#000',
                      offsetY: 10,
                    },
                    total: {
                      show: true,
                      showAlways: true,
                      label: 'Total',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#888',
                      offsetY: -10,
                      formatter: () => total.toString(),
                    },
                  },
                },
              },
            },
          };

          return (
            <div
              key={index}
              onClick={() => setSelectedFlows(firm.code)}
              className={`attendance-card ${selectedFlows === firm.code ? 'selected' : ''}`}
            >
              <div className="chart-wrapper">
                <ReactApexChart
                  options={chartOptions}
                  series={[count.absent, count.present, count.leave]}
                  type="donut"
                  height={160}
                />
              </div>
              <div className="firm-name">{firm.name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AttendanceCards;
