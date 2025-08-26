import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import config from "../../../config";
import "./style.scss";
import UserSelectModal from "../userSelectModal";

const AddTypeGroupModal = ({ closeModal, onSave }) => {
  const [typeName, setTypeName] = useState("");
  const [firmCode, setFirmCode] = useState("");
  const [flowName, setFlowName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [otherConfig, setOtherConfig] = useState([{ key: "", value: "" }]);
  const [userModalOpen, setUserModalOpen] = useState(false);

  // ✅ Dummy data (fallback)
  const firms = [
    { code: "FIRM001", name: "Firm One" },
    { code: "FIRM002", name: "Firm Two" },
  ];
  const flows = ["Flow A", "Flow B", "Flow C"];
  const fallbackUsers = [
    {
      _id: "1",
      name: "Amit Mobile Point",
      code: "RAJD017288",
      role: "dealer",
      position: "dealer",
      city: "Unknown",
      district: "Kota",
      taluka: "Itawa",
    },
    {
      _id: "2",
      name: "Bharat Enterprises",
      code: "RAJD001976",
      role: "dealer",
      position: "dealer",
      city: "Unknown",
      district: "Kota",
      taluka: "Kaithoon (M)",
    },
  ];

  // 🔗 API + list state
  const [users, setUsers] = useState(fallbackUsers);
  const [usersLoading, setUsersLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [usingServer, setUsingServer] = useState(false); // true when a server fetch succeeds

  // debounce search
  const debounceRef = useRef(null);

  const fetchUsers = async (q) => {
    const backendUrl = config?.backend_url;
    const token = localStorage.getItem("authToken");
    if (!backendUrl || !token) {
      // No backend or token → use fallback data
      setUsingServer(false);
      setUsers(fallbackUsers);
      return;
    }

    try {
      setUsersLoading(true);
      setFetchError("");

      const params = q ? { search: q } : {};
      const res = await axios.get(`${backendUrl}/users/get/to-select`, {
        // if your middleware expects bearer, switch to:
        // headers: { Authorization: `Bearer ${token}` },
        headers: { Authorization: token },
        params,
      });

      const data = Array.isArray(res.data) ? res.data : [];
      setUsers(data);
      setUsingServer(true);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setFetchError("Could not fetch users. Showing fallback.");
      setUsers(fallbackUsers);
      setUsingServer(false);
    } finally {
      setUsersLoading(false);
    }
  };

  // initial load
  useEffect(() => {
    fetchUsers("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounced search -> server if available, else we’ll filter locally
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Only hit API when we’re in server mode (backend + token present)
      const backendUrl = config?.backend_url;
      const token = localStorage.getItem("authToken");
      if (backendUrl && token) {
        fetchUsers(searchQuery.trim());
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // visible users:
  // - server mode: trust API results (already filtered by name/position/code/role)
  // - fallback mode: filter locally across string fields so it still feels useful
  const visibleUsers = useMemo(() => {
    if (usingServer) return users;
    const q = searchQuery.toLowerCase();
    return (users || []).filter((user) =>
      Object.entries(user).some(
        ([, val]) => typeof val === "string" && val.toLowerCase().includes(q)
      )
    );
  }, [users, usingServer, searchQuery]);

  const toggleUser = (code) => {
    if (!code) return;
    setSelectedUsers((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const selectAll = () => {
    const visibleCodes = visibleUsers.map((u) => u.code).filter(Boolean);
    setSelectedUsers(visibleCodes);
  };

  const handleConfigChange = (index, field, value) => {
    const updated = [...otherConfig];
    updated[index][field] = value;
    setOtherConfig(updated);
  };

  const addConfigRow = () =>
    setOtherConfig([...otherConfig, { key: "", value: "" }]);
  const removeConfigRow = (index) => {
    const updated = [...otherConfig];
    updated.splice(index, 1);
    setOtherConfig(updated);
  };

  const handleSubmit = () => {
    if (!typeName || !firmCode || !flowName || selectedUsers.length === 0) {
      alert("Please fill all fields and select users.");
      return;
    }

    const payload = {
      type_name: typeName,
      firm_code: firmCode,
      flow_name: flowName,
      user_codes: selectedUsers,
      other_config: {},
    };

    otherConfig.forEach((item) => {
      if (item.key) payload.other_config[item.key] = item.value;
    });

    console.log("Submitting payload:", payload);
    alert("Dummy submit successful. Check console.");
    onSave?.();
    closeModal();
  };

  // small shimmer card for loader
  const ShimmerCard = () => (
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

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Add Type Group</h2>

        <label>Type Name</label>
        <input
          type="text"
          value={typeName}
          onChange={(e) => setTypeName(e.target.value)}
        />

        <label>Firm</label>
        <select value={firmCode} onChange={(e) => setFirmCode(e.target.value)}>
          <option value="">Select Firm</option>
          {firms.map((firm, idx) => (
            <option key={idx} value={firm.code}>
              {firm.name} ({firm.code})
            </option>
          ))}
        </select>

        <label>Flow Name</label>
        <select value={flowName} onChange={(e) => setFlowName(e.target.value)}>
          <option value="">Select Flow</option>
          {flows.map((flow, idx) => (
            <option key={idx} value={flow}>
              {flow}
            </option>
          ))}
        </select>

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
          <div style={{ marginBottom: 8, color: "#b00020" }}>
            {fetchError}
          </div>
        )}
            // inside your JSX, replace the old inline user list with:
        <div>
            <label>Users</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="secondary-button" onClick={() => setUserModalOpen(true)}>
                Choose Users
            </button>
            <span style={{ opacity: 0.8 }}>Selected: {selectedUsers.length}</span>
            </div>
        </div>

        <div>
          <label>Other Config</label>
          {otherConfig.map((config, index) => (
            <div key={index} className="config-row">
              <input
                type="text"
                placeholder="Key"
                value={config.key}
                onChange={(e) =>
                  handleConfigChange(index, "key", e.target.value)
                }
              />
              <input
                type="text"
                placeholder="Value"
                value={config.value}
                onChange={(e) =>
                  handleConfigChange(index, "value", e.target.value)
                }
              />
              {index > 0 && (
                <button onClick={() => removeConfigRow(index)}>X</button>
              )}
            </div>
          ))}
          <button onClick={addConfigRow}>+ Add Config Row</button>
        </div>

        <div className="modal-actions">
          <button className="secondary-button" onClick={closeModal}>
            Cancel
          </button>
          <button className="primary-button" onClick={handleSubmit}>
            Save
          </button>
        </div>

          <UserSelectModal
                isOpen={userModalOpen}
                value={selectedUsers}
                onApply={(codes) => setSelectedUsers(codes)}
                onClose={() => setUserModalOpen(false)}
            />
      </div>
    </div>
  );
};

export default AddTypeGroupModal;
