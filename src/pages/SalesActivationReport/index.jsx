import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaCheck,
  FaDownload,
  FaFilter,
  FaLayerGroup,
  FaSyncAlt,
  FaTimes,
} from "react-icons/fa";
import config from "../../config";
import "./style.scss";

const backendUrl = config.backend_url;
const FLOW_NAME = "default_sales_flow";
const ACTOR_POSITION_KEYS = ["smd", "zsm", "asm", "mdd", "tse", "so", "dealer"];
const DEFAULT_GROUP_OPTIONS = [
  { label: "Product Category", value: "product_category" },
  { label: "Actor", value: "actor" },
  { label: "Zone", value: "zone" },
  { label: "District", value: "district" },
  { label: "Town", value: "town" },
  { label: "Dealer Category", value: "category" },
  { label: "Top Outlet", value: "top_outlet" },
];
const DEFAULT_PRODUCT_CATEGORIES = [
  { label: "4G", value: "4G" },
  { label: "5G", value: "5G" },
  { label: "Flagship 5G", value: "Flagship 5G" },
  { label: "Innovative 5G", value: "Innovative 5G" },
  { label: "Tab", value: "Tab" },
  { label: "Wearable", value: "Wearable" },
];
const DEALER_FILTER_TYPES = [
  { key: "zone", label: "Zone" },
  { key: "district", label: "District" },
  { key: "town", label: "Town" },
  { key: "category", label: "Dealer Category" },
  { key: "top_outlet", label: "Top Outlet" },
];
const PRODUCT_FILTER_TAB = "product_category";
const PRODUCT_CATEGORY_ORDER = DEFAULT_PRODUCT_CATEGORIES.map((item) => item.value);

const authHeaders = () => ({
  Authorization: localStorage.getItem("authToken"),
});

const formatDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDatePreset = (preset) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (preset === "today") {
    const value = formatDateInputValue(today);
    return { start: value, end: value };
  }

  if (preset === "yesterday") {
    const value = formatDateInputValue(yesterday);
    return { start: value, end: value };
  }

  if (preset === "this_month") {
    return {
      start: formatDateInputValue(new Date(today.getFullYear(), today.getMonth(), 1)),
      end: formatDateInputValue(today),
    };
  }

  if (preset === "last_month") {
    return {
      start: formatDateInputValue(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      end: formatDateInputValue(new Date(today.getFullYear(), today.getMonth(), 0)),
    };
  }

  return { start: "", end: "" };
};

const normalizeOption = (item) => {
  if (!item) return null;
  if (typeof item === "string") return { label: item, value: item };
  const value = item.value ?? item.code ?? item.name ?? item.label;
  if (value === undefined || value === null || value === "") return null;
  return {
    ...item,
    label: item.label || item.name || String(value),
    value,
  };
};

const isActorTab = (tabKey) => ACTOR_POSITION_KEYS.includes(tabKey);

const parseNumericValue = (value) => {
  if (typeof value === "number") return value;
  const raw = String(value ?? "")
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .trim()
    .toLowerCase();
  const parsed = Number(raw.replace(/cr|lac|lakh|k|%/g, "").trim());
  if (!Number.isFinite(parsed)) return NaN;
  if (raw.includes("cr")) return parsed * 10000000;
  if (raw.includes("lac") || raw.includes("lakh")) return parsed * 100000;
  if (raw.includes("k")) return parsed * 1000;
  return parsed;
};

