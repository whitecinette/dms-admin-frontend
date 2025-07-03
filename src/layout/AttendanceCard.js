import React, { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import axios from 'axios';
import config from "../config";
import './attendanceStyle.scss';

const backendUrl = config.backend_url;

const AttendanceCards = ({date, selectedFlows, setSelectedFlows}) => {
  const [firmAttendanceData, setFirmAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="attendance-cards-container">
      <div className="attendance-cards-grid grid grid-cols-1 md:grid-cols-4 gap-4">
        {firmAttendanceData.map((firm, index) => {
          const count = firm.attendanceCounts || { present: 0, leave: 0, absent: 0 };
          const total = firm.totalUsers || 0;

          const chartOptions = {
            chart: {
              type: 'donut',
              sparkline: { enabled: true },
            },
            labels: ['Absent', 'Present', 'Leave'],
            colors: ['#FF4040', '#D4A373', '#D4A373'],
            legend: {
              show: false,
            },
            plotOptions: {
              pie: {
                startAngle: -90,
                endAngle: 90,
                donut: {
                  size: '75%',
                  labels: {
                    show: true,
                    value: {
                      show: true,
                      fontSize: '20px',
                      fontWeight: 600,
                      color: '#333',
                      formatter: (val) => val,
                    },
                    total: {
                      show: true,
                      label: 'Total',
                      formatter: () => total,
                    },
                  },
                },
              },
            },
            responsive: [
              { breakpoint: 480, options: { chart: { width: 200 } } },
            ],
          };

          return (
           <div
           key={index}
           onClick={() => setSelectedFlows(firm.code)}
           className={`attendance-card p-2 bg-white shadow rounded-lg cursor-pointer transition border-2 ${
             selectedFlows === firm.code ? "border-blue-500" : "border-transparent"
           }`}
         >         
              <div className="card-header flex justify-between items-center mb-1">
                <div className="firm-name text-base font-semibold">{firm.name}</div>
              </div>
              <div className="chart-wrapper">
                <ReactApexChart
                  options={chartOptions}
                  series={[count.absent, count.present, count.leave]}
                  type="donut"
                  height={150}
                />
              </div>
              <div className="attendance-breakdown flex justify-between items-center mt-1 text-center">
                <div className="breakdown-item flex-1">
                  <span className="block text-red-600 font-medium text-sm">Absent</span>
                  <span className="block text-base font-bold">{count.absent}</span>
                </div>
                <div className="breakdown-item flex-1">
                  <span className="block text-yellow-600 font-medium text-sm">Present</span>
                  <span className="block text-base font-bold">{count.present}</span>
                </div>
                <div className="breakdown-item flex-1">
                  <span className="block text-yellow-600 font-medium text-sm">Leave</span>
                  <span className="block text-base font-bold">{count.leave}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AttendanceCards;
