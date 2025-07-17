import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title
} from 'chart.js';
import './DonutChart.scss';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, Title);

const DonutChart = ({ data }) => {
  const chartData = {
    labels: ['Paid', 'Pending', 'Generated'],
    datasets: [
      {
        data: [data.paid, data.pending, data.generated],
        backgroundColor: ['#a430ef', '#a871e0', '#f5f5f5'],
        borderWidth: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        displayColors: false,
        callbacks: {
          title: () => null,
          label: function (context) {
            const label = context.label || '';
            const value = context.raw || 0;
            return `${label}: ${value}`;
          },
        },
      },
    },
  };

  return (
      <div className="donut-chart-container">
        <Doughnut
            data={chartData}
            options={options}
            plugins={[{
              id: 'doughnutLineLabels',
              afterDraw: (chart) => {
                const { ctx, chartArea: { left, right, top, bottom, width, height } } = chart;
                chart.data.datasets.forEach((dataset, i) => {
                  chart.getDatasetMeta(i).data.forEach((datapoint, index) => {
                    // Skip drawing if the value is 0
                    if (dataset.data[index] === 0) return;

                    const x = datapoint.tooltipPosition().x;
                    const y = datapoint.tooltipPosition().y;
                    const xLine = x >= width / 2 ? x + 10 : x - 15;
                    const xLabel = x >= width / 2 ? x + 25 : x - 30;
                    const yLabel = y;

                    // Draw line
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(xLine, y);
                    ctx.lineTo(xLabel, yLabel);
                    ctx.strokeStyle = dataset.backgroundColor[index];
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    // Draw text
                    const text = `${chart.data.labels[index]}: ${dataset.data[index]}`;
                    const textX = x >= width / 2 ? 'left' : 'right';
                    const margin = x >= width / 2 ? 5 : -5;

                    ctx.font = 'regular 12px Arial';
                    ctx.textAlign = textX;
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#333';
                    ctx.fillText(text, xLabel + margin, yLabel);
                  });
                });
              }
            }]}
        />
        <div className="chart-center-text">
          <div className="total">{data.total}</div>
          <div className="label">Total</div>
        </div>
      </div>
  );
};

export default DonutChart;