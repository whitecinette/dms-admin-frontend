import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import config from "../../../config";
import "./style.scss";

const backend_url = config?.backend_url;

const ShimmerCard = () => (
  <div className="usm-card shimmer">
    <div className="shimmer-line title" />
    <div className="shimmer-grid">
      <div className="shimmer-line" />
      <div className="shimmer-line" />
      <div className="shimmer-line" />
      <div className="shimmer-line" />
    </div>
  </div>
);

const PRIMARY_KEYS = ["name", "code", "position", "role", "email"];
const HIDDEN_KEYS = ["_id", "password", "__v"];

/**
 * Props:
 * - isOpen: bool
 * - value: string[] (selected user codes)
 * - onApply(codes: string[])
 * - onClose()
 */
const UserSelectModal = ({ isOpen, value = [], onApply, onClose }) => {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [usingServer, setUsingServer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  // local working copy of selection
  const [selected, setSelected] = useState(new Set());
  // expanded cards (by code)
  const [expanded, setExpanded] = useState(new Set());

  const debounceRef = useRef(null);

  // Fallback users (in case token/URL not present)
  const fallbackUsers = [
    {
      _id: "67bdab3dbe7657eb1d8e8e8e",
      name: "Indian Mobile Telecom",
      code: "RAJD017276",
      role: "dealer",
      position: "dealer",
      email: "RAJD017276@dummyemail.com",
      city: "Unknown",
      district: "Kota",
      taluka: "Itawa",
    },
    {
      _id: "67bdab3dbe7657eb1d8e8e91",
      name: "Shree Dev Mobiles Point",
      code: "RAJD018918",
      role: "dealer",
      position: "dealer",
      email: "RAJD018918@dummyemail.com",
      city: "Unknown",
      district: "Kota",
      town: "Sangod",
    },
    {
      _id: "67bdaaec45d9bb04a38329c3",
      name: "Jain Mobile",
      code: "RAJD002111",
      role: "dealer",
      position: "dealer",
      city: "jaipur",
      cluster: "Cluster AB",
      district: "Kota",
      taluka: "Kaithoon (M)",
      zone: "Kota",
      labels: ["town: Kaithoon"],
    },
  ];

  const fetchUsers = async (q) => {
    const token = localStorage.getItem("authToken");
    if (!backend_url || !token) {
      setUsingServer(false);
      setUsers(fallbackUsers);
      return;
    }

    try {
      setLoading(true);
      setFetchError("");

      const res = await axios.get(`${backend_url}/users/get/to-select`, {
        // If your middleware expects Bearer:
        // headers: { Authorization: `Bearer ${token}` },
        headers: { Authorization: token },
        params: q ? { search: q } : {},
      });

      setUsers(Array.isArray(res.data) ? res.data : []);
      setUsingServer(true);
    } catch (e) {
      console.error("UserSelectModal: fetch failed", e);
      setFetchError("Could not fetch users. Showing fallback.");
      setUsingServer(false);
      setUsers(fallbackUsers);
    } finally {
      setLoading(false);
    }
  };

  // open -> initialize
  useEffect(() => {
    if (!isOpen) return;
    setSelected(new Set(value || []));
    setExpanded(new Set());
    setSearch("");
    fetchUsers("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // debounced search (server mode); in fallback we filter locally below
  useEffect(() => {
    if (!isOpen) return;
    if (!backend_url || !localStorage.getItem("authToken")) return; // no server

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchUsers(search.trim());
    }, 350);

    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, isOpen]);

  // visible list (server already filters; fallback filters locally)
  const visibleUsers = useMemo(() => {
    if (usingServer) return users;
    const q = search.toLowerCase();
    return users.filter((u) =>
      Object.entries(u).some(
        ([, v]) => typeof v === "string" && v.toLowerCase().includes(q)
      )
    );
  }, [users, usingServer, search]);

  const toggle = (code) => {
    if (!code) return;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const toggleExpand = (e, code) => {
    e.stopPropagation(); // don’t toggle selection
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const selectAllShown = () => {
    const codes = visibleUsers.map((u) => u.code).filter(Boolean);
    setSelected((prev) => {
      const next = new Set(prev);
      codes.forEach((c) => next.add(c));
      return next;
    });
  };

  const deselectAllShown = () => {
    const codes = new Set(visibleUsers.map((u) => u.code).filter(Boolean));
    setSelected((prev) => {
      const next = new Set(prev);
      codes.forEach((c) => next.delete(c));
      return next;
    });
  };

  const unselectAll = () => setSelected(new Set());
  const clearFilters = () => setSearch("");

  const handleSave = () => {
    onApply?.(Array.from(selected));
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <div className="usm-overlay">
      <div className="usm-modal">
        <div className="usm-header">
          <h3>Select Users</h3>
          <button className="usm-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="usm-toolbar">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name / position / code / role..."
          />
          <div className="usm-actions">
            <button onClick={selectAllShown}>Select All Shown</button>
            <button onClick={deselectAllShown}>Deselect Shown</button>
            <button onClick={unselectAll}>Unselect All</button>
            <button onClick={clearFilters}>Clear Filters</button>
          </div>
        </div>

        {fetchError && <div className="usm-error">{fetchError}</div>}

        <div className="usm-list">
          {loading
            ? Array.from({ length: 10 }).map((_, i) => <ShimmerCard key={i} />)
            : visibleUsers.map((u) => {
                const isSel = selected.has(u.code);
                const isOpen = expanded.has(u.code);

                // primary fields
                const name = u.name || "-";
                const code = u.code || "";
                const position = u.position || "";
                const role = u.role || "";
                const email = u.email || "";

                // everything else
                const extraEntries = Object.entries(u).filter(
                  ([k]) => !PRIMARY_KEYS.includes(k) && !HIDDEN_KEYS.includes(k)
                );

                return (
                  <div
                    key={u.code || u._id}
                    className={`usm-card ${isSel ? "selected" : ""}`}
                    onClick={() => toggle(u.code)}
                  >
                    <div className="usm-card-head">
                      <div className="usm-title">
                        <strong>{name}</strong>
                        {code && <span className="code">({code})</span>}
                      </div>

                      <div className="right">
                        {position && <span className="pill subtle">{position}</span>}
                        {role && <span className="pill">{role}</span>}
                        <button
                          className="expander"
                          onClick={(e) => toggleExpand(e, u.code)}
                          aria-expanded={isOpen}
                          aria-label={isOpen ? "Collapse" : "Expand"}
                          title={isOpen ? "Collapse" : "Expand"}
                        >
                          {isOpen ? "Collapse ▴" : "Expand ▾"}
                        </button>
                      </div>
                    </div>

                    {email && <div className="usm-meta">Email: <span>{email}</span></div>}

                    <div className={`usm-extra ${isOpen ? "open" : ""}`} onClick={(e)=>e.stopPropagation()}>
                      <div className="usm-fields">
                        {extraEntries.map(([k, v]) => {
                          const val = typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
                          return (
                            <div key={k} className="row">
                              <span className="k">{k}</span>
                              <span className="v">{val}</span>
                            </div>
                          );
                        })}
                        {extraEntries.length === 0 && (
                          <div className="usm-empty">No additional fields.</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          {!loading && visibleUsers.length === 0 && (
            <div className="usm-empty">No users found.</div>
          )}
        </div>

        <div className="usm-footer">
          <div className="count">Selected: {selected.size}</div>
          <div className="buttons">
            <button className="ghost" onClick={onClose}>Close</button>
            <button className="primary" onClick={handleSave}>Save Selection</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSelectModal;
