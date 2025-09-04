import React, { useEffect, useState } from "react";
import axios from "axios";
import config from "../../../config";
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  Tooltip, XAxis, YAxis, CartesianGrid, Legend
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Activity } from "lucide-react";
import "./style.scss";
import KPIStatCard from "../kpiStats";

const backendUrl = config.backend_url;

const COLORS = ["#4E79A7","#F28E2B","#E15759","#76B7B2","#59A14F",
  "#EDC949","#AF7AA1","#FF9DA7","#9C755F","#BAB0AC"];

const dummyData = {
  totals: {
    additions: 120000,
    deductions: 45000,
    net: 75000,
    changePercent: 12.5,
    trend: [20000, 30000, 40000, 50000] // mini sparkline
  },
  deductionsTrend: [15000, 14000, 12000, 18000],
  netTrend: [50000, 60000, 65000, 75000],
  changeTrend: [5, 8, 10, 12.5], 
  trend: [
    { month: "Jul", additions: 30000, deductions: 15000 },
    { month: "Aug", additions: 40000, deductions: 12000 },
    { month: "Sep", additions: 50000, deductions: 18000 }
  ],
  firms: [
    { firm: "SiddhaCorp_01", additions: 50000, deductions: 15000 },
    { firm: "SiddhaCorp_02", additions: 40000, deductions: 20000 },
    { firm: "SiddhaCorp_03", additions: 30000, deductions: 10000 }
  ],
  categories: {
    additions: [
      { name: "transport", value: 30000 },
      { name: "allowance", value: 25000 },
      { name: "bonus", value: 45000 }
    ],
    deductions: [
      { name: "penalty", value: 15000 },
      { name: "loan", value: 20000 },
      { name: "tax", value: 10000 }
    ]
  },
  topEmployees: {
    additions: [
      { name: "Amit Kumar", value: 20000 },
      { name: "Rahul Jain", value: 18000 },
      { name: "Manoj Sharma", value: 15000 },
      { name: "Navneet Paliwal", value: 12000 },
      { name: "Sonu Kagra", value: 10000 }
    ],
    deductions: [
      { name: "Mohd Yusuf", value: 12000 },
      { name: "Rajesh Kumar", value: 10000 },
      { name: "Pankaj Thaneja", value: 9000 },
      { name: "Shailendra", value: 7000 },
      { name: "Babu Sharma", value: 5000 }
    ]
  },
  
};

const ExpenseOverview = ({ month, year }) => {
  const { totals, trend, firms, categories, topEmployees } = dummyData;
  const combinedTopEmployees = [
    ...topEmployees.additions.map(e => ({ name: e.name, additions: e.value, deductions: 0 })),
    ...topEmployees.deductions.map(e => ({ name: e.name, additions: 0, deductions: e.value }))
    ];

    const [overviewData, setOverviewData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!month || !year) return;

        const fetchData = async () => {
        try {
            setLoading(true);
            const res = await axios.post(`${backendUrl}/charts/payroll/overview`, {
            month,
            year,
            });
            setOverviewData(res.data.data.totals);
        } catch (err) {
            console.error("Error fetching payroll overview:", err);
        } finally {
            setLoading(false);
        }
        };

        fetchData();
    }, [month, year]);

    if (loading) return <p>Loading overview...</p>;
    if (!overviewData) return <p>No data available</p>;

    const {
        additions,
        deductions,
        net,
        changePercent,
        additionsTrend = [],
        deductionsTrend = [],
        netTrend = [],
        changeTrend = [],
    } = overviewData;


    
  return (
    <div className="expense-overview">
      {/* ✅ NEW KPI ROW */}
      <div className="kpi-row">
        <KPIStatCard
          title="Total Additions"
          value={`₹${additions.toLocaleString()}`}
          change={changePercent}
          data={additionsTrend.map(v => ({ value: v }))}
          icon={<TrendingUp size={18} />}
        />
        <KPIStatCard
          title="Total Deductions"
          value={`₹${deductions.toLocaleString()}`}
          change={-8.2} // replace with real % if backend gives it
          data={deductionsTrend.map(v => ({ value: v }))}
          icon={<TrendingDown size={18} />}
        />
        <KPIStatCard
          title="Net"
          value={`₹${net.toLocaleString()}`}
          change={5.1} // replace with real % if backend gives it
          data={netTrend.map(v => ({ value: v }))}
          icon={<DollarSign size={18} />}
        />
        <KPIStatCard
          title="Change vs Last Month"
          value={`${changePercent}%`}
          change={changePercent}
          data={changeTrend.map(v => ({ value: v }))}
          icon={<Activity size={18} />}
        />
      </div>

      {/* FIRM BAR CHART */}
      {/* <div className="chart-block">
        <h3>Firm-wise Additions & Deductions</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={firms}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="firm" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="additions" fill="#4E79A7" />
            <Bar dataKey="deductions" fill="#E15759" />
          </BarChart>
        </ResponsiveContainer>
      </div> */}


        {/* CATEGORY PIES + TOP EMPLOYEES → All in one row */}
        {/* <div className="chart-row">
        <div className="chart-block quarter">
            <h3>Additions by Category</h3>
            <ResponsiveContainer width="100%" height={180}>
            <PieChart>
                <Pie data={categories.additions} dataKey="value" nameKey="name" outerRadius={70}>
                {categories.additions.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
                </Pie>
                <Tooltip />
            </PieChart>
            </ResponsiveContainer>
        </div>

        <div className="chart-block quarter">
            <h3>Deductions by Category</h3>
            <ResponsiveContainer width="100%" height={180}>
            <PieChart>
                <Pie data={categories.deductions} dataKey="value" nameKey="name" outerRadius={70}>
                {categories.deductions.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
                </Pie>
                <Tooltip />
            </PieChart>
            </ResponsiveContainer>
        </div>

            <div className="chart-block half">
            <h3>Top 5 Additions vs Deductions</h3>
            <ResponsiveContainer width="100%" height={250}>
                <LineChart data={combinedTopEmployees}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                    type="monotone"
                    dataKey="additions"
                    name="Additions"
                    stroke="#4E79A7"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                />
                <Line
                    type="monotone"
                    dataKey="deductions"
                    name="Deductions"
                    stroke="#E15759"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                />
                </LineChart>
            </ResponsiveContainer>
            </div>


        </div> */}

    </div>
  );
};

export default ExpenseOverview;
