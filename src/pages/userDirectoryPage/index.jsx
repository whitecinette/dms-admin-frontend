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

const EXCLUDED_POSITIONS = ["mdd", "dealer", "spd", "smd"];

const prettifyLabel = (key = "") => {
  return String(key)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const displayValue = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "NA" ||
    (typeof value === "number" && Number.isNaN(value))
  ) {
    return "NA";
  }

  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);

  return String(value);
};

const getStatusClass = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "active") return "active";
  if (s === "inactive") return "inactive";
  return "neutral";
};

const buildMetadataForm = (metadata = {}, code = "", name = "") => {
  const cleaned = metadata && typeof metadata === "object" ? metadata : {};

  return {
    name: cleaned.name && cleaned.name !== "NA" ? cleaned.name : name || "",
    code: cleaned.code && cleaned.code !== "NA" ? cleaned.code : code || "",
    system_code:
      cleaned.system_code && cleaned.system_code !== "NA"
        ? cleaned.system_code
        : code || "",
    firm_code:
      cleaned.firm_code && cleaned.firm_code !== "NA" ? cleaned.firm_code : "",
    attendance:
      typeof cleaned.attendance === "boolean"
        ? cleaned.attendance
        : cleaned.attendance === "Yes"
        ? true
        : cleaned.attendance === "No"
        ? false
        : false,
    leaves:
      typeof cleaned.leaves === "boolean"
        ? cleaned.leaves
        : cleaned.leaves === "Yes"
        ? true
        : cleaned.leaves === "No"
        ? false
        : false,
    basic_salary:
      cleaned.basic_salary && cleaned.basic_salary !== "NA"
        ? cleaned.basic_salary
        : "",
    allowed_leaves:
      cleaned.allowed_leaves && cleaned.allowed_leaves !== "NA"
        ? cleaned.allowed_leaves
        : "",
    leaves_balance:
      cleaned.leaves_balance && cleaned.leaves_balance !== "NA"
        ? cleaned.leaves_balance
        : "",
    punch_location:
      cleaned.punch_location && cleaned.punch_location !== "NA"
        ? cleaned.punch_location
        : "",
  };
};

