import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import config from "../../../config";
import "./style.scss";
import { FaFilter, FaSyncAlt, FaTimes } from "react-icons/fa";

const backendUrl = config.backend_url;

const toInputDate = (d) => {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

const getPreviousIsoDate = (dateStr) => {
  const text = String(dateStr || "").trim();
  if (!text) return "";

  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month, day));

  if (Number.isNaN(parsed.getTime())) return "";

  parsed.setUTCDate(parsed.getUTCDate() - 1);
  return parsed.toISOString().slice(0, 10);
};

const getNextIsoDate = (dateStr) => {
  const text = String(dateStr || "").trim();
  if (!text) return "";

  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month, day));

  if (Number.isNaN(parsed.getTime())) return "";

  parsed.setUTCDate(parsed.getUTCDate() + 1);
  return parsed.toISOString().slice(0, 10);
};

const getAuthHeader = () => {
  const raw = localStorage.getItem("authToken") || "";
  if (!raw) return {};
  return { Authorization: raw.startsWith("Bearer ") ? raw : `Bearer ${raw}` };
};

const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const formatNum = (v) => safeNum(v).toLocaleString("en-IN");

const formatDecimal = (v, digits = 2) => {
  const n = safeNum(v);
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
};

const formatMoneyNormal = (v) => `₹${safeNum(v).toLocaleString("en-IN")}`;

const formatMoneyCompact = (v) => {
  const n = safeNum(v);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} Lac`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(2)} K`;
  return `₹${n.toLocaleString("en-IN")}`;
};

const pickFirst = (obj, keys = [], fallback = 0) => {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) return obj[key];
  }
  return fallback;
};

const pickFirstPresent = (obj, keys = []) => {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) return obj[key];
  }
  return undefined;
};

const getDateValueFromRow = (row = {}, isoDate = "") => {
  const date = String(isoDate || "").trim();
  if (!date) return undefined;

  const [yyyy, mm, dd] = date.split("-");
  const alt1 = `${dd}-${mm}-${yyyy}`;
  const alt2 = `${dd}/${mm}/${yyyy}`;
  const alt3 = `${yyyy}/${mm}/${dd}`;
  const candidates = [date, alt1, alt2, alt3].filter(Boolean);

  for (const key of candidates) {
    if (row?.[key] !== undefined && row?.[key] !== null) return row[key];
  }

  const matchKey = Object.keys(row || {}).find((key) =>
    candidates.some((candidate) => String(key).includes(candidate))
  );
  if (matchKey) return row[matchKey];

  return undefined;
};

const getGroupFamilyName = (groupRow = {}) => {
  const firstChild = Array.isArray(groupRow.children) ? groupRow.children[0] || {} : {};
  const explicitFamily =
    pickFirst(groupRow, ["family_name", "familyName", "model_family", "modelFamily"], "") ||
    pickFirst(firstChild, ["family_name", "familyName", "model_family", "modelFamily"], "");

  if (String(explicitFamily || "").trim()) return String(explicitFamily).trim();

  const firstChildName = String(firstChild?.name || "").trim();
  if (!firstChildName) return "Model Family";

  return firstChildName.replace(/\s*\([^)]*\)\s*$/, "").trim() || firstChildName;
};

const buildFamilyGroupedRows = (rows = []) => {
  const buckets = new Map();

  rows.forEach((row) => {
    const familyName = getGroupFamilyName(row);
    const familyKey = String(familyName || "").toLowerCase().trim() || "unknown";

    if (!buckets.has(familyKey)) {
      buckets.set(familyKey, {
        ...row,
        model_code: familyName,
        model: familyName,
        name: familyName,
        familyName,
        product_category: "",
        category: "",
        variantCount: 0,
        total: 0,
        totalValue: 0,
        LM: 0,
        MTD: 0,
        FTD: 0,
        D1: 0,
        SPD_STK: 0,
        MDD_STK: 0,
        RETAIL_STK: 0,
        ADS: 0,
        WOS: 0,
        GR: 0,
        dp: 0,
        minDp: Number.POSITIVE_INFINITY,
        maxDp: 0,
        tags: [],
        children: [],
        _ratioCount: 0,
      });
    }

    const bucket = buckets.get(familyKey);
    const rowChildren = Array.isArray(row.children) ? row.children : [];

    bucket.variantCount += safeNum(row.variantCount) || rowChildren.length;
    bucket.total += safeNum(row.total);
    bucket.totalValue += safeNum(row.totalValue);
    bucket.LM += safeNum(row.LM);
    bucket.MTD += safeNum(row.MTD);
    bucket.FTD += safeNum(row.FTD);
    bucket.D1 += safeNum(row.D1);
    bucket.SPD_STK += safeNum(row.SPD_STK);
    bucket.MDD_STK += safeNum(row.MDD_STK);
    bucket.RETAIL_STK += safeNum(row.RETAIL_STK);
    bucket.ADS += safeNum(row.ADS);
    bucket.WOS += safeNum(row.WOS);
    bucket.GR += safeNum(row.GR);
    bucket._ratioCount += 1;
    bucket.dp = Math.max(bucket.dp, safeNum(row.dp));
    bucket.minDp = Math.min(bucket.minDp, safeNum(row.dp) || Number.POSITIVE_INFINITY);
    bucket.maxDp = Math.max(bucket.maxDp, safeNum(row.dp));

    if (!bucket.product_category) {
      bucket.product_category =
        row.product_category ||
        row.category ||
        (rowChildren.find((child) => child?.product_category)?.product_category || "");
    }
    if (!bucket.category) {
      bucket.category = row.category || bucket.product_category || "";
    }

    const mergedTags = new Set([...(bucket.tags || []), ...(row.tags || [])]);
    bucket.tags = [...mergedTags];

    rowChildren.forEach((child) => {
      bucket.children.push({
        ...child,
        parentModelCode: row.model_code || row.model || row.name || "-",
      });
    });
  });

  return [...buckets.values()].map((bucket) => {
    const { _ratioCount, ...rest } = bucket;
    const ratioCount = safeNum(_ratioCount) || 1;
    return {
      ...rest,
      ADS: safeNum(rest.ADS) / ratioCount,
      WOS: safeNum(rest.WOS) / ratioCount,
      GR: safeNum(rest.GR) / ratioCount,
      minDp:
        rest.minDp === Number.POSITIVE_INFINITY
          ? safeNum(rest.maxDp || rest.dp)
          : safeNum(rest.minDp),
      maxDp: safeNum(rest.maxDp || rest.dp),
    };
  });
};

