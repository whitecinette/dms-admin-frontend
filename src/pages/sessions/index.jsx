import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import config from "../../config";
import "./style.scss";

const backendUrl = config.backend_url;

const getAuthHeader = () => {
  const raw = localStorage.getItem("authToken") || "";
  if (!raw) return {};
  return { Authorization: raw.startsWith("Bearer ") ? raw : `Bearer ${raw}` };
};

export default function SessionsPage() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState([]);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [deviceStatus, setDeviceStatus] = useState("");
  const [sessionStatus, setSessionStatus] = useState("");

  const [showRevoked, setShowRevoked] = useState({});
  const [expandedDevices, setExpandedDevices] = useState({});
  const [pendingActions, setPendingActions] = useState({});

  const toggleRevoked = (deviceId) => {
    setShowRevoked((prev) => ({
      ...prev,
      [deviceId]: !prev[deviceId],
    }));
  };

  const toggleDevice = (deviceId) => {
    setExpandedDevices((prev) => ({
      ...prev,
      [deviceId]: !prev[deviceId],
    }));
  };

  const setActionPending = (key, value) => {
    setPendingActions((prev) => {
      if (value) return { ...prev, [key]: true };

      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const copyText = async (text) => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async ({ silent = false } = {}) => {
    try {
      setError("");
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const res = await axios.get(`${backendUrl}/admin/devices-sessions`, {
        params: {
          search,
          deviceStatus,
          sessionStatus,
        },
        headers: getAuthHeader(),
      });

      setData(res.data?.data || []);
    } catch (e) {
      console.error(e);
      setError("Unable to load devices and sessions. Please try again.");
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Initial load only; filters are applied with the Apply button.
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return data;

    return data.filter((u) => {
      const devices = u.devices || [];

      return (
        u.code?.toLowerCase().includes(q) ||
        u.user?.name?.toLowerCase().includes(q) ||
        u.user?.position?.toLowerCase().includes(q) ||
        u.user?.role?.toLowerCase().includes(q) ||
        devices.some((d) => {
          const deviceInfo = d.deviceInfo || {};
          const sessions = d.sessions || [];

          return (
            d.deviceId?.toLowerCase().includes(q) ||
            deviceInfo.brand?.toLowerCase().includes(q) ||
            deviceInfo.model?.toLowerCase().includes(q) ||
            deviceInfo.os?.toLowerCase().includes(q) ||
            sessions.some((s) => {
              return (
                s._id?.toLowerCase().includes(q) ||
                s.ip?.toLowerCase().includes(q) ||
                s.status?.toLowerCase().includes(q)
              );
            })
          );
        })
      );
    });
  }, [data, search]);

  const deleteDevice = async (code, deviceId) => {
    if (!window.confirm("Delete this device?")) return;

    const actionKey = `device:${deviceId}:delete`;

    try {
      setActionPending(actionKey, true);
      await axios.post(
        `${backendUrl}/admin/delete-device`,
        { code, deviceId },
        { headers: getAuthHeader() }
      );

      setData((prev) =>
        prev
          .map((user) =>
            user.code === code
              ? {
                  ...user,
                  devices: (user.devices || []).filter(
                    (d) => d.deviceId !== deviceId
                  ),
                }
              : user
          )
          .filter((user) => (user.devices || []).length > 0)
      );

      fetchData({ silent: true });
    } catch (e) {
      console.error(e);
      setError("Unable to delete device. Please try again.");
    } finally {
      setActionPending(actionKey, false);
    }
  };

  const updateDevice = async (code, deviceId, status) => {
    const actionKey = `device:${deviceId}:status`;

    try {
      setActionPending(actionKey, true);
      await axios.post(
        `${backendUrl}/admin/update-device-status`,
        { code, deviceId, status },
        { headers: getAuthHeader() }
      );

      setData((prev) =>
        prev.map((user) =>
          user.code === code
            ? {
                ...user,
                devices: (user.devices || []).map((d) =>
                  d.deviceId === deviceId ? { ...d, status } : d
                ),
              }
            : user
        )
      );

      fetchData({ silent: true });
    } catch (e) {
      console.error(e);
      setError("Unable to update device status. Please try again.");
    } finally {
      setActionPending(actionKey, false);
    }
  };

  const revokeSession = async (sessionId) => {
    const actionKey = `session:${sessionId}:revoke`;

    try {
      setActionPending(actionKey, true);
      await axios.post(
        `${backendUrl}/admin/revoke-session`,
        { sessionId },
        { headers: getAuthHeader() }
      );

      setData((prev) =>
        prev.map((user) => ({
          ...user,
          devices: (user.devices || []).map((device) => ({
            ...device,
            sessions: (device.sessions || []).map((session) =>
              session._id === sessionId
                ? { ...session, status: "revoked" }
                : session
            ),
          })),
        }))
      );

      fetchData({ silent: true });
    } catch (e) {
      console.error(e);
      setError("Unable to logout session. Please try again.");
    } finally {
      setActionPending(actionKey, false);
    }
  };

  const formatSessionId = (id) => {
    if (!id) return "";

    const MAX = 30;

    if (id.length <= MAX) return id;

    return id.slice(0, MAX) + "...";
  };

  const formatDeviceId = (id) => {
    if (!id) return "Unknown device";

    const MAX = 22;
    if (id.length <= MAX) return id;

    return `${id.slice(0, 10)}...${id.slice(-8)}`;
  };

  const formatDate = (value) => {
    if (!value) return "Unknown time";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown time";

    return date.toLocaleString();
  };

  const getDeviceLabel = (deviceInfo = {}) => {
    const parts = [deviceInfo.brand, deviceInfo.model, deviceInfo.os].filter(
      Boolean
    );

    return parts.length ? parts.join(" • ") : "Unknown device details";
  };

  return (
    <div className="sessions-page">
      <div className="sessions-title-row">
        <div>
          <div className="page-title">Devices & Sessions</div>
          <div className="page-subtitle">
            {filtered.length} users •{" "}
            {filtered.reduce(
              (count, user) => count + (user.devices || []).length,
              0
            )}{" "}
            devices
          </div>
        </div>

        {refreshing && <div className="sync-indicator">Syncing...</div>}
      </div>

      {/* FILTERS */}
        <div className="filters">
        <input
            placeholder="Search user, device, IP, session"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
        />

        <select
            value={deviceStatus}
            onChange={(e) => setDeviceStatus(e.target.value)}
        >
            <option value="">All Devices</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="blocked">Blocked</option>
        </select>

        <select
            value={sessionStatus}
            onChange={(e) => setSessionStatus(e.target.value)}
        >
            <option value="">All Sessions</option>
            <option value="active">Active</option>
            <option value="revoked">Revoked</option>
        </select>

        <button onClick={fetchData}>Apply</button>

        <button
        className="refresh-btn"
        onClick={() => fetchData({ silent: data.length > 0 })}
        disabled={loading || refreshing}
        title="Refresh"
        >
        ⟳
        </button>
        </div>

      {error && <div className="sessions-error">{error}</div>}

      {/* LIST */}
      <div className="list">
        {loading && !data.length ? (
          <div className="empty">Loading...</div>
        ) : filtered.length ? (
          filtered.map((user) => (
            <div key={user.code} className="user-card">
              {/* USER HEADER */}
              <div className="user-header">
                <div>
                  <div className="name">{user.user?.name}</div>
                  <div className="meta">
                    {user.code} • {user.user?.position} • {user.user?.role}
                  </div>
                </div>
              </div>

              {/* DEVICES */}
              <div className="devices-list">
              {(user.devices || []).map((d) => {
                const activeSessions =
                  d.sessions?.filter((s) => s.status === "active") || [];

                const revokedSessions =
                  d.sessions?.filter((s) => s.status === "revoked") || [];

                const isExpanded = !!expandedDevices[d.deviceId];
                const statusActionPending =
                  pendingActions[`device:${d.deviceId}:status`];
                const deleteActionPending =
                  pendingActions[`device:${d.deviceId}:delete`];
                const deviceActionPending =
                  statusActionPending || deleteActionPending;

                return (
                  <div key={d.deviceId} className="device-card">
                    <div className="device-header">
                      <div className="device-main">
                        <button
                          className="device-toggle"
                          onClick={() => toggleDevice(d.deviceId)}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? "Hide" : "View"} sessions
                        </button>

                        <div>
                          <button
                            className="device-id"
                            title={d.deviceId}
                            onClick={() => copyText(d.deviceId)}
                          >
                            {formatDeviceId(d.deviceId)}
                          </button>
                          <div className="device-info">
                            {getDeviceLabel(d.deviceInfo)}
                          </div>
                          <div className="device-counts">
                            {activeSessions.length} active •{" "}
                            {revokedSessions.length} revoked
                          </div>
                        </div>
                      </div>

                      <div className="actions">
                        <span className={`badge ${d.status}`}>
                          {d.status}
                        </span>

                        {d.status !== "approved" && (
                          <button
                            onClick={() =>
                              updateDevice(user.code, d.deviceId, "approved")
                            }
                            disabled={deviceActionPending}
                          >
                            {statusActionPending ? "Saving..." : "Approve"}
                          </button>
                        )}

                        {d.status !== "blocked" && (
                          <button
                            onClick={() =>
                              updateDevice(user.code, d.deviceId, "blocked")
                            }
                            disabled={deviceActionPending}
                          >
                            {statusActionPending ? "Saving..." : "Block"}
                          </button>
                        )}

                        <button
                          className="danger"
                          onClick={() =>
                            deleteDevice(user.code, d.deviceId)
                          }
                          disabled={deviceActionPending}
                        >
                          {deleteActionPending ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>

                    {/* SESSIONS */}
                    {isExpanded && <div className="sessions">
                      {/* ACTIVE */}
                      {activeSessions.length ? (
                        activeSessions.map((s) => (
                          <div key={s._id} className="session active">
                            <div className="left">
                             <div
                                className="session-id"
                                title={s._id}
                                onClick={() => copyText(s._id)}
                                >
                                {formatSessionId(s._id)}
                                </div>

                              <div className="session-meta">
                                {formatDate(s.loginTime)} • {s.ip || "No IP"}
                              </div>
                            </div>

                            <div className="right">
                              <span className="badge active">
                                ACTIVE
                              </span>

                              <button
                                onClick={() => revokeSession(s._id)}
                                disabled={
                                  pendingActions[`session:${s._id}:revoke`]
                                }
                              >
                                {pendingActions[`session:${s._id}:revoke`]
                                  ? "Logging out..."
                                  : "Logout"}
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="empty small">
                          No active sessions
                        </div>
                      )}

                      {/* TOGGLE */}
                      {revokedSessions.length > 0 && (
                        <div className="revoked-toggle">
                          <span
                            onClick={() =>
                              toggleRevoked(d.deviceId)
                            }
                          >
                            {showRevoked[d.deviceId]
                              ? "Hide"
                              : "Show"}{" "}
                            revoked sessions (
                            {revokedSessions.length})
                          </span>
                        </div>
                      )}

                      {/* REVOKED */}
                      {showRevoked[d.deviceId] &&
                        revokedSessions.map((s) => (
                          <div
                            key={s._id}
                            className="session revoked"
                          >
                            <div className="left">
                              <div className="session-id">
                                {formatSessionId(s._id)}
                              </div>

                              <div className="session-meta">
                                {formatDate(s.loginTime)}
                              </div>
                            </div>

                            <div className="right">
                              <span className="badge revoked">
                                REVOKED
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>}
                  </div>
                );
              })}
              </div>
            </div>
          ))
        ) : (
          <div className="empty">No data</div>
        )}
      </div>
    </div>
  );
}
