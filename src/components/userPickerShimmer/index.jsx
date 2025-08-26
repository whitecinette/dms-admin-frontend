import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import config from "../../../config";
import "./style.scss"; // add styles below

const backend_url = config.backend_url;

function ShimmerCard() {
  return (
    <div className="user-card shimmer">
      <div className="shimmer-line title" />
      <div className="shimmer-grid">
        <div className="shimmer-line" />
        <div className="shimmer-line" />
        <div className="shimmer-line" />
        <div className="shimmer-line" />
      </div>
    </div>
  );
}

const UserPicker = ({ selectedUsers, setSelectedUsers }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  // debounce
  const debounceRef = useRef(null);

  const fetchUsers = async (q) => {
    try {
      setLoading(true);
      setFetchError("");
      const token = localStorage.getItem("authToken");

      const res = await axios.get(`${backend_url}/users/get/to-select`, {
        headers: { Authorization: token }, // change to `Bearer ${token}` if needed
        params: q ? { search: q } : {},
      });

      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setFetchError("Could not fetch users. Please try again.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // initial load
  useEffect(() => {
    fetchUsers("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchUsers(searchQuery.trim());
    }, 350);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const visibleUsers = useMemo(() => users, [users]);

  const toggleUser = (code) => {
    if (!code) return;
    setSelectedUsers((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const selectAll = () => {
    const codes = visibleUsers.map((u) => u.code).filter(Boolean);
    setSelectedUsers(codes);
  };

  return (
    <div className="user-picker">
      <div className="search-container">
        <input
          type="text"
          placeholder="Search name / position / code / role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button onClick={selectAll}>Select All</button>
      </div>

      {fetchError && (
        <div className="fetch-error">{fetchError}</div>
      )}

      <div className="user-list">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <ShimmerCard key={i} />)
          : visibleUsers.length > 0
          ? visibleUsers.map((user) => (
              <div
                key={user.code || user._id}
                className={`user-card ${
                  selectedUsers.includes(user.code) ? "selected" : ""
                }`}
                onClick={() => toggleUser(user.code)}
              >
                <div className="user-header">
                  <div>
                    <strong>{user.name || "-"}</strong>{" "}
                    {user.code ? `(${user.code})` : ""}
                  </div>
                  <div className="pill">
                    {user.role || user.position || "—"}
                  </div>
                </div>

                <div className="user-fields">
                  {Object.entries(user).map(([key, val]) => {
                    if (["_id", "password", "__v"].includes(key)) return null;
                    const printable =
                      typeof val === "object"
                        ? JSON.stringify(val)
                        : String(val ?? "");
                    return (
                      <div key={key} className="field-row">
                        <span className="field-key">{key}</span>
                        <span className="field-value">{printable}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          : !loading && <div className="empty">No users found.</div>}
      </div>
    </div>
  );
};

export default UserPicker;
