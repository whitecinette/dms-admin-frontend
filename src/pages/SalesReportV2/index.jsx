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

const PRODUCT_FILTER_TYPES = [{ key: "product_tag", label: "Product Tags" }];

const ACTOR_POSITION_KEYS = ["smd", "zsm", "asm", "mdd", "tse", "so", "dealer"];
const FLOW_NAME = "default_sales_flow";

const DETAIL_ENDPOINT_CANDIDATES = [
  "/reports/dashboard-summary/drilldown",
  "/reports/dashboard-summary/details",
  "/reports/dashboard-summary-detail",
  "/reports/dashboard-summary",
];

const TAG_GROUP_REPORT_TYPES = [
  "activation",
  "tertiary",
  "secondary",
  "wod",
  "activation_vol_ytd",
  "activation_vol_ytd_actual",
  "tertiary_vol_ytd",
  "tertiary_vol_ytd_actual",
];

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

const isActorTab = (tabKey) => ACTOR_POSITION_KEYS.includes(tabKey);
const isProductTagTab = (tabKey) => tabKey === "product_tag";

const normalizeFilterOption = (item) => {
  if (!item) return null;
  if (typeof item === "string") return { label: item, value: item };

  const value = item.value ?? item.tag ?? item.name ?? item.label;
  if (!value) return null;

  return {
    ...item,
    label: item.label || item.name || item.tag || item.value,
    value,
  };
};

const normalizeProductDetailRows = (rawRows = [], metricColumns = []) =>
  rawRows
    .map((row) => {
      if (!row || typeof row !== "object") return null;

      const productComposite = String(
        row.Product || row.product || row.productLabel || row.product_name || row.name || ""
      ).trim();
      const [compositeModelCode, ...compositeNameParts] = productComposite.split(" - ");

      const normalized = {
        productLabel:
          compositeNameParts.join(" - ").trim() ||
          row.productLabel ||
          row.product_name ||
          row.productName ||
          row.name ||
          row.description ||
          row.model_name ||
          "-",
        modelCode:
          compositeModelCode ||
          row.model_code ||
          row.modelCode ||
          row.model ||
          row.product_code ||
          row.productCode ||
          "-",
      };

      metricColumns.forEach((column) => {
        normalized[column] = row[column];
      });

      return normalized;
    })
    .filter(Boolean);

