import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const normalize = (value) =>
  value === null || value === undefined ? "" : String(value).trim().toLowerCase();

const boolTopDealer = (item = {}) =>
  item.top_outlet === true || item.topOutlet === true || item.topDealer === true;

const tokenHeaders = () => {
  const token = localStorage.getItem("authToken") || "";
  if (!token) return {};
  return { Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}` };
};

const getCode = (row = {}) =>
  String(row.code || row.employeeCode || row.empCode || row.userCode || "").trim();

const getName = (row = {}) =>
  String(row.name || row.employeeName || row.fullName || "").trim();

const getRole = (row = {}) =>
  String(row.role || row?.metadata?.role || row?.user?.role || "").trim();

const getPosition = (row = {}) =>
  String(
    row.position ||
      row.userPosition ||
      row.designation ||
      row?.metadata?.position ||
      row?.user?.position ||
      ""
  ).trim();

const getZoneFromRow = (row = {}) =>
  String(row.zone || row?.metadata?.zone || row?.user?.zone || "").trim();

const getDistrictFromRow = (row = {}) =>
  String(row.district || row?.metadata?.district || row?.user?.district || "").trim();

const parseCodesFromValue = (value) => {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => parseCodesFromValue(item));
  }
  if (typeof value === "object") {
    return parseCodesFromValue(value.code || value.userCode || value.employeeCode || "");
  }

  const normalized = String(value)
    .replace(/[|;/]/g, ",")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  return normalized;
};

const dedupeByCode = (rows = []) => {
  const map = new Map();
  rows.forEach((row) => {
    const code = getCode(row) || row.code;
    if (!code) return;
    const key = normalize(code);
    if (!map.has(key)) {
      map.set(key, { ...row, code });
    }
  });
  return Array.from(map.values());
};

const normalizeFlowTypes = (flowTypes) => {
  if (Array.isArray(flowTypes)) return flowTypes;
  if (typeof flowTypes === "string") {
    return flowTypes
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
};

const collectExistingFromWeeklyRows = (weeklyRows = []) => {
  const map = {};
  weeklyRows.forEach((actor) => {
    const actorCode = getCode(actor).toLowerCase();
    if (!actorCode) return;
    const dealers = Array.isArray(actor.schedule) ? actor.schedule : [];
    map[actorCode] = new Set(
      dealers
        .map((dealer) => getCode(dealer).toLowerCase())
        .filter(Boolean)
    );
  });
  return map;
};

const hierarchySystemFields = new Set([
  "_id",
  "id",
  "firm_code",
  "firm",
  "hierarchy_name",
  "createdat",
  "updatedat",
  "__v",
]);

const buildHierarchySeeds = (rows = [], columns = []) => {
  const resolvedColumns =
    Array.isArray(columns) && columns.length
      ? columns
      : Array.from(new Set(rows.flatMap((row) => Object.keys(row || {}))));

  const actorFields = [];
  const dealerFields = [];

  resolvedColumns.forEach((field) => {
    const key = normalize(field);
    if (!key || hierarchySystemFields.has(key)) return;
    if (key === "dealer" || key === "mdd") {
      dealerFields.push(field);
      return;
    }
    actorFields.push(field);
  });

  const actorSeeds = [];
  const dealerSeeds = [];

  rows.forEach((row) => {
    actorFields.forEach((field) => {
      const position = String(field || "").trim();
      parseCodesFromValue(row?.[field]).forEach((code) => {
        actorSeeds.push({
          code,
          position,
          role: "employee",
        });
      });
    });

    dealerFields.forEach((field) => {
      const position = String(field || "").trim();
      const defaultRole = normalize(field) === "mdd" ? "mdd" : "dealer";
      parseCodesFromValue(row?.[field]).forEach((code) => {
        dealerSeeds.push({
          code,
          position,
          role: defaultRole,
        });
      });
    });
  });

  return {
    actorSeeds: dedupeByCode(actorSeeds),
    dealerSeeds: dedupeByCode(dealerSeeds),
  };
};

const isAdminLikeRole = (roleValue = "") => {
  const role = normalize(roleValue);
  return role === "admin" || role === "super_admin" || role === "super admin";
};

const toDateInputValue = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

const isConfigExpired = (cfg = {}, todayStart = null) => {
  const expiryRaw = cfg.expiryDate || cfg.endDate || cfg.expiry || cfg.validTill || "";
  if (!expiryRaw) return false;
  const expiry = new Date(expiryRaw);
  if (Number.isNaN(expiry.getTime())) return false;
  const cutoff = todayStart || new Date(new Date().toDateString());
  return expiry < cutoff;
};

function BeatSetupModal({
  open,
  onClose,
  backendUrl,
  weeklyRows = [],
  onApplied,
  initialConfig = null,
}) {
  const [loadingBase, setLoadingBase] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [firms, setFirms] = useState([]);
  const [metaFlows, setMetaFlows] = useState([]);
  const [adminFlowTypes, setAdminFlowTypes] = useState([]);
  const [firmCode, setFirmCode] = useState("");
  const [flowName, setFlowName] = useState("");

  const [actors, setActors] = useState([]);
  const [selectedActorCodes, setSelectedActorCodes] = useState([]);
  const [pendingInitialActorCodes, setPendingInitialActorCodes] = useState([]);
  const [actorSearch, setActorSearch] = useState("");

  const [dealerMddList, setDealerMddList] = useState([]);
  const [selectedDealerCodes, setSelectedDealerCodes] = useState([]);
  const [dealerSearch, setDealerSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [topDealerFilter, setTopDealerFilter] = useState("all");

  const [configByActorCode, setConfigByActorCode] = useState({});
  const [startDate, setStartDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [pendingInitialDealerCodes, setPendingInitialDealerCodes] = useState([]);
  const [actorDealerLoading, setActorDealerLoading] = useState(false);

  const selectedFirm = useMemo(
    () => firms.find((f) => String(f.code || "") === String(firmCode || "")),
    [firms, firmCode]
  );

  const flowOptions = useMemo(() => {
    const flowTypes = normalizeFlowTypes(selectedFirm?.flowTypes);

    if (flowTypes.length === 0) {
      const flowSource = metaFlows.length > 0 ? metaFlows : adminFlowTypes;
      return flowSource
        .map((flow) => {
          if (typeof flow === "string") {
            return { name: flow, label: flow };
          }
          const name = String(flow?.name || flow?.flowName || flow?.value || "").trim();
          if (!name) return null;
          return {
            name,
            label: String(flow?.label || flow?.name || name).trim(),
          };
        })
        .filter(Boolean);
    }

    return flowTypes
      .map((flow) => {
        if (typeof flow === "string") {
          return { name: flow, label: flow };
        }
        const name = String(flow?.name || flow?.flowName || flow?.value || "").trim();
        if (!name) return null;
        return {
          name,
          label: String(flow?.label || flow?.name || name).trim(),
        };
      })
      .filter(Boolean);
  }, [selectedFirm, metaFlows, adminFlowTypes]);

  const weeklyConfigByActorCode = useMemo(
    () => collectExistingFromWeeklyRows(weeklyRows),
    [weeklyRows]
  );

  const weeklyActorCodeSet = useMemo(
    () => new Set(weeklyRows.map((row) => normalize(getCode(row))).filter(Boolean)),
    [weeklyRows]
  );

  const resetModalState = () => {
    setError("");
    setFirmCode("");
    setFlowName("");
    setActors([]);
    setSelectedActorCodes([]);
    setPendingInitialActorCodes([]);
    setActorSearch("");
    setDealerMddList([]);
    setSelectedDealerCodes([]);
    setDealerSearch("");
    setZoneFilter("");
    setDistrictFilter("");
    setTopDealerFilter("all");
    setConfigByActorCode({});
    setStartDate("");
    setExpiryDate("");
    setPendingInitialDealerCodes([]);
  };

  const fetchPagedUsersByRole = async (roleParam) => {
    const list = [];
    let page = 1;
    const limit = 1000;
    let hasMore = true;
    while (hasMore && page <= 30) {
      const res = await axios.get(`${backendUrl}/user/get-by-admins`, {
        params: {
          page,
          limit,
          sort: "createdAt",
          order: -1,
          search: "",
          role: roleParam,
        },
        headers: tokenHeaders(),
      });
      const rows = Array.isArray(res?.data?.data) ? res.data.data : [];
      list.push(...rows);
      const totalRecords = Number(res?.data?.totalRecords || 0);
      hasMore = rows.length === limit && page * limit < totalRecords;
      page += 1;
    }
    return list;
  };

  const fetchUserDirectoryRows = async () => {
    const list = [];
    let page = 1;
    const limit = 1000;
    let hasMore = true;
    while (hasMore && page <= 30) {
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
        headers: tokenHeaders(),
      });
      const rows = Array.isArray(res?.data?.rows) ? res.data.rows : [];
      list.push(...rows);
      const total = Number(res?.data?.total || 0);
      hasMore = rows.length === limit && page * limit < total;
      page += 1;
    }
    return list;
  };

  const fetchUsersByCodes = async (codes = []) => {
    const needed = new Set(codes.map((code) => normalize(code)).filter(Boolean));
    if (needed.size === 0) return [];
    const found = new Map();

    try {
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
          headers: tokenHeaders(),
        });
        const rows = Array.isArray(res?.data?.rows) ? res.data.rows : [];
        rows.forEach((row) => {
          const code = normalize(getCode(row));
          if (!code || !needed.has(code)) return;
          if (!found.has(code)) found.set(code, row);
        });
        const total = Number(res?.data?.total || 0);
        hasMore = rows.length === limit && page * limit < total;
        page += 1;
      }
    } catch (e) {
      // ignore and fallback to empty
    }

    return Array.from(found.values());
  };

  const fetchHierarchyRowsForFlow = async (selectedFirmCode, selectedFlowName) => {
    const firmCodeNorm = normalize(selectedFirmCode);
    const filterByFirmIfPresent = (rows = []) =>
      rows.filter((row) => {
        const rowFirmCode = normalize(row?.firm_code || row?.firmCode || row?.firm || "");
        return !rowFirmCode || rowFirmCode === firmCodeNorm;
      });

    try {
      const res = await axios.get(`${backendUrl}/super-admin/hierarchy`, {
        params: {
          firm_code: selectedFirmCode,
          hierarchy_name: selectedFlowName,
          all: true,
        },
        headers: tokenHeaders(),
      });

      const rows = Array.isArray(res?.data?.rows) ? res.data.rows : [];
      return {
        rows: filterByFirmIfPresent(rows),
        columns: Array.isArray(res?.data?.columns) ? res.data.columns : [],
      };
    } catch (primaryError) {
      const fallbackRes = await axios.get(
        `${backendUrl}/hierarchy-entries/get-hierarchy-entries-for-admin`,
        {
          params: {
            page: 1,
            limit: 10000,
            hierarchy_name: selectedFlowName,
          },
          headers: tokenHeaders(),
        }
      );

      const rows = Array.isArray(fallbackRes?.data?.data) ? fallbackRes.data.data : [];
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

      return { rows: filterByFirmIfPresent(rows), columns };
    }
  };

  useEffect(() => {
    if (!open) return;
    resetModalState();

    const loadFirms = async () => {
      setLoadingBase(true);
      try {
        const [dropdownRes, metaRes, actorTypeRes] = await Promise.allSettled([
          axios.get(`${backendUrl}/get-firms-for-dropdown`, {
            headers: tokenHeaders(),
          }),
          axios.get(`${backendUrl}/super-admin/hierarchy/meta`, {
            headers: tokenHeaders(),
          }),
          axios.get(`${backendUrl}/actorTypesHierarchy/get-all-by-admin`, {
            headers: tokenHeaders(),
          }),
        ]);

        const dropdownFirms =
          dropdownRes.status === "fulfilled" && Array.isArray(dropdownRes.value?.data?.data)
            ? dropdownRes.value.data.data
            : [];

        const metaFirms =
          metaRes.status === "fulfilled" && Array.isArray(metaRes.value?.data?.data?.firms)
            ? metaRes.value.data.data.firms
            : [];

        const mergedByCode = new Map();
        dropdownFirms.forEach((firm) => {
          const code = String(firm?.code || "").trim();
          if (!code) return;
          mergedByCode.set(code, { ...firm });
        });

        metaFirms.forEach((firm) => {
          const code = String(firm?.code || "").trim();
          if (!code) return;
          const prev = mergedByCode.get(code) || {};
          const nextFlowTypes =
            normalizeFlowTypes(firm?.flowTypes).length > 0
              ? normalizeFlowTypes(firm?.flowTypes)
              : normalizeFlowTypes(prev?.flowTypes);

          mergedByCode.set(code, {
            ...prev,
            ...firm,
            flowTypes: nextFlowTypes,
          });
        });

        setFirms(Array.from(mergedByCode.values()));
        setMetaFlows(
          metaRes.status === "fulfilled" && Array.isArray(metaRes.value?.data?.data?.flows)
            ? metaRes.value.data.data.flows
            : []
        );
        setAdminFlowTypes(
          actorTypeRes.status === "fulfilled" && Array.isArray(actorTypeRes.value?.data?.data)
            ? actorTypeRes.value.data.data
            : []
        );
      } catch (e) {
        setError("Failed to load firms.");
      } finally {
        setLoadingBase(false);
      }
    };

    loadFirms();
  }, [open, backendUrl]);

  useEffect(() => {
    if (!open || !initialConfig) return;

    const initFirm = String(initialConfig.firmCode || initialConfig.firm_code || "").trim();
    const initFlow = String(initialConfig.flowName || initialConfig.hierarchy_name || "").trim();
    const initActorCodes = Array.isArray(initialConfig.actorCodes)
      ? initialConfig.actorCodes
      : initialConfig.actorCode
      ? [initialConfig.actorCode]
      : [];
    const initDealerCodes = Array.isArray(initialConfig.dealerCodes)
      ? initialConfig.dealerCodes
      : Array.isArray(initialConfig.dealers)
      ? initialConfig.dealers.map((d) => d.code)
      : [];

    setFirmCode(initFirm);
    setFlowName(initFlow);
    setPendingInitialActorCodes(
      initActorCodes.map((code) => String(code || "").trim()).filter(Boolean)
    );
    setSelectedActorCodes(initActorCodes.map((code) => String(code || "").trim()).filter(Boolean));
    setPendingInitialDealerCodes(
      initDealerCodes.map((code) => String(code || "").trim()).filter(Boolean)
    );
    setStartDate(
      toDateInputValue(
        initialConfig.startDate || initialConfig.fromDate || initialConfig.validFrom || ""
      )
    );
    setExpiryDate(
      toDateInputValue(
        initialConfig.expiryDate || initialConfig.endDate || initialConfig.validTill || ""
      )
    );
  }, [open, initialConfig]);

  useEffect(() => {
    if (!open || !firmCode || !flowName) {
      setActors([]);
      setDealerMddList([]);
      if (!initialConfig) {
        setSelectedActorCodes([]);
        setSelectedDealerCodes([]);
      }
      return;
    }

    const loadActorsAndDealers = async () => {
      setActorDealerLoading(true);
      setLoadingBase(true);
      setError("");

      try {
        const hierarchy = await fetchHierarchyRowsForFlow(firmCode, flowName);
        const { actorSeeds, dealerSeeds } = buildHierarchySeeds(
          hierarchy.rows,
          hierarchy.columns
        );

        const roleFetchers = [
          fetchPagedUsersByRole("employee"),
          fetchPagedUsersByRole("hr"),
          fetchPagedUsersByRole("admin"),
          fetchPagedUsersByRole("super_admin"),
          fetchPagedUsersByRole("dealer"),
          fetchPagedUsersByRole("mdd"),
        ];

        const roleResults = await Promise.allSettled(roleFetchers);
        let sourceRows = roleResults
          .filter((res) => res.status === "fulfilled")
          .flatMap((res) => res.value || []);

        try {
          const directoryRows = await fetchUserDirectoryRows();
          if (Array.isArray(directoryRows) && directoryRows.length > 0) {
            sourceRows = [...sourceRows, ...directoryRows];
          }
        } catch (e) {
          // role-based source remains fallback-safe
        }

        sourceRows = dedupeByCode(sourceRows);
        const userByCode = sourceRows.reduce((acc, row) => {
          const code = normalize(getCode(row));
          if (!code) return acc;
          acc[code] = row;
          return acc;
        }, {});

        const flowActorRows = actorSeeds
          .map((seed) => {
            const row = userByCode[normalize(seed.code)] || {};
            const code = getCode(row) || seed.code;
            return {
              code,
              name: getName(row) || code,
              role: getRole(row) || seed.role || "employee",
              position: getPosition(row) || seed.position || "",
            };
          })
          .filter((row) => row.code);

        const globalAdminActorRows = sourceRows
          .filter((row) => {
            const code = getCode(row);
            if (!code) return false;
            return isAdminLikeRole(getRole(row));
          })
          .map((row) => ({
            code: getCode(row),
            name: getName(row) || getCode(row),
            role: getRole(row),
            position: getPosition(row) || "admin",
          }));

        const selectedActorCodeSet = new Set(
          selectedActorCodes.map((code) => normalize(code)).filter(Boolean)
        );
        const missingSelectedActors = Array.from(selectedActorCodeSet)
          .filter(
            (code) =>
              !flowActorRows.some((row) => normalize(row.code) === code) &&
              !globalAdminActorRows.some((row) => normalize(row.code) === code)
          )
          .map((code) => {
            const row = userByCode[code] || {};
            const resolvedCode = getCode(row) || code;
            return {
              code: resolvedCode,
              name: getName(row) || resolvedCode,
              role: getRole(row) || "employee",
              position: getPosition(row) || "",
            };
          });

        const actorRows = dedupeByCode([
          ...flowActorRows,
          ...globalAdminActorRows,
          ...missingSelectedActors,
        ]);

        const dealerRows = dealerSeeds
          .map((seed) => {
            const row = userByCode[normalize(seed.code)] || {};
            const code = getCode(row) || seed.code;
            return {
              code,
              name: getName(row) || code,
              role: getRole(row) || seed.role || "dealer",
              position: getPosition(row) || seed.position || "",
              zone: getZoneFromRow(row),
              district: getDistrictFromRow(row),
              topDealer: boolTopDealer(row),
            };
          })
          .filter((row) => row.code);

        setActors(actorRows);
        setDealerMddList(dedupeByCode(dealerRows));
      } catch (e) {
        setActors([]);
        setDealerMddList([]);
        setError("Failed to load flow users/dealer mapping.");
      } finally {
        setActorDealerLoading(false);
        setLoadingBase(false);
      }
    };

    loadActorsAndDealers();
  }, [open, firmCode, flowName, weeklyActorCodeSet]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleActors = useMemo(() => {
    const q = normalize(actorSearch);
    const searched = !q
      ? actors
      : actors.filter((actor) =>
      [actor.name, actor.code, actor.position, actor.role].some((v) =>
        normalize(v).includes(q)
      )
    );

    // Once actor is selected, keep the panel focused on selected actors only.
    if (selectedActorCodes.length > 0) {
      const selectedSet = new Set(selectedActorCodes.map((code) => normalize(code)));
      return searched.filter((actor) => selectedSet.has(normalize(actor.code)));
    }

    return searched;
  }, [actors, actorSearch, selectedActorCodes]);

  const visibleDealerMdds = useMemo(() => {
    const q = normalize(dealerSearch);
    return dealerMddList.filter((item) => {
      const searchMatch =
        !q ||
        [item.name, item.code, item.position, item.role, item.zone, item.district].some((v) =>
          normalize(v).includes(q)
        );
      const zoneMatch = !zoneFilter || normalize(item.zone) === normalize(zoneFilter);
      const districtMatch =
        !districtFilter || normalize(item.district) === normalize(districtFilter);
      const topMatch =
        topDealerFilter === "all" ||
        (topDealerFilter === "yes" && item.topDealer) ||
        (topDealerFilter === "no" && !item.topDealer);
      return searchMatch && zoneMatch && districtMatch && topMatch;
    });
  }, [dealerMddList, dealerSearch, zoneFilter, districtFilter, topDealerFilter]);

  const zoneOptions = useMemo(
    () =>
      Array.from(new Set(dealerMddList.map((row) => row.zone).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [dealerMddList]
  );

  const districtOptions = useMemo(
    () =>
      Array.from(new Set(dealerMddList.map((row) => row.district).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [dealerMddList]
  );

  useEffect(() => {
    if (pendingInitialActorCodes.length === 0) return;
    if (actors.length === 0) return;

    const allowed = new Set(actors.map((row) => normalize(row.code)));
    const resolved = pendingInitialActorCodes
      .map((code) => String(code || "").trim())
      .filter((code) => allowed.has(normalize(code)));

    if (resolved.length > 0) {
      setSelectedActorCodes(resolved);
    }
    setPendingInitialActorCodes([]);
  }, [actors, pendingInitialActorCodes]);

  useEffect(() => {
    if (pendingInitialDealerCodes.length === 0) return;
    if (dealerMddList.length === 0) return;

    const allowed = new Set(dealerMddList.map((row) => normalize(row.code)));
    const resolved = pendingInitialDealerCodes
      .map((code) => String(code || "").trim())
      .filter((code) => allowed.has(normalize(code)));

    if (resolved.length > 0) {
      setSelectedDealerCodes(resolved);
    }
    setPendingInitialDealerCodes([]);
  }, [dealerMddList, pendingInitialDealerCodes]);

  const allVisibleActorsSelected =
    visibleActors.length > 0 &&
    visibleActors.every((actor) => selectedActorCodes.includes(actor.code));

  const allVisibleDealerSelected =
    visibleDealerMdds.length > 0 &&
    visibleDealerMdds.every((dealer) => selectedDealerCodes.includes(dealer.code));

  const hydrateFromExistingConfig = (actorCodes = [], externalConfig = null) => {
    const resolvedConfig = externalConfig || configByActorCode;
    const sets = actorCodes.map((code) => {
      const key = normalize(code);
      return resolvedConfig[key] || weeklyConfigByActorCode[key] || new Set();
    });

    if (sets.length === 0) {
      setSelectedDealerCodes([]);
      return;
    }

    const intersection = new Set(sets[0]);
    sets.slice(1).forEach((setRef) => {
      Array.from(intersection).forEach((value) => {
        if (!setRef.has(value)) intersection.delete(value);
      });
    });

    const codeMap = new Map(dealerMddList.map((row) => [normalize(row.code), row.code]));
    const resolvedCodes = Array.from(intersection)
      .map((code) => codeMap.get(code))
      .filter(Boolean);

    setSelectedDealerCodes(resolvedCodes);
  };

  const fetchSavedConfigForActors = async (actorCodes = []) => {
    if (actorCodes.length === 0) return;

    try {
      const res = await axios.post(
        `${backendUrl}/admin/beat-mapping/config/get`,
        { actorCodes },
        { headers: { "Content-Type": "application/json", ...tokenHeaders() } }
      );

      const configs = Array.isArray(res?.data?.configs) ? res.data.configs : [];
      const map = {};
      const todayStart = new Date(new Date().toDateString());
      const actorCodeSet = new Set(actorCodes.map((code) => normalize(code)).filter(Boolean));
      const activeConfigs = configs.filter((cfg) => {
        const actorCode = normalize(cfg.actorCode || cfg.code);
        if (!actorCodeSet.has(actorCode)) return false;
        return !isConfigExpired(cfg, todayStart);
      });

      const allConfigDealerCodes = new Set();

      activeConfigs.forEach((cfg) => {
        const key = normalize(cfg.actorCode || cfg.code);
        if (!key) return;

        const dealerCodes = Array.isArray(cfg.dealerCodes)
          ? cfg.dealerCodes
          : Array.isArray(cfg.dealers)
          ? cfg.dealers.map((d) => d.code)
          : [];

        const normalizedDealers = dealerCodes.map((code) => normalize(code)).filter(Boolean);
        map[key] = new Set(normalizedDealers);
        normalizedDealers.forEach((code) => allConfigDealerCodes.add(code));
      });

      setConfigByActorCode((prev) => ({ ...prev, ...map }));
      hydrateFromExistingConfig(actorCodes, map);

      if (actorCodes.length === 1) {
        const selectedActor = normalize(actorCodes[0]);
        const cfg = activeConfigs.find((item) => normalize(item.actorCode || item.code) === selectedActor);
        if (cfg) {
          setStartDate(toDateInputValue(cfg.startDate || cfg.fromDate || cfg.validFrom || ""));
          setExpiryDate(toDateInputValue(cfg.expiryDate || cfg.endDate || cfg.validTill || ""));
        } else if (!initialConfig) {
          setStartDate("");
          setExpiryDate("");
        }
      }

      const existingDealerSet = new Set(dealerMddList.map((row) => normalize(row.code)));
      const missingCodes = Array.from(allConfigDealerCodes).filter((code) => !existingDealerSet.has(code));
      if (missingCodes.length > 0) {
        const missingRows = await fetchUsersByCodes(missingCodes);
        const mappedMissing = missingRows
          .map((row) => ({
            code: getCode(row),
            name: getName(row) || getCode(row),
            role: getRole(row) || "dealer",
            position: getPosition(row) || "",
            zone: getZoneFromRow(row),
            district: getDistrictFromRow(row),
            topDealer: boolTopDealer(row),
          }))
          .filter((row) => row.code);
        if (mappedMissing.length > 0) {
          setDealerMddList((prev) => dedupeByCode([...prev, ...mappedMissing]));
        }
      }
    } catch (e) {
      hydrateFromExistingConfig(actorCodes);
    }
  };

  useEffect(() => {
    if (!open) return;
    if (selectedActorCodes.length === 0) {
      setSelectedDealerCodes([]);
      return;
    }

    fetchSavedConfigForActors(selectedActorCodes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedActorCodes.join("|"), dealerMddList.length]);

  const toggleActor = (code) => {
    setSelectedActorCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const toggleDealer = (code) => {
    setSelectedDealerCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const toggleSelectAllActors = () => {
    if (allVisibleActorsSelected) {
      const visibleCodeSet = new Set(visibleActors.map((a) => a.code));
      setSelectedActorCodes((prev) => prev.filter((c) => !visibleCodeSet.has(c)));
      return;
    }

    setSelectedActorCodes((prev) => {
      const next = new Set(prev);
      visibleActors.forEach((actor) => next.add(actor.code));
      return Array.from(next);
    });
  };

  const toggleSelectAllDealers = () => {
    if (allVisibleDealerSelected) {
      const visibleCodeSet = new Set(visibleDealerMdds.map((d) => d.code));
      setSelectedDealerCodes((prev) => prev.filter((c) => !visibleCodeSet.has(c)));
      return;
    }

    setSelectedDealerCodes((prev) => {
      const next = new Set(prev);
      visibleDealerMdds.forEach((dealer) => next.add(dealer.code));
      return Array.from(next);
    });
  };

  const selectedDealerRows = useMemo(() => {
    const selectedSet = new Set(selectedDealerCodes.map((code) => normalize(code)));
    return dealerMddList.filter((item) => selectedSet.has(normalize(item.code)));
  }, [dealerMddList, selectedDealerCodes]);

  const selectedVisibleDealerCount = useMemo(() => {
    const visibleSet = new Set(visibleDealerMdds.map((item) => normalize(item.code)));
    return selectedDealerCodes.filter((code) => visibleSet.has(normalize(code))).length;
  }, [visibleDealerMdds, selectedDealerCodes]);

  const handleSaveAndApply = async () => {
    if (!firmCode) {
      setError("Please select a firm.");
      return;
    }
    if (!flowName) {
      setError("Please select a flow.");
      return;
    }
    if (selectedActorCodes.length === 0) {
      setError("Please select at least one actor.");
      return;
    }
    if (selectedDealerRows.length === 0) {
      setError("Please select at least one dealer/MDD.");
      return;
    }
    if (!startDate) {
      setError("Please select config start date.");
      return;
    }
    if (!expiryDate) {
      setError("Please select config expiry date.");
      return;
    }
    if (new Date(expiryDate) < new Date(new Date().toDateString())) {
      setError("Config expiry date has already passed.");
      return;
    }
    if (new Date(expiryDate) < new Date(startDate)) {
      setError("Expiry date cannot be before start date.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const setupPayload = {
        firmCode,
        flowName,
        startDate,
        expiryDate,
        actorCodes: selectedActorCodes,
        dealers: selectedDealerRows.map((row) => ({
          name: row.name,
          code: row.code,
          zone: row.zone || "",
          district: row.district || "",
          top_dealer: row.topDealer === true,
          role: row.role || "",
          position: row.position || "",
        })),
      };

      let setupSaved = false;
      try {
        const setupRes = await axios.put(
          `${backendUrl}/admin/beat-mapping/config/upsert`,
          setupPayload,
          { headers: { "Content-Type": "application/json", ...tokenHeaders() } }
        );
        setupSaved = setupRes?.data?.success !== false;
      } catch (setupErr) {
        setupSaved = false;
      }

      const applyRes = await axios.put(
        `${backendUrl}/add-daily-beat-mapping`,
        {
          mode: "from_setup",
          ...setupPayload,
        },
        { headers: { "Content-Type": "application/json", ...tokenHeaders() } }
      );

      const msg =
        applyRes?.data?.message ||
        (setupSaved
          ? "Setup saved and daily beat mapping applied."
          : "Daily beat mapping applied from setup selection.");

      onApplied?.({
        type: "success",
        message: msg,
      });
      onClose();
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Failed to save/apply setup. Backend endpoint may be pending."
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="beat-setup-modal-overlay" onClick={onClose}>
      <div className="beat-setup-modal" onClick={(e) => e.stopPropagation()}>
        <div className="beat-setup-modal__header">
          <div>
            <h2>Beat Setup</h2>
            <p>Select firm, flow, actors and dealer/MDD mapping for beat config.</p>
          </div>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="beat-setup-modal__body">
          <div className="beat-setup-top-row double">
            <div>
              <label>Firm</label>
              <select
                value={firmCode}
                onChange={(e) => {
                  setFirmCode(e.target.value);
                  setFlowName("");
                  setActors([]);
                  setDealerMddList([]);
                  setSelectedActorCodes([]);
                  setSelectedDealerCodes([]);
                  setActorSearch("");
                  setDealerSearch("");
                  setZoneFilter("");
                  setDistrictFilter("");
                  setTopDealerFilter("all");
                }}
                disabled={loadingBase || saving}
              >
                <option value="">Select Firm</option>
                {firms.map((firm) => (
                  <option key={firm.code} value={firm.code}>
                    {firm.name} ({firm.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Flow</label>
              <select
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                disabled={loadingBase || saving || !firmCode}
              >
                <option value="">Select Flow</option>
                {flowOptions.map((flow) => (
                  <option key={flow.name} value={flow.name}>
                    {flow.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="beat-setup-date-row">
            <div>
              <label>Config Start</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={loadingBase || saving}
              />
            </div>
            <div>
              <label>Config Expiry</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                disabled={loadingBase || saving}
              />
            </div>
          </div>

          <div className="beat-setup-grid">
            <div className="beat-setup-panel">
              <div className="panel-title-row">
                <h3>Actors</h3>
                <button type="button" onClick={toggleSelectAllActors}>
                  {allVisibleActorsSelected ? "Unselect All" : "Select All"}
                </button>
              </div>
              <input
                type="text"
                placeholder="Search by name, code, position, role"
                value={actorSearch}
                onChange={(e) => setActorSearch(e.target.value)}
                disabled={saving}
              />
              <div className="panel-list">
                {actorDealerLoading && visibleActors.length === 0 ? (
                  <div className="empty">Loading actors...</div>
                ) : null}
                {visibleActors.map((actor) => (
                  <label key={actor.code} className="list-item">
                    <input
                      type="checkbox"
                      checked={selectedActorCodes.includes(actor.code)}
                      onChange={() => toggleActor(actor.code)}
                      disabled={saving}
                    />
                    <div>
                      <strong>{actor.name || "N/A"}</strong>
                      <span>
                        {actor.code} • {actor.position || actor.role || "NA"}
                      </span>
                    </div>
                  </label>
                ))}
                {visibleActors.length === 0 && <div className="empty">No actors found.</div>}
              </div>
            </div>

            <div className="beat-setup-panel">
              <div className="panel-title-row">
                <h3>Dealer / MDD</h3>
                <button type="button" onClick={toggleSelectAllDealers}>
                  {allVisibleDealerSelected ? "Unselect All" : "Select All"}
                </button>
              </div>

              <div className="dealer-filters">
                <input
                  type="text"
                  placeholder="Search name, code, position, role"
                  value={dealerSearch}
                  onChange={(e) => setDealerSearch(e.target.value)}
                  disabled={saving}
                />
                <select
                  value={zoneFilter}
                  onChange={(e) => setZoneFilter(e.target.value)}
                  disabled={saving}
                >
                  <option value="">All Zones</option>
                  {zoneOptions.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
                <select
                  value={districtFilter}
                  onChange={(e) => setDistrictFilter(e.target.value)}
                  disabled={saving}
                >
                  <option value="">All Districts</option>
                  {districtOptions.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
                <select
                  value={topDealerFilter}
                  onChange={(e) => setTopDealerFilter(e.target.value)}
                  disabled={saving}
                >
                  <option value="all">Top Dealer: All</option>
                  <option value="yes">Top Dealer: Yes</option>
                  <option value="no">Top Dealer: No</option>
                </select>
              </div>

              <div className="selected-count-row">
                Selected: {selectedDealerCodes.length}
                {visibleDealerMdds.length > 0 ? ` • In View: ${selectedVisibleDealerCount}` : ""}
              </div>

              <div className="panel-list">
                {actorDealerLoading && visibleDealerMdds.length === 0 ? (
                  <div className="empty">Loading dealer/MDD...</div>
                ) : null}
                {visibleDealerMdds.map((item) => (
                  <label key={item.code} className="list-item">
                    <input
                      type="checkbox"
                      checked={selectedDealerCodes.includes(item.code)}
                      onChange={() => toggleDealer(item.code)}
                      disabled={saving}
                    />
                    <div>
                      <strong>{item.name || "N/A"}</strong>
                      <span>
                        {item.code} • {item.zone || "NA"} • {item.district || "NA"} • Top:{" "}
                        {item.topDealer ? "Yes" : "No"}
                      </span>
                    </div>
                  </label>
                ))}
                {visibleDealerMdds.length === 0 && (
                  <div className="empty">No dealer/MDD found.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="beat-setup-modal__footer">
          {error ? <div className="error">{error}</div> : <div />}
          <div className="actions">
            <button type="button" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="button" onClick={handleSaveAndApply} disabled={saving || loadingBase}>
              {saving ? "Applying..." : "Save & Apply"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BeatSetupModal;
