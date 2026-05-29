import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import config from "../../../config";
import "./DealerShopInsights.scss";

const backendUrl = config.backend_url;
const DEMO_BRANDS = [
  "Samsung",
  "Vivo",
  "Oppo",
  "Apple",
  "Xiaomi",
  "Oneplus",
  "Realme",
  "Motorola",
];
const DEMO_FINANCE_METHODS = [
  "Bajaj",
  "HDB FIN",
  "HDFC CD",
  "HOME CREDIT",
  "ICICI CF",
  "IDFC FRIST",
  "TVS",
  "SF+ CHOLA",
  "SF+ DMI",
  "SF+ OTHER",
  "SF+ TVS",
];

const DEFAULT_SUMMARY = {
  totalRows: 0,
  dealersCovered: 0,
  brandsConfigured: 0,
  fixtureYesBrands: 0,
  secTotal: 0,
  financeTotal: 0,
  financeBreakdown: [],
  financeMethodColumns: [],
  brandKpiRows: [],
  brandColumns: [],
  dealerRows: [],
};

const toSafe = (v) => String(v || "").trim();
const toCode = (v) => toSafe(v).toUpperCase();
const toKey = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const getPrevMonthKey = () => {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const yyyy = prev.getFullYear();
  const mm = String(prev.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
};
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pickRandomItems = (items = [], count = 30) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
};
const parseNumericValue = (value) => {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return NaN;
  const numericString = value.replace(/[^0-9.-]/g, "");
  const num = Number(numericString);
  return Number.isFinite(num) ? num : NaN;
};

const getSmartHeatmapColor = (value, stats) => {
  const numValue = parseNumericValue(value);
  if (Number.isNaN(numValue)) return { background: "", text: "" };

  const { min = 0, max = 0 } = stats || {};
  if (min === max) return { background: "rgb(248,250,252)", text: "#334155" };

  let normalized = (numValue - min) / (max - min);
  normalized = Math.max(0, Math.min(1, normalized));

  let r;
  let g;
  let b;

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
  return {
    background: `rgb(${r}, ${g}, ${b})`,
    text: luminance < 0.58 ? "#ffffff" : "#1f2937",
  };
};

const monthKeyFromDate = (dateLike) => {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "";
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
};

const getMonthRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

  const a = new Date(start.getFullYear(), start.getMonth(), 1);
  const b = new Date(end.getFullYear(), end.getMonth(), 1);
  if (a > b) return [];

  const out = [];
  const cur = new Date(a);
  while (cur <= b) {
    out.push(monthKeyFromDate(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
};

const decodeJwtPayload = (token) => {
  try {
    if (!token || typeof token !== "string") return {};
    const parts = token.split(".");
    if (parts.length < 2) return {};
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = atob(padded);
    return JSON.parse(json) || {};
  } catch (_) {
    return {};
  }
};

const authHeaders = () => {
  const raw = localStorage.getItem("authToken") || "";
  if (!raw) return {};
  return {
    Authorization: raw.startsWith("Bearer ") ? raw : `Bearer ${raw}`,
  };
};

const positionFieldMap = {
  smd: "smd_code",
  zsm: "zsm_code",
  asm: "asm_code",
  mdd: "mdd_code",
  tse: "tse_code",
  so: "so_code",
  dealer: "dealer_code",
};

function DealerShopInsights({ startDate, endDate, dropdownValue = [] }) {
  const [metaLoading, setMetaLoading] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [dealersLoading, setDealersLoading] = useState(false);
  const [error, setError] = useState("");

  const [firms, setFirms] = useState([]);
  const [flows, setFlows] = useState([]);
  const [firmCodeFilter, setFirmCodeFilter] = useState("");
  const [flowFilter, setFlowFilter] = useState("");
  const [dealers, setDealers] = useState([]);
  const [selectedDealerCode, setSelectedDealerCode] = useState("");

  const [scopeStats, setScopeStats] = useState({
    loadedDealers: 0,
    scopedDealers: 0,
    fetchedRows: 0,
  });
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedRefreshTick, setSeedRefreshTick] = useState(0);

  const [summary, setSummary] = useState(DEFAULT_SUMMARY);

  const isAdminLike = useMemo(() => {
    const token = localStorage.getItem("authToken");
    const decoded = decodeJwtPayload(token);
    const roleRaw = String(localStorage.getItem("role") || decoded?.role || "");
    const role = roleRaw.trim().toLowerCase().replace(/\s+/g, "_");
    return role === "admin" || role === "super_admin" || role === "superadmin";
  }, []);

  const availableFlowsForFirm = useMemo(() => {
    if (!firmCodeFilter) return flows;
    const selected = firms.find((f) => String(f.code || "") === String(firmCodeFilter || ""));
    const flowTypes = Array.isArray(selected?.flowTypes) ? selected.flowTypes : [];
    if (!flowTypes.length) return flows;
    return flows.filter((flow) => flowTypes.includes(flow.name));
  }, [firmCodeFilter, firms, flows]);

  const groupedPositionCodes = useMemo(() => {
    const grouped = {};
    dropdownValue.forEach((item) => {
      const pos = toSafe(item?.position).toLowerCase();
      const code = toCode(item?.code);
      if (!pos || !code) return;
      if (!grouped[pos]) grouped[pos] = new Set();
      grouped[pos].add(code);
    });
    return grouped;
  }, [dropdownValue]);

  const brandKpiHeatmapStats = useMemo(() => {
    const rows = summary.brandKpiRows || [];
    const keys = [
      "dealers_covered",
      "profile_rows",
      "fixture_yes_count",
      "sec_total",
      "finance_total",
    ];
    const stats = {};

    keys.forEach((key) => {
      const nums = rows
        .map((row) => parseNumericValue(row?.[key]))
        .filter((n) => !Number.isNaN(n));
      stats[key] = nums.length
        ? { min: Math.min(...nums), max: Math.max(...nums) }
        : { min: 0, max: 0 };
    });

    (summary.financeMethodColumns || []).forEach((method) => {
      const nums = rows
        .map((row) => parseNumericValue(row?.finance_by_method?.[method] || 0))
        .filter((n) => !Number.isNaN(n));
      stats[`finance_method_${method}`] = nums.length
        ? { min: Math.min(...nums), max: Math.max(...nums) }
        : { min: 0, max: 0 };
    });

    return stats;
  }, [summary.brandKpiRows, summary.financeMethodColumns]);

  const dealerHeatmapStats = useMemo(() => {
    const rows = summary.dealerRows || [];
    const stats = {};
    const fixedKeys = ["brand_count", "fixture_yes_count", "sec_total", "finance_total"];

    fixedKeys.forEach((key) => {
      const nums = rows
        .map((row) => parseNumericValue(row?.[key]))
        .filter((n) => !Number.isNaN(n));
      stats[key] = nums.length
        ? { min: Math.min(...nums), max: Math.max(...nums) }
        : { min: 0, max: 0 };
    });

    (summary.brandColumns || []).forEach((brand) => {
      const nums = rows
        .map((row) => parseNumericValue(row?.brand_metrics?.[brand.key]?.sec_total))
        .filter((n) => !Number.isNaN(n));
      stats[`brand_sec_${brand.key}`] = nums.length
        ? { min: Math.min(...nums), max: Math.max(...nums) }
        : { min: 0, max: 0 };
    });

    return stats;
  }, [summary.dealerRows, summary.brandColumns]);

  const seedDemoDataForDealers = async () => {
    if (!isAdminLike || isSeeding) return;

    const monthKey = getPrevMonthKey();

    try {
      setIsSeeding(true);
      setError("");

      const dealerMap = new Map();
      const addDealers = (rows = []) => {
        rows.forEach((row) => {
          const code = toCode(row?.code || row?.dealer_code);
          if (!code || dealerMap.has(code)) return;
          dealerMap.set(code, {
            code,
            name: toSafe(row?.name || row?.dealer_name || code),
          });
        });
      };

      addDealers(dealers);
      addDealers(
        (summary.dealerRows || []).map((row) => ({
          code: row.dealer_code,
          name: row.dealer_name,
        }))
      );

      if (dealerMap.size < 30 && flowFilter) {
        const scopedRes = await axios.get(`${backendUrl}/user/dealer-shop-profiles/dealers`, {
          params: {
            limit: 20000,
            hierarchy_name: flowFilter,
            firm_code: firmCodeFilter || undefined,
          },
          headers: authHeaders(),
        });
        addDealers(Array.isArray(scopedRes.data?.dealers) ? scopedRes.data.dealers : []);
      }

      if (dealerMap.size < 30 && flowFilter) {
        const flowOnlyRes = await axios.get(`${backendUrl}/user/dealer-shop-profiles/dealers`, {
          params: {
            limit: 20000,
            hierarchy_name: flowFilter,
          },
          headers: authHeaders(),
        });
        addDealers(Array.isArray(flowOnlyRes.data?.dealers) ? flowOnlyRes.data.dealers : []);
      }

      const dealerPool = Array.from(dealerMap.values());
      const targetDealers = pickRandomItems(dealerPool, 30);
      if (!targetDealers.length) {
        setError("No dealers available in selected firm/flow to seed.");
        return;
      }

      const ok = window.confirm(
        `Seed random brand/shop demo data for ${targetDealers.length} dealers for month ${monthKey}?`
      );
      if (!ok) return;

      // Important: write brand rows sequentially per dealer to avoid backend
      // duplicate key race on unique dealer_code document creation.
      for (const dealer of targetDealers) {
        for (const brandName of DEMO_BRANDS) {
          const brandKey = toKey(brandName);
          const fixturesAvailable = Math.random() < 0.6;
          const secCount = randomInt(0, 6);
          const financeSales = DEMO_FINANCE_METHODS.map((method) => ({
            method_name: method,
            count: randomInt(0, 12),
          }));

          await axios.put(
            `${backendUrl}/user/dealer-shop-profiles/${dealer.code}/brands/${brandKey}`,
            {
              brand_name: brandName,
              fixtures_available: fixturesAvailable,
              fixtures_count: fixturesAvailable ? 1 : 0,
              sec_count: secCount,
              notes: "Demo seeded data",
              month_year: monthKey,
              finance_sales: financeSales,
              custom_properties: [],
            },
            { headers: authHeaders() }
          );
        }
      }

      setSeedRefreshTick((prev) => prev + 1);
      setError("");
      window.alert(
        `Demo seed complete: ${targetDealers.length} dealers x ${DEMO_BRANDS.length} brands.`
      );
    } catch (err) {
      console.error("Demo seeding failed:", err);
      setError(err?.response?.data?.message || "Failed to seed demo data.");
    } finally {
      setIsSeeding(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const fetchMeta = async () => {
      try {
        setMetaLoading(true);
        const res = await axios.get(`${backendUrl}/user/dealer-shop-profiles/meta`, {
          headers: authHeaders(),
        });

        if (!mounted) return;

        const data = res.data?.data || {};
        const firmRows = Array.isArray(data.firms) ? data.firms : [];
        const flowRows = Array.isArray(data.flows) ? data.flows : [];

        setFirms(firmRows);
        setFlows(flowRows);

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
        const nextFlow =
          flowRows.find((flow) => flow?.name === "default_sales_flow")?.name ||
          flowRows[0]?.name ||
          "";

        if (nextFirmCode) setFirmCodeFilter(nextFirmCode);
        if (nextFlow) setFlowFilter(nextFlow);
      } catch (err) {
        console.error("Dealer shop meta error:", err);
        if (mounted) setError("Unable to load firm/flow metadata.");
      } finally {
        if (mounted) setMetaLoading(false);
      }
    };

    fetchMeta();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!availableFlowsForFirm.length) {
      if (flowFilter) setFlowFilter("");
      return;
    }

    if (flowFilter && availableFlowsForFirm.some((flow) => flow.name === flowFilter)) return;

    const preferredFlow =
      availableFlowsForFirm.find((flow) => flow?.name === "default_sales_flow")?.name ||
      availableFlowsForFirm[0]?.name ||
      "";
    setFlowFilter(preferredFlow);
  }, [availableFlowsForFirm, flowFilter]);

  useEffect(() => {
    let mounted = true;

    const fetchDealers = async () => {
      if (!flowFilter) {
        setDealers([]);
        setScopeStats((prev) => ({ ...prev, loadedDealers: 0, scopedDealers: 0 }));
        return;
      }

      try {
        setDealersLoading(true);
        setError("");

        const res = await axios.get(`${backendUrl}/user/dealer-shop-profiles/dealers`, {
          params: {
            limit: 20000,
            firm_code: firmCodeFilter,
            hierarchy_name: flowFilter,
          },
          headers: authHeaders(),
        });

        if (!mounted) return;

        const apiRows = Array.isArray(res.data?.dealers) ? res.data.dealers : [];
        const nextDealers = apiRows
          .map((d) => ({
            ...d,
            code: toCode(d.code || d.dealer_code),
            name: toSafe(d.name || d.dealer_name || d.code || d.dealer_code),
          }))
          .filter((d) => d.code);

        setDealers(nextDealers);
        setScopeStats((prev) => ({
          ...prev,
          loadedDealers: nextDealers.length,
          scopedDealers: nextDealers.length,
        }));

        if (selectedDealerCode && !nextDealers.some((d) => d.code === selectedDealerCode)) {
          setSelectedDealerCode("");
        }
      } catch (err) {
        console.error("Dealer shop dealers error:", err);
        if (mounted) {
          setDealers([]);
          setScopeStats((prev) => ({ ...prev, loadedDealers: 0, scopedDealers: 0 }));
          setError("Unable to load dealers for selected firm/flow.");
        }
      } finally {
        if (mounted) setDealersLoading(false);
      }
    };

    fetchDealers();
    return () => {
      mounted = false;
    };
  }, [flowFilter, firmCodeFilter, selectedDealerCode]);

  useEffect(() => {
    let mounted = true;

    const fetchInsights = async () => {
      setError("");

      if (!startDate || !endDate || !flowFilter) {
        setSummary(DEFAULT_SUMMARY);
        setScopeStats((prev) => ({ ...prev, fetchedRows: 0, scopedDealers: dealers.length }));
        return;
      }

      const monthRange = getMonthRange(startDate, endDate);
      if (!monthRange.length) {
        setSummary(DEFAULT_SUMMARY);
        return;
      }

      try {
        setInsightsLoading(true);

        let scopedDealers = [...dealers];

        if (selectedDealerCode) {
          scopedDealers = scopedDealers.filter((dealer) => dealer.code === selectedDealerCode);
        }

        if (!isAdminLike) {
          Object.entries(groupedPositionCodes).forEach(([position, codes]) => {
            const hierarchyField = positionFieldMap[position];
            if (!hierarchyField || !codes?.size) return;

            const dealersWithField = scopedDealers.filter((dealer) =>
              Boolean(toCode(dealer?.hierarchy?.[hierarchyField] || dealer?.[hierarchyField]))
            );

            if (!dealersWithField.length) return;

            scopedDealers = dealersWithField.filter((dealer) => {
              const codeValue = toCode(
                dealer?.hierarchy?.[hierarchyField] || dealer?.[hierarchyField]
              );
              return Boolean(codeValue && codes.has(codeValue));
            });
          });
        }

        const allowedDealerCodes = new Set(scopedDealers.map((d) => d.code));
        setScopeStats((prev) => ({
          ...prev,
          scopedDealers: scopedDealers.length,
        }));

        const applyDealerScope = allowedDealerCodes.size > 0;

        const allRows = [];

        for (const monthYear of monthRange) {
          let page = 1;
          let totalPages = 1;

          do {
            const res = await axios.get(`${backendUrl}/user/dealer-shop-profiles`, {
              params: {
                page,
                limit: 500,
                month_year: monthYear,
                dealer_code: selectedDealerCode || undefined,
              },
              headers: authHeaders(),
            });

            const rows = Array.isArray(res.data?.rows) ? res.data.rows : [];

            const scopedRows = rows.filter((row) => {
              const dealerCode = toCode(row?.dealer_code);
              if (!dealerCode) return false;

              if (selectedDealerCode && dealerCode !== toCode(selectedDealerCode)) return false;

              if (applyDealerScope) return allowedDealerCodes.has(dealerCode);

              // Fallback for admin/super_admin when dealer list API is temporarily empty.
              if (isAdminLike) return true;

              return false;
            });

            allRows.push(...scopedRows);
            totalPages = Number(res.data?.totalPages || 1);
            page += 1;
          } while (page <= totalPages);
        }

        const dealerMap = new Map();
        const financeMap = new Map();
        const brandKpiMap = new Map();
        let brandsConfigured = 0;
        let fixtureYesBrands = 0;
        let secTotal = 0;
        let financeTotal = 0;

        allRows.forEach((row) => {
          const dealerCode = toCode(row.dealer_code);
          if (!dealerCode) return;

          const dealerName = toSafe(row.dealer_name || dealerCode);
          const hasBrand = Boolean(toSafe(row.brand_key));
          const brandKey = toSafe(row.brand_key);
          const brandName = toSafe(row.brand_name || row.brand_key);
          const brandMetricKey = toCode(brandKey);

          if (!dealerMap.has(dealerCode)) {
            dealerMap.set(dealerCode, {
              dealer_code: dealerCode,
              dealer_name: dealerName,
              brand_count: 0,
              fixture_yes_count: 0,
              sec_total: 0,
              finance_total: 0,
              brand_metrics: {},
            });
          }

          const dealerRow = dealerMap.get(dealerCode);

          if (hasBrand) {
            brandsConfigured += 1;
            dealerRow.brand_count += 1;

            if (brandMetricKey) {
              if (!dealerRow.brand_metrics[brandMetricKey]) {
                dealerRow.brand_metrics[brandMetricKey] = {
                  brand_key: brandMetricKey,
                  brand_name: brandName || brandKey,
                  fixture_yes: false,
                  sec_total: 0,
                };
              }

              if (!brandKpiMap.has(brandMetricKey)) {
                brandKpiMap.set(brandMetricKey, {
                  brand_key: brandMetricKey,
                  brand_name: brandName || brandKey,
                  profile_rows: 0,
                  fixture_yes_count: 0,
                  sec_total: 0,
                  finance_total: 0,
                  finance_by_method: {},
                  dealer_codes: new Set(),
                });
              }

              const brandKpi = brandKpiMap.get(brandMetricKey);
              brandKpi.profile_rows += 1;
              brandKpi.dealer_codes.add(dealerCode);
            }
          }

          if (row.fixtures_available === true) {
            fixtureYesBrands += 1;
            dealerRow.fixture_yes_count += 1;

            if (brandMetricKey && dealerRow.brand_metrics[brandMetricKey]) {
              dealerRow.brand_metrics[brandMetricKey].fixture_yes = true;
              const brandKpi = brandKpiMap.get(brandMetricKey);
              if (brandKpi) brandKpi.fixture_yes_count += 1;
            }
          }

          const sec = toNum(row.sec_count);
          secTotal += sec;
          dealerRow.sec_total += sec;

          if (brandMetricKey && dealerRow.brand_metrics[brandMetricKey]) {
            dealerRow.brand_metrics[brandMetricKey].sec_total += sec;
            const brandKpi = brandKpiMap.get(brandMetricKey);
            if (brandKpi) brandKpi.sec_total += sec;
          }

          const financeRows = Array.isArray(row.finance_sales) ? row.finance_sales : [];
          financeRows.forEach((f) => {
            const method = toSafe(f?.method_name || f?.method_key).toUpperCase();
            const count = toNum(f?.count);
            if (!method) return;

            financeTotal += count;
            dealerRow.finance_total += count;
            financeMap.set(method, (financeMap.get(method) || 0) + count);

            if (brandMetricKey) {
              const brandKpi = brandKpiMap.get(brandMetricKey);
              if (brandKpi) {
                brandKpi.finance_total += count;
                brandKpi.finance_by_method[method] =
                  (brandKpi.finance_by_method[method] || 0) + count;
              }
            }
          });
        });

        const financeBreakdown = Array.from(financeMap.entries())
          .map(([method, count]) => ({ method, count }))
          .sort((a, b) => b.count - a.count);

        const brandColumnMap = new Map();
        Array.from(dealerMap.values()).forEach((dealerRow) => {
          Object.values(dealerRow.brand_metrics || {}).forEach((metric) => {
            if (!metric?.brand_key) return;
            if (!brandColumnMap.has(metric.brand_key)) {
              brandColumnMap.set(metric.brand_key, metric.brand_name || metric.brand_key);
            }
          });
        });

        const brandColumns = Array.from(brandColumnMap.entries())
          .map(([key, name]) => ({ key, name }))
          .sort((a, b) => a.name.localeCompare(b.name));

        const brandKpiRows = Array.from(brandKpiMap.values())
          .map((row) => ({
            brand_key: row.brand_key,
            brand_name: row.brand_name,
            dealers_covered: row.dealer_codes.size,
            profile_rows: row.profile_rows,
            fixture_yes_count: row.fixture_yes_count,
            sec_total: row.sec_total,
            finance_total: row.finance_total,
            finance_by_method: row.finance_by_method || {},
          }))
          .sort((a, b) => a.brand_name.localeCompare(b.brand_name));

        const financeMethodColumns = Array.from(
          new Set(
            brandKpiRows.flatMap((row) => Object.keys(row.finance_by_method || {}))
          )
        ).sort((a, b) => a.localeCompare(b));

        if (!mounted) return;

        setScopeStats((prev) => ({
          ...prev,
          fetchedRows: allRows.length,
        }));

        setSummary({
          totalRows: allRows.length,
          dealersCovered: dealerMap.size,
          brandsConfigured,
          fixtureYesBrands,
          secTotal,
          financeTotal,
          financeBreakdown,
          financeMethodColumns,
          brandKpiRows,
          brandColumns,
          dealerRows: Array.from(dealerMap.values()).sort((a, b) =>
            a.dealer_name.localeCompare(b.dealer_name)
          ),
        });
      } catch (err) {
        console.error("Dealer shop insights error:", err);
        if (mounted) {
          setSummary(DEFAULT_SUMMARY);
          setScopeStats((prev) => ({ ...prev, fetchedRows: 0 }));
          setError("Unable to load dealer shop insights for selected filters.");
        }
      } finally {
        if (mounted) setInsightsLoading(false);
      }
    };

    fetchInsights();
    return () => {
      mounted = false;
    };
  }, [
    startDate,
    endDate,
    flowFilter,
    selectedDealerCode,
    groupedPositionCodes,
    dealers,
    isAdminLike,
    seedRefreshTick,
  ]);

  const hasFilters = Boolean(startDate && endDate && flowFilter);

  return (
    <section className="dealer-shop-insights">
      <div className="dealer-shop-insights__header">
        <div>
          <h3>Dealer Shop Insights</h3>
          <p>
            Month-clubbed dealer shop configuration summary for selected extraction filters.
          </p>
        </div>
        {isAdminLike ? (
          <button
            type="button"
            className="dealer-shop-insights__seed-btn"
            onClick={seedDemoDataForDealers}
            disabled={isSeeding || dealersLoading}
          >
            {isSeeding ? "Seeding..." : "Seed 30 Demo Dealers"}
          </button>
        ) : null}
      </div>

      <div className="dealer-shop-insights__filters">
        <label>
          Firm
          <select
            value={firmCodeFilter}
            onChange={(e) => setFirmCodeFilter(e.target.value)}
            disabled={metaLoading}
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
            value={flowFilter}
            onChange={(e) => setFlowFilter(e.target.value)}
            disabled={metaLoading}
          >
            <option value="">Select Flow</option>
            {availableFlowsForFirm.map((flow) => (
              <option key={flow.name} value={flow.name}>
                {flow.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Dealer (Optional)
          <select
            value={selectedDealerCode}
            onChange={(e) => setSelectedDealerCode(toCode(e.target.value))}
            disabled={dealersLoading}
          >
            <option value="">All Dealers</option>
            {dealers.map((dealer) => (
              <option key={dealer.code} value={dealer.code}>
                {dealer.name} ({dealer.code})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="dealer-shop-insights__meta">
        <span>
          Range: {startDate || "-"} to {endDate || "-"}
        </span>
        <span>Flow: {flowFilter || "-"}</span>
        <span>Dealers loaded: {scopeStats.loadedDealers}</span>
        <span>Dealers in scope: {scopeStats.scopedDealers}</span>
        <span>Rows in range: {scopeStats.fetchedRows}</span>
      </div>

      {error && <div className="dealer-shop-insights__error">{error}</div>}

      {!hasFilters ? (
        <div className="dealer-shop-insights__empty">Select date range and flow to view insights.</div>
      ) : insightsLoading ? (
        <div className="dealer-shop-insights__loading">Loading dealer shop insights...</div>
      ) : (
        <>
          <div className="dealer-shop-insights__breakdown">
            <h4>Finance Split (Clubbed)</h4>
            {summary.financeBreakdown.length ? (
              <div className="chips">
                {summary.financeBreakdown.map((item) => (
                  <span key={item.method}>
                    {item.method}: <b>{item.count}</b>
                  </span>
                ))}
              </div>
            ) : (
              <p>No finance split data for selected scope.</p>
            )}
          </div>

          <div className="dealer-shop-insights__brand-kpi">
            <h4>Brand-wise KPI Summary</h4>
            <div className="dealer-shop-insights__brand-kpi-table extraction-report-table">
              <table>
                <thead>
                  <tr>
                    <th>Brand</th>
                    <th>Dealers Covered</th>
                    <th>Profile Rows</th>
                    <th>Fixture Yes</th>
                    <th>SEC Total</th>
                    <th>Finance Units</th>
                    {summary.financeMethodColumns.map((method) => (
                      <th key={`kpi-${method}`}>{method}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summary.brandKpiRows.length ? (
                    summary.brandKpiRows.map((row) => (
                      <tr key={row.brand_key}>
                        <td>{row.brand_name}</td>
                        <td
                          className="heatmap-cell"
                          style={getSmartHeatmapColor(
                            row.dealers_covered,
                            brandKpiHeatmapStats.dealers_covered
                          )}
                        >
                          {row.dealers_covered}
                        </td>
                        <td
                          className="heatmap-cell"
                          style={getSmartHeatmapColor(
                            row.profile_rows,
                            brandKpiHeatmapStats.profile_rows
                          )}
                        >
                          {row.profile_rows}
                        </td>
                        <td
                          className="heatmap-cell"
                          style={getSmartHeatmapColor(
                            row.fixture_yes_count,
                            brandKpiHeatmapStats.fixture_yes_count
                          )}
                        >
                          {row.fixture_yes_count}
                        </td>
                        <td
                          className="heatmap-cell"
                          style={getSmartHeatmapColor(
                            row.sec_total,
                            brandKpiHeatmapStats.sec_total
                          )}
                        >
                          {row.sec_total}
                        </td>
                        <td
                          className="heatmap-cell"
                          style={getSmartHeatmapColor(
                            row.finance_total,
                            brandKpiHeatmapStats.finance_total
                          )}
                        >
                          {row.finance_total}
                        </td>
                        {summary.financeMethodColumns.map((method) => (
                          <td
                            key={`${row.brand_key}-${method}`}
                            className="heatmap-cell"
                            style={getSmartHeatmapColor(
                              row.finance_by_method?.[method] || 0,
                              brandKpiHeatmapStats[`finance_method_${method}`]
                            )}
                          >
                            {row.finance_by_method?.[method] || 0}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6 + summary.financeMethodColumns.length}>
                        No brand KPI data for selected scope.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="dealer-shop-insights__table-wrap extraction-report-table">
            <table>
              <thead>
                <tr>
                  <th>Dealer</th>
                  <th>Code</th>
                  <th>Brands</th>
                  <th>Fixture Yes</th>
                  <th>SEC Total</th>
                  <th>Finance Units</th>
                  {summary.brandColumns.map((brand) => (
                    <th key={`${brand.key}-fx`}>{brand.name} Fx</th>
                  ))}
                  {summary.brandColumns.map((brand) => (
                    <th key={`${brand.key}-sec`}>{brand.name} SEC</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.dealerRows.length ? (
                  summary.dealerRows.map((row) => (
                    <tr key={row.dealer_code}>
                      <td>{row.dealer_name}</td>
                      <td>{row.dealer_code}</td>
                      <td
                        className="heatmap-cell"
                        style={getSmartHeatmapColor(row.brand_count, dealerHeatmapStats.brand_count)}
                      >
                        {row.brand_count}
                      </td>
                      <td
                        className="heatmap-cell"
                        style={getSmartHeatmapColor(
                          row.fixture_yes_count,
                          dealerHeatmapStats.fixture_yes_count
                        )}
                      >
                        {row.fixture_yes_count}
                      </td>
                      <td
                        className="heatmap-cell"
                        style={getSmartHeatmapColor(row.sec_total, dealerHeatmapStats.sec_total)}
                      >
                        {row.sec_total}
                      </td>
                      <td
                        className="heatmap-cell"
                        style={getSmartHeatmapColor(
                          row.finance_total,
                          dealerHeatmapStats.finance_total
                        )}
                      >
                        {row.finance_total}
                      </td>
                      {summary.brandColumns.map((brand) => {
                        const metric = row.brand_metrics?.[brand.key];
                        return (
                          <td key={`${row.dealer_code}-${brand.key}-fx`}>
                            {metric?.fixture_yes ? (
                              <span className="fx-pill yes">Yes</span>
                            ) : (
                              <span className="fx-pill no">-</span>
                            )}
                          </td>
                        );
                      })}
                      {summary.brandColumns.map((brand) => {
                        const metric = row.brand_metrics?.[brand.key];
                        return (
                          <td
                            key={`${row.dealer_code}-${brand.key}-sec`}
                            className="heatmap-cell"
                            style={getSmartHeatmapColor(
                              metric?.sec_total || 0,
                              dealerHeatmapStats[`brand_sec_${brand.key}`]
                            )}
                          >
                            {metric?.sec_total || 0}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={summary.brandColumns.length * 2 + 6}>
                      No dealer shop profile data found in selected date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

export default DealerShopInsights;
