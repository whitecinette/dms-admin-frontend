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
  const lm = pickFirst(row, ["LM", "lm", "lastMonth", "last_month", "previousMonth", "previous_month"]);
  const mtd = pickFirst(row, ["MTD", "mtd", "currentMonth", "current_month", "monthSales", "month_sales"]);
  const ftd = pickFirst(row, ["FTD", "ftd", "ftdVol", "ftdVolume", "FTD_VOLUME", "FTD_VOLUMN"]);
  const gr = pickFirst(row, ["GR", "gr", "growth", "growthPercent", "growth_percent"]);
  const ads = pickFirst(row, ["ADS", "ads", "avgDailySale", "average_daily_sales"]);
  const wos = pickFirst(row, ["WOS", "wos", "weeksOfStock", "weeks_of_stock"]);
  const total = pickFirst(row, ["total", "Total", "qty", "quantity", "sales"]);
  const totalValue = pickFirst(row, ["totalValue", "total_value", "value", "salesValue", "sales_value"]);

  return {
    segment: row.segment || segmentKey || "unknown",
    model: row.model || row.model_no || row.modelCode || row.model_code || row.product_code || "-",
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

  const [categoryOptions, setCategoryOptions] = useState([]);
  const [tagOptions, setTagOptions] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);

  const [metaInfo, setMetaInfo] = useState({
    usedDefaultDateRange: true,
    ftdDate: "",
  });

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
  };

  const buildUrl = () => {
    const params = new URLSearchParams();

    if (startDate) params.set("startDate", toInputDate(startDate));
    if (endDate) params.set("endDate", toInputDate(endDate));
    if (selectedCategory) params.set("productCategory", selectedCategory);
    if (selectedTags.length) params.set("tags", selectedTags.join(","));

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
      });
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

  const allRows = useMemo(() => {
    return sortedSegments.flatMap((segment) =>
      (segmentMap[segment] || []).map((row) => ({
        ...row,
        segment,
      }))
    );
  }, [segmentMap, sortedSegments]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    let rows = [...allRows];

    if (activeSegment !== "all") {
      rows = rows.filter(
        (row) => String(row.segment).toLowerCase() === String(activeSegment).toLowerCase()
      );
    }

    if (selectedCategory) {
      rows = rows.filter(
        (row) => String(row.product_category || "").toLowerCase() === String(selectedCategory).toLowerCase()
      );
    }

    if (selectedTags.length) {
      rows = rows.filter((row) =>
        selectedTags.every((tag) => (row.tags || []).includes(tag))
      );
    }

    if (q) {
      rows = rows.filter((row) => {
        const model = String(row?.model || "").toLowerCase();
        const name = String(row?.name || "").toLowerCase();
        const seg = String(row?.segment || "").toLowerCase();
        const cat = String(row?.product_category || "").toLowerCase();
        const tagsText = (row.tags || []).join(" ").toLowerCase();

        return (
          model.includes(q) ||
          name.includes(q) ||
          seg.includes(q) ||
          cat.includes(q) ||
          tagsText.includes(q)
        );
      });
    }

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

    return rows;
  }, [allRows, activeSegment, selectedCategory, selectedTags, search, sortBy]);

  const summary = useMemo(() => {
    const totals = filteredRows.reduce(
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

    const segmentCount =
      activeSegment === "all"
        ? sortedSegments.length
        : filteredRows.length
        ? 1
        : 0;

    return {
      segments:
        activeSegment === "all" && !selectedCategory && !selectedTags.length && !search
          ? safeNum(apiSummary?.segments || segmentCount)
          : segmentCount,
      models:
        activeSegment === "all" && !selectedCategory && !selectedTags.length && !search
          ? safeNum(apiSummary?.models || totals.models)
          : totals.models,
      lm:
        activeSegment === "all" && !selectedCategory && !selectedTags.length && !search
          ? safeNum(apiSummary?.lm || totals.lm)
          : totals.lm,
      mtd:
        activeSegment === "all" && !selectedCategory && !selectedTags.length && !search
          ? safeNum(apiSummary?.mtd || totals.mtd)
          : totals.mtd,
      ftd:
        activeSegment === "all" && !selectedCategory && !selectedTags.length && !search
          ? safeNum(apiSummary?.ftd || totals.ftd)
          : totals.ftd,
      totalValue:
        activeSegment === "all" && !selectedCategory && !selectedTags.length && !search
          ? safeNum(apiSummary?.totalValue || totals.totalValue)
          : totals.totalValue,
      avgAds: filteredRows.length ? totals.ads / filteredRows.length : 0,
    };
  }, [filteredRows, activeSegment, selectedCategory, selectedTags, search, sortedSegments, apiSummary]);

  const heatMax = useMemo(() => {
    return {
      dp: getMaxOf(filteredRows, "dp"),
      lm: getMaxOf(filteredRows, "LM"),
      mtd: getMaxOf(filteredRows, "MTD"),
      ftd: getMaxOf(filteredRows, "FTD"),
      ads: getMaxOf(filteredRows, "ADS"),
      wos: getMaxOf(filteredRows, "WOS"),
      totalValue: getMaxOf(filteredRows, "totalValue"),
    };
  }, [filteredRows]);

  return (
    <div className="tss-pro-page">
      <div className="tss-pro-header">
        <div>
          <h1 className="tss-pro-title">Model Wise Sales</h1>
          <p className="tss-pro-subtitle">
            Samsung activation performance with category, tags, growth and daily movement
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
              placeholder="Model / product / segment / category / tag"
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
        <KpiCard label="Models" value={formatNum(summary.models)} />
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
        ) : filteredRows.length ? (
          <div className="tss-table-wrap">
            <table className="tss-clean-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Segment</th>
                  <th>Model</th>
                  <th>Product Name</th>
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
                {filteredRows.map((row, idx) => (
                  <tr key={`${row.segment}-${row.model}-${idx}`}>
                    <td>{idx + 1}</td>

                    <td>
                      <span className="tss-segment-pill">{row.segment}</span>
                    </td>

                    <td className="mono">{row.model}</td>
                    <td className="tss-name-cell">{row.name}</td>
                    <td>{row.product_category || "-"}</td>

                    <td>
                      <div className="tss-row-tags">
                        {(row.tags || []).length ? (
                          row.tags.slice(0, 2).map((tag) => (
                            <span className="tss-row-tag" key={`${row.model}-${tag}`}>
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="tss-row-tag muted">—</span>
                        )}
                        {(row.tags || []).length > 2 ? (
                          <span className="tss-row-tag muted">+{row.tags.length - 2}</span>
                        ) : null}
                      </div>
                    </td>

                    <td>
                      <span
                        className="tss-heat-cell"
                        style={getHeatCellStyle(row.dp, heatMax.dp, "245,158,11")}
                      >
                        {moneyFormatter(row.dp)}
                      </span>
                    </td>

                    <td>
                      <span
                        className="tss-heat-cell"
                        style={getHeatCellStyle(row.LM, heatMax.lm, "59,130,246")}
                      >
                        {formatNum(row.LM)}
                      </span>
                    </td>

                    <td>
                      <span
                        className="tss-heat-cell"
                        style={getHeatCellStyle(row.MTD, heatMax.mtd, "37,99,235")}
                      >
                        {formatNum(row.MTD)}
                      </span>
                    </td>

                    <td>
                      <span
                        className="tss-heat-cell"
                        style={getHeatCellStyle(row.FTD, heatMax.ftd, "14,165,155")}
                      >
                        {formatNum(row.FTD)}
                      </span>
                    </td>

                    <td>
                      <span className="tss-heat-cell" style={getGrowthStyle(row.GR)}>
                        {`${formatDecimal(row.GR)}%`}
                      </span>
                    </td>

                    <td>
                      <span
                        className="tss-heat-cell"
                        style={getHeatCellStyle(row.ADS, heatMax.ads, "99,102,241")}
                      >
                        {formatDecimal(row.ADS)}
                      </span>
                    </td>

                    <td>
                      <span
                        className="tss-heat-cell"
                        style={getHeatCellStyle(row.WOS, heatMax.wos, "168,85,247")}
                      >
                        {formatDecimal(row.WOS)}
                      </span>
                    </td>

                    <td>
                      <span
                        className="tss-heat-cell"
                        style={getHeatCellStyle(row.totalValue, heatMax.totalValue, "124,58,237")}
                      >
                        {moneyFormatter(row.totalValue)}
                      </span>
                    </td>
                  </tr>
                ))}
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