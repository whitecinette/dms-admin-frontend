import React, { useEffect, useMemo, useRef, useState } from "react";
import config from "../../config";
import "./style.scss";
import PriceSegmentTable from "./priceSegmentTable";
import axios from "axios";
import { FaFilter, FaSyncAlt, FaTimes } from "react-icons/fa";

const backendUrl = config.backend_url;
const DEALER_FILTER_TYPES = [
  { key: "zone", label: "Zone" },
  { key: "district", label: "District" },
  { key: "town", label: "Town" },
  { key: "category", label: "Category" },
  { key: "top_outlet", label: "Top Outlet" },
];
const ACTOR_POSITION_KEYS = ["smd", "zsm", "asm", "mdd", "tse", "so", "dealer"];
const FLOW_NAME = "default_sales_flow";

/** ===============================
 *  SHIMMER / SKELETON COMPONENTS
 *  =============================== */

const ShimmerBlock = ({ height = 14, width = "100%", style = {} }) => (
  <div
    className="shimmer"
    style={{
      height,
      width,
      borderRadius: 6,
      ...style,
    }}
  />
);

const BlockRow = ({ items = 4 }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: `repeat(${items}, minmax(120px, 1fr))`,
      gap: 12,
    }}
  >
    {Array.from({ length: items }).map((_, i) => (
      <ShimmerBlock
        key={i}
        height={18}
        width={`${60 + (i * 10) % 35}%`}
        style={{ borderRadius: 10 }}
      />
    ))}
  </div>
);

const SectionLoader = ({ title, tone = "blue" }) => (
  <div className={`report-card report-card--${tone}`}>
    <div className="report-card__header">
      <div>
        <h3>{title}</h3>
        <p>Loading report data...</p>
      </div>
      <span className="report-card__badge">REPORT</span>
    </div>

    <div className="report-card__content">
      <div className="skeleton-box">
        <div className="skeleton-title">
          <ShimmerBlock height={22} width="220px" />
        </div>

        <div className="skeleton-cards">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-card-label">
                <ShimmerBlock height={12} width="45%" />
              </div>
              <ShimmerBlock height={22} width={`${55 + i * 8}%`} />
            </div>
          ))}
        </div>

        <div className="skeleton-rows">
          <div className="skeleton-row">
            <ShimmerBlock height={18} width="70%" />
            <ShimmerBlock height={18} width="55%" />
            <ShimmerBlock height={18} width="85%" />
            <ShimmerBlock height={18} width="60%" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ReportGroup = ({
  title,
  subtitle,
  tone = "blue",
  children,
  defaultOpen = true,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`report-group report-group--${tone}`}>
      <div className="report-group__header" onClick={() => setOpen(!open)}>
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <span className="report-group__toggle">{open ? "−" : "+"}</span>
      </div>

      {open && <div className="report-group__body">{children}</div>}
    </section>
  );
};

const ReportCard = ({ title, subtitle, tone = "blue", children }) => (
  <div className={`report-card report-card--${tone}`}>
    <div className="report-card__header">
      <div>
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <span className="report-card__badge">REPORT</span>
    </div>

    <div className="report-card__content">{children}</div>
  </div>
);

const FilterChip = ({ children, onClick }) => (
  <button type="button" className="sales-filter-chip" onClick={onClick}>
    <span>{children}</span>
    <FaTimes />
  </button>
);

const OptionShimmerGrid = ({ count = 6 }) => (
  <div className="sales-option-grid sales-option-grid--loading">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="sales-option-pill sales-option-pill--shimmer">
        <div className="sales-option-pill__shimmer-line sales-option-pill__shimmer-line--title" />
        <div className="sales-option-pill__shimmer-line sales-option-pill__shimmer-line--meta" />
      </div>
    ))}
  </div>
);

function SalesReportV2() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [compactMode, setCompactMode] = useState(true);
  const [actorPositions, setActorPositions] = useState([]);
  const [filterValues, setFilterValues] = useState({
    zone: [],
    district: [],
    town: [],
    category: [],
    top_outlet: [],
  });
  const [actorOptionsMap, setActorOptionsMap] = useState({});
  const [selectedActorFilters, setSelectedActorFilters] = useState({});
  const [selectedDealerFilters, setSelectedDealerFilters] = useState({
    zone: [],
    district: [],
    town: [],
    category: [],
    top_outlet: [],
  });
  const [brand, setBrand] = useState("");
  const [segment, setSegment] = useState("");
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState("zone");
  const [searchText, setSearchText] = useState("");
  const [loadingFilterOptions, setLoadingFilterOptions] = useState(false);
  const defaultDealerFilterValues = useMemo(
    () => ({
      zone: [],
      district: [],
      town: [],
      category: [],
      top_outlet: [],
    }),
    []
  );
  const panelRef = useRef(null);
  const filterRequestCacheRef = useRef({});
  const authHeaders = useMemo(
    () => ({
      Authorization: localStorage.getItem("authToken"),
    }),
    []
  );
  const actorPositionOrder = useMemo(
    () => actorPositions.map((item) => item.value).filter(Boolean),
    [actorPositions]
  );

  // data (existing)
  const [activation, setActivation] = useState(null);
  const [tertiary, setTertiary] = useState(null);
  const [secondary, setSecondary] = useState(null);
  const [wodTables, setWodTables] = useState(null);
  const [priceSegmentTables, setPriceSegmentTables] = useState(null);
  const [priceSegmentSplit40k, setPriceSegmentSplit40k] = useState(null);

  // ✅ NEW: YTD pace report data
  const [activationValueYtd, setActivationValueYtd] = useState(null);
  const [activationVolYtd, setActivationVolYtd] = useState(null);
  const [tertiaryValueYtd, setTertiaryValueYtd] = useState(null);
  const [tertiaryVolYtd, setTertiaryVolYtd] = useState(null);

    // ✅ NEW: YTD actual report data
  const [activationValueYtdActual, setActivationValueYtdActual] = useState(null);
  const [activationVolYtdActual, setActivationVolYtdActual] = useState(null);
  const [tertiaryValueYtdActual, setTertiaryValueYtdActual] = useState(null);
  const [tertiaryVolYtdActual, setTertiaryVolYtdActual] = useState(null);

  // loaders (existing)
  const [loadingActivation, setLoadingActivation] = useState(false);
  const [loadingTertiary, setLoadingTertiary] = useState(false);
  const [loadingSecondary, setLoadingSecondary] = useState(false);
  const [loadingWod, setLoadingWod] = useState(false);
  const [loadingPriceSegment, setLoadingPriceSegment] = useState(false);
  const [loadingPriceSegmentSplit40k, setLoadingPriceSegmentSplit40k] =
    useState(false);

  // ✅ NEW: YTD loaders
  const [loadingActivationValueYtd, setLoadingActivationValueYtd] =
    useState(false);
  const [loadingActivationVolYtd, setLoadingActivationVolYtd] = useState(false);
  const [loadingTertiaryValueYtd, setLoadingTertiaryValueYtd] = useState(false);
  const [loadingTertiaryVolYtd, setLoadingTertiaryVolYtd] = useState(false);

    // ✅ NEW: YTD actual loaders
  const [loadingActivationValueYtdActual, setLoadingActivationValueYtdActual] =
    useState(false);
  const [loadingActivationVolYtdActual, setLoadingActivationVolYtdActual] =
    useState(false);
  const [loadingTertiaryValueYtdActual, setLoadingTertiaryValueYtdActual] =
    useState(false);
  const [loadingTertiaryVolYtdActual, setLoadingTertiaryVolYtdActual] =
    useState(false);

  // ===============================
  // FORMATTERS
  // ===============================
  const formatCompact = (num, isCurrency = false) => {
    if (num === null || num === undefined || isNaN(num)) return "-";

    const n = Number(num);
    const isNegative = n < 0;
    const abs = Math.abs(n);

    let formatted;

    if (abs >= 10000000) {
      formatted = (abs / 10000000).toFixed(2).replace(/\.00$/, "") + " Cr";
    } else if (abs >= 100000) {
      formatted = (abs / 100000).toFixed(2).replace(/\.00$/, "") + " Lac";
    } else if (abs >= 1000) {
      formatted = (abs / 1000).toFixed(2).replace(/\.00$/, "") + " K";
    } else {
      formatted = abs.toLocaleString("en-IN");
    }

    if (isCurrency) return (isNegative ? "-₹ " : "₹ ") + formatted;
    return isNegative ? "-" + formatted : formatted;
  };

  const formatNormal = (num, isCurrency = false) => {
    if (num === null || num === undefined || isNaN(num)) return "-";

    const n = Number(num);
    const formatted = Math.abs(n).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    });

    if (isCurrency) return n < 0 ? `-₹ ${formatted}` : `₹ ${formatted}`;
    return n < 0 ? `-${formatted}` : formatted;
  };

  const formatValue = (num, isCurrency = false) =>
    compactMode ? formatCompact(num, isCurrency) : formatNormal(num, isCurrency);

  const formatPercent = (num) => {
    if (num === null || num === undefined || isNaN(num)) return "-";
    return `${Number(num).toFixed(2)}%`;
  };

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

      const codes = (source[position] || [])
        .map((item) => item.code)
        .filter(Boolean);

      if (codes.length) {
        filters[position] = codes;
      }
    }

    return filters;
  };

  const buildDealerFiltersPayload = (
    source = selectedDealerFilters,
    { excludeType = null } = {}
  ) => {
    const filters = {};

    Object.entries(source).forEach(([key, selected]) => {
      if (key === excludeType || !selected?.length) return;

      const values = selected
        .map((item) => item.value)
        .filter((value) => value !== undefined && value !== null && value !== "");

      if (values.length) {
        filters[key] = values;
      }
    });

    return filters;
  };

  const fetchFilterValues = async (type, position = "", extraParams = {}) => {
    try {
      const params = {
        type,
        flow_name: FLOW_NAME,
      };

      if (position) params.position = position;
      if (extraParams.subordinate_filters) {
        params.subordinate_filters = JSON.stringify(extraParams.subordinate_filters);
      }
      if (extraParams.dealer_filters) {
        params.dealer_filters = JSON.stringify(extraParams.dealer_filters);
      }

      const res = await axios.get(`${backendUrl}/filter-values`, {
        params,
        headers: authHeaders,
      });

      return res.data.values || [];
    } catch (error) {
      console.error(`Error fetching filter values for ${type}:`, error);
      return [];
    }
  };

  const fetchGroupingOptions = async () => {
    try {
      const res = await axios.get(`${backendUrl}/grouping-options`, {
        headers: authHeaders,
      });

      setActorPositions(res.data.actorPositions || []);
    } catch (error) {
      console.error("Error fetching sales filter metadata:", error);
    }
  };

  const getTabRequestSignature = (tabKey) => {
    if (ACTOR_POSITION_KEYS.includes(tabKey)) {
      return JSON.stringify({
        tabKey,
        subordinate_filters: buildSubordinateFilters(selectedActorFilters, {
          upToPosition: tabKey,
        }),
        dealer_filters: buildDealerFiltersPayload(),
      });
    }

    return JSON.stringify({
      tabKey,
      subordinate_filters: buildSubordinateFilters(),
      dealer_filters: buildDealerFiltersPayload(selectedDealerFilters, {
        excludeType: tabKey,
      }),
    });
  };

  const loadFilterOptionsForTab = async (tabKey, { force = false } = {}) => {
    if (!tabKey) return;

    const requestSignature = getTabRequestSignature(tabKey);
    if (!force && filterRequestCacheRef.current[tabKey] === requestSignature) {
      return;
    }

    setLoadingFilterOptions(true);
    try {
      if (ACTOR_POSITION_KEYS.includes(tabKey)) {
        const values = await fetchFilterValues("actor", tabKey, {
          subordinate_filters: buildSubordinateFilters(selectedActorFilters, {
            upToPosition: tabKey,
          }),
          dealer_filters: buildDealerFiltersPayload(),
        });

        setActorOptionsMap((old) => ({
          ...old,
          [tabKey]: values,
        }));
        filterRequestCacheRef.current[tabKey] = requestSignature;
        return;
      }

      const values = await fetchFilterValues(tabKey, "", {
        subordinate_filters: buildSubordinateFilters(),
        dealer_filters: buildDealerFiltersPayload(selectedDealerFilters, {
          excludeType: tabKey,
        }),
      });

      setFilterValues((old) => ({
        ...old,
        [tabKey]: values,
      }));
      filterRequestCacheRef.current[tabKey] = requestSignature;
    } finally {
      setLoadingFilterOptions(false);
    }
  };

  const totalSelectedFiltersCount = useMemo(() => {
    const actorCount = Object.values(selectedActorFilters).reduce(
      (sum, arr) => sum + (arr?.length || 0),
      0
    );
    const dealerCount = Object.values(selectedDealerFilters).reduce(
      (sum, arr) => sum + (arr?.length || 0),
      0
    );
    return actorCount + dealerCount;
  }, [selectedActorFilters, selectedDealerFilters]);
  const actorFilterSnapshot = useMemo(
    () => JSON.stringify(selectedActorFilters),
    [selectedActorFilters]
  );
  const dealerFilterSnapshot = useMemo(
    () => JSON.stringify(selectedDealerFilters),
    [selectedDealerFilters]
  );

  const currentTabOptions = useMemo(() => {
    if (ACTOR_POSITION_KEYS.includes(activeFilterTab)) {
      return actorOptionsMap[activeFilterTab] || [];
    }
    return filterValues[activeFilterTab] || [];
  }, [activeFilterTab, actorOptionsMap, filterValues]);

  const currentTabSelected = useMemo(() => {
    if (ACTOR_POSITION_KEYS.includes(activeFilterTab)) {
      return selectedActorFilters[activeFilterTab] || [];
    }
    return selectedDealerFilters[activeFilterTab] || [];
  }, [activeFilterTab, selectedActorFilters, selectedDealerFilters]);

  const filteredCurrentOptions = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return currentTabOptions;

    return currentTabOptions.filter((item) => {
      const raw =
        `${item.label || ""} ${item.name || ""} ${item.code || ""} ${item.value || ""}`.toLowerCase();
      return raw.includes(q);
    });
  }, [currentTabOptions, searchText]);

  const toggleSelection = (type, item) => {
    if (ACTOR_POSITION_KEYS.includes(type)) {
      const orderedPositions = actorPositionOrder.length
        ? actorPositionOrder
        : ACTOR_POSITION_KEYS;
      const positionIndex = orderedPositions.indexOf(type);

      setSelectedActorFilters((old) => {
        const prev = old[type] || [];
        const exists = prev.some((x) => x.code === item.code);
        const next = {
          ...old,
          [type]: exists ? prev.filter((x) => x.code !== item.code) : [...prev, item],
        };

        if (positionIndex !== -1) {
          orderedPositions.slice(positionIndex + 1).forEach((position) => {
            next[position] = [];
          });
        }

        return next;
      });

      return;
    }

    const prev = selectedDealerFilters[type] || [];
    const exists = prev.some((x) => x.value === item.value);

    setSelectedDealerFilters((old) => ({
      ...old,
      [type]:
        type === "top_outlet"
          ? exists
            ? []
            : [item]
          : exists
          ? prev.filter((x) => x.value !== item.value)
          : [...prev, item],
    }));
  };

  const removeSelection = (type, item) => {
    if (ACTOR_POSITION_KEYS.includes(type)) {
      setSelectedActorFilters((old) => ({
        ...old,
        [type]: (old[type] || []).filter((x) => x.code !== item.code),
      }));
      return;
    }

    setSelectedDealerFilters((old) => ({
      ...old,
      [type]: (old[type] || []).filter((x) => x.value !== item.value),
    }));
  };

  const clearCurrentTab = () => {
    if (ACTOR_POSITION_KEYS.includes(activeFilterTab)) {
      setSelectedActorFilters((old) => ({
        ...old,
        [activeFilterTab]: [],
      }));
      return;
    }

    setSelectedDealerFilters((old) => ({
      ...old,
      [activeFilterTab]: [],
    }));
  };

  const resetAllFilters = () => {
    setStartDate("");
    setEndDate("");
    setBrand("");
    setSegment("");
    setSelectedActorFilters({});
    setSelectedDealerFilters(defaultDealerFilterValues);
    filterRequestCacheRef.current = {};
    setActorOptionsMap({});
    setFilterValues(defaultDealerFilterValues);
    setSearchText("");
    setActiveFilterTab(actorPositions[0]?.value || "zone");
    setFilterPanelOpen(false);
  };

  const renderChips = (type) => {
    const selected = ACTOR_POSITION_KEYS.includes(type)
      ? selectedActorFilters[type] || []
      : selectedDealerFilters[type] || [];

    if (!selected.length) return null;

    return (
      <div className="sales-filter-chip-list">
        {selected.map((item) => (
          <FilterChip
            key={item.code || item.value}
            onClick={() => removeSelection(type, item)}
          >
            {item.label || item.name || item.value}
          </FilterChip>
        ))}
      </div>
    );
  };

  // ===============================
  // FETCH HELPERS
  // ===============================
  const setAllLoadingFalse = () => {
    setLoadingActivation(false);
    setLoadingTertiary(false);
    setLoadingSecondary(false);
    setLoadingWod(false);
    setLoadingPriceSegment(false);
    setLoadingPriceSegmentSplit40k(false);

    // ✅ YTD
    setLoadingActivationValueYtd(false);
    setLoadingActivationVolYtd(false);
    setLoadingTertiaryValueYtd(false);
    setLoadingTertiaryVolYtd(false);

        // ✅ YTD Actual
    setLoadingActivationValueYtdActual(false);
    setLoadingActivationVolYtdActual(false);
    setLoadingTertiaryValueYtdActual(false);
    setLoadingTertiaryVolYtdActual(false);
  };

  const getRequestBody = (report_type) => {
    const body = {
      flow_name: FLOW_NAME,
      filters: { report_type },
      subordinate_filters: buildSubordinateFilters(),
      dealer_filters: buildDealerFiltersPayload(),
    };

    if (startDate && endDate) {
      body.start_date = startDate;
      body.end_date = endDate;
    }

    return body;
  };

  const postReport = async (report_type) => {
    const res = await fetch(`${backendUrl}/reports/dashboard-summary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: localStorage.getItem("authToken"),
      },
      body: JSON.stringify(getRequestBody(report_type)),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || "Error fetching report");
    return result;
  };

  // ===============================
  // FETCH DASHBOARD (multi-call, simultaneous)
  // ===============================
  const fetchDashboard = async () => {
    // clear old data
    setActivation(null);
    setTertiary(null);
    setSecondary(null);
    setWodTables(null);
    setPriceSegmentTables(null);
    setPriceSegmentSplit40k(null);

    // ✅ clear YTD
    setActivationValueYtd(null);
    setActivationVolYtd(null);
    setTertiaryValueYtd(null);
    setTertiaryVolYtd(null);

    setActivationValueYtdActual(null);
    setActivationVolYtdActual(null);
    setTertiaryValueYtdActual(null);
    setTertiaryVolYtdActual(null);

    // turn on all loaders
    setLoadingActivation(true);
    setLoadingTertiary(true);
    setLoadingSecondary(true);
    setLoadingWod(true);
    setLoadingPriceSegment(true);
    setLoadingPriceSegmentSplit40k(true);

    // ✅ YTD loaders
    setLoadingActivationValueYtd(true);
    setLoadingActivationVolYtd(true);
    setLoadingTertiaryValueYtd(true);
    setLoadingTertiaryVolYtd(true);

    setLoadingActivationValueYtdActual(true);
    setLoadingActivationVolYtdActual(true);
    setLoadingTertiaryValueYtdActual(true);
    setLoadingTertiaryVolYtdActual(true);

    const tasks = [
      // existing
      postReport("activation")
        .then((r) => setActivation(r.activation || r.data || null))
        .catch((e) => alert(e.message))
        .finally(() => setLoadingActivation(false)),

      postReport("tertiary")
        .then((r) => setTertiary(r.tertiary || r.data || null))
        .catch((e) => alert(e.message))
        .finally(() => setLoadingTertiary(false)),

      postReport("secondary")
        .then((r) => setSecondary(r.secondary || r.data || null))
        .catch((e) => alert(e.message))
        .finally(() => setLoadingSecondary(false)),

      postReport("wod")
        .then((r) => setWodTables(r.wod || r.wodTables || r.data || null))
        .catch((e) => alert(e.message))
        .finally(() => setLoadingWod(false)),

      postReport("price_segment")
        .then((r) =>
          setPriceSegmentTables(
            r.price_segment || r.priceSegmentTables || r.data || null
          )
        )
        .catch((e) => alert(e.message))
        .finally(() => setLoadingPriceSegment(false)),

      postReport("price_segment_40k")
        .then((r) =>
          setPriceSegmentSplit40k(
            r.price_segment_40k || r.priceSegmentTables40k || r.data || null
          )
        )
        .catch((e) => alert(e.message))
        .finally(() => setLoadingPriceSegmentSplit40k(false)),

      // ✅ NEW: YTD pace reports
      postReport("activation_value_ytd")
        .then((r) => setActivationValueYtd(r.activation_value_ytd || r.data || null))
        .catch((e) => alert(e.message))
        .finally(() => setLoadingActivationValueYtd(false)),

      postReport("activation_vol_ytd")
        .then((r) => setActivationVolYtd(r.activation_vol_ytd || r.data || null))
        .catch((e) => alert(e.message))
        .finally(() => setLoadingActivationVolYtd(false)),

      postReport("tertiary_value_ytd")
        .then((r) => setTertiaryValueYtd(r.tertiary_value_ytd || r.data || null))
        .catch((e) => alert(e.message))
        .finally(() => setLoadingTertiaryValueYtd(false)),

      postReport("tertiary_vol_ytd")
        .then((r) => setTertiaryVolYtd(r.tertiary_vol_ytd || r.data || null))
        .catch((e) => alert(e.message))
        .finally(() => setLoadingTertiaryVolYtd(false)),

              // ✅ NEW: YTD actual reports
      postReport("activation_value_ytd_actual")
        .then((r) =>
          setActivationValueYtdActual(
            r.activation_value_ytd_actual || r.data || null
          )
        )
        .catch((e) => alert(e.message))
        .finally(() => setLoadingActivationValueYtdActual(false)),

      postReport("activation_vol_ytd_actual")
        .then((r) =>
          setActivationVolYtdActual(
            r.activation_vol_ytd_actual || r.data || null
          )
        )
        .catch((e) => alert(e.message))
        .finally(() => setLoadingActivationVolYtdActual(false)),

      postReport("tertiary_value_ytd_actual")
        .then((r) =>
          setTertiaryValueYtdActual(
            r.tertiary_value_ytd_actual || r.data || null
          )
        )
        .catch((e) => alert(e.message))
        .finally(() => setLoadingTertiaryValueYtdActual(false)),

      postReport("tertiary_vol_ytd_actual")
        .then((r) =>
          setTertiaryVolYtdActual(
            r.tertiary_vol_ytd_actual || r.data || null
          )
        )
        .catch((e) => alert(e.message))
        .finally(() => setLoadingTertiaryVolYtdActual(false)),
    ];

    await Promise.allSettled(tasks);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchGroupingOptions();
  }, []);

  useEffect(() => {
    if (!actorPositions.length) return;

    const actorTabSet = new Set(actorPositions.map((item) => item.value));
    if (!actorTabSet.has(activeFilterTab) && !DEALER_FILTER_TYPES.some((item) => item.key === activeFilterTab)) {
      setActiveFilterTab(actorPositions[0]?.value || "zone");
    }
  }, [actorPositions, activeFilterTab]);

  useEffect(() => {
    filterRequestCacheRef.current = {};
    setActorOptionsMap({});
    setFilterValues(defaultDealerFilterValues);
  }, [actorFilterSnapshot, dealerFilterSnapshot, defaultDealerFilterValues]);

  useEffect(() => {
    if (!filterPanelOpen || !activeFilterTab) return;

    loadFilterOptionsForTab(activeFilterTab);
  }, [
    filterPanelOpen,
    activeFilterTab,
    actorFilterSnapshot,
    dealerFilterSnapshot,
    actorPositions.length,
  ]);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (filterPanelOpen && panelRef.current && !panelRef.current.contains(event.target)) {
        setFilterPanelOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [filterPanelOpen]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchDashboard();
  }, [
    startDate,
    endDate,
    brand,
    segment,
    actorFilterSnapshot,
    dealerFilterSnapshot,
  ]);

  // ===============================
  // GENERIC TABLE CONTENT RENDERER
  // ===============================
  const renderTableContent = (reportData) => {
    if (!reportData?.table) return null;

    const { value = {}, volume = {} } = reportData.table;
    const columns = Object.keys(value || {});

    return (
      <div className="report-table-wrapper">
        <table className="report-table">
          <thead>
            <tr>
              <th>Metric</th>
              {columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            <tr>
              <td className="metric-title">Value</td>
              {columns.map((key) => {
                const val = value?.[key];
                return (
                  <td
                    key={key}
                    className={
                      key === "G/D%"
                        ? Number(val || 0) >= 0
                          ? "positive"
                          : "negative"
                        : ""
                    }
                  >
                    {key.includes("%")
                      ? `${Number(val || 0).toFixed(2)}%`
                      : formatValue(val, true)}
                  </td>
                );
              })}
            </tr>

            <tr>
              <td className="metric-title">Volume</td>
              {columns.map((key) => {
                const val = volume?.[key];
                return (
                  <td
                    key={key}
                    className={
                      key === "G/D%"
                        ? Number(val || 0) >= 0
                          ? "positive"
                          : "negative"
                        : ""
                    }
                  >
                    {key.includes("%")
                      ? `${Number(val || 0).toFixed(2)}%`
                      : formatValue(val, false)}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // ===============================
  // ✅ YTD TABLE CONTENT RENDERER
  // ===============================
  const renderYtdTableContent = (report, { isCurrency = false } = {}) => {
    if (!report?.columns || !report?.rows) return null;

    const { columns, rows } = report;

    return (
      <div className="report-table-wrapper">
        <table className="report-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, idx) => {
              const isGdRow =
                String(row?.Year || "").toLowerCase().includes("g/d") ||
                String(row?.Year || "").toLowerCase().includes("gd");

              return (
                <tr key={idx}>
                  {columns.map((col) => {
                    const v = row?.[col];

                    let cell = "-";
                    if (col === "Year") cell = row?.Year ?? "-";
                    else if (v === null || v === undefined) cell = "-";
                    else if (isGdRow) cell = formatPercent(v);
                    else cell = formatValue(v, isCurrency);

                    const cls =
                      isGdRow && col !== "Year"
                        ? Number(v || 0) >= 0
                          ? "positive"
                          : "negative"
                        : "";

                    return (
                      <td key={col} className={cls}>
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // ===============================
  // WOD TABLES CONTENT
  // ===============================


  // ===============================
  // wod heatmap and wod
  // ===============================


const WOD_FIXED_COLUMNS = ["MTD", "LMTD", "FTD", "G/D%", "Exp.Ach"];

const isNumeric = (val) => {
  return val !== null && val !== undefined && val !== "" && !Number.isNaN(Number(val));
};

const getComparableColumns = (columns) => {
  return columns.filter((col) => col !== "G/D%" && col !== "Exp.Ach");
};

const getRowScaleStats = (rowData, columns) => {
  const comparableCols = getComparableColumns(columns);

  const values = comparableCols
    .map((col) => Number(rowData?.[col]))
    .filter((v) => !Number.isNaN(v));

  if (!values.length) return { min: 0, max: 0 };

  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
};

const getNeutralIntensityStyle = (value, stats) => {
  if (!isNumeric(value)) return {};

  const num = Number(value);
  const { min, max } = stats;

  if (max === min) {
    return {
      background: "#fbfcfe",
      fontWeight: 500,
    };
  }

  const ratio = (num - min) / (max - min);

  // very subtle neutral indigo/gray tint
  const alpha = 0.03 + ratio * 0.08;

  return {
    background: `linear-gradient(180deg, rgba(99, 102, 241, ${alpha}) 0%, rgba(99, 102, 241, ${alpha * 0.75}) 100%)`,
    boxShadow: ratio > 0.55 ? "inset 0 0 0 1px rgba(99,102,241,0.08)" : "none",
    fontWeight: ratio > 0.7 ? 600 : 500,
    color: "#374151",
  };
};

const getGrowthStyle = (value) => {
  if (!isNumeric(value)) return {};

  const num = Number(value);

  if (num > 0) {
    return {
      background: "rgba(34, 197, 94, 0.08)",
      color: "#166534",
      fontWeight: 700,
    };
  }

  if (num < 0) {
    return {
      background: "rgba(239, 68, 68, 0.08)",
      color: "#b42318",
      fontWeight: 700,
    };
  }

  return {
    background: "#f8fafc",
    color: "#475467",
    fontWeight: 600,
  };
};

const getExpAchStyle = () => {
  return {
    background: "#fcfcfd",
    color: "#667085",
    fontWeight: 500,
  };
};

const getCellStyle = (value, col, rowData, columns) => {
  if (!isNumeric(value)) return {};

  if (col === "G/D%") return getGrowthStyle(value);
  if (col === "Exp.Ach") return getExpAchStyle();

  const stats = getRowScaleStats(rowData, columns);
  return getNeutralIntensityStyle(value, stats);
};

const renderWodRow = (label, rowData, columns, rowKey) => {
  return (
    <tr key={rowKey}>
      <td className="metric-title sticky-col">{label}</td>
      {columns.map((col) => (
        <td
          key={col}
          className={`wod-value-cell ${col === "G/D%" ? "is-growth" : ""} ${col === "Exp.Ach" ? "is-exp" : ""}`}
          style={getCellStyle(rowData?.[col], col, rowData, columns)}
        >
          {formatValue(rowData?.[col])}
        </td>
      ))}
    </tr>
  );
};

const renderWodTablesContent = () => {
  if (!wodTables) return null;

  const sellIn = wodTables.sellInWOD || {};
  const sellOut = wodTables.sellOutWOD || {};
  const columns = Object.keys(sellIn);

  return (
    <div className="wod-section">
      <div className="sub-report-block">
        <div className="sub-report-heading">WOD Summary</div>
        <div className="report-table-wrapper">
          <table className="report-table wod-report-table">
            <thead>
              <tr>
                <th className="sticky-col">Metric</th>
                {columns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {renderWodRow("Sell-In WOD", sellIn, columns, "sell-in")}
              {renderWodRow("Sell-Out WOD", sellOut, columns, "sell-out")}
            </tbody>
          </table>
        </div>
      </div>

      {wodTables.sellInBreakdown?.length > 0 && (
        <div className="sub-report-block">
          <div className="sub-report-heading">Sell-In WOD Breakdown</div>
          <div className="report-table-wrapper">
            <table className="report-table wod-report-table">
              <thead>
                <tr>
                  <th className="sticky-col">Metric</th>
                  {columns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {wodTables.sellInBreakdown.map((row, idx) =>
                  renderWodRow(row.label, row.data || {}, columns, `sellin-breakdown-${idx}`)
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {wodTables.sellOutBreakdown?.length > 0 && (
        <div className="sub-report-block">
          <div className="sub-report-heading">Sell-Out WOD Breakdown</div>
          <div className="report-table-wrapper">
            <table className="report-table wod-report-table">
              <thead>
                <tr>
                  <th className="sticky-col">Metric</th>
                  {columns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {wodTables.sellOutBreakdown.map((row, idx) =>
                  renderWodRow(row.label, row.data || {}, columns, `sellout-breakdown-${idx}`)
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

  // ===============================
  // wod heatmap and wod
  // ===============================

  return (
    <div className="sales-report-page">
      <div className="report-container">
        <div className="report-header">
          <div>
            <h2>📊 Sales Dashboard</h2>
            <p className="report-subtitle">
              Extraction-style filters now apply across every report card on this page.
            </p>
          </div>

          <div className="controls">
            <button type="button" className="ghost-action" onClick={resetAllFilters}>
              <FaSyncAlt />
              Reset
            </button>

            <button
              type="button"
              className="primary-action"
              onClick={() => setFilterPanelOpen((prev) => !prev)}
            >
              <FaFilter />
              Filters
              {totalSelectedFiltersCount > 0 && (
                <span className="filter-badge">{totalSelectedFiltersCount}</span>
              )}
            </button>

            <button type="button" onClick={fetchDashboard}>
              Refresh
            </button>

            <button
              type="button"
              onClick={() => setCompactMode(!compactMode)}
            >
              {compactMode ? "Switch to Normal View" : "Switch to Cr/Lac View"}
            </button>
          </div>
        </div>

        <div className="sales-filter-bar">
          <div className="sales-filter-grid">
            <div className="sales-filter-field">
              <label>From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="sales-filter-field">
              <label>To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="sales-filter-field">
              <label>Brand</label>
              <input
                type="text"
                placeholder="Optional"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
            </div>

            <div className="sales-filter-field">
              <label>Segment</label>
              <input
                type="text"
                placeholder="Optional"
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="sales-active-filters">
          <div className="sales-active-filters__title">Active Filters</div>
          <div className="sales-active-filters__content">
            {brand && (
              <FilterChip onClick={() => setBrand("")}>Brand: {brand}</FilterChip>
            )}
            {segment && (
              <FilterChip onClick={() => setSegment("")}>Segment: {segment}</FilterChip>
            )}
            {Object.keys(selectedActorFilters).map((type) => renderChips(type))}
            {Object.keys(selectedDealerFilters).map((type) => renderChips(type))}
            {!brand && !segment && totalSelectedFiltersCount === 0 && (
              <div className="sales-active-filters__empty">No extra filters selected</div>
            )}
          </div>
        </div>

        {filterPanelOpen && (
          <div className="sales-filter-overlay">
            <div className="sales-filter-panel" ref={panelRef}>
              <div className="sales-filter-panel__header">
                <div>
                  <h3>Advanced Filters</h3>
                  <p>Actor and dealer filters work together across all reports.</p>
                </div>
                <button
                  type="button"
                  className="sales-filter-panel__icon"
                  onClick={() => setFilterPanelOpen(false)}
                >
                  <FaTimes />
                </button>
              </div>

              <div className="sales-filter-panel__body">
                <div className="sales-filter-sidebar">
                  {actorPositions.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={activeFilterTab === item.value ? "active" : ""}
                      onClick={() => {
                        setActiveFilterTab(item.value);
                        setSearchText("");
                      }}
                    >
                      {item.label}
                      {(selectedActorFilters[item.value] || []).length > 0 && (
                        <span>{(selectedActorFilters[item.value] || []).length}</span>
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
                </div>

                <div className="sales-filter-content">
                  <div className="sales-filter-content__top">
                    <div>
                      <h4>
                        {actorPositions.find((p) => p.value === activeFilterTab)?.label ||
                          DEALER_FILTER_TYPES.find((d) => d.key === activeFilterTab)?.label ||
                          "Filters"}
                      </h4>
                      <small>Actor filters drill down automatically as you move deeper in the hierarchy</small>
                    </div>

                    <div className="sales-filter-content__actions">
                      <input
                        type="text"
                        placeholder="Search name, code or value"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                      />
                      <button type="button" className="ghost-action" onClick={clearCurrentTab}>
                        Clear
                      </button>
                    </div>
                  </div>

                  {renderChips(activeFilterTab)}

                  {loadingFilterOptions ? (
                    <OptionShimmerGrid />
                  ) : (
                    <div className="sales-option-grid">
                      {filteredCurrentOptions.length > 0 ? (
                      filteredCurrentOptions.map((item) => {
                        const isSelected = currentTabSelected.some((selected) =>
                          ACTOR_POSITION_KEYS.includes(activeFilterTab)
                            ? selected.code === item.code
                            : selected.value === item.value
                        );

                        return (
                          <button
                            type="button"
                            key={item.code || `${activeFilterTab}-${String(item.value)}`}
                            className={`sales-option-pill ${isSelected ? "selected" : ""}`}
                            onClick={() => toggleSelection(activeFilterTab, item)}
                          >
                            <span>{item.label || item.name || item.value}</span>
                            {ACTOR_POSITION_KEYS.includes(activeFilterTab) && item.code && (
                              <small>{item.code}</small>
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="sales-option-empty">No options found</div>
                    )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <ReportGroup
          title="Core Sales Reports"
          subtitle="Primary value and volume summaries"
          tone="blue"
          defaultOpen={true}
        >
          {loadingActivation ? (
            <SectionLoader title="Activation (Sell-Out)" tone="blue" />
          ) : (
            <ReportCard
              title="Activation (Sell-Out)"
              subtitle="Sell-out value and volume summary"
              tone="blue"
            >
              {renderTableContent(activation)}
            </ReportCard>
          )}

          {loadingTertiary ? (
            <SectionLoader title="Tertiary (Sell-In)" tone="blue" />
          ) : (
            <ReportCard
              title="Tertiary (Sell-In)"
              subtitle="Sell-in value and volume summary"
              tone="blue"
            >
              {renderTableContent(tertiary)}
            </ReportCard>
          )}

          {loadingSecondary ? (
            <SectionLoader title="Secondary (SPD → MDD)" tone="blue" />
          ) : (
            <ReportCard
              title="Secondary (SPD → MDD)"
              subtitle="Movement summary across channel"
              tone="blue"
            >
              {renderTableContent(secondary)}
            </ReportCard>
          )}
        </ReportGroup>

        <ReportGroup
          title="WOD Reports"
          subtitle="Width of distribution insights"
          tone="purple"
          defaultOpen={true}
        >
          {loadingWod ? (
            <SectionLoader title="WOD" tone="purple" />
          ) : (
            <ReportCard
              title="WOD"
              subtitle="Sell-in and sell-out WOD overview"
              tone="purple"
            >
              {renderWodTablesContent()}
            </ReportCard>
          )}
        </ReportGroup>

        <ReportGroup
          title="Price Segment Reports"
          subtitle="Price-wise performance breakdown"
          tone="orange"
          defaultOpen={false}
        >
          {loadingPriceSegment ? (
            <SectionLoader title="Activation – Price Segment Wise" tone="orange" />
          ) : (
            priceSegmentTables && (
              <ReportCard
                title="Activation – Price Segment Wise"
                subtitle="Segment-based activation distribution"
                tone="orange"
              >
                <PriceSegmentTable
                  data={priceSegmentTables}
                  title=""
                  formatValue={formatValue}
                />
              </ReportCard>
            )
          )}

          {loadingPriceSegmentSplit40k ? (
            <SectionLoader title="Activation – 40K vs >40K" tone="orange" />
          ) : (
            priceSegmentSplit40k && (
              <ReportCard
                title="Activation – 40K vs >40K"
                subtitle="Premium split analysis"
                tone="orange"
              >
                <PriceSegmentTable
                  data={priceSegmentSplit40k}
                  title=""
                  formatValue={formatValue}
                />
              </ReportCard>
            )
          )}
        </ReportGroup>

        <ReportGroup
          title="YTD Reports"
          subtitle="Full-month year-to-date monthly analysis"
          tone="teal"
          defaultOpen={false}
        >
          {loadingActivationValueYtdActual ? (
            <SectionLoader title="Activation Value YTD " tone="teal" />
          ) : (
            <ReportCard
              title="Activation Value YTD "
              subtitle="Full-month activation value trend"
              tone="teal"
            >
              {renderYtdTableContent(activationValueYtdActual, {
                isCurrency: true,
              })}
            </ReportCard>
          )}

          {loadingActivationVolYtdActual ? (
            <SectionLoader title="Activation Vol YTD " tone="teal" />
          ) : (
            <ReportCard
              title="Activation Vol YTD "
              subtitle="Full-month activation volume trend"
              tone="teal"
            >
              {renderYtdTableContent(activationVolYtdActual, {
                isCurrency: false,
              })}
            </ReportCard>
          )}

          {loadingTertiaryValueYtdActual ? (
            <SectionLoader title="Tertiary Value YTD Actual" tone="teal" />
          ) : (
            <ReportCard
              title="Tertiary Value YTD Actual"
              subtitle="Full-month tertiary value performance"
              tone="teal"
            >
              {renderYtdTableContent(tertiaryValueYtdActual, {
                isCurrency: true,
              })}
            </ReportCard>
          )}

          {loadingTertiaryVolYtdActual ? (
            <SectionLoader title="Tertiary Vol YTD Actual" tone="teal" />
          ) : (
            <ReportCard
              title="Tertiary Vol YTD Actual"
              subtitle="Full-month tertiary volume performance"
              tone="teal"
            >
              {renderYtdTableContent(tertiaryVolYtdActual, {
                isCurrency: false,
              })}
            </ReportCard>
          )}
        </ReportGroup>

        <ReportGroup
          title="YTD Pace Reports "
          subtitle="Pace-based YTD analysis using same day-of-month comparison"
          tone="green"
          defaultOpen={false}
        >
          {loadingActivationValueYtd ? (
            <SectionLoader title="Activation Value YTD G/D" tone="green" />
          ) : (
            <ReportCard
              title="Activation Value YTD G/D"
              subtitle="Year-to-date value trend"
              tone="green"
            >
              {renderYtdTableContent(activationValueYtd, { isCurrency: true })}
            </ReportCard>
          )}

          {loadingActivationVolYtd ? (
            <SectionLoader title="Activation Vol YTD G/D" tone="green" />
          ) : (
            <ReportCard
              title="Activation Vol YTD G/D"
              subtitle="Year-to-date volume trend"
              tone="green"
            >
              {renderYtdTableContent(activationVolYtd, { isCurrency: false })}
            </ReportCard>
          )}

          {loadingTertiaryValueYtd ? (
            <SectionLoader title="Tertiary Value YTD G/D" tone="green" />
          ) : (
            <ReportCard
              title="Tertiary Value YTD G/D"
              subtitle="Year-to-date value performance"
              tone="green"
            >
              {renderYtdTableContent(tertiaryValueYtd, { isCurrency: true })}
            </ReportCard>
          )}

          {loadingTertiaryVolYtd ? (
            <SectionLoader title="Tertiary Vol YTD G/D" tone="green" />
          ) : (
            <ReportCard
              title="Tertiary Vol YTD G/D"
              subtitle="Year-to-date volume performance"
              tone="green"
            >
              {renderYtdTableContent(tertiaryVolYtd, { isCurrency: false })}
            </ReportCard>
          )}
        </ReportGroup>


      </div>
    </div>
  );
}

export default SalesReportV2;
