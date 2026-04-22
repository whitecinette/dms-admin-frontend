import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import config from "../../../config";
import "./style.scss";

const backendUrl = config.backend_url;

const toInputDate = (d) => {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
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

const normalizeRow = (row = {}, segmentKey = "") => {
  const dp = pickFirst(row, ["dp", "price", "DP", "avgPrice", "average_price", "unit_price"]);
  const lm = pickFirst(row, ["LM", "lm"]);
  const mtd = pickFirst(row, ["MTD", "mtd"]);
  const ftd = pickFirst(row, ["FTD", "ftd"]);
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
    GR: safeNum(gr),
    ADS: safeNum(ads),
    WOS: safeNum(wos),
    total: safeNum(total),
    totalValue: safeNum(totalValue),
    variantCount: safeNum(row.variantCount),
    children: Array.isArray(row.children)
      ? row.children.map((child) => normalizeRow(child, segmentKey))
      : [],
  };
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

export default function TopSellingSelf() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const [search, setSearch] = useState("");
  const [segmentMap, setSegmentMap] = useState({});
  const [apiSummary, setApiSummary] = useState(null);
  const [moneyView, setMoneyView] = useState("normal");
  const [activeSegment, setActiveSegment] = useState("all");
  const [sortBy, setSortBy] = useState("mtd");
  const [groupBy, setGroupBy] = useState("model");

  const [categoryOptions, setCategoryOptions] = useState([]);
  const [tagOptions, setTagOptions] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);

  const [metaInfo, setMetaInfo] = useState({
    usedDefaultDateRange: true,
    ftdDate: "",
    groupBy: "product_code",
  });

  const [expandedGroups, setExpandedGroups] = useState({});

  const hasManualDate = Boolean(startDate || endDate);

  const moneyFormatter = (value) =>
    moneyView === "compact" ? formatMoneyCompact(value) : formatMoneyNormal(value);

  const ftdColumnLabel = metaInfo?.usedDefaultDateRange ? "Yesterday Vol" : "FTD Vol";

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

      const res = await axios.get(buildUrl(), {
        headers: {
          ...getAuthHeader(),
          "Content-Type": "application/json",
        },
      });

      const rawMap = normalizeSegmentMap(res.data);

      const cleaned = {};
      Object.keys(rawMap || {}).forEach((segmentKey) => {
        const arr = Array.isArray(rawMap[segmentKey]) ? rawMap[segmentKey] : [];
        cleaned[segmentKey] = arr.map((row) => normalizeRow(row, segmentKey));
      });

      setSegmentMap(cleaned);
      setApiSummary(res.data?.summary || null);
      setCategoryOptions(Array.isArray(res.data?.filters?.categories) ? res.data.filters.categories : []);
      setTagOptions(Array.isArray(res.data?.filters?.tags) ? res.data.filters.tags : []);
      setMetaInfo({
        usedDefaultDateRange: Boolean(res.data?.meta?.usedDefaultDateRange),
        ftdDate: res.data?.meta?.ftdDate || "",
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
      setErrorText(e?.response?.data?.message || "Failed to fetch top selling products report");
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
                `${child.product_code} ${child.model} ${child.name} ${child.product_category} ${(child.tags || []).join(" ")}`.toLowerCase();
              return hay.includes(q);
            })
          : `${row.product_code} ${row.model} ${row.name} ${row.product_category} ${(row.tags || []).join(" ")}`.toLowerCase().includes(q);

        return categoryOk && tagsOk && searchOk;
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
        acc.totalValue += safeNum(row.totalValue);
        acc.ads += safeNum(row.ADS);
        return acc;
      },
      { models: 0, lm: 0, mtd: 0, ftd: 0, totalValue: 0, ads: 0 }
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
              ? `Custom range selected. ${ftdColumnLabel} is based on end date${metaInfo?.ftdDate ? ` (${metaInfo.ftdDate})` : ""}.`
              : `No date selected. Backend is using current month till today, and ${ftdColumnLabel} is based on yesterday${metaInfo?.ftdDate ? ` (${metaInfo.ftdDate})` : ""}.`}
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
                  <th>DP</th>
                  <th>LMTD Vol</th>
                  <th>MTD Vol</th>
                  <th>{ftdColumnLabel}</th>
                  <th>GR %</th>
                  <th>ADS</th>
                  <th>WOS</th>
                  <th>Total Value</th>
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
                          <td><span className="tss-heat-cell" style={getHeatCellStyle(row.dp, heatMax.dp, "245,158,11")}>{moneyFormatter(row.dp)}</span></td>
                          <td><span className="tss-heat-cell" style={getHeatCellStyle(row.LM, heatMax.lm, "59,130,246")}>{formatNum(row.LM)}</span></td>
                          <td><span className="tss-heat-cell" style={getHeatCellStyle(row.MTD, heatMax.mtd, "37,99,235")}>{formatNum(row.MTD)}</span></td>
                          <td><span className="tss-heat-cell" style={getHeatCellStyle(row.FTD, heatMax.ftd, "14,165,155")}>{formatNum(row.FTD)}</span></td>
                          <td><span className="tss-heat-cell" style={getGrowthStyle(row.GR)}>{`${formatDecimal(row.GR)}%`}</span></td>
                          <td><span className="tss-heat-cell" style={getHeatCellStyle(row.ADS, heatMax.ads, "99,102,241")}>{formatDecimal(row.ADS)}</span></td>
                          <td><span className="tss-heat-cell" style={getHeatCellStyle(row.WOS, heatMax.wos, "168,85,247")}>{formatDecimal(row.WOS)}</span></td>
                          <td><span className="tss-heat-cell" style={getHeatCellStyle(row.totalValue, heatMax.totalValue, "124,58,237")}>{moneyFormatter(row.totalValue)}</span></td>
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
                            <span className="mono">{row.model_code}</span>
                            <span className="tss-variant-badge">{row.variantCount} variants</span>
                          </button>
                        </td>
                        <td className="tss-name-cell tss-group-name">Model Family</td>
                        <td>—</td>
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
                        <td><span className="tss-heat-cell" style={getHeatCellStyle(row.dp, heatMax.dp, "245,158,11")}>{moneyFormatter(row.dp)}</span></td>
                        <td><span className="tss-heat-cell" style={getHeatCellStyle(row.LM, heatMax.lm, "59,130,246")}>{formatNum(row.LM)}</span></td>
                        <td><span className="tss-heat-cell" style={getHeatCellStyle(row.MTD, heatMax.mtd, "37,99,235")}>{formatNum(row.MTD)}</span></td>
                        <td><span className="tss-heat-cell" style={getHeatCellStyle(row.FTD, heatMax.ftd, "14,165,155")}>{formatNum(row.FTD)}</span></td>
                        <td><span className="tss-heat-cell" style={getGrowthStyle(row.GR)}>{`${formatDecimal(row.GR)}%`}</span></td>
                        <td><span className="tss-heat-cell" style={getHeatCellStyle(row.ADS, heatMax.ads, "99,102,241")}>{formatDecimal(row.ADS)}</span></td>
                        <td><span className="tss-heat-cell" style={getHeatCellStyle(row.WOS, heatMax.wos, "168,85,247")}>{formatDecimal(row.WOS)}</span></td>
                        <td><span className="tss-heat-cell" style={getHeatCellStyle(row.totalValue, heatMax.totalValue, "124,58,237")}>{moneyFormatter(row.totalValue)}</span></td>
                      </tr>
                    );

                    const childRows = isOpen
                      ? (row.children || []).map((child, childIdx) => (
                          <tr
                            key={`child-${groupKey}-${child.product_code}-${childIdx}`}
                            className="tss-child-row"
                          >
                            <td></td>
                            <td></td>
                            <td className="mono tss-child-code">
                              <span className="tss-child-connector" />
                              {child.product_code}
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
                            <td><span className="tss-heat-cell" style={getHeatCellStyle(child.dp, heatMax.dp, "245,158,11")}>{moneyFormatter(child.dp)}</span></td>
                            <td><span className="tss-heat-cell" style={getHeatCellStyle(child.LM, heatMax.lm, "59,130,246")}>{formatNum(child.LM)}</span></td>
                            <td><span className="tss-heat-cell" style={getHeatCellStyle(child.MTD, heatMax.mtd, "37,99,235")}>{formatNum(child.MTD)}</span></td>
                            <td><span className="tss-heat-cell" style={getHeatCellStyle(child.FTD, heatMax.ftd, "14,165,155")}>{formatNum(child.FTD)}</span></td>
                            <td><span className="tss-heat-cell" style={getGrowthStyle(child.GR)}>{`${formatDecimal(child.GR)}%`}</span></td>
                            <td><span className="tss-heat-cell" style={getHeatCellStyle(child.ADS, heatMax.ads, "99,102,241")}>{formatDecimal(child.ADS)}</span></td>
                            <td><span className="tss-heat-cell" style={getHeatCellStyle(child.WOS, heatMax.wos, "168,85,247")}>{formatDecimal(child.WOS)}</span></td>
                            <td><span className="tss-heat-cell" style={getHeatCellStyle(child.totalValue, heatMax.totalValue, "124,58,237")}>{moneyFormatter(child.totalValue)}</span></td>
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
    </div>
  );
}