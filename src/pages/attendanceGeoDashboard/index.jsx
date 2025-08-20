import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { FaFilter, FaMapMarkerAlt, FaCamera, FaClock, FaUser, FaBullseye } from "react-icons/fa";
import "./style.scss"; // ← style it with your SCSS

// ------------------------------
// CONFIG
// ------------------------------
const statusColors = {
  Present: "#16a34a",
  "Half Day": "#f59e0b",
  Absent: "#ef4444",
  Leave: "#3b82f6",
  Pending: "#64748b",
};

const defaultCenter = [22.9734, 78.6569]; // India centroid

// Fix default Leaflet icon URLs when bundling
const DefaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points?.length) return;
    const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude]));
    map.fitBounds(bounds.pad(0.2));
  }, [points, map]);
  return null;
}

export default function AttendanceGeoDashboard({
  data = [],
  initial = { status: "", search: "", minHours: 0, maxHours: 12 },
}) {
  const [status, setStatus] = useState(initial.status || "");
  const [search, setSearch] = useState(initial.search || "");
  const [minHours, setMinHours] = useState(initial.minHours ?? 0);
  const [maxHours, setMaxHours] = useState(initial.maxHours ?? 12);

  const filtered = useMemo(() => {
    return data.filter((d) => {
      const matchesStatus = status ? d.status === status : true;
      const q = search.trim().toLowerCase();
      const matchesSearch = q ? (d.code?.toLowerCase().includes(q) || d.name?.toLowerCase().includes(q)) : true;
      const hrs = typeof d.hoursWorked === "number" ? d.hoursWorked : null;
      const matchesHours = hrs == null ? true : (hrs >= minHours && hrs <= maxHours);
      const hasCoords = typeof d.latitude === "number" && typeof d.longitude === "number";
      return matchesStatus && matchesSearch && matchesHours && hasCoords;
    });
  }, [data, status, search, minHours, maxHours]);

  const stats = useMemo(() => {
    const byStatus = {};
    for (const d of data) byStatus[d.status] = (byStatus[d.status] || 0) + 1;
    return Object.entries(byStatus).map(([key, value]) => ({ status: key, count: value }));
  }, [data]);

  const resetFilters = () => {
    setStatus("");
    setSearch("");
    setMinHours(0);
    setMaxHours(12);
  };

  return (
    <div className="agd">
      {/* Left: Filters + charts */}
      <aside className="agd__left">
        <div className="agd-card">
          <div className="agd-card__header">
            <div className="agd-title"><FaFilter/> Filters</div>
          </div>
          <div className="agd-card__content">
            <div className="agd-field">
              <label>Search (code/name)</label>
              <input
                className="agd-input"
                placeholder="Type to search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="agd-field">
              <label>Status</label>
              <select className="agd-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All</option>
                <option value="Present">Present</option>
                <option value="Half Day">Half Day</option>
                <option value="Leave">Leave</option>
                <option value="Pending">Pending</option>
                <option value="Absent">Absent</option>
              </select>
            </div>

            <div className="agd-field">
              <label>Hours worked (min–max)</label>
              <div className="agd-range">
                <input type="range" min={0} max={12} step={0.25} value={minHours}
                  onChange={(e) => setMinHours(Math.min(Number(e.target.value), maxHours))} />
                <input type="range" min={0} max={12} step={0.25} value={maxHours}
                  onChange={(e) => setMaxHours(Math.max(Number(e.target.value), minHours))} />
                <div className="agd-range__values">{minHours}h – {maxHours}h</div>
              </div>
            </div>

            <div className="agd-actions">
              <button className="agd-btn agd-btn--secondary" onClick={resetFilters}>Reset</button>
            </div>
          </div>
        </div>

        <div className="agd-card">
          <div className="agd-card__header"><div className="agd-title">Overview</div></div>
          <div className="agd-card__content agd-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <XAxis dataKey="status" tick={{ fontSize: 12 }} angle={-10} dy={8} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </aside>

      {/* Right: Map */}
      <section className="agd__map">
        <div className="agd-overlay">
          <FaMapMarkerAlt/>
          <span>Plotted points: <strong>{filtered.length}</strong></span>
        </div>

        <MapContainer className="agd-map" center={defaultCenter} zoom={5} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitBounds points={filtered} />

          {filtered.map((d) => {
            const key = `${d.code}-${d.date}`;
            const color = statusColors[d.status] || "#111827";
            return (
              <CircleMarker key={key} center={[d.latitude, d.longitude]} radius={8}
                pathOptions={{ color, weight: 2, fillColor: color, fillOpacity: 0.6 }}>
                <Popup minWidth={320} className="agd-popup">
                  <div className="agd-popup__body">
                    <div className="agd-popup__top">
                      <div className="agd-popup__person">
                        <div className="agd-popup__name"><FaUser/> {d.name || d.code}</div>
                        <div className="agd-popup__role">{d.position || "—"}</div>
                        <span className="agd-badge" style={{ backgroundColor: color }}>{d.status}</span>
                      </div>
                      <div className="agd-popup__meta">
                        <div>{new Date(d.date).toLocaleDateString()}</div>
                        {d.hoursWorked != null && (<div className="agd-inline"><FaClock/> {d.hoursWorked}h</div>)}
                        {d.distance != null && (<div className="agd-inline"><FaBullseye/> {d.distance} {d.distance > 5 ? "km" : "m"}</div>)}
                      </div>
                    </div>

                    <div className="agd-popup__images">
                      {d.punchInImage && (
                        <div className="agd-img">
                          <img src={d.punchInImage} alt="Punch-in"/>
                          <div className="agd-img__caption"><FaCamera/> Punch-in</div>
                        </div>
                      )}
                      {d.punchOutImage && (
                        <div className="agd-img">
                          <img src={d.punchOutImage} alt="Punch-out"/>
                          <div className="agd-img__caption"><FaCamera/> Punch-out</div>
                        </div>
                      )}
                    </div>

                    <div className="agd-popup__grid">
                      {d.punchIn && (<div><span className="agd-label">In:</span> {new Date(d.punchIn).toLocaleTimeString()}</div>)}
                      {d.punchOut && (<div><span className="agd-label">Out:</span> {new Date(d.punchOut).toLocaleTimeString()}</div>)}
                      <div><span className="agd-label">Code:</span> {d.code}</div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </section>
    </div>
  );
}

