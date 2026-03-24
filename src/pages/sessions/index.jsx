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
  const [data, setData] = useState([]);

  const [search, setSearch] = useState("");
  const [deviceStatus, setDeviceStatus] = useState("");
  const [sessionStatus, setSessionStatus] = useState("");

  const [showRevoked, setShowRevoked] = useState({});

  const toggleRevoked = (deviceId) => {
    setShowRevoked((prev) => ({
      ...prev,
      [deviceId]: !prev[deviceId],
    }));
  };

  const fetchData = async () => {
    try {
      setLoading(true);

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
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return data.filter((u) => {
      return (
        u.code?.toLowerCase().includes(q) ||
        u.user?.name?.toLowerCase().includes(q)
      );
    });
  }, [data, search]);

  const deleteDevice = async (code, deviceId) => {
    if (!window.confirm("Delete this device?")) return;

    await axios.post(
      `${backendUrl}/admin/delete-device`,
      { code, deviceId },
      { headers: getAuthHeader() }
    );

    fetchData();
  };

  const updateDevice = async (code, deviceId, status) => {
    await axios.post(
      `${backendUrl}/admin/update-device-status`,
      { code, deviceId, status },
      { headers: getAuthHeader() }
    );

    fetchData();
  };

  const revokeSession = async (sessionId) => {
    await axios.post(
      `${backendUrl}/admin/revoke-session`,
      { sessionId },
      { headers: getAuthHeader() }
    );

    fetchData();
  };

const formatSessionId = (id) => {
  if (!id) return "";

  const MAX = 30;

  if (id.length <= MAX) return id;

  return id.slice(0, MAX) + "...";
};

  return (
    <div className="sessions-page">
      <div className="page-title">Devices & Sessions</div>

      {/* FILTERS */}
        <div className="filters">
        <input
            placeholder="Search code / name"
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

        {/* 🔥 NEW REFRESH BUTTON */}
        <button
        className="refresh-btn"
        onClick={fetchData}
        disabled={loading}
        >
        {loading ? "⟳" : "⟳"}
        </button>
        </div>

      {/* LIST */}
      <div className="list">
        {loading ? (
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
              {user.devices.map((d, i) => {
                const activeSessions =
                  d.sessions?.filter((s) => s.status === "active") || [];

                const revokedSessions =
                  d.sessions?.filter((s) => s.status === "revoked") || [];

                return (
                  <div key={i} className="device-card">
                    <div className="device-header">
                      <div>
                        <div className="device-id">{d.deviceId}</div>
                        <div className="device-info">
                          {d.deviceInfo?.brand} • {d.deviceInfo?.model} •{" "}
                          {d.deviceInfo?.os}
                        </div>
                      </div>

                      <div className="actions">
                        <span className={`badge ${d.status}`}>
                          {d.status}
                        </span>

                        <button
                          onClick={() =>
                            updateDevice(user.code, d.deviceId, "approved")
                          }
                        >
                          Approve
                        </button>

                        <button
                          onClick={() =>
                            updateDevice(user.code, d.deviceId, "blocked")
                          }
                        >
                          Block
                        </button>

                        <button
                          className="danger"
                          onClick={() =>
                            deleteDevice(user.code, d.deviceId)
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* SESSIONS */}
                    <div className="sessions">
                      {/* ACTIVE */}
                      {activeSessions.length ? (
                        activeSessions.map((s) => (
                          <div key={s._id} className="session active">
                            <div className="left">
                             <div
                                className="session-id"
                                title={s._id} // 👈 full ID on hover
                                onClick={() => navigator.clipboard.writeText(s._id)}
                                >
                                {formatSessionId(s._id)}
                                </div>

                              <div className="session-meta">
                                {new Date(s.loginTime).toLocaleString()} •{" "}
                                {s.ip}
                              </div>
                            </div>

                            <div className="right">
                              <span className="badge active">
                                ACTIVE
                              </span>

                              <button
                                onClick={() => revokeSession(s._id)}
                              >
                                Logout
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
                                {new Date(
                                  s.loginTime
                                ).toLocaleString()}
                              </div>
                            </div>

                            <div className="right">
                              <span className="badge revoked">
                                REVOKED
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        ) : (
          <div className="empty">No data</div>
        )}
      </div>
    </div>
  );
}