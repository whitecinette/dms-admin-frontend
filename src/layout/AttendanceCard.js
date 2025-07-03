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
   <div className="attendance-cards-grid">
     {firmAttendanceData.map((firm, index) => {
  const count = firm.attendanceCounts || { present: 0, leave: 0, absent: 0 };
  const total = firm.totalUsers || 0;
  
  // 👇 get the most dominant category
  const labels = ['Absent', 'Present', 'Leave'];
  const values = [count.absent, count.present, count.leave];
  const maxIndex = values.indexOf(Math.max(...values));
  const mostLabel = labels[maxIndex];
  
  // 👇 configure chart
 //  const chartOptions = {
 //   chart: {
 //     type: 'donut',
 //     sparkline: { enabled: true },
 //   },
 //   labels: ['Absent', 'Present', 'Leave'],
 //   colors: ['#d0a3f5', '#9b5de5', '#c084fc'],
 //   dataLabels: {
 //     enabled: false,
 //   },
 //   legend: { show: false },
 //   plotOptions: {
 //     pie: {
 //       donut: {
 //         size: '75%',
 //         labels: {
 //           show: true,
 //           name: { show: true,
 //            fontSize: '20px',
 //            fontWeight: 700,
 //            color: '#000',
 //            offsetY: -20, // Move the number downward
 //            },
 //           value: {
 //             show: true,
 //             fontSize: '20px',
 //             fontWeight: 700,
 //             color: '#000',
 //             offsetY: -10,
 //           },
 //           total: {
 //             show: true,
 //             showAlways: true,
 //             label: 'Total',
 //             fontSize: '14px',
 //             fontWeight: 500,
 //             color: '#888',
 //             formatter: () => total.toString(), // Display the total number
 //           },
 //         },
 //       },
 //     },
 //   },
 // };
 
 const chartOptions = {
  chart: {
    type: 'donut',
    sparkline: { enabled: true },
  },
  labels: ['Absent', 'Present', 'Leave'],
  colors: ['#d0a3f5', '#9b5de5', '#c084fc'],
  dataLabels: {
    enabled: true, // Enable data labels
    formatter: function (val, opts) {
      // Show label and value (e.g., "Present: 20")
      return `${opts.w.globals.labels[opts.seriesIndex]}: ${opts.w.globals.series[opts.seriesIndex]}`;
    },
    style: {
      fontSize: '12px',
      fontWeight: 500,
      colors: ['#6b21a8'], // Dark purple text to match chart theme
    },
    background: {
      enabled: true, // Enable background
      foreColor: '#f0f0f0', // Light gray background
      padding: 4,
      borderRadius: 2,
      borderWidth: 1,
      borderColor: '#ccc', // Light gray border
      opacity: 0.8, // Slightly transparent
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
          name: { show: true,
           fontSize: '20px',
           fontWeight: 800,
           color: '#000',
           offsetY: -10, // Move number downward
           },
          value: {
            show: true,
            fontSize: '20px',
            fontWeight: 700,
            color: '#000',
            offsetY: 10, // Move number downward
          },
          total: {
            show: true,
            showAlways: true,
            label: 'Total', // Display "Total" as the label
            fontSize: '14px',
            fontWeight: 500,
            color: '#888',
            offsetY: -10, // Move "Total" upward
            formatter: () => total.toString(), // Display the total number
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
           {/* <div className="legend-row">
             <span className="dot" style={{ backgroundColor: '#9b5de5' }}></span>
             <span className="legend-label">Present</span>
             <span className="legend-value">{count.present}</span>
           </div>
           <div className="legend-row">
             <span className="dot" style={{ backgroundColor: '#d0a3f5' }}></span>
             <span className="legend-label">Absent</span>
             <span className="legend-value">{count.absent}</span>
           </div>
           <div className="legend-row">
             <span className="dot" style={{ backgroundColor: '#c084fc' }}></span>
             <span className="legend-label">Leave</span>
             <span className="legend-value">{count.leave}</span>
           </div> */}
         </div>
       );
     })}
   </div>
 </div>
);

};

export default AttendanceCards;
