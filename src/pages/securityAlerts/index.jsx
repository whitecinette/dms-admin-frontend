import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  RiAlarmWarningLine,
  RiCheckboxCircleLine,
  RiRefreshLine,
  RiShieldCheckLine,
} from "react-icons/ri";
import config from "../../config";
import "./style.scss";

const backendUrl = config.backend_url;

const getAuthHeader = () => {
  const raw = localStorage.getItem("authToken") || "";
  if (!raw) return {};
  return { Authorization: raw.startsWith("Bearer ") ? raw : `Bearer ${raw}` };
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const getDeviceLabel = (alert) => {
  const device = alert.device || {};
  const parts = [device.brand, device.model, device.os].filter(Boolean);
  return parts.length ? parts.join(" • ") : alert.platform || "Unknown device";
};

export default function SecurityAlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({ open: 0, criticalOpen: 0 });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("open");
  const [pendingAction, setPendingAction] = useState("");

  const role = localStorage.getItem("role");

  const fetchAlerts = async ({ silent = false } = {}) => {
    try {
      setError("");
      if (silent) setRefreshing(true);
      else setLoading(true);

      const res = await axios.get(`${backendUrl}/admin/security-alerts`, {
        headers: getAuthHeader(),
        params: {
          status,
          search,
          limit: 100,
        },
      });

      setAlerts(res.data?.data || []);
      setStats(res.data?.stats || { open: 0, criticalOpen: 0 });
    } catch (err) {
      console.error(err);
      setError("Unable to load security alerts. Please try again.");
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleAlerts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return alerts;

    return alerts.filter((alert) => {
      const device = alert.device || {};
      return [
        alert.code,
        alert.name,
        alert.role,
        alert.position,
        alert.deviceId,
        alert.platform,
        device.brand,
        device.model,
        device.os,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [alerts, search]);

  const updateStatus = async (alertId, nextStatus) => {
    const actionKey = `${alertId}:${nextStatus}`;

    try {
      setPendingAction(actionKey);
      const res = await axios.patch(
        `${backendUrl}/admin/security-alerts/${alertId}/status`,
        { status: nextStatus },
        { headers: getAuthHeader() }
      );

      const updated = res.data?.data;
      if (updated) {
        setAlerts((prev) =>
          prev.map((alert) => (alert._id === updated._id ? updated : alert))
        );
      }

      fetchAlerts({ silent: true });
    } catch (err) {
      console.error(err);
      setError("Unable to update this alert. Please try again.");
    } finally {
      setPendingAction("");
    }
  };

  if (role !== "super_admin") {
    return (
      <div className="security-alerts-page">
        <div className="security-alerts-empty">
          <RiShieldCheckLine />
          <h2>Superadmin access required</h2>
          <p>Security alerts are visible only to superadmins.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="security-alerts-page">
      <div className="security-alerts-hero">
        <div>
          <span className="eyebrow">Configuration</span>
          <h1>Security Alerts</h1>
          <p>
            Track blocked app launches where Developer Options were enabled on
            user devices.
          </p>
        </div>
        <button
          className="hero-refresh"
          onClick={() => fetchAlerts({ silent: alerts.length > 0 })}
          disabled={loading || refreshing}
        >
          <RiRefreshLine />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="security-alerts-stats">
        <div>
          <span>Open Alerts</span>
          <strong>{stats.open}</strong>
        </div>
        <div>
          <span>Critical Open</span>
          <strong>{stats.criticalOpen}</strong>
        </div>
        <div>
          <span>Loaded</span>
          <strong>{visibleAlerts.length}</strong>
        </div>
      </div>

      <div className="security-alerts-filters">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search user, code, device"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="open">Open</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
          <option value="all">All</option>
        </select>
        <button onClick={() => fetchAlerts()}>Apply</button>
      </div>

      {error && <div className="security-alerts-error">{error}</div>}

      <div className="security-alerts-table-wrap">
        {loading ? (
          <div className="security-alerts-empty">Loading alerts...</div>
        ) : visibleAlerts.length ? (
          <table className="security-alerts-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Alert</th>
                <th>Device</th>
                <th>Occurrences</th>
                <th>Last Seen</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleAlerts.map((alert) => {
                const isAckPending =
                  pendingAction === `${alert._id}:acknowledged`;
                const isResolvePending =
                  pendingAction === `${alert._id}:resolved`;

                return (
                  <tr key={alert._id}>
                    <td>
                      <div className="user-main">{alert.name || "Unknown"}</div>
                      <div className="muted">
                        {alert.code || "-"} • {alert.position || alert.role || "-"}
                      </div>
                    </td>
                    <td>
                      <div className="alert-type">
                        <RiAlarmWarningLine />
                        Developer Options
                      </div>
                      <div className="muted">{alert.message || "-"}</div>
                    </td>
                    <td>
                      <div>{getDeviceLabel(alert)}</div>
                      <div className="muted mono">{alert.deviceId || "-"}</div>
                      <div className="muted">
                        App {alert.appVersion || "-"} ({alert.buildNumber || "-"})
                      </div>
                    </td>
                    <td>
                      <span className="count-pill">{alert.occurrences || 1}</span>
                    </td>
                    <td>{formatDate(alert.lastSeenAt)}</td>
                    <td>
                      <span className={`status-badge ${alert.status}`}>
                        {alert.status}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        {alert.status !== "acknowledged" &&
                          alert.status !== "resolved" && (
                            <button
                              onClick={() =>
                                updateStatus(alert._id, "acknowledged")
                              }
                              disabled={!!pendingAction}
                            >
                              {isAckPending ? "Saving..." : "Acknowledge"}
                            </button>
                          )}
                        {alert.status !== "resolved" && (
                          <button
                            className="resolve"
                            onClick={() => updateStatus(alert._id, "resolved")}
                            disabled={!!pendingAction}
                          >
                            <RiCheckboxCircleLine />
                            {isResolvePending ? "Saving..." : "Resolve"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="security-alerts-empty">
            <RiShieldCheckLine />
            <h2>No alerts found</h2>
            <p>No Developer Options blocks match the selected filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