const normalizeGroupedTagRows = (groupedReport) => {
  if (!groupedReport?.columns || !Array.isArray(groupedReport?.rows)) {
    return { rowLabel: "Tag", metricColumns: [], rows: [] };
  }

  const [rowLabel = "Tag", ...metricColumns] = groupedReport.columns;
  const rows = groupedReport.rows.filter(
    (row) => row && row[rowLabel] && String(row[rowLabel]).toLowerCase() !== "total"
  );

  return { rowLabel, metricColumns, rows };
};

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
  const [tagOptions, setTagOptions] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);

  const [brand, setBrand] = useState("");
  const [segment, setSegment] = useState("");

  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState("zone");
  const [searchText, setSearchText] = useState("");
  const [loadingFilterOptions, setLoadingFilterOptions] = useState(false);


  const [detailModal, setDetailModal] = useState({
    open: false,
    title: "",
    subtitle: "",
    columns: [],
    rows: [],
    loading: false,
    error: "",
  });

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

  const tagFilterSnapshot = useMemo(
    () => JSON.stringify(selectedTags),
    [selectedTags]
  );

  const actorPositionOrder = useMemo(
    () => actorPositions.map((item) => item.value).filter(Boolean),
    [actorPositions]
  );

  // ===============================
  // DATA
  // ===============================
  const [activation, setActivation] = useState(null);
  const [tertiary, setTertiary] = useState(null);
  const [secondary, setSecondary] = useState(null);
  const [wodTables, setWodTables] = useState(null);
  const [priceSegmentTables, setPriceSegmentTables] = useState(null);
  const [priceSegmentSplit40k, setPriceSegmentSplit40k] = useState(null);
  const [tagGroupedReports, setTagGroupedReports] = useState({});

  const [activationValueYtd, setActivationValueYtd] = useState(null);
  const [activationVolYtd, setActivationVolYtd] = useState(null);
  const [tertiaryValueYtd, setTertiaryValueYtd] = useState(null);
  const [tertiaryVolYtd, setTertiaryVolYtd] = useState(null);

  const [activationValueYtdActual, setActivationValueYtdActual] = useState(null);
  const [activationVolYtdActual, setActivationVolYtdActual] = useState(null);
  const [tertiaryValueYtdActual, setTertiaryValueYtdActual] = useState(null);
  const [tertiaryVolYtdActual, setTertiaryVolYtdActual] = useState(null);

  // ===============================
  // LOADERS
  // ===============================
  const [loadingActivation, setLoadingActivation] = useState(false);
  const [loadingTertiary, setLoadingTertiary] = useState(false);
  const [loadingSecondary, setLoadingSecondary] = useState(false);
  const [loadingWod, setLoadingWod] = useState(false);
  const [loadingPriceSegment, setLoadingPriceSegment] = useState(false);
  const [loadingPriceSegmentSplit40k, setLoadingPriceSegmentSplit40k] =
    useState(false);

  const [loadingActivationValueYtd, setLoadingActivationValueYtd] =
    useState(false);
  const [loadingActivationVolYtd, setLoadingActivationVolYtd] = useState(false);
  const [loadingTertiaryValueYtd, setLoadingTertiaryValueYtd] = useState(false);
  const [loadingTertiaryVolYtd, setLoadingTertiaryVolYtd] = useState(false);

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

  // ===============================
  // FILTER PAYLOAD HELPERS
  // ===============================
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

  // ===============================
  // NEW DROPDOWN API
  // ===============================
  const fetchDropdownOptions = async ({
    targetType,
    targetKey,
    subordinates = {},
    dealer = {},
    productTags = {},
  }) => {
    try {
      const body = {
        flow_name: FLOW_NAME,
        target_type: targetType,
        target_key: targetKey,
        subordinates,
        dealer,
        product_tags: productTags,
      };

      const res = await axios.post(
        `${backendUrl}/filters/dropdown-options`,
        body,
        { headers: authHeaders }
      );

      return res.data?.values || [];
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

  const fetchTagOptions = async () => {
    const values = await fetchDropdownOptions({
      targetType: "product_tag",
      targetKey: "product_tag",
      subordinates: buildSubordinateFilters(),
      dealer: buildDealerFiltersPayload(),
      productTags: {
        product_tag: selectedTags.map((item) => item.value).filter(Boolean),
      },
    });

    const normalized = values.map(normalizeFilterOption).filter(Boolean);
    setTagOptions(normalized);
    return normalized;
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
          productTags: {
            product_tag: selectedTags.map((item) => item.value).filter(Boolean),
          },
        });

        setActorOptionsMap((old) => ({
          ...old,
          [tabKey]: values,
        }));
        return;
      }

      if (isProductTagTab(tabKey)) {
        await fetchTagOptions();
        return;
      }

      const values = await fetchDropdownOptions({
        targetType: "dealer",
        targetKey: tabKey,
        subordinates: buildSubordinateFilters(),
        dealer: buildDealerFiltersPayload(selectedDealerFilters, {
          excludeType: tabKey,
        }),
        productTags: {
          product_tag: selectedTags.map((item) => item.value).filter(Boolean),
        },
      });

      setFilterValues((old) => ({
        ...old,
        [tabKey]: values,
      }));
    } finally {
      setLoadingFilterOptions(false);
    }
  };

  // ===============================
  // FILTER STATE HELPERS
  // ===============================
  const totalSelectedFiltersCount = useMemo(() => {
    const actorCount = Object.values(selectedActorFilters).reduce(
      (sum, arr) => sum + (arr?.length || 0),
      0
    );
    const dealerCount = Object.values(selectedDealerFilters).reduce(
      (sum, arr) => sum + (arr?.length || 0),
      0
    );
    return actorCount + dealerCount + selectedTags.length;
  }, [selectedActorFilters, selectedDealerFilters, selectedTags.length]);

  const actorFilterSnapshot = useMemo(
    () => JSON.stringify(selectedActorFilters),
    [selectedActorFilters]
  );

  const dealerFilterSnapshot = useMemo(
    () => JSON.stringify(selectedDealerFilters),
    [selectedDealerFilters]
  );

  const currentTabOptions = useMemo(() => {
    if (isActorTab(activeFilterTab)) {
      return actorOptionsMap[activeFilterTab] || [];
    }
    if (isProductTagTab(activeFilterTab)) {
      return tagOptions;
    }
    return filterValues[activeFilterTab] || [];
  }, [activeFilterTab, actorOptionsMap, filterValues, tagOptions]);

  const currentTabSelected = useMemo(() => {
    if (isActorTab(activeFilterTab)) {
      return selectedActorFilters[activeFilterTab] || [];
    }
    if (isProductTagTab(activeFilterTab)) {
      return selectedTags;
    }
    return selectedDealerFilters[activeFilterTab] || [];
  }, [activeFilterTab, selectedActorFilters, selectedDealerFilters, selectedTags]);

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

    if (isProductTagTab(type)) {
      setSelectedTags((old) => {
        const exists = old.some((x) => x.value === item.value);
        return exists
          ? old.filter((x) => x.value !== item.value)
          : [...old, normalizeFilterOption(item)];
      });

      setTagOptions([]);
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

    if (isProductTagTab(type)) {
      setSelectedTags((old) => old.filter((x) => x.value !== item.value));
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

    if (isProductTagTab(activeFilterTab)) {
      setSelectedTags([]);
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
    setSelectedTags([]);
    setActorOptionsMap({});
    setFilterValues(defaultDealerFilterValues);
    setTagOptions([]);
    setSearchText("");
    setActiveFilterTab(actorPositions[0]?.value || "zone");
    setFilterPanelOpen(false);
  };

  const renderChips = (type) => {
    const selected = isActorTab(type)
      ? selectedActorFilters[type] || []
      : isProductTagTab(type)
      ? selectedTags
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

  const closeDetailModal = () => {
    setDetailModal({
      open: false,
      title: "",
      subtitle: "",
      columns: [],
      rows: [],
      loading: false,
      error: "",
    });
  };

  const resolveDetailResponse = (result, metricColumns = []) => {
    const productIdentityColumns = new Set([
      "Product",
      "product",
      "product_name",
      "productName",
      "name",
      "model_code",
      "modelCode",
      "model",
      "product_code",
      "productCode",
    ]);

    const payload =
      result?.data ||
      result?.details ||
      result?.drilldown ||
      result?.products ||
      result?.productRows ||
      result?.product_rows ||
      result;

    if (Array.isArray(payload)) {
      return {
        columns: metricColumns,
        rows: normalizeProductDetailRows(payload, metricColumns),
      };
    }

    if (payload?.headers && Array.isArray(payload?.data)) {
      const columns = payload.headers.filter((header) => !productIdentityColumns.has(header));
      return {
        columns,
        rows: normalizeProductDetailRows(payload.data, columns),
      };
    }

    if (payload?.columns && Array.isArray(payload?.rows)) {
      const columns = payload.columns.filter((column) => !productIdentityColumns.has(column));
      return {
        columns,
        rows: normalizeProductDetailRows(payload.rows, columns),
      };
    }

    if (Array.isArray(payload?.products)) {
      return {
        columns: metricColumns,
        rows: normalizeProductDetailRows(payload.products, metricColumns),
      };
    }

    return { columns: [], rows: [] };
  };

  const openTagDetailModal = async ({ reportType, reportTitle, row, metricColumns = [] }) => {
    const sourceKey = row.__sourceKey || "";

    setDetailModal({
      open: true,
      title: `${row.__tagLabel} Products`,
      subtitle: reportTitle,
      columns: metricColumns,
      rows: [],
      loading: true,
      error: "",
    });

    for (const endpoint of DETAIL_ENDPOINT_CANDIDATES) {
      try {
        const res = await fetch(`${backendUrl}${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: localStorage.getItem("authToken"),
          },
          body: JSON.stringify(
            getRequestBody(reportType, {
              filters: {
                group_by: "tag",
              },
              drilldown: {
                group_value: row.__tagLabel,
                source_key: sourceKey,
              },
            })
          ),
        });

        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.message || "Failed to fetch product details");
        }

        const resolved = resolveDetailResponse(result, metricColumns);
        if (resolved.rows.length) {
          setDetailModal((old) => ({
            ...old,
            columns: resolved.columns.length ? resolved.columns : metricColumns,
            rows: resolved.rows,
            loading: false,
            error: "",
          }));
          return;
        }
      } catch (error) {
        continue;
      }
    }

    setDetailModal((old) => ({
      ...old,
      loading: false,
      error: "Product details are not available yet for this row.",
    }));
  };

  // ===============================
  // FETCH HELPERS
  // ===============================
  const getRequestBody = (report_type, extras = {}) => {
    const selectedTagValues = selectedTags.map((item) => item.value).filter(Boolean);

    const body = {
      flow_name: FLOW_NAME,
      filters: {
        report_type,
        ...(brand ? { brand } : {}),
        ...(segment ? { segment } : {}),
        ...(selectedTagValues.length ? { tags: selectedTagValues } : {}),
      },
      subordinate_filters: buildSubordinateFilters(),
      dealer_filters: buildDealerFiltersPayload(),
      ...(brand ? { brand } : {}),
      ...(segment ? { segment } : {}),
      ...(selectedTagValues.length
        ? {
            tags: selectedTagValues,
            product_tags: selectedTagValues,
          }
        : {}),
    };

    if (startDate && endDate) {
      body.start_date = startDate;
      body.end_date = endDate;
    }

    const mergedFilters = {
      ...body.filters,
      ...(extras.filters || {}),
    };

    return {
      ...body,
      ...extras,
      filters: mergedFilters,
    };
  };

  const postReport = async (report_type, extras = {}) => {
    const res = await fetch(`${backendUrl}/reports/dashboard-summary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: localStorage.getItem("authToken"),
      },
      body: JSON.stringify(getRequestBody(report_type, extras)),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || "Error fetching report");
    return result;
  };

  const postGroupedTagReport = async (report_type) => {
    const result = await postReport(report_type, {
      filters: {
        group_by: "tag",
      },
    });

    return result?.[report_type] || result?.data || null;
  };

/////////////////////NEW TWO PART REPORTS /////////////////////////

const fetchCoreReports = async () => {
  setLoadingActivation(true);
  setLoadingTertiary(true);
  setLoadingSecondary(true);
  setLoadingWod(true);
  setLoadingPriceSegment(true);
  setLoadingPriceSegmentSplit40k(true);

  try {
    const res = await fetch(`${backendUrl}/reports/dashboard-summary-batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: localStorage.getItem("authToken"),
      },
      body: JSON.stringify({
        ...getRequestBody("batch"),
        report_types: [
          "activation",
          "tertiary",
          "secondary",
          "wod",
        ],
      }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || "Core fetch failed");

    const data = result.data || {};

    setActivation(data.activation || null);
    setTertiary(data.tertiary || null);
    setSecondary(data.secondary || null);
    setWodTables(data.wod || null);

    setTagGroupedReports((old) => ({
      ...old,
      ...(data.tag_grouped || {}),
    }));
  } catch (error) {
    console.error("Core fetch error:", error);
  } finally {
    setLoadingActivation(false);
    setLoadingTertiary(false);
    setLoadingSecondary(false);
    setLoadingWod(false);

  }
};

const fetchYtdReports = async () => {
  setLoadingActivationValueYtd(true);
  setLoadingActivationVolYtd(true);
  setLoadingTertiaryValueYtd(true);
  setLoadingTertiaryVolYtd(true);

  setLoadingActivationValueYtdActual(true);
  setLoadingActivationVolYtdActual(true);
  setLoadingTertiaryValueYtdActual(true);
  setLoadingTertiaryVolYtdActual(true);

  try {
    const res = await fetch(`${backendUrl}/reports/dashboard-summary-batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: localStorage.getItem("authToken"),
      },
      body: JSON.stringify({
        ...getRequestBody("batch"),
        report_types: [
          "activation_value_ytd",
          "activation_vol_ytd",
          "tertiary_value_ytd",
          "tertiary_vol_ytd",
          "activation_value_ytd_actual",
          "activation_vol_ytd_actual",
          "tertiary_value_ytd_actual",
          "tertiary_vol_ytd_actual",
        ],
      }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || "YTD fetch failed");

    const data = result.data || {};

    setActivationValueYtd(data.activation_value_ytd || null);
    setActivationVolYtd(data.activation_vol_ytd || null);
    setTertiaryValueYtd(data.tertiary_value_ytd || null);
    setTertiaryVolYtd(data.tertiary_vol_ytd || null);

    setActivationValueYtdActual(data.activation_value_ytd_actual || null);
    setActivationVolYtdActual(data.activation_vol_ytd_actual || null);
    setTertiaryValueYtdActual(data.tertiary_value_ytd_actual || null);
    setTertiaryVolYtdActual(data.tertiary_vol_ytd_actual || null);

    setTagGroupedReports((old) => ({
      ...old,
      ...(data.tag_grouped || {}),
    }));
  } catch (error) {
    console.error("YTD fetch error:", error);
  } finally {
    setLoadingActivationValueYtd(false);
    setLoadingActivationVolYtd(false);
    setLoadingTertiaryValueYtd(false);
    setLoadingTertiaryVolYtd(false);

    setLoadingActivationValueYtdActual(false);
    setLoadingActivationVolYtdActual(false);
    setLoadingTertiaryValueYtdActual(false);
    setLoadingTertiaryVolYtdActual(false);
  }
};

const fetchPriceSegmentReports = async () => {


  try {
    const res = await fetch(`${backendUrl}/reports/dashboard-summary-batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: localStorage.getItem("authToken"),
      },
      body: JSON.stringify({
        ...getRequestBody("batch"),
        report_types: [
          "price_segment",
          "price_segment_40k",
        ],
      }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || "Price segment fetch failed");

    const data = result.data || {};

    setPriceSegmentTables(data.price_segment || null);
    setPriceSegmentSplit40k(data.price_segment_40k || null);

    setTagGroupedReports((old) => ({
      ...old,
      ...(data.tag_grouped || {}),
    }));
  } catch (error) {
    console.error("Price segment fetch error:", error);
  } finally {
    setLoadingPriceSegment(false);
    setLoadingPriceSegmentSplit40k(false);
  }
};



/////////////////////NEW TWO PART REPORTS /////////////////////////

  // ===============================
  // EFFECTS
  // ===============================
  useEffect(() => {
    fetchGroupingOptions();
  }, []);

  useEffect(() => {
    if (!actorPositions.length) return;

    const actorTabSet = new Set(actorPositions.map((item) => item.value));
    const availableStaticTabs = [...DEALER_FILTER_TYPES, ...PRODUCT_FILTER_TYPES];

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
      if (!actorPositions.length) return;
      fetchCoreReports(); // fast load first
      fetchYtdReports(); 
      fetchPriceSegmentReports();
    }, [actorPositions]);




  // ===============================
  // TABLE RENDER HELPERS
  // ===============================
  const renderInlineTagRows = (
    groupedReport,
    {
      reportType,
      reportTitle,
      metricColumns = [],
      firstColumnLabel = "Tag",
      formatCell = (value) => formatValue(value, false),
      sourceKey = "",
    } = {}
  ) => {
    const { rowLabel, metricColumns: groupedMetricColumns, rows: tagRows } =
      normalizeGroupedTagRows(groupedReport);

    if (!tagRows.length) return null;

    const resolvedColumns = metricColumns.length ? metricColumns : groupedMetricColumns;
    if (!resolvedColumns.length) return null;

    return tagRows.map((row, index) => {
      const tagLabel =
        row[rowLabel] || row.Tag || row.tag || row.Label || row.label || "Unknown Tag";

      return (
        <tr
          key={`${tagLabel}-${index}`}
          className="clickable-row tag-inline-row"
          onClick={() =>
            openTagDetailModal({
              reportType,
              reportTitle,
              row: { ...row, __tagLabel: tagLabel, __sourceKey: sourceKey },
              metricColumns: resolvedColumns,
            })
          }
        >
          <td className="metric-title">
            <div className="tag-cell">
              <span>{tagLabel}</span>
              <small>{firstColumnLabel}</small>
            </div>
          </td>
          {resolvedColumns.map((column) => (
            <td key={column}>{formatCell(row[column], column)}</td>
          ))}
        </tr>
      );
    });
  };

  const renderTableContent = (
    reportData,
    { reportType = "dashboard", reportTitle = "Tag Volume" } = {}
  ) => {
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

            {renderInlineTagRows(tagGroupedReports[reportType], {
              reportType,
              reportTitle,
              metricColumns: columns,
              firstColumnLabel: "Tag Volume",
              formatCell: (value, column) =>
                String(column).includes("%")
                  ? formatPercent(value)
                  : formatValue(value, false),
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderYtdTableContent = (
    report,
    { isCurrency = false, reportType = "ytd", reportTitle = "YTD Tag Volume" } = {}
  ) => {
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

            {renderInlineTagRows(tagGroupedReports[reportType], {
              reportType,
              reportTitle,
              metricColumns: columns.slice(1),
              firstColumnLabel: "Tag Volume",
              formatCell: (value, column) =>
                String(column).includes("%")
                  ? formatPercent(value)
                  : formatValue(value, false),
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderTagAwareReportContent = (
    reportData,
    { reportType, reportTitle, renderPrimary } = {}
  ) => renderPrimary?.(reportData, { reportType, reportTitle }) || null;

  // ===============================
  // WOD TABLES CONTENT
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
            className={`wod-value-cell ${col === "G/D%" ? "is-growth" : ""} ${
              col === "Exp.Ach" ? "is-exp" : ""
            }`}
            style={getCellStyle(rowData?.[col], col, rowData, columns)}
          >
            {formatValue(rowData?.[col])}
          </td>
        ))}
      </tr>
    );
  };

  const renderWodTablesContent = (
    reportData = wodTables,
    { reportType = "wod" } = {}
  ) => {
    if (!reportData) return null;

    const sellIn = reportData.sellInWOD || {};
    const sellOut = reportData.sellOutWOD || {};
    const columns = Object.keys(sellIn);
    const groupedWod = tagGroupedReports[reportType] || {};

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
                {renderInlineTagRows(groupedWod.sellInWOD, {
                  reportType,
                  reportTitle: "Sell-In WOD",
                  metricColumns: columns,
                  firstColumnLabel: "Tag WOD",
                  sourceKey: "sellInWOD",
                  formatCell: (value, column) =>
                    String(column).includes("%")
                      ? formatPercent(value)
                      : formatValue(value, false),
                })}
                {renderWodRow("Sell-Out WOD", sellOut, columns, "sell-out")}
                {renderInlineTagRows(groupedWod.sellOutWOD, {
                  reportType,
                  reportTitle: "Sell-Out WOD",
                  metricColumns: columns,
                  firstColumnLabel: "Tag WOD",
                  sourceKey: "sellOutWOD",
                  formatCell: (value, column) =>
                    String(column).includes("%")
                      ? formatPercent(value)
                      : formatValue(value, false),
                })}
              </tbody>
            </table>
          </div>
        </div>

        {reportData.sellInBreakdown?.length > 0 && (
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
                  {reportData.sellInBreakdown.map((row, idx) =>
                    renderWodRow(row.label, row.data || {}, columns, `sellin-breakdown-${idx}`)
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportData.sellOutBreakdown?.length > 0 && (
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
                  {reportData.sellOutBreakdown.map((row, idx) =>
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

              <button
                type="button"
                className="primary-action"
                onClick={() => {
                  fetchCoreReports();
                  fetchYtdReports();
                  fetchPriceSegmentReports();
                }}
              >
                Fetch Reports
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
            {renderChips("product_tag")}
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

                  {PRODUCT_FILTER_TYPES.map((item) => (
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
                      {selectedTags.length > 0 && <span>{selectedTags.length}</span>}
                    </button>
                  ))}
                </div>

                <div className="sales-filter-content">
                  <div className="sales-filter-content__top">
                    <div>
                      <h4>
                        {actorPositions.find((p) => p.value === activeFilterTab)?.label ||
                          PRODUCT_FILTER_TYPES.find((item) => item.key === activeFilterTab)?.label ||
                          DEALER_FILTER_TYPES.find((d) => d.key === activeFilterTab)?.label ||
                          "Filters"}
                      </h4>
                      <small>
                        {isProductTagTab(activeFilterTab)
                          ? "Select tags to narrow the grouped tag rows across every report."
                          : "Actor filters drill down automatically as you move deeper in the hierarchy"}
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
              {renderTagAwareReportContent(activation, {
                reportType: "activation",
                reportTitle: "Activation (Sell-Out)",
                renderPrimary: renderTableContent,
              })}
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
              {renderTagAwareReportContent(tertiary, {
                reportType: "tertiary",
                reportTitle: "Tertiary (Sell-In)",
                renderPrimary: renderTableContent,
              })}
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
              {renderTagAwareReportContent(secondary, {
                reportType: "secondary",
                reportTitle: "Secondary (SPD → MDD)",
                renderPrimary: renderTableContent,
              })}
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
              {renderTagAwareReportContent(wodTables, {
                reportType: "wod",
                reportTitle: "WOD",
                renderPrimary: renderWodTablesContent,
              })}
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
              {renderTagAwareReportContent(activationValueYtdActual, {
                reportType: "activation_value_ytd_actual",
                reportTitle: "Activation Value YTD",
                renderPrimary: (report, meta) =>
                  renderYtdTableContent(report, {
                    isCurrency: true,
                    reportType: meta.reportType,
                    reportTitle: meta.reportTitle,
                  }),
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
              {renderTagAwareReportContent(activationVolYtdActual, {
                reportType: "activation_vol_ytd_actual",
                reportTitle: "Activation Vol YTD",
                renderPrimary: (report, meta) =>
                  renderYtdTableContent(report, {
                    isCurrency: false,
                    reportType: meta.reportType,
                    reportTitle: meta.reportTitle,
                  }),
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
              {renderTagAwareReportContent(tertiaryValueYtdActual, {
                reportType: "tertiary_value_ytd_actual",
                reportTitle: "Tertiary Value YTD Actual",
                renderPrimary: (report, meta) =>
                  renderYtdTableContent(report, {
                    isCurrency: true,
                    reportType: meta.reportType,
                    reportTitle: meta.reportTitle,
                  }),
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
              {renderTagAwareReportContent(tertiaryVolYtdActual, {
                reportType: "tertiary_vol_ytd_actual",
                reportTitle: "Tertiary Vol YTD Actual",
                renderPrimary: (report, meta) =>
                  renderYtdTableContent(report, {
                    isCurrency: false,
                    reportType: meta.reportType,
                    reportTitle: meta.reportTitle,
                  }),
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
              {renderTagAwareReportContent(activationValueYtd, {
                reportType: "activation_value_ytd",
                reportTitle: "Activation Value YTD G/D",
                renderPrimary: (report, meta) =>
                  renderYtdTableContent(report, {
                    isCurrency: true,
                    reportType: meta.reportType,
                    reportTitle: meta.reportTitle,
                  }),
              })}
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
              {renderTagAwareReportContent(activationVolYtd, {
                reportType: "activation_vol_ytd",
                reportTitle: "Activation Vol YTD G/D",
                renderPrimary: (report, meta) =>
                  renderYtdTableContent(report, {
                    isCurrency: false,
                    reportType: meta.reportType,
                    reportTitle: meta.reportTitle,
                  }),
              })}
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
              {renderTagAwareReportContent(tertiaryValueYtd, {
                reportType: "tertiary_value_ytd",
                reportTitle: "Tertiary Value YTD G/D",
                renderPrimary: (report, meta) =>
                  renderYtdTableContent(report, {
                    isCurrency: true,
                    reportType: meta.reportType,
                    reportTitle: meta.reportTitle,
                  }),
              })}
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
              {renderTagAwareReportContent(tertiaryVolYtd, {
                reportType: "tertiary_vol_ytd",
                reportTitle: "Tertiary Vol YTD G/D",
                renderPrimary: (report, meta) =>
                  renderYtdTableContent(report, {
                    isCurrency: false,
                    reportType: meta.reportType,
                    reportTitle: meta.reportTitle,
                  }),
              })}
            </ReportCard>
          )}
        </ReportGroup>

        {detailModal.open && (
          <div className="sales-report-modal-overlay" onClick={closeDetailModal}>
            <div
              className="sales-report-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="sales-report-modal__header">
                <div>
                  <h3>{detailModal.title}</h3>
                  <p>{detailModal.subtitle}</p>
                </div>
                <button type="button" onClick={closeDetailModal}>
                  <FaTimes />
                </button>
              </div>

              <div className="sales-report-modal__body">
                {detailModal.loading && (
                  <div className="sales-report-modal__state">Loading product details...</div>
                )}

                {!detailModal.loading && detailModal.error && (
                  <div className="sales-report-modal__state">{detailModal.error}</div>
                )}

                {!detailModal.loading && !detailModal.error && (
                  <div className="report-table-wrapper">
                    <table className="report-table report-table--modal">
                      <thead>
                        <tr>
                          <th>Product</th>
                          {detailModal.columns.map((column) => (
                            <th key={column}>{column}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {detailModal.rows.map((row, index) => (
                          <tr key={`${row.modelCode}-${index}`}>
                            <td className="metric-title">
                              <div className="product-cell">
                                <span>{row.modelCode || "-"}</span>
                                <small>{row.productLabel || "-"}</small>
                              </div>
                            </td>
                            {detailModal.columns.map((column) => (
                              <td key={column}>
                                {String(column).includes("%")
                                  ? formatPercent(row[column])
                                  : formatValue(row[column], false)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SalesReportV2;