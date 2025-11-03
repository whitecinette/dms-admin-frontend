import React, { useEffect, useState } from "react";
import axios from "axios";
import config from "../../../config";
import { IoMdArrowDropdown, IoMdArrowDropup } from "react-icons/io";
import { FaMobileAlt } from "react-icons/fa";
import "./style.scss";

const backendUrl = config.backend_url;
const token = localStorage.getItem("authToken");

function SessionsViewer() {
  const [sessions, setSessions] = useState([]);
  const [expandedUser, setExpandedUser] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await axios.post(
        `${backendUrl}/super-admin/sessions/get`,
        { start_date: startDate, end_date: endDate },
        { headers: { Authorization: token } }
      );
      setSessions(res.data.data || []);
    } catch (err) {
      console.error("❌ Error fetching sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const filtered = sessions.filter((user) => {
    const term = search.toLowerCase();
    return (
      user.name.toLowerCase().includes(term) ||
      user.code.toLowerCase().includes(term) ||
      user.position.toLowerCase().includes(term)
    );
  });

  return (
    <div className="sessionsViewer">
      <div className="sessions-header">
        <h3>Active Sessions</h3>
        <div className="filter-row">
          <input
            type="text"
            placeholder="Search by name, code or position..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <button onClick={fetchSessions}>Refresh</button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading sessions...</div>
      ) : filtered.length === 0 ? (
        <div className="no-data">No sessions found.</div>
      ) : (
        <div className="session-list">
          {filtered.map((user) => (
            <div key={user.code} className="user-session-card">
              <div
                className="user-header"
                onClick={() =>
                  setExpandedUser(expandedUser === user.code ? null : user.code)
                }
              >
                <div className="user-info">
                  <span className="user-name">{user.name}</span>
                  <span className="user-code">({user.code})</span>
                  <span className="user-pos">[{user.position}]</span>
                </div>
                <div className="session-meta">
                  <span>
                    Sessions: <b>{user.sessions.length}</b>
                  </span>
                  {expandedUser === user.code ? (
                    <IoMdArrowDropup size={22} />
                  ) : (
                    <IoMdArrowDropdown size={22} />
                  )}
                </div>
              </div>

              {expandedUser === user.code && (
                <div className="session-details">
                  {user.sessions.map((s, idx) => (
                    <div
                      key={s.sessionId}
                      className={`session-item ${
                        s.status === "active" ? "active" : "inactive"
                      }`}
                    >
                      <div className="session-icon">
                        <FaMobileAlt size={20} />
                      </div>
                      <div className="session-body">
                        <div className="session-row">
                          <span>
                            <b>Device:</b> {s.deviceInfo?.brand}{" "}
                            {s.deviceInfo?.model}
                          </span>
                          <span>
                            <b>OS:</b> {s.deviceInfo?.os}
                          </span>
                          <span>
                            <b>Version:</b> {s.deviceInfo?.appVersion}
                          </span>
                        </div>
                        <div className="session-row">
                          <span>
                            <b>IP:</b> {s.deviceInfo?.ip || "N/A"}
                          </span>
                          <span>
                            <b>Login:</b>{" "}
                            {new Date(s.loginTime).toLocaleString()}
                          </span>
                          <span>
                            <b>Status:</b>{" "}
                            <span
                              className={`status-badge ${
                                s.status === "active" ? "active" : "inactive"
                              }`}
                            >
                              {s.status}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SessionsViewer;