const formatValue = (value, metric) => {
  if (value === null || value === undefined || value === "") return "-";
  const num = parseNumericValue(value);
  if (!Number.isFinite(num)) return String(value);

  if (metric === "value") {
    const abs = Math.abs(num);
    const sign = num < 0 ? "-" : "";
    if (abs >= 10000000) return `${sign}₹ ${(abs / 10000000).toFixed(2).replace(/\.00$/, "")} Cr`;
    if (abs >= 100000) return `${sign}₹ ${(abs / 100000).toFixed(2).replace(/\.00$/, "")} Lac`;
    return `${sign}₹ ${abs.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  }

  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(2).replace(/\.00$/, "")} K`;
  return `${sign}${abs.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};

const formatCell = (value, column, metric) => {
  if (String(column).includes("%")) {
    const num = Number(value);
    return Number.isFinite(num) ? `${num.toFixed(2)}%` : "-";
  }
  return formatValue(value, metric);
};

const getGrowthClass = (value, column) => {
  if (column !== "G/D%") return "";
  const num = Number(value);
  if (!Number.isFinite(num) || num === 0) return "neutral-growth";
  return num > 0 ? "positive" : "negative";
};

const getComparableColumns = (columns = []) =>
  columns.filter((column) => !["Group", "Product Category", "Metric", "G/D%", "ExpAch", "WFM"].includes(column));

const getCellStyle = (row, column) => {
  if (["Group", "Product Category", "Metric", "G/D%", "ExpAch", "WFM"].includes(column)) {
    return {};
  }

  const comparable = getComparableColumns(Object.keys(row || {}));
  const values = comparable
    .map((key) => Number(row?.[key]))
    .filter((value) => Number.isFinite(value));
  const value = Number(row?.[column]);

  if (!values.length || !Number.isFinite(value)) return {};
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return {};

  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return {
    background: `rgba(37, 99, 235, ${0.04 + ratio * 0.1})`,
    fontWeight: ratio > 0.72 ? 700 : 500,
  };
};

const escapeCsvValue = (value) => {
  const stringValue = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(stringValue)
    ? `"${stringValue.replace(/"/g, '""')}"`
    : stringValue;
};

const LoadingRows = ({ columns }) =>
  Array.from({ length: 7 }).map((_, index) => (
    <tr key={index} className="activation-skeleton-row">
      {columns.map((column) => (
        <td key={column}>
          <span />
        </td>
      ))}
    </tr>
  ));

