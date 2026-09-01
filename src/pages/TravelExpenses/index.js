import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FaArrowLeft,
  FaChartBar,
  FaCheckCircle,
  FaClock,
  FaFileInvoice,
  FaChevronRight,
  FaFilter,
  FaMapMarkedAlt,
  FaMoneyBillWave,
  FaPlaneDeparture,
  FaRoad,
  FaRupeeSign,
  FaSlidersH,
  FaTimesCircle,
} from "react-icons/fa";
import config from "../../config";
import CustomAlert from "../../components/CustomAlert";
import "./style.scss";

const backendUrl = config.backend_url;
const MAX_AMOUNT_FILTER = 200000;
const chartColors = ["#2563eb", "#0f766e", "#f59e0b", "#db2777", "#7c3aed", "#0891b2", "#16a34a", "#dc2626"];

const monthBounds = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const toInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  return { startDate: toInput(start), endDate: toInput(end) };
};

const getAuthHeader = () => {
  const raw = localStorage.getItem("authToken") || "";
  if (!raw) return {};
  return { Authorization: raw.startsWith("Bearer ") ? raw : `Bearer ${raw}` };
};

const formatMoney = (value) => {
  const amount = Number(value || 0);
  return `Rs. ${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};

const formatNumber = (value, suffix = "") => {
  const n = Number(value || 0);
  return `${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}${suffix}`;
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const titleCase = (value = "") =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const sourceLabel = (value = "") => {
  const source = String(value || "").toLowerCase();
  if (source.includes("market_coverage")) return "Market coverage track";
  if (source.includes("manual")) return "Manual travel distance";
  if (source.includes("unavailable")) return "Distance unavailable";
  return titleCase(source || "Not available");
};

const moneyTick = (value) => {
  const amount = Number(value || 0);
  if (amount >= 100000) return `${Math.round(amount / 100000)}L`;
  if (amount >= 1000) return `${Math.round(amount / 1000)}K`;
  return `${amount}`;
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <span key={item.dataKey} style={{ color: item.color }}>
          {item.name}: {item.dataKey?.toLowerCase?.().includes("amount") || item.dataKey === "value" ? formatMoney(item.value) : formatNumber(item.value)}
        </span>
      ))}
    </div>
  );
};

const DocumentViewer = ({ documents, onClose }) => {
  const [docIndex, setDocIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const currentDocument = documents?.[docIndex] || "";
  const extension = currentDocument.split(".").pop()?.toLowerCase();
  const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(extension);

  useEffect(() => {
    setImageError(false);
  }, [docIndex]);

  if (!documents?.length) return null;

  return (
    <div className="expense-document-overlay" onClick={onClose}>
      <div className="expense-document-viewer" onClick={(e) => e.stopPropagation()}>
        <button className="viewer-close" onClick={onClose} aria-label="Close document">x</button>
        {isImage ? (
          <div className="viewer-image-frame">
            <img src={currentDocument} alt={`Bill ${docIndex + 1}`} onError={() => setImageError(true)} style={{ display: imageError ? "none" : "block" }} />
            {imageError && <div className="viewer-error">Unable to load this bill.</div>}
          </div>
        ) : (
          <iframe src={`${currentDocument}#toolbar=0`} title={`Bill ${docIndex + 1}`} />
        )}
        {documents.length > 1 && (
          <div className="viewer-nav">
            <button disabled={docIndex === 0} onClick={() => setDocIndex((prev) => prev - 1)}>Prev</button>
            <span>{docIndex + 1} / {documents.length}</span>
            <button disabled={docIndex === documents.length - 1} onClick={() => setDocIndex((prev) => prev + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
};

const Kpi = ({ icon, label, value, note, tone }) => (
  <div className={`expense-kpi ${tone || ""}`}>
    <div className="expense-kpi-icon">{icon}</div>
    <div>
      <p>{label}</p>
      <strong>{value}</strong>
      {note && <span>{note}</span>}
    </div>
  </div>
);

const MiniBar = ({ label, value, max, tone }) => {
  const width = max > 0 ? Math.max((Number(value || 0) / max) * 100, value ? 8 : 0) : 0;
  return (
    <div className="mini-bar-row">
      <div className="mini-bar-label">
        <span>{label}</span>
        <b>{formatMoney(value)}</b>
      </div>
      <div className="mini-bar-track"><span className={tone || ""} style={{ width: `${Math.min(width, 100)}%` }} /></div>
    </div>
  );
};

const ChartCard = ({ title, eyebrow, children, className = "" }) => (
  <section className={`expense-panel analytics-card ${className}`}>
    <div className="panel-title compact-title">
      <div>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <FaChartBar />
    </div>
    <div className="chart-frame">{children}</div>
  </section>
);

const EmptyChart = ({ label = "No analytics data for these filters." }) => (
  <div className="empty-chart">{label}</div>
);

const AmountRange = ({ min, max, onChange }) => {
  const low = Math.min(Number(min || 0), Number(max || MAX_AMOUNT_FILTER));
  const high = Math.max(Number(min || 0), Number(max || MAX_AMOUNT_FILTER));
  const left = (low / MAX_AMOUNT_FILTER) * 100;
  const right = 100 - (high / MAX_AMOUNT_FILTER) * 100;

  return (
    <div className="filter-field amount-filter">
      <label>Amount Range</label>
      <div className="amount-range-values">
        <span>{formatMoney(low)}</span>
        <span>{formatMoney(high)}</span>
      </div>
      <div className="range-slider">
        <div className="range-track" />
        <div className="range-selected" style={{ left: `${left}%`, right: `${right}%` }} />
        <input type="range" min="0" max={MAX_AMOUNT_FILTER} step="500" value={low} onChange={(e) => onChange("minAmount", Math.min(Number(e.target.value), high))} />
        <input type="range" min="0" max={MAX_AMOUNT_FILTER} step="500" value={high} onChange={(e) => onChange("maxAmount", Math.max(Number(e.target.value), low))} />
      </div>
    </div>
  );
};


const ClaimsTable = ({ claims, loading, reviewingId, onReview, onViewDocs, emptyLabel = "No reimbursement requests found." }) => (
  <div className="claims-table-wrap">
    <table className="claims-table">
      <thead>
        <tr>
          <th>Employee</th><th>Trip & Towns</th><th>Base</th><th>Travel Distance</th><th>Rates</th><th>Amount</th><th>Status</th><th>Bills</th><th>Action</th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <tr><td colSpan="9" className="table-empty">Loading expenses...</td></tr>
        ) : claims.length ? claims.map((claim) => {
          const towns = claim.marketCoverage?.towns || claim.compensation_estimate?.market_coverage_towns || [];
          const base = claim.baseLocation || claim.base_location_snapshot || claim.compensation_policy?.base_location || {};
          const rates = claim.rates || claim.compensation_estimate?.rates || {};
          const isPending = String(claim.status || "").toLowerCase() === "pending";
          return (
            <tr key={claim._id}>
              <td><strong>{claim.employee?.name || "Unknown"}</strong><span>{claim.employee?.code || claim.code} · {claim.employee?.position || "-"}</span><small>{claim.employee?.firmName || claim.employee?.firmCode || "N/A"}</small></td>
              <td><strong>{formatDate(claim.tripStartDate || claim.billDate)} - {formatDate(claim.tripEndDate || claim.billDate)}</strong><span>{claim.billType || "Expense"} · {titleCase(claim.transportMode || claim.transport_mode || "mode missing")}</span><div className="town-tags">{towns.length ? towns.slice(0, 5).map((town) => <em key={town}>{town}</em>) : <em>N/A</em>}</div></td>
              <td><strong>{base.label || "N/A"}</strong><span>{base.address || "-"}</span><small>{base.latitude ? `${base.latitude}, ${base.longitude}` : "No coordinates"}</small></td>
              <td><strong>{formatNumber(claim.travelDistanceKm || claim.compensation_estimate?.distance_km || claim.distanceKm, " km")}</strong><span>{sourceLabel(claim.distanceSource || claim.compensation_estimate?.distance_basis || claim.compensation_estimate?.distance_source)}</span><small>{claim.marketCoverage?.total || 0} planned · {claim.marketCoverage?.done || 0} done</small></td>
              <td><strong>{formatMoney(rates.km_rate)}/km</strong><span>Daily {formatMoney(rates.daily_budget)}</span><small>Hotel {formatMoney(rates.hotel_rate)} · Food {formatMoney(rates.food_rate)}</small></td>
              <td><strong>{formatMoney(claim.amount)}</strong><span>Allowed {formatMoney(claim.compensation_estimate?.policy_allowed_amount)}</span><small>Approved {formatMoney(claim.approvedAmount)}</small></td>
              <td><span className={`status-badge ${claim.status}`}>{titleCase(claim.status || "pending")}</span></td>
              <td>{claim.billImages?.length ? <button className="doc-btn" onClick={() => onViewDocs(claim.billImages)}>View {claim.billImages.length}</button> : <span className="muted">No file</span>}</td>
              <td>{isPending ? <div className="row-actions"><button disabled={reviewingId === claim._id} onClick={() => onReview(claim, "approved")} className="approve-btn">Approve</button><button disabled={reviewingId === claim._id} onClick={() => onReview(claim, "rejected")} className="reject-btn">Reject</button></div> : <span className="muted">Reviewed</span>}</td>
            </tr>
          );
        }) : <tr><td colSpan="9" className="table-empty">{emptyLabel}</td></tr>}
      </tbody>
    </table>
  </div>
);

const EmployeeSummaryTable = ({ rows, loading, onSelect }) => (
  <section className="expense-panel employee-summary-panel">
    <div className="panel-title table-title">
      <div><p>{rows.length || 0} employees</p><h2>Employee Wise Detailed Table</h2></div>
      <FaFileInvoice />
    </div>
    <div className="employee-table-wrap">
      <table className="employee-summary-table">
        <thead>
          <tr>
            <th>Employee</th><th>Firm / Role</th><th>Requests</th><th>Claimed</th><th>Pending</th><th>Approved</th><th>Paid</th><th>Distance</th><th>Towns</th><th></th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan="10" className="table-empty">Loading employee summary...</td></tr>
          ) : rows.length ? rows.map((row) => (
            <tr key={row.code} className="employee-drill-row" onClick={() => onSelect(row)}>
              <td><strong>{row.name || "Unknown"}</strong><span>{row.code}</span></td>
              <td><strong>{row.firmName || row.firmCode || "N/A"}</strong><span>{row.position || "N/A"} · {row.role || "N/A"}</span></td>
              <td><strong>{formatNumber(row.claimCount)}</strong><span>{row.statusCounts?.pending || 0} pending · {row.statusCounts?.rejected || 0} rejected</span></td>
              <td><strong>{formatMoney(row.claimedAmount)}</strong><span>Avg {formatMoney((Number(row.claimedAmount || 0) / Math.max(Number(row.claimCount || 0), 1)).toFixed(2))}</span></td>
              <td><strong>{formatMoney(row.pendingAmount)}</strong><span>Awaiting review</span></td>
              <td><strong>{formatMoney(row.approvedAmount)}</strong><span>{row.statusCounts?.approved || 0} approved</span></td>
              <td><strong>{formatMoney(row.paidAmount)}</strong><span>{row.statusCounts?.paid || 0} paid</span></td>
              <td><strong>{formatNumber(row.travelDistanceKm, " km")}</strong><span>{formatMoney(row.rates?.km_rate)}/km</span></td>
              <td><div className="town-tags compact-tags">{(row.towns || []).length ? row.towns.slice(0, 4).map((town) => <em key={town}>{town}</em>) : <em>N/A</em>}{(row.towns || []).length > 4 && <em>+{row.towns.length - 4}</em>}</div></td>
              <td><button className="drill-btn" onClick={(e) => { e.stopPropagation(); onSelect(row); }}>View <FaChevronRight /></button></td>
            </tr>
          )) : <tr><td colSpan="10" className="table-empty">No employee expense summary found for these filters.</td></tr>}
        </tbody>
      </table>
    </div>
  </section>
);