const getVariantCodeLabel = (child = {}) => {
  const modelCode = String(
    child.parentModelCode || child.model_code || child.model || ""
  ).trim();
  const productCode = String(child.product_code || "").trim();

  if (modelCode && productCode && modelCode !== productCode) {
    return `${modelCode} / ${productCode}`;
  }

  return modelCode || productCode || "-";
};

const getFamilyDpRangeLabel = (groupRow = {}, formatter = formatMoneyNormal) => {
  const minDp = safeNum(groupRow.minDp);
  const maxDp = safeNum(groupRow.maxDp || groupRow.dp);

  if (!minDp && !maxDp) return formatter(0);
  if (minDp && maxDp && minDp !== maxDp) {
    return `${formatter(minDp)} - ${formatter(maxDp)}`;
  }

  return formatter(maxDp || minDp);
};

const SEGMENT_ORDER = [
  "0-6",
  "6-10",
  "10-20",
  "20-30",
  "30-40",
  "40-70",
  "70-100",
  "100-120",
  "120",
  "others",
  "unknown",
];

const segmentSort = (a, b) => {
  const ai = SEGMENT_ORDER.indexOf(String(a).toLowerCase());
  const bi = SEGMENT_ORDER.indexOf(String(b).toLowerCase());

  if (ai !== -1 && bi !== -1) return ai - bi;
  if (ai !== -1) return -1;
  if (bi !== -1) return 1;

  return String(a).localeCompare(String(b), undefined, { numeric: true });
};

const normalizeSegmentMap = (payload) => {
  const raw = payload?.data || payload || {};
  const source = raw?.data || raw?.segments || raw;

  if (Array.isArray(source)) {
    const grouped = {};
    source.forEach((item) => {
      const segment = String(item?.segment || "unknown");
      if (!grouped[segment]) grouped[segment] = [];
      grouped[segment].push(item);
    });
    return grouped;
  }

  if (typeof source === "object" && source !== null) {
    return source;
  }

  return {};
};

const normalizeRow = (row = {}, segmentKey = "", d1Date = "") => {
  const dp = pickFirst(row, ["dp", "price", "DP", "avgPrice", "average_price", "unit_price"]);
  const lm = pickFirst(row, ["LM", "lm"]);
  const mtd = pickFirst(row, ["MTD", "mtd"]);
  const ftd = pickFirst(row, ["FTD", "ftd"]);
  let d1Raw = pickFirstPresent(row, [
    "D1",
    "d1",
    "D_1",
    "d_1",
    "D-1",
    "d-1",
    "D1_VOL",
    "d1_vol",
    "D_1_VOL",
    "d_1_vol",
    "day_before_yesterday",
    "dayBeforeYesterday",
    "day_before_yesterday_vol",
    "dayBeforeYesterdayVol",
    "db_yesterday",
    "DB_YESTERDAY",
  ]);
  if (d1Raw === undefined && d1Date) {
    d1Raw = getDateValueFromRow(row, d1Date);
  }
  if (d1Raw === undefined) {
    const matchKey = Object.keys(row || {}).find((key) =>
      /(d[\s_-]?1|day[\s_-]?before[\s_-]?yesterday|db[\s_-]?yesterday|dby)/i.test(key)
    );
    if (matchKey) d1Raw = row[matchKey];
  }
  const d1 = safeNum(d1Raw);
  const gr = pickFirst(row, ["GR", "gr"]);
  const ads = pickFirst(row, ["ADS", "ads"]);
  const wos = pickFirst(row, ["WOS", "wos"]);
  const total = pickFirst(row, ["total", "Total", "qty", "quantity", "sales"]);
  const totalValue = pickFirst(row, ["totalValue", "total_value", "value", "salesValue", "sales_value"]);

  return {
    rowType: row.rowType || "item",
    segment: row.segment || segmentKey || "unknown",
    product_code: row.product_code || row.productCode || row.model || "-",
    model: row.model || row.model_no || row.modelCode || row.model_code || row.product_code || "-",
    model_code: row.model_code || row.model || row.model_no || "-",
    name: row.name || row.product_name || row.productName || row.description || row.model_no || "-",
    product_category: row.product_category || "",
    category: row.category || "",
    tags: Array.isArray(row.tags) ? row.tags : [],
    dp: safeNum(dp),
    LM: safeNum(lm),
    MTD: safeNum(mtd),
    FTD: safeNum(ftd),
    D1: d1,
    SPD_STK: 0,
    MDD_STK: 0,
    RETAIL_STK: 0,
    GR: safeNum(gr),
    ADS: safeNum(ads),
    WOS: safeNum(wos),
    total: safeNum(total),
    totalValue: safeNum(totalValue),
    variantCount: safeNum(row.variantCount),
    children: Array.isArray(row.children)
      ? row.children.map((child) => normalizeRow(child, segmentKey, d1Date))
      : [],
  };
};

const buildGroupLookupKey = (segment, row = {}) =>
  `group::${segment}::${row.model_code || row.model || ""}::${row.name || ""}`;

const buildItemLookupKey = (segment, row = {}) =>
  `item::${segment}::${row.product_code || ""}::${row.model_code || row.model || ""}::${row.name || ""}`;

const applyD1FromFtdSnapshot = (baseRows = {}, d1Rows = {}) => {
  const d1Lookup = new Map();

  Object.keys(d1Rows || {}).forEach((segment) => {
    (d1Rows[segment] || []).forEach((row) => {
      if ((row.children || []).length) {
        d1Lookup.set(buildGroupLookupKey(segment, row), safeNum(row.FTD));
        (row.children || []).forEach((child) => {
          d1Lookup.set(buildItemLookupKey(segment, child), safeNum(child.FTD));
        });
      } else {
        d1Lookup.set(buildItemLookupKey(segment, row), safeNum(row.FTD));
      }
    });
  });

  Object.keys(baseRows || {}).forEach((segment) => {
    (baseRows[segment] || []).forEach((row) => {
      if ((row.children || []).length) {
        if (!safeNum(row.D1)) {
          row.D1 = safeNum(d1Lookup.get(buildGroupLookupKey(segment, row)));
        }

        (row.children || []).forEach((child) => {
          if (!safeNum(child.D1)) {
            child.D1 = safeNum(d1Lookup.get(buildItemLookupKey(segment, child)));
          }
        });

        if (!safeNum(row.D1)) {
          row.D1 = (row.children || []).reduce((sum, child) => sum + safeNum(child.D1), 0);
        }
      } else if (!safeNum(row.D1)) {
        row.D1 = safeNum(d1Lookup.get(buildItemLookupKey(segment, row)));
      }
    });
  });
};

