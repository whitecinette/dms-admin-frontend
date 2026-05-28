import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import config from "../../config";
import "./style.scss";

const backendUrl = config.backend_url;

const typeOptions = ["text", "number", "boolean", "json"];
const DEFAULT_FINANCE_METHODS = ["Bajaj", "Homecredit", "TVS", "IDFC"];

const getAuthHeader = () => {
  const raw = localStorage.getItem("authToken") || "";
  if (!raw) return {};
  return { Authorization: raw.startsWith("Bearer ") ? raw : `Bearer ${raw}` };
};

const toKey = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const safeNum = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const prettyDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const buildDefaultFinanceRows = () => {
  return DEFAULT_FINANCE_METHODS.map((method) => ({ method_name: method, count: 0 }));
};

const mergeFinanceWithDefaults = (rows = []) => {
  const mappedRows = Array.isArray(rows)
    ? rows.map((item) => ({
        method_name: String(item?.method_name || item?.method_key || "").trim(),
        count: safeNum(item?.count, 0),
      }))
    : [];

  const rowByKey = new Map();
  mappedRows.forEach((item) => {
    const key = toKey(item.method_name);
    if (!key) return;
    rowByKey.set(key, item);
  });

  const merged = DEFAULT_FINANCE_METHODS.map((method) => {
    const key = toKey(method);
    const existing = rowByKey.get(key);
    return existing || { method_name: method, count: 0 };
  });

  mappedRows.forEach((item) => {
    const key = toKey(item.method_name);
    if (!key) return;
    if (DEFAULT_FINANCE_METHODS.some((method) => toKey(method) === key)) return;
    merged.push(item);
  });

  return merged;
};

const defaultBrandForm = () => ({
  brand_name: "",
  fixtures_available: false,
  sec_count: 0,
  notes: "",
  finance_sales: buildDefaultFinanceRows(),
  custom_properties: {},
});

