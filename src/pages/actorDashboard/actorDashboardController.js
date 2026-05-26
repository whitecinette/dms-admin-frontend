import axios from "axios";
import config from "../../config";
import ACTOR_DASHBOARD_ROUTES from "./actorDashboardRoutes";

const backendUrl = config.backend_url;

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const firstNumber = (sources = []) => {
  for (const value of sources) {
    const n = toNumber(value);
    if (n !== null) return n;
  }
  return null;
};

const extractActivationKpis = (batchData = {}) => {
  const activationValue = batchData?.activation?.table?.value || {};
  const keys = Object.keys(activationValue || {});

  const metaKeys = new Set(["MTD", "LMTD", "FTD", "G/D%", "Exp.Ach"]);
  const monthKeys = keys.filter((key) => !metaKeys.has(key));

  const orderedMonthValues = monthKeys
    .map((key) => ({ key, value: toNumber(activationValue[key]) }))
    .filter((item) => item.value !== null);

  const lastThree = orderedMonthValues.slice(-3);

  return {
    mtdSales: firstNumber([activationValue?.MTD]),
    m1: lastThree[0]?.value ?? null,
    m2: lastThree[1]?.value ?? null,
    m3: lastThree[2]?.value ?? null,
  };
};

const extractOverviewKpis = (overview = {}) => {
  const sales = overview?.kpis?.sales || {};
  const extraction = overview?.kpis?.extraction || {};

  const mtdFromOverview = firstNumber([
    sales.mtdSellOut,
    sales.mtdSales,
    sales.mtd,
  ]);

  const lyMtd = firstNumber([
    sales.lyMtd,
    sales.lastYearMtd,
    sales.ly_mtd,
  ]);

  const targetAchievement = firstNumber([
    sales.targetAchievementPct,
    sales.targetAchievement,
  ]);

  const stock = firstNumber([
    extraction.stockUnits,
    extraction.stock,
  ]);

  const sec = firstNumber([
    extraction.sec,
    extraction.SEC,
  ]);

  return {
    mtdFromOverview,
    lyMtd,
    targetAchievement,
    stock,
    sec,
  };
};

const buildBatchPayload = ({
  startDate,
  endDate,
  subordinate_filters = {},
  dealer_filters = {},
}) => {
  const payload = {
    flow_name: "default_sales_flow",
    filters: {
      report_type: "batch",
    },
    subordinate_filters,
    dealer_filters,
    include_tag_grouped: false,
    report_types: ["activation"],
  };

  if (startDate && endDate) {
    payload.start_date = startDate;
    payload.end_date = endDate;
  }

  return payload;
};

const buildOverviewPayload = ({
  startDate,
  endDate,
  subordinate_filters = {},
  dealer_filters = {},
}) => ({
  startDate,
  endDate,
  metric: "value",
  flow_name: "default_sales_flow",
  subordinate_filters,
  dealer_filters,
  attendance_filters: {},
  coverage_filters: {},
  recent_days: 7,
});

export const fetchActorDashboardTopKpis = async ({
  startDate,
  endDate,
  subordinate_filters = {},
  dealer_filters = {},
  authToken,
}) => {
  const headers = {
    Authorization: authToken,
  };

  const [batchRes, overviewRes] = await Promise.allSettled([
    axios.post(
      `${backendUrl}${ACTOR_DASHBOARD_ROUTES.BATCH_REPORT}`,
      buildBatchPayload({ startDate, endDate, subordinate_filters, dealer_filters }),
      { headers }
    ),
    axios.post(
      `${backendUrl}${ACTOR_DASHBOARD_ROUTES.OVERVIEW_FALLBACK}`,
      buildOverviewPayload({ startDate, endDate, subordinate_filters, dealer_filters }),
      { headers }
    ),
  ]);

  const batchData =
    batchRes.status === "fulfilled"
      ? batchRes.value?.data?.data || batchRes.value?.data || {}
      : {};

  const overviewData =
    overviewRes.status === "fulfilled" ? overviewRes.value?.data || {} : {};

  const activationKpis = extractActivationKpis(batchData);
  const overviewKpis = extractOverviewKpis(overviewData);

  return {
    mtdSales: activationKpis.mtdSales ?? overviewKpis.mtdFromOverview,
    m1: activationKpis.m1,
    m2: activationKpis.m2,
    m3: activationKpis.m3,
    lyMtd: overviewKpis.lyMtd,
    targetAchievement: overviewKpis.targetAchievement,
    stock: overviewKpis.stock,
    sec: overviewKpis.sec,
  };
};

export const hasAnyKpiValue = (kpis = {}) =>
  [
    kpis.mtdSales,
    kpis.m1,
    kpis.m2,
    kpis.m3,
    kpis.lyMtd,
    kpis.targetAchievement,
    kpis.stock,
    kpis.sec,
  ].some((value) => value !== null && value !== undefined);