const hasMeaningfulMetrics = (row = {}) => {
  const keys = [
    "LM",
    "MTD",
    "FTD",
    "D1",
    "GR",
    "ADS",
    "WOS",
    "totalValue",
    "SPD_STK",
    "MDD_STK",
    "RETAIL_STK",
  ];
  return keys.some((key) => Math.abs(safeNum(row[key])) > 0);
};

const getMaxOf = (rows, key) => {
  return rows.reduce((max, row) => Math.max(max, safeNum(row[key])), 0);
};

const getHeatCellStyle = (value, max, rgb = "63,95,255") => {
  const num = safeNum(value);

  if (!max || num <= 0) {
    return {
      backgroundColor: "#f8faff",
      color: "#7f8aa5",
      fontWeight: 700,
    };
  }

  const ratio = num / max;
  const alpha = 0.08 + ratio * 0.22;

  return {
    backgroundColor: `rgba(${rgb}, ${alpha})`,
    color: ratio > 0.72 ? "#1733a3" : "#24314e",
    fontWeight: ratio > 0.72 ? 800 : 700,
  };
};

const getGrowthStyle = (value) => {
  const num = safeNum(value);

  if (num > 0) {
    const alpha = Math.min(0.28, 0.08 + Math.abs(num) / 400);
    return {
      backgroundColor: `rgba(16, 185, 129, ${alpha})`,
      color: "#047857",
      fontWeight: 800,
    };
  }

  if (num < 0) {
    const alpha = Math.min(0.28, 0.08 + Math.abs(num) / 400);
    return {
      backgroundColor: `rgba(239, 68, 68, ${alpha})`,
      color: "#b91c1c",
      fontWeight: 800,
    };
  }

  return {
    backgroundColor: "#f8faff",
    color: "#7f8aa5",
    fontWeight: 700,
  };
};

const KpiCard = ({ label, value, subtle }) => {
  return (
    <div className="tss-kpi-card">
      <div className="tss-kpi-label">{label}</div>
      <div className="tss-kpi-value">{value}</div>
      {subtle ? <div className="tss-kpi-subtle">{subtle}</div> : null}
    </div>
  );
};

const DEALER_FILTER_TYPES = [
  { key: "zone", label: "Zone" },
  { key: "district", label: "District" },
  { key: "town", label: "Town" },
  { key: "category", label: "Category" },
  { key: "top_outlet", label: "Top Outlet" },
];

const ACTOR_POSITION_KEYS = ["smd", "zsm", "asm", "mdd", "tse", "so", "dealer"];
const FLOW_NAME = "default_sales_flow";

const isActorTab = (tabKey) => ACTOR_POSITION_KEYS.includes(tabKey);

const normalizeFilterOption = (item) => {
  if (!item) return null;
  if (typeof item === "string") return { label: item, value: item };

  const value = item.value ?? item.tag ?? item.name ?? item.label ?? item.code;
  if (!value) return null;

  return {
    ...item,
    label: item.label || item.name || item.tag || item.value || item.code,
    value,
  };
};

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



