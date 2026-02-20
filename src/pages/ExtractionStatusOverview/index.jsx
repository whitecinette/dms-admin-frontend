import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import config from "../../config";
import "./style.scss";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const backendUrl = config.backend_url;

const toInputDate = (d) => d.toISOString().split("T")[0];

const getAuthHeader = () => {
  const raw = localStorage.getItem("authToken") || "";
  if (!raw) return {};
  return { Authorization: raw.startsWith("Bearer ") ? raw : `Bearer ${raw}` };
};

const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const pctStrToNum = (s) => {
  if (!s) return 0;
  const n = parseInt(String(s).replace("%", ""), 10);
  return Number.isFinite(n) ? n : 0;
};






const DealerPopup = ({ open, onClose, title, dealers = [], loading }) => {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return (dealers || []).filter((d) => {
      const name = String(d?.name || "").toLowerCase();
      const code = String(d?.code || "").toLowerCase();
      const st = String(d?.status || "").toLowerCase();
      const okQ = !qq || name.includes(qq) || code.includes(qq);
      const okS = status === "all" || st === status;
      return okQ && okS;
    });
  }, [dealers, q, status]);

  if (!open) return null;

  return (
    <div className="dealer-modal-overlay" onClick={onClose}>
      <div className="dealer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dealer-modal-header">
          <div>
            <div className="dealer-title">{title}</div>
            <div className="dealer-sub">{loading ? "Loading..." : `${filtered.length} dealers`}</div>
          </div>
          <button className="dealer-close" onClick={onClose}>×</button>
        </div>

        <div className="dealer-modal-filters">
          <input
            className="dealer-search"
            placeholder="Search dealer name / code"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="dealer-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="done">Done</option>
          </select>
        </div>

        <div className="dealer-modal-body">
          <table className="dealer-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Code</th>
                <th>Name</th>
                <th>Town</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="dealer-empty">Loading...</td></tr>
              ) : filtered.length ? (
                filtered.map((d, i) => (
                  <tr key={d._id || d.code || i}>
                    <td>{i + 1}</td>
                    <td>{d.code}</td>
                    <td>{d.name}</td>
                    <td>{d.town || "-"}</td>
                    <td>
                      <span className={`dealer-badge ${String(d.status).toLowerCase()}`}>
                        {String(d.status || "-").toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="dealer-empty">No dealers</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};



export default function ExtractionStatusOverview() {
  const [isLoading, setIsLoading] = useState(false);

  const [subordinates, setSubordinates] = useState([]); // ["smd","zsm","asm"...]
  const [selectedRoles, setSelectedRoles] = useState([]); // ["asm","tse"...]
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const [search, setSearch] = useState("");

  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0);
  });

  const [rows, setRows] = useState([]); // data[]
  const [selfData, setSelfData] = useState(null); // selfData

  const [dealerPopup, setDealerPopup] = useState({ open: false, title: "", dealers: [], loading: false });

const openDealers = async (actor) => {
  try {
    setDealerPopup({ open: true, title: `${actor.name} (${actor.code}) • ${actor.position}`, dealers: [], loading: true });

    const url = `${backendUrl}/user/extraction-dealers-w-status?code=${encodeURIComponent(actor.code)}&startDate=${toInputDate(startDate)}&endDate=${toInputDate(endDate)}`;

    const res = await axios.post(url, null, { headers: { ...getAuthHeader() } });

    // IMPORTANT: remove sensitive fields (password etc)
    const clean = (res.data?.dealers || []).map(({ password, __v, ...rest }) => rest);

    setDealerPopup((p) => ({ ...p, dealers: clean, loading: false }));
  } catch (e) {
    console.error(e);
    setDealerPopup((p) => ({ ...p, dealers: [], loading: false }));
  }
};


  // ----- Fetch subordinates for role filter -----
  const fetchSubordinates = async () => {
    const res = await axios.get(`${backendUrl}/user/get-subordinate-positions`, {
      headers: { ...getAuthHeader() },
    });

    const subs = (res.data?.subordinates || []).map((r) => String(r).toLowerCase());
    // optional: remove "dealer" from roles filter (keep if you want)
    const cleaned = subs.filter((r) => r !== "dealer");
    setSubordinates(cleaned);

    // default selection
    if (selectedRoles.length === 0) {
      // if tse exists, default tse else first available
      const def = cleaned.includes("tse") ? ["tse"] : cleaned.slice(0, 1);
      setSelectedRoles(def);
    }
  };

  // ----- Fetch main data -----
  const fetchStatus = async () => {
    try {
      setIsLoading(true);

      const body = {
        roles: selectedRoles.length ? selectedRoles : ["tse"],
        startDate: toInputDate(startDate),
        endDate: toInputDate(endDate),
      };

      const res = await axios.post(`${backendUrl}/user/extraction-status-role-wise`, body, {
        headers: {
          ...getAuthHeader(),
          "Content-Type": "application/json",
        },
      });

      setRows(res.data?.data || []);
      setSelfData(res.data?.selfData || null);
    } catch (e) {
      console.error(e);
      setRows([]);
      setSelfData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubordinates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // initial load (after role defaults set)
  useEffect(() => {
    if (selectedRoles.length) fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoles]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((r) => {
      const name = String(r?.name || "").toLowerCase();
      const code = String(r?.code || "").toLowerCase();
      const position = String(r?.position || "").toLowerCase();
      return name.includes(q) || code.includes(q) || position.includes(q);
    });
  }, [rows, search]);

  // ----- Charts -----
  const donutData = useMemo(() => {
    // Use selfData as primary (simple and always relevant)
    const total = safeNum(selfData?.total);
    const done = safeNum(selfData?.done);
    const pending = safeNum(selfData?.pending);

    return [
      { name: "Done", value: done },
      { name: "Pending", value: pending },
      { name: "Total", value: Math.max(0, total - (done + pending)) }, // usually 0, safety
    ].filter((x) => x.value > 0);
  }, [selfData]);

  const barData = useMemo(() => {
    // Top 10 by pending (readable)
    const list = [...filteredRows]
      .map((r) => ({
        name: String(r?.name || "").slice(0, 14),
        done: safeNum(r?.done),
        pending: safeNum(r?.pending),
      }))
      .sort((a, b) => b.pending - a.pending)
      .slice(0, 10);

    return list;
  }, [filteredRows]);

  const toggleRole = (role) => {
    setSelectedRoles((prev) => {
      if (prev.includes(role)) return prev.filter((x) => x !== role);
      return [...prev, role];
    });
  };

  const clearRoles = () => setSelectedRoles([]);
  const apply = () => fetchStatus();

  return (
    <div className="extraction-status-page">
      <div className="page-title">Extraction Status</div>

      {/* Filters */}
      <div className="filters-card">
        <div className="filters-row">
          <input
            className="search"
            placeholder="Search name / code / position"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="date">
            <label>From:</label>
            <input
              type="date"
              value={toInputDate(startDate)}
              max={toInputDate(endDate)}
              onChange={(e) => setStartDate(new Date(e.target.value))}
            />
          </div>

          <div className="date">
            <label>To:</label>
            <input
              type="date"
              value={toInputDate(endDate)}
              min={toInputDate(startDate)}
              onChange={(e) => setEndDate(new Date(e.target.value))}
            />
          </div>

          <div className="roles">
            <button
              className="roles-btn"
              type="button"
              onClick={() => setRoleDropdownOpen((p) => !p)}
            >
              Roles ({selectedRoles.length || 0})
            </button>

            {roleDropdownOpen && (
              <div className="roles-dropdown" onMouseLeave={() => setRoleDropdownOpen(false)}>
                <div className="roles-list">
                  {(subordinates.length ? subordinates : ["tse"]).map((r) => (
                    <label key={r} className="role-item">
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(r)}
                        onChange={() => toggleRole(r)}
                      />
                      <span>{r.toUpperCase()}</span>
                    </label>
                  ))}
                </div>

                <div className="roles-actions">
                  <button className="btn ghost" onClick={clearRoles} type="button">
                    Clear
                  </button>
                  <button
                    className="btn primary"
                    onClick={() => {
                      setRoleDropdownOpen(false);
                      apply();
                    }}
                    type="button"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          <button className="btn primary" onClick={apply} type="button">
            Refresh
          </button>
        </div>

        {/* Selected role chips */}
        {selectedRoles.length > 0 && (
          <div className="chip-row">
            {selectedRoles.map((r) => (
              <span key={r} className="chip" onClick={() => toggleRole(r)} title="Remove">
                {r.toUpperCase()} ×
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Self card + Charts */}
      <div className="top-grid">
        <div className="self-card">
          <div className="self-head">
            <div className="self-title">My Status</div>
            <div className="self-sub">
              {selfData?.name || "—"} • {selfData?.position || "—"} • {selfData?.code || "—"}
            </div>
          </div>

          <div className="kpis">
            <div className="kpi">
              <div className="k">Total</div>
              <div className="v">{safeNum(selfData?.total)}</div>
            </div>
            <div className="kpi">
              <div className="k">Done</div>
              <div className="v">{safeNum(selfData?.done)}</div>
            </div>
            <div className="kpi">
              <div className="k">Pending</div>
              <div className="v">{safeNum(selfData?.pending)}</div>
            </div>
            <div className="kpi">
              <div className="k">Done %</div>
              <div className="v">{selfData?.["Done Percent"] || `${pctStrToNum(selfData?.["Done Percent"])}%`}</div>
            </div>
          </div>

          <div className="progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${pctStrToNum(selfData?.["Done Percent"])}%` }}
              />
            </div>
            <div className="progress-text">
              {pctStrToNum(selfData?.["Done Percent"])}% completed
            </div>
          </div>
        </div>

        <div className="charts-card">
          <div className="charts-head">Overview</div>

          <div className="charts-row">
            <div className="chart-box">
              <div className="chart-title">Done vs Pending</div>
              <div className="chart">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={donutData} dataKey="value" nameKey="name" outerRadius={80} label>
                      {donutData.map((_, idx) => (
                        <Cell key={idx} />
                      ))}
                    </Pie>
                    <ReTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-box">
              <div className="chart-title">Top Pending (max 10)</div>
              <div className="chart">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="pending" />
                    <Bar dataKey="done" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-card">
        <div className="table-head">
          <div className="table-title">Extraction Data</div>
          <div className="table-sub">{isLoading ? "Loading..." : `${filteredRows.length} rows`}</div>
        </div>

        <div className="table-wrap">
          <table className="status-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Position</th>
                <th>Total</th>
                <th>Done</th>
                <th>Done %</th>
                <th>Pending</th>
                <th>Pending %</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="empty">
                    Loading...
                  </td>
                </tr>
              ) : filteredRows.length ? (
                filteredRows.map((r, i) => (
                  <tr key={`${r.code}-${i}`} onClick={() => openDealers(r)} style={{ cursor: "pointer" }}>
                    <td>{r.name || "N/A"}</td>
                    <td>{r.code || "-"}</td>
                    <td>{String(r.position || "-").toUpperCase()}</td>

                    <td>
                      <span className="badge total">{safeNum(r.total)}</span>
                    </td>
                    <td>
                      <span className="badge done">{safeNum(r.done)}</span>
                    </td>
                    <td>{r["Done Percent"] || `${pctStrToNum(r["Done Percent"])}%`}</td>

                    <td>
                      <span className="badge pending">{safeNum(r.pending)}</span>
                    </td>
                    <td>{r["Pending Percent"] || `${pctStrToNum(r["Pending Percent"])}%`}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="empty">
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <DealerPopup
            open={dealerPopup.open}
            title={dealerPopup.title}
            dealers={dealerPopup.dealers}
            loading={dealerPopup.loading}
            onClose={() => setDealerPopup({ open: false, title: "", dealers: [], loading: false })}
            />
      </div>
    </div>
  );
}