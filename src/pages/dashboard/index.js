import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import ReactECharts from "echarts-for-react";
import config from "../../config.js";
import { useFilters } from "../../context/filterContext.js";
import "./style.scss";

const backendUrl = config.backend_url;

const TREND_OPTIONS = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
];

const EXTRACTION_TREND_KEY = {
  daily: "extractionBrandTrendDaily",
  weekly: "extractionBrandTrendWeekly",
  monthly: "extractionBrandTrendMonthly",
  yearly: "extractionBrandTrendMonthly",
};

const numberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

const EXTRACTION_COLORS = [
  "#2563eb",
  "#16a34a",
  "#f97316",
  "#a21caf",
  "#0891b2",
  "#dc2626",
  "#4f46e5",
  "#65a30d",
  "#db2777",
  "#0f766e",
];

function toDateInputValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCompact(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "0";

  if (Math.abs(num) >= 10000000) return `${(num / 10000000).toFixed(2)} Cr`;
  if (Math.abs(num) >= 100000) return `${(num / 100000).toFixed(2)} L`;
  if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(1)} K`;

  return numberFormatter.format(num);
}

function formatPct(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function formatPeriod(period, trend) {
  if (!period) return "-";

  if (trend === "weekly") {
    return period.replace("W", " W");
  }

  if (trend === "monthly") {
    const [year, month] = String(period).split("-");
    if (!year || !month) return period;
    const dt = new Date(Number(year), Number(month) - 1, 1);
    return dt.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
  }

  if (trend === "daily") {
    const dt = new Date(period);
    if (Number.isNaN(dt.getTime())) return period;
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  }

  return String(period);
}

function Dashboard() {
  const {
    selectedValue,
    setSelectedValue,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
  } = useFilters();

  const [trend, setTrend] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    if (!startDate || !endDate) {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay);
      setEndDate(now);
    }
  }, [startDate, endDate, setStartDate, setEndDate]);

  const fetchOverview = useCallback(async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    setError("");

    try {
      const res = await axios.post(
        `${backendUrl}/main-dashboard/overview`,
        {
          startDate: toDateInputValue(startDate),
          endDate: toDateInputValue(endDate),
          metric: selectedValue,
          flow_name: "default_sales_flow",
          subordinate_filters: {},
          dealer_filters: {},
          attendance_filters: {},
          coverage_filters: {},
          recent_days: 7,
        },
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );

      setOverview(res.data || null);
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to load dashboard overview";
      setError(message);
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedValue]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const salesKpis = overview?.kpis?.sales || {};
  const coverageKpis = overview?.kpis?.coverage || {};
  const extractionKpis = overview?.kpis?.extraction || {};
  const attendanceKpis = overview?.kpis?.attendance || {};

  const salesTrendData = useMemo(() => {
    const rows = overview?.charts?.salesTrend?.[trend] || [];
    return rows.map((row) => ({
      ...row,
      label: formatPeriod(row.period, trend),
    }));
  }, [overview, trend]);

  const extractionBrands = useMemo(() => {
    const rows = overview?.charts?.extractionBrandShare || [];
    return rows
      .filter((item) => Number(item?.sharePct || 0) > 0)
      .map((item) => item.brand);
  }, [overview]);

  const extractionTrendData = useMemo(() => {
    const trendKey = EXTRACTION_TREND_KEY[trend] || "extractionBrandTrendMonthly";
    const rows = overview?.charts?.[trendKey] || [];
    return rows.map((row) => ({
      ...row,
      label: formatPeriod(row.period, trend),
    }));
  }, [overview, trend]);

  const coverageTrendData = useMemo(() => {
    const rows = overview?.charts?.coverageTrend || [];
    return rows.map((row) => ({
      ...row,
      label: formatPeriod(row.period, "daily"),
    }));
  }, [overview]);

  const attendanceOverviewCards = useMemo(
    () => [
      {
        key: "present",
        label: "Present",
        value: Number(attendanceKpis.present || 0) + Number(attendanceKpis.pending || 0),
        tone: "present",
      },
      { key: "halfDay", label: "Half Day", value: Number(attendanceKpis.halfDay || 0), tone: "halfday" },
      { key: "leave", label: "Leave", value: Number(attendanceKpis.leave || 0), tone: "leave" },
      { key: "absent", label: "Absent", value: Number(attendanceKpis.absent || 0), tone: "absent" },
      { key: "pending", label: "Pending", value: Number(attendanceKpis.pending || 0), tone: "pending" },
      { key: "totalEligible", label: "Eligible", value: Number(attendanceKpis.totalEligible || 0), tone: "eligible" },
    ],
    [attendanceKpis]
  );

  const attendanceFirmData = useMemo(() => {
    const rows = overview?.charts?.attendanceFirmBreakdown || [];
    return rows.slice(0, 10).map((row) => ({
      label: row.firmName || row.firmCode || "NA",
      present: Number(row.present || 0),
      halfDay: Number(row.halfDay || 0),
      leave: Number(row.leave || 0),
      absent: Number(row.absent || 0),
      pending: Number(row.pending || 0),
      totalEligible: Number(row.totalEligible || 0),
    }));
  }, [overview]);

  const extractionBrandShareData = useMemo(() => {
    const rows = overview?.charts?.extractionBrandShare || [];
    return rows.slice(0, 8).map((row) => ({
      brand: row.brand,
      sharePct: Number(row.sharePct || 0),
    }));
  }, [overview]);

  const heatmapOption = useMemo(() => {
    const salesRows = overview?.charts?.salesRegionHeatmap || [];
    const coverageRows = overview?.charts?.coverageRegionHeatmap || [];
    const attendanceRows = overview?.charts?.attendanceGeoHeatmap || [];

    const districtUniverse = salesRows.slice(0, 15).map((item) => item.district);
    const districts = [...new Set(districtUniverse.filter(Boolean))];

    const coverageMap = new Map(
      coverageRows.map((row) => [row.district, Number(row.coveragePct || 0)])
    );

    const attendanceMap = new Map(
      attendanceRows.map((row) => {
        const totalStatus =
          Number(row.present || 0) +
          Number(row.absent || 0) +
          Number(row.halfDay || 0) +
          Number(row.leave || 0) +
          Number(row.pending || 0);
        const presentPct = totalStatus
          ? (Number(row.present || 0) / totalStatus) * 100
          : 0;
        return [row.district, presentPct];
      })
    );

    const maxSales = Math.max(...salesRows.map((row) => Number(row.total || 0)), 0);

    const metricRows = ["Sales Strength", "Coverage %", "Attendance %"];
    const points = [];

    districts.forEach((district, index) => {
      const sales = salesRows.find((row) => row.district === district);
      const salesPct = maxSales
        ? (Number(sales?.total || 0) / maxSales) * 100
        : 0;

      points.push([index, 0, Number(salesPct.toFixed(2))]);
      points.push([index, 1, Number((coverageMap.get(district) || 0).toFixed(2))]);
      points.push([index, 2, Number((attendanceMap.get(district) || 0).toFixed(2))]);
    });

    return {
      tooltip: {
        position: "top",
        formatter: (params) => {
          const district = districts[params.data[0]] || "Unknown";
          const metric = metricRows[params.data[1]];
          return `${district}<br/>${metric}: ${params.data[2]}%`;
        },
      },
      grid: {
        left: 100,
        right: 20,
        top: 20,
        bottom: 80,
      },
      xAxis: {
        type: "category",
        data: districts,
        axisLabel: {
          interval: 0,
          rotate: 35,
          color: "#5f6b7a",
        },
      },
      yAxis: {
        type: "category",
        data: metricRows,
        axisLabel: {
          color: "#5f6b7a",
        },
      },
      visualMap: {
        min: 0,
        max: 100,
        calculable: true,
        orient: "horizontal",
        left: "center",
        bottom: 10,
        inRange: {
          color: ["#f97316", "#fde68a", "#86efac", "#16a34a"],
        },
      },
      series: [
        {
          type: "heatmap",
          data: points,
          label: {
            show: false,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 12,
              shadowColor: "rgba(0, 0, 0, 0.2)",
            },
          },
        },
      ],
    };
  }, [overview]);

  return (
    <div className="dashboard-v2">
      <div className="dashboard-v2__header">
        <div>
          <h3>Main Dashboard</h3>
          <p>Command center for sales, market coverage, extraction, and attendance.</p>
        </div>
        <div className="dashboard-v2__controls">
          <label>
            From
            <input
              type="date"
              value={toDateInputValue(startDate)}
              onChange={(e) => setStartDate(new Date(e.target.value))}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={toDateInputValue(endDate)}
              onChange={(e) => setEndDate(new Date(e.target.value))}
            />
          </label>
          <label>
            Metric
            <select
              value={selectedValue}
              onChange={(e) => setSelectedValue(e.target.value)}
            >
              <option value="value">Value</option>
              <option value="volume">Volume</option>
            </select>
          </label>
          <label>
            Trend
            <select value={trend} onChange={(e) => setTrend(e.target.value)}>
              {TREND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={fetchOverview} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error ? <div className="dashboard-v2__error">{error}</div> : null}

      <div className="dashboard-v2__kpis">
        <div className="kpi-card">
          <span>MTD Sell In</span>
          <strong>{formatCompact(salesKpis.mtdSellIn)}</strong>
          <small>Growth: {formatPct(salesKpis.sellInGrowthPct)}</small>
        </div>
        <div className="kpi-card">
          <span>MTD Sell Out</span>
          <strong>{formatCompact(salesKpis.mtdSellOut)}</strong>
          <small>Growth: {formatPct(salesKpis.sellOutGrowthPct)}</small>
        </div>
        <div className="kpi-card">
          <span>Market Value</span>
          <strong>{formatCompact(extractionKpis.totalMarketValue)}</strong>
          <small>Total market extraction</small>
        </div>
        <div className="kpi-card">
          <span>Coverage %</span>
          <strong>{formatPct(coverageKpis.coveragePct)}</strong>
          <small>
            Done {Number(coverageKpis.done || 0)} / Planned {Number(coverageKpis.planned || 0)}
          </small>
        </div>
        <div className="kpi-card">
          <span>Attendance Present</span>
          <strong>{Number(attendanceKpis.present || 0) + Number(attendanceKpis.pending || 0)}</strong>
          <small>Eligible: {Number(attendanceKpis.totalEligible || 0)}</small>
        </div>
        <div className="kpi-card">
          <span>Avg Hours Worked</span>
          <strong>{numberFormatter.format(Number(attendanceKpis.avgHoursWorked || 0))}</strong>
          <small>Not punched out: {Number(attendanceKpis.notPunchedOut || 0)}</small>
        </div>
      </div>

      <div className="dashboard-v2__grid">
        <section className="panel panel--wide">
          <header>
            <h3>Sales Trend</h3>
            <p>Activation vs Tertiary vs Secondary ({trend})</p>
          </header>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="activation" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="tertiary" stroke="#16a34a" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="secondary" stroke="#f97316" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </section>

        <section className="panel">
          <header>
            <h3>Region Heatmap</h3>
            <p>District strength across sales, coverage, attendance</p>
          </header>
          <ReactECharts option={heatmapOption} style={{ height: 320 }} />
        </section>

        <section className="panel">
          <header>
            <h3>Extraction Trend</h3>
            <p>All brands with sales in selected period</p>
          </header>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={extractionTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              {extractionBrands.map((brand, index) => (
                <Line
                  key={brand}
                  type="monotone"
                  dataKey={brand}
                  stroke={EXTRACTION_COLORS[index % EXTRACTION_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </section>

        <section className="panel">
          <header>
            <h3>Brand Share</h3>
            <p>Current extraction share by brand</p>
          </header>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart layout="vertical" data={extractionBrandShareData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis dataKey="brand" type="category" width={90} />
              <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
              <Bar dataKey="sharePct" fill="#0ea5e9" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="panel">
          <header>
            <h3>Market Coverage Trend</h3>
            <p>Planned vs done vs pending</p>
          </header>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={coverageTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="planned" fill="#94a3b8" radius={[6, 6, 0, 0]} />
              <Bar dataKey="done" fill="#22c55e" radius={[6, 6, 0, 0]} />
              <Bar dataKey="pending" fill="#f97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="panel panel--wide">
          <header>
            <h3>Attendance Overview (Today)</h3>
            <p>
              Overall and firm-wise status snapshot for{" "}
              {attendanceKpis.asOfDate || toDateInputValue(new Date())}
            </p>
          </header>
          <div className="attendance-overview">
            <div className="attendance-overview__cards">
              {attendanceOverviewCards.map((card) => (
                <div className={`attendance-overview-card ${card.tone}`} key={card.key}>
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                </div>
              ))}
            </div>
            <div className="attendance-overview__firm-chart">
              {attendanceFirmData.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart layout="vertical" data={attendanceFirmData} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="label" type="category" width={120} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="present" stackId="a" fill="#16a34a" />
                    <Bar dataKey="halfDay" stackId="a" fill="#0ea5e9" />
                    <Bar dataKey="leave" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="absent" stackId="a" fill="#ef4444" />
                    <Bar dataKey="pending" stackId="a" fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="attendance-overview__empty">No firm-wise attendance data for selected date range.</div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Dashboard;
