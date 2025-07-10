import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, LineElement, CategoryScale, LinearScale, PointElement } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import axios from 'axios';
import config from '../config';
import './attendanceStyle.scss';
import ShimmerLoader from '../utils/shimmerLoader';
import ReactApexChart from 'react-apexcharts';

ChartJS.register(ArcElement, Tooltip, LineElement, CategoryScale, LinearScale, PointElement);

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
  const [selectedWeek, setSelectedWeek] = useState('this');
  const [lineChartSeries, setLineChartSeries] = useState([]);
  const [lineChartCategories, setLineChartCategories] = useState([]);

  const fetchAllData = async (startDate, endDate) => {
    setLoading(true);
    try {
      const firmRes = await axios.get(`${backendUrl}/get-attendance-count-by-firms`, {
        headers: { Authorization: localStorage.getItem('authToken') },
      });

      const weeklyRes = await axios.get(`${backendUrl}/get-total-employee-count`, {
        params: { startDate, endDate },
        headers: { Authorization: localStorage.getItem('authToken') },
      });

      setFirmAttendanceData(firmRes.data.data || []);

      const data = weeklyRes.data;
      setOverviewCounts({
        present: data.presentCount,
        absent: data.absentCount,
        leave: data.leaveCount,
        halfDay: data.halfDayCount,
        pending: data.pendingCount,
        total: data.total,
      });

      const weekly = data.weeklyChart || [];
      const present = weekly.map((d) => d.Present || 0);
      const absent = weekly.map((d) => d.Absent || 0);
      const leave = weekly.map((d) => d.Leave || 0);
      const halfDay = weekly.map((d) => d['Half Day'] || 0);
      const dates = weekly.map((d) => d.date || '');

      setLineChartSeries([
        { name: 'Present', data: present },
        { name: 'Absent', data: absent },
        { name: 'Leave', data: leave },
        { name: 'Half Day', data: halfDay },
      ]);
      setLineChartCategories(dates);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const today = new Date();
    let daysBack = 0;
    if (selectedWeek === 'this') daysBack = 0;
    else if (selectedWeek === 'last') daysBack = 7;
    else if (selectedWeek === 'beforeLast') daysBack = 14;
    else if (selectedWeek === 'fourth') daysBack = 21;

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 - daysBack);

    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() - today.getDay() + 7 - daysBack);

    const startDate = startOfWeek.toISOString().split('T')[0];
    const endDate = endOfWeek.toISOString().split('T')[0];

    fetchAllData(startDate, endDate);
  }, [date, selectedWeek]);

  const overviewData = [
    { name: 'Present', value: overviewCounts.present },
    { name: 'Absent', value: overviewCounts.absent },
    { name: 'Leave', value: overviewCounts.leave },
    { name: 'Half Day', value: overviewCounts.halfDay },
  ];

  const COLORS = ['#A855F7', '#E9D5FF', '#EE8E65', '#EBC160'];

  // Custom plugin for connector lines and external labels
  const connectorLinesPlugin = {
    id: 'connectorLines',
    afterDraw: (chart) => {
      const ctx = chart.ctx;
      const meta = chart.getDatasetMeta(0);
      const data = chart.data.datasets[0].data;
      const labels = chart.data.labels;
      const total = data.reduce((sum, value) => sum + value, 0);

      ctx.save();

      data.forEach((value, index) => {
        if (value === 0) return; // Skip zero values

        const element = meta.data[index];
        const { x: centerX, y: centerY } = element;
        const { startAngle, endAngle, outerRadius } = element.getProps(['startAngle', 'endAngle', 'outerRadius'], true);

        const midAngle = (startAngle + endAngle) / 2;

        const innerPoint = {
          x: centerX + Math.cos(midAngle) * (outerRadius + 5),
          y: centerY + Math.sin(midAngle) * (outerRadius + 5),
        };

        const outerPoint = {
          x: centerX + Math.cos(midAngle) * (outerRadius + 20),
          y: centerY + Math.sin(midAngle) * (outerRadius + 20),
        };

        const isRightSide = Math.cos(midAngle) > 0;
        const labelX = isRightSide ? outerPoint.x + 15 : outerPoint.x - 15;
        const labelY = outerPoint.y;

        // Draw connector line
        ctx.beginPath();
        ctx.moveTo(innerPoint.x, innerPoint.y);
        ctx.lineTo(outerPoint.x, outerPoint.y);
        ctx.lineTo(labelX, labelY);
        ctx.strokeStyle = COLORS[index] || '#666';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw label background
        const labelText = `${labels[index]}: ${value}`; // Include header in external label
        ctx.font = 'bold 10px Inter, sans-serif'; // Increased font size for clarity
        const labelWidth = ctx.measureText(labelText).width;
        const labelHeight = 24; // Increased height for better visibility

        const rectX = isRightSide ? labelX : labelX - labelWidth - 12;
        const rectY = labelY - labelHeight / 2;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = '#E5E7EB';
        ctx.lineWidth = 1;
        ctx.roundRect(rectX, rectY, labelWidth + 12, labelHeight, 8); // Increased corner radius
        ctx.fill();
        ctx.stroke();

        // Draw label text
        ctx.fillStyle = '#1F2937';
        ctx.textAlign = isRightSide ? 'left' : 'left';
        ctx.fillText(labelText, rectX + 6, labelY + 4);
      });

      ctx.restore();
    },
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: '#000', // Slightly darker for contrast
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#374151',
        borderWidth: 1,
        cornerRadius: 6,
        zIndex: 10000,
        callbacks: {
          title: () => null, // Remove the title/header
          label: function (context) {
            // This function formats the tooltip to show "Present: 92" by combining the label and parsed value
            return `${context.label}: ${context.parsed}`; // Combines the category label (e.g., "Present") with the value (e.g., "92")
          },
        },
      },
    },
    layout: {
      padding: { top: 40, bottom: 40, left: 80, right: 80 },
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1000,
      easing: 'easeInOutQuart',
    },
    elements: {
      arc: { borderWidth: 2, hoverBorderWidth: 3 },
    },
  };

  const firmChartOptions = {
    ...chartOptions,
    elements: {
      arc: { borderWidth: 1, hoverBorderWidth: 2 },
    },
  };

  const overviewChartData = {
    ...chartOptions,
    labels: overviewData.map((item) => item.name),
    datasets: [
      {
        data: overviewData.map((item) => item.value),
        backgroundColor: COLORS,
        borderColor: ['#7E3AF2', '#D8B4FE', '#EA580C', '#CA8A04'],
        borderWidth: 2,
        hoverBackgroundColor: ['#9333EA', '#E9D5FF', '#F97316', '#EAB308'],
        hoverBorderWidth: 3,
        cutout: '80%',
      },
    ],
  };

  const lineChartData = {
    labels: lineChartCategories,
    datasets: [
      {
        label: 'Present',
        data: lineChartSeries.find((s) => s.name === 'Present')?.data || [],
        borderColor: '#a855f7',
        backgroundColor: 'rgba(168, 85, 247, 0.3)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 3,
      },
      {
        label: 'Absent',
        data: lineChartSeries.find((s) => s.name === 'Absent')?.data || [],
        borderColor: '#e9d5ff',
        backgroundColor: 'rgba(233, 213, 255, 0.3)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 3,
      },
      {
        label: 'Leave',
        data: lineChartSeries.find((s) => s.name === 'Leave')?.data || [],
        borderColor: '#ee8e65',
        backgroundColor: 'rgba(238, 142, 101, 0.3)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 3,
      },
      {
        label: 'Half Day',
        data: lineChartSeries.find((s) => s.name === 'Half Day')?.data || [],
        borderColor: '#ebc160',
        backgroundColor: 'rgba(235, 193, 96, 0.3)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 3,
      },
    ],
  };

  const lineChartOptions = {
    chart: {
      type: 'area',
      height: 350,
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3,
      },
    },
    xaxis: {
      categories: lineChartCategories,
      labels: { style: { colors: '#666', fontSize: '12px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { colors: '#666', fontSize: '12px' } },
    },
    grid: { show: false },
    tooltip: {
      enabled: true,
      style: { fontSize: '12px', ZIndex: "10000" },
      theme: 'dark',
      x: { show: false },

    },
    colors: ['#A855F7', '#E9D5FF', '#EE8E65', '#EBC160'],
  };

  if (loading) return <ShimmerLoader />;

  const hasOverviewData = overviewData.some((item) => item.value > 0);
  const hasLineChartData = lineChartSeries.length > 0 && lineChartCategories.length > 0;

  return (
      <div className="attendance-cards-container">
        <h2 className="overview-heading">Overview</h2>

        {/* Overview Section */}
        <div className="overview-section">
          <div className="overview-chart">
            {hasOverviewData ? (
                <div style={{ position: 'relative', height: '234px' }}>
                  <Doughnut
                      data={overviewChartData}
                      options={chartOptions}
                      plugins={[connectorLinesPlugin]}
                  />
                  <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                        pointerEvents: 'none',
                      }}
                  >
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#666' }}>Total</p>
                    <p style={{ fontSize: '24px', fontWeight: '700', color: '#1F2937' }}>
                      {overviewCounts.total}
                    </p>
                    {/* <p style={{ fontSize: '10px', color: '#6B7280' }}>employees</p> */}
                  </div>
                </div>
            ) : (
                <div>No data available</div>
            )}
            <div className="overview-legend">
              <div className="legend-item">
                <span className="dot" style={{ backgroundColor: '#A855F7' }} />
                <span>Present</span>
              </div>
              <div className="legend-item">
                <span className="dot" style={{ backgroundColor: '#E9D5FF' }} />
                <span>Absent</span>
              </div>
              <div className="legend-item">
                <span className="dot" style={{ backgroundColor: '#EE8E65' }} />
                <span>Leave</span>
              </div>
              <div className="legend-item">
                <span className="dot" style={{ backgroundColor: '#EBC160' }} />
                <span>Half Day</span>
              </div>
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
            {hasLineChartData ? (
                <div style={{ height: '200px' }}>
                  <ReactApexChart
                      key={`line-${lineChartCategories.join('-')}`}
                      options={lineChartOptions}
                      series={lineChartSeries}
                      type="area"
                      height={200}
                  />
                </div>
            ) : (
                <div>No data available</div>
            )}
          </div>
        </div>

        {/* Firm Cards */}
        <div className="attendance-cards-grid">
          {firmAttendanceData.map((firm, index) => {
            const count = firm.attendanceCounts || { present: 0, leave: 0, absent: 0, halfDay: 0 };
            const total = firm.totalUsers || 0;

            const firmChartData = {
              labels: ['Present', 'Absent', 'Leave', 'Half Day'],
              datasets: [
                {
                  data: [count.present, count.absent, count.leave, count.halfDay],
                  backgroundColor: COLORS,
                  borderColor: ['#7E3AF2', '#D8B4FE', '#EA580C', '#CA8A04'],
                  borderWidth: 1,
                  hoverBackgroundColor: ['#9333EA', '#E9D5FF', '#F97316', '#EAB308'],
                  hoverBorderWidth: 2,
                  cutout: '80%',
                },
              ],
              elements: {
                arc: {
                  borderWidth: 0.5,
                  hoverBorderWidth: 1
                },
              },
            };

            return (
                <div
                    key={index}
                    onClick={() => {
                      setSelectedFlows(selectedFlows === firm.code ? '' : firm.code);
                    }}
                    className={`attendance-card ${selectedFlows === firm.code ? 'selected' : ''}`}
                >
                  <div className="chart-wrapper" style={{ position: 'relative', height: '180px' }}>
                    <Doughnut
                        data={firmChartData}
                        options={firmChartOptions}
                        plugins={[connectorLinesPlugin]}
                    />
                    <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          textAlign: 'center',
                          pointerEvents: 'none',
                        }}
                    >
                      <p style={{ fontSize: '12px', fontWeight: '600', color: '#666' }}>Total</p>
                      <p style={{ fontSize: '20px', fontWeight: '700', color: '#1F2937' }}>
                        {total}
                      </p>
                    </div>
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