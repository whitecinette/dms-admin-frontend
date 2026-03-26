import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import config from "../../../config";
import TextToggle from "../../../components/toggle";
import TableBodyLoading from "../../../components/tableLoading";
import {
  FaChevronDown,
  FaChevronUp,
  FaFilter,
  FaTimes,
  FaLayerGroup,
  FaSyncAlt,
} from "react-icons/fa";
import "./style.scss";

const backend_url = config.backend_url;

const DEALER_FILTER_TYPES = [
  { key: "zone", label: "Zone" },
  { key: "district", label: "District" },
  { key: "town", label: "Town" },
  { key: "category", label: "Category" },
  { key: "top_outlet", label: "Top Outlet" },
];

const parseNumericValue = (value) => {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return NaN;

  const numericString = value.replace(/[^0-9.-]/g, "");
  const num = parseFloat(numericString);
  return isNaN(num) ? NaN : num;
};

const getHeatmapStats = (row, header) => {
  const values = header
    .filter((key) => !["Price Class", "Group", "Rank of Samsung", "Total"].includes(key))
    .map((key) => parseNumericValue(row[key]))
    .filter((v) => !isNaN(v));

  if (!values.length) {
    return {
      min: 0,
      max: 0,
      p25: 0,
      p50: 0,
      p75: 0,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const getPercentile = (arr, p) => {
    const index = (arr.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return arr[lower];
    return arr[lower] + (arr[upper] - arr[lower]) * (index - lower);
  };

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p25: getPercentile(sorted, 0.25),
    p50: getPercentile(sorted, 0.5),
    p75: getPercentile(sorted, 0.75),
  };
};

const getSmartHeatmapColor = (value, stats) => {
  const numValue = parseNumericValue(value);
  if (isNaN(numValue)) return { background: "", text: "" };

  const { min, max } = stats;

  if (min === max) {
    return {
      background: "rgb(248,250,252)",
      text: "#374151",
    };
  }

  const spreadRatio = max / Math.max(min || 1, 1);
  let normalized = 0;

  if (spreadRatio > 8) {
    const safeMin = Math.max(0, min);
    const shifted = numValue - safeMin + 1;
    const shiftedMax = max - safeMin + 1;
    normalized =
      shiftedMax <= 1 ? 0 : Math.log(shifted) / Math.log(shiftedMax);
  } else {
    normalized = (numValue - min) / (max - min);
  }

  // clamp
  normalized = Math.max(0, Math.min(1, normalized));

  let r, g, b;

  // blue -> cyan -> green -> yellow -> red
  if (normalized <= 0.25) {
    const t = normalized / 0.25;
    r = Math.round(232 + (103 - 232) * t);
    g = Math.round(244 + (232 - 244) * t);
    b = Math.round(253 + (249 - 253) * t);
  } else if (normalized <= 0.5) {
    const t = (normalized - 0.25) / 0.25;
    r = Math.round(103 + (110 - 103) * t);
    g = Math.round(232 + (231 - 232) * t);
    b = Math.round(249 + (183 - 249) * t);
  } else if (normalized <= 0.75) {
    const t = (normalized - 0.5) / 0.25;
    r = Math.round(110 + (253 - 110) * t);
    g = Math.round(231 + (224 - 231) * t);
    b = Math.round(183 + (71 - 183) * t);
  } else {
    const t = (normalized - 0.75) / 0.25;
    r = Math.round(253 + (239 - 253) * t);
    g = Math.round(224 + (68 - 224) * t);
    b = Math.round(71 + (68 - 71) * t);
  }

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const textColor = luminance < 0.58 ? "#ffffff" : "#1f2937";

  return {
    background: `rgb(${r}, ${g}, ${b})`,
    text: textColor,
  };
};

const formatIndianNumber = (value) => {
  if (typeof value !== "string" && typeof value !== "number") return value;

  const num = parseNumericValue(value);
  if (isNaN(num)) return value;

  return num.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const getRedShadeColor = (value, rowMin, rowMax) => {
  const numValue = parseNumericValue(value);
  if (isNaN(numValue) || rowMin === rowMax) return { background: "", text: "" };

  const normalized = (numValue - rowMin) / (rowMax - rowMin);

  let r, g, b;

  if (normalized < 0.5) {
    const factor = normalized * 2;
    r = Math.floor(255);
    g = Math.floor(229 - (229 - 153) * factor);
    b = Math.floor(204 - (204 - 51) * factor);
  } else {
    const factor = (normalized - 0.5) * 2;
    r = Math.floor(255 - (255 - 204) * factor);
    g = Math.floor(153 - (153 - 85) * factor);
    b = Math.floor(51 - 51 * factor);
  }

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const textColor = luminance < 0.5 ? "#ffffff" : "#333333";

  return {
    background: `rgb(${r},${g},${b})`,
    text: textColor,
  };
};

const calculateRowHeatmapRange = (row, header) => {
  let min = Infinity;
  let max = -Infinity;

  header.forEach((headerKey) => {
    if (!["Price Class", "Group", "Rank of Samsung", "Total"].includes(headerKey)) {
      const numValue = parseNumericValue(row[headerKey]);
      if (!isNaN(numValue)) {
        min = Math.min(min, numValue);
        max = Math.max(max, numValue);
      }
    }
  });

  return { min, max };
};

const getDefaultPrevMonthRange = () => {
  const now = new Date();
  const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  return {
    start: firstDayPrevMonth.toISOString().split("T")[0],
    end: lastDayPrevMonth.toISOString().split("T")[0],
  };
};

function DynamicExtractionReport() {
  const prevMonthRange = getDefaultPrevMonthRange();

  const [startDate, setStartDate] = useState(prevMonthRange.start);
  const [endDate, setEndDate] = useState(prevMonthRange.end);
  const [metric, setMetric] = useState("value");
  const [view, setView] = useState("default");

  const [groupingOptions, setGroupingOptions] = useState([]);
  const [actorPositions, setActorPositions] = useState([]);

  const [groupBy, setGroupBy] = useState("price_segment");
  const [groupPosition, setGroupPosition] = useState("");

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

  const [reportRows, setReportRows] = useState([]);
  const [header, setHeader] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState("zone");
  const [searchText, setSearchText] = useState("");

  const [groupActorOptions, setGroupActorOptions] = useState([]);
  const [groupActorSelection, setGroupActorSelection] = useState([]);

  const panelRef = useRef(null);

  const authHeaders = useMemo(
    () => ({
      Authorization: localStorage.getItem("authToken"),
    }),
    []
  );

  const fetchGroupingOptions = async () => {
    try {
      const res = await axios.get(`${backend_url}/grouping-options`, {
        headers: authHeaders,
      });

      setGroupingOptions(res.data.groupByOptions || []);
      setActorPositions(res.data.actorPositions || []);

      if (!groupBy && res.data.groupByOptions?.length) {
        setGroupBy(res.data.groupByOptions[0].value);
      }
    } catch (error) {
      console.error("Error fetching grouping options:", error);
    }
  };

  const fetchFilterValues = async (type, position = "") => {
    try {
      const params = { type };
      if (position) params.position = position;

      const res = await axios.get(`${backend_url}/filter-values`, {
        params,
        headers: authHeaders,
      });

      return res.data.values || [];
    } catch (error) {
      console.error(`Error fetching filter values for ${type}:`, error);
      return [];
    }
  };

  const loadStaticFilterValues = async () => {
    const results = await Promise.all(
      DEALER_FILTER_TYPES.map((item) => fetchFilterValues(item.key))
    );

    const mapped = {};
    DEALER_FILTER_TYPES.forEach((item, index) => {
      mapped[item.key] = results[index] || [];
    });

    setFilterValues(mapped);
  };

  const loadActorLists = async () => {
    const map = {};
    for (const pos of actorPositions) {
      const positionValue = pos.value;
      map[positionValue] = await fetchFilterValues("actor", positionValue);
    }
    setActorOptionsMap(map);
  };

  const loadGroupActorOptions = async (positionValue) => {
    if (!positionValue) {
      setGroupActorOptions([]);
      return;
    }

    if (actorOptionsMap[positionValue]?.length) {
      setGroupActorOptions(actorOptionsMap[positionValue]);
      return;
    }

    const values = await fetchFilterValues("actor", positionValue);
    setActorOptionsMap((prev) => ({ ...prev, [positionValue]: values }));
    setGroupActorOptions(values);
  };

  const buildParams = () => {
    const params = {
      startDate,
      endDate,
      metric,
      view,
      groupBy,
    };

    if (groupBy === "actor" && groupPosition) {
      params.groupPosition = groupPosition;
    }

    if (brand) params.brand = brand;
    if (segment) params.segment = segment;

    Object.entries(selectedActorFilters).forEach(([position, selected]) => {
      if (selected?.length) {
        params[position] = selected.map((item) => item.code).join(",");
      }
    });

    Object.entries(selectedDealerFilters).forEach(([key, selected]) => {
      if (selected?.length) {
        if (key === "top_outlet") {
          params[key] = selected[0]?.value;
        } else {
          params[key] = selected.map((item) => item.value).join(",");
        }
      }
    });

    return params;
  };

  const getExtractionReport = async () => {
    try {
      setIsLoading(true);

      const res = await axios.get(`${backend_url}/dynamic-report`, {
        params: buildParams(),
        headers: authHeaders,
      });

      const rows = res.data.data || [];
      setReportRows(rows);

      if (rows.length > 0) {
        const keys = Object.keys(rows[0]);
        const preferredOrder = [
          "Price Class",
          "Group",
          "Samsung",
          "Vivo",
          "Oppo",
          "Xiaomi",
          "Apple",
          "OnePlus",
          "Realme",
          "Motorola",
          "Others",
          "Rank of Samsung",
          "Total",
        ];

        const sortedHeaders = preferredOrder.filter((k) => keys.includes(k));
        setHeader(sortedHeaders);
      } else {
        setHeader(
          groupBy === "price_segment"
            ? [
                "Price Class",
                "Samsung",
                "Vivo",
                "Oppo",
                "Xiaomi",
                "Apple",
                "OnePlus",
                "Realme",
                "Motorola",
                "Others",
                "Rank of Samsung",
                "Total",
              ]
            : [
                "Group",
                "Samsung",
                "Vivo",
                "Oppo",
                "Xiaomi",
                "Apple",
                "OnePlus",
                "Realme",
                "Motorola",
                "Others",
                "Rank of Samsung",
                "Total",
              ]
        );
      }
    } catch (error) {
      console.error("Error fetching extraction report:", error);
      setReportRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupingOptions();
    loadStaticFilterValues();
  }, []);

  useEffect(() => {
    if (actorPositions.length) {
      loadActorLists();
    }
  }, [JSON.stringify(actorPositions)]);

  useEffect(() => {
    if (groupBy === "actor" && groupPosition) {
      loadGroupActorOptions(groupPosition);
    } else {
      setGroupActorOptions([]);
      setGroupActorSelection([]);
    }
  }, [groupBy, groupPosition]);

  useEffect(() => {
    getExtractionReport();
  }, [
    startDate,
    endDate,
    metric,
    view,
    groupBy,
    groupPosition,
    brand,
    segment,
    JSON.stringify(selectedActorFilters),
    JSON.stringify(selectedDealerFilters),
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

  const resetAllFilters = () => {
    const prev = getDefaultPrevMonthRange();
    setStartDate(prev.start);
    setEndDate(prev.end);
    setMetric("value");
    setView("default");
    setGroupBy("price_segment");
    setGroupPosition("");
    setBrand("");
    setSegment("");
    setSelectedActorFilters({});
    setSelectedDealerFilters({
      zone: [],
      district: [],
      town: [],
      category: [],
      top_outlet: [],
    });
    setGroupActorSelection([]);
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
  }, [searchText, currentTabOptions]);

  const toggleSelection = (type, item) => {
    if (ACTOR_POSITION_KEYS.includes(type)) {
      const prev = selectedActorFilters[type] || [];
      const exists = prev.some((x) => x.code === item.code);

      setSelectedActorFilters((old) => ({
        ...old,
        [type]: exists ? prev.filter((x) => x.code !== item.code) : [...prev, item],
      }));
      return;
    }

    const prev = selectedDealerFilters[type] || [];
    const identityKey = type === "top_outlet" ? "value" : "value";
    const exists = prev.some((x) => x[identityKey] === item[identityKey]);

    setSelectedDealerFilters((old) => ({
      ...old,
      [type]:
        type === "top_outlet"
          ? exists
            ? []
            : [item]
          : exists
          ? prev.filter((x) => x[identityKey] !== item[identityKey])
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

  const renderChips = (type) => {
    const selected = ACTOR_POSITION_KEYS.includes(type)
      ? selectedActorFilters[type] || []
      : selectedDealerFilters[type] || [];

    if (!selected.length) return null;

    return (
      <div className="selected-chip-list">
        {selected.map((item) => (
          <button
            type="button"
            className="selected-chip"
            key={item.code || item.value}
            onClick={() => removeSelection(type, item)}
          >
            <span>{item.label || item.name || item.value}</span>
            <FaTimes />
          </button>
        ))}
      </div>
    );
  };

  const currentGroupLabel =
    groupingOptions.find((item) => item.value === groupBy)?.label || "Price Segment";

  return (
    <div className="extraction-report-dynamic-page">
      <div className="page-topbar">
        <div>
          <h1>Extraction Report</h1>
          <p>Dynamic grouping, practical filters, cleaner flow.</p>
        </div>

        <div className="topbar-actions">
          <button type="button" className="ghost-btn" onClick={resetAllFilters}>
            <FaSyncAlt />
            Reset
          </button>

          <button
            type="button"
            className="primary-btn"
            onClick={() => setFilterPanelOpen((prev) => !prev)}
          >
            <FaFilter />
            Filters
            {totalSelectedFiltersCount > 0 && (
              <span className="filter-badge">{totalSelectedFiltersCount}</span>
            )}
          </button>
        </div>
      </div>

      <div className="hero-cards">
        <div className="hero-card">
          <span className="hero-label">Grouping</span>
          <strong>{currentGroupLabel}</strong>
          {groupBy === "actor" && groupPosition ? (
            <small>
              {
                actorPositions.find((item) => item.value === groupPosition)?.label
              }
            </small>
          ) : (
            <small>Current report bucket</small>
          )}
        </div>

        <div className="hero-card">
          <span className="hero-label">Metric</span>
          <strong>{metric === "value" ? "Value" : "Volume"}</strong>
          <small>{view === "share" ? "Share View" : "Default View"}</small>
        </div>

        <div className="hero-card">
          <span className="hero-label">Date Range</span>
          <strong>{startDate}</strong>
          <small>to {endDate}</small>
        </div>
      </div>

      <div className="main-controls-card">
        <div className="main-controls-grid">
          <div className="control-block">
            <label>From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="control-block">
            <label>To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="control-block">
            <label>Group By</label>
            <select
              value={groupBy}
              onChange={(e) => {
                const next = e.target.value;
                setGroupBy(next);
                if (next !== "actor") {
                  setGroupPosition("");
                  setGroupActorSelection([]);
                }
              }}
            >
              {groupingOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {groupBy === "actor" && (
            <div className="control-block">
              <label>Actor Position</label>
              <select
                value={groupPosition}
                onChange={(e) => {
                  setGroupPosition(e.target.value);
                  setGroupActorSelection([]);
                }}
              >
                <option value="">Select position</option>
                {actorPositions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="control-block">
            <label>Brand</label>
            <input
              type="text"
              placeholder="Optional"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
          </div>

          <div className="control-block">
            <label>Segment</label>
            <input
              type="text"
              placeholder="Optional (e.g. 10-20)"
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
            />
          </div>
        </div>

        <div className="toggle-row">
          <div className="toggle-wrap">
            <TextToggle
              textFirst="default"
              textSecond="share"
              setText={setView}
              selectedText={view}
            />
            <TextToggle
              textFirst="value"
              textSecond="volume"
              setText={setMetric}
              selectedText={metric}
            />
          </div>
        </div>
      </div>

      {groupBy === "actor" && groupPosition && (
        <div className="group-actor-card">
          <div className="group-actor-header">
            <div>
              <h3>Grouped Actor Context</h3>
              <p>
                Previewing actor list for <strong>{groupPosition.toUpperCase()}</strong>.
              </p>
            </div>
            <div className="mini-badge">
              <FaLayerGroup />
              {groupActorOptions.length} options
            </div>
          </div>

          <div className="group-actor-preview">
            {groupActorOptions.slice(0, 12).map((item) => (
              <div className="group-actor-pill" key={item.code}>
                {item.label}
              </div>
            ))}
            {groupActorOptions.length > 12 && (
              <div className="group-actor-pill more-pill">
                +{groupActorOptions.length - 12} more
              </div>
            )}
          </div>
        </div>
      )}

      <div className="active-filters-strip">
        <div className="strip-title">Active Filters</div>
        <div className="strip-content">
          {Object.keys(selectedActorFilters).map((type) => renderChips(type))}
          {Object.keys(selectedDealerFilters).map((type) => renderChips(type))}
          {totalSelectedFiltersCount === 0 && (
            <div className="empty-filter-text">No extra filters selected</div>
          )}
        </div>
      </div>

      {filterPanelOpen && (
        <div className="filter-panel-overlay">
          <div className="filter-panel" ref={panelRef}>
            <div className="filter-panel-header">
              <div>
                <h3>Advanced Filters</h3>
                <p>All selected filters work together with grouping.</p>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setFilterPanelOpen(false)}
              >
                <FaTimes />
              </button>
            </div>

            <div className="filter-panel-body">
              <div className="filter-sidebar">
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

              <div className="filter-content">
                <div className="filter-content-top">
                  <div>
                    <h4>
                      {actorPositions.find((p) => p.value === activeFilterTab)?.label ||
                        DEALER_FILTER_TYPES.find((d) => d.key === activeFilterTab)?.label ||
                        "Filters"}
                    </h4>
                    <small>Select one or more values</small>
                  </div>

                  <div className="filter-content-actions">
                    <input
                      type="text"
                      placeholder="Search name, code or value"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                    />
                    <button type="button" className="ghost-btn" onClick={clearCurrentTab}>
                      Clear
                    </button>
                  </div>
                </div>

                {renderChips(activeFilterTab)}

                <div className="option-grid">
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
                          className={`option-pill ${isSelected ? "selected" : ""}`}
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
                    <div className="empty-options">No options found</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="table-card">
        <div className="table-card-header">
          <div>
            <h3>Report Output</h3>
            <p>
              {groupBy === "price_segment"
                ? "Price bucket wise report"
                : "Dynamic grouped report"}
            </p>
          </div>
          <div className="table-summary">
            <span>{reportRows.length} rows</span>
          </div>
        </div>

        <div className="extraction-report-table">
          <table>
            <thead>
              <tr>
                {header.map((key) => (
                  <th key={key} className="heatmap-header">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>

            {isLoading ? (
              <TableBodyLoading columnCount={header.length || 12} />
            ) : (
                <tbody>
                {reportRows.length > 0 ? (
                    reportRows.map((row, i) => {
                    const heatmapStats = getHeatmapStats(row, header);

                    const isTotalRow =
                        row["Price Class"] === "Total" || row["Group"] === "Total";

                    return (
                        <tr key={i} className={isTotalRow ? "total-row" : ""}>
                        {header.map((headerKey) => {
                            const value =
                            row[headerKey] !== undefined
                                ? row[headerKey]
                                : headerKey === "Total"
                                ? "0"
                                : "";

                            const isHeatmapColumn = ![
                            "Price Class",
                            "Group",
                            "Rank of Samsung",
                            "Total",
                            ].includes(headerKey);

                            const isNumeric = !isNaN(parseNumericValue(value));

                            const { background, text } =
                            isHeatmapColumn && isNumeric && !isTotalRow
                                ? getSmartHeatmapColor(value, heatmapStats)
                                : { background: "", text: "" };

                            return (
                            <td
                                key={headerKey}
                                style={{
                                textAlign: "center",
                                ...(isHeatmapColumn && isNumeric && !isTotalRow
                                    ? {
                                        backgroundColor: background,
                                        color: text,
                                        fontWeight: "bold",
                                        padding: "8px 5px",
                                    }
                                    : {}),
                                }}
                            >
                                {isHeatmapColumn && isNumeric ? (
                                view === "share" ? value : formatIndianNumber(value)
                                ) : headerKey === "Total" ? (
                                formatIndianNumber(value)
                                ) : (
                                value
                                )}
                            </td>
                            );
                        })}
                        </tr>
                    );
                    })
                ) : (
                    <tr>
                    <td colSpan={header.length || 1} style={{ textAlign: "center" }}>
                        No data available
                    </td>
                    </tr>
                )}
                </tbody>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

const ACTOR_POSITION_KEYS = ["smd", "zsm", "asm", "mdd", "tse", "dealer"];

export default DynamicExtractionReport;