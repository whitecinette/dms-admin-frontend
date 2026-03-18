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

const formatNum = (v) => {
  const n = safeNum(v);
  return n.toLocaleString("en-IN");
};

const formatMoneyNormal = (v) => {
  const n = safeNum(v);
  return `₹${n.toLocaleString("en-IN")}`;
};

const formatMoneyCompact = (v) => {
  const n = safeNum(v);

  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} Lac`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(2)} K`;

  return `₹${n.toLocaleString("en-IN")}`;
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
  const dp =
    row.dp ??
    row.price ??
    row.DP ??
    row.avgPrice ??
    row.average_price ??
    row.unit_price ??
    0;

  const lm =
    row.LM ??
    row.lm ??
    row.lastMonth ??
    row.last_month ??
    row.previousMonth ??
    row.previous_month ??
    0;

  const mtd =
    row.MTD ??
    row.mtd ??
    row.currentMonth ??
    row.current_month ??
    row.monthSales ??
    row.month_sales ??
    0;

  const total =
    row.total ??
    row.Total ??
    row.qty ??
    row.quantity ??
    row.sales ??
    0;

  const totalValue =
    row.totalValue ??
    row.total_value ??
    row.value ??
    row.salesValue ??
    row.sales_value ??
    0;

  return {
    segment: row.segment || segmentKey || "unknown",
    model: row.model || row.model_no || row.modelCode || row.model_code || row.product_code || "-",
    name: row.name || row.product_name || row.productName || row.description || row.model_no || "-",
    dp: safeNum(dp),
    LM: safeNum(lm),
    MTD: safeNum(mtd),
    total: safeNum(total),
    totalValue: safeNum(totalValue),
    topDealersByVolume: Array.isArray(row.topDealersByVolume) ? row.topDealersByVolume : [],
    topDealersByValue: Array.isArray(row.topDealersByValue) ? row.topDealersByValue : [],
  };
};

const SummaryCard = ({ title, value, sub, accent = "blue" }) => {
  return (
    <div className={`tss-summary-card ${accent}`}>
      <div className="tss-summary-title">{title}</div>
      <div className="tss-summary-value">{value}</div>
      {sub ? <div className="tss-summary-sub">{sub}</div> : null}
    </div>
  );
};

const TopDealerList = ({ dealers = [], moneyFormatter }) => {
  if (!dealers.length) return null;

  return (
    <div className="tss-dealer-block">
      <div className="tss-dealer-title">Top Dealers</div>

      <div className="tss-dealer-list">
        {dealers.map((dealer, idx) => (
          <div className="tss-dealer-item" key={`${dealer.dealerCode}-${idx}`}>
            <div className="tss-dealer-left">
              <span className="tss-dealer-rank">#{idx + 1}</span>
              <div className="tss-dealer-meta">
                <div className="tss-dealer-name">{dealer.dealerName || dealer.dealerCode}</div>
                <div className="tss-dealer-code">{dealer.dealerCode}</div>
              </div>
            </div>

            <div className="tss-dealer-pills">
              <span className="mini-pill">Vol {formatNum(dealer.totalQty)}</span>
              <span className="mini-pill strong">Val {moneyFormatter(dealer.totalValue)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TopProductItem = ({ item, rank, type = "volume", moneyFormatter }) => {
  if (!item) return null;

  const dealers =
    type === "value"
      ? item.topDealersByValue || []
      : item.topDealersByVolume || [];

  return (
    <div className="tss-top-item">
      <div className="tss-top-rank">#{rank}</div>

      <div className="tss-top-content">
        <div className="tss-top-name">
          {item.name} <span className="tss-top-model">({item.model})</span>
        </div>

        <div className="tss-top-pills">
          <span className="meta-pill">{item.segment}</span>
          <span className="meta-pill">DP {moneyFormatter(item.dp)}</span>

          {type === "value" ? (
            <>
              <span className="meta-pill">Vol {formatNum(item.total)}</span>
              <span className="meta-pill strong">Val {moneyFormatter(item.totalValue)}</span>
            </>
          ) : (
            <>
              <span className="meta-pill">Val {moneyFormatter(item.totalValue)}</span>
              <span className="meta-pill strong">Vol {formatNum(item.total)}</span>
            </>
          )}
        </div>

        <TopDealerList dealers={dealers} moneyFormatter={moneyFormatter} />
      </div>
    </div>
  );
};

const SegmentSection = ({ segment, rows = [], defaultOpen = false, moneyFormatter }) => {
  const [open, setOpen] = useState(defaultOpen);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => safeNum(b.total) - safeNum(a.total));
  }, [rows]);

  const totals = useMemo(() => {
    return sortedRows.reduce(
      (acc, item) => {
        acc.lm += safeNum(item.LM);
        acc.mtd += safeNum(item.MTD);
        acc.total += safeNum(item.total);
        return acc;
      },
      { lm: 0, mtd: 0, total: 0 }
    );
  }, [sortedRows]);

  return (
    <div className="tss-segment-card">
      <button
        type="button"
        className={`tss-segment-head ${open ? "open" : ""}`}
        onClick={() => setOpen((p) => !p)}
      >
        <div className="tss-segment-left">
          <div className="tss-segment-title">{segment}</div>
          <div className="tss-segment-sub">
            {sortedRows.length} model{sortedRows.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="tss-segment-stats">
          <span className="mini-pill">LM {formatNum(totals.lm)}</span>
          <span className="mini-pill">MTD {formatNum(totals.mtd)}</span>
          <span className="mini-pill strong">Total {formatNum(totals.total)}</span>
        </div>

        <div className="tss-chevron">{open ? "−" : "+"}</div>
      </button>

      {open && (
        <div className="tss-segment-body">
          <div className="tss-table-wrap desktop-only">
            <table className="tss-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Model</th>
                  <th>Name</th>
                  <th>DP</th>
                  <th>LM</th>
                  <th>MTD</th>
                  <th>Total Vol</th>
                  <th>Total Value</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.length ? (
                  sortedRows.map((row, idx) => (
                    <tr key={`${segment}-${row.model}-${idx}`}>
                      <td>{idx + 1}</td>
                      <td>{row.model}</td>
                      <td>{row.name}</td>
                      <td>{moneyFormatter(row.dp)}</td>
                      <td>{formatNum(row.LM)}</td>
                      <td>{formatNum(row.MTD)}</td>
                      <td>
                        <span className="qty-badge">{formatNum(row.total)}</span>
                      </td>
                      <td>{moneyFormatter(row.totalValue)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="tss-empty-cell">
                      No data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mobile-only tss-mobile-list">
            {sortedRows.length ? (
              sortedRows.map((row, idx) => (
                <div className="tss-mobile-item" key={`${segment}-${row.model}-${idx}`}>
                  <div className="tss-mobile-top">
                    <div>
                      <div className="tss-mobile-model">{row.model}</div>
                      <div className="tss-mobile-name">{row.name}</div>
                    </div>
                    <div className="qty-badge">{formatNum(row.total)}</div>
                  </div>

                  <div className="tss-mobile-grid">
                    <div className="kv">
                      <span>DP</span>
                      <strong>{moneyFormatter(row.dp)}</strong>
                    </div>
                    <div className="kv">
                      <span>Value</span>
                      <strong>{moneyFormatter(row.totalValue)}</strong>
                    </div>
                    <div className="kv">
                      <span>LM</span>
                      <strong>{formatNum(row.LM)}</strong>
                    </div>
                    <div className="kv">
                      <span>MTD</span>
                      <strong>{formatNum(row.MTD)}</strong>
                    </div>
                    <div className="kv">
                      <span>Total</span>
                      <strong>{formatNum(row.total)}</strong>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="tss-empty-card">No data</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function TopSellingSelf() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0);
  });

  const [search, setSearch] = useState("");
  const [segmentMap, setSegmentMap] = useState({});
  const [top3ByVolume, setTop3ByVolume] = useState([]);
  const [top3ByValue, setTop3ByValue] = useState([]);
  const [apiSummary, setApiSummary] = useState(null);
  const [moneyView, setMoneyView] = useState("normal");

  const moneyFormatter = (value) =>
    moneyView === "compact" ? formatMoneyCompact(value) : formatMoneyNormal(value);

  const fetchReport = async () => {
    try {
      setIsLoading(true);
      setErrorText("");

      const url =
        `${backendUrl}/other-reports/samsung/top-selling-products` +
        `?startDate=${encodeURIComponent(toInputDate(startDate))}` +
        `&endDate=${encodeURIComponent(toInputDate(endDate))}`;

      const res = await axios.get(url, {
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
      setTop3ByVolume((res.data?.top3ByVolume || []).map((row) => normalizeRow(row, row?.segment)));
      setTop3ByValue((res.data?.top3ByValue || []).map((row) => normalizeRow(row, row?.segment)));
    } catch (e) {
      console.error("Top selling products fetch failed:", e);
      setSegmentMap({});
      setTop3ByVolume([]);
      setTop3ByValue([]);
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

  const filteredSegmentMap = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return segmentMap;

    const next = {};
    Object.keys(segmentMap || {}).forEach((segment) => {
      const list = (segmentMap[segment] || []).filter((row) => {
        const model = String(row?.model || "").toLowerCase();
        const name = String(row?.name || "").toLowerCase();
        const seg = String(row?.segment || segment || "").toLowerCase();
        return model.includes(q) || name.includes(q) || seg.includes(q);
      });

      if (list.length) next[segment] = list;
    });

    return next;
  }, [segmentMap, search]);

  const sortedSegments = useMemo(() => {
    return Object.keys(filteredSegmentMap || {}).sort(segmentSort);
  }, [filteredSegmentMap]);

  const flatRows = useMemo(() => {
    return sortedSegments.flatMap((segment) => filteredSegmentMap[segment] || []);
  }, [filteredSegmentMap, sortedSegments]);

  const summary = useMemo(() => {
    const totals = flatRows.reduce(
      (acc, row) => {
        acc.models += 1;
        acc.lm += safeNum(row.LM);
        acc.mtd += safeNum(row.MTD);
        acc.total += safeNum(row.total);
        acc.totalValue += safeNum(row.totalValue);
        return acc;
      },
      { models: 0, lm: 0, mtd: 0, total: 0, totalValue: 0 }
    );

    return {
      segments: safeNum(apiSummary?.segments || sortedSegments.length),
      models: safeNum(apiSummary?.models || totals.models),
      lm: safeNum(apiSummary?.lm || totals.lm),
      mtd: safeNum(apiSummary?.mtd || totals.mtd),
      total: safeNum(apiSummary?.total || totals.total),
      totalValue: safeNum(apiSummary?.totalValue || totals.totalValue),
    };
  }, [flatRows, sortedSegments, apiSummary]);

  return (
    <div className="tss-page">
      <div className="tss-hero">
        <div>
          <div className="tss-page-title">Top Selling Products</div>
          <div className="tss-page-subtitle">
            Samsung activation report grouped by price segment
          </div>
        </div>

        <div className="tss-hero-actions">
          <button
            className="tss-btn ghost"
            type="button"
            onClick={() => {
              const now = new Date();
              setStartDate(new Date(now.getFullYear(), now.getMonth(), 1));
              setEndDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
            }}
          >
            Current Month
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
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="tss-filters-card">
        <div className="tss-filters-row">
          <div className="tss-field search">
            <label>Search</label>
            <input
              type="text"
              placeholder="Search model / name / segment"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="tss-field">
            <label>From</label>
            <input
              type="date"
              value={toInputDate(startDate)}
              max={toInputDate(endDate)}
              onChange={(e) => setStartDate(new Date(e.target.value))}
            />
          </div>

          <div className="tss-field">
            <label>To</label>
            <input
              type="date"
              value={toInputDate(endDate)}
              min={toInputDate(startDate)}
              onChange={(e) => setEndDate(new Date(e.target.value))}
            />
          </div>

          <div className="tss-field action">
            <label>&nbsp;</label>
            <button className="tss-btn primary full" type="button" onClick={fetchReport}>
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      <div className="tss-summary-grid">
        <SummaryCard
          title="Segments"
          value={formatNum(summary.segments)}
          sub="Visible price bands"
          accent="violet"
        />
        <SummaryCard
          title="Models"
          value={formatNum(summary.models)}
          sub="Products in current view"
          accent="blue"
        />
        <SummaryCard
          title="LM Sales"
          value={formatNum(summary.lm)}
          sub="Previous month quantity"
          accent="teal"
        />
        <SummaryCard
          title="MTD Sales"
          value={formatNum(summary.mtd)}
          sub="Current period quantity"
          accent="amber"
        />
      </div>

      <div className="tss-highlight-row top3-layout">
        <div className="tss-highlight-card">
          <div className="label">Top 3 by Volume</div>

          {top3ByVolume.length ? (
            <div className="tss-top-list">
              {top3ByVolume.map((item, idx) => (
                <TopProductItem
                  key={`vol-${item.model}-${idx}`}
                  item={item}
                  rank={idx + 1}
                  type="volume"
                  moneyFormatter={moneyFormatter}
                />
              ))}
            </div>
          ) : (
            <div className="empty-text">No product data available</div>
          )}
        </div>

        <div className="tss-highlight-card">
          <div className="label">Top 3 by Value</div>

          {top3ByValue.length ? (
            <div className="tss-top-list">
              {top3ByValue.map((item, idx) => (
                <TopProductItem
                  key={`val-${item.model}-${idx}`}
                  item={item}
                  rank={idx + 1}
                  type="value"
                  moneyFormatter={moneyFormatter}
                />
              ))}
            </div>
          ) : (
            <div className="empty-text">No product data available</div>
          )}
        </div>
      </div>

      <div className="tss-highlight-row compact">
        <div className="tss-highlight-card">
          <div className="label">Overall Quantity</div>
          <div className="value">{formatNum(summary.total)}</div>
          <div className="muted-line">Combined total across all visible segments</div>
        </div>

        <div className="tss-highlight-card">
          <div className="label">Overall Value</div>
          <div className="value">{moneyFormatter(summary.totalValue)}</div>
          <div className="muted-line">Combined invoice value across all visible segments</div>
        </div>
      </div>

      {errorText ? <div className="tss-alert error">{errorText}</div> : null}

      {isLoading ? (
        <div className="tss-loading-card">Loading report...</div>
      ) : sortedSegments.length ? (
        <div className="tss-sections">
          {sortedSegments.map((segment, idx) => (
            <SegmentSection
              key={segment}
              segment={segment}
              rows={filteredSegmentMap[segment] || []}
              defaultOpen={idx === 0}
              moneyFormatter={moneyFormatter}
            />
          ))}
        </div>
      ) : (
        <div className="tss-empty-state">No data found for selected filters</div>
      )}
    </div>
  );
}