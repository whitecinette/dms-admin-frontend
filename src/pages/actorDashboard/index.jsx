import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { FaFilter, FaSearch, FaSyncAlt } from "react-icons/fa";
import {
  ResponsiveContainer,
  BarChart,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ComposedChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import config from "../../config";
import {
  fetchActorDashboardTopKpis,
  hasAnyKpiValue,
} from "./actorDashboardController";
import "./style.scss";

const backendUrl = config.backend_url;
const FLOW_NAME = "default_sales_flow";
const ACTOR_POSITION_KEYS = ["smd", "zsm", "asm", "so", "mdd", "tse", "dealer"];
const DEALER_FILTER_TYPES = [
  { key: "zone", label: "Zone" },
  { key: "district", label: "District" },
  { key: "town", label: "Town" },
  { key: "category", label: "Category" },
  { key: "top_outlet", label: "Top Outlet" },
];
const DEFAULT_DEALER_FILTER_SELECTION = {
  zone: [],
  district: [],
  town: [],
  category: [],
  top_outlet: [],
};
const DEFAULT_ACTOR_POSITIONS = [
  { value: "smd", label: "SMD" },
  { value: "zsm", label: "ZSM" },
  { value: "asm", label: "ASM" },
  { value: "so", label: "SO" },
  { value: "mdd", label: "MDD" },
  { value: "tse", label: "TSE" },
  { value: "dealer", label: "Dealer" },
];

const MOCK_DATA = {
  actor: {
    code: "ASM108",
    name: "Rahul Sharma",
    position: "ASM",
  },
  dealer: {
    code: "DLR00314",
    name: "Shivam Mobiles",
    town: "Nagpur",
    category: "A+",
  },
  coverageRunRateDaily: [
    { date: "2026-05-12", done: 32, pending: 14, coveragePct: 69.6 },
    { date: "2026-05-13", done: 33, pending: 13, coveragePct: 71.7 },
    { date: "2026-05-14", done: 35, pending: 12, coveragePct: 74.5 },
    { date: "2026-05-15", done: 34, pending: 12, coveragePct: 73.9 },
    { date: "2026-05-16", done: 37, pending: 10, coveragePct: 78.7 },
    { date: "2026-05-17", done: 36, pending: 10, coveragePct: 78.3 },
    { date: "2026-05-18", done: 38, pending: 9, coveragePct: 80.9 },
    { date: "2026-05-19", done: 40, pending: 9, coveragePct: 81.6 },
    { date: "2026-05-20", done: 39, pending: 9, coveragePct: 81.3 },
    { date: "2026-05-21", done: 41, pending: 8, coveragePct: 83.7 },
    { date: "2026-05-22", done: 40, pending: 8, coveragePct: 83.3 },
    { date: "2026-05-23", done: 42, pending: 7, coveragePct: 85.7 },
    { date: "2026-05-24", done: 41, pending: 8, coveragePct: 83.7 },
    { date: "2026-05-25", done: 43, pending: 7, coveragePct: 86.0 },
  ],
  actorCoveragePerformance: [
    { actor: "ASM108", done: 43, pending: 7, totalVisits: 58, coveragePct: 86.0 },
    { actor: "TSE774", done: 28, pending: 10, totalVisits: 42, coveragePct: 73.7 },
    { actor: "TSE552", done: 25, pending: 11, totalVisits: 39, coveragePct: 69.4 },
    { actor: "SO331", done: 22, pending: 9, totalVisits: 34, coveragePct: 71.0 },
    { actor: "MDD398", done: 18, pending: 6, totalVisits: 27, coveragePct: 75.0 },
  ],
  extractionTrendMonthly: [
    { month: "2025-12", samsung: 41, vivo: 24, oppo: 17, xiaomi: 13, apple: 5 },
    { month: "2026-01", samsung: 43, vivo: 23, oppo: 17, xiaomi: 12, apple: 5 },
    { month: "2026-02", samsung: 44, vivo: 22, oppo: 16, xiaomi: 12, apple: 6 },
    { month: "2026-03", samsung: 46, vivo: 22, oppo: 15, xiaomi: 11, apple: 6 },
    { month: "2026-04", samsung: 45, vivo: 23, oppo: 15, xiaomi: 10, apple: 7 },
    { month: "2026-05", samsung: 48, vivo: 21, oppo: 14, xiaomi: 10, apple: 7 },
  ],
  dealerSnapshot: {
    m1: 8.8,
    m2: 9.1,
    m3: 8.9,
    mtd: 8.9,
    lyMtd: 8.3,
    target: 9.0,
    sec: 128,
    stock: 236,
    extractionPct: 44,
  },
  brandSecFixtureStats: [
    { brand: "Samsung", fixtures: 24, sec: 128 },
    { brand: "Vivo", fixtures: 18, sec: 96 },
    { brand: "Oppo", fixtures: 13, sec: 84 },
    { brand: "Xiaomi", fixtures: 10, sec: 72 },
    { brand: "Apple", fixtures: 6, sec: 38 },
  ],
  hierarchy: ["SMD > SMD021", "ZSM > ZSM055", "ASM > ASM108", "TSE > TSE774", "MDD > MDD398", "Dealer > DLR00314"],
};

const ACT_TABLE_COLUMNS = ["Feb", "Mar", "Apr", "MTD", "LMTD", "FTD", "G/D%"];
const BRAND_COLORS = {
  Samsung: "#2563eb",
  Vivo: "#0ea5e9",
  Oppo: "#f97316",
  Xiaomi: "#7c3aed",
  Apple: "#64748b",
};

const ACT_TABLE_ROWS = [
  {
    metric: "Overall",
    subLabel: "Tag Volume",
    feb: 15403,
    mar: 15596,
    apr: 12268,
    mtd: 8788,
    lmtd: 9776,
    ftd: 345,
    gdPct: -10.11,
  },
  {
    metric: "Overall Smartphone",
    subLabel: "Tag Volume",
    feb: 14015,
    mar: 14390,
    apr: 11632,
    mtd: 8230,
    lmtd: 9060,
    ftd: 320,
    gdPct: -9.16,
  },
  {
    metric: "Flagship 5G",
    subLabel: "Tag Volume",
    feb: 762,
    mar: 2721,
    apr: 1214,
    mtd: 995,
    lmtd: 1043,
    ftd: 41,
    gdPct: -4.6,
  },
  {
    metric: "Innovative 5G",
    subLabel: "Tag Volume",
    feb: 6364,
    mar: 7550,
    apr: 8129,
    mtd: 5491,
    lmtd: 5971,
    ftd: 201,
    gdPct: -8.04,
  },
  {
    metric: "Tab",
    subLabel: "Tag Volume",
    feb: 143,
    mar: 162,
    apr: 143,
    mtd: 158,
    lmtd: 109,
    ftd: 4,
    gdPct: 44.95,
  },
  {
    metric: "Untagged",
    subLabel: "Tag Volume",
    feb: 1843,
    mar: 40,
    apr: 25,
    mtd: 1903,
    lmtd: 14,
    ftd: 86,
    gdPct: 13492.86,
  },
  {
    metric: "Wearable",
    subLabel: "Tag Volume",
    feb: 81,
    mar: 149,
    apr: 53,
    mtd: 54,
    lmtd: 40,
    ftd: 3,
    gdPct: 35,
  },
];

const SAMSUNG_MODEL_STOCK_ROWS = [
  {
    product_name: "Galaxy Z Flip5 5G 256GB",
    product_category: "Smartphone",
    price: 120999,
    segment: "120",
    model_code: "F741BE",
    product_code: "SM-F741BLBE",
    category: "Sp-Premium",
    tags: ["Flagship 5G", "5G"],
    stock_units: 14,
    age_days: 21,
  },
  {
    product_name: "Galaxy S24 Ultra 5G 512GB",
    product_category: "Smartphone",
    price: 134999,
    segment: "120",
    model_code: "S928BZK",
    product_code: "SM-S928BZKE",
    category: "Sp-Premium",
    tags: ["Flagship 5G", "5G"],
    stock_units: 9,
    age_days: 17,
  },
  {
    product_name: "Galaxy A55 5G 256GB",
    product_category: "Smartphone",
    price: 42999,
    segment: "40-70",
    model_code: "A556EZK",
    product_code: "SM-A556EZKE",
    category: "Sp-Upper-Mid",
    tags: ["Innovative 5G", "5G"],
    stock_units: 31,
    age_days: 34,
  },
  {
    product_name: "Galaxy M14 5G 128GB",
    product_category: "Smartphone",
    price: 15999,
    segment: "10-20",
    model_code: "M146BZB",
    product_code: "SM-M146BZBE",
    category: "Sp-Mid",
    tags: ["5G"],
    stock_units: 47,
    age_days: 46,
  },
  {
    product_name: "Galaxy Tab S9 FE",
    product_category: "Tablet",
    price: 37999,
    segment: "30-40",
    model_code: "X510NZA",
    product_code: "SM-X510NZAE",
    category: "Tab",
    tags: ["Tab"],
    stock_units: 11,
    age_days: 28,
  },
];

const toDayDate = (dayValue) => new Date(`${dayValue}T00:00:00`);
const toMonthDate = (monthValue) => new Date(`${monthValue}-01T00:00:00`);
const formatDayLabel = (dayValue) =>
  toDayDate(dayValue).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
const formatMonthLabel = (monthValue) =>
  toMonthDate(monthValue).toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
  });

const formatCr = (value) => `${Number(value || 0).toFixed(1)} Cr`;
const formatCount = (value) => Number(value || 0).toLocaleString("en-IN");
const formatPct = (value) => `${Number(value || 0).toFixed(2)}%`;
const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
const getGrowthClass = (value) => {
  const num = Number(value || 0);
  if (num > 0) return "is-positive";
  if (num < 0) return "is-negative";
  return "is-neutral";
};
const getAgeClass = (value) => {
  const age = Number(value || 0);
  if (age <= 20) return "age-fresh";
  if (age <= 40) return "age-watch";
  return "age-old";
};
const toPieRows = (rows = []) =>
  rows.map((item) => ({
    name: item.brand,
    value: Number(item.fixtures || 0),
  }));
const toSecPieRows = (rows = []) =>
  rows.map((item) => ({
    name: item.brand,
    value: Number(item.sec || 0),
  }));
const isActorTab = (tabKey) => ACTOR_POSITION_KEYS.includes(tabKey);
const normalizeFilterOption = (item) => {
  if (!item) return null;
  if (typeof item === "string") return { label: item, value: item };

  const value = item.value ?? item.tag ?? item.name ?? item.label;
  if (value === undefined || value === null || value === "") return null;

  return {
    ...item,
    label: item.label || item.name || item.tag || String(value),
    value,
  };
};
const cloneActorFilterMap = (source = {}) =>
  Object.entries(source).reduce((acc, [key, selected]) => {
    acc[key] = Array.isArray(selected) ? [...selected] : [];
    return acc;
  }, {});
const cloneDealerFilterMap = (source = DEFAULT_DEALER_FILTER_SELECTION) =>
  Object.keys(DEFAULT_DEALER_FILTER_SELECTION).reduce((acc, key) => {
    acc[key] = Array.isArray(source?.[key]) ? [...source[key]] : [];
    return acc;
  }, {});
const getTabItemIdentity = (tabKey, item) =>
  isActorTab(tabKey)
    ? item.code || item.value || item.label
    : item.value || item.code || item.label;
const formatCrOrDash = (value) =>
  value === null || value === undefined ? "-" : formatCr(value);
const formatCountOrDash = (value) =>
  value === null || value === undefined ? "-" : formatCount(value);
const formatPctOrDash = (value) =>
  value === null || value === undefined ? "-" : `${Number(value).toFixed(1)}%`;
const getDefaultDateRange = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return {
    start: `${yyyy}-${mm}-01`,
    end: `${yyyy}-${mm}-${dd}`,
  };
};

function ActorDashboard() {
  const initialDateRange = useMemo(() => getDefaultDateRange(), []);
  const [startDate, setStartDate] = useState(initialDateRange.start);
  const [endDate, setEndDate] = useState(initialDateRange.end);
  const [actorPositions, setActorPositions] = useState(DEFAULT_ACTOR_POSITIONS);
  const [actorOptionsMap, setActorOptionsMap] = useState({});
  const [filterValues, setFilterValues] = useState(cloneDealerFilterMap());
  const [selectedActorFilters, setSelectedActorFilters] = useState({});
  const [selectedDealerFilters, setSelectedDealerFilters] = useState(
    cloneDealerFilterMap()
  );
  const [draftActorFilters, setDraftActorFilters] = useState({});
  const [draftDealerFilters, setDraftDealerFilters] = useState(
    cloneDealerFilterMap()
  );
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState("so");
  const [searchText, setSearchText] = useState("");
  const [loadingFilterOptions, setLoadingFilterOptions] = useState(false);

  const panelRef = useRef(null);

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

  const buildSubordinateFilters = useCallback((source = {}, { upToPosition = null } = {}) => {
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
  }, [actorPositionOrder]);

  const buildDealerFiltersPayload = useCallback((
    source = DEFAULT_DEALER_FILTER_SELECTION,
    { excludeType = null } = {}
  ) => {
    const filters = {};

    Object.entries(source).forEach(([key, selected]) => {
      if (key === excludeType || !selected?.length) return;

      const values = selected
        .map((item) => item.value)
        .filter(
          (value) => value !== undefined && value !== null && value !== ""
        );

      if (values.length) {
        filters[key] = values;
      }
    });

    return filters;
  }, []);

  const fetchDropdownOptions = useCallback(async ({
    targetType,
    targetKey,
    subordinates = {},
    dealer = {},
  }) => {
    try {
      const body = {
        flow_name: FLOW_NAME,
        target_type: targetType,
        target_key: targetKey,
        subordinates,
        dealer,
        product_tags: {},
      };

      const res = await axios.post(
        `${backendUrl}/filters/dropdown-options`,
        body,
        { headers: authHeaders }
      );

      return (res.data?.values || [])
        .map(normalizeFilterOption)
        .filter(Boolean);
    } catch (error) {
      console.error(
        `Error fetching dropdown options for ${targetType}/${targetKey}:`,
        error
      );
      return [];
    }
  }, [authHeaders]);

  const fetchGroupingOptions = useCallback(async () => {
    try {
      const res = await axios.get(`${backendUrl}/grouping-options`, {
        headers: authHeaders,
      });

      const apiPositions = Array.isArray(res.data?.actorPositions)
        ? res.data.actorPositions
            .map((item) => {
              const value = String(item?.value || "").trim().toLowerCase();
              if (!value) return null;
              return {
                value,
                label: String(item?.label || value.toUpperCase()).trim(),
              };
            })
            .filter(Boolean)
        : [];

      if (apiPositions.length) {
        setActorPositions(apiPositions);
      }
    } catch (error) {
      console.error("Error fetching actor dashboard filter metadata:", error);
    }
  }, [authHeaders]);

  const loadFilterOptionsForTab = useCallback(async (
    tabKey,
    actorSource = draftActorFilters,
    dealerSource = draftDealerFilters
  ) => {
    if (!tabKey) return;

    setLoadingFilterOptions(true);

    try {
      if (isActorTab(tabKey)) {
        const values = await fetchDropdownOptions({
          targetType: "subordinate",
          targetKey: tabKey,
          subordinates: buildSubordinateFilters(actorSource, {
            upToPosition: tabKey,
          }),
          dealer: buildDealerFiltersPayload(dealerSource),
        });

        setActorOptionsMap((old) => ({
          ...old,
          [tabKey]: values,
        }));
        return;
      }

      const values = await fetchDropdownOptions({
        targetType: "dealer",
        targetKey: tabKey,
        subordinates: buildSubordinateFilters(actorSource),
        dealer: buildDealerFiltersPayload(dealerSource, {
          excludeType: tabKey,
        }),
      });

      setFilterValues((old) => ({
        ...old,
        [tabKey]: values,
      }));
    } finally {
      setLoadingFilterOptions(false);
    }
  }, [
    buildDealerFiltersPayload,
    buildSubordinateFilters,
    draftActorFilters,
    draftDealerFilters,
    fetchDropdownOptions,
  ]);

  const currentTabOptions = useMemo(() => {
    if (isActorTab(activeFilterTab)) {
      return actorOptionsMap[activeFilterTab] || [];
    }
    return filterValues[activeFilterTab] || [];
  }, [activeFilterTab, actorOptionsMap, filterValues]);

  const currentTabSelected = useMemo(() => {
    if (isActorTab(activeFilterTab)) {
      return draftActorFilters[activeFilterTab] || [];
    }
    return draftDealerFilters[activeFilterTab] || [];
  }, [activeFilterTab, draftActorFilters, draftDealerFilters]);

  const filteredCurrentOptions = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return currentTabOptions;

    return currentTabOptions.filter((item) => {
      const raw =
        `${item.label || ""} ${item.name || ""} ${item.code || ""} ${item.value || ""}`.toLowerCase();
      return raw.includes(q);
    });
  }, [searchText, currentTabOptions]);

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

  const draftSelectedFiltersCount = useMemo(() => {
    const actorCount = Object.values(draftActorFilters).reduce(
      (sum, arr) => sum + (arr?.length || 0),
      0
    );
    const dealerCount = Object.values(draftDealerFilters).reduce(
      (sum, arr) => sum + (arr?.length || 0),
      0
    );
    return actorCount + dealerCount;
  }, [draftActorFilters, draftDealerFilters]);

  const activeFilterTabs = useMemo(
    () => [...actorPositions, ...DEALER_FILTER_TYPES],
    [actorPositions]
  );
  const [topKpis, setTopKpis] = useState({
    mtdSales: null,
    m1: null,
    m2: null,
    m3: null,
    lyMtd: null,
    targetAchievement: null,
    stock: null,
    sec: null,
  });
  const [topKpisLoading, setTopKpisLoading] = useState(false);
  const [topKpisError, setTopKpisError] = useState("");

  const openFilterPanel = () => {
    setDraftActorFilters(cloneActorFilterMap(selectedActorFilters));
    setDraftDealerFilters(cloneDealerFilterMap(selectedDealerFilters));
    setSearchText("");
    setFilterPanelOpen(true);
  };

  const closeFilterPanel = () => {
    setFilterPanelOpen(false);
    setSearchText("");
  };

  const toggleSelection = (type, item) => {
    if (isActorTab(type)) {
      const orderedPositions = actorPositionOrder.length
        ? actorPositionOrder
        : ACTOR_POSITION_KEYS;
      const positionIndex = orderedPositions.indexOf(type);
      const itemIdentity = getTabItemIdentity(type, item);

      setDraftActorFilters((old) => {
        const prev = old[type] || [];
        const exists = prev.some(
          (selected) => getTabItemIdentity(type, selected) === itemIdentity
        );

        const next = {
          ...old,
          [type]: exists
            ? prev.filter(
                (selected) =>
                  getTabItemIdentity(type, selected) !== itemIdentity
              )
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

    const itemIdentity = getTabItemIdentity(type, item);
    setDraftDealerFilters((old) => {
      const prev = old[type] || [];
      const exists = prev.some(
        (selected) => getTabItemIdentity(type, selected) === itemIdentity
      );

      return {
        ...old,
        [type]:
          type === "top_outlet"
            ? exists
              ? []
              : [item]
            : exists
            ? prev.filter(
                (selected) =>
                  getTabItemIdentity(type, selected) !== itemIdentity
              )
            : [...prev, item],
      };
    });
  };

  const clearAllDraftFilters = () => {
    setDraftActorFilters({});
    setDraftDealerFilters(cloneDealerFilterMap());
    setActorOptionsMap({});
    setFilterValues(cloneDealerFilterMap());
    setSearchText("");
  };

  const applyFilters = () => {
    setSelectedActorFilters(cloneActorFilterMap(draftActorFilters));
    setSelectedDealerFilters(cloneDealerFilterMap(draftDealerFilters));
    closeFilterPanel();
  };

  useEffect(() => {
    fetchGroupingOptions();
  }, [fetchGroupingOptions]);

  useEffect(() => {
    const validTabs = [
      ...actorPositions.map((item) => item.value),
      ...DEALER_FILTER_TYPES.map((item) => item.key),
    ];
    if (validTabs.length && !validTabs.includes(activeFilterTab)) {
      setActiveFilterTab(validTabs[0]);
    }
  }, [actorPositions, activeFilterTab]);

  useEffect(() => {
    if (!filterPanelOpen || !activeFilterTab) return;
    loadFilterOptionsForTab(activeFilterTab, draftActorFilters, draftDealerFilters);
  }, [
    filterPanelOpen,
    activeFilterTab,
    draftActorFilters,
    draftDealerFilters,
    loadFilterOptionsForTab,
  ]);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (
        filterPanelOpen &&
        panelRef.current &&
        !panelRef.current.contains(event.target)
      ) {
        closeFilterPanel();
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [filterPanelOpen]);

  useEffect(() => {
    if (!filterPanelOpen) return undefined;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [filterPanelOpen]);

  const loadTopKpis = useCallback(async () => {
    if (!startDate || !endDate) return;

    setTopKpisLoading(true);
    setTopKpisError("");

    try {
      const data = await fetchActorDashboardTopKpis({
        startDate,
        endDate,
        subordinate_filters: buildSubordinateFilters(selectedActorFilters),
        dealer_filters: buildDealerFiltersPayload(selectedDealerFilters),
        authToken: localStorage.getItem("authToken"),
      });

      if (hasAnyKpiValue(data)) {
        setTopKpis({
          mtdSales: data?.mtdSales ?? null,
          m1: data?.m1 ?? null,
          m2: data?.m2 ?? null,
          m3: data?.m3 ?? null,
          lyMtd: data?.lyMtd ?? null,
          targetAchievement: data?.targetAchievement ?? null,
          stock: data?.stock ?? null,
          sec: data?.sec ?? null,
        });
      } else {
        setTopKpisError("No KPI data returned for selected filters.");
      }
    } catch (error) {
      console.error("Top KPI fetch failed:", error);
      setTopKpisError("Unable to load KPI data.");
    } finally {
      setTopKpisLoading(false);
    }
  }, [
    startDate,
    endDate,
    buildSubordinateFilters,
    buildDealerFiltersPayload,
    selectedActorFilters,
    selectedDealerFilters,
  ]);

  useEffect(() => {
    loadTopKpis();
  }, [loadTopKpis]);

  const startBound = useMemo(() => new Date(startDate), [startDate]);
  const endBound = useMemo(() => new Date(endDate), [endDate]);

  const coverageRunRateTrend = useMemo(() => {
    const filtered = MOCK_DATA.coverageRunRateDaily
        .filter((item) => {
          const d = toDayDate(item.date);
          return d >= startBound && d <= endBound;
        })
        .map((item) => ({
          ...item,
          label: formatDayLabel(item.date),
        }));

    return filtered.length
      ? filtered
      : MOCK_DATA.coverageRunRateDaily.map((item) => ({
          ...item,
          label: formatDayLabel(item.date),
        }));
  }, [startBound, endBound]);

  const extractionTrend = useMemo(() => {
    const filtered = MOCK_DATA.extractionTrendMonthly
      .filter((item) => {
        const d = toMonthDate(item.month);
        return d >= startBound && d <= endBound;
      })
      .map((item) => ({
        ...item,
        label: formatMonthLabel(item.month),
      }));

    return filtered.length
      ? filtered
      : MOCK_DATA.extractionTrendMonthly.map((item) => ({
          ...item,
          label: formatMonthLabel(item.month),
        }));
  }, [startBound, endBound]);

  const fixturePieRows = useMemo(
    () => toPieRows(MOCK_DATA.brandSecFixtureStats),
    []
  );
  const secPieRows = useMemo(
    () => toSecPieRows(MOCK_DATA.brandSecFixtureStats),
    []
  );

  const latestCoveragePoint = coverageRunRateTrend[coverageRunRateTrend.length - 1] || null;

  const insights = useMemo(() => {
    const lines = [];

    {
      const mtd = Number(topKpis.mtdSales || 0);
      const ly = Number(topKpis.lyMtd || 0);
      const diff = mtd - ly;
      if (diff >= 0) {
        lines.push(`MTD is up by ${diff.toFixed(1)} Cr vs LY-MTD. Push premium mix while momentum is positive.`);
      } else {
        lines.push(`MTD is down by ${Math.abs(diff).toFixed(1)} Cr vs LY-MTD. Focus recovery on fast-moving models.`);
      }
    }

    if (latestCoveragePoint) {
      lines.push(
        `Coverage is ${latestCoveragePoint.coveragePct}% with ${latestCoveragePoint.pending} pending visits. Convert pending dealers in next cycle.`
      );
    }

    lines.push(
      `Extraction share is ${MOCK_DATA.dealerSnapshot.extractionPct}% and SEC is ${Number(topKpis.sec || 0)}. Improve display fixtures to lift conversion.`
    );

    return lines;
  }, [latestCoveragePoint, topKpis]);

  const activeFilterChipItems = useMemo(() => {
    const chips = [];

    Object.entries(selectedActorFilters).forEach(([type, values]) => {
      (values || []).forEach((item) => {
        chips.push({
          key: `${type}-${item.code || item.value || item.label}`,
          label: item.label || item.name || item.value,
        });
      });
    });

    Object.entries(selectedDealerFilters).forEach(([type, values]) => {
      (values || []).forEach((item) => {
        chips.push({
          key: `${type}-${item.value || item.code || item.label}`,
          label: item.label || item.value,
        });
      });
    });

    return chips;
  }, [selectedActorFilters, selectedDealerFilters]);

  const currentTabLabel =
    actorPositions.find((item) => item.value === activeFilterTab)?.label ||
    DEALER_FILTER_TYPES.find((item) => item.key === activeFilterTab)?.label ||
    "Filter";

  return (
    <div className="actor-dashboard-page">
      <div className="actor-dashboard-header">
        <div>
          <h1>Actor Conversation Dashboard</h1>
          <p>
            {MOCK_DATA.actor.name} ({MOCK_DATA.actor.position}) • {MOCK_DATA.dealer.name} ({MOCK_DATA.dealer.code})
          </p>
        </div>

        <div className="header-actions">
          <div className="date-filter-row">
            <label>
              From
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>

          <button type="button" className="filter-open-btn" onClick={openFilterPanel}>
            <FaFilter />
            Filters
            {totalSelectedFiltersCount > 0 && (
              <span className="filter-open-btn__count">{totalSelectedFiltersCount}</span>
            )}
          </button>
        </div>
      </div>

      <div className="active-filter-strip">
        <div className="active-filter-strip__label">Active Filters</div>
        <div className="active-filter-strip__items">
          {activeFilterChipItems.length > 0 ? (
            activeFilterChipItems.map((item) => (
              <span key={item.key} className="active-filter-chip">
                {item.label}
              </span>
            ))
          ) : (
            <span className="active-filter-empty">No filters selected</span>
          )}
        </div>
      </div>

      {filterPanelOpen && (
        <div className="actor-filter-overlay">
          <div className="actor-filter-modal" ref={panelRef}>
            <div className="actor-filter-modal__header">
              <div>
                <h3>Filters</h3>
                <p>Choose filters for all reports</p>
              </div>
              <button type="button" className="clear-all-btn" onClick={clearAllDraftFilters}>
                <FaSyncAlt />
                Clear All
              </button>
            </div>

            <div className="actor-filter-modal__body">
              <div className="actor-filter-sidebar">
                <h4>Filters</h4>
                {activeFilterTabs.map((item) => {
                  const tabKey = item.value || item.key;
                  const selectedCount = isActorTab(tabKey)
                    ? (draftActorFilters[tabKey] || []).length
                    : (draftDealerFilters[tabKey] || []).length;

                  return (
                    <button
                      key={tabKey}
                      type="button"
                      className={activeFilterTab === tabKey ? "active" : ""}
                      onClick={() => {
                        setActiveFilterTab(tabKey);
                        setSearchText("");
                      }}
                    >
                      <span>{item.label}</span>
                      {selectedCount > 0 && <b>{selectedCount}</b>}
                    </button>
                  );
                })}
              </div>

              <div className="actor-filter-content">
                <div className="actor-filter-content__head">
                  <h4>Select {currentTabLabel}</h4>
                  <div className="actor-filter-search">
                    <FaSearch />
                    <input
                      type="text"
                      placeholder="Search name or code"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                    />
                  </div>
                </div>

                <div className="actor-filter-options">
                  {loadingFilterOptions ? (
                    <div className="actor-filter-options__empty">Loading options...</div>
                  ) : filteredCurrentOptions.length > 0 ? (
                    filteredCurrentOptions.map((item) => {
                      const itemIdentity = getTabItemIdentity(activeFilterTab, item);
                      const isSelected = currentTabSelected.some(
                        (selected) =>
                          getTabItemIdentity(activeFilterTab, selected) === itemIdentity
                      );

                      return (
                        <button
                          key={item.code || `${activeFilterTab}-${String(item.value || item.label)}`}
                          type="button"
                          className={`actor-filter-option ${isSelected ? "is-selected" : ""}`}
                          onClick={() => toggleSelection(activeFilterTab, item)}
                        >
                          <input type="checkbox" checked={isSelected} readOnly />
                          <div className="actor-filter-option__meta">
                            <strong>{item.label || item.name || item.value}</strong>
                            {isActorTab(activeFilterTab) && item.code && (
                              <small>
                                {currentTabLabel.toUpperCase()} • {item.code}
                              </small>
                            )}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="actor-filter-options__empty">No options found</div>
                  )}
                </div>
              </div>
            </div>

            <div className="actor-filter-modal__footer">
              <div className="footer-status">
                {draftSelectedFiltersCount > 0
                  ? `${draftSelectedFiltersCount} filters selected`
                  : "No filters selected"}
              </div>
              <div className="footer-actions">
                <button type="button" className="footer-cancel-btn" onClick={closeFilterPanel}>
                  Cancel
                </button>
                <button type="button" className="footer-apply-btn" onClick={applyFilters}>
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="kpi-grid">
        <div className="kpi-card">
          <span>MTD Sales</span>
          <strong>{topKpisLoading ? "Loading..." : formatCrOrDash(topKpis.mtdSales)}</strong>
        </div>
        <div className="kpi-card">
          <span>M1 / M2 / M3</span>
          <strong>
            {topKpisLoading
              ? "Loading..."
              : `${formatCrOrDash(topKpis.m1)} / ${formatCrOrDash(topKpis.m2)} / ${formatCrOrDash(topKpis.m3)}`}
          </strong>
        </div>
        <div className="kpi-card">
          <span>LY-MTD</span>
          <strong>{topKpisLoading ? "Loading..." : formatCrOrDash(topKpis.lyMtd)}</strong>
        </div>
        <div className="kpi-card">
          <span>Target Achievement</span>
          <strong>{topKpisLoading ? "Loading..." : formatPctOrDash(topKpis.targetAchievement)}</strong>
        </div>
        <div className="kpi-card">
          <span>Stock / SEC</span>
          <strong>
            {topKpisLoading
              ? "Loading..."
              : `${formatCountOrDash(topKpis.stock)} / ${formatCountOrDash(topKpis.sec)}`}
          </strong>
        </div>
      </div>
      {topKpisError ? <div className="kpi-error">{topKpisError}</div> : null}

      <section className="panel activation-panel">
        <header className="activation-panel-header">
          <div className="activation-title-wrap">
            <span className="activation-title-bar" />
            <div>
              <h3>Activation (Sell-Out)</h3>
              <p>Sell-out value and volume summary</p>
            </div>
          </div>
        </header>

        <div className="activation-table-wrap">
          <table className="activation-table">
            <thead>
              <tr>
                <th>Metric</th>
                {ACT_TABLE_COLUMNS.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ACT_TABLE_ROWS.map((row) => (
                <tr key={row.metric}>
                  <td className="metric-cell">
                    <div className="metric-main">{row.metric}</div>
                    {row.subLabel ? <div className="metric-sub">{row.subLabel}</div> : null}
                  </td>
                  <td>{formatCount(row.feb)}</td>
                  <td>{formatCount(row.mar)}</td>
                  <td>{formatCount(row.apr)}</td>
                  <td>{formatCount(row.mtd)}</td>
                  <td>{formatCount(row.lmtd)}</td>
                  <td>{formatCount(row.ftd)}</td>
                  <td className={`growth-cell ${getGrowthClass(row.gdPct)}`}>{formatPct(row.gdPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="dash-grid two-col">
        <section className="panel">
          <header>
            <h3>Daily Coverage Run-Rate</h3>
            <p>Done vs Pending with daily coverage %</p>
          </header>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={coverageRunRateTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis yAxisId="count" />
              <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="count" dataKey="done" stackId="a" fill="#22c55e" />
              <Bar yAxisId="count" dataKey="pending" stackId="a" fill="#f59e0b" />
              <Line yAxisId="pct" type="monotone" dataKey="coveragePct" stroke="#2563eb" strokeWidth={2.5} />
            </ComposedChart>
          </ResponsiveContainer>
        </section>

        <section className="panel">
          <header>
            <h3>Actor-wise Performance</h3>
            <p>Who completed how many scheduled visits</p>
          </header>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={MOCK_DATA.actorCoveragePerformance} layout="vertical" margin={{ left: 12, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="actor" type="category" width={84} />
              <Tooltip />
              <Legend />
              <Bar dataKey="done" name="Done" stackId="x" fill="#16a34a" />
              <Bar dataKey="pending" name="Pending" stackId="x" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      <div className="dash-grid two-col">
        <section className="panel">
          <header>
            <h3>Extraction Trend</h3>
            <p>Month-wise extraction trend (primary reporting view)</p>
          </header>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={extractionTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="samsung" name="Samsung" stroke={BRAND_COLORS.Samsung} strokeWidth={2} />
              <Line type="monotone" dataKey="vivo" name="Vivo" stroke={BRAND_COLORS.Vivo} strokeWidth={2} />
              <Line type="monotone" dataKey="oppo" name="Oppo" stroke={BRAND_COLORS.Oppo} strokeWidth={2} />
              <Line type="monotone" dataKey="xiaomi" name="Xiaomi" stroke={BRAND_COLORS.Xiaomi} strokeWidth={2} />
              <Line type="monotone" dataKey="apple" name="Apple" stroke={BRAND_COLORS.Apple} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </section>

        <section className="panel extraction-fixtures-panel">
          <header>
            <h3>Brand Fixtures + SEC</h3>
            <p>Inner ring = Fixtures, Outer ring = SEC</p>
          </header>
          <div className="fixture-sec-grid">
            <div className="fixture-pie-wrap">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={secPieRows}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={84}
                    innerRadius={62}
                    paddingAngle={1}
                  >
                    {secPieRows.map((entry) => (
                      <Cell key={`sec-${entry.name}`} fill={BRAND_COLORS[entry.name] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <Pie
                    data={fixturePieRows}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={56}
                    innerRadius={34}
                    paddingAngle={1}
                  >
                    {fixturePieRows.map((entry) => (
                      <Cell key={`fixture-${entry.name}`} fill={BRAND_COLORS[entry.name] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="other-brand-stats">
              <h4>Fixture + SEC Table</h4>
              <div className="other-brand-table-wrap">
                <table className="other-brand-table">
                  <thead>
                    <tr>
                      <th>Brand</th>
                      <th>Fixtures</th>
                      <th>SEC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_DATA.brandSecFixtureStats.map((row) => (
                      <tr key={row.brand}>
                        <td>{row.brand}</td>
                        <td>{formatCount(row.fixtures)}</td>
                        <td>{formatCount(row.sec)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="dash-grid two-col">
        <section className="panel">
          <header>
            <h3>Dealer Hierarchy</h3>
            <p>Reporting chain for current dealer</p>
          </header>
          <ol className="hierarchy-list">
            {MOCK_DATA.hierarchy.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>

        <section className="panel">
          <header>
            <h3>Dealer Snapshot</h3>
            <p>Quick data points for conversation</p>
          </header>
          <table className="snapshot-table">
            <tbody>
              <tr>
                <th>Dealer</th>
                <td>{MOCK_DATA.dealer.name}</td>
              </tr>
              <tr>
                <th>Code</th>
                <td>{MOCK_DATA.dealer.code}</td>
              </tr>
              <tr>
                <th>Town</th>
                <td>{MOCK_DATA.dealer.town}</td>
              </tr>
              <tr>
                <th>Category</th>
                <td>{MOCK_DATA.dealer.category}</td>
              </tr>
              <tr>
                <th>Extraction %</th>
                <td>{MOCK_DATA.dealerSnapshot.extractionPct}%</td>
              </tr>
              <tr>
                <th>Stock Units</th>
                <td>{MOCK_DATA.dealerSnapshot.stock}</td>
              </tr>
              <tr>
                <th>SEC</th>
                <td>{MOCK_DATA.dealerSnapshot.sec}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>

      <section className="panel stock-table-panel">
        <header>
          <h3>Samsung Model Wise Stock</h3>
          <p>Scrollable stock table for Samsung models</p>
        </header>

        <div className="stock-table-brand-chip">Brand: Samsung</div>

        <div className="stock-table-wrap">
          <table className="stock-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Product Category</th>
                <th>Price</th>
                <th>Segment</th>
                <th>Model Code</th>
                <th>Product Code</th>
                <th>Category</th>
                <th>Tags</th>
                <th>Stock Units</th>
                <th>Age (Days)</th>
              </tr>
            </thead>
            <tbody>
              {SAMSUNG_MODEL_STOCK_ROWS.map((row) => (
                <tr key={row.product_code}>
                  <td>{row.product_name}</td>
                  <td>{row.product_category}</td>
                  <td>{formatCurrency(row.price)}</td>
                  <td>{row.segment}</td>
                  <td>{row.model_code}</td>
                  <td>{row.product_code}</td>
                  <td>{row.category}</td>
                  <td>
                    <div className="tag-badge-list">
                      {(row.tags || []).map((tag) => (
                        <span className="tag-badge" key={`${row.product_code}-${tag}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>{formatCount(row.stock_units)}</td>
                  <td className={`age-cell ${getAgeClass(row.age_days)}`}>{formatCount(row.age_days)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel insight-panel">
        <header>
          <h3>Talk Points</h3>
          <p>Auto-generated conversation starters for field sales</p>
        </header>

        <ul>
          {insights.map((line, idx) => (
            <li key={`${line}-${idx}`}>{line}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default ActorDashboard;