function SalesActivationReport() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [brand, setBrand] = useState("");
  const [segment, setSegment] = useState("");
  const [metric, setMetric] = useState("volume");
  const [groupBy, setGroupBy] = useState("product_category");
  const [groupPosition, setGroupPosition] = useState("");
  const [groupOptions, setGroupOptions] = useState(DEFAULT_GROUP_OPTIONS);
  const [actorPositions, setActorPositions] = useState([]);
  const [productCategoryOptions, setProductCategoryOptions] = useState(DEFAULT_PRODUCT_CATEGORIES);
  const [selectedProductCategories, setSelectedProductCategories] = useState([]);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState(PRODUCT_FILTER_TAB);
  const [searchText, setSearchText] = useState("");
  const [loadingFilterOptions, setLoadingFilterOptions] = useState(false);
  const [actorOptionsMap, setActorOptionsMap] = useState({});
  const [dealerOptionsMap, setDealerOptionsMap] = useState({});
  const [selectedActorFilters, setSelectedActorFilters] = useState({});
  const [selectedDealerFilters, setSelectedDealerFilters] = useState({
    zone: [],
    district: [],
    town: [],
    category: [],
    top_outlet: [],
  });
  const [report, setReport] = useState({
    columns: [],
    data: [],
    meta: null,
    period: null,
  });
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState("");
  const panelRef = useRef(null);

  const actorPositionOrder = useMemo(
    () => actorPositions.map((item) => item.value).filter(Boolean),
    [actorPositions]
  );

  const buildSubordinateFilters = (
    source = selectedActorFilters,
    { upToPosition = null } = {}
  ) => {
    const filters = {};
    const orderedPositions = actorPositionOrder.length
      ? actorPositionOrder
      : ACTOR_POSITION_KEYS;

    for (const position of orderedPositions) {
      if (upToPosition && position === upToPosition) break;
      const codes = (source[position] || []).map((item) => item.code || item.value).filter(Boolean);
      if (codes.length) filters[position] = codes;
    }

    return filters;
  };

  const buildDealerFilters = (
    source = selectedDealerFilters,
    { excludeType = null } = {}
  ) => {
    const filters = {};

    Object.entries(source).forEach(([key, selected]) => {
      if (key === excludeType || !selected?.length) return;
      const values = selected
        .map((item) => item.value)
        .filter((value) => value !== undefined && value !== null && value !== "");
      if (values.length) filters[key] = values;
    });

    return filters;
  };

  const requestBody = () => ({
    flow_name: FLOW_NAME,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    filters: {
      metric,
      group_by: groupBy,
      ...(groupBy === "actor" ? { group_position: groupPosition } : {}),
      ...(brand ? { brand } : {}),
      ...(segment ? { segment } : {}),
      ...(selectedProductCategories.length
        ? { product_categories: selectedProductCategories.map((item) => item.value) }
        : {}),
    },
    subordinate_filters: buildSubordinateFilters(),
    dealer_filters: buildDealerFilters(),
  });

  const totalSelectedFiltersCount = useMemo(() => {
    const actorCount = Object.values(selectedActorFilters).reduce(
      (sum, values) => sum + (values?.length || 0),
      0
    );
    const dealerCount = Object.values(selectedDealerFilters).reduce(
      (sum, values) => sum + (values?.length || 0),
      0
    );
    return actorCount + dealerCount + selectedProductCategories.length;
  }, [selectedActorFilters, selectedDealerFilters, selectedProductCategories]);

  const currentTabOptions = useMemo(() => {
    if (activeFilterTab === PRODUCT_FILTER_TAB) return productCategoryOptions;
    if (isActorTab(activeFilterTab)) return actorOptionsMap[activeFilterTab] || [];
    return dealerOptionsMap[activeFilterTab] || [];
  }, [activeFilterTab, actorOptionsMap, dealerOptionsMap, productCategoryOptions]);

  const currentTabSelected = useMemo(() => {
    if (activeFilterTab === PRODUCT_FILTER_TAB) return selectedProductCategories;
    if (isActorTab(activeFilterTab)) return selectedActorFilters[activeFilterTab] || [];
    return selectedDealerFilters[activeFilterTab] || [];
  }, [activeFilterTab, selectedActorFilters, selectedDealerFilters, selectedProductCategories]);

  const filteredCurrentOptions = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return currentTabOptions;
    return currentTabOptions.filter((item) =>
      `${item.label || ""} ${item.name || ""} ${item.code || ""} ${item.value || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [currentTabOptions, searchText]);

  const firstDataColumn = report.columns[0] || (groupBy === "product_category" ? "Product Category" : "Group");
  const displayColumns = report.columns.length ? report.columns : [firstDataColumn, "Metric", "MTD", "LMTD", "G/D%"];

  const fetchGroupingOptions = async () => {
    try {
      const res = await axios.get(`${backendUrl}/sales-activation-report/grouping-options`, {
        headers: authHeaders(),
      });
      setGroupOptions(res.data?.groupByOptions || DEFAULT_GROUP_OPTIONS);
      setActorPositions(res.data?.actorPositions || []);
      setProductCategoryOptions(res.data?.productCategoryOptions || DEFAULT_PRODUCT_CATEGORIES);
      if (!groupPosition && res.data?.actorPositions?.[0]?.value) {
        setGroupPosition(res.data.actorPositions[0].value);
      }
    } catch (err) {
      console.error("Sales activation grouping options failed:", err);
    }
  };

  const fetchFilterValues = async (type, position = "") => {
    if (type === PRODUCT_FILTER_TAB) return;
    setLoadingFilterOptions(true);

    try {
      const params = {
        type: isActorTab(type) ? "actor" : type,
        position: isActorTab(type) ? type : position,
        flow_name: FLOW_NAME,
        subordinate_filters: JSON.stringify(
          isActorTab(type)
            ? buildSubordinateFilters(selectedActorFilters, { upToPosition: type })
            : buildSubordinateFilters()
        ),
        dealer_filters: JSON.stringify(
          isActorTab(type)
            ? buildDealerFilters()
            : buildDealerFilters(selectedDealerFilters, { excludeType: type })
        ),
      };

      const res = await axios.get(`${backendUrl}/sales-activation-report/filter-values`, {
        params,
        headers: authHeaders(),
      });
      const values = (res.data?.values || []).map(normalizeOption).filter(Boolean);

      if (isActorTab(type)) {
        setActorOptionsMap((old) => ({ ...old, [type]: values }));
      } else {
        setDealerOptionsMap((old) => ({ ...old, [type]: values }));
      }
    } catch (err) {
      console.error("Sales activation filter values failed:", err);
    } finally {
      setLoadingFilterOptions(false);
    }
  };

  const fetchReport = async () => {
    setLoadingReport(true);
    setError("");

    try {
      const res = await axios.post(
        `${backendUrl}/sales-activation-report/report`,
        requestBody(),
        { headers: authHeaders() }
      );
      setReport({
        columns: res.data?.columns || [],
        data: res.data?.data || [],
        meta: res.data?.meta || null,
        period: res.data?.period || null,
      });
    } catch (err) {
      console.error("Sales activation report failed:", err);
      setError(err.response?.data?.message || err.message || "Failed to load report");
      setReport({ columns: [], data: [], meta: null, period: null });
    } finally {
      setLoadingReport(false);
    }
  };

  const applyDatePreset = (preset) => {
    const next = getDatePreset(preset);
    setStartDate(next.start);
    setEndDate(next.end);
  };

  const toggleSelection = (type, item) => {
    if (type === PRODUCT_FILTER_TAB) {
      setSelectedProductCategories((old) => {
        const exists = old.some((selected) => selected.value === item.value);
        const next = exists
          ? old.filter((selected) => selected.value !== item.value)
          : [...old, item];
        return next.sort(
          (a, b) =>
            PRODUCT_CATEGORY_ORDER.indexOf(a.value) - PRODUCT_CATEGORY_ORDER.indexOf(b.value)
        );
      });
      return;
    }

    if (isActorTab(type)) {
      const orderedPositions = actorPositionOrder.length ? actorPositionOrder : ACTOR_POSITION_KEYS;
      const positionIndex = orderedPositions.indexOf(type);

      setSelectedActorFilters((old) => {
        const prev = old[type] || [];
        const exists = prev.some((selected) => (selected.code || selected.value) === (item.code || item.value));
        const next = {
          ...old,
          [type]: exists
            ? prev.filter((selected) => (selected.code || selected.value) !== (item.code || item.value))
            : [...prev, item],
        };

        if (positionIndex !== -1) {
          orderedPositions.slice(positionIndex + 1).forEach((position) => {
            next[position] = [];
          });
        }

        return next;
      });

      setActorOptionsMap((old) => {
        const next = { ...old };
        if (positionIndex !== -1) {
          orderedPositions.slice(positionIndex + 1).forEach((position) => {
            delete next[position];
          });
        }
        return next;
      });
      return;
    }

    setSelectedDealerFilters((old) => {
      const prev = old[type] || [];
      const exists = prev.some((selected) => selected.value === item.value);
      return {
        ...old,
        [type]:
          type === "top_outlet"
            ? exists
              ? []
              : [item]
            : exists
            ? prev.filter((selected) => selected.value !== item.value)
            : [...prev, item],
      };
    });
    setDealerOptionsMap({});
  };

  const removeSelection = (type, item) => {
    if (type === PRODUCT_FILTER_TAB) {
      setSelectedProductCategories((old) => old.filter((selected) => selected.value !== item.value));
      return;
    }

    if (isActorTab(type)) {
      setSelectedActorFilters((old) => ({
        ...old,
        [type]: (old[type] || []).filter(
          (selected) => (selected.code || selected.value) !== (item.code || item.value)
        ),
      }));
      return;
    }

    setSelectedDealerFilters((old) => ({
      ...old,
      [type]: (old[type] || []).filter((selected) => selected.value !== item.value),
    }));
  };

  const resetAll = () => {
    setStartDate("");
    setEndDate("");
    setBrand("");
    setSegment("");
    setMetric("volume");
    setGroupBy("product_category");
    setGroupPosition(actorPositions[0]?.value || "");
    setSelectedProductCategories([]);
    setSelectedActorFilters({});
    setSelectedDealerFilters({
      zone: [],
      district: [],
      town: [],
      category: [],
      top_outlet: [],
    });
    setActorOptionsMap({});
    setDealerOptionsMap({});
    setSearchText("");
    setActiveFilterTab(PRODUCT_FILTER_TAB);
  };

  const downloadCsv = () => {
    if (!report.data.length) return;
    const csv = [
      displayColumns.map(escapeCsvValue).join(","),
      ...report.data.map((row) => displayColumns.map((column) => escapeCsvValue(row[column])).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sales-activation-${groupBy}-${metric}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderChips = (type, selected) => {
    if (!selected?.length) return null;
    return selected.map((item) => (
      <button
        key={`${type}-${item.code || item.value}`}
        type="button"
        className="activation-chip"
        onClick={() => removeSelection(type, item)}
      >
        <span>{item.label || item.name || item.value}</span>
        <FaTimes />
      </button>
    ));
  };

  useEffect(() => {
    fetchGroupingOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!filterPanelOpen) return;
    fetchFilterValues(activeFilterTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterPanelOpen, activeFilterTab]);

  useEffect(() => {
    if (!filterPanelOpen) return;
    const onClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setFilterPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [filterPanelOpen]);

  useEffect(() => {
    if (groupBy === "actor" && !groupPosition && actorPositions[0]?.value) {
      setGroupPosition(actorPositions[0].value);
    }
  }, [groupBy, groupPosition, actorPositions]);

  return (
    <div className="sales-activation-page">
      <div className="sales-activation-shell">
        <header className="activation-header">
          <div>
            <h1>Pivot Report</h1>
            <p>Activation value and volume with extraction-style grouping.</p>
          </div>
          <div className="activation-header__actions">
            <button type="button" className="activation-btn activation-btn--primary" onClick={fetchReport}>
              <FaCheck />
              Apply
            </button>
            <button type="button" className="activation-btn" onClick={resetAll}>
              <FaSyncAlt />
              Reset
            </button>
            <button type="button" className="activation-btn" onClick={downloadCsv} disabled={!report.data.length}>
              <FaDownload />
              CSV
            </button>
            <button
              type="button"
              className="activation-btn activation-btn--accent"
              onClick={() => setFilterPanelOpen(true)}
            >
              <FaFilter />
              Filters
              {totalSelectedFiltersCount > 0 && <span>{totalSelectedFiltersCount}</span>}
            </button>
          </div>
        </header>

        <section className="activation-control-band">
          <div className="activation-field activation-date-field">
            <label>Date Range</label>
            <div className="activation-date-box">
              <div className="activation-date-inputs">
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
                <span>to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>
              <div className="activation-date-presets">
                <button type="button" onClick={() => applyDatePreset("today")}>Today</button>
                <button type="button" onClick={() => applyDatePreset("yesterday")}>Yesterday</button>
                <button type="button" onClick={() => applyDatePreset("this_month")}>MTD</button>
                <button type="button" onClick={() => applyDatePreset("last_month")}>Last Month</button>
              </div>
            </div>
          </div>

          <div className="activation-field">
            <label>Group By</label>
            <select value={groupBy} onChange={(event) => setGroupBy(event.target.value)}>
              {groupOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {groupBy === "actor" && (
            <div className="activation-field">
              <label>Actor Position</label>
              <select value={groupPosition} onChange={(event) => setGroupPosition(event.target.value)}>
                {actorPositions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="activation-field">
            <label>Brand</label>
            <input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Optional" />
          </div>

          <div className="activation-field">
            <label>Segment</label>
            <input value={segment} onChange={(event) => setSegment(event.target.value)} placeholder="Optional" />
          </div>

          <div className="activation-field">
            <label>Metric</label>
            <div className="activation-segmented">
              <button
                type="button"
                className={metric === "volume" ? "active" : ""}
                onClick={() => setMetric("volume")}
              >
                Volume
              </button>
              <button
                type="button"
                className={metric === "value" ? "active" : ""}
                onClick={() => setMetric("value")}
              >
                Value
              </button>
            </div>
          </div>
        </section>

        <section className="activation-active-filters">
          <div className="activation-active-filters__title">Active Filters</div>
          <div className="activation-active-filters__chips">
            {brand && (
              <button type="button" className="activation-chip" onClick={() => setBrand("")}>
                <span>Brand: {brand}</span>
                <FaTimes />
              </button>
            )}
            {segment && (
              <button type="button" className="activation-chip" onClick={() => setSegment("")}>
                <span>Segment: {segment}</span>
                <FaTimes />
              </button>
            )}
            {renderChips(PRODUCT_FILTER_TAB, selectedProductCategories)}
            {Object.entries(selectedActorFilters).map(([type, selected]) => renderChips(type, selected))}
            {Object.entries(selectedDealerFilters).map(([type, selected]) => renderChips(type, selected))}
            {!brand && !segment && totalSelectedFiltersCount === 0 && (
              <span className="activation-active-filters__empty">No extra filters selected</span>
            )}
          </div>
        </section>

        <section className="activation-report-card">
          <div className="activation-report-card__header">
            <div>
              <h2>
                <FaLayerGroup />
                Activation ({metric === "value" ? "Value" : "Volume"})
              </h2>
              <p>
                {groupOptions.find((option) => option.value === groupBy)?.label || "Grouped"} report
                {report.period ? ` • ${report.period.startDate} to ${report.period.endDate}` : ""}
              </p>
            </div>
            <span>{report.data.length || 0} rows</span>
          </div>

          {error && <div className="activation-error">{error}</div>}

          <div className="activation-table-wrap">
            <table className="activation-table">
              <thead>
                <tr>
                  {displayColumns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingReport ? (
                  <LoadingRows columns={displayColumns} />
                ) : report.data.length ? (
                  report.data.map((row, rowIndex) => {
                    const isTotal = String(row.Group || row["Product Category"] || "").toLowerCase() === "total";
                    return (
                      <tr key={`${row.Group || row["Product Category"]}-${rowIndex}`} className={isTotal ? "total-row" : ""}>
                        {displayColumns.map((column) => (
                          <td
                            key={column}
                            className={getGrowthClass(row[column], column)}
                            style={getCellStyle(row, column)}
                          >
                            {column === "Group" || column === "Product Category" || column === "Metric"
                              ? row[column] || "-"
                              : formatCell(row[column], column, metric)}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={displayColumns.length} className="activation-empty">
                      No activation data found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="activation-total-note">
            {report.meta?.totalLogic ||
              "Total is calculated from unique matching activation rows, not by summing product category rows."}
          </div>
        </section>
      </div>

      {filterPanelOpen && (
        <div className="activation-filter-overlay">
          <div className="activation-filter-panel" ref={panelRef}>
            <div className="activation-filter-panel__header">
              <div>
                <h3>Advanced Filters</h3>
                <p>Product category, actor, and dealer filters work together.</p>
              </div>
              <button type="button" onClick={() => setFilterPanelOpen(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="activation-filter-panel__body">
              <aside className="activation-filter-tabs">
                <button
                  type="button"
                  className={activeFilterTab === PRODUCT_FILTER_TAB ? "active" : ""}
                  onClick={() => {
                    setActiveFilterTab(PRODUCT_FILTER_TAB);
                    setSearchText("");
                  }}
                >
                  Product Category
                  {selectedProductCategories.length > 0 && <span>{selectedProductCategories.length}</span>}
                </button>

                {actorPositions.map((position) => (
                  <button
                    key={position.value}
                    type="button"
                    className={activeFilterTab === position.value ? "active" : ""}
                    onClick={() => {
                      setActiveFilterTab(position.value);
                      setSearchText("");
                    }}
                  >
                    {position.label}
                    {(selectedActorFilters[position.value] || []).length > 0 && (
                      <span>{(selectedActorFilters[position.value] || []).length}</span>
                    )}
                  </button>
                ))}

                {DEALER_FILTER_TYPES.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={activeFilterTab === item.key ? "active" : ""}
                    onClick={() => {
                      setActiveFilterTab(item.key);
                      setSearchText("");
                    }}
                  >
                    {item.label}
                    {(selectedDealerFilters[item.key] || []).length > 0 && (
                      <span>{(selectedDealerFilters[item.key] || []).length}</span>
                    )}
                  </button>
                ))}
              </aside>

              <main className="activation-filter-content">
                <div className="activation-filter-content__top">
                  <div>
                    <h4>
                      {activeFilterTab === PRODUCT_FILTER_TAB
                        ? "Product Category"
                        : actorPositions.find((item) => item.value === activeFilterTab)?.label ||
                          DEALER_FILTER_TYPES.find((item) => item.key === activeFilterTab)?.label ||
                          "Filter"}
                    </h4>
                    <small>Select one or more values</small>
                  </div>
                  <div className="activation-filter-content__actions">
                    <input
                      value={searchText}
                      onChange={(event) => setSearchText(event.target.value)}
                      placeholder="Search name, code or value"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (activeFilterTab === PRODUCT_FILTER_TAB) {
                          setSelectedProductCategories([]);
                        } else if (isActorTab(activeFilterTab)) {
                          setSelectedActorFilters((old) => ({ ...old, [activeFilterTab]: [] }));
                        } else {
                          setSelectedDealerFilters((old) => ({ ...old, [activeFilterTab]: [] }));
                        }
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {loadingFilterOptions && activeFilterTab !== PRODUCT_FILTER_TAB ? (
                  <div className="activation-option-grid">
                    {Array.from({ length: 12 }).map((_, index) => (
                      <div key={index} className="activation-option activation-option--loading">
                        <span />
                        <small />
                      </div>
                    ))}
                  </div>
                ) : filteredCurrentOptions.length ? (
                  <div className="activation-option-grid">
                    {filteredCurrentOptions.map((item) => {
                      const selected = currentTabSelected.some(
                        (selectedItem) =>
                          (selectedItem.code || selectedItem.value) === (item.code || item.value)
                      );
                      return (
                        <button
                          key={item.code || item.value}
                          type="button"
                          className={`activation-option ${selected ? "selected" : ""}`}
                          onClick={() => toggleSelection(activeFilterTab, item)}
                        >
                          <span>{item.label || item.name || item.value}</span>
                          <small>{item.code || item.value}</small>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="activation-empty">No options found.</div>
                )}
              </main>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesActivationReport;