export default function DealerShopProfilesPage() {
  const role = String(localStorage.getItem("role") || "").toLowerCase();
  const isAdminLike = ["admin", "super_admin"].includes(role);
  const isSuperAdmin = role === "super_admin";

  const [loadingDealers, setLoadingDealers] = useState(false);
  const [dealers, setDealers] = useState([]);
  const [dealersTotal, setDealersTotal] = useState(0);
  const [dealerSearch, setDealerSearch] = useState("");
  const [selectedDealerCode, setSelectedDealerCode] = useState("");
  const [metaLoading, setMetaLoading] = useState(false);
  const [firms, setFirms] = useState([]);
  const [flows, setFlows] = useState([]);
  const [flowMap, setFlowMap] = useState({});
  const [firmCodeFilter, setFirmCodeFilter] = useState("");
  const [flowFilter, setFlowFilter] = useState("");

  const [pageLoading, setPageLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingBrandKey, setDeletingBrandKey] = useState("");

  const [profileData, setProfileData] = useState(null);
  const [profileLogs, setProfileLogs] = useState([]);

  const [editingBrandKey, setEditingBrandKey] = useState("");
  const [brandForm, setBrandForm] = useState(defaultBrandForm());

  const [fieldConfigs, setFieldConfigs] = useState([]);
  const [fieldSavingKey, setFieldSavingKey] = useState("");
  const [newFieldForm, setNewFieldForm] = useState({ key: "", label: "", type: "text" });
  const [creatingField, setCreatingField] = useState(false);

  const [toast, setToast] = useState({ type: "", text: "" });

  const selectedDealer = useMemo(() => {
    return dealers.find((item) => item.code === selectedDealerCode) || null;
  }, [dealers, selectedDealerCode]);

  const brands = useMemo(() => {
    if (!profileData?.brands || !Array.isArray(profileData.brands)) return [];
    return profileData.brands;
  }, [profileData]);

  const visibleDealers = useMemo(() => {
    if (!dealerSearch.trim()) return dealers;
    const q = dealerSearch.trim().toLowerCase();
    return dealers.filter(
      (d) =>
        String(d?.name || "").toLowerCase().includes(q) ||
        String(d?.code || "").toLowerCase().includes(q)
    );
  }, [dealers, dealerSearch]);

  const activeFieldConfigs = useMemo(() => {
    return fieldConfigs
      .filter((field) => field.active)
      .sort((a, b) => safeNum(a.order, 0) - safeNum(b.order, 0));
  }, [fieldConfigs]);

  const availableFlowsForFirm = useMemo(() => {
    if (!firmCodeFilter) return flows;
    const selected = firms.find((f) => f.code === firmCodeFilter);
    const flowTypes = Array.isArray(selected?.flowTypes) ? selected.flowTypes : [];
    if (!flowTypes.length) return flows;
    return flows.filter((flow) => flowTypes.includes(flow.name));
  }, [firmCodeFilter, firms, flows]);

  const showToast = (type, text) => {
    setToast({ type, text });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => {
      setToast({ type: "", text: "" });
    }, 2600);
  };

  const fetchMeta = async () => {
    if (!isAdminLike) return;
    try {
      setMetaLoading(true);
      const res = await axios.get(`${backendUrl}/user/dealer-shop-profiles/meta`, {
        headers: getAuthHeader(),
      });
      const data = res.data?.data || {};
      const firmRows = Array.isArray(data.firms) ? data.firms : [];
      const flowRows = Array.isArray(data.flows) ? data.flows : [];

      setFirms(firmRows);
      setFlows(flowRows);
      setFlowMap(data.flowMap || {});

      if (!firmCodeFilter && firmRows.length) {
        const siddhaFirm =
          firmRows.find((firm) =>
            String(firm?.name || "")
              .trim()
              .toLowerCase()
              .includes("siddha")
          ) ||
          firmRows.find((firm) =>
            String(firm?.code || "")
              .trim()
              .toLowerCase()
              .includes("siddha")
          ) ||
          null;

        const nextFirmCode = siddhaFirm?.code || firmRows[0]?.code || "";
        if (nextFirmCode) setFirmCodeFilter(nextFirmCode);
      }

      if (!flowFilter && flowRows.length) {
        const preferredFlow =
          flowRows.find((flow) => flow?.name === "default_sales_flow")?.name ||
          flowRows[0]?.name ||
          "";
        if (preferredFlow) setFlowFilter(preferredFlow);
      }
    } catch (error) {
      console.error("Failed to fetch profile meta:", error);
      showToast("error", "Unable to load firm/flow filters.");
    } finally {
      setMetaLoading(false);
    }
  };

  const fetchDealers = async () => {
    try {
      setLoadingDealers(true);
      const res = await axios.get(`${backendUrl}/user/dealer-shop-profiles/dealers`, {
        params: {
          limit: 20000,
          firm_code: firmCodeFilter,
          hierarchy_name: flowFilter,
        },
        headers: getAuthHeader(),
      });

      const apiRows = Array.isArray(res.data?.dealers) ? res.data.dealers : [];
      setDealers(apiRows);
      setDealersTotal(Number(res.data?.total || apiRows.length || 0));

      if (!selectedDealerCode && apiRows[0]?.code) {
        setSelectedDealerCode(apiRows[0].code);
      } else if (selectedDealerCode && !apiRows.some((d) => d.code === selectedDealerCode)) {
        setSelectedDealerCode(apiRows[0]?.code || "");
      }
    } catch (error) {
      console.error("Failed to fetch dealers:", error);
      showToast("error", "Unable to load dealers.");
    } finally {
      setLoadingDealers(false);
    }
  };

  const fetchFieldConfigs = async () => {
    try {
      const res = await axios.get(`${backendUrl}/user/dealer-shop-profiles/field-configs`, {
        params: { include_inactive: true },
        headers: getAuthHeader(),
      });

      setFieldConfigs(Array.isArray(res.data?.rows) ? res.data.rows : []);
    } catch (error) {
      console.error("Failed to fetch field configs:", error);
      showToast("error", "Unable to load property fields.");
    }
  };

  const fetchDealerProfile = async (dealerCode) => {
    if (!dealerCode) return;

    try {
      setPageLoading(true);

      const res = await axios.get(`${backendUrl}/user/dealer-shop-profiles/${dealerCode}`, {
        headers: getAuthHeader(),
      });

      setProfileData(res.data?.data || null);
      setProfileLogs(Array.isArray(res.data?.logs) ? res.data.logs : []);
      setEditingBrandKey("");
      setBrandForm(defaultBrandForm());
    } catch (error) {
      console.error("Failed to fetch dealer profile:", error);
      showToast("error", error?.response?.data?.message || "Unable to load dealer profile.");
      setProfileData(null);
      setProfileLogs([]);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    fetchMeta();
    fetchFieldConfigs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchDealers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmCodeFilter, flowFilter]);

  useEffect(() => {
    if (selectedDealerCode) {
      fetchDealerProfile(selectedDealerCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDealerCode]);

  useEffect(() => {
    if (!availableFlowsForFirm.length) {
      if (flowFilter) setFlowFilter("");
      return;
    }

    if (flowFilter && availableFlowsForFirm.some((f) => f.name === flowFilter)) return;

    const preferredFlow =
      availableFlowsForFirm.find((flow) => flow?.name === "default_sales_flow")?.name ||
      availableFlowsForFirm[0]?.name ||
      "";
    setFlowFilter(preferredFlow);
  }, [availableFlowsForFirm, flowFilter]);

  const startAddBrand = () => {
    setEditingBrandKey("");
    const custom = {};
    activeFieldConfigs.forEach((field) => {
      custom[field.key] = field.type === "boolean" ? false : "";
    });

    setBrandForm({
      ...defaultBrandForm(),
      custom_properties: custom,
    });
  };

  const startEditBrand = (brand) => {
    const custom = {};

    activeFieldConfigs.forEach((field) => {
      custom[field.key] = field.type === "boolean" ? false : "";
    });

    (brand.custom_properties || []).forEach((item) => {
      if (item?.key) {
        custom[item.key] = item?.value ?? "";
      }
    });

    setEditingBrandKey(brand.brand_key || "");
    setBrandForm({
      brand_name: brand.brand_name || "",
      fixtures_available: Boolean(brand.fixtures_available ?? safeNum(brand.fixtures_count, 0) > 0),
      sec_count: safeNum(brand.sec_count, 0),
      notes: brand.notes || "",
      finance_sales: mergeFinanceWithDefaults(
        Array.isArray(brand.finance_sales) && brand.finance_sales.length
          ? brand.finance_sales.map((item) => ({
              method_name: item.method_name || item.method_key || "",
              count: safeNum(item.count, 0),
            }))
          : []
      ),
      custom_properties: custom,
    });
  };

  const updateFinanceRow = (index, patch) => {
    setBrandForm((prev) => {
      const next = [...prev.finance_sales];
      next[index] = { ...next[index], ...patch };
      return { ...prev, finance_sales: next };
    });
  };

  const addFinanceMethod = () => {
    setBrandForm((prev) => ({
      ...prev,
      finance_sales: [...prev.finance_sales, { method_name: "", count: 0 }],
    }));
  };

  const removeFinanceMethod = (index) => {
    setBrandForm((prev) => ({
      ...prev,
      finance_sales: prev.finance_sales.filter((_, idx) => idx !== index),
    }));
  };

  const handleSaveBrand = async () => {
    if (!selectedDealerCode) {
      showToast("error", "Please select a dealer first.");
      return;
    }

    const brandName = String(brandForm.brand_name || "").trim();
    const brandKey = toKey(editingBrandKey || brandName);

    if (!brandKey || !brandName) {
      showToast("error", "Brand name is required.");
      return;
    }

    const financeSales = (brandForm.finance_sales || [])
      .map((item) => ({
        method_name: String(item.method_name || "").trim(),
        count: safeNum(item.count, 0),
      }))
      .filter((item) => item.method_name);

    const customProperties = activeFieldConfigs.map((field) => ({
      key: field.key,
      label: field.label,
      type: field.type,
      value: brandForm.custom_properties?.[field.key],
    }));

    try {
      setSaving(true);
      await axios.put(
        `${backendUrl}/user/dealer-shop-profiles/${selectedDealerCode}/brands/${brandKey}`,
        {
          brand_name: brandName,
          fixtures_available: Boolean(brandForm.fixtures_available),
          fixtures_count: brandForm.fixtures_available ? 1 : 0,
          sec_count: safeNum(brandForm.sec_count, 0),
          notes: brandForm.notes || "",
          finance_sales: financeSales,
          custom_properties: customProperties,
        },
        {
          headers: getAuthHeader(),
        }
      );

      showToast("success", "Dealer brand profile saved.");
      await fetchDealerProfile(selectedDealerCode);
    } catch (error) {
      console.error("Failed to save dealer brand profile:", error);
      showToast("error", error?.response?.data?.message || "Failed to save brand profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBrand = async (brandKey) => {
    if (!isSuperAdmin) return;
    if (!selectedDealerCode || !brandKey) return;

    const confirmDelete = window.confirm(
      `Delete brand profile "${brandKey}" for dealer ${selectedDealerCode}?`
    );

    if (!confirmDelete) return;

    try {
      setDeletingBrandKey(brandKey);
      await axios.delete(
        `${backendUrl}/user/dealer-shop-profiles/${selectedDealerCode}/brands/${brandKey}`,
        {
          headers: getAuthHeader(),
        }
      );

      showToast("success", "Brand profile deleted.");
      await fetchDealerProfile(selectedDealerCode);
    } catch (error) {
      console.error("Failed to delete brand profile:", error);
      showToast("error", error?.response?.data?.message || "Failed to delete brand profile.");
    } finally {
      setDeletingBrandKey("");
    }
  };

  const handleCreateField = async () => {
    if (!isAdminLike) return;

    const key = toKey(newFieldForm.key || newFieldForm.label);
    const label = String(newFieldForm.label || "").trim();

    if (!key || !label) {
      showToast("error", "Field key and label are required.");
      return;
    }

    try {
      setCreatingField(true);
      await axios.post(
        `${backendUrl}/user/dealer-shop-profiles/field-configs`,
        {
          key,
          label,
          type: newFieldForm.type,
          required: false,
          active: true,
          order: fieldConfigs.length + 1,
        },
        { headers: getAuthHeader() }
      );

      setNewFieldForm({ key: "", label: "", type: "text" });
      showToast("success", "Property field created.");
      await fetchFieldConfigs();
    } catch (error) {
      console.error("Failed to create field:", error);
      showToast("error", error?.response?.data?.message || "Unable to create field.");
    } finally {
      setCreatingField(false);
    }
  };

  const handleUpdateField = async (field, patch) => {
    if (!isAdminLike) return;

    try {
      setFieldSavingKey(field.key);
      await axios.put(
        `${backendUrl}/user/dealer-shop-profiles/field-configs/${field.key}`,
        {
          label: patch.label ?? field.label,
          type: patch.type ?? field.type,
          required: patch.required ?? field.required,
          active: patch.active ?? field.active,
          order: patch.order ?? field.order,
        },
        { headers: getAuthHeader() }
      );

      await fetchFieldConfigs();
      showToast("success", "Property field updated.");
    } catch (error) {
      console.error("Failed to update field:", error);
      showToast("error", error?.response?.data?.message || "Unable to update field.");
    } finally {
      setFieldSavingKey("");
    }
  };

  const handleDeleteField = async (field) => {
    if (!isSuperAdmin) return;

    const yes = window.confirm(`Delete property field "${field.label}"?`);
    if (!yes) return;

    try {
      setFieldSavingKey(field.key);
      await axios.delete(`${backendUrl}/user/dealer-shop-profiles/field-configs/${field.key}`, {
        headers: getAuthHeader(),
      });

      showToast("success", "Property field deleted.");
      await fetchFieldConfigs();
    } catch (error) {
      console.error("Failed to delete field:", error);
      showToast("error", error?.response?.data?.message || "Unable to delete field.");
    } finally {
      setFieldSavingKey("");
    }
  };

  return (
    <div className="dealer-shop-profiles-page">
      <div className="dsp-hero">
        <div>
          <h1>Dealer Brand Profile</h1>
          <p>
            One unique dealer entry, with brand-wise shop properties like fixtures, SEC count,
            finance-method sales split, and configurable property fields.
          </p>
        </div>

        <div className="dsp-badges">
          <span>Role: {role || "unknown"}</span>
          <span>Dealers: {dealersTotal}</span>
          <span>Brands: {brands.length}</span>
        </div>
      </div>

      {isAdminLike ? (
        <div className="dsp-card dsp-filters-bar">
          <div className="dsp-card-head">
            <h3>Scope Filters</h3>
            <button className="ghost-btn" onClick={fetchMeta} disabled={metaLoading}>
              {metaLoading ? "Refreshing..." : "Refresh Filters"}
            </button>
          </div>
          <div className="filters-grid">
            <label>
              Firm
              <select
                className="dsp-input"
                value={firmCodeFilter}
                onChange={(e) => {
                  const nextFirmCode = e.target.value;
                  setFirmCodeFilter(nextFirmCode);

                  const selectedFirm = firms.find((firm) => firm.code === nextFirmCode);
                  const flowTypes = Array.isArray(selectedFirm?.flowTypes) ? selectedFirm.flowTypes : [];
                  const nextFlowRows = flowTypes.length
                    ? flows.filter((flow) => flowTypes.includes(flow.name))
                    : flows;

                  if (nextFlowRows.some((flow) => flow.name === flowFilter)) return;
                  const preferredFlow =
                    nextFlowRows.find((flow) => flow.name === "default_sales_flow")?.name ||
                    nextFlowRows[0]?.name ||
                    "";
                  setFlowFilter(preferredFlow);
                }}
              >
                <option value="">All Firms</option>
                {firms.map((firm) => (
                  <option key={firm.code} value={firm.code}>
                    {firm.name} ({firm.code})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Flow
              <select
                className="dsp-input"
                value={flowFilter}
                onChange={(e) => setFlowFilter(e.target.value)}
              >
                <option value="">All Flows</option>
                {availableFlowsForFirm.map((flow) => (
                  <option key={flow.name} value={flow.name}>
                    {flow.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flow-preview">
              <span>Flow Columns</span>
              <strong>
                {flowFilter && flowMap[flowFilter]?.length
                  ? flowMap[flowFilter].join(" → ")
                  : "Select a flow to preview hierarchy columns"}
              </strong>
            </div>
          </div>
        </div>
      ) : null}

      {toast.text ? (
        <div className={`dsp-toast ${toast.type === "error" ? "error" : "success"}`}>
          {toast.text}
        </div>
      ) : null}

      <div className="dsp-grid">
        <section className="dsp-card dsp-dealer-selector">
          <div className="dsp-card-head">
            <h3>Select Dealer</h3>
            <button className="ghost-btn" onClick={fetchDealers} disabled={loadingDealers}>
              {loadingDealers ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <input
            value={dealerSearch}
            onChange={(e) => setDealerSearch(e.target.value)}
            placeholder="Search dealer by code or name"
            className="dsp-input"
          />

          <div className="dsp-dealer-list">
            {visibleDealers.map((dealer) => (
              <button
                type="button"
                key={dealer.code}
                className={`dealer-item ${selectedDealerCode === dealer.code ? "active" : ""}`}
                onClick={() => setSelectedDealerCode(dealer.code)}
              >
                <strong>{dealer.name || dealer.code}</strong>
                <span>{dealer.code}</span>
              </button>
            ))}
            {!visibleDealers.length ? <p className="empty">No dealers found.</p> : null}
          </div>
        </section>

        <section className="dsp-card dsp-main-card">
          <div className="dsp-card-head">
            <div>
              <h3>Brand / Shop Data</h3>
              <p>
                {selectedDealer
                  ? `${selectedDealer.name || selectedDealer.code} (${selectedDealer.code})`
                  : "Select a dealer to view and edit profiles."}
              </p>
            </div>
            <button className="primary-btn" onClick={startAddBrand} disabled={!selectedDealerCode}>
              Add Brand Profile
            </button>
          </div>

          {pageLoading ? <p className="empty">Loading profile...</p> : null}

          {!pageLoading && selectedDealerCode ? (
            <>
              <div className="brand-cards">
                {brands.map((brand) => (
                  <div className="brand-card" key={brand.brand_key}>
                    <div className="brand-card-top">
                      <h4>{brand.brand_name}</h4>
                      <span>{brand.brand_key}</span>
                    </div>

                    <div className="brand-stats">
                      <span>
                        Fixtures:{" "}
                        {Boolean(brand.fixtures_available ?? safeNum(brand.fixtures_count, 0) > 0)
                          ? "Yes"
                          : "No"}
                      </span>
                      <span>SECs: {safeNum(brand.sec_count, 0)}</span>
                    </div>

                    <div className="finance-chips">
                      {(brand.finance_sales || []).map((item) => (
                        <span key={`${brand.brand_key}-${item.method_key}`}>
                          {item.method_name}: {safeNum(item.count, 0)}
                        </span>
                      ))}
                    </div>

                    <div className="brand-actions">
                      <button className="secondary-btn" onClick={() => startEditBrand(brand)}>
                        Edit
                      </button>
                      {isSuperAdmin ? (
                        <button
                          className="danger-btn"
                          onClick={() => handleDeleteBrand(brand.brand_key)}
                          disabled={deletingBrandKey === brand.brand_key}
                        >
                          {deletingBrandKey === brand.brand_key ? "Deleting..." : "Delete"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
                {!brands.length ? (
                  <p className="empty">
                    No brand profiles added for this dealer yet. Click "Add Brand Profile".
                  </p>
                ) : null}
              </div>

              <div className="editor-section">
                <h4>{editingBrandKey ? "Edit Brand Profile" : "Create / Update Brand Profile"}</h4>

                <div className="form-grid">
                  <label>
                    Brand Name
                    <input
                      className="dsp-input"
                      value={brandForm.brand_name}
                      onChange={(e) =>
                        setBrandForm((prev) => ({ ...prev, brand_name: e.target.value }))
                      }
                      placeholder="e.g. Vivo"
                    />
                  </label>

                  <label>
                    Fixtures Available
                    <select
                      className="dsp-input"
                      value={brandForm.fixtures_available ? "yes" : "no"}
                      onChange={(e) =>
                        setBrandForm((prev) => ({
                          ...prev,
                          fixtures_available: e.target.value === "yes",
                        }))
                      }
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </label>

                  <label>
                    SEC Count
                    <input
                      className="dsp-input"
                      type="number"
                      min="0"
                      value={brandForm.sec_count}
                      onChange={(e) =>
                        setBrandForm((prev) => ({ ...prev, sec_count: safeNum(e.target.value, 0) }))
                      }
                    />
                  </label>
                </div>

                <label>
                  Notes
                  <textarea
                    className="dsp-input"
                    value={brandForm.notes}
                    onChange={(e) => setBrandForm((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    placeholder="Optional shop notes"
                  />
                </label>

                <div className="nested-card">
                  <div className="nested-card-head">
                    <h5>Finance Method Split</h5>
                    <button className="ghost-btn" onClick={addFinanceMethod}>
                      Add Method
                    </button>
                  </div>

                  <div className="finance-grid">
                    {(brandForm.finance_sales || []).map((item, idx) => (
                      <div className="finance-row" key={`finance-${idx}`}>
                        <input
                          className="dsp-input"
                          value={item.method_name}
                          onChange={(e) => updateFinanceRow(idx, { method_name: e.target.value })}
                          placeholder="Method name"
                        />
                        <input
                          className="dsp-input"
                          type="number"
                          min="0"
                          value={item.count}
                          onChange={(e) => updateFinanceRow(idx, { count: safeNum(e.target.value, 0) })}
                          placeholder="Count"
                        />
                        <button className="danger-btn subtle" onClick={() => removeFinanceMethod(idx)}>
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="nested-card">
                  <h5>Custom Properties</h5>
                  {!activeFieldConfigs.length ? (
                    <p className="empty">No custom property fields active.</p>
                  ) : (
                    <div className="form-grid custom-grid">
                      {activeFieldConfigs.map((field) => {
                        const value = brandForm.custom_properties?.[field.key];

                        return (
                          <label key={field.key}>
                            {field.label}
                            {field.type === "boolean" ? (
                              <select
                                className="dsp-input"
                                value={value ? "true" : "false"}
                                onChange={(e) =>
                                  setBrandForm((prev) => ({
                                    ...prev,
                                    custom_properties: {
                                      ...prev.custom_properties,
                                      [field.key]: e.target.value === "true",
                                    },
                                  }))
                                }
                              >
                                <option value="true">True</option>
                                <option value="false">False</option>
                              </select>
                            ) : field.type === "number" ? (
                              <input
                                className="dsp-input"
                                type="number"
                                value={value ?? 0}
                                onChange={(e) =>
                                  setBrandForm((prev) => ({
                                    ...prev,
                                    custom_properties: {
                                      ...prev.custom_properties,
                                      [field.key]: safeNum(e.target.value, 0),
                                    },
                                  }))
                                }
                              />
                            ) : field.type === "json" ? (
                              <textarea
                                className="dsp-input"
                                rows={3}
                                value={typeof value === "string" ? value : JSON.stringify(value ?? {}, null, 2)}
                                onChange={(e) =>
                                  setBrandForm((prev) => ({
                                    ...prev,
                                    custom_properties: {
                                      ...prev.custom_properties,
                                      [field.key]: e.target.value,
                                    },
                                  }))
                                }
                                placeholder='{"key":"value"}'
                              />
                            ) : (
                              <input
                                className="dsp-input"
                                value={value ?? ""}
                                onChange={(e) =>
                                  setBrandForm((prev) => ({
                                    ...prev,
                                    custom_properties: {
                                      ...prev.custom_properties,
                                      [field.key]: e.target.value,
                                    },
                                  }))
                                }
                              />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="editor-actions">
                  <button className="primary-btn" onClick={handleSaveBrand} disabled={saving}>
                    {saving ? "Saving..." : "Save Brand Profile"}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </section>

        <section className="dsp-card dsp-config-card">
          <div className="dsp-card-head">
            <div>
              <h3>Property Field Manager</h3>
              <p>Admins can edit fields. Super admin can delete fields.</p>
            </div>
          </div>

          {isAdminLike ? (
            <div className="new-field-form">
              <input
                className="dsp-input"
                placeholder="Field Label"
                value={newFieldForm.label}
                onChange={(e) =>
                  setNewFieldForm((prev) => ({
                    ...prev,
                    label: e.target.value,
                    key: toKey(prev.key || e.target.value),
                  }))
                }
              />
              <input
                className="dsp-input"
                placeholder="field_key"
                value={newFieldForm.key}
                onChange={(e) =>
                  setNewFieldForm((prev) => ({ ...prev, key: toKey(e.target.value) }))
                }
              />
              <select
                className="dsp-input"
                value={newFieldForm.type}
                onChange={(e) => setNewFieldForm((prev) => ({ ...prev, type: e.target.value }))}
              >
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <button className="primary-btn" onClick={handleCreateField} disabled={creatingField}>
                {creatingField ? "Creating..." : "Add Field"}
              </button>
            </div>
          ) : (
            <p className="empty">You do not have permission to edit field configs.</p>
          )}

          <div className="fields-list">
            {fieldConfigs.map((field) => (
              <div className="field-card" key={field.key}>
                <div>
                  <strong>{field.label}</strong>
                  <p>
                    <code>{field.key}</code> • {field.type} • {field.required ? "Required" : "Optional"} •{" "}
                    {field.active ? "Active" : "Inactive"}
                  </p>
                </div>

                {isAdminLike ? (
                  <div className="field-actions">
                    <button
                      className="secondary-btn small"
                      onClick={() =>
                        handleUpdateField(field, {
                          active: !field.active,
                        })
                      }
                      disabled={fieldSavingKey === field.key}
                    >
                      {field.active ? "Deactivate" : "Activate"}
                    </button>

                    <button
                      className="secondary-btn small"
                      onClick={() =>
                        handleUpdateField(field, {
                          required: !field.required,
                        })
                      }
                      disabled={fieldSavingKey === field.key}
                    >
                      {field.required ? "Mark Optional" : "Mark Required"}
                    </button>

                    {isSuperAdmin ? (
                      <button
                        className="danger-btn small"
                        onClick={() => handleDeleteField(field)}
                        disabled={fieldSavingKey === field.key}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
            {!fieldConfigs.length ? <p className="empty">No property fields configured.</p> : null}
          </div>
        </section>

        <section className="dsp-card dsp-log-card">
          <div className="dsp-card-head">
            <h3>Change Logs</h3>
          </div>

          <div className="logs-list">
            {profileLogs.map((log) => (
              <div className="log-row" key={log.id}>
                <div className="log-top">
                  <strong>{log.updatedBy?.name || log.updatedBy?.code || "Unknown"}</strong>
                  <span>{prettyDate(log.createdAt)}</span>
                </div>
                <p>{log.updateReason || "Update"}</p>
              </div>
            ))}
            {!profileLogs.length ? (
              <p className="empty">No changes logged yet for this dealer profile.</p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
