import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import config from "../../config";
import "./style.scss";

const backendUrl = config.backend_url;

const getAuthHeader = () => {
  const raw = localStorage.getItem("authToken") || "";
  if (!raw) return {};
  return {
    Authorization: raw.startsWith("Bearer ") ? raw : `Bearer ${raw}`,
  };
};

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
    return "—";
  }

  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);

  return String(value);
};

const formatTableDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const buildEditForm = (row = {}, columns = []) => {
  const form = {};
  columns.forEach((col) => {
    form[col] = row?.[col] ?? "";
  });
  return form;
};

const buildBulkForm = (columns = []) => {
  const form = {};
  columns.forEach((col) => {
    form[col] = {
      enabled: false,
      value: "",
      clear: false,
    };
  });
  return form;
};

export default function HierarchyManagerPage() {
  const [metaLoading, setMetaLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);

  const [firms, setFirms] = useState([]);
  const [flows, setFlows] = useState([]);
  const [flowMap, setFlowMap] = useState({});

  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);

  const [filters, setFilters] = useState({
    firm_code: "",
    hierarchy_name: "",
    position_field: "",
    position_value: "",
    dealer: "",
    search: "",
  });

  const [selectedRow, setSelectedRow] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [rawSnapshot, setRawSnapshot] = useState(null);

  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({});
  const [bulkError, setBulkError] = useState("");
  const [bulkWarning, setBulkWarning] = useState("");

  const [appliedFilters, setAppliedFilters] = useState({
    firm_code: "",
    hierarchy_name: "",
    position_field: "",
    position_value: "",
    dealer: "",
    search: "",
  });

  const selectedFlowColumns = useMemo(() => {
    if (filters.hierarchy_name && flowMap[filters.hierarchy_name]) {
      return flowMap[filters.hierarchy_name] || [];
    }
    return [];
  }, [filters.hierarchy_name, flowMap]);

  const availableFlowsForFirm = useMemo(() => {
    if (!filters.firm_code) return flows;

    const selectedFirm = firms.find((f) => f.code === filters.firm_code);
    const firmFlowTypes = selectedFirm?.flowTypes || [];

    if (!firmFlowTypes.length) return flows;

    return flows.filter((flow) => firmFlowTypes.includes(flow.name));
  }, [filters.firm_code, firms, flows]);

  const selectedFirmLabel = useMemo(() => {
    const firm = firms.find((f) => f.code === filters.firm_code);
    return firm ? `${firm.name} (${firm.code})` : "All Firms";
  }, [filters.firm_code, firms]);

  const selectedFlowLabel = useMemo(() => {
    return filters.hierarchy_name || "No Flow Selected";
  }, [filters.hierarchy_name]);

  const changedFields = useMemo(() => {
    if (!selectedRow) return [];

    return columns.filter((field) => {
      const oldVal = String(selectedRow?.[field] ?? "");
      const newVal = String(editForm?.[field] ?? "");
      return oldVal !== newVal;
    });
  }, [selectedRow, editForm, columns]);

  const selectedRows = useMemo(() => {
    if (!selectedIds.length) return [];
    const idSet = new Set(selectedIds);
    return rows.filter((row) => idSet.has(String(row._id)));
  }, [rows, selectedIds]);

  const allVisibleSelected = useMemo(() => {
    if (!rows.length) return false;
    return rows.every((row) => selectedIds.includes(String(row._id)));
  }, [rows, selectedIds]);

  const bulkEnabledFields = useMemo(() => {
    return Object.keys(bulkForm).filter((field) => bulkForm[field]?.enabled);
  }, [bulkForm]);

  const bulkSelectedDealerPreview = useMemo(() => {
    const preview = selectedRows
      .slice(0, 5)
      .map((row) => row?.dealer)
      .filter(Boolean);

    if (selectedRows.length > 5) {
      preview.push(`+${selectedRows.length - 5} more`);
    }

    return preview;
  }, [selectedRows]);

  const hierarchyPreview = useMemo(() => {
    if (!selectedFlowColumns.length) return "No flow structure selected";
    return selectedFlowColumns.join(" → ");
  }, [selectedFlowColumns]);

  const fetchMeta = async () => {
    try {
      setMetaLoading(true);

      const res = await axios.get(`${backendUrl}/super-admin/hierarchy/meta`, {
        headers: getAuthHeader(),
      });

      const data = res.data?.data || {};

      setFirms(Array.isArray(data.firms) ? data.firms : []);
      setFlows(Array.isArray(data.flows) ? data.flows : []);
      setFlowMap(data.flowMap || {});
    } catch (error) {
      console.error("Failed to fetch hierarchy meta:", error);
      setFirms([]);
      setFlows([]);
      setFlowMap({});
      alert(error?.response?.data?.message || "Failed to fetch hierarchy meta");
    } finally {
      setMetaLoading(false);
    }
  };

  const fetchRows = async (overrideFilters = null) => {
    const activeFilters = overrideFilters || filters;

    if (!activeFilters.hierarchy_name) {
      setRows([]);
      setColumns([]);
      setSelectedIds([]);
      return;
    }

    try {
      setLoading(true);

      const res = await axios.get(`${backendUrl}/super-admin/hierarchy`, {
        params: {
          ...activeFilters,
          all: true,
        },
        headers: getAuthHeader(),
      });

      const apiRows = Array.isArray(res.data?.rows) ? res.data.rows : [];
      const apiColumns = Array.isArray(res.data?.columns)
        ? res.data.columns
        : [];

      setRows(apiRows);
      setColumns(apiColumns);
      setSelectedIds([]);
      setAppliedFilters({
        firm_code: activeFilters.firm_code || "",
        hierarchy_name: activeFilters.hierarchy_name || "",
        position_field: activeFilters.position_field || "",
        position_value: activeFilters.position_value || "",
        dealer: activeFilters.dealer || "",
        search: activeFilters.search || "",
      });
    } catch (error) {
      console.error("Failed to fetch hierarchy rows:", error);
      setRows([]);
      setColumns([]);
      setSelectedIds([]);
      alert(error?.response?.data?.message || "Failed to fetch hierarchy rows");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeta();
  }, []);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => {
      const next = {
        ...prev,
        [field]: value,
      };

      if (field === "firm_code") {
        const selectedFirm = firms.find((f) => f.code === value);
        const allowedFlows = selectedFirm?.flowTypes || [];

        if (value && allowedFlows.length) {
          if (!allowedFlows.includes(next.hierarchy_name)) {
            next.hierarchy_name = "";
            next.position_field = "";
            next.position_value = "";
          }
        }
      }

      if (field === "hierarchy_name") {
        next.position_field = "";
        next.position_value = "";
      }

      if (field === "position_field" && !value) {
        next.position_value = "";
      }

      return next;
    });
  };

  const applyFilters = async () => {
    closeDrawer();
    closeBulkModal();
    await fetchRows();
  };

  const resetFilters = async () => {
    const nextFilters = {
      firm_code: "",
      hierarchy_name: "",
      position_field: "",
      position_value: "",
      dealer: "",
      search: "",
    };

    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    closeDrawer();
    closeBulkModal();
    setRows([]);
    setColumns([]);
    setSelectedIds([]);
  };

  const openDrawer = (row) => {
    setSelectedRow(row);
    setEditForm(buildEditForm(row, columns));
    setRawSnapshot(row);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (saving) return;
    setDrawerOpen(false);
    setSelectedRow(null);
    setEditForm({});
    setRawSnapshot(null);
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveRow = async () => {
    if (!selectedRow?._id) return;

    const updates = {};
    changedFields.forEach((field) => {
      updates[field] = editForm[field];
    });

    if (!Object.keys(updates).length) {
      alert("No changes to save");
      return;
    }

    try {
      setSaving(true);

      await axios.patch(
        `${backendUrl}/super-admin/hierarchy/${selectedRow._id}`,
        { updates },
        { headers: getAuthHeader() }
      );

      await fetchRows();

      const nextSelectedRow = {
        ...selectedRow,
        ...updates,
      };

      setSelectedRow(nextSelectedRow);
      setRawSnapshot(nextSelectedRow);
      setEditForm(buildEditForm(nextSelectedRow, columns));
      alert("Hierarchy entry updated successfully");
    } catch (error) {
      console.error("Failed to update hierarchy entry:", error);
      alert(error?.response?.data?.message || "Failed to update hierarchy row");
    } finally {
      setSaving(false);
    }
  };

  const toggleRowSelection = (id) => {
    const safeId = String(id);
    setSelectedIds((prev) =>
      prev.includes(safeId)
        ? prev.filter((item) => item !== safeId)
        : [...prev, safeId]
    );
  };

  const handleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds([]);
      return;
    }

    const allIds = rows.map((row) => String(row._id)).filter(Boolean);
    setSelectedIds(allIds);
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const closeBulkModal = () => {
    if (bulkSaving) return;
    setBulkModalOpen(false);
    setBulkForm(buildBulkForm(columns));
    setBulkError("");
    setBulkWarning("");
  };

  const openBulkModal = () => {
    if (!selectedIds.length) return;

    setBulkForm(buildBulkForm(columns));
    setBulkError("");
    setBulkWarning("");
    setBulkModalOpen(true);
  };

  const handleBulkFieldToggle = (field, checked) => {
    setBulkForm((prev) => {
      const next = {
        ...prev,
        [field]: {
          ...prev[field],
          enabled: checked,
        },
      };

      if (!checked) {
        next[field] = {
          enabled: false,
          value: "",
          clear: false,
        };
      }

      return next;
    });
  };

  const handleBulkValueChange = (field, value) => {
    setBulkForm((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        value,
      },
    }));
  };

  const handleBulkClearToggle = (field, checked) => {
    setBulkForm((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        clear: checked,
        value: checked ? "" : prev[field]?.value || "",
      },
    }));
  };

  const validateBulkPayload = () => {
    if (!selectedIds.length) {
      return "Please select at least one row.";
    }

    if (!filters.hierarchy_name) {
      return "Please select a hierarchy flow first.";
    }

    const enabledFields = Object.keys(bulkForm).filter(
      (field) => bulkForm[field]?.enabled
    );

    if (!enabledFields.length) {
      return "Please choose at least one field to update.";
    }

    const invalidValueField = enabledFields.find((field) => {
      const config = bulkForm[field];
      return !config.clear && !String(config.value || "").trim();
    });

    if (invalidValueField) {
      return `Please enter a value or choose clear for ${prettifyLabel(
        invalidValueField
      )}.`;
    }

    return "";
  };

  const buildBulkUpdatesPayload = () => {
    const updates = {};

    Object.keys(bulkForm).forEach((field) => {
      const config = bulkForm[field];
      if (!config?.enabled) return;

      if (config.clear) {
        updates[field] = "";
      } else {
        updates[field] = String(config.value || "").trim();
      }
    });

    return updates;
  };

  const handleBulkApply = async () => {
    const validationError = validateBulkPayload();
    if (validationError) {
      setBulkError(validationError);
      return;
    }

    const updates = buildBulkUpdatesPayload();

    const warningFields = Object.keys(updates).filter((field) =>
      ["dealer", "smd", "zsm", "asm"].includes(String(field).toLowerCase())
    );

    if (warningFields.length) {
      setBulkWarning(
        `You are updating important hierarchy fields: ${warningFields
          .map(prettifyLabel)
          .join(", ")}. This will overwrite existing values in all selected rows.`
      );
    } else {
      setBulkWarning("");
    }

    try {
      setBulkSaving(true);
      setBulkError("");

      const res = await axios.patch(
        `${backendUrl}/super-admin/hierarchy/bulk-update`,
        {
          ids: selectedIds,
          hierarchy_name: filters.hierarchy_name,
          updates,
        },
        {
          headers: getAuthHeader(),
        }
      );

      await fetchRows();
      closeBulkModal();
      closeDrawer();
      setSelectedIds([]);
      alert(
        res.data?.message || "Bulk hierarchy update applied successfully"
      );
    } catch (error) {
      console.error("Failed to bulk update hierarchy rows:", error);
      const serverMessage =
        error?.response?.data?.message ||
        "Failed to bulk update hierarchy rows";
      setBulkError(serverMessage);
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <div className="hierarchy-manager-page">
      <div className="hm-header-card">
        <div className="hm-header-left">
          <div className="hm-page-title">Hierarchy Manager</div>
          <div className="hm-page-subtitle">
            Manage flow mappings across firms and actor levels with a cleaner,
            safer super admin experience.
          </div>

          <div className="hm-preview-line">
            <span className="preview-label">Flow Structure:</span>
            <span className="preview-value">{hierarchyPreview}</span>
          </div>
        </div>

        <div className="hm-header-stats">
          <div className="hm-stat-card">
            <span className="hm-stat-label">Firm</span>
            <strong>{selectedFirmLabel}</strong>
          </div>

          <div className="hm-stat-card">
            <span className="hm-stat-label">Flow</span>
            <strong>{selectedFlowLabel}</strong>
          </div>

          <div className="hm-stat-card">
            <span className="hm-stat-label">Rows Loaded</span>
            <strong>{rows.length || 0}</strong>
          </div>

          <div className="hm-stat-card">
            <span className="hm-stat-label">Actor Levels</span>
            <strong>{columns.length || selectedFlowColumns.length || 0}</strong>
          </div>
        </div>
      </div>

      <div className="hm-filters-card">
        <div className="hm-card-head">
          <div>
            <div className="hm-section-title">Filters</div>
            <div className="hm-section-subtitle">
              Select a firm and flow, then refine by code or dealer.
            </div>
          </div>

          <div className="hm-actions">
            <button
              className="hm-btn hm-btn-secondary"
              onClick={resetFilters}
              disabled={loading || metaLoading}
            >
              Reset
            </button>

            <button
              className="hm-btn hm-btn-primary"
              onClick={applyFilters}
              disabled={loading || metaLoading || !filters.hierarchy_name}
            >
              {loading ? "Loading..." : "Apply Filters"}
            </button>
          </div>
        </div>

        <div className="hm-filters-grid hm-filters-grid-primary">
          <div className="hm-field">
            <label>Firm</label>
            <select
              value={filters.firm_code}
              onChange={(e) => handleFilterChange("firm_code", e.target.value)}
              disabled={metaLoading}
            >
              <option value="">All Firms</option>
              {firms.map((firm) => (
                <option key={firm.code} value={firm.code}>
                  {firm.name} ({firm.code})
                </option>
              ))}
            </select>
          </div>

          <div className="hm-field">
            <label>Flow</label>
            <select
              value={filters.hierarchy_name}
              onChange={(e) =>
                handleFilterChange("hierarchy_name", e.target.value)
              }
              disabled={metaLoading}
            >
              <option value="">Select Flow</option>
              {availableFlowsForFirm.map((flow) => (
                <option key={flow.name} value={flow.name}>
                  {flow.name}
                </option>
              ))}
            </select>
          </div>

          <div className="hm-field hm-field-search">
            <label>Search</label>
            <input
              placeholder="Search any visible flow value"
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
            />
          </div>
        </div>

        <div className="hm-filters-grid hm-filters-grid-secondary">
          <div className="hm-field">
            <label>Position Field</label>
            <select
              value={filters.position_field}
              onChange={(e) =>
                handleFilterChange("position_field", e.target.value)
              }
              disabled={!filters.hierarchy_name}
            >
              <option value="">All Fields</option>
              {selectedFlowColumns.map((field) => (
                <option key={field} value={field}>
                  {prettifyLabel(field)}
                </option>
              ))}
            </select>
          </div>

          <div className="hm-field">
            <label>Position Value</label>
            <input
              placeholder="Enter exact actor code"
              value={filters.position_value}
              onChange={(e) =>
                handleFilterChange("position_value", e.target.value)
              }
              disabled={!filters.position_field}
            />
          </div>

          <div className="hm-field">
            <label>Dealer Code</label>
            <input
              placeholder="Filter by dealer"
              value={filters.dealer}
              onChange={(e) => handleFilterChange("dealer", e.target.value)}
            />
          </div>
        </div>

        <div className="hm-applied-strip">
          <span className="hm-applied-chip">
            Applied Flow: {appliedFilters.hierarchy_name || "None"}
          </span>
          <span className="hm-applied-chip">
            Position Filter:{" "}
            {appliedFilters.position_field && appliedFilters.position_value
              ? `${appliedFilters.position_field} = ${appliedFilters.position_value}`
              : "None"}
          </span>
          <span className="hm-applied-chip">
            Dealer: {appliedFilters.dealer || "None"}
          </span>
          <span className="hm-applied-chip">
            Search: {appliedFilters.search || "None"}
          </span>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="hm-bulk-toolbar">
          <div className="hm-bulk-toolbar-left">
            <div className="hm-bulk-count">
              <strong>{selectedIds.length}</strong> selected
            </div>
            <div className="hm-bulk-subtext">
              Flow: {filters.hierarchy_name || "—"}
            </div>
          </div>

          <div className="hm-bulk-toolbar-actions">
            <button
              className="hm-btn hm-btn-secondary small"
              onClick={handleSelectAllVisible}
            >
              {allVisibleSelected ? "Unselect All" : "Select All Visible"}
            </button>

            <button
              className="hm-btn hm-btn-secondary small"
              onClick={clearSelection}
            >
              Clear Selection
            </button>

            <button
              className="hm-btn hm-btn-primary small"
              onClick={openBulkModal}
            >
              Bulk Edit Selected
            </button>
          </div>
        </div>
      )}

      <div className="hm-main-layout">
        <div className="hm-table-card">
          <div className="hm-card-head">
            <div>
              <div className="hm-section-title">Hierarchy Rows</div>
              <div className="hm-section-subtitle">
                Select rows for bulk edit or click a row to edit it in the side
                panel.
              </div>
            </div>

            <div className="hm-table-meta">
              <span>{rows.length || 0} loaded rows</span>
              <span>{columns.length || 0} visible columns</span>
            </div>
          </div>

          {!filters.hierarchy_name ? (
            <div className="hm-empty-state">
              <div className="hm-empty-title">Select a flow to begin</div>
              <div className="hm-empty-subtitle">
                Choose a firm if needed, then pick a flow to load dynamic
                hierarchy rows.
              </div>
            </div>
          ) : loading ? (
            <div className="hm-empty-state">
              <div className="hm-empty-title">Loading hierarchy rows...</div>
            </div>
          ) : rows.length === 0 ? (
            <div className="hm-empty-state">
              <div className="hm-empty-title">No rows found</div>
              <div className="hm-empty-subtitle">
                Try changing the filters or clearing some inputs.
              </div>
            </div>
          ) : (
            <div className="hm-table-wrap">
              <table className="hm-table">
                <thead>
                  <tr>
                    <th className="sticky-col left-col checkbox-col">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={handleSelectAllVisible}
                      />
                    </th>
                    <th className="sticky-col left-col">Row</th>
                    {columns.map((col) => (
                      <th key={col}>{prettifyLabel(col)}</th>
                    ))}
                    <th>Created</th>
                    <th>Updated</th>
                    <th className="sticky-col right-col">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, index) => {
                    const isActive = selectedRow?._id === row._id;
                    const isSelected = selectedIds.includes(String(row._id));

                    return (
                      <tr
                        key={row._id || `${row.dealer}-${index}`}
                        className={`${isActive ? "active-row" : ""} ${
                          isSelected ? "checked-row" : ""
                        }`}
                        onClick={() => openDrawer(row)}
                      >
                        <td
                          className="sticky-col left-col checkbox-col"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRowSelection(row._id)}
                          />
                        </td>

                        <td className="sticky-col left-col">
                          <div className="hm-row-anchor">
                            <strong title={displayValue(row.dealer)}>
                              {displayValue(row.dealer)}
                            </strong>
                            <span>Row #{index + 1}</span>
                          </div>
                        </td>

                        {columns.map((col) => {
                          const val = row?.[col];
                          const isEmpty =
                            val === undefined || val === null || val === "";

                          return (
                            <td key={`${row._id}-${col}`}>
                              <div
                                className={`hm-cell-chip ${
                                  isEmpty ? "empty" : ""
                                }`}
                                title={displayValue(val)}
                              >
                                {isEmpty ? "Empty" : displayValue(val)}
                              </div>
                            </td>
                          );
                        })}

                        <td title={displayValue(row.createdAt)}>
                          {formatTableDate(row.createdAt)}
                        </td>
                        <td title={displayValue(row.updatedAt)}>
                          {formatTableDate(row.updatedAt)}
                        </td>

                        <td
                          className="sticky-col right-col"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="hm-btn hm-btn-ghost small"
                            onClick={() => openDrawer(row)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={`hm-drawer ${drawerOpen ? "open" : ""}`}>
          <div className="hm-drawer-head">
            <div>
              <div className="hm-drawer-title">Edit Mapping</div>
              <div className="hm-drawer-subtitle">
                {selectedRow?.hierarchy_name || "No row selected"}
              </div>
            </div>

            <button className="hm-drawer-close" onClick={closeDrawer}>
              ×
            </button>
          </div>

          {!drawerOpen || !selectedRow ? (
            <div className="hm-drawer-empty">
              <div className="hm-empty-title">No row selected</div>
              <div className="hm-empty-subtitle">
                Click a row from the table to inspect and edit its mapping.
              </div>
            </div>
          ) : (
            <>
              <div className="hm-drawer-body">
                <div className="hm-selected-summary">
                  <div className="summary-chip">
                    <span>Dealer</span>
                    <strong>{displayValue(selectedRow.dealer)}</strong>
                  </div>
                  <div className="summary-chip">
                    <span>Flow</span>
                    <strong>{displayValue(selectedRow.hierarchy_name)}</strong>
                  </div>
                  <div className="summary-chip">
                    <span>Changed Fields</span>
                    <strong>{changedFields.length}</strong>
                  </div>
                </div>

                <div className="hm-form-grid">
                  {columns.map((field) => {
                    const oldVal = String(selectedRow?.[field] ?? "");
                    const newVal = String(editForm?.[field] ?? "");
                    const hasChanged = oldVal !== newVal;

                    return (
                      <div className="hm-field" key={field}>
                        <label>
                          {prettifyLabel(field)}
                          {hasChanged && (
                            <span className="changed-badge">Changed</span>
                          )}
                        </label>

                        <input
                          value={editForm?.[field] ?? ""}
                          onChange={(e) =>
                            handleEditChange(field, e.target.value)
                          }
                          placeholder={`Enter ${prettifyLabel(field)}`}
                        />

                        <div className="hm-field-hint">
                          Previous: {displayValue(selectedRow?.[field])}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="hm-raw-card">
                  <div className="hm-raw-title">Row Snapshot</div>
                  <pre>{JSON.stringify(rawSnapshot || {}, null, 2)}</pre>
                </div>
              </div>

              <div className="hm-drawer-footer">
                <button
                  className="hm-btn hm-btn-secondary"
                  onClick={closeDrawer}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  className="hm-btn hm-btn-primary"
                  onClick={saveRow}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {bulkModalOpen && (
        <div className="hm-modal-overlay" onClick={closeBulkModal}>
          <div className="hm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hm-modal-head">
              <div>
                <div className="hm-modal-title">Bulk Edit Hierarchy Rows</div>
                <div className="hm-modal-subtitle">
                  {selectedIds.length} selected rows • {filters.hierarchy_name}
                </div>
              </div>

              <button className="hm-drawer-close" onClick={closeBulkModal}>
                ×
              </button>
            </div>

            <div className="hm-modal-body">
              <div className="hm-bulk-summary-grid">
                <div className="summary-chip">
                  <span>Selected Rows</span>
                  <strong>{selectedIds.length}</strong>
                </div>

                <div className="summary-chip">
                  <span>Flow</span>
                  <strong>{filters.hierarchy_name || "—"}</strong>
                </div>

                <div className="summary-chip">
                  <span>Fields Chosen</span>
                  <strong>{bulkEnabledFields.length}</strong>
                </div>
              </div>

              {!!bulkSelectedDealerPreview.length && (
                <div className="hm-inline-preview">
                  <div className="hm-inline-preview-label">Selected Dealers</div>
                  <div className="hm-inline-preview-values">
                    {bulkSelectedDealerPreview.map((item, idx) => (
                      <span key={`${item}-${idx}`} className="hm-applied-chip">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {bulkError ? <div className="hm-alert hm-alert-error">{bulkError}</div> : null}
              {bulkWarning ? (
                <div className="hm-alert hm-alert-warning">{bulkWarning}</div>
              ) : null}

              <div className="hm-bulk-editor">
                {columns.map((field) => {
                  const fieldState = bulkForm[field] || {
                    enabled: false,
                    value: "",
                    clear: false,
                  };

                  return (
                    <div className="hm-bulk-row" key={field}>
                      <div className="hm-bulk-row-left">
                        <label className="hm-bulk-checkbox">
                          <input
                            type="checkbox"
                            checked={!!fieldState.enabled}
                            onChange={(e) =>
                              handleBulkFieldToggle(field, e.target.checked)
                            }
                          />
                          <span>{prettifyLabel(field)}</span>
                        </label>
                      </div>

                      <div className="hm-bulk-row-center">
                        <input
                          value={fieldState.value || ""}
                          onChange={(e) =>
                            handleBulkValueChange(field, e.target.value)
                          }
                          disabled={!fieldState.enabled || fieldState.clear}
                          placeholder={`Set ${prettifyLabel(field)} value`}
                        />
                      </div>

                      <div className="hm-bulk-row-right">
                        <label className="hm-clear-toggle">
                          <input
                            type="checkbox"
                            checked={!!fieldState.clear}
                            onChange={(e) =>
                              handleBulkClearToggle(field, e.target.checked)
                            }
                            disabled={!fieldState.enabled}
                          />
                          <span>Clear</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="hm-modal-footer">
              <button
                className="hm-btn hm-btn-secondary"
                onClick={closeBulkModal}
                disabled={bulkSaving}
              >
                Cancel
              </button>

              <button
                className="hm-btn hm-btn-primary"
                onClick={handleBulkApply}
                disabled={bulkSaving}
              >
                {bulkSaving ? "Applying..." : "Apply Bulk Edit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}