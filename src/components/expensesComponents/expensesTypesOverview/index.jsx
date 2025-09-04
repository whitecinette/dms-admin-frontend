import React, { useEffect, useState } from "react";
import axios from "axios";
import config from "../../../config";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LabelList   
} from "recharts";
import './style.scss';

const backendUrl = config.backend_url;

const COLORS = [
  "#4E79A7", "#F28E2B", "#E15759", "#76B7B2", "#59A14F",
  "#EDC949", "#AF7AA1", "#FF9DA7", "#9C755F", "#BAB0AC"
];

const ExpenseTypeOverview = ({ month, year }) => {
  const [current, setCurrent] = useState([]);
  const [trend, setTrend] = useState([]);
  const [top5, setTop5] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!month || !year) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await axios.post(`${backendUrl}/charts/payroll/insights`, {
          month,
          year,
        });

        if (res.data.success) {
          // 🔹 Current Month Breakdown
          const currentData = Object.entries(res.data.data.currentBreakdown).map(
            ([name, value]) => ({ name, value })
          );
          setCurrent(currentData);

          // 🔹 Trends (3 months)
          const trendData = res.data.data.trends.map(t => {
            const { month, ...rest } = t;
             const total = Object.values(rest).reduce((a, b) => a + (b || 0), 0);
            return { month, ...rest, total };
          });
          setTrend(trendData);

          // 🔹 Top 5
          setTop5(res.data.data.topExpenses);
        }
      } catch (err) {
        console.error("Error fetching expense insights:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [month, year]);

  if (loading) return <p>Loading expense insights...</p>;
  if (!current.length && !trend.length) return <p>No data available</p>;

  return (
    <div className="expense-type-overview">
      <h2>Expense Insights</h2>

      <div className="charts-grid">
        {/* 🔹 Donut for current month */}
        <div className="chart-card">
          <h4>Current Month Breakdown</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={current}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={100}
                label
              >
                {current.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 🔹 Stacked Bar for 3-month trend */}
        <div className="chart-card">
          <h4>Expense Trends (3 Months)</h4>
            <ResponsiveContainer width="100%" height={280}>   {/* was 250, increased */}
            <BarChart
                data={trend}
                margin={{ top: 30, right: 20, left: 20, bottom: 5 }} // 👈 add extra top margin
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />

                {trend.length > 0 &&
                Object.keys(trend[0])
                    .filter((k) => k !== "month" && k !== "total")
                    .map((key, idx, arr) => (
                    <Bar
                        key={key}
                        dataKey={key}
                        stackId="a"
                        fill={COLORS[idx % COLORS.length]}
                    >
                        {idx === arr.length - 1 && (
                        <LabelList
                            dataKey="total"
                            position="top"
                            offset={10}  // 👈 push labels up so they don’t overlap
                            formatter={(val) => `₹${val.toLocaleString()}`}
                            style={{
                            fontWeight: "bold",
                            fill: "#111",
                            fontSize: 12,
                            }}
                        />
                        )}
                    </Bar>
                    ))}
            </BarChart>
            </ResponsiveContainer>


        </div>

        {/* 🔹 Horizontal Bar for Top 5 */}
        <div className="chart-card">
          <h4>Top 5 Expense Types</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              layout="vertical"
              data={top5}
              margin={{ left: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: "#444" }}  // 👈 smaller text, darker color
                width={90}  // 👈 optional: extra space so text doesn’t cut off
                />
              <Tooltip />
              <Bar dataKey="value" fill="#4E79A7" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ExpenseTypeOverview;