export default function UserDirectoryPage() {
  const [loading, setLoading] = useState(false);
  const [updatingCode, setUpdatingCode] = useState("");
  const [rows, setRows] = useState([]);
  const [firmOptions, setFirmOptions] = useState([]);
  const [allMetadataKeys, setAllMetadataKeys] = useState([]);

  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");

  const [positionOptions, setPositionOptions] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);

  const [expandedCodes, setExpandedCodes] = useState({});

  const [metaModalOpen, setMetaModalOpen] = useState(false);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaSaving, setMetaSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [metaForm, setMetaForm] = useState(buildMetadataForm({}, "", ""));

  const [pageInfo, setPageInfo] = useState({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 1,
  });

  const fetchFirms = async () => {
    try {
      const res = await axios.get(
        `${backendUrl}/super-admin/user-directory/firms`,
        {
          headers: getAuthHeader(),
        }
      );

      setFirmOptions(res.data?.firms || []);
    } catch (error) {
      console.error("Failed to fetch firms:", error);
      setFirmOptions([]);
    }
  };

  const fetchData = async (customPage = 1) => {
    try {
      setLoading(true);

      const res = await axios.get(`${backendUrl}/super-admin/user-directory`, {
        params: {
          search,
          position,
          role,
          status,
          page: customPage,
          limit: pageInfo.limit,
        },
        headers: getAuthHeader(),
      });

      const apiRows = Array.isArray(res.data?.rows) ? res.data.rows : [];
      const keys = Array.isArray(res.data?.allMetadataKeys)
        ? res.data.allMetadataKeys
        : [];

      setRows(apiRows);
      setAllMetadataKeys(keys);

      setPageInfo((prev) => ({
        ...prev,
        page: res.data?.page || customPage || 1,
        limit: res.data?.limit || prev.limit,
        total: res.data?.total || apiRows.length || 0,
        totalPages: res.data?.totalPages || 1,
      }));

      const posSet = new Set();
      const roleSet = new Set();

      apiRows.forEach((item) => {
        const pos = String(item?.position || "").toLowerCase();
        const rl = String(item?.role || "").toLowerCase();

        if (pos && pos !== "na" && !EXCLUDED_POSITIONS.includes(pos)) {
          posSet.add(pos);
        }

        if (rl && rl !== "na") {
          roleSet.add(rl);
        }
      });

      setPositionOptions(Array.from(posSet).sort());
      setRoleOptions(Array.from(roleSet).sort());
    } catch (error) {
      console.error("Failed to fetch user directory:", error);
      setRows([]);
      setAllMetadataKeys([]);
      setPageInfo((prev) => ({
        ...prev,
        total: 0,
        totalPages: 1,
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFirms();
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleMetadataKeys = useMemo(() => {
    const preferredOrder = [
      "attendance",
      "firm_code",
      "basic_salary",
      "allowed_leaves",
      "leaves",
      "leaves_balance",
      "system_code",
      "punch_location",
      "name",
      "code",
    ];

    const filtered = allMetadataKeys.filter(
      (key) => !["_id", "__v", "createdAt", "updatedAt"].includes(key)
    );

    const preferred = preferredOrder.filter((key) => filtered.includes(key));
    const rest = filtered.filter((key) => !preferredOrder.includes(key)).sort();

    return [...preferred, ...rest];
  }, [allMetadataKeys]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const pos = String(row?.position || "").toLowerCase();
      return !EXCLUDED_POSITIONS.includes(pos);
    });
  }, [rows]);

  const toggleExpand = (code) => {
    setExpandedCodes((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  const handleFirmChange = async (code, firm_code) => {
    try {
      setUpdatingCode(code);

      await axios.patch(
        `${backendUrl}/super-admin/user-directory/${code}/firm`,
        { firm_code },
        { headers: getAuthHeader() }
      );

      await fetchData(pageInfo.page || 1);
    } catch (error) {
      console.error("Failed to update firm:", error);
      alert(error?.response?.data?.message || "Failed to update firm");
    } finally {
      setUpdatingCode("");
    }
  };

  const handleStatusToggle = async (row) => {
    const nextStatus =
      String(row?.is_active || "").toLowerCase() === "active"
        ? "inactive"
        : "active";

    try {
      setUpdatingCode(row.code);

      await axios.patch(
        `${backendUrl}/super-admin/user-directory/${row.code}/status`,
        { status: nextStatus },
        { headers: getAuthHeader() }
      );

      await fetchData(pageInfo.page || 1);
    } catch (error) {
      console.error("Failed to update status:", error);
      alert(error?.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingCode("");
    }
  };

  const openMetaModal = async (row) => {
    try {
      setSelectedUser(row);
      setMetaModalOpen(true);
      setMetaLoading(true);

      const res = await axios.get(
        `${backendUrl}/super-admin/user-directory/${row.code}/metadata`,
        {
          headers: getAuthHeader(),
        }
      );

      const metadata = res.data?.data?.metadata || row.metadata || null;
      const resolvedName = res.data?.data?.name || row.name || "";

      setMetaForm(buildMetadataForm(metadata, row.code, resolvedName));
    } catch (error) {
      console.error("Failed to fetch metadata:", error);
      setMetaForm(buildMetadataForm(row.metadata || {}, row.code, row.name));
    } finally {
      setMetaLoading(false);
    }
  };

  const closeMetaModal = () => {
    if (metaSaving) return;
    setMetaModalOpen(false);
    setSelectedUser(null);
    setMetaForm(buildMetadataForm({}, "", ""));
    setMetaLoading(false);
    setMetaSaving(false);
  };

  const handleMetaInput = (field, value) => {
    setMetaForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveMetadata = async () => {
    if (!selectedUser?.code) return;

    try {
      setMetaSaving(true);

      const payload = {
        ...metaForm,
        attendance: !!metaForm.attendance,
        leaves: !!metaForm.leaves,
      };

      await axios.put(
        `${backendUrl}/super-admin/user-directory/${selectedUser.code}/metadata`,
        payload,
        { headers: getAuthHeader() }
      );

      await fetchData(pageInfo.page || 1);
      closeMetaModal();
    } catch (error) {
      console.error("Failed to save metadata:", error);
      alert(error?.response?.data?.message || "Failed to save metadata");
    } finally {
      setMetaSaving(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setPosition("");
    setRole("");
    setStatus("");

    setTimeout(() => {
      setPageInfo((prev) => ({ ...prev, page: 1 }));
      fetchData(1);
    }, 0);
  };

  return (
    <div className="user-directory-page">
      <div className="ud-hero">
        <div>
          <div className="ud-title">User Directory</div>
          <div className="ud-subtitle">
            Super admin directory for users, actor codes, firm mapping, and
            metadata.
          </div>
        </div>

        <div className="ud-hero-stats">
          <div className="stat-card">
            <span className="stat-label">Visible Users</span>
            <strong>{pageInfo.total || filteredRows.length}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Metadata Columns</span>
            <strong>{visibleMetadataKeys.length}</strong>
          </div>
        </div>
      </div>

      <div className="ud-filters-card">
        <div className="ud-filters-top">
          <div className="section-title">Filters</div>
          <div className="filter-actions">
            <button
              className="secondary-btn"
              onClick={resetFilters}
              disabled={loading}
            >
              Reset
            </button>
            <button
              className="primary-btn"
              onClick={() => fetchData(1)}
              disabled={loading}
            >
              {loading ? "Loading..." : "Apply Filters"}
            </button>
          </div>
        </div>

        <div className="ud-filters-grid">
          <div className="field">
            <label>Search</label>
            <input
              placeholder="Code / name / email / phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Position</label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            >
              <option value="">All Positions</option>
              {positionOptions.map((item) => (
                <option key={item} value={item}>
                  {item.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">All Roles</option>
              {roleOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <div className="ud-table-card">
        <div className="ud-table-head">
          <div className="section-title">Directory Table</div>
          <div className="table-note">
            Users without metadata show <strong>NA</strong>.
          </div>
        </div>

        {loading ? (
          <div className="ud-empty">Loading user directory...</div>
        ) : filteredRows.length === 0 ? (
          <div className="ud-empty">No users found.</div>
        ) : (
          <div className="ud-table-wrap">
            <table className="ud-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Position</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Firm</th>
                  <th>Metadata</th>
                  {visibleMetadataKeys.map((key) => (
                    <th key={key}>{prettifyLabel(key)}</th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((row) => {
                  const expanded = !!expandedCodes[row.code];

                  return (
                    <React.Fragment key={row.code}>
                      <tr>
                        <td>
                          <div className="user-cell">
                            <div className="user-name">
                              {displayValue(row.name)}
                            </div>
                            <div className="user-code">
                              {displayValue(row.code)}
                            </div>
                            <div className="user-mini">
                              Email: {displayValue(row.email)}
                            </div>
                            <div className="user-mini">
                              Phone: {displayValue(row.phone)}
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="pill neutral">
                            {displayValue(row.position).toUpperCase()}
                          </span>
                        </td>

                        <td>{displayValue(row.role)}</td>

                        <td>
                          <div className="status-stack">
                            <span
                              className={`pill ${getStatusClass(row.is_active)}`}
                            >
                              {displayValue(row.is_active)}
                            </span>
                            <div className="status-mini">
                              User: {displayValue(row.user_status)}
                            </div>
                            <div className="status-mini">
                              Actor: {displayValue(row.actor_status)}
                            </div>
                          </div>
                        </td>

                        <td>
                          <select
                            className="firm-select"
                            value={row.metadata?.firm_code || row.firm_code || ""}
                            onChange={(e) =>
                              handleFirmChange(row.code, e.target.value)
                            }
                            disabled={updatingCode === row.code}
                          >
                            <option value="">Select Firm</option>
                            {firmOptions.map((firm) => (
                              <option key={firm.code} value={firm.code}>
                                {firm.name} ({firm.code})
                              </option>
                            ))}
                          </select>
                        </td>

                        <td>
                          <span
                            className={`pill ${
                              row.metadata_available ? "active" : "neutral"
                            }`}
                          >
                            {row.metadata_available ? "Available" : "Missing"}
                          </span>
                        </td>

                        {visibleMetadataKeys.map((key) => (
                          <td key={`${row.code}-${key}`}>
                            {row.metadata && row.metadata[key] !== undefined
                              ? displayValue(row.metadata[key])
                              : "NA"}
                          </td>
                        ))}

                        <td>
                          <div className="action-col">
                            <button
                              className="ghost-btn"
                              onClick={() => toggleExpand(row.code)}
                            >
                              {expanded ? "Hide" : "More"}
                            </button>

                            <button
                              className="secondary-btn small"
                              onClick={() => openMetaModal(row)}
                            >
                              {row.metadata_available
                                ? "Edit Metadata"
                                : "Add Metadata"}
                            </button>

                            <button
                              className={`toggle-btn ${
                                String(row.is_active).toLowerCase() === "active"
                                  ? "danger"
                                  : "success"
                              }`}
                              onClick={() => handleStatusToggle(row)}
                              disabled={updatingCode === row.code}
                            >
                              {String(row.is_active).toLowerCase() === "active"
                                ? "Set Inactive"
                                : "Set Active"}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {expanded && (
                        <tr className="expanded-row">
                          <td colSpan={7 + visibleMetadataKeys.length}>
                            <div className="expanded-content">
                              <div className="expanded-grid">
                                <div className="detail-card">
                                  <div className="detail-title">User Data</div>
                                  <div className="detail-body">
                                    <pre>
                                      {JSON.stringify(
                                        row.user_data || {},
                                        null,
                                        2
                                      )}
                                    </pre>
                                  </div>
                                </div>

                                <div className="detail-card">
                                  <div className="detail-title">Actor Data</div>
                                  <div className="detail-body">
                                    <pre>
                                      {JSON.stringify(
                                        row.actor_data || {},
                                        null,
                                        2
                                      )}
                                    </pre>
                                  </div>
                                </div>

                                <div className="detail-card">
                                  <div className="detail-title">Metadata</div>
                                  <div className="detail-body">
                                    <pre>
                                      {JSON.stringify(
                                        row.metadata || {},
                                        null,
                                        2
                                      )}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {metaModalOpen && (
        <div className="ud-modal-overlay" onClick={closeMetaModal}>
          <div className="ud-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ud-modal-header">
              <div>
                <div className="ud-modal-title">
                  {selectedUser?.metadata_available
                    ? "Edit Metadata"
                    : "Add Metadata"}
                </div>
                <div className="ud-modal-subtitle">
                  {selectedUser?.name} • {selectedUser?.code}
                </div>
              </div>

              <button className="close-btn" onClick={closeMetaModal}>
                ×
              </button>
            </div>

            {metaLoading ? (
              <div className="ud-empty">Loading metadata...</div>
            ) : (
              <>
                <div className="ud-modal-body">
                  <div className="modal-grid">
                    <div className="field">
                      <label>Name</label>
                      <input
                        value={metaForm.name}
                        onChange={(e) =>
                          handleMetaInput("name", e.target.value)
                        }
                      />
                    </div>

                    <div className="field">
                      <label>Code</label>
                      <input value={metaForm.code} disabled />
                    </div>

                    <div className="field">
                      <label>System Code</label>
                      <input
                        value={metaForm.system_code}
                        onChange={(e) =>
                          handleMetaInput("system_code", e.target.value)
                        }
                      />
                    </div>

                    <div className="field">
                      <label>Firm Code</label>
                      <select
                        value={metaForm.firm_code}
                        onChange={(e) =>
                          handleMetaInput("firm_code", e.target.value)
                        }
                      >
                        <option value="">Select Firm</option>
                        {firmOptions.map((firm) => (
                          <option key={firm.code} value={firm.code}>
                            {firm.name} ({firm.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label>Basic Salary</label>
                      <input
                        value={metaForm.basic_salary}
                        onChange={(e) =>
                          handleMetaInput("basic_salary", e.target.value)
                        }
                        placeholder="30000"
                      />
                    </div>

                    <div className="field">
                      <label>Allowed Leaves</label>
                      <input
                        value={metaForm.allowed_leaves}
                        onChange={(e) =>
                          handleMetaInput("allowed_leaves", e.target.value)
                        }
                        placeholder="12"
                      />
                    </div>

                    <div className="field">
                      <label>Leaves Balance</label>
                      <input
                        value={metaForm.leaves_balance}
                        onChange={(e) =>
                          handleMetaInput("leaves_balance", e.target.value)
                        }
                        placeholder="10"
                      />
                    </div>

                    <div className="field">
                      <label>Punch Location</label>
                      <input
                        value={metaForm.punch_location}
                        onChange={(e) =>
                          handleMetaInput("punch_location", e.target.value)
                        }
                        placeholder="open"
                      />
                    </div>

                    <div className="field checkbox-field">
                      <label>Attendance Enabled</label>
                      <div className="switch-row">
                        <input
                          type="checkbox"
                          checked={!!metaForm.attendance}
                          onChange={(e) =>
                            handleMetaInput("attendance", e.target.checked)
                          }
                        />
                        <span>{metaForm.attendance ? "Yes" : "No"}</span>
                      </div>
                    </div>

                    <div className="field checkbox-field">
                      <label>Leaves Enabled</label>
                      <div className="switch-row">
                        <input
                          type="checkbox"
                          checked={!!metaForm.leaves}
                          onChange={(e) =>
                            handleMetaInput("leaves", e.target.checked)
                          }
                        />
                        <span>{metaForm.leaves ? "Yes" : "No"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ud-modal-footer">
                  <button className="secondary-btn" onClick={closeMetaModal}>
                    Cancel
                  </button>
                  <button
                    className="primary-btn"
                    onClick={saveMetadata}
                    disabled={metaSaving}
                  >
                    {metaSaving ? "Saving..." : "Save Metadata"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}