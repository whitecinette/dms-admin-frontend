import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import ReactECharts from "echarts-for-react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import config from "../../config.js";
import { useFilters } from "../../context/filterContext.js";
import "./style.scss";

const backendUrl = config.backend_url;

const TREND_OPTIONS = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
];

const EXTRACTION_TREND_KEY = {
  daily: "extractionBrandTrendDaily",
  weekly: "extractionBrandTrendWeekly",
  monthly: "extractionBrandTrendMonthly",
  yearly: "extractionBrandTrendMonthly",
};

const numberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

const EXTRACTION_COLORS = [
  "#2563eb",
  "#16a34a",
  "#f97316",
  "#a21caf",
  "#0891b2",
  "#dc2626",
  "#4f46e5",
  "#65a30d",
  "#db2777",
  "#0f766e",
];

const DEFAULT_FLOW_NAME = "default_sales_flow";
const DEFAULT_FIRM_MATCH = "siddha";
const INDIA_CENTER = [22.9734, 78.6569];

const DefaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function normalizeFlowTypes(flowTypes) {
  if (Array.isArray(flowTypes)) return flowTypes;
  if (typeof flowTypes === "string") {
    return flowTypes
      .split(",")
      .map((flow) => flow.trim())
      .filter(Boolean);
  }
  return [];
}

function getDefaultFirmCode(firms = []) {
  const siddhaFirm = firms.find((firm) => {
    const text = `${firm?.name || ""} ${firm?.code || ""}`.toLowerCase();
    return text.includes(DEFAULT_FIRM_MATCH);
  });
  return String((siddhaFirm || firms[0])?.code || "").trim();
}

function parseNum(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").replace(/%/g, "").trim();
    if (!cleaned) return 0;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeText(value) {
  return value === null || value === undefined ? "" : String(value).trim().toLowerCase();
}

function getDistrictLikeValue(row = {}) {
  return String(
    row?.district ||
      row?.districtName ||
      row?.district_name ||
      row?.town ||
      row?.townName ||
      row?.town_name ||
      row?.city ||
      row?.cityName ||
      row?.region ||
      row?.regionName ||
      row?.location ||
      row?.locationName ||
      row?.taluka ||
      row?.name ||
      ""
  ).trim();
}

function parseCodesFromValue(value) {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.flatMap((item) => parseCodesFromValue(item));
  if (typeof value === "object") {
    return parseCodesFromValue(value.code || value.userCode || value.employeeCode || "");
  }
  return String(value)
    .replace(/[|;/]/g, ",")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function getValidCoordinate(value) {
  const num = parseNum(value);
  return Number.isFinite(num) && num !== 0 ? num : null;
}

function metricColor(score = 0) {
  if (score >= 80) return "#16a34a";
  if (score >= 60) return "#22c55e";
  if (score >= 40) return "#f59e0b";
  if (score >= 20) return "#f97316";
  return "#ef4444";
}

function FitMapBounds({ points = [] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude]));
    map.fitBounds(bounds.pad(0.22));
  }, [map, points]);
  return null;
}

function toDateInputValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCompact(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "0";

  if (Math.abs(num) >= 10000000) return `${(num / 10000000).toFixed(2)} Cr`;
  if (Math.abs(num) >= 100000) return `${(num / 100000).toFixed(2)} L`;
  if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(1)} K`;

  return numberFormatter.format(num);
}

function formatPct(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function formatPeriod(period, trend) {
  if (!period) return "-";

  if (trend === "weekly") {
    return period.replace("W", " W");
  }

  if (trend === "monthly") {
    const [year, month] = String(period).split("-");
    if (!year || !month) return period;
    const dt = new Date(Number(year), Number(month) - 1, 1);
    return dt.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
  }

  if (trend === "daily") {
    const dt = new Date(period);
    if (Number.isNaN(dt.getTime())) return period;
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  }

  return String(period);
}

function Dashboard() {
  const {
    selectedValue,
    setSelectedValue,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    dropdownValue,
  } = useFilters();

  const [trend, setTrend] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState(null);
  const [mapLayer, setMapLayer] = useState("sales");
  const [showDealerMarkers, setShowDealerMarkers] = useState(false);
  const [showMssMarkers, setShowMssMarkers] = useState(false);
  const [showHeatLayer, setShowHeatLayer] = useState(true);
  const [mapFirms, setMapFirms] = useState([]);
  const [mapFlows, setMapFlows] = useState([]);
  const [mapFlowMap, setMapFlowMap] = useState({});
  const [mapFirmCode, setMapFirmCode] = useState("");
  const [mapFlowName, setMapFlowName] = useState(DEFAULT_FLOW_NAME);
  const [mapMetric, setMapMetric] = useState("value");
  const [mapStartDate, setMapStartDate] = useState(null);
  const [mapEndDate, setMapEndDate] = useState(null);
  const [mapMetaLoading, setMapMetaLoading] = useState(false);
  const [mapOverview, setMapOverview] = useState(null);
  const [mapGeoRows, setMapGeoRows] = useState([]);
  const [mapHierarchyRows, setMapHierarchyRows] = useState([]);
  const [mapHierarchyColumns, setMapHierarchyColumns] = useState([]);
  const [mapActorNameByCode, setMapActorNameByCode] = useState({});
  const [mapDealerSalesRows, setMapDealerSalesRows] = useState([]);
  const [mapDealerSalesHeaders, setMapDealerSalesHeaders] = useState([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState("");

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("authToken") || "";
    if (!token) return {};
    return {
      Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
    };
  }, []);

  useEffect(() => {
    if (!startDate || !endDate) {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay);
      setEndDate(now);
    }
  }, [startDate, endDate, setStartDate, setEndDate]);

  useEffect(() => {
    if (!mapStartDate && startDate) setMapStartDate(startDate);
    if (!mapEndDate && endDate) setMapEndDate(endDate);
  }, [startDate, endDate, mapStartDate, mapEndDate]);

  useEffect(() => {
    if (selectedValue === "value" || selectedValue === "volume") {
      setMapMetric(selectedValue);
    }
  }, [selectedValue]);

  const selectedSubordinateCodes = useMemo(
    () =>
      Array.isArray(dropdownValue)
        ? dropdownValue.map((item) => item?.code).filter(Boolean)
        : [],
    [dropdownValue]
  );

  const fetchOverview = useCallback(async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    setError("");

    try {
      const res = await axios.post(
        `${backendUrl}/main-dashboard/overview`,
        {
          startDate: toDateInputValue(startDate),
          endDate: toDateInputValue(endDate),
          metric: selectedValue,
          flow_name: "default_sales_flow",
          subordinate_filters: {},
          dealer_filters: {},
          attendance_filters: {},
          coverage_filters: {},
          recent_days: 7,
        },
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );

      setOverview(res.data || null);
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to load dashboard overview";
      setError(message);
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedValue]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const selectedMapFirm = useMemo(
    () => mapFirms.find((firm) => String(firm?.code || "") === String(mapFirmCode || "")),
    [mapFirms, mapFirmCode]
  );

  const mapFlowOptions = useMemo(() => {
    const firmFlows = normalizeFlowTypes(selectedMapFirm?.flowTypes);
    const source = firmFlows.length > 0 ? firmFlows : mapFlows;
    return source
      .map((flow) => {
        if (typeof flow === "string") return { name: flow, label: flow };
        const name = String(flow?.name || flow?.flowName || flow?.value || "").trim();
        if (!name) return null;
        return {
          name,
          label: String(flow?.label || flow?.name || name).trim(),
        };
      })
      .filter(Boolean);
  }, [selectedMapFirm, mapFlows]);

  useEffect(() => {
    let cancelled = false;
    const loadMapMeta = async () => {
      setMapMetaLoading(true);
      try {
        const res = await axios.get(`${backendUrl}/super-admin/hierarchy/meta`, {
          headers: getAuthHeaders(),
        });
        const firms = Array.isArray(res?.data?.data?.firms) ? res.data.data.firms : [];
        const flows = Array.isArray(res?.data?.data?.flows) ? res.data.data.flows : [];
        const flowMap = res?.data?.data?.flowMap || {};
        if (cancelled) return;

        setMapFirms(firms);
        setMapFlows(flows);
        setMapFlowMap(flowMap);

        const defaultFirmCode = getDefaultFirmCode(firms);
        const defaultFirm = firms.find((firm) => String(firm?.code || "") === defaultFirmCode);
        const defaultFirmFlows = normalizeFlowTypes(defaultFirm?.flowTypes);
        const flowSource = defaultFirmFlows.length > 0 ? defaultFirmFlows : flows;
        const hasDefaultFlow = flowSource.some((flow) => {
          const name = typeof flow === "string" ? flow : flow?.name;
          return String(name || "") === DEFAULT_FLOW_NAME;
        });

        setMapFirmCode((prev) => prev || defaultFirmCode);
        setMapFlowName((prev) =>
          prev ||
          (hasDefaultFlow
            ? DEFAULT_FLOW_NAME
            : String(flowSource[0]?.name || flowSource[0] || DEFAULT_FLOW_NAME))
        );
      } catch (metaError) {
        if (cancelled) return;
        setMapError(
          metaError?.response?.data?.message || "Unable to load firm/flow options for map."
        );
      } finally {
        if (!cancelled) setMapMetaLoading(false);
      }
    };

    loadMapMeta();
    return () => {
      cancelled = true;
    };
  }, [getAuthHeaders]);

  useEffect(() => {
    if (!mapFlowOptions.length) return;
    setMapFlowName((prev) => {
      const hasCurrent = mapFlowOptions.some((flow) => flow.name === prev);
      if (hasCurrent) return prev;
      const defaultFlow = mapFlowOptions.find((flow) => flow.name === DEFAULT_FLOW_NAME);
      return defaultFlow?.name || mapFlowOptions[0]?.name || DEFAULT_FLOW_NAME;
    });
  }, [mapFlowOptions]);

  const fetchUserNamesByCodes = useCallback(
    async (codes = []) => {
      const needed = new Set(codes.map((code) => normalizeText(code)).filter(Boolean));
      if (!needed.size) return {};
      const found = new Map();
      let page = 1;
      const limit = 1000;
      let hasMore = true;

      while (hasMore && page <= 30 && found.size < needed.size) {
        const res = await axios.get(`${backendUrl}/super-admin/user-directory`, {
          params: {
            search: "",
            position: "",
            role: "",
            status: "",
            firm_code: "",
            page,
            limit,
          },
          headers: getAuthHeaders(),
        });
        const rows = Array.isArray(res?.data?.rows) ? res.data.rows : [];
        rows.forEach((row) => {
          const code = normalizeText(
            row?.code || row?.employeeCode || row?.empCode || row?.userCode || ""
          );
          if (!code || !needed.has(code) || found.has(code)) return;
          const name = String(
            row?.name || row?.employeeName || row?.fullName || row?.metadata?.name || ""
          ).trim();
          found.set(code, name || row?.code || "");
        });
        const total = Number(res?.data?.total || 0);
        hasMore = rows.length === limit && page * limit < total;
        page += 1;
      }

      return Object.fromEntries(found.entries());
    },
    [getAuthHeaders]
  );

  const fetchMapData = useCallback(async () => {
    if (!mapStartDate || !mapEndDate || !mapFlowName) return;
    setMapLoading(true);
    setMapError("");

    try {
      const [overviewRes, geoRes, hierarchyRes] = await Promise.all([
        axios.post(
          `${backendUrl}/main-dashboard/overview`,
          {
            startDate: toDateInputValue(mapStartDate),
            endDate: toDateInputValue(mapEndDate),
            metric: mapMetric,
            flow_name: mapFlowName,
            subordinate_filters: mapFirmCode ? { firm_code: mapFirmCode } : {},
            dealer_filters: mapFirmCode ? { firm_code: mapFirmCode } : {},
            attendance_filters: {},
            coverage_filters: mapFirmCode ? { firm_code: mapFirmCode } : {},
            recent_days: 7,
          },
          { headers: getAuthHeaders() }
        ),
        axios.get(`${backendUrl}/get-geo-tag-dealers-for-admin`, {
          params: {
            hierarchy_name: mapFlowName,
            page: 1,
            limit: 5000,
            search: "",
          },
          headers: getAuthHeaders(),
        }),
        axios.get(`${backendUrl}/super-admin/hierarchy`, {
          params: {
            firm_code: mapFirmCode || "",
            hierarchy_name: mapFlowName,
            all: true,
          },
          headers: getAuthHeaders(),
        }),
      ]);

      const geoRows = Array.isArray(geoRes?.data?.data)
        ? geoRes.data.data
        : Array.isArray(geoRes?.data)
        ? geoRes.data
        : [];
      const hierarchyRows = Array.isArray(hierarchyRes?.data?.rows) ? hierarchyRes.data.rows : [];
      const hierarchyColumns = Array.isArray(hierarchyRes?.data?.columns)
        ? hierarchyRes.data.columns
        : [];

      const candidateColumns = (mapFlowMap?.[mapFlowName] || []).filter(Boolean);
      const fallbackColumns = hierarchyColumns.filter((col) => {
        const key = normalizeText(col);
        return !["_id", "id", "firm_code", "firm", "hierarchy_name", "createdat", "updatedat", "__v"].includes(key);
      });
      const chainColumns = candidateColumns.length ? candidateColumns : fallbackColumns;

      const neededCodes = new Set();
      hierarchyRows.forEach((row) => {
        chainColumns.forEach((col) => {
          parseCodesFromValue(row?.[col]).forEach((code) => neededCodes.add(normalizeText(code)));
        });
      });
      const actorNameByCode = await fetchUserNamesByCodes(Array.from(neededCodes));

      let dealerSalesRows = [];
      let dealerSalesHeaders = [];
      try {
        const dealerSalesRes = await axios.post(
          `${backendUrl}/user/sales-data/report/self`,
          {
            subordinate_codes: selectedSubordinateCodes,
            start_date: toDateInputValue(mapStartDate),
            end_date: toDateInputValue(mapEndDate),
            filter_type: mapMetric,
            report_type: "dealer",
          },
          { headers: getAuthHeaders() }
        );
        dealerSalesHeaders = Array.isArray(dealerSalesRes?.data?.headers)
          ? dealerSalesRes.data.headers
          : [];
        dealerSalesRows = Array.isArray(dealerSalesRes?.data?.data)
          ? dealerSalesRes.data.data
          : Array.isArray(dealerSalesRes?.data?.rows)
          ? dealerSalesRes.data.rows
          : [];
      } catch (dealerSalesError) {
        dealerSalesRows = [];
        dealerSalesHeaders = [];
      }

      setMapOverview(overviewRes?.data || null);
      setMapGeoRows(geoRows);
      setMapHierarchyRows(hierarchyRows);
      setMapHierarchyColumns(chainColumns);
      setMapActorNameByCode(actorNameByCode);
      setMapDealerSalesRows(dealerSalesRows);
      setMapDealerSalesHeaders(dealerSalesHeaders);
    } catch (mapFetchError) {
      setMapOverview(null);
      setMapGeoRows([]);
      setMapHierarchyRows([]);
      setMapHierarchyColumns([]);
      setMapActorNameByCode({});
      setMapDealerSalesRows([]);
      setMapDealerSalesHeaders([]);
      setMapError(
        mapFetchError?.response?.data?.message || "Failed to load map overlays."
      );
    } finally {
      setMapLoading(false);
    }
  }, [
    mapStartDate,
    mapEndDate,
    mapMetric,
    mapFlowName,
    mapFirmCode,
    getAuthHeaders,
    mapFlowMap,
    fetchUserNamesByCodes,
    selectedSubordinateCodes,
  ]);

  useEffect(() => {
    fetchMapData();
  }, [fetchMapData]);

  const salesKpis = overview?.kpis?.sales || {};
  const coverageKpis = overview?.kpis?.coverage || {};
  const extractionKpis = overview?.kpis?.extraction || {};
  const attendanceKpis = overview?.kpis?.attendance || {};

  const salesTrendData = useMemo(() => {
    const rows = overview?.charts?.salesTrend?.[trend] || [];
    return rows.map((row) => ({
      ...row,
      label: formatPeriod(row.period, trend),
    }));
  }, [overview, trend]);

  const extractionBrands = useMemo(() => {
    const rows = overview?.charts?.extractionBrandShare || [];
    return rows
      .filter((item) => Number(item?.sharePct || 0) > 0)
      .map((item) => item.brand);
  }, [overview]);

  const extractionTrendData = useMemo(() => {
    const trendKey = EXTRACTION_TREND_KEY[trend] || "extractionBrandTrendMonthly";
    const rows = overview?.charts?.[trendKey] || [];
    return rows.map((row) => ({
      ...row,
      label: formatPeriod(row.period, trend),
    }));
  }, [overview, trend]);

  const coverageTrendData = useMemo(() => {
    const rows = overview?.charts?.coverageTrend || [];
    return rows.map((row) => ({
      ...row,
      label: formatPeriod(row.period, "daily"),
      planned: Number(row.planned || 0),
      done: Number(row.done || 0),
      pending: Number(row.pending || 0),
      coveragePct:
        Number(row.planned || 0) > 0
          ? Number((((Number(row.done || 0) / Number(row.planned || 0)) * 100) || 0).toFixed(2))
          : 0,
    }));
  }, [overview]);

  const attendanceOverviewCards = useMemo(
    () => [
      {
        key: "present",
        label: "Present",
        value: Number(attendanceKpis.present || 0) + Number(attendanceKpis.pending || 0),
        tone: "present",
      },
      { key: "halfDay", label: "Half Day", value: Number(attendanceKpis.halfDay || 0), tone: "halfday" },
      { key: "leave", label: "Leave", value: Number(attendanceKpis.leave || 0), tone: "leave" },
      { key: "absent", label: "Absent", value: Number(attendanceKpis.absent || 0), tone: "absent" },
      { key: "pending", label: "Pending", value: Number(attendanceKpis.pending || 0), tone: "pending" },
      { key: "totalEligible", label: "Eligible", value: Number(attendanceKpis.totalEligible || 0), tone: "eligible" },
    ],
    [attendanceKpis]
  );

  const attendanceFirmData = useMemo(() => {
    const rows = overview?.charts?.attendanceFirmBreakdown || [];
    return rows.slice(0, 10).map((row) => ({
      label: row.firmName || row.firmCode || "NA",
      present: Number(row.present || 0),
      halfDay: Number(row.halfDay || 0),
      leave: Number(row.leave || 0),
      absent: Number(row.absent || 0),
      pending: Number(row.pending || 0),
      totalEligible: Number(row.totalEligible || 0),
    }));
  }, [overview]);

  const extractionBrandShareData = useMemo(() => {
    const rows = overview?.charts?.extractionBrandShare || [];
    return rows.slice(0, 8).map((row) => ({
      brand: row.brand,
      sharePct: Number(row.sharePct || 0),
    }));
  }, [overview]);

  const regionMatrix = useMemo(() => {
    const toArray = (value) => (Array.isArray(value) ? value : []);
    const salesRows = toArray(overview?.charts?.salesRegionHeatmap);
    const coverageRows = toArray(overview?.charts?.coverageRegionHeatmap);
    const extractionRows = toArray(
      overview?.charts?.extractionRegionHeatmap ||
      overview?.charts?.extractionGeoHeatmap ||
      overview?.charts?.extractionDistrictHeatmap
    );

    const toNum = (value) => {
      if (typeof value === "number") return Number.isFinite(value) ? value : 0;
      if (typeof value === "string") {
        const cleaned = value.replace(/,/g, "").replace(/%/g, "").trim();
        if (!cleaned) return 0;
        const parsed = Number(cleaned);
        return Number.isFinite(parsed) ? parsed : 0;
      }
      const parsed = Number(value ?? 0);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const getDistrictName = (row) =>
      String(
        row?.district ||
        row?.districtName ||
        row?.district_name ||
        row?.town ||
        row?.townName ||
        row?.town_name ||
        row?.city ||
        row?.cityName ||
        row?.region ||
        row?.regionName ||
        row?.location ||
        row?.locationName ||
        row?.name ||
        ""
      ).trim();

    const readValueWithKey = (row, keys) => {
      for (const key of keys) {
        if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== "") {
          return { key, value: toNum(row[key]) };
        }
      }
      return { key: null, value: 0 };
    };

    const pickBestNumericField = (row, excludedKeys = []) => {
      const excluded = new Set([
        "id",
        "district",
        "districtName",
        "district_name",
        "town",
        "townName",
        "town_name",
        "city",
        "cityName",
        "region",
        "regionName",
        "location",
        "locationName",
        "name",
        ...excludedKeys,
      ]);
      for (const [key, raw] of Object.entries(row || {})) {
        if (excluded.has(key)) continue;
        if (typeof raw === "number" && Number.isFinite(raw)) return { key, value: raw };
        if (typeof raw === "string") {
          const value = toNum(raw);
          if (value !== 0 || raw.includes("0")) return { key, value };
        }
      }
      return { key: null, value: 0 };
    };

    const salesTotals = new Map();
    salesRows.forEach((row) => {
      const district = getDistrictName(row);
      if (!district) return;
      const value = toNum(
        row?.total ?? row?.value ?? row?.sales ?? row?.sellOut ?? row?.sellIn ?? 0
      );
      salesTotals.set(district, (salesTotals.get(district) || 0) + value);
    });

    const coverageSums = new Map();
    const coverageCounts = new Map();
    coverageRows.forEach((row) => {
      const district = getDistrictName(row);
      if (!district) return;
      const { value } = readValueWithKey(row, ["coveragePct", "coverage", "pct", "percentage"]);
      coverageSums.set(district, (coverageSums.get(district) || 0) + value);
      coverageCounts.set(district, (coverageCounts.get(district) || 0) + 1);
    });
    const coveragePctMap = new Map(
      Array.from(coverageSums.entries()).map(([district, sum]) => [
        district,
        coverageCounts.get(district) ? sum / coverageCounts.get(district) : 0,
      ])
    );

    const extractionRawMap = new Map();
    let extractionLooksLikePct = false;
    extractionRows.forEach((row) => {
      const district = getDistrictName(row);
      if (!district) return;
      let { key, value } = readValueWithKey(row, [
        "extractionPct",
        "extractionPercent",
        "extraction_percentage",
        "extractionValue",
        "extraction_value",
        "sharePct",
        "sharePercent",
        "pct",
        "percentage",
        "total",
        "value",
        "count",
        "marketValue",
        "market_value",
        "extraction",
      ]);
      if (!key) {
        const fallback = pickBestNumericField(row);
        key = fallback.key;
        value = fallback.value;
      }
      if (key && /(pct|percent)/i.test(key)) extractionLooksLikePct = true;
      extractionRawMap.set(district, value);
    });

    const maxSales = Math.max(...Array.from(salesTotals.values()), 0);
    const maxExtraction = Math.max(...Array.from(extractionRawMap.values()), 0);
    const extractionHasUsableValues =
      extractionRows.length > 0 &&
      Array.from(extractionRawMap.values()).some((value) => Number(value || 0) > 0);
    const extractionLooksLikeRatio =
      !extractionLooksLikePct && maxExtraction > 0 && maxExtraction <= 1;
    const extractionStrengthMap = new Map(
      Array.from(extractionRawMap.entries()).map(([district, value]) => [
        district,
        extractionLooksLikePct
          ? value
          : extractionLooksLikeRatio
          ? value * 100
          : (maxExtraction ? (value / maxExtraction) * 100 : 0),
      ])
    );

    const districtSet = new Set([
      ...Array.from(salesTotals.keys()),
      ...Array.from(coveragePctMap.keys()),
      ...Array.from(extractionStrengthMap.keys()),
    ]);

    const districts = Array.from(districtSet).sort((a, b) => {
      const aSales = salesTotals.get(a) || 0;
      const bSales = salesTotals.get(b) || 0;
      return bSales - aSales;
    });

    const metricColumns = extractionHasUsableValues
      ? ["Sales Strength", "Coverage %", "Extraction Strength"]
      : ["Sales Strength", "Coverage %"];
    const points = [];
    const allValues = [];

    districts.forEach((district, districtIndex) => {
      const sales = salesTotals.get(district) || 0;
      const salesPct = maxSales
        ? (sales / maxSales) * 100
        : 0;
      const coveragePct = coveragePctMap.get(district) || 0;
      const extractionStrength = extractionStrengthMap.get(district) || 0;

      const values = extractionHasUsableValues
        ? [salesPct, coveragePct, extractionStrength]
        : [salesPct, coveragePct];
      values.forEach((value, metricIndex) => {
        const normalized = Number(value.toFixed(2));
        allValues.push(normalized);
        points.push([metricIndex, districtIndex, normalized]);
      });
    });

    const visualMax = Math.max(100, Math.ceil(Math.max(...allValues, 0) / 10) * 10);
    const startEnd = districts.length > 12 ? Number(((12 / districts.length) * 100).toFixed(2)) : 100;
    const chartHeight = Math.max(360, Math.min(760, districts.length * 28 + 140));

    const option = {
      tooltip: {
        formatter: (params) => {
          const metric = metricColumns[params.data[0]] || "Metric";
          const district = districts[params.data[1]] || "Unknown";
          return `${district}<br/>${metric}: ${params.data[2]}%`;
        },
      },
      grid: {
        left: 14,
        right: 38,
        top: 20,
        bottom: 70,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: metricColumns,
        axisLabel: {
          color: "#5f6b7a",
          fontWeight: 600,
        },
      },
      yAxis: {
        type: "category",
        data: districts,
        axisLabel: {
          color: "#5f6b7a",
        },
      },
      dataZoom: districts.length > 12 ? [
        {
          type: "inside",
          yAxisIndex: 0,
          start: 0,
          end: startEnd,
          zoomLock: true,
          moveOnMouseMove: true,
        },
        {
          type: "slider",
          yAxisIndex: 0,
          right: 6,
          width: 12,
          start: 0,
          end: startEnd,
          brushSelect: false,
        },
      ] : [],
      visualMap: {
        min: 0,
        max: visualMax,
        calculable: true,
        orient: "horizontal",
        left: "center",
        bottom: 10,
        inRange: {
          color: ["#f97316", "#fde68a", "#86efac", "#16a34a"],
        },
      },
      series: [
        {
          type: "heatmap",
          data: points,
          label: {
            show: true,
            fontSize: 10,
            formatter: ({ value }) => `${Number(value?.[2] || 0).toFixed(0)}%`,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 12,
              shadowColor: "rgba(0, 0, 0, 0.2)",
            },
          },
        },
      ],
    };
    return {
      option,
      hasExtractionData: extractionRows.length > 0,
      hasUsableExtractionData: extractionHasUsableValues,
      districtCount: districts.length,
      chartHeight,
    };
  }, [overview]);

  const mapDealerHierarchyByCode = useMemo(() => {
    const keyCandidates = ["dealer", "mdd"];
    const result = new Map();
    const activeColumns = mapHierarchyColumns.length
      ? mapHierarchyColumns
      : (mapFlowMap?.[mapFlowName] || []);

    mapHierarchyRows.forEach((row) => {
      let dealerCodes = [];
      keyCandidates.forEach((candidate) => {
        if (dealerCodes.length) return;
        dealerCodes = parseCodesFromValue(row?.[candidate]);
      });
      if (!dealerCodes.length) return;

      const chain = activeColumns.map((column) => {
        const codes = parseCodesFromValue(row?.[column]);
        return {
          field: column,
          entries: codes.map((code) => ({
            code,
            name: mapActorNameByCode[normalizeText(code)] || code,
          })),
        };
      });

      dealerCodes.forEach((dealerCode) => {
        if (!dealerCode) return;
        const normalizedDealerCode = normalizeText(dealerCode);
        if (!result.has(normalizedDealerCode)) {
          result.set(normalizedDealerCode, chain);
        }
      });
    });

    return result;
  }, [mapHierarchyRows, mapHierarchyColumns, mapFlowMap, mapFlowName, mapActorNameByCode]);

  const normalizedGeoRows = useMemo(() => {
    const selectedFirmText = normalizeText(`${selectedMapFirm?.name || ""} ${selectedMapFirm?.code || ""}`);
    const selectedFlowText = normalizeText(mapFlowName || "");

    return (Array.isArray(mapGeoRows) ? mapGeoRows : [])
      .map((row) => {
        const latitude = getValidCoordinate(
          row?.latitude ??
            row?.lat ??
            row?.geo?.coordinates?.[1] ??
            row?.location?.coordinates?.[1]
        );
        const longitude = getValidCoordinate(
          row?.longitude ??
            row?.lng ??
            row?.lon ??
            row?.geo?.coordinates?.[0] ??
            row?.location?.coordinates?.[0]
        );

        const roleText = String(
          row?.role || row?.position || row?.userRole || row?.actor_type || row?.type || ""
        ).toLowerCase();
        const entityType = /mss/i.test(roleText) ? "mss" : "dealer";

        const firmText = normalizeText(
          row?.firm_code ||
            row?.firmCode ||
            row?.firm ||
            row?.parent_firm ||
            row?.parentFirm ||
            ""
        );
        const flowText = normalizeText(
          row?.hierarchy_name || row?.hierarchyName || row?.flow_name || row?.flowName || ""
        );

        const hasFirmInfo = !!firmText;
        const hasFlowInfo = !!flowText;
        const selectedFirmCodeNorm = normalizeText(mapFirmCode);

        const belongsToFirm = selectedFirmCodeNorm
          ? !hasFirmInfo ||
            firmText.includes(selectedFirmCodeNorm) ||
            (!!selectedFirmText && firmText.includes(selectedFirmText))
          : true;
        const belongsToFlow = selectedFlowText ? !hasFlowInfo || flowText === selectedFlowText : true;

        const districtLike = getDistrictLikeValue(row);
        const townLike = String(row?.town || row?.taluka || row?.city || "").trim();
        const displayCode = String(row?.code || row?.dealer_code || "").trim();
        const hierarchyChain =
          mapDealerHierarchyByCode.get(normalizeText(displayCode)) || [];

        return {
          ...row,
          latitude,
          longitude,
          entityType,
          roleText,
          displayName: String(row?.name || row?.dealer_name || row?.code || "Unknown"),
          displayCode,
          hierarchyChain,
          districtLike,
          townLike,
          geoKeys: [districtLike, townLike].map((x) => String(x || "").toLowerCase().trim()).filter(Boolean),
          belongsToFirm,
          belongsToFlow,
        };
      })
      .filter((row) => row.belongsToFirm && row.belongsToFlow);
  }, [mapGeoRows, mapFirmCode, mapFlowName, selectedMapFirm, mapDealerHierarchyByCode]);

  const mapLayerRows = useMemo(
    () => mapOverview?.charts?.salesRegionHeatmap || [],
    [mapOverview]
  );

  const mapLayerAvailability = useMemo(
    () => ({
      sales:
        (Array.isArray(mapOverview?.charts?.salesRegionHeatmap) &&
          mapOverview.charts.salesRegionHeatmap.length > 0) ||
        mapDealerSalesRows.length > 0,
      coverage: false,
      extraction: false,
    }),
    [mapOverview, mapDealerSalesRows]
  );

  useEffect(() => {
    if (mapLayer !== "sales") setMapLayer("sales");
  }, [mapLayer, mapLayerAvailability]);

  const mapDistrictScores = useMemo(() => {
    const rows = Array.isArray(mapLayerRows) ? mapLayerRows : [];
    const rawMap = new Map();

    rows.forEach((row) => {
      const key = String(getDistrictLikeValue(row) || "").toLowerCase().trim();
      if (!key) return;
      let value = 0;
      value = parseNum(row?.total ?? row?.value ?? row?.sales ?? row?.sellOut ?? row?.sellIn ?? 0);
      rawMap.set(key, value);
    });

    const rawValues = Array.from(rawMap.values());
    const maxRaw = Math.max(...rawValues, 0);

    return new Map(
      Array.from(rawMap.entries()).map(([key, value]) => {
        const score = maxRaw ? (value / maxRaw) * 100 : 0;
        return [key, Number(score.toFixed(2))];
      })
    );
  }, [mapLayerRows]);

  const mapDealerSalesByCode = useMemo(() => {
    const rows = Array.isArray(mapDealerSalesRows) ? mapDealerSalesRows : [];
    if (!rows.length) return new Map();

    const headers =
      Array.isArray(mapDealerSalesHeaders) && mapDealerSalesHeaders.length
        ? mapDealerSalesHeaders
        : Object.keys(rows[0] || {});

    const headerNormMap = new Map(headers.map((h) => [normalizeText(h), h]));
    const codeKeyCandidates = [
      "dealer_code",
      "dealer code",
      "buyer_code",
      "buyer code",
      "code",
      "dealer",
      "mdd",
    ];
    const codeKey =
      codeKeyCandidates.map((k) => headerNormMap.get(k)).find(Boolean) ||
      headers.find((h) => /dealer|buyer/i.test(String(h))) ||
      "code";

    const valuePref =
      mapMetric === "volume"
        ? ["volume", "vol", "qty", "quantity", "units", "activation", "tertiary", "secondary"]
        : ["value", "amount", "sell", "activation", "tertiary", "secondary", "mtd"];

    const valueKeys = headers.filter((header) => {
      const key = normalizeText(header);
      if (key === normalizeText(codeKey)) return false;
      if (["name", "dealer_name", "buyer_name", "segment/channel", "segment", "channel"].includes(key))
        return false;
      if (mapMetric === "value" && /(vol|qty|quantity|units)/i.test(key)) return false;
      if (mapMetric === "volume" && /(value|amount|price)/i.test(key)) return false;
      return valuePref.some((token) => key.includes(token));
    });

    const aggregate = new Map();
    rows.forEach((row) => {
      const code = normalizeText(
        row?.[codeKey] || row?.dealer_code || row?.buyer_code || row?.code || row?.dealer || ""
      );
      if (!code) return;

      let value = 0;
      if (valueKeys.length) {
        value = valueKeys.reduce((sum, key) => sum + parseNum(row?.[key]), 0);
      } else {
        Object.entries(row || {}).forEach(([key, raw]) => {
          const normKey = normalizeText(key);
          if (normKey === normalizeText(codeKey)) return;
          if (["name", "dealer_name", "buyer_name"].includes(normKey)) return;
          value += parseNum(raw);
        });
      }
      aggregate.set(code, (aggregate.get(code) || 0) + value);
    });

    const maxValue = Math.max(...Array.from(aggregate.values()), 0);
    return new Map(
      Array.from(aggregate.entries()).map(([code, value]) => [
        code,
        maxValue ? Number(((value / maxValue) * 100).toFixed(2)) : 0,
      ])
    );
  }, [mapDealerSalesRows, mapDealerSalesHeaders, mapMetric]);

  const missingLatLngRows = useMemo(
    () =>
      normalizedGeoRows.filter(
        (row) =>
          row.latitude === null ||
          row.longitude === null ||
          !Number.isFinite(row.latitude) ||
          !Number.isFinite(row.longitude)
      ),
    [normalizedGeoRows]
  );

  const plottableGeoRows = useMemo(
    () =>
      normalizedGeoRows.filter(
        (row) =>
          row.latitude !== null &&
          row.longitude !== null &&
          Number.isFinite(row.latitude) &&
          Number.isFinite(row.longitude)
      ),
    [normalizedGeoRows]
  );

  const visibleMarkerRows = useMemo(
    () =>
      plottableGeoRows.filter((row) => {
        if (row.entityType === "mss" && !showMssMarkers) return false;
        if (row.entityType === "dealer" && !showDealerMarkers) return false;
        return true;
      }),
    [plottableGeoRows, showDealerMarkers, showMssMarkers]
  );

  const heatSourceRows = useMemo(
    () =>
      plottableGeoRows.filter((row) => {
        if (row.entityType === "dealer") return true;
        return showMssMarkers;
      }),
    [plottableGeoRows, showMssMarkers]
  );

  const heatOverlayRows = useMemo(
    () =>
      heatSourceRows
        .map((row) => {
          const codeScore = mapDealerSalesByCode.get(normalizeText(row.displayCode));
          let score = Number.isFinite(codeScore) ? codeScore : 0;
          if (!score) {
            for (const key of row.geoKeys) {
              if (mapDistrictScores.has(key)) {
                score = mapDistrictScores.get(key);
                break;
              }
            }
          }
          if (!score) {
            score = row.entityType === "dealer" ? 12 : 8;
          }
          return {
            ...row,
            score,
            heatColor: metricColor(score),
            heatRadius: 14 + (score / 100) * 24,
          };
        })
        .filter((row) => row.score > 0),
    [heatSourceRows, mapDistrictScores, mapDealerSalesByCode]
  );

  const boundsRows = useMemo(
    () => (heatOverlayRows.length ? heatOverlayRows : plottableGeoRows),
    [heatOverlayRows, plottableGeoRows]
  );

  const mapEntityStats = useMemo(() => {
    const dealers = normalizedGeoRows.filter((row) => row.entityType === "dealer").length;
    const mss = normalizedGeoRows.filter((row) => row.entityType === "mss").length;
    return {
      dealers,
      mss,
      missingCoords: missingLatLngRows.length,
      plotted: plottableGeoRows.length,
    };
  }, [normalizedGeoRows, missingLatLngRows, plottableGeoRows]);

  const markerScoreLookup = useMemo(() => {
    const lookup = new Map();
    heatOverlayRows.forEach((row) => {
      lookup.set(`${row.displayCode}|${row.latitude}|${row.longitude}`, row.score);
    });
    return lookup;
  }, [heatOverlayRows]);

  return (
    <div className="dashboard-v2">
      <div className="dashboard-v2__header">
        <div>
          <h3>Main Dashboard</h3>
          <p>Command center for sales, market coverage, extraction, and attendance.</p>
        </div>
        <div className="dashboard-v2__controls">
          <label>
            From
            <input
              type="date"
              value={toDateInputValue(startDate)}
              onChange={(e) => setStartDate(new Date(e.target.value))}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={toDateInputValue(endDate)}
              onChange={(e) => setEndDate(new Date(e.target.value))}
            />
          </label>
          <label>
            Metric
            <select
              value={selectedValue}
              onChange={(e) => setSelectedValue(e.target.value)}
            >
              <option value="value">Value</option>
              <option value="volume">Volume</option>
            </select>
          </label>
          <label>
            Trend
            <select value={trend} onChange={(e) => setTrend(e.target.value)}>
              {TREND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={fetchOverview} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error ? <div className="dashboard-v2__error">{error}</div> : null}

      <div className="dashboard-v2__kpis">
        <div className="kpi-card">
          <span>MTD Sell In</span>
          <strong>{formatCompact(salesKpis.mtdSellIn)}</strong>
          <small>Growth: {formatPct(salesKpis.sellInGrowthPct)}</small>
        </div>
        <div className="kpi-card">
          <span>MTD Sell Out</span>
          <strong>{formatCompact(salesKpis.mtdSellOut)}</strong>
          <small>Growth: {formatPct(salesKpis.sellOutGrowthPct)}</small>
        </div>
        <div className="kpi-card">
          <span>Market Value</span>
          <strong>{formatCompact(extractionKpis.totalMarketValue)}</strong>
          <small>Total market extraction</small>
        </div>
        <div className="kpi-card">
          <span>Coverage %</span>
          <strong>{formatPct(coverageKpis.coveragePct)}</strong>
          <small>
            Done {Number(coverageKpis.done || 0)} / Planned {Number(coverageKpis.planned || 0)}
          </small>
        </div>
        <div className="kpi-card">
          <span>Attendance Present</span>
          <strong>{Number(attendanceKpis.present || 0) + Number(attendanceKpis.pending || 0)}</strong>
          <small>Eligible: {Number(attendanceKpis.totalEligible || 0)}</small>
        </div>
        <div className="kpi-card">
          <span>Avg Hours Worked</span>
          <strong>{numberFormatter.format(Number(attendanceKpis.avgHoursWorked || 0))}</strong>
          <small>Not punched out: {Number(attendanceKpis.notPunchedOut || 0)}</small>
        </div>
      </div>

      <div className="dashboard-v2__grid">
        <section className="panel panel--wide">
          <header>
            <h3>Sales Trend</h3>
            <p>Activation vs Tertiary vs Secondary ({trend})</p>
          </header>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="activation" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="tertiary" stroke="#16a34a" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="secondary" stroke="#f97316" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </section>

        <section className="panel panel--wide">
          <header>
            <h3>Region Heatmap</h3>
            <p>
              Scrollable district matrix across sales, coverage
              {regionMatrix.hasUsableExtractionData ? ", extraction" : ""} ({regionMatrix.districtCount} districts)
              {!regionMatrix.hasExtractionData
                ? " (extraction feed missing from API response)"
                : !regionMatrix.hasUsableExtractionData
                ? " (extraction feed present but district values are unavailable)"
                : ""}
            </p>
          </header>
          <ReactECharts option={regionMatrix.option} style={{ height: regionMatrix.chartHeight }} />
        </section>

        <section className="panel">
          <header>
            <h3>Extraction Trend</h3>
            <p>All brands with sales in selected period</p>
          </header>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={extractionTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              {extractionBrands.map((brand, index) => (
                <Line
                  key={brand}
                  type="monotone"
                  dataKey={brand}
                  stroke={EXTRACTION_COLORS[index % EXTRACTION_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </section>

        <section className="panel">
          <header>
            <h3>Brand Share</h3>
            <p>Current extraction share by brand</p>
          </header>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart layout="vertical" data={extractionBrandShareData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis dataKey="brand" type="category" width={90} />
              <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
              <Bar dataKey="sharePct" fill="#0ea5e9" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="panel">
          <header>
            <h3>Market Coverage Trend</h3>
            <p>Execution mix with planned target and coverage % trend</p>
          </header>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={coverageTrendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" />
              <YAxis
                yAxisId="count"
                tickFormatter={(value) => numberFormatter.format(Number(value || 0))}
              />
              <YAxis
                yAxisId="pct"
                orientation="right"
                domain={[
                  0,
                  (maxValue) => Math.max(100, Math.ceil(Number(maxValue || 0) / 10) * 10),
                ]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === "Coverage %") return [`${Number(value || 0).toFixed(2)}%`, name];
                  return [numberFormatter.format(Number(value || 0)), name];
                }}
              />
              <Legend />
              <Bar
                yAxisId="count"
                dataKey="done"
                name="Done"
                stackId="execution"
                fill="#22c55e"
                radius={[6, 6, 0, 0]}
                maxBarSize={24}
              />
              <Bar
                yAxisId="count"
                dataKey="pending"
                name="Pending"
                stackId="execution"
                fill="#f97316"
                radius={[6, 6, 0, 0]}
                maxBarSize={24}
              />
              <Line
                yAxisId="count"
                type="monotone"
                dataKey="planned"
                name="Planned"
                stroke="#64748b"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="coveragePct"
                name="Coverage %"
                stroke="#0ea5e9"
                strokeWidth={2.5}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </section>

        <section className="panel panel--wide">
          <header>
            <h3>Attendance Overview (Today)</h3>
            <p>
              Overall and firm-wise status snapshot for{" "}
              {attendanceKpis.asOfDate || toDateInputValue(new Date())}
            </p>
          </header>
          <div className="attendance-overview">
            <div className="attendance-overview__cards">
              {attendanceOverviewCards.map((card) => (
                <div className={`attendance-overview-card ${card.tone}`} key={card.key}>
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                </div>
              ))}
            </div>
            <div className="attendance-overview__firm-chart">
              {attendanceFirmData.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart layout="vertical" data={attendanceFirmData} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="label" type="category" width={120} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="present" stackId="a" fill="#16a34a" />
                    <Bar dataKey="halfDay" stackId="a" fill="#0ea5e9" />
                    <Bar dataKey="leave" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="absent" stackId="a" fill="#ef4444" />
                    <Bar dataKey="pending" stackId="a" fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="attendance-overview__empty">No firm-wise attendance data for selected date range.</div>
              )}
            </div>
          </div>
        </section>

        <section className="panel panel--wide">
          <header>
            <h3>Business Geo Overview</h3>
            <p>
              Dealer-wise sales heatmap across selected map date range, using map-level Value/Volume toggle
              ({toDateInputValue(mapStartDate)} to {toDateInputValue(mapEndDate)})
            </p>
          </header>

          <div className="immersive-map">
            <div className="immersive-map__toolbar">
              <label>
                Firm
                <select
                  value={mapFirmCode}
                  onChange={(e) => setMapFirmCode(e.target.value)}
                  disabled={mapMetaLoading}
                >
                  <option value="">All</option>
                  {mapFirms.map((firm) => (
                    <option key={firm.code} value={firm.code}>
                      {firm.name} ({firm.code})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Flow
                <select
                  value={mapFlowName}
                  onChange={(e) => setMapFlowName(e.target.value)}
                  disabled={mapMetaLoading || !mapFlowOptions.length}
                >
                  {!mapFlowOptions.length ? (
                    <option value={DEFAULT_FLOW_NAME}>{DEFAULT_FLOW_NAME}</option>
                  ) : null}
                  {mapFlowOptions.map((flow) => (
                    <option key={flow.name} value={flow.name}>
                      {flow.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Sales Metric
                <select value={mapMetric} onChange={(e) => setMapMetric(e.target.value)}>
                  <option value="value">Value</option>
                  <option value="volume">Volume</option>
                </select>
              </label>

              <label>
                From
                <input
                  type="date"
                  value={toDateInputValue(mapStartDate)}
                  onChange={(e) => setMapStartDate(e.target.value ? new Date(e.target.value) : null)}
                />
              </label>

              <label>
                To
                <input
                  type="date"
                  value={toDateInputValue(mapEndDate)}
                  onChange={(e) => setMapEndDate(e.target.value ? new Date(e.target.value) : null)}
                />
              </label>

              <div className="immersive-map__layer-toggle" role="tablist" aria-label="Map metric toggle">
                {[
                  { key: "sales", label: "Sales" },
                  { key: "extraction", label: "Extraction" },
                  { key: "coverage", label: "Market Coverage" },
                ].map((layer) => (
                  <button
                    key={layer.key}
                    type="button"
                    className={mapLayer === layer.key ? "active" : ""}
                    onClick={() => setMapLayer(layer.key)}
                    disabled={!mapLayerAvailability[layer.key]}
                  >
                    {layer.label}
                  </button>
                ))}
              </div>

              <div className="immersive-map__switches">
                <label>
                  <input
                    type="checkbox"
                    checked={showHeatLayer}
                    onChange={(e) => setShowHeatLayer(e.target.checked)}
                  />
                  Heat
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={showDealerMarkers}
                    onChange={(e) => setShowDealerMarkers(e.target.checked)}
                  />
                  Dealers
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={showMssMarkers}
                    onChange={(e) => setShowMssMarkers(e.target.checked)}
                  />
                  MSS
                </label>
                <span className="coming-soon">Users + Paths soon</span>
              </div>

              <button type="button" onClick={fetchMapData} disabled={mapLoading}>
                {mapLoading ? "Refreshing..." : "Refresh Map"}
              </button>
            </div>

            {mapError ? <div className="dashboard-v2__error">{mapError}</div> : null}

            <div className="immersive-map__body">
              <div className="immersive-map__canvas">
                <MapContainer
                  className="immersive-map__leaflet"
                  center={INDIA_CENTER}
                  zoom={5}
                  scrollWheelZoom
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <FitMapBounds points={boundsRows} />

                  {showHeatLayer &&
                    heatOverlayRows.map((point, index) => (
                      <React.Fragment key={`heat-${point.displayCode}-${index}`}>
                        <CircleMarker
                          center={[point.latitude, point.longitude]}
                          radius={point.heatRadius * 1.55}
                          pathOptions={{
                            color: point.heatColor,
                            weight: 0,
                            fillColor: point.heatColor,
                            fillOpacity: 0.09,
                          }}
                        />
                        <CircleMarker
                          center={[point.latitude, point.longitude]}
                          radius={point.heatRadius}
                          pathOptions={{
                            color: point.heatColor,
                            weight: 0,
                            fillColor: point.heatColor,
                            fillOpacity: 0.2,
                          }}
                        />
                      </React.Fragment>
                    ))}

                  {visibleMarkerRows.map((point, index) => {
                    const isMss = point.entityType === "mss";
                    const markerColor = isMss ? "#7c3aed" : "#0f172a";
                    const score =
                      markerScoreLookup.get(`${point.displayCode}|${point.latitude}|${point.longitude}`) || 0;
                    return (
                      <CircleMarker
                        key={`marker-${point.displayCode}-${index}`}
                        center={[point.latitude, point.longitude]}
                        radius={isMss ? 6 : 5}
                        pathOptions={{
                          color: "#ffffff",
                          weight: 1.5,
                          fillColor: markerColor,
                          fillOpacity: 0.95,
                        }}
                      >
                        <Popup minWidth={260}>
                          <div>
                            <button
                              type="button"
                              style={{
                                width: "100%",
                                textAlign: "left",
                                border: "1px solid #dbe5f1",
                                background: "#f8fafc",
                                borderRadius: "8px",
                                padding: "8px 10px",
                                marginBottom: "8px",
                                cursor: "default",
                              }}
                            >
                              <strong>{point.displayName || "Unknown Dealer"}</strong>
                              <div style={{ fontSize: "12px", color: "#475569" }}>
                                {point.displayCode || "NA"}
                              </div>
                            </button>
                            <div>Type: {isMss ? "MSS" : "Dealer"}</div>
                            <div>District/Town: {point.districtLike || point.townLike || "-"}</div>
                            <div>Sales heat score: {Number(score || 0).toFixed(2)}%</div>
                            <div>
                              Lat/Long: {Number(point.latitude).toFixed(6)}, {Number(point.longitude).toFixed(6)}
                            </div>
                            <div style={{ marginTop: "8px", fontSize: "12px", color: "#334155" }}>
                              <strong>Flow:</strong> {mapFlowName || "-"}
                            </div>
                            {Array.isArray(point.hierarchyChain) && point.hierarchyChain.length ? (
                              <div style={{ marginTop: "6px" }}>
                                {point.hierarchyChain.map((step) => (
                                  <div key={`${point.displayCode}-${step.field}`} style={{ marginBottom: "6px" }}>
                                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>
                                      {String(step.field || "").replace(/_/g, " ")}
                                    </div>
                                    <div style={{ fontSize: "12px", color: "#475569" }}>
                                      {step.entries?.length
                                        ? step.entries.map((entry) => `${entry.code} (${entry.name || entry.code})`).join(", ")
                                        : "-"}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ marginTop: "6px", fontSize: "12px", color: "#64748b" }}>
                                No hierarchy entries mapped for this dealer in selected flow.
                              </div>
                            )}
                          </div>
                        </Popup>
                      </CircleMarker>
                    );
                  })}
                </MapContainer>
              </div>

              <aside className="immersive-map__side">
                <div className="immersive-map__stats">
                  <div>
                    <span>Dealers</span>
                    <strong>{mapEntityStats.dealers}</strong>
                  </div>
                  <div>
                    <span>MSS</span>
                    <strong>{mapEntityStats.mss}</strong>
                  </div>
                  <div>
                    <span>Plotted</span>
                    <strong>{mapEntityStats.plotted}</strong>
                  </div>
                  <div>
                    <span>Missing Lat/Long</span>
                    <strong>{mapEntityStats.missingCoords}</strong>
                  </div>
                </div>

                <div className="immersive-map__meta">
                  <h4>Layer Coverage</h4>
                  <p>
                    Active overlay: <strong>sales</strong>. Dealer-code aggregation is used for
                    heat intensity in this date range; district and density fallback are used only when dealer sales rows are unavailable.
                  </p>
                </div>

                <div className="immersive-map__missing">
                  <h4>Coordinate Issues</h4>
                  {missingLatLngRows.length ? (
                    <>
                      <p>
                        {missingLatLngRows.length} dealer/MSS entries are missing valid coordinates and are excluded from map.
                      </p>
                      <ul>
                        {missingLatLngRows.slice(0, 8).map((row, index) => (
                          <li key={`${row.displayCode || row.displayName}-${index}`}>
                            {row.displayName} ({row.displayCode || "NA"})
                          </li>
                        ))}
                      </ul>
                      {missingLatLngRows.length > 8 ? (
                        <small>+{missingLatLngRows.length - 8} more entries</small>
                      ) : null}
                    </>
                  ) : (
                    <p>No coordinate issues in current selection.</p>
                  )}
                </div>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Dashboard;
