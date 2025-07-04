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
  const [selectedWeek, setSelectedWeek] = useState("this");
  const [lineChartSeries, setLineChartSeries] = useState([]);
  const [lineChartCategories, setLineChartCategories] = useState([]);

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

  const getAttendanceCount = async (startDate, endDate) => {
    try {
      const response = await axios.get(`${backendUrl}/get-total-employee-count`, {
        params: { startDate, endDate },
        headers: { Authorization: localStorage.getItem("authToken") },
      });

      const data = response.data;

      setOverviewCounts({
        present: data.presentCount,
        absent: data.absentCount,
        leave: data.leaveCount,
        halfDay: data.halfDayCount,
        pending: data.pendingCount,
        total: data.total,
      });

      const weekly = data.weeklyChart;

      const present = weekly.map((d) => d.Present);
      const absent = weekly.map((d) => d.Absent);
      const leave = weekly.map((d) => d.Leave);
      const halfDay = weekly.map((d) => d["Half Day"]);
      const dates = weekly.map((d) => d.date);

      setLineChartSeries([
        { name: "Present", data: present },
        { name: "Absent", data: absent },
        { name: "Leave", data: leave },
        { name: "Half Day", data: halfDay },
      ]);

      setLineChartCategories(dates);
    } catch (err) {
      console.error("Error fetching weekly attendance:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [date]);

  useEffect(() => {
    const today = new Date();

    let daysBack = 0;
    if (selectedWeek === "this") daysBack = 0;
    else if (selectedWeek === "last") daysBack = 7;
    else if (selectedWeek === "beforeLast") daysBack = 14;
    else if (selectedWeek === "fourth") daysBack = 21;

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 - daysBack);

    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() - today.getDay() + 7 - daysBack);

    const startDate = startOfWeek.toISOString().split("T")[0];
    const endDate = endOfWeek.toISOString().split("T")[0];

    getAttendanceCount(startDate, endDate);
  }, [selectedWeek]);

  const overviewChartOptions = {
    chart: { type: 'donut' },
    labels: ['Present', 'Absent', 'Leave', 'Half Day'],
    colors: ['#a855f7', '#e9d5ff', '#ee8e65', '#ebc160'],
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
      colors: ['#a855f7', '#e9d5ff', '#ee8e65', '#ebc160'],
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.3,
        opacityTo: 0.05,
        stops: [0, 90, 100],
      },
      colors: ['#a855f7', '#e9d5ff', '#ee8e65', '#ebc160'],
    },
    xaxis: {
      categories: lineChartCategories,
      labels: { style: { colors: '#666', fontSize: '12px' } },
    },
    yaxis: {
      labels: { style: { colors: '#666', fontSize: '12px' } },
    },
    grid: { show: false },
    dataLabels: { enabled: false },
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="attendance-cards-container">
      <h2 className="overview-heading">Attendance Overview</h2>

      {/* Overview Section */}
      <div className="overview-section">
        <div className="overview-chart">
          <ReactApexChart
            options={overviewChartOptions}
            series={overviewSeries}
            type="donut"
            height={200}
          />
          <div className="overview-legend">
            <div className="legend-item"><span className="dot present-dot" /> <span>Present</span></div>
            <div className="legend-item"><span className="dot absent-dot" /> <span>Absent</span></div>
            <div className="legend-item"><span className="dot leave-dot" /> <span>Leave</span></div>
            <div className="legend-item"><span className="dot halfday-dot" /> <span>Half Day</span></div>
          </div>
        </div>

        {/* Line Chart */}
        <div className="overview-line-chart">
          <div className="line-chart-header">
            <h3 className="line-chart-title">Last 7 Days</h3>
            <select
              className="week-selector"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
            >
              <option value="this">This Week</option>
              <option value="last">Last Week</option>
              <option value="beforeLast">Week Before Last</option>
              <option value="fourth">4 Weeks Ago</option>
            </select>
          </div>
          <ReactApexChart
            options={lineChartOptions}
            series={lineChartSeries}
            type="area"
            height={200}
          />
        </div>
      </div>

      {/* Firm Cards */}
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