export default function TopSellingSelf() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const [search, setSearch] = useState("");
  const [segmentMap, setSegmentMap] = useState({});
  const [apiSummary, setApiSummary] = useState(null);
  const [moneyView, setMoneyView] = useState("compact");
  const [activeSegment, setActiveSegment] = useState("all");
  const [sortBy, setSortBy] = useState("mtd");
  const [groupBy, setGroupBy] = useState("model");
  const [showDp, setShowDp] = useState(false);

  const [categoryOptions, setCategoryOptions] = useState([]);
  const [tagOptions, setTagOptions] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);


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


  const fetchDropdownOptions = async ({
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

    return (res.data?.values || []).map(normalizeFilterOption).filter(Boolean);
  } catch (error) {
    console.error(
      `Error fetching dropdown options for ${targetType}/${targetKey}:`,
      error
    );
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

  const loadFilterOptionsForTab = async (tabKey) => {
    if (!tabKey) return;

    setLoadingFilterOptions(true);

    try {
      if (isActorTab(tabKey)) {
        const values = await fetchDropdownOptions({
          targetType: "subordinate",
          targetKey: tabKey,
          subordinates: buildSubordinateFilters(selectedActorFilters, {
            upToPosition: tabKey,
          }),
          dealer: buildDealerFiltersPayload(),
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
        subordinates: buildSubordinateFilters(),
        dealer: buildDealerFiltersPayload(selectedDealerFilters, {
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

  const currentTabOptions = useMemo(() => {
    if (isActorTab(activeFilterTab)) {
      return actorOptionsMap[activeFilterTab] || [];
    }
    return filterValues[activeFilterTab] || [];
  }, [activeFilterTab, actorOptionsMap, filterValues]);

  const currentTabSelected = useMemo(() => {
    if (isActorTab(activeFilterTab)) {
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
  if (isActorTab(type)) {
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

  setFilterValues(defaultDealerFilterValues);
};

  const removeSelection = (type, item) => {
    if (isActorTab(type)) {
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
    if (isActorTab(activeFilterTab)) {
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
    setSelectedActorFilters({});
    setSelectedDealerFilters(defaultDealerFilterValues);
    setActorOptionsMap({});
    setFilterValues(defaultDealerFilterValues);
    setSearchText("");
    setActiveFilterTab(actorPositions[0]?.value || "zone");
    setFilterPanelOpen(false);
  };


  const renderChips = (type) => {
    const selected = isActorTab(type)
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


  useEffect(() => {
    fetchGroupingOptions();
  }, []);

  useEffect(() => {
    if (!actorPositions.length) return;

    const actorTabSet = new Set(actorPositions.map((item) => item.value));
    const availableStaticTabs = [...DEALER_FILTER_TYPES];

    if (
      !actorTabSet.has(activeFilterTab) &&
      !availableStaticTabs.some((item) => item.key === activeFilterTab)
    ) {
      setActiveFilterTab(actorPositions[0]?.value || "zone");
    }
  }, [actorPositions, activeFilterTab]);

  useEffect(() => {
    if (!filterPanelOpen || !activeFilterTab) return;
    loadFilterOptionsForTab(activeFilterTab);
  }, [filterPanelOpen, activeFilterTab]);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (filterPanelOpen && panelRef.current && !panelRef.current.contains(event.target)) {
        setFilterPanelOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [filterPanelOpen]);

  useEffect(() => {
    if (!filterPanelOpen) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [filterPanelOpen]);



  const [metaInfo, setMetaInfo] = useState({
    usedDefaultDateRange: true,
    ftdDate: "",
    d1Date: "",
    groupBy: "product_code",
  });

  const [expandedGroups, setExpandedGroups] = useState({});

  const hasManualDate = Boolean(startDate || endDate);

  const moneyFormatter = (value) =>
    moneyView === "compact" ? formatMoneyCompact(value) : formatMoneyNormal(value);

  const ftdBaseLabel = "FTD";
  const ftdColumnLabel = metaInfo?.ftdDate ? `${ftdBaseLabel} (${metaInfo.ftdDate})` : ftdBaseLabel;
  const d1ColumnLabel = metaInfo?.d1Date ? `D-1 (${metaInfo.d1Date})` : "D-1";
  // const ftdColumnLabel = "FTD Vol";


  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearAllFilters = () => {
    setSearch("");
    setStartDate(null);
    setEndDate(null);
    setSelectedCategory("");
    setSelectedTags([]);
    setActiveSegment("all");
    setSortBy("mtd");
    setGroupBy("product_code");
  };

  const buildUrl = () => {
    const params = new URLSearchParams();

    if (startDate) params.set("startDate", toInputDate(startDate));
    if (endDate) params.set("endDate", toInputDate(endDate));
    if (selectedCategory) params.set("productCategory", selectedCategory);
    if (selectedTags.length) params.set("tags", selectedTags.join(","));
    params.set("groupBy", groupBy);

    return `${backendUrl}/other-reports/samsung/top-selling-products?${params.toString()}`;
  };

  const fetchReport = async () => {
    try {
      setIsLoading(true);
      setErrorText("");

      const payload = {
        startDate: startDate ? toInputDate(startDate) : undefined,
        endDate: endDate ? toInputDate(endDate) : undefined,
        productCategory: selectedCategory || undefined,
        tags: selectedTags,
        groupBy,
        flow_name: FLOW_NAME,
        subordinate_filters: buildSubordinateFilters(),
        dealer_filters: buildDealerFiltersPayload(),
      };

      const res = await axios.post(
        `${backendUrl}/other-reports/samsung/top-selling-products`,
        payload,
        {
          headers: {
            ...getAuthHeader(),
            "Content-Type": "application/json",
          },
        }
      );

      const rawMap = normalizeSegmentMap(res.data);
      const responseMeta = res.data?.meta || {};
      const resolvedFtdDate =
        responseMeta?.ftdDate ||
        getNextIsoDate(responseMeta?.d1Date || responseMeta?.dayBeforeYesterdayDate || "");
      const resolvedD1Date =
        responseMeta?.d1Date ||
        responseMeta?.dayBeforeYesterdayDate ||
        getPreviousIsoDate(resolvedFtdDate);

      const cleaned = {};
      Object.keys(rawMap || {}).forEach((segmentKey) => {
        const arr = Array.isArray(rawMap[segmentKey]) ? rawMap[segmentKey] : [];
        cleaned[segmentKey] = arr.map((row) => normalizeRow(row, segmentKey, resolvedD1Date));
      });

      const normalizedRows = Object.values(cleaned)
        .flat()
        .flatMap((row) => [row, ...(row.children || [])]);
      const hasAnyD1 = normalizedRows.some((row) => safeNum(row.D1) > 0);
      const hasAnyFtd = normalizedRows.some((row) => safeNum(row.FTD) > 0);
      if (!hasAnyD1 && hasAnyFtd && resolvedD1Date) {
        const d1Payload = {
          ...payload,
          startDate: payload.startDate || resolvedD1Date,
          endDate: resolvedD1Date,
        };

        const d1Res = await axios.post(
          `${backendUrl}/other-reports/samsung/top-selling-products`,
          d1Payload,
          {
            headers: {
              ...getAuthHeader(),
              "Content-Type": "application/json",
            },
          }
        );

        const d1RawMap = normalizeSegmentMap(d1Res.data);
        const d1Cleaned = {};
        Object.keys(d1RawMap || {}).forEach((segmentKey) => {
          const arr = Array.isArray(d1RawMap[segmentKey]) ? d1RawMap[segmentKey] : [];
          d1Cleaned[segmentKey] = arr.map((row) => normalizeRow(row, segmentKey, ""));
        });

        applyD1FromFtdSnapshot(cleaned, d1Cleaned);

        const firstRawRow = Object.values(rawMap).flat().find(Boolean);
        console.warn(
          "D-1 missing in primary payload, applied fallback from shifted-date FTD snapshot. Sample row keys:",
          firstRawRow ? Object.keys(firstRawRow) : [],
          "fallbackDate:",
          resolvedD1Date
        );
      }

      setSegmentMap(cleaned);
      setApiSummary(res.data?.summary || null);
      setCategoryOptions(
        Array.isArray(res.data?.filters?.categories) ? res.data.filters.categories : []
      );
      setTagOptions(
        Array.isArray(res.data?.filters?.tags) ? res.data.filters.tags : []
      );
      setMetaInfo({
        usedDefaultDateRange: Boolean(res.data?.meta?.usedDefaultDateRange),
        ftdDate: resolvedFtdDate,
        d1Date: resolvedD1Date || "",
        groupBy: res.data?.meta?.groupBy || groupBy,
      });

      if ((res.data?.meta?.groupBy || groupBy) === "model") {
        const nextExpanded = {};
        Object.keys(rawMap || {}).forEach((segmentKey) => {
          const rows = Array.isArray(rawMap[segmentKey]) ? rawMap[segmentKey] : [];
          rows.forEach((group) => {
            const groupKey = `${segmentKey}__${group.model_code || group.model || group.name}`;
            nextExpanded[groupKey] = false;
          });
        });
        setExpandedGroups(nextExpanded);
      } else {
        setExpandedGroups({});
      }
    } catch (e) {
      console.error("Top selling products fetch failed:", e);
      setSegmentMap({});
      setApiSummary(null);
      setErrorText(
        e?.response?.data?.message || "Failed to fetch top selling products report"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedSegments = useMemo(() => {
    return Object.keys(segmentMap || {}).sort(segmentSort);
  }, [segmentMap]);

  const visibleSegmentRows = useMemo(() => {
    let segments = sortedSegments;

    if (activeSegment !== "all") {
      segments = segments.filter(
        (segment) => String(segment).toLowerCase() === String(activeSegment).toLowerCase()
      );
    }

    const next = {};
    segments.forEach((segment) => {
      let rows = [...(segmentMap[segment] || [])];

      rows = rows.filter((row) => {
        const q = search.trim().toLowerCase();
        const categoryOk = selectedCategory
          ? String(row.product_category || "").toLowerCase() === String(selectedCategory).toLowerCase() ||
            (row.children || []).some(
              (child) =>
                String(child.product_category || "").toLowerCase() === String(selectedCategory).toLowerCase()
            )
          : true;

        const tagsOk = selectedTags.length
          ? row.rowType === "group"
            ? selectedTags.every((tag) =>
                (row.children || []).some((child) => (child.tags || []).includes(tag))
              )
            : selectedTags.every((tag) => (row.tags || []).includes(tag))
          : true;

        const searchOk = !q
          ? true
          : row.rowType === "group"
          ? String(row.model_code || row.model || "").toLowerCase().includes(q) ||
            (row.children || []).some((child) => {
              const hay =
                `${child.parentModelCode || ""} ${child.product_code} ${child.model} ${child.name} ${child.product_category} ${(child.tags || []).join(" ")}`.toLowerCase();
              return hay.includes(q);
            })
          : `${row.product_code} ${row.model} ${row.name} ${row.product_category} ${(row.tags || []).join(" ")}`.toLowerCase().includes(q);

        return categoryOk && tagsOk && searchOk;
      });

      rows = rows.filter((row) => {
        if (row.rowType === "group") {
          return (
            hasMeaningfulMetrics(row) ||
            (row.children || []).some((child) => hasMeaningfulMetrics(child))
          );
        }
        return hasMeaningfulMetrics(row);
      });

      rows.sort((a, b) => {
        if (sortBy === "value") return safeNum(b.totalValue) - safeNum(a.totalValue);
        if (sortBy === "lm") return safeNum(b.LM) - safeNum(a.LM);
        if (sortBy === "mtd") return safeNum(b.MTD) - safeNum(a.MTD);
        if (sortBy === "ftd") return safeNum(b.FTD) - safeNum(a.FTD);
        if (sortBy === "gr") return safeNum(b.GR) - safeNum(a.GR);
        if (sortBy === "ads") return safeNum(b.ADS) - safeNum(a.ADS);
        if (sortBy === "wos") return safeNum(b.WOS) - safeNum(a.WOS);
        if (sortBy === "dp") return safeNum(b.dp) - safeNum(a.dp);
        return safeNum(b.MTD) - safeNum(a.MTD);
      });

      if (groupBy === "model") {
        rows = buildFamilyGroupedRows(rows);
      }

      next[segment] = rows;
    });

    return next;
  }, [sortedSegments, segmentMap, activeSegment, selectedCategory, selectedTags, search, sortBy]);

  const rowsForHeat = useMemo(() => {
    const rows = Object.values(visibleSegmentRows).flat();
    if (groupBy === "model") {
      return rows.flatMap((row) => [row, ...(row.children || [])]);
    }
    return rows;
  }, [visibleSegmentRows, groupBy]);

  const summary = useMemo(() => {
    const flatRows =
      groupBy === "model"
        ? Object.values(visibleSegmentRows).flatMap((groups) =>
            groups.flatMap((group) => group.children || [])
          )
        : Object.values(visibleSegmentRows).flat();

    const totals = flatRows.reduce(
      (acc, row) => {
        acc.models += 1;
        acc.lm += safeNum(row.LM);
        acc.mtd += safeNum(row.MTD);
        acc.ftd += safeNum(row.FTD);
        acc.d1 += safeNum(row.D1);
        acc.totalValue += safeNum(row.totalValue);
        acc.ads += safeNum(row.ADS);
        return acc;
      },
      { models: 0, lm: 0, mtd: 0, ftd: 0, d1: 0, totalValue: 0, ads: 0 }
    );

    const segmentCount = Object.keys(visibleSegmentRows).filter(
      (segment) => (visibleSegmentRows[segment] || []).length
    ).length;

    return {
      segments: safeNum(apiSummary?.segments || segmentCount),
      models: totals.models,
      lm: totals.lm,
      mtd: totals.mtd,
      ftd: totals.ftd,
      d1: totals.d1,
      totalValue: totals.totalValue,
      avgAds: flatRows.length ? totals.ads / flatRows.length : 0,
    };
  }, [visibleSegmentRows, groupBy, apiSummary]);

  const heatMax = useMemo(() => {
    return {
      dp: getMaxOf(rowsForHeat, "dp"),
      lm: getMaxOf(rowsForHeat, "LM"),
      mtd: getMaxOf(rowsForHeat, "MTD"),
      ftd: getMaxOf(rowsForHeat, "FTD"),
      d1: getMaxOf(rowsForHeat, "D1"),
      spdStk: getMaxOf(rowsForHeat, "SPD_STK"),
      mddStk: getMaxOf(rowsForHeat, "MDD_STK"),
      retailStk: getMaxOf(rowsForHeat, "RETAIL_STK"),
      ads: getMaxOf(rowsForHeat, "ADS"),
      wos: getMaxOf(rowsForHeat, "WOS"),
      totalValue: getMaxOf(rowsForHeat, "totalValue"),
    };
  }, [rowsForHeat]);

  const toggleGroup = (groupKey) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const expandAll = () => {
    const next = {};
    Object.keys(visibleSegmentRows).forEach((segment) => {
      (visibleSegmentRows[segment] || []).forEach((row) => {
        const groupKey = `${segment}__${row.model_code || row.model || row.name}`;
        next[groupKey] = true;
      });
    });
    setExpandedGroups(next);
  };

  const collapseAll = () => {
    const next = {};
    Object.keys(visibleSegmentRows).forEach((segment) => {
      (visibleSegmentRows[segment] || []).forEach((row) => {
        const groupKey = `${segment}__${row.model_code || row.model || row.name}`;
        next[groupKey] = false;
      });
    });
    setExpandedGroups(next);
  };

  return (
    <div className="tss-pro-page">
      <div className="tss-pro-header">
        <div>
          <h1 className="tss-pro-title">Model Wise Sales</h1>
          <p className="tss-pro-subtitle">
            Samsung activation performance with grouped model families and nested product-code rows
          </p>
        </div>

        <div className="tss-pro-header-actions">
          <button className="tss-btn ghost" type="button" onClick={clearAllFilters}>
            Reset
          </button>

          <div className="tss-toggle-group">
            <button
              type="button"
              className={`tss-toggle-btn ${moneyView === "normal" ? "active" : ""}`}
              onClick={() => setMoneyView("normal")}
            >
              Normal View
            </button>
            <button
              type="button"
              className={`tss-toggle-btn ${moneyView === "compact" ? "active" : ""}`}
              onClick={() => setMoneyView("compact")}
            >
              Cr/Lac View
            </button>
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
          </div>

          <button className="tss-btn primary" type="button" onClick={fetchReport}>
            {isLoading ? "Refreshing..." : "Apply"}
          </button>


        </div>
      </div>

      <div className="tss-filter-shell">
        <div className="tss-filter-grid">
          <div className="tss-field tss-field-search">
            <label>Search</label>
            <input
              type="text"
              placeholder="Model / product / category / tag"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="tss-field">
            <label>From</label>
            <input
              type="date"
              value={toInputDate(startDate)}
              max={endDate ? toInputDate(endDate) : undefined}
              onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
            />
          </div>

          <div className="tss-field">
            <label>To</label>
            <input
              type="date"
              value={toInputDate(endDate)}
              min={startDate ? toInputDate(startDate) : undefined}
              onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
            />
          </div>

          <div className="tss-field">
            <label>Product Category</label>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              <option value="">All Categories</option>
              {categoryOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="tss-field">
            <label>Sort By</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="mtd">MTD Vol</option>
              <option value="ftd">{ftdColumnLabel}</option>
              <option value="lm">LMTD Vol</option>
              <option value="gr">GR %</option>
              <option value="ads">ADS</option>
              <option value="wos">WOS</option>
              <option value="value">Total Value</option>
              <option value="dp">DP</option>
            </select>
          </div>
        </div>

        <div className="tss-filter-grid tss-filter-grid-secondary">
          <div className="tss-field">
            <label>Group By</label>
            <div className="tss-toggle-group">
              <button
                type="button"
                className={`tss-toggle-btn ${groupBy === "product_code" ? "active" : ""}`}
                onClick={() => setGroupBy("product_code")}
              >
                Product Code
              </button>
              <button
                type="button"
                className={`tss-toggle-btn ${groupBy === "model" ? "active" : ""}`}
                onClick={() => setGroupBy("model")}
              >
                Model
              </button>
            </div>
          </div>

          <div className="tss-field">
            <label>Display</label>
            <label className="tss-check-option">
              <input
                type="checkbox"
                checked={showDp}
                onChange={(e) => setShowDp(e.target.checked)}
              />
              <span>Show DP</span>
            </label>
          </div>

          {groupBy === "model" ? (
            <div className="tss-field">
              <label>Group Controls</label>
              <div className="tss-inline-actions">
                <button type="button" className="tss-btn ghost small" onClick={expandAll}>
                  Expand All
                </button>
                <button type="button" className="tss-btn ghost small" onClick={collapseAll}>
                  Collapse All
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="tss-filter-meta-row">
          <div className="tss-filter-note">
            {hasManualDate
              ? `Custom range selected. ${ftdBaseLabel} is based on end date${metaInfo?.ftdDate ? ` (${metaInfo.ftdDate})` : ""}. ${d1ColumnLabel} is based on previous day${metaInfo?.d1Date ? ` (${metaInfo.d1Date})` : ""}.`
              : `No date selected. Backend is using current month till today, and ${ftdBaseLabel} is based on yesterday${metaInfo?.ftdDate ? ` (${metaInfo.ftdDate})` : ""}. ${d1ColumnLabel} is based on day before yesterday${metaInfo?.d1Date ? ` (${metaInfo.d1Date})` : ""}.`}
          </div>
        </div>


        <div className="sales-active-filters">
          <div className="sales-active-filters__title">Active Filters</div>
          <div className="sales-active-filters__content">
            {Object.keys(selectedActorFilters).map((type) => renderChips(type))}
            {Object.keys(selectedDealerFilters).map((type) => renderChips(type))}
            {totalSelectedFiltersCount === 0 && (
              <div className="sales-active-filters__empty">No extra filters selected</div>
            )}
          </div>
        </div>

        <div className="tss-tag-filter-block">
          <div className="tss-tag-filter-head">
            <span>Product Tags</span>
            {selectedTags.length ? (
              <button
                type="button"
                className="tss-clear-tags-btn"
                onClick={() => setSelectedTags([])}
              >
                Clear tags
              </button>
            ) : null}
          </div>

          <div className="tss-tag-chip-wrap">
            {tagOptions.length ? (
              tagOptions.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    type="button"
                    key={tag}
                    className={`tss-tag-chip ${active ? "active" : ""}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                );
              })
            ) : (
              <div className="tss-empty-inline">No tags available</div>
            )}
          </div>
        </div>
      </div>

      <div className="tss-kpi-strip">
        <KpiCard label="Segments" value={formatNum(summary.segments)} />
        <KpiCard label="Rows" value={formatNum(summary.models)} />
        <KpiCard label="LMTD Vol" value={formatNum(summary.lm)} />
        <KpiCard label="MTD Vol" value={formatNum(summary.mtd)} />
        <KpiCard label={ftdColumnLabel} value={formatNum(summary.ftd)} subtle={metaInfo?.ftdDate || ""} />
        <KpiCard label={d1ColumnLabel} value={formatNum(summary.d1)} subtle={metaInfo?.d1Date || ""} />
        <KpiCard label="Avg ADS" value={formatDecimal(summary.avgAds)} />
        <KpiCard label="Total Value" value={moneyFormatter(summary.totalValue)} />
      </div>

      <div className="tss-segment-tabs-wrap">
        <button
          type="button"
          className={`tss-segment-tab ${activeSegment === "all" ? "active" : ""}`}
          onClick={() => setActiveSegment("all")}
        >
          All
        </button>

        {sortedSegments.map((segment) => (
          <button
            type="button"
            key={segment}
            className={`tss-segment-tab ${activeSegment === segment ? "active" : ""}`}
            onClick={() => setActiveSegment(segment)}
          >
            {segment}
          </button>
        ))}
      </div>

      {errorText ? <div className="tss-alert error">{errorText}</div> : null}

      <div className="tss-main-table-card">
        {isLoading ? (
          <div className="tss-loading-card">Loading report...</div>
        ) : Object.values(visibleSegmentRows).some((rows) => rows.length) ? (
          <div className="tss-table-wrap">
            <table className="tss-clean-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Segment</th>
                  <th>{groupBy === "model" ? "Model / Product Code" : "Product Code"}</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Tags</th>
                  <th>LMTD Vol</th>
                  <th>MTD Vol</th>
                  <th>GR %</th>
                  <th>ADS</th>
                  <th>{ftdColumnLabel}</th>
                  <th>{d1ColumnLabel}</th>
                  <th>SPD stk</th>
                  <th>MDD stk</th>
                  <th>Retail stk</th>
                  <th>WOS</th>
                  <th>Total Value</th>
                  {showDp ? <th>DP</th> : null}
                </tr>
              </thead>
              <tbody>
                {Object.keys(visibleSegmentRows).map((segment) =>
                  (visibleSegmentRows[segment] || []).flatMap((row, idx) => {
                    if (groupBy !== "model") {
                      return (
                        <tr key={`${segment}-${row.product_code}-${idx}`}>
                          <td>{idx + 1}</td>
                          <td><span className="tss-segment-pill">{segment}</span></td>
                          <td className="mono">{row.product_code}</td>
                          <td className="tss-name-cell">{row.name}</td>
                          <td>{row.product_category || "-"}</td>
                          <td>
                            <div className="tss-row-tags">
                              {(row.tags || []).length ? (
                                row.tags.slice(0, 2).map((tag) => (
                                  <span className="tss-row-tag" key={`${row.product_code}-${tag}`}>
                                    {tag}
                                  </span>
                                ))
                              ) : (
                                <span className="tss-row-tag muted">—</span>
                              )}
                            </div>
                          </td>
                          <td><span className="tss-heat-cell" style={getHeatCellStyle(row.LM, heatMax.lm, "59,130,246")}>{formatNum(row.LM)}</span></td>
                          <td><span className="tss-heat-cell" style={getHeatCellStyle(row.MTD, heatMax.mtd, "37,99,235")}>{formatNum(row.MTD)}</span></td>
                          <td><span className="tss-heat-cell" style={getGrowthStyle(row.GR)}>{`${formatDecimal(row.GR)}%`}</span></td>
                          <td><span className="tss-heat-cell" style={getHeatCellStyle(row.ADS, heatMax.ads, "99,102,241")}>{formatDecimal(row.ADS)}</span></td>
                          <td><span className="tss-heat-cell" style={getHeatCellStyle(row.FTD, heatMax.ftd, "14,165,155")}>{formatNum(row.FTD)}</span></td>
                          <td><span className="tss-heat-cell" style={getHeatCellStyle(row.D1, heatMax.d1, "14,165,155")}>{formatNum(row.D1)}</span></td>
                          <td><span className="tss-heat-cell" style={getHeatCellStyle(row.SPD_STK, heatMax.spdStk, "6,182,212")}>{formatNum(row.SPD_STK)}</span></td>
                          <td><span className="tss-heat-cell" style={getHeatCellStyle(row.MDD_STK, heatMax.mddStk, "6,182,212")}>{formatNum(row.MDD_STK)}</span></td>
                          <td><span className="tss-heat-cell" style={getHeatCellStyle(row.RETAIL_STK, heatMax.retailStk, "6,182,212")}>{formatNum(row.RETAIL_STK)}</span></td>
                          <td><span className="tss-heat-cell" style={getHeatCellStyle(row.WOS, heatMax.wos, "168,85,247")}>{formatDecimal(row.WOS)}</span></td>
                          <td><span className="tss-heat-cell" style={getHeatCellStyle(row.totalValue, heatMax.totalValue, "124,58,237")}>{moneyFormatter(row.totalValue)}</span></td>
                          {showDp ? (
                            <td><span className="tss-heat-cell" style={getHeatCellStyle(row.dp, heatMax.dp, "245,158,11")}>{moneyFormatter(row.dp)}</span></td>
                          ) : null}
                        </tr>
                      );
                    }

                    const groupKey = `${segment}__${row.model_code || row.model || row.name}`;
                    const isOpen = !!expandedGroups[groupKey];

                    const parentRow = (
                      <tr key={`group-${groupKey}`} className="tss-group-row">
                        <td>{idx + 1}</td>
                        <td><span className="tss-segment-pill">{segment}</span></td>
                        <td>
                          <button
                            type="button"
                            className="tss-group-toggle"
                            onClick={() => toggleGroup(groupKey)}
                          >
                            <span className={`tss-caret ${isOpen ? "open" : ""}`}>▸</span>
                            <span className="mono tss-group-family-label">{row.model_code}</span>
                            <span className="tss-variant-badge">{row.variantCount} variants</span>
                          </button>
                        </td>
                        <td className="tss-name-cell tss-group-name">—</td>
                        <td>{row.product_category || row.category || "—"}</td>
                        <td>
                          <div className="tss-row-tags">
                            {(row.tags || []).slice(0, 2).map((tag) => (
                              <span className="tss-row-tag" key={`${row.model_code}-${tag}`}>
                                {tag}
                              </span>
                            ))}
                            {(row.tags || []).length > 2 ? (
                              <span className="tss-row-tag muted">+{row.tags.length - 2}</span>
                            ) : null}
                          </div>
                        </td>
                        <td><span className="tss-heat-cell" style={getHeatCellStyle(row.LM, heatMax.lm, "59,130,246")}>{formatNum(row.LM)}</span></td>
                        <td><span className="tss-heat-cell" style={getHeatCellStyle(row.MTD, heatMax.mtd, "37,99,235")}>{formatNum(row.MTD)}</span></td>
                        <td><span className="tss-heat-cell" style={getGrowthStyle(row.GR)}>{`${formatDecimal(row.GR)}%`}</span></td>
                        <td><span className="tss-heat-cell" style={getHeatCellStyle(row.ADS, heatMax.ads, "99,102,241")}>{formatDecimal(row.ADS)}</span></td>
                        <td><span className="tss-heat-cell" style={getHeatCellStyle(row.FTD, heatMax.ftd, "14,165,155")}>{formatNum(row.FTD)}</span></td>
                        <td><span className="tss-heat-cell" style={getHeatCellStyle(row.D1, heatMax.d1, "14,165,155")}>{formatNum(row.D1)}</span></td>
                        <td><span className="tss-heat-cell" style={getHeatCellStyle(row.SPD_STK, heatMax.spdStk, "6,182,212")}>{formatNum(row.SPD_STK)}</span></td>
                        <td><span className="tss-heat-cell" style={getHeatCellStyle(row.MDD_STK, heatMax.mddStk, "6,182,212")}>{formatNum(row.MDD_STK)}</span></td>
                        <td><span className="tss-heat-cell" style={getHeatCellStyle(row.RETAIL_STK, heatMax.retailStk, "6,182,212")}>{formatNum(row.RETAIL_STK)}</span></td>
                        <td><span className="tss-heat-cell" style={getHeatCellStyle(row.WOS, heatMax.wos, "168,85,247")}>{formatDecimal(row.WOS)}</span></td>
                        <td><span className="tss-heat-cell" style={getHeatCellStyle(row.totalValue, heatMax.totalValue, "124,58,237")}>{moneyFormatter(row.totalValue)}</span></td>
                        {showDp ? (
                          <td><span className="tss-heat-cell" style={getHeatCellStyle(row.dp, heatMax.dp, "245,158,11")}>{getFamilyDpRangeLabel(row, moneyFormatter)}</span></td>
                        ) : null}
                      </tr>
                    );

                    const childRows = isOpen
                      ? (row.children || [])
                          .filter((child) => hasMeaningfulMetrics(child))
                          .map((child, childIdx) => (
                          <tr
                            key={`child-${groupKey}-${child.product_code}-${childIdx}`}
                            className="tss-child-row"
                          >
                            <td></td>
                            <td></td>
                            <td className="mono tss-child-code">
                              <span className="tss-child-connector" />
                              {getVariantCodeLabel(child)}
                            </td>
                            <td className="tss-name-cell">{child.name}</td>
                            <td>{child.product_category || "-"}</td>
                            <td>
                              <div className="tss-row-tags">
                                {(child.tags || []).length ? (
                                  child.tags.slice(0, 2).map((tag) => (
                                    <span className="tss-row-tag" key={`${child.product_code}-${tag}`}>
                                      {tag}
                                    </span>
                                  ))
                                ) : (
                                  <span className="tss-row-tag muted">—</span>
                                )}
                              </div>
                            </td>
                            <td><span className="tss-heat-cell" style={getHeatCellStyle(child.LM, heatMax.lm, "59,130,246")}>{formatNum(child.LM)}</span></td>
                            <td><span className="tss-heat-cell" style={getHeatCellStyle(child.MTD, heatMax.mtd, "37,99,235")}>{formatNum(child.MTD)}</span></td>
                            <td><span className="tss-heat-cell" style={getGrowthStyle(child.GR)}>{`${formatDecimal(child.GR)}%`}</span></td>
                            <td><span className="tss-heat-cell" style={getHeatCellStyle(child.ADS, heatMax.ads, "99,102,241")}>{formatDecimal(child.ADS)}</span></td>
                            <td><span className="tss-heat-cell" style={getHeatCellStyle(child.FTD, heatMax.ftd, "14,165,155")}>{formatNum(child.FTD)}</span></td>
                            <td><span className="tss-heat-cell" style={getHeatCellStyle(child.D1, heatMax.d1, "14,165,155")}>{formatNum(child.D1)}</span></td>
                            <td><span className="tss-heat-cell" style={getHeatCellStyle(child.SPD_STK, heatMax.spdStk, "6,182,212")}>{formatNum(child.SPD_STK)}</span></td>
                            <td><span className="tss-heat-cell" style={getHeatCellStyle(child.MDD_STK, heatMax.mddStk, "6,182,212")}>{formatNum(child.MDD_STK)}</span></td>
                            <td><span className="tss-heat-cell" style={getHeatCellStyle(child.RETAIL_STK, heatMax.retailStk, "6,182,212")}>{formatNum(child.RETAIL_STK)}</span></td>
                            <td><span className="tss-heat-cell" style={getHeatCellStyle(child.WOS, heatMax.wos, "168,85,247")}>{formatDecimal(child.WOS)}</span></td>
                            <td><span className="tss-heat-cell" style={getHeatCellStyle(child.totalValue, heatMax.totalValue, "124,58,237")}>{moneyFormatter(child.totalValue)}</span></td>
                            {showDp ? (
                              <td><span className="tss-heat-cell" style={getHeatCellStyle(child.dp, heatMax.dp, "245,158,11")}>{moneyFormatter(child.dp)}</span></td>
                            ) : null}
                          </tr>
                        ))
                      : [];



                    return [parentRow, ...childRows];
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="tss-empty-state">No data found for selected filters</div>
        )}
      </div>

        {filterPanelOpen && (
          <div className="sales-filter-overlay">
            <div className="sales-filter-panel" ref={panelRef}>
              <div className="sales-filter-panel__header">
                <div>
                  <h3>Advanced Filters</h3>
                  <p>Actor and dealer filters work together across this report.</p>
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
                      <small>
                        Actor filters drill down automatically as you move deeper in the hierarchy
                      </small>
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
                            isActorTab(activeFilterTab)
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
                              {isActorTab(activeFilterTab) && item.code && (
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
    </div>
  );
}