const sanitizeQueryParams = (base, overrides = {}) => {
  const params = { ...base, ...overrides };
  if (Number(params.minAmount) <= 0) delete params.minAmount;
  if (Number(params.maxAmount) >= MAX_AMOUNT_FILTER) delete params.maxAmount;
  Object.keys(params).forEach((key) => {
    if (params[key] === "" || params[key] === undefined || params[key] === null) delete params[key];
  });
  return params;
};

const TravelExpenses = () => {
  const defaults = monthBounds();
  const [filters, setFilters] = useState({
    search: "",
    startDate: defaults.startDate,
    endDate: defaults.endDate,
    status: "",
    billType: "",
    transportMode: "",
    firmCode: "",
    flowName: "",
    position: "",
    role: "",
    minAmount: 0,
    maxAmount: MAX_AMOUNT_FILTER,
  });
  const [page, setPage] = useState(1);
  const [activeView, setActiveView] = useState("analytics");
  const [claims, setClaims] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [firms, setFirms] = useState([]);
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeDashboard, setEmployeeDashboard] = useState(null);
  const [employeeClaims, setEmployeeClaims] = useState([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [alert, setAlert] = useState({ show: false, message: "", type: "" });

  const headers = useMemo(() => getAuthHeader(), []);

  const availableFlows = useMemo(() => {
    if (!filters.firmCode) return flows;
    const firm = firms.find((item) => item.code === filters.firmCode);
    const flowTypes = firm?.flowTypes || [];
    if (!flowTypes.length) return flows;
    return flows.filter((flow) => flowTypes.includes(flow.name));
  }, [filters.firmCode, firms, flows]);

  const stats = dashboard?.stats || {};
  const charts = dashboard?.charts || {};
  const statusChart = charts.status || [];
  const billTypeChart = charts.billTypes || [];
  const claimTypeChart = charts.claimTypes || [];
  const transportChart = charts.transportModes || [];
  const firmChart = charts.firms || [];
  const positionChart = useMemo(() => charts.positions || [], [charts.positions]);
  const roleChart = useMemo(() => charts.roles || [], [charts.roles]);
  const amountBucketChart = charts.amountBuckets || [];
  const dailyTrend = charts.dailyTrend || [];
  const topEmployees = charts.topEmployees || [];
  const coverageRows = charts.coverageByEmployee || [];
  const totalBillTypeAmount = billTypeChart.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const maxBillTypeAmount = Math.max(...billTypeChart.map((item) => Number(item.value || 0)), 0);
  const employeeStats = employeeDashboard?.stats || {};
  const employeeCharts = employeeDashboard?.charts || {};
  const employeeStatusChart = employeeCharts.status || [];
  const employeeBillTypeChart = employeeCharts.billTypes || [];
  const employeeClaimTypeChart = employeeCharts.claimTypes || [];
  const employeeTransportChart = employeeCharts.transportModes || [];
  const employeeAmountBucketChart = employeeCharts.amountBuckets || [];
  const employeeDailyTrend = employeeCharts.dailyTrend || [];
  const employeeTotalBillTypeAmount = employeeBillTypeChart.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const employeeMaxBillTypeAmount = Math.max(...employeeBillTypeChart.map((item) => Number(item.value || 0)), 0);
  const currentRefreshing = selectedEmployee ? employeeLoading : loading;

  const positionOptions = useMemo(() => {
    const values = new Set(positionChart.map((item) => item.name).filter((name) => name && name !== "N/A"));
    claims.forEach((claim) => {
      const position = claim.employee?.position;
      if (position) values.add(position);
    });
    return Array.from(values).sort();
  }, [claims, positionChart]);

  const roleOptions = useMemo(() => {
    const values = new Set(roleChart.map((item) => item.name).filter((name) => name && name !== "N/A"));
    claims.forEach((claim) => {
      const role = claim.employee?.role;
      if (role) values.add(role);
    });
    return Array.from(values).sort();
  }, [claims, roleChart]);

  const queryParams = useMemo(() => sanitizeQueryParams(filters, { page, limit: 25 }), [filters, page]);

  const employeeQueryParams = useMemo(() => {
    if (!selectedEmployee?.code) return null;
    const params = sanitizeQueryParams(filters, { code: selectedEmployee.code, page: 1, limit: 500 });
    delete params.search;
    return params;
  }, [filters, selectedEmployee]);

  const setFilter = (key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "firmCode") next.flowName = "";
      return next;
    });
    setPage(1);
  };

  const closeEmployeeDrilldown = () => {
    setSelectedEmployee(null);
    setEmployeeDashboard(null);
    setEmployeeClaims([]);
  };

  const openEmployeeDrilldown = (employee) => {
    setEmployeeDashboard(null);
    setEmployeeClaims([]);
    setSelectedEmployee(employee);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const resetFilters = () => {
    const nextDefaults = monthBounds();
    closeEmployeeDrilldown();
    setFilters({
      search: "",
      startDate: nextDefaults.startDate,
      endDate: nextDefaults.endDate,
      status: "",
      billType: "",
      transportMode: "",
      firmCode: "",
      flowName: "",
      position: "",
      role: "",
      minAmount: 0,
      maxAmount: MAX_AMOUNT_FILTER,
    });
    setPage(1);
  };

  const showAlert = (message, type = "success") => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: "", type: "" }), 3000);
  };

  const fetchMeta = async () => {
    try {
      const res = await axios.get(`${backendUrl}/super-admin/hierarchy/meta`, { headers });
      const data = res.data?.data || {};
      setFirms(Array.isArray(data.firms) ? data.firms : []);
      setFlows(Array.isArray(data.flows) ? data.flows : []);
    } catch (error) {
      console.error("Failed to fetch hierarchy meta", error);
      setFirms([]);
      setFlows([]);
    }
  };

  const fetchEmployeeClaims = async () => {
    if (!employeeQueryParams) return;
    try {
      setEmployeeLoading(true);
      const dashboardParams = { ...employeeQueryParams };
      delete dashboardParams.page;
      delete dashboardParams.limit;
      const [dashboardRes, claimsRes] = await Promise.all([
        axios.get(`${backendUrl}/admin/compensation/dashboard`, { params: dashboardParams, headers }),
        axios.get(`${backendUrl}/admin/compensation/claims`, { params: employeeQueryParams, headers }),
      ]);
      setEmployeeDashboard(dashboardRes.data?.data || null);
      setEmployeeClaims(Array.isArray(claimsRes.data?.data) ? claimsRes.data.data : []);
    } catch (error) {
      console.error("Failed to fetch employee compensation claims", error);
      setEmployeeDashboard(null);
      setEmployeeClaims([]);
      showAlert(error?.response?.data?.message || "Failed to load employee expenses", "error");
    } finally {
      setEmployeeLoading(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [dashboardRes, claimsRes] = await Promise.all([
        axios.get(`${backendUrl}/admin/compensation/dashboard`, { params: queryParams, headers }),
        axios.get(`${backendUrl}/admin/compensation/claims`, { params: queryParams, headers }),
      ]);
      setDashboard(dashboardRes.data?.data || null);
      setClaims(Array.isArray(claimsRes.data?.data) ? claimsRes.data.data : []);
      setPagination(claimsRes.data?.pagination || { totalPages: 1, total: 0 });
    } catch (error) {
      console.error("Failed to fetch compensation dashboard", error);
      setDashboard(null);
      setClaims([]);
      setPagination({ totalPages: 1, total: 0 });
      showAlert(error?.response?.data?.message || "Failed to load expenses dashboard", "error");
    } finally {
      setLoading(false);
    }
  };

  const refreshCurrentView = async () => {
    if (selectedEmployee?.code) {
      await fetchEmployeeClaims();
      return;
    }
    await fetchDashboard();
  };

  useEffect(() => {
    fetchMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams]);

  useEffect(() => {
    if (selectedEmployee?.code) fetchEmployeeClaims();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeQueryParams]);

  const reviewClaim = async (claim, status) => {
    try {
      setReviewingId(claim._id);
      await axios.put(
        `${backendUrl}/admin/compensation/claims/${claim._id}/review`,
        {
          status,
          approvedAmount: status === "rejected" ? 0 : Number(claim.approvedAmount || claim.amount || 0),
        },
        { headers }
      );
      showAlert(`Claim ${status}`);
      await fetchDashboard();
      if (selectedEmployee?.code) await fetchEmployeeClaims();
    } catch (error) {
      console.error("Failed to review claim", error);
      showAlert(error?.response?.data?.message || "Failed to update claim", "error");
    } finally {
      setReviewingId("");
    }
  };

  return (
    <div className="travelExpenses-page reimbursement-dashboard analytics-dashboard">
      {alert.show && <CustomAlert message={alert.message} type={alert.type} onClose={() => setAlert({ show: false, message: "", type: "" })} />}

      <div className="expense-page-header analytics-header">
        <div>
          <p>HR / Payroll Analytics</p>
          <h1>Expenses & Reimbursements</h1>
          <span>Claims, policy limits, travel distance, payroll sync and approval performance.</span>
        </div>
        <div className="header-actions">
          {selectedEmployee && (
            <button className="header-back-btn" onClick={closeEmployeeDrilldown}>
              <FaArrowLeft /> All Employees
            </button>
          )}
          <div className="view-tabs">
            <button className={activeView === "analytics" ? "active" : ""} onClick={() => { closeEmployeeDrilldown(); setActiveView("analytics"); }}>Analytics</button>
            <button className={activeView === "queue" ? "active" : ""} onClick={() => { closeEmployeeDrilldown(); setActiveView("queue"); }}>Approval Queue</button>
          </div>
          <button className={`refresh-btn ${currentRefreshing ? "loading" : ""}`} onClick={refreshCurrentView} disabled={currentRefreshing}><FaFilter className="refresh-icon" /> Refresh</button>
        </div>
      </div>

      <div className="expense-filters analytics-filters">
        <div className="filter-field wide">
          <label>Search</label>
          <input value={filters.search} onChange={(e) => setFilter("search", e.target.value)} placeholder="Name, code, bill, remark" />
        </div>
        <div className="filter-field"><label>From</label><input type="date" value={filters.startDate} onChange={(e) => setFilter("startDate", e.target.value)} /></div>
        <div className="filter-field"><label>To</label><input type="date" value={filters.endDate} onChange={(e) => setFilter("endDate", e.target.value)} /></div>
        <div className="filter-field">
          <label>Firm</label>
          <select value={filters.firmCode} onChange={(e) => setFilter("firmCode", e.target.value)}>
            <option value="">All Firms</option>
            {firms.map((firm) => <option key={firm.code} value={firm.code}>{firm.name} ({firm.code})</option>)}
          </select>
        </div>
        <div className="filter-field">
          <label>Flow</label>
          <select value={filters.flowName} onChange={(e) => setFilter("flowName", e.target.value)}>
            <option value="">All Flows</option>
            {availableFlows.map((flow) => <option key={flow.name} value={flow.name}>{flow.name}</option>)}
          </select>
        </div>
        <div className="filter-field compact">
          <label>Position</label>
          <select value={filters.position} onChange={(e) => setFilter("position", e.target.value)}>
            <option value="">All Positions</option>
            {positionOptions.map((position) => <option key={position} value={position}>{position}</option>)}
          </select>
        </div>
        <div className="filter-field compact">
          <label>Role</label>
          <select value={filters.role} onChange={(e) => setFilter("role", e.target.value)}>
            <option value="">All Roles</option>
            {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
        </div>
        <div className="filter-field compact">
          <label>Status</label>
          <select value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        <div className="filter-field compact">
          <label>Category</label>
          <select value={filters.billType} onChange={(e) => setFilter("billType", e.target.value)}>
            <option value="">All</option>
            <option value="Travel">Travel</option>
            <option value="Fuel">Fuel</option>
            <option value="Hotel">Hotel</option>
            <option value="Food">Food</option>
            <option value="Transport">Transport</option>
            <option value="Restaurant">Restaurant</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="filter-field compact">
          <label>Mode</label>
          <select value={filters.transportMode} onChange={(e) => setFilter("transportMode", e.target.value)}>
            <option value="">All</option>
            <option value="bike">Bike</option>
            <option value="car">Car</option>
            <option value="bus">Bus</option>
            <option value="train">Train</option>
            <option value="public_transport">Public</option>
            <option value="auto">Auto</option>
            <option value="walking">Walking</option>
            <option value="other">Other</option>
          </select>
        </div>
        <AmountRange min={filters.minAmount} max={filters.maxAmount} onChange={setFilter} />
        <button className="reset-btn" onClick={resetFilters}><FaSlidersH /> Reset</button>
      </div>

      <div className="expense-kpi-grid analytics-kpis">
        <Kpi icon={<FaFileInvoice />} label="Claims" value={formatNumber(stats.totalClaims)} note={`${formatNumber(stats.attachmentlessCount)} without files`} />
        <Kpi icon={<FaRupeeSign />} label="Claimed" value={formatMoney(stats.totalClaimedAmount)} note={`Avg ${formatMoney(stats.averageClaimAmount)}`} tone="money" />
        <Kpi icon={<FaCheckCircle />} label="Approved" value={formatMoney(stats.totalApprovedAmount)} note={`${formatNumber(stats.approvalRate, "%")} approval rate`} tone="good" />
        <Kpi icon={<FaMoneyBillWave />} label="Payroll Synced" value={formatMoney(stats.totalPayrollSyncedAmount)} note="Approved additions" tone="payroll" />
        <Kpi icon={<FaClock />} label="Pending" value={formatMoney(stats.pendingAmount)} note={`${formatNumber(statusChart.find((s) => s.name === "pending")?.count)} requests`} tone="warn" />
        <Kpi icon={<FaRoad />} label="Travel Distance" value={formatNumber(stats.totalDistanceKm, " km")} note={`Allowed ${formatMoney(stats.totalAllowedAmount)}`} tone="distance" />
        <Kpi icon={<FaTimesCircle />} label="Over Budget" value={formatNumber(stats.overBudgetCount)} note={`${formatNumber(stats.rejectionRate, "%")} rejected`} tone="danger" />
      </div>

      {selectedEmployee ? (
        <>
          <div className="employee-back-strip">
            <button className="back-btn" onClick={closeEmployeeDrilldown}>
              <FaArrowLeft /> Back to all employees
            </button>
            <span>Showing selected employee analytics only</span>
          </div>
          <section className="expense-panel employee-detail-panel">
            <div className="panel-title employee-detail-title">
              <div>
                <p>Employee Drilldown</p>
                <h2>{selectedEmployee.name || "Unknown"}</h2>
                <span>{selectedEmployee.code} · {selectedEmployee.firmName || selectedEmployee.firmCode || "N/A"} · {selectedEmployee.position || "N/A"}</span>
              </div>
              <button className="back-btn" onClick={closeEmployeeDrilldown}>
                <FaArrowLeft /> Back
              </button>
            </div>
            <div className="employee-detail-kpis">
              <Kpi icon={<FaFileInvoice />} label="Employee Claims" value={formatNumber(employeeStats.totalClaims ?? selectedEmployee.claimCount)} note={`${employeeStats.statusCounts?.pending ?? selectedEmployee.statusCounts?.pending ?? 0} pending`} />
              <Kpi icon={<FaRupeeSign />} label="Claimed" value={formatMoney(employeeStats.totalClaimedAmount ?? selectedEmployee.claimedAmount)} note={`Avg ${formatMoney(employeeStats.averageClaimAmount ?? (Number(selectedEmployee.claimedAmount || 0) / Math.max(Number(selectedEmployee.claimCount || 0), 1)).toFixed(2))}`} tone="money" />
              <Kpi icon={<FaCheckCircle />} label="Approved" value={formatMoney(employeeStats.totalApprovedAmount ?? selectedEmployee.approvedAmount)} note={`${formatNumber(employeeStats.approvalRate ?? 0, "%")} approval rate`} tone="good" />
              <Kpi icon={<FaClock />} label="Pending" value={formatMoney(employeeStats.pendingAmount ?? selectedEmployee.pendingAmount)} note="Awaiting admin" tone="warn" />
              <Kpi icon={<FaRoad />} label="Travel Distance" value={formatNumber(employeeStats.totalDistanceKm ?? selectedEmployee.travelDistanceKm, " km")} note={`${formatMoney(selectedEmployee.rates?.km_rate)}/km`} tone="distance" />
            </div>
          </section>

          <div className="analytics-grid main-analytics-grid employee-analytics-grid">
            <ChartCard title="Daily Expense Trend" eyebrow="Selected Employee" className="wide-chart">
              {employeeDailyTrend.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={employeeDailyTrend} margin={{ top: 12, right: 24, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={moneyTick} tick={{ fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="claimedAmount" name="Claimed" stroke="#2563eb" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="approvedAmount" name="Approved" stroke="#16a34a" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="pendingAmount" name="Pending" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <EmptyChart label={employeeLoading ? "Loading employee analytics..." : "No trend data for this employee."} />}
            </ChartCard>

            <ChartCard title="Category Bifurcation" eyebrow="Selected Employee" className="category-pie-card">
              {employeeBillTypeChart.length ? (
                <div className="category-pie-shell">
                  <ResponsiveContainer width="100%" height={310}>
                    <PieChart>
                      <Pie data={employeeBillTypeChart} dataKey="value" nameKey="name" innerRadius={76} outerRadius={112} paddingAngle={3} cornerRadius={8} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {employeeBillTypeChart.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                      <Legend formatter={(value) => titleCase(value)} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="category-pie-center">
                    <span>Total</span>
                    <strong>{formatMoney(employeeTotalBillTypeAmount)}</strong>
                  </div>
                </div>
              ) : <EmptyChart label={employeeLoading ? "Loading employee analytics..." : "No category data for this employee."} />}
            </ChartCard>

            <ChartCard title="Claim Use Cases" eyebrow="Selected Employee">
              {employeeClaimTypeChart.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={employeeClaimTypeChart} layout="vertical" margin={{ top: 12, right: 24, left: 44, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={moneyTick} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tickFormatter={titleCase} tick={{ fontSize: 11 }} width={92} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="claimedAmount" name="Claimed" fill="#0f766e" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart label={employeeLoading ? "Loading employee analytics..." : "No claim type data for this employee."} />}
            </ChartCard>

            <ChartCard title="Amount Bands" eyebrow="Selected Employee">
              {employeeAmountBucketChart.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={employeeAmountBucketChart} margin={{ top: 12, right: 18, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name="Requests" fill="#db2777" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart label={employeeLoading ? "Loading employee analytics..." : "No amount-band data for this employee."} />}
            </ChartCard>

            <section className="expense-panel chart-panel employee-breakup-panel">
              <div className="panel-title">
                <div><p>Selected Employee</p><h2>Status, category and mode mix</h2></div>
                <FaRoad />
              </div>
              <div className="status-pills">
                {employeeStatusChart.map((item) => <span key={item.name} className={`status-pill ${item.name}`}>{titleCase(item.name)} <b>{item.count}</b></span>)}
              </div>
              <div className="mini-bars">
                {employeeBillTypeChart.length ? employeeBillTypeChart.map((item) => <MiniBar key={item.name} label={item.name} value={item.value} max={employeeMaxBillTypeAmount} />) : <div className="empty-state small">No bill type data.</div>}
              </div>
              <div className="insight-list compact-insights">
                <h3>Mode Split</h3>
                {employeeTransportChart.length ? employeeTransportChart.slice(0, 5).map((row) => <MiniBar key={row.name} label={titleCase(row.name)} value={row.value} max={Math.max(...employeeTransportChart.map((item) => Number(item.value || 0)), 0)} />) : <div className="empty-state small">No mode data.</div>}
              </div>
            </section>
          </div>

          <section className="expense-panel employee-detail-panel">
            <div className="panel-title table-title">
              <div><p>{employeeClaims.length || 0} requests</p><h2>Employee Requests</h2></div>
              <FaPlaneDeparture />
            </div>
            <ClaimsTable
              claims={employeeClaims}
              loading={employeeLoading}
              reviewingId={reviewingId}
              onReview={reviewClaim}
              onViewDocs={setSelectedDocs}
              emptyLabel="No requests found for this employee under the selected filters."
            />
          </section>
        </>
      ) : activeView === "analytics" && (
        <>
          <div className="analytics-grid main-analytics-grid">
            <ChartCard title="Daily Expense Trend" eyebrow="Timeline" className="wide-chart">
              {dailyTrend.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyTrend} margin={{ top: 12, right: 24, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={moneyTick} tick={{ fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="claimedAmount" name="Claimed" stroke="#2563eb" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="approvedAmount" name="Approved" stroke="#16a34a" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="pendingAmount" name="Pending" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </ChartCard>


            <ChartCard title="Category Bifurcation" eyebrow="Bill Type" className="category-pie-card">
              {billTypeChart.length ? (
                <div className="category-pie-shell">
                  <ResponsiveContainer width="100%" height={310}>
                    <PieChart>
                      <Pie
                        data={billTypeChart}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={76}
                        outerRadius={112}
                        paddingAngle={3}
                        cornerRadius={8}
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {billTypeChart.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                      <Legend formatter={(value) => titleCase(value)} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="category-pie-center">
                    <span>Total</span>
                    <strong>{formatMoney(totalBillTypeAmount)}</strong>
                  </div>
                </div>
              ) : <EmptyChart />}
            </ChartCard>

            <ChartCard title="Claim Use Cases" eyebrow="Claim Type">
              {claimTypeChart.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={claimTypeChart} layout="vertical" margin={{ top: 12, right: 24, left: 44, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={moneyTick} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tickFormatter={titleCase} tick={{ fontSize: 11 }} width={92} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="claimedAmount" name="Claimed" fill="#0f766e" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </ChartCard>

            <ChartCard title="Position Wise Spend" eyebrow="People">
              {positionChart.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={positionChart} margin={{ top: 12, right: 18, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={moneyTick} tick={{ fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                    <Bar dataKey="claimedAmount" name="Claimed" fill="#7c3aed" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="approvedAmount" name="Approved" fill="#16a34a" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </ChartCard>

            <ChartCard title="Amount Bands" eyebrow="Range">
              {amountBucketChart.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={amountBucketChart} margin={{ top: 12, right: 18, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name="Requests" fill="#db2777" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </ChartCard>
          </div>

          <div className="expense-dashboard-grid analytics-support-grid">
            <section className="expense-panel coverage-panel">
              <div className="panel-title">
                <div>
                  <p>Market Coverage</p>
                  <h2>Towns, base and travel distance</h2>
                </div>
                <FaMapMarkedAlt />
              </div>
              <div className="coverage-list">
                {coverageRows.length ? coverageRows.map((row) => (
                  <div className="coverage-row" key={row.code}>
                    <div className="coverage-person"><strong>{row.name}</strong><span>{row.code} · {row.firmName || row.firmCode || "N/A"}</span></div>
                    <div className="coverage-metric"><span>Base</span><b>{row.baseLocation?.label || "N/A"}</b><small>{row.baseLocation?.latitude ? `${row.baseLocation.latitude}, ${row.baseLocation.longitude}` : "Coordinates missing"}</small></div>
                    <div className="coverage-metric"><span>Travel distance</span><b>{formatNumber(row.travelDistanceKm, " km")}</b><small>{formatMoney((Number(row.travelDistanceKm || 0) * Number(row.rates?.km_rate || 0)).toFixed(2))} at {formatMoney(row.rates?.km_rate)}/km</small></div>
                    <div className="coverage-towns"><span>Towns</span><div>{(row.towns || []).length ? row.towns.slice(0, 8).map((town) => <em key={town}>{town}</em>) : <em>N/A</em>}{(row.towns || []).length > 8 && <em>+{row.towns.length - 8}</em>}</div></div>
                    <div className="coverage-status"><span>{row.coverageDone || 0} done</span><span>{row.coveragePending || 0} pending</span></div>
                  </div>
                )) : <div className="empty-state">No market coverage towns found for this date range.</div>}
              </div>
            </section>

            <section className="expense-panel chart-panel support-breakup-panel">
              <div className="panel-title">
                <div><p>Breakup</p><h2>Firm, role and mode mix</h2></div>
                <FaRoad />
              </div>
              <div className="breakup-grid">
                <div className="breakup-column">
                  <div className="status-pills">
                    {statusChart.map((item) => <span key={item.name} className={`status-pill ${item.name}`}>{titleCase(item.name)} <b>{item.count}</b></span>)}
                  </div>
                  <div className="mini-bars category-mini-bars">
                    {billTypeChart.length ? billTypeChart.map((item) => <MiniBar key={item.name} label={item.name} value={item.value} max={maxBillTypeAmount} />) : <div className="empty-state small">No bill type data.</div>}
                  </div>
                  <div className="insight-list compact-insights mode-insights">
                    <h3>Mode Split</h3>
                    {transportChart.length ? transportChart.slice(0, 5).map((row) => <MiniBar key={row.name} label={titleCase(row.name)} value={row.value} max={Math.max(...transportChart.map((item) => Number(item.value || 0)), 0)} />) : <div className="empty-state small">No mode data.</div>}
                  </div>
                </div>
                <div className="insight-list top-employee-list">
                  <h3>Top Employees</h3>
                  {topEmployees.length ? topEmployees.slice(0, 6).map((row, index) => (
                    <div className="insight-row" key={row.code}>
                      <span>{index + 1}</span>
                      <div><strong>{row.name}</strong><small>{row.code} · {row.position || "N/A"}</small></div>
                      <b>{formatMoney(row.claimedAmount)}</b>
                    </div>
                  )) : <div className="empty-state small">No employee spend yet.</div>}
                </div>
              </div>
            </section>
          </div>

          <EmployeeSummaryTable rows={coverageRows} loading={loading} onSelect={openEmployeeDrilldown} />

          <div className="analytics-grid secondary-analytics-grid">
            <ChartCard title="Firm Spend" eyebrow="Firm">
              {firmChart.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={firmChart.slice(0, 8)} layout="vertical" margin={{ top: 10, right: 20, left: 70, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={moneyTick} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="firmName" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="claimedAmount" name="Claimed" fill="#0891b2" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </ChartCard>
            <ChartCard title="Role Spend" eyebrow="Role">
              {roleChart.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={roleChart} dataKey="claimedAmount" nameKey="name" outerRadius={105} label={({ name }) => titleCase(name)}>
                      {roleChart.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </ChartCard>
          </div>
        </>
      )}

      {!selectedEmployee && activeView === "queue" && (
        <section className="expense-panel claims-panel">
          <div className="panel-title table-title">
            <div><p>{pagination.total || 0} requests</p><h2>Approval Queue</h2></div>
            <FaPlaneDeparture />
          </div>
          <ClaimsTable claims={claims} loading={loading} reviewingId={reviewingId} onReview={reviewClaim} onViewDocs={setSelectedDocs} />
          <div className="expense-pagination">
            <button disabled={page <= 1 || loading} onClick={() => setPage((prev) => Math.max(prev - 1, 1))}>Prev</button>
            <span>Page {page} of {pagination.totalPages || 1}</span>
            <button disabled={page >= (pagination.totalPages || 1) || loading} onClick={() => setPage((prev) => prev + 1)}>Next</button>
          </div>
        </section>
      )}

      {!!selectedDocs.length && <DocumentViewer documents={selectedDocs} onClose={() => setSelectedDocs([])} />}
    </div>
  );
};

export default TravelExpenses;
