import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FaTrash } from "react-icons/fa";

const normalize = (value) =>
  value === null || value === undefined ? "" : String(value).trim().toLowerCase();

const toDateDisplay = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toISOString().split("T")[0];
};

const isExpired = (cfg = {}) => {
  const expiryRaw = cfg.expiryDate || cfg.endDate || cfg.expiry || cfg.validTill || "";
  if (!expiryRaw) return false;
  const d = new Date(expiryRaw);
  if (Number.isNaN(d.getTime())) return false;
  return d < new Date(new Date().toDateString());
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken") || "";
  if (!token) return {};
  return {
    Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
  };
};

function BeatConfigListModal({ open, onClose, backendUrl, weeklyRows = [], onEditConfig }) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [configs, setConfigs] = useState([]);
  const [confirmDeleteConfig, setConfirmDeleteConfig] = useState(null);

  const weeklyActorCodes = useMemo(
    () =>
      Array.from(
        new Set(
          weeklyRows
            .map((row) => String(row?.code || row?.actorCode || "").trim())
            .filter(Boolean)
        )
      ),
    [weeklyRows]
  );

  const loadConfigs = async () => {
    if (!open) return;

    setLoading(true);
    setError("");
    try {
      let rows = [];

      const listEndpoints = [
        `${backendUrl}/admin/beat-mapping/config/list`,
        `${backendUrl}/admin/beat-mapping/configs`,
      ];

      for (const endpoint of listEndpoints) {
        try {
          const res = await axios.get(endpoint, {
            params: { page: 1, limit: 500 },
            headers: getAuthHeaders(),
          });
          const found = Array.isArray(res?.data?.configs)
            ? res.data.configs
            : Array.isArray(res?.data?.data)
            ? res.data.data
            : [];
          if (found.length > 0) {
            rows = found;
            break;
          }
        } catch (e) {
          // try next
        }
      }

      if (rows.length === 0 && weeklyActorCodes.length > 0) {
        const res = await axios.post(
          `${backendUrl}/admin/beat-mapping/config/get`,
          { actorCodes: weeklyActorCodes },
          { headers: { "Content-Type": "application/json", ...getAuthHeaders() } }
        );
        rows = Array.isArray(res?.data?.configs) ? res.data.configs : [];
      }

      const mapped = rows
        .map((cfg) => ({
          ...cfg,
          actorCode: String(cfg.actorCode || cfg.code || "").trim(),
          actorName: String(cfg.actorName || cfg.name || cfg?.actor?.name || "").trim(),
          actorPosition: String(
            cfg.actorPosition || cfg.position || cfg?.actor?.position || ""
          ).trim(),
          actorRole: String(cfg.actorRole || cfg.role || cfg?.actor?.role || "").trim(),
          firmCode: String(cfg.firmCode || cfg.firm_code || "").trim(),
          flowName: String(cfg.flowName || cfg.hierarchy_name || "").trim(),
        }))
        .filter((cfg) => cfg.actorCode);

      const seen = new Set();
      const deduped = [];
      mapped.forEach((cfg) => {
        const key = `${normalize(cfg.actorCode)}|${normalize(cfg.firmCode)}|${normalize(cfg.flowName)}`;
        if (seen.has(key)) return;
        seen.add(key);
        deduped.push(cfg);
      });

      setConfigs(deduped);
    } catch (e) {
      setConfigs([]);
      setError(e?.response?.data?.message || "Failed to load configs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    loadConfigs();
  }, [open, backendUrl, weeklyActorCodes]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteConfig = async () => {
    if (!confirmDeleteConfig?._id || deleting) return;

    setDeleting(true);
    setError("");
    try {
      await axios.delete(
        `${backendUrl}/admin/beat-mapping/config/${confirmDeleteConfig._id}`,
        { headers: getAuthHeaders() }
      );
      setConfigs((prev) => prev.filter((cfg) => cfg._id !== confirmDeleteConfig._id));
      setConfirmDeleteConfig(null);
      await loadConfigs();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to delete config.");
    } finally {
      setDeleting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="beat-config-list-overlay" onClick={onClose}>
      <div className="beat-config-list-modal" onClick={(e) => e.stopPropagation()}>
        <div className="beat-config-list-header">
          <h3>Beat Configs</h3>
          <button type="button" onClick={onClose}>×</button>
        </div>

        <div className="beat-config-list-body">
          {loading ? <div className="empty">Loading configs...</div> : null}
          {!loading && error ? <div className="error">{error}</div> : null}

          {!loading && !error ? (
            <table>
              <thead>
                <tr>
                  <th>Actor</th>
                  <th>Name</th>
                  <th>Position</th>
                  <th>Role</th>
                  <th>Firm</th>
                  <th>Flow</th>
                  <th>Start</th>
                  <th>Expiry</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {configs.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="empty">No configs found.</td>
                  </tr>
                ) : (
                  configs.map((cfg, index) => {
                    const expired = isExpired(cfg);
                    return (
                      <tr key={`${cfg.actorCode}-${index}`}>
                        <td>{cfg.actorCode}</td>
                        <td>{cfg.actorName || "-"}</td>
                        <td>{cfg.actorPosition || "-"}</td>
                        <td>{cfg.actorRole || "-"}</td>
                        <td>{cfg.firmCode || "-"}</td>
                        <td>{cfg.flowName || "-"}</td>
                        <td>{toDateDisplay(cfg.startDate || cfg.fromDate || cfg.validFrom)}</td>
                        <td>{toDateDisplay(cfg.expiryDate || cfg.endDate || cfg.validTill)}</td>
                        <td>{expired ? "Expired" : "Active"}</td>
                        <td className="config-actions-cell">
                          <button
                            type="button"
                            onClick={() => onEditConfig?.(cfg)}
                            disabled={expired}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="delete-config-btn"
                            onClick={() => setConfirmDeleteConfig(cfg)}
                            disabled={!cfg._id}
                            title="Delete config"
                            aria-label={`Delete config for ${cfg.actorCode}`}
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : null}
        </div>
        {confirmDeleteConfig ? (
          <div
            className="beat-config-confirm-overlay"
            onClick={() => !deleting && setConfirmDeleteConfig(null)}
          >
            <div className="beat-config-confirm" onClick={(e) => e.stopPropagation()}>
              <h4>Delete Config?</h4>
              <p>
                This will delete config for actor{" "}
                <strong>{confirmDeleteConfig.actorCode}</strong>.
              </p>
              <div className="confirm-actions">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteConfig(null)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button type="button" onClick={handleDeleteConfig} disabled={deleting}>
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default BeatConfigListModal;
