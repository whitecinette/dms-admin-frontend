import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import * as XLSX from "xlsx";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Download,
  Filter,
  LocateFixed,
  Loader2,
  MapPin,
  MapPinned,
  RefreshCw,
  Route,
  Search,
  Star,
  Users,
  X,
  XCircle,
} from "lucide-react";
import config from "../../config";
import "./style.scss";

const backendUrl = config.backend_url;
const defaultCenter = [22.9734, 78.6569];
const statusColors = {
  done: "#16a34a",
  pending: "#f59e0b",
  planned: "#2563eb",
};
const actorPalette = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#9333ea",
  "#f97316",
  "#0891b2",
  "#be123c",
  "#4f46e5",
  "#0f766e",
  "#a16207",
];

const tokenHeaders = () => {
  const token = localStorage.getItem("authToken") || "";
  if (!token) return {};
  return { Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}` };
};

const toDateKey = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const parseDateKey = (value) => {
  if (!value) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getMonthRange = (date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    fromDate: toDateKey(start),
    toDate: toDateKey(end),
  };
};

const formatShortDate = (value) => {
  const date = parseDateKey(value);
  if (!date) return "-";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const formatLongDate = (value) => {
  const date = parseDateKey(value);
  if (!date) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getDateKeyFromValue = (value) => {
  if (!value) return "";
  if (String(value).includes("T")) return String(value).slice(0, 10);
  return String(value).slice(0, 10);
};

const numberValue = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const uniqueCount = (rows, key) =>
  new Set(
    (rows || [])
      .map((row) => String(row?.[key] || "").trim())
      .filter(Boolean)
  ).size;

function FitBounds({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!Array.isArray(points) || points.length === 0) return;
    const bounds = L.latLngBounds(points.map((point) => [point.latitude, point.longitude]));
    if (bounds.isValid()) map.fitBounds(bounds.pad(0.18));
  }, [points, map]);

  return null;
}

function MasterMarketCoverage() {
  const todayKey = toDateKey(new Date());
  const [fromDate, setFromDate] = useState(todayKey);
  const [toDate, setToDate] = useState(todayKey);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [search, setSearch] = useState("");
  const [zone, setZone] = useState("");
  const [district, setDistrict] = useState("");
  const [taluka, setTaluka] = useState("");
  const [town, setTown] = useState("");
  const [topDealer, setTopDealer] = useState("all");
  const [status, setStatus] = useState("all");
  const [data, setData] = useState({
    totals: {},
    calendarDays: [],
    actorSummaries: [],
    markers: [],
    rows: [],
    filterOptions: {},
  });
  const [calendarDays, setCalendarDays] = useState([]);
  const [requests, setRequests] = useState([]);
  const [requestStatus, setRequestStatus] = useState("all");
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestActionId, setRequestActionId] = useState("");
  const [requestDeskOpen, setRequestDeskOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const calendarDataByDate = useMemo(() => {
    const map = new Map();
    (calendarDays || []).forEach((day) => map.set(day.date, day));
    return map;
  }, [calendarDays]);

  const actorColorMap = useMemo(() => {
    const map = {};
    (data.actorSummaries || []).forEach((actor, index) => {
      map[actor.actorCode] = actorPalette[index % actorPalette.length];
    });
    return map;
  }, [data.actorSummaries]);

  const calendarCells = useMemo(() => {
    const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
    const firstDayOffset = (monthStart.getDay() + 6) % 7;
    const totalCells = Math.ceil((firstDayOffset + monthEnd.getDate()) / 7) * 7;
    const gridStart = addDays(monthStart, -firstDayOffset);
    const from = parseDateKey(fromDate);
    const to = parseDateKey(toDate || fromDate);

    return Array.from({ length: totalCells }, (_, index) => {
      const date = addDays(gridStart, index);
      const key = toDateKey(date);
      const day = calendarDataByDate.get(key) || {};
      const inRange = from && to && date >= from && date <= to;
      return {
        key,
        label: date.getDate(),
        isCurrentMonth: date.getMonth() === calendarMonth.getMonth(),
        isToday: key === todayKey,
        isRange: inRange,
        total: numberValue(day.total),
        done: numberValue(day.done),
        pending: numberValue(day.pending),
        planned: numberValue(day.planned),
        actors: Array.isArray(day.actors) ? day.actors.length : 0,
        zones: Array.isArray(day.zones) ? day.zones.slice(0, 2) : [],
        towns: Array.isArray(day.towns) ? day.towns.slice(0, 2) : [],
      };
    });
  }, [calendarMonth, calendarDataByDate, fromDate, toDate, todayKey]);

  const markerPoints = useMemo(
    () =>
      (data.markers || [])
        .map((marker) => ({
          ...marker,
          latitude: numberValue(marker.latitude),
          longitude: numberValue(marker.longitude),
        }))
        .filter((marker) => marker.latitude !== 0 && marker.longitude !== 0),
    [data.markers]
  );

  const visibleRequests = useMemo(() => {
    return (requests || []).filter((request) => {
      if (requestStatus !== "all" && request.status !== requestStatus) return false;
      return true;
    });
  }, [requestStatus, requests]);

  const pendingRequestCount = useMemo(
    () => (requests || []).filter((request) => request.status === "pending").length,
    [requests]
  );

  const completionRate = numberValue(data.totals?.completionRate);

  const fetchCoverage = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${backendUrl}/admin/beat-mapping/master-coverage`, {
        params: {
          fromDate,
          toDate: toDate || fromDate,
          search,
          zone,
          district,
          taluka,
          town,
          topDealer,
          status,
        },
        headers: tokenHeaders(),
      });
      setData({
        totals: res?.data?.totals || {},
        calendarDays: Array.isArray(res?.data?.calendarDays) ? res.data.calendarDays : [],
        actorSummaries: Array.isArray(res?.data?.actorSummaries) ? res.data.actorSummaries : [],
        markers: Array.isArray(res?.data?.markers) ? res.data.markers : [],
        rows: Array.isArray(res?.data?.rows) ? res.data.rows : [],
        filterOptions: res?.data?.filterOptions || {},
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load master market coverage.");
      setData({
        totals: {},
        calendarDays: [],
        actorSummaries: [],
        markers: [],
        rows: [],
        filterOptions: {},
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarOverview = async () => {
    try {
      const monthRange = getMonthRange(calendarMonth);
      const res = await axios.get(`${backendUrl}/admin/beat-mapping/master-coverage`, {
        params: {
          fromDate: monthRange.fromDate,
          toDate: monthRange.toDate,
          search,
          zone,
          district,
          taluka,
          town,
          topDealer,
          status,
        },
        headers: tokenHeaders(),
      });
      setCalendarDays(
        Array.isArray(res?.data?.calendarDays) ? res.data.calendarDays : []
      );
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load calendar overview.");
      setCalendarDays([]);
    }
  };

  const fetchRequests = async () => {
    setRequestLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/beat-plans/requests`, {
        params: {
          startDate: fromDate,
          endDate: toDate || fromDate,
          status: requestStatus === "all" ? "" : requestStatus,
        },
        headers: tokenHeaders(),
      });
      setRequests(Array.isArray(res?.data?.requests) ? res.data.requests : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load beat plan requests.");
      setRequests([]);
    } finally {
      setRequestLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(fetchCoverage, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, search, zone, district, taluka, town, topDealer, status]);

  useEffect(() => {
    const timeout = setTimeout(fetchCalendarOverview, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarMonth, search, zone, district, taluka, town, topDealer, status]);

  useEffect(() => {
    const timeout = setTimeout(fetchRequests, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, requestStatus]);

  const setSingleDate = (dateKey) => {
    setFromDate(dateKey);
    setToDate(dateKey);
  };

  const moveCalendarMonth = (direction) => {
    setCalendarMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, 1)
    );
  };

  const resetFilters = () => {
    setSearch("");
    setZone("");
    setDistrict("");
    setTaluka("");
    setTown("");
    setTopDealer("all");
    setStatus("all");
    setFromDate(todayKey);
    setToDate(todayKey);
    setCalendarMonth(new Date());
  };

  const downloadRows = () => {
    const rows = (data.rows || []).map((row) => ({
      Date: row.date,
      "Actor Code": row.actorCode,
      "Actor Name": row.actorName,
      Position: row.actorPosition,
      "Dealer Code": row.dealerCode,
      "Dealer Name": row.dealerName,
      Status: row.status,
      Zone: row.zone,
      District: row.district,
      Taluka: row.taluka,
      Town: row.town,
      "Top Dealer": row.topDealer ? "Yes" : "No",
      Latitude: row.latitude,
      Longitude: row.longitude,
      Source: row.source,
    }));

    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Market Coverage");
    XLSX.writeFile(book, `master-market-coverage-${fromDate}-to-${toDate || fromDate}.xlsx`);
  };

  const reviewRequest = async (requestId, action) => {
    setRequestActionId(`${requestId}:${action}`);
    setError("");
    try {
      await axios.put(
        `${backendUrl}/admin/beat-plans/requests/${requestId}/${action}`,
        {},
        { headers: tokenHeaders() }
      );
      await Promise.all([fetchRequests(), fetchCoverage()]);
    } catch (err) {
      setError(err?.response?.data?.message || `Failed to ${action} request.`);
    } finally {
      setRequestActionId("");
    }
  };

  const refreshAll = () => {
    fetchCoverage();
    fetchCalendarOverview();
    fetchRequests();
  };

  const monthLabel = calendarMonth.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="master-coverage-page">
      <section className="mc-hero">
        <div>
          <span>Field Ops Command</span>
          <h1>Master Market Coverage</h1>
          <p>
            Calendar plans, live beat status, coverage geography and top dealer visibility in one
            place.
          </p>
        </div>
        <div className="mc-hero-actions">
          <button type="button" onClick={refreshAll} disabled={loading || requestLoading}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button type="button" onClick={downloadRows} disabled={!data.rows?.length}>
            <Download size={16} />
            Download
          </button>
        </div>
      </section>

      <section className="mc-kpis">
        <div className="mc-kpi">
          <Users size={18} />
          <span>Actors</span>
          <strong>{numberValue(data.totals?.actors)}</strong>
        </div>
        <div className="mc-kpi">
          <Route size={18} />
          <span>Planned Visits</span>
          <strong>{numberValue(data.totals?.total)}</strong>
        </div>
        <div className="mc-kpi done">
          <LocateFixed size={18} />
          <span>Done</span>
          <strong>{numberValue(data.totals?.done)}</strong>
        </div>
        <div className="mc-kpi pending">
          <CalendarDays size={18} />
          <span>Pending</span>
          <strong>{numberValue(data.totals?.pending)}</strong>
        </div>
        <div className="mc-kpi star">
          <Star size={18} />
          <span>Top Dealers</span>
          <strong>{numberValue(data.totals?.topDealers)}</strong>
        </div>
      </section>

      <section className="mc-workspace">
        <aside className="mc-filters">
          <div className="mc-panel-title">
            <Filter size={17} />
            <span>Filters</span>
          </div>

          <label>
            Date Range
            <div className="mc-date-pair">
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </label>

          <label>
            Search
            <div className="mc-search">
              <Search size={15} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Actor, dealer, town"
              />
            </div>
          </label>

          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="planned">Planned</option>
              <option value="pending">Pending</option>
              <option value="done">Done</option>
            </select>
          </label>

          <label>
            Top Dealer
            <select value={topDealer} onChange={(e) => setTopDealer(e.target.value)}>
              <option value="all">Top Dealer: All</option>
              <option value="yes">Top Dealer: Yes</option>
              <option value="no">Top Dealer: No</option>
            </select>
          </label>

          <label>
            Zone
            <select value={zone} onChange={(e) => setZone(e.target.value)}>
              <option value="">All Zones</option>
              {(data.filterOptions?.zones || []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            District
            <select value={district} onChange={(e) => setDistrict(e.target.value)}>
              <option value="">All Districts</option>
              {(data.filterOptions?.districts || []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            Taluka
            <select value={taluka} onChange={(e) => setTaluka(e.target.value)}>
              <option value="">All Talukas</option>
              {(data.filterOptions?.talukas || []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            Town
            <select value={town} onChange={(e) => setTown(e.target.value)}>
              <option value="">All Towns</option>
              {(data.filterOptions?.towns || []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <button type="button" className="mc-reset" onClick={resetFilters}>
            Reset Filters
          </button>
        </aside>

        <main className="mc-main">
          {error ? <div className="mc-error">{error}</div> : null}

          <div className="mc-top-grid">
            <section className="mc-calendar-panel">
              <div className="mc-section-head">
                <div>
                  <span>Plan Calendar</span>
                  <h2>{monthLabel}</h2>
                  <p className="mc-section-subtitle">
                    Month overview stays visible; click a day to inspect its plan.
                  </p>
                </div>
                <div className="mc-calendar-nav">
                  <button type="button" onClick={() => moveCalendarMonth(-1)}>
                    ‹
                  </button>
                  <button type="button" onClick={() => moveCalendarMonth(1)}>
                    ›
                  </button>
                </div>
              </div>

              <div className="mc-weekdays">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              <div className="mc-calendar-grid">
                {calendarCells.map((cell) => (
                  <button
                    key={cell.key}
                    type="button"
                    className={[
                      "mc-day",
                      cell.isCurrentMonth ? "" : "muted",
                      cell.isToday ? "today" : "",
                      cell.isRange ? "in-range" : "",
                      cell.total ? "has-plan" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setSingleDate(cell.key)}
                  >
                    <span>{cell.label}</span>
                    {cell.total ? (
                      <div className="mc-day-metrics">
                        <strong>{cell.total}</strong>
                        <small>{cell.done} done</small>
                      </div>
                    ) : (
                      <small>No plan</small>
                    )}
                    {cell.zones.length || cell.towns.length ? (
                      <em>{[...cell.zones, ...cell.towns].filter(Boolean).join(", ")}</em>
                    ) : null}
                  </button>
                ))}
              </div>
            </section>

            <section className="mc-map-panel">
              <div className="mc-map-header">
                <div>
                  <span>Coverage Map</span>
                  <h2>{markerPoints.length} plotted visits</h2>
                </div>
                <div
                  className="mc-progress"
                  style={{ "--progress": `${Math.min(completionRate, 100) * 3.6}deg` }}
                >
                  <strong>{completionRate}%</strong>
                  <span>complete</span>
                </div>
              </div>

              <MapContainer className="mc-map" center={defaultCenter} zoom={5} scrollWheelZoom>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitBounds points={markerPoints} />
                {markerPoints.map((point) => {
                  const statusColor = statusColors[point.status] || "#64748b";
                  const actorColor = actorColorMap[point.actorCode] || "#0f172a";
                  return (
                    <CircleMarker
                      key={point.id}
                      center={[point.latitude, point.longitude]}
                      radius={point.topDealer ? 9 : 7}
                      pathOptions={{
                        color: actorColor,
                        weight: 3,
                        fillColor: statusColor,
                        fillOpacity: 0.78,
                      }}
                    >
                      <Popup minWidth={280}>
                        <div className="mc-popup">
                          <strong>{point.dealerName || point.dealerCode}</strong>
                          <span>{point.dealerCode}</span>
                          <div className="mc-popup-status" style={{ backgroundColor: statusColor }}>
                            {point.status}
                          </div>
                          <p>
                            {point.actorName || point.actorCode} · {formatShortDate(point.date)}
                          </p>
                          <p>
                            {[point.zone, point.district, point.taluka, point.town]
                              .filter(Boolean)
                              .join(" / ") || "No geo tags"}
                          </p>
                          {point.topDealer ? <em>Top dealer</em> : null}
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>

              <div className="mc-map-legend">
                <span>
                  <i style={{ backgroundColor: statusColors.done }} /> Done
                </span>
                <span>
                  <i style={{ backgroundColor: statusColors.pending }} /> Pending
                </span>
                <span>
                  <i style={{ backgroundColor: statusColors.planned }} /> Planned
                </span>
              </div>
            </section>
          </div>

          <section className="mc-request-strip">
            <div className="mc-section-head">
              <div>
                <span>Approval Desk</span>
                <h2>Beat Plan Requests</h2>
              </div>
              <button
                type="button"
                className="mc-open-requests"
                onClick={() => setRequestDeskOpen(true)}
              >
                <ClipboardList size={16} />
                Open Request Desk
              </button>
            </div>

            <div className="mc-request-summary">
              <span>
                <CalendarDays size={14} />
                {formatLongDate(fromDate)} - {formatLongDate(toDate || fromDate)}
              </span>
              <span>
                <ClipboardList size={14} />
                {requests.length} total request{requests.length === 1 ? "" : "s"}
              </span>
              <span>
                <CheckCircle2 size={14} />
                {pendingRequestCount} pending approval{pendingRequestCount === 1 ? "" : "s"}
              </span>
              <span>
                <MapPin size={14} />
                Dealer details open in popup
              </span>
            </div>
          </section>

          {requestDeskOpen ? (
            <div className="mc-request-modal-backdrop" role="presentation">
              <section className="mc-request-modal" role="dialog" aria-modal="true">
                <div className="mc-request-modal-head">
                  <div>
                    <span>Approval Desk</span>
                    <h2>Beat Plan Requests</h2>
                    <p>
                      {formatLongDate(fromDate)} - {formatLongDate(toDate || fromDate)} ·{" "}
                      dealer/MDD-wise request details
                    </p>
                  </div>
                  <button type="button" onClick={() => setRequestDeskOpen(false)}>
                    <X size={19} />
                  </button>
                </div>

                <div className="mc-request-modal-toolbar">
                  <div className="mc-request-summary">
                    <span>
                      <ClipboardList size={14} />
                      {visibleRequests.length} visible request
                      {visibleRequests.length === 1 ? "" : "s"}
                    </span>
                    <span>
                      <MapPin size={14} />
                      Showing requests for the selected date range
                    </span>
                  </div>
                  <div className="mc-request-tools">
                    {requestLoading ? (
                      <span className="mc-inline-loader">
                        <Loader2 size={14} />
                        Loading
                      </span>
                    ) : null}
                    <select
                      value={requestStatus}
                      onChange={(e) => setRequestStatus(e.target.value)}
                    >
                      <option value="all">All requests</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="mc-request-modal-body">
                  <div className="mc-request-list">
                    {visibleRequests.length === 0 ? (
                      <div className="mc-empty">
                        <ClipboardList size={28} />
                        No beat plan requests found for this date/filter selection.
                      </div>
                    ) : (
                      visibleRequests.map((request) => {
                        const dealers = Array.isArray(request.dealers) ? request.dealers : [];
                        const dates = Array.isArray(request.dates)
                          ? request.dates.map(getDateKeyFromValue).filter(Boolean)
                          : [];
                        const actors = Array.isArray(request.targetActors)
                          ? request.targetActors
                          : [];
                        const pending = request.status === "pending";
                        return (
                          <article
                            key={request._id}
                            className={`mc-request-card ${request.status || ""}`}
                          >
                            <div className="mc-request-head">
                              <div>
                                <div className="mc-request-title">
                                  <strong>{request.requestNo || "Beat request"}</strong>
                                  <span>{request.status || "pending"}</span>
                                </div>
                                <p>
                                  Requested by{" "}
                                  {request.requestedBy?.name || request.requestedBy?.code || "-"} ·{" "}
                                  {request.scopeType || "self"} ·{" "}
                                  {formatLongDate(getDateKeyFromValue(request.createdAt))}
                                </p>
                              </div>
                              <div className="mc-request-actions">
                                {pending ? (
                                  <>
                                    <button
                                      type="button"
                                      className="approve"
                                      disabled={Boolean(requestActionId)}
                                      onClick={() => reviewRequest(request._id, "approve")}
                                    >
                                      {requestActionId === `${request._id}:approve` ? (
                                        <Loader2 size={14} />
                                      ) : (
                                        <CheckCircle2 size={15} />
                                      )}
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      className="reject"
                                      disabled={Boolean(requestActionId)}
                                      onClick={() => reviewRequest(request._id, "reject")}
                                    >
                                      {requestActionId === `${request._id}:reject` ? (
                                        <Loader2 size={14} />
                                      ) : (
                                        <XCircle size={15} />
                                      )}
                                      Reject
                                    </button>
                                  </>
                                ) : null}
                              </div>
                            </div>

                            <div className="mc-request-date-row">
                              <span className="mc-date-range">
                                {formatLongDate(getDateKeyFromValue(request.startDate))} -{" "}
                                {formatLongDate(getDateKeyFromValue(request.endDate))}
                              </span>
                              <div>
                                {dates.slice(0, 8).map((date) => (
                                  <button
                                    key={date}
                                    type="button"
                                    onClick={() => {
                                      setSingleDate(date);
                                      setRequestDeskOpen(false);
                                    }}
                                  >
                                    {formatShortDate(date)}
                                  </button>
                                ))}
                                {dates.length > 8 ? <em>+{dates.length - 8} more</em> : null}
                              </div>
                            </div>

                            <div className="mc-request-stats">
                              <span>{actors.length} actor(s)</span>
                              <span>{dealers.length} dealer/MDD</span>
                              <span>{uniqueCount(dealers, "town")} town(s)</span>
                              <span>{uniqueCount(dealers, "zone")} zone(s)</span>
                            </div>

                            <div className="mc-request-actors">
                              {actors.map((actor) => (
                                <span key={actor.code || actor.name}>
                                  {actor.name || actor.code}
                                  {actor.position ? ` · ${actor.position}` : ""}
                                </span>
                              ))}
                            </div>

                            <div className="mc-request-dealers">
                              <div className="mc-request-dealer-head">
                                <span>Dealer / MDD</span>
                                <span>Town</span>
                                <span>Taluka</span>
                                <span>District</span>
                                <span>Zone</span>
                              </div>
                              {dealers.slice(0, 12).map((dealer) => (
                                <div className="mc-request-dealer-row" key={dealer.code}>
                                  <strong>
                                    {dealer.name || dealer.code}
                                    <small>
                                      {dealer.code}
                                      {dealer.position ? ` · ${dealer.position}` : ""}
                                    </small>
                                  </strong>
                                  <span>{dealer.town || "-"}</span>
                                  <span>{dealer.taluka || "-"}</span>
                                  <span>{dealer.district || "-"}</span>
                                  <span>
                                    {dealer.zone || "-"}
                                    {dealer.top_dealer || dealer.topDealer ? <b>Top</b> : null}
                                  </span>
                                </div>
                              ))}
                              {dealers.length > 12 ? (
                                <div className="mc-request-more">
                                  +{dealers.length - 12} more dealer/MDD rows
                                </div>
                              ) : null}
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          <section className="mc-actor-panel">
            <div className="mc-section-head">
              <div>
                <span>People Coverage</span>
                <h2>Actor Plans</h2>
              </div>
              {loading ? <div className="mc-loading">Loading...</div> : null}
            </div>

            <div className="mc-actor-list">
              {(data.actorSummaries || []).length === 0 ? (
                <div className="mc-empty">
                  <MapPinned size={28} />
                  No coverage plans found for this selection.
                </div>
              ) : (
                data.actorSummaries.map((actor) => {
                  const color = actorColorMap[actor.actorCode] || "#0f172a";
                  const total = numberValue(actor.total);
                  const donePct = total ? Math.round((numberValue(actor.done) / total) * 100) : 0;
                  return (
                    <article key={actor.actorCode} className="mc-actor-card">
                      <div className="mc-actor-top">
                        <i style={{ backgroundColor: color }} />
                        <div>
                          <strong>{actor.actorName || actor.actorCode}</strong>
                          <span>
                            {actor.actorCode} · {actor.actorPosition || "Field actor"}
                          </span>
                        </div>
                        <b>{donePct}%</b>
                      </div>
                      <div className="mc-actor-bar">
                        <span style={{ width: `${donePct}%`, backgroundColor: color }} />
                      </div>
                      <div className="mc-actor-meta">
                        <span>{numberValue(actor.total)} visits</span>
                        <span>{numberValue(actor.done)} done</span>
                        <span>{numberValue(actor.pending)} pending</span>
                        <span>{numberValue(actor.topDealers)} top</span>
                      </div>
                      <p>
                        {[...(actor.zones || []), ...(actor.towns || [])]
                          .slice(0, 4)
                          .join(", ") || "No geography tagged"}
                      </p>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </main>
      </section>
    </div>
  );
}

export default MasterMarketCoverage;
