import React, {useMemo, useState, useEffect} from "react";
import {FaDownload, FaFileUpload} from "react-icons/fa";
import config from "../../config.js";
import axios from "axios";
import "./style.scss";
import CustomAlert from "../../components/CustomAlert/index.js";
import SecurityKeyPopup from "./SecurityKeyPopup/index.js";
import {useLocation, useNavigate} from "react-router-dom";
import EmployeeSchedule from "./employeeSchedule";
import BeatSetupModal from "./BeatSetupModal";
import BeatConfigListModal from "./BeatConfigListModal";
import * as XLSX from "xlsx";
import TableLoading from "../../components/tableLoading";
import ReactECharts from "echarts-for-react";
// import TimelineView from "./timelineView/index.jsx";

const backendUrl = config.backend_url;

const ViewBeatMappingStatus = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);

    // Initialize state from query parameters
    const initialSearch = queryParams.get("search") || "";
    const initialStartDate = queryParams.get("startDate")
        ? new Date(queryParams.get("startDate"))
        : (() => {
            return new Date();
        })();
    const initialEndDate = queryParams.get("endDate")
        ? new Date(queryParams.get("endDate"))
        : null;
    const initialSelectedRoute = queryParams.get("route")
        ? [queryParams.get("route")]
        : [];

    // State declarations
    const [data, setData] = useState([]);
    const [search, setSearch] = useState(initialSearch);
    const [startDay, setStartDay] = useState(initialStartDate);
    const [endDay, setEndDay] = useState(initialEndDate);
    const [selectedRoute, setSelectedRoute] = useState(initialSelectedRoute);
    const [alert, setAlert] = useState({show: false, type: "", message: ""});
    const [showSecurityKeyPopup, setShowSecurityKeyPopup] = useState(false);
    const [expandedRow, setExpandedRow] = useState(null);
    const [expandedRowData, setExpandedRowData] = useState([]);
    const [isDownload, setIsDownload] = useState(false);
    const [isLoading, setLoading] = useState(false);
    const [firmFilter, setFirmFilter] = useState("");
    const [positionFilter, setPositionFilter] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [topDealerFilter, setTopDealerFilter] = useState("all");
    const [actorMetaByCode, setActorMetaByCode] = useState({});
    const [showBeatSetupModal, setShowBeatSetupModal] = useState(false);
    const [showConfigListModal, setShowConfigListModal] = useState(false);
    const [selectedConfigForEdit, setSelectedConfigForEdit] = useState(null);

    const getNormalizedString = (value) =>
        value === null || value === undefined ? "" : String(value).trim().toLowerCase();

    const getDealerFirm = (dealer = {}) =>
        String(
            dealer.firm ||
            dealer.firmName ||
            dealer.firm_code ||
            dealer.firmCode ||
            dealer.category ||
            ""
        ).trim();

    const getActorFirm = (actor = {}, schedule = [], actorMeta = {}) =>
        String(
            actor.firm ||
            actor.firmName ||
            actor.firm_code ||
            actor.firmCode ||
            actor.orgName ||
            actorMeta.firm ||
            actorMeta.firmName ||
            actorMeta.firm_code ||
            actorMeta.firmCode ||
            actorMeta.firm_name ||
            (Array.isArray(schedule) ? getDealerFirm(schedule[0] || {}) : "") ||
            ""
        ).trim();

    const getActorPosition = (actor = {}, actorMeta = {}) =>
        String(
            actor.position ||
            actor.userPosition ||
            actor.designation ||
            actorMeta.position ||
            actorMeta.userPosition ||
            ""
        ).trim();

    const getActorRole = (actor = {}, actorMeta = {}) =>
        String(actor.role || actor.userRole || actorMeta.role || actorMeta.userRole || "").trim();

    const isTopDealer = (dealer = {}) =>
        dealer.top_outlet === true || dealer.topOutlet === true || dealer.topDealer === true;

    const hasActiveFilters =
        !!firmFilter || !!positionFilter || !!roleFilter || topDealerFilter !== "all";

    const getAuthHeaders = () => {
        const token = localStorage.getItem("authToken") || "";
        if (!token) return {};
        return {
            Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
        };
    };

    const getBeatMapping = async () => {
        setLoading(true);
        if (!startDay) {
            setAlert({
                show: true,
                type: "error",
                message: "Start date is required.",
            });
            return;
        }

        try {
            const res = await axios.get(
                `${backendUrl}/get-weekly-beat-mapping-schedule-for-admin`,
                {
                    params: {
                        startDate: startDay.toISOString().split("T")[0],
                        endDate: endDay ? endDay.toISOString().split("T")[0] : "",
                        search,
                    },
                }
            );

            if (res.data.success && Array.isArray(res.data.data)) {
                setData(res.data.data); // Set the data array from response
            } else {
                throw new Error("Invalid response format");
            }
        } catch (err) {
            setData([]);
            setAlert({
                show: true,
                type: "error",
                message:
                    err.response?.data?.message || "Failed to fetch beat mapping data",
            });
            console.error("Error fetching beat mapping:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (startDay) {
            getBeatMapping();
        }
    }, [ search, startDay, endDay]);

    useEffect(() => {
        if (expandedRow !== null) {
            setExpandedRow(null);
            setExpandedRowData([]);
        }
    }, [ search, startDay, endDay, firmFilter, positionFilter, roleFilter, topDealerFilter]);

    useEffect(() => {
        const actorCodes = Array.from(
            new Set(
                data
                    .map((item) => String(item?.code || "").trim())
                    .filter(Boolean)
            )
        );

        if (actorCodes.length === 0) {
            setActorMetaByCode({});
            return;
        }

        const missingCodes = actorCodes.filter(
            (code) => !actorMetaByCode[String(code).toLowerCase()]
        );
        if (missingCodes.length === 0) return;

        let cancelled = false;

        const fetchActorMeta = async () => {
            try {
                const codeSet = new Set(missingCodes.map((code) => String(code).toLowerCase()));
                const collected = {};
                let page = 1;
                const limit = 1000;
                let hasMore = true;

                const collectFromRows = (rows = []) => {
                    rows.forEach((row) => {
                        const code = String(
                            row?.code || row?.employeeCode || row?.empCode || row?.userCode || ""
                        ).trim();
                        if (!code) return;
                        const normCode = code.toLowerCase();
                        if (!codeSet.has(normCode)) return;
                        collected[normCode] = row;
                    });
                };

                try {
                    while (hasMore && page <= 25 && Object.keys(collected).length < missingCodes.length) {
                        const res = await axios.get(`${backendUrl}/user/get-by-admins`, {
                            params: {
                                page,
                                limit,
                                sort: "createdAt",
                                order: -1,
                                search: "",
                            },
                            headers: getAuthHeaders(),
                        });

                        const rows = Array.isArray(res?.data?.data) ? res.data.data : [];
                        collectFromRows(rows);
                        const totalRecords = Number(res?.data?.totalRecords || 0);
                        hasMore = rows.length === limit && page * limit < totalRecords;
                        page += 1;
                    }
                } catch (primaryError) {
                    console.warn("Primary actor metadata source failed, trying fallback source:", primaryError);
                }

                if (Object.keys(collected).length < missingCodes.length) {
                    try {
                        let fallbackPage = 1;
                        let fallbackHasMore = true;
                        const fallbackLimit = 1000;
                        while (
                            fallbackHasMore &&
                            fallbackPage <= 25 &&
                            Object.keys(collected).length < missingCodes.length
                        ) {
                            const fallbackRes = await axios.get(`${backendUrl}/super-admin/user-directory`, {
                                params: {
                                    search: "",
                                    position: "",
                                    role: "",
                                    status: "",
                                    firm_code: "",
                                    page: fallbackPage,
                                    limit: fallbackLimit,
                                },
                                headers: getAuthHeaders(),
                            });

                            const rows = Array.isArray(fallbackRes?.data?.rows)
                                ? fallbackRes.data.rows
                                : [];
                            collectFromRows(rows);
                            const totalRecords = Number(fallbackRes?.data?.total || 0);
                            fallbackHasMore =
                                rows.length === fallbackLimit &&
                                fallbackPage * fallbackLimit < totalRecords;
                            fallbackPage += 1;
                        }
                    } catch (fallbackError) {
                        console.warn("Fallback actor metadata source failed:", fallbackError);
                    }
                }

                if (!cancelled && Object.keys(collected).length > 0) {
                    setActorMetaByCode((prev) => ({
                        ...prev,
                        ...collected,
                    }));
                }
            } catch (error) {
                console.error("Failed to hydrate actor metadata for market coverage filters:", error);
            }
        };

        fetchActorMeta();

        return () => {
            cancelled = true;
        };
    }, [data, actorMetaByCode]);

    const addDailyBeatMapping = async () => {
        try {
            const res = await axios.put(`${backendUrl}/add-daily-beat-mapping`);
            setAlert({
                show: true,
                type: "success",
                message: res.data.message || "Daily Beat Mapping Added Successfully",
            });
        } catch (err) {
            setAlert({
                show: true,
                type: "error",
                message:
                    err.response?.data?.message || "Failed to add daily beat mapping",
            });
        } finally {
            getBeatMapping();
        }
    };

    const handleBeatSetupApplied = ({ type, message }) => {
        setAlert({
            show: true,
            type: type || "success",
            message: message || "Beat setup applied successfully.",
        });
        getBeatMapping();
    };

    const handleOpenConfigForEdit = (cfg) => {
        setShowConfigListModal(false);
        setSelectedConfigForEdit(cfg || null);
        setShowBeatSetupModal(true);
    };


    const getRouteFilteredCounts = (schedule = [], routeId, routes = []) => {
        if (!routeId) {
            return {
                total: schedule.length,
                done: schedule.filter((s) => s.status === "done").length,
                pending: schedule.filter((s) => s.status === "pending").length,
            };
        }

        const route = routes.find((r) => r.id === routeId);
        if (!route) {
            return {
                total: schedule.length,
                done: schedule.filter((s) => s.status === "done").length,
                pending: schedule.filter((s) => s.status === "pending").length,
            };
        }

        const {zones, districts, talukas} = route.itinerary || {};
        const filteredSchedule = schedule.filter((item) => {
            return (
                (zones?.length === 0 || zones?.includes(item.zone)) &&
                (districts?.length === 0 || districts?.includes(item.district)) &&
                (talukas?.length === 0 || talukas?.includes(item.taluka))
            );
        });

        return {
            total: filteredSchedule.length,
            done: filteredSchedule.filter((s) => s.status === "done").length,
            pending: filteredSchedule.filter((s) => s.status === "pending").length,
        };
    };

    const handleRouteChange = (routeId, index) => {
        setSelectedRoute((prev) => ({
            ...prev,
            [index]: routeId,
        }));
    };

    // Reset all filters and URL
    const handleReset = () => {
        setSearch("");
        const defaultStartDate = new Date();
        const defaultEndDate = "";
        setStartDay(defaultStartDate);
        setEndDay(defaultEndDate);
        setFirmFilter("");
        setPositionFilter("");
        setRoleFilter("");
        setTopDealerFilter("all");
        navigate("/marketCoverage", {replace: true});
        getBeatMapping();
    };

    const handleDownloadExcel = () => {
        setIsDownload(true);
        if (!data || data.length === 0) {
            setAlert({
                show: true,
                type: "error",
                message: "No data to download.",
            });
            return;
        }

        // Flatten data: one row per dealer per employee
        let excelData = [];
        filteredData.forEach((item) => {
            // If item.dealers is an array, otherwise adjust as per your data structure
            const dealers = Array.isArray(item.schedule) ? item.schedule : [];
            if (dealers.length === 0) {
                // No dealers, still add the row
                excelData.push({
                    "Employee Code": item.code,
                    "Employee Name": item.name,
                    Dealer: "N/A",
                    "Dealer Code": "N/A",
                    Total: (item.done || 0) + (item.pending || 0),
                    Done: item.done || 0,
                    Pending: item.pending || 0,
                    Date: startDay?.toDateString().split("T")[0] || "N/A",
                    Route: item.routes?.map((r) => r.name).join(", ") || "N/A",
                    Status: item.routes?.map((r) => r.status).join(", ") || "N/A",
                });
            } else {
                dealers.forEach((dealerObj, dealerIdx) => {
                    excelData.push({
                        "Employee Code": item.code,
                        "Employee Name": item.name,
                        Total: (item.done || 0) + (item.pending || 0),
                        Done: item.done || 0,
                        Pending: item.pending || 0,
                        Date: startDay?.toDateString().split("T")[0] || "N/A",
                        Dealer: dealerObj.name || dealerObj,
                        "Dealer Code": dealerObj.code || dealerObj,
                        Status: dealerObj.status,
                        "Visited Count": dealerObj?.visited ? dealerObj?.visited : 0,
                    });
                });
            }
        });

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "BeatMappingStatus");

        XLSX.writeFile(workbook, "BeatMappingStatus.xlsx");
        setIsDownload(false)
    };

    const enrichedActorRows = useMemo(() => {
        return data.map((item) => {
            const schedule = Array.isArray(item.schedule) ? item.schedule : [];
            const actorCode = String(item?.code || "").trim();
            const actorMeta = actorMetaByCode[actorCode.toLowerCase()] || {};
            const actorFirm = getActorFirm(item, schedule, actorMeta);
            const actorPosition = getActorPosition(item, actorMeta);
            const actorRole = getActorRole(item, actorMeta);
            const hasTopDealer = schedule.some((dealer) => isTopDealer(dealer));

            return {
                ...item,
                schedule,
                actorFirm,
                actorPosition,
                actorRole,
                hasTopDealer,
            };
        });
    }, [data, actorMetaByCode]);

    const optionsFromData = useMemo(() => {
        const unique = (values = []) =>
            Array.from(new Set(values.map((v) => String(v || "").trim()).filter(Boolean))).sort((a, b) =>
                a.localeCompare(b)
            );

        return {
            firms: unique(enrichedActorRows.map((item) => item.actorFirm)),
            positions: unique(enrichedActorRows.map((item) => item.actorPosition)),
            roles: unique(enrichedActorRows.map((item) => item.actorRole)),
        };
    }, [enrichedActorRows]);

    const filteredData = useMemo(() => {
        return enrichedActorRows
            .map((item) => {
                const schedule = item.schedule || [];
                const actorFirm = item.actorFirm || "";
                const actorPosition = item.actorPosition || "";
                const actorRole = item.actorRole || "";
                const hasTopDealer = item.hasTopDealer === true;

                const firmMatches =
                    !firmFilter || getNormalizedString(actorFirm) === getNormalizedString(firmFilter);
                const positionMatches =
                    !positionFilter || getNormalizedString(actorPosition) === getNormalizedString(positionFilter);
                const roleMatches =
                    !roleFilter || getNormalizedString(actorRole) === getNormalizedString(roleFilter);
                const topDealerMatches =
                    topDealerFilter === "all" ||
                    (topDealerFilter === "top" && hasTopDealer) ||
                    (topDealerFilter === "nonTop" && !hasTopDealer);

                if (!(firmMatches && positionMatches && roleMatches && topDealerMatches)) {
                    return null;
                }

                let filteredSchedule = schedule;
                if (topDealerFilter === "top") {
                    filteredSchedule = schedule.filter((dealer) => isTopDealer(dealer));
                } else if (topDealerFilter === "nonTop") {
                    filteredSchedule = schedule.filter((dealer) => !isTopDealer(dealer));
                }

                const done = filteredSchedule.filter((s) => s.status === "done").length;
                const pending = filteredSchedule.filter((s) => s.status === "pending").length;

                return {
                    ...item,
                    schedule: hasActiveFilters ? filteredSchedule : schedule,
                    done,
                    pending,
                    actorFirm,
                    actorPosition,
                    actorRole,
                };
            })
            .filter(Boolean);
    }, [enrichedActorRows, firmFilter, positionFilter, roleFilter, topDealerFilter, hasActiveFilters]);

    const stackedData = filteredData.map((emp) => {
        const total = (emp.done || 0) + (emp.pending || 0);
        const donePct = total > 0 ? ((emp.done / total) * 100).toFixed(1) : "0.0";
        const pendingPct = total > 0 ? ((emp.pending / total) * 100).toFixed(1) : "0.0";
        return {
            ...emp,
            done: donePct,
            pending: pendingPct,
            coverage: donePct,
        };
    });

    const overallTotals = useMemo(() => {
        return filteredData.reduce(
            (acc, row) => {
                acc.done += row.done || 0;
                acc.pending += row.pending || 0;
                return acc;
            },
            {done: 0, pending: 0}
        );
    }, [filteredData]);

    return (
        <div className="viewBeatMappingStatus-page">
            {alert.show && (
                <CustomAlert
                    type={alert.type}
                    message={alert.message}
                    onClose={() => setAlert({show: false, type: "", message: ""})}
                />
            )}
            <div className="viewBeatMappingStatus-page-header">
                Market Coverage
            </div>

            <>
            {/* first part  */}
            {filteredData.length > 0 && (
                <div className="viewBeatMapping-page-graph">
                    <div className="viewBeatMappingStatus-calendar-header">
                        <h2>
                            {startDay && endDay
                                ? `${startDay.toDateString()} - ${endDay.toDateString()}`
                                : "Select date range"}
                        </h2>
                    </div>
                    {/* <ResponsiveContainer width="100%" height={300}>
                        <BarChart width={600} height={300} data={stackedData}>
                            <CartesianGrid strokeDasharray="3 3"/>
                            <XAxis
                                dataKey={(entry) => entry.name.split(" ")[0]}
                                textAnchor="end"
                                height={60}
                                fontSize={13}
                                angle={-45}
                            />
                            <YAxis domain={[0, 100]} tickFormatter={(tick) => `${tick}%`}/>
                            <Tooltip/>
                            <Legend/>
                            <Bar dataKey="done" name={"Done"} stackId="a" fill="#2E7D32"/>
                            <Bar
                                dataKey="pending"
                                stackId="a"
                                fill="#FFB300"
                                name={"Pending"}
                            />
                        </BarChart>
                    </ResponsiveContainer> */}

                    <div className="modern-charts-grid">
                        <div className="modern-chart-card">
                            <ReactECharts
                                style={{height: "420px", width: "100%"}}
                                option={{
                                    tooltip: {
                                        trigger: "axis",
                                        axisPointer: {type: "shadow"},
                                    },
                                    legend: {
                                        top: 4,
                                        data: ["Done %", "Pending %", "Coverage %"],
                                    },
                                    grid: {
                                        left: 30,
                                        right: 20,
                                        top: 42,
                                        bottom: 70,
                                        containLabel: true,
                                    },
                                    xAxis: {
                                        type: "category",
                                        data: stackedData.map((d) => d.name),
                                        axisLabel: {
                                            rotate: 35,
                                            fontSize: 11,
                                            overflow: "truncate",
                                            width: 90,
                                        },
                                    },
                                    yAxis: {
                                        type: "value",
                                        max: 100,
                                        axisLabel: {formatter: "{value}%"},
                                        splitLine: {lineStyle: {type: "dashed"}},
                                    },
                                    series: [
                                        {
                                            name: "Done %",
                                            type: "bar",
                                            stack: "total",
                                            barWidth: 22,
                                            itemStyle: {
                                                borderRadius: [8, 8, 0, 0],
                                                color: {
                                                    type: "linear",
                                                    x: 0,
                                                    y: 0,
                                                    x2: 0,
                                                    y2: 1,
                                                    colorStops: [
                                                        {offset: 0, color: "#11c38e"},
                                                        {offset: 1, color: "#0f9f74"},
                                                    ],
                                                },
                                            },
                                            data: stackedData.map((d) => parseFloat(d.done)),
                                        },
                                        {
                                            name: "Pending %",
                                            type: "bar",
                                            stack: "total",
                                            barWidth: 22,
                                            itemStyle: {
                                                borderRadius: [8, 8, 0, 0],
                                                color: {
                                                    type: "linear",
                                                    x: 0,
                                                    y: 0,
                                                    x2: 0,
                                                    y2: 1,
                                                    colorStops: [
                                                        {offset: 0, color: "#ffbe66"},
                                                        {offset: 1, color: "#f18948"},
                                                    ],
                                                },
                                            },
                                            data: stackedData.map((d) => parseFloat(d.pending)),
                                        },
                                        {
                                            name: "Coverage %",
                                            type: "line",
                                            smooth: true,
                                            symbolSize: 7,
                                            lineStyle: {width: 3, color: "#4453ff"},
                                            itemStyle: {color: "#4453ff"},
                                            areaStyle: {color: "rgba(68,83,255,0.12)"},
                                            data: stackedData.map((d) => parseFloat(d.coverage)),
                                        },
                                    ],
                                }}
                            />
                        </div>
                        <div className="modern-chart-card donut">
                            <ReactECharts
                                style={{height: "420px", width: "100%"}}
                                option={{
                                    tooltip: {trigger: "item"},
                                    legend: {bottom: 8},
                                    series: [
                                        {
                                            name: "Dealer Status",
                                            type: "pie",
                                            radius: ["55%", "76%"],
                                            center: ["50%", "45%"],
                                            itemStyle: {
                                                borderRadius: 10,
                                                borderColor: "#fff",
                                                borderWidth: 2,
                                            },
                                            label: {
                                                show: true,
                                                formatter: "{b}\n{d}%",
                                                fontSize: 12,
                                            },
                                            data: [
                                                {
                                                    value: overallTotals.done,
                                                    name: "Done",
                                                    itemStyle: {color: "#15b887"},
                                                },
                                                {
                                                    value: overallTotals.pending,
                                                    name: "Pending",
                                                    itemStyle: {color: "#f49a54"},
                                                },
                                            ],
                                        },
                                    ],
                                    graphic: [
                                        {
                                            type: "text",
                                            left: "center",
                                            top: "40%",
                                            style: {
                                                text: `${overallTotals.done + overallTotals.pending}`,
                                                fontSize: 24,
                                                fontWeight: 700,
                                                fill: "#1f2937",
                                            },
                                        },
                                        {
                                            type: "text",
                                            left: "center",
                                            top: "48%",
                                            style: {
                                                text: "Total Dealers",
                                                fontSize: 12,
                                                fill: "#6b7280",
                                            },
                                        },
                                    ],
                                }}
                            />
                        </div>
                    </div>

                </div>
            )}

            <div className="viewBeatMappingStatus-page-container">
                <div className="viewBeatMapping-first-line">
                    <div className="filters-container">
                        <div className="viewBeatMappingStatus-filter">
                            <input
                                type="text"
                                placeholder="Search Employee Code"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <select
                                value={firmFilter}
                                onChange={(e) => setFirmFilter(e.target.value)}
                            >
                                <option value="">All Firms</option>
                                {optionsFromData.firms.map((firm) => (
                                    <option key={firm} value={firm}>
                                        {firm}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={positionFilter}
                                onChange={(e) => setPositionFilter(e.target.value)}
                            >
                                <option value="">All Positions</option>
                                {optionsFromData.positions.map((position) => (
                                    <option key={position} value={position}>
                                        {position}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                            >
                                <option value="">All Roles</option>
                                {optionsFromData.roles.map((role) => (
                                    <option key={role} value={role}>
                                        {role}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={topDealerFilter}
                                onChange={(e) => setTopDealerFilter(e.target.value)}
                            >
                                <option value="all">All Dealers</option>
                                <option value="top">Top Dealer Only</option>
                                <option value="nonTop">Non-Top Dealer Only</option>
                            </select>
                            <div className="viewBeatMappingStatus-date-filter">
                                <div className="date">
                                    <label>From:</label>
                                    <input
                                        type="date"
                                        value={startDay ? startDay.toISOString().split("T")[0] : ""}
                                        onChange={(e) => {
                                            if (e.target.value === "") {
                                                setStartDay(null);
                                            } else {
                                                setStartDay(new Date(e.target.value));
                                            }
                                        }}
                                    />
                                </div>
                                <div className="date">
                                    <label>To:</label>
                                    <input
                                        type="date"
                                        value={endDay ? endDay.toISOString().split("T")[0] : ""}
                                        onChange={(e) => {
                                            if (e.target.value === "") {
                                                setEndDay(null);
                                            } else {
                                                setEndDay(new Date(e.target.value));
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="buttons-container">
                        <div
                            className="viewBeatMappingStatus-upload-btn"
                            onClick={addDailyBeatMapping}
                        >
                            <label className="browse-btn">
                                <FaFileUpload/>
                                Add Daily Beat Mapping
                            </label>
                        </div>
                        <div
                            className="viewBeatMappingStatus-upload-btn"
                            onClick={() => {
                                setSelectedConfigForEdit(null);
                                setShowBeatSetupModal(true);
                            }}
                        >
                            <label className="browse-btn">
                                <FaFileUpload/>
                                Edit Config
                            </label>
                        </div>
                        <div
                            className="viewBeatMappingStatus-upload-btn"
                            onClick={() => setShowConfigListModal(true)}
                        >
                            <label className="browse-btn">
                                <FaFileUpload/>
                                View Configs
                            </label>
                        </div>
                        <div className="viewBeatMappingStatus-download-btn">
                            <div className="browse-btn" onClick={handleDownloadExcel}>
                                <FaDownload/>
                                {isDownload ? "Download..." : "Download"}

                            </div>
                        </div>
                        <div className="viewBeatMappingStatus-reset-filter">
                            <button className="reset-btn" onClick={handleReset}>
                                Reset Filters
                            </button>
                        </div>
                        {localStorage.getItem("role") === "super_admin" && (
                            <div className="edit-security-key">
                                <button
                                    className="edit-security-key-btn"
                                    onClick={() => setShowSecurityKeyPopup(true)}
                                >
                                    Edit Security Key
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="viewBeatMapping-table-container">
                    <table>
                        <thead>
                        <tr>
                            <th>S.NO</th>
                            <th>Employee Code</th>
                            <th>Employee Name</th>
                            <th>Total</th>
                            <th>Pending</th>
                            <th>Done</th>
                            <th>View</th>
                            <th>Route</th>
                            <th>Status</th>
                        </tr>
                        </thead>
                        {isLoading ? (
                            <TableLoading columnCount={9}/>
                        ) : (
                            <tbody>
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan="11" style={{textAlign: "center"}}>
                                        No data available
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item, index) => {
                                    const isExpanded = expandedRow === index;

                                    const counts = getRouteFilteredCounts(
                                        item.schedule || [],
                                        selectedRoute[index],
                                        item.routes || []
                                    );
                                    return [
                                        <tr
                                            key={item._id || `row-${index}`}
                                            onClick={() => {
                                                setExpandedRow(isExpanded ? null : index);
                                                setExpandedRowData(item.schedule || []);
                                            }}
                                        >
                                            <td>{ index + 1}</td>
                                            <td>{item.code}</td>
                                            <td>{item.name}</td>

                                            <td
                                                style={{
                                                    color: "#1E88E5",
                                                    fontWeight: "600",
                                                    fontSize: "14px",
                                                }}
                                            >
                                                {counts.total}
                                            </td>
                                            <td
                                                style={{
                                                    color: "#F57C00",
                                                    fontWeight: "600",
                                                    fontSize: "14px",
                                                }}
                                            >
                                                {counts.pending}
                                            </td>
                                            <td
                                                style={{
                                                    color: "#2E7D32",
                                                    fontWeight: "600",
                                                    fontSize: "14px",
                                                }}
                                            >
                                                {counts.done}
                                            </td>
                                            <td>
                                                <div className="expand-btn">
                                                    {isExpanded ? "Collapse" : "Expand"}
                                                </div>
                                            </td>
                                            <td>
                                                {item.routes && item.routes.length > 1 ? (
                                                    <div
                                                        className="route-select-container"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <select
                                                            value={selectedRoute[index] || ""}
                                                            onChange={(e) =>
                                                                handleRouteChange(e.target.value, index)
                                                            }
                                                        >
                                                            <option value="">All Routes</option>
                                                            {item.routes.map((route) => (
                                                                <option key={route.id} value={route.id}>
                                                                    {route.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ) : (
                                                    item.routes?.[0]?.name || "N/A"
                                                )}
                                            </td>
                                            <td
                                                style={{
                                                    color: selectedRoute[index]
                                                        ? item.routes?.find(
                                                            (r) => r.id === selectedRoute[index]
                                                        )?.status === "active"
                                                            ? "green"
                                                            : "red"
                                                        : item.routes?.[0]?.status === "active"
                                                            ? "green"
                                                            : "red",
                                                }}
                                            >
                                                {selectedRoute[index]
                                                    ? item.routes?.find(
                                                    (r) => r.id === selectedRoute[index]
                                                )?.status || "N/A"
                                                    : item.routes?.[0]?.status || "N/A"}
                                            </td>
                                        </tr>

                                    ];
                                })
                            )}
                            </tbody>

                        )}
                    </table>
                </div>
            </div>

            {
                showSecurityKeyPopup && (
                    <SecurityKeyPopup
                        onClose={() => setShowSecurityKeyPopup(false)}
                        onSuccess={(msg) => {
                            setAlert({show: true, type: "success", message: msg});
                            setShowSecurityKeyPopup(false);
                        }}
                    />
                )
            }
            {showBeatSetupModal && (
                <BeatSetupModal
                    open={showBeatSetupModal}
                    onClose={() => {
                        setShowBeatSetupModal(false);
                        setSelectedConfigForEdit(null);
                    }}
                    backendUrl={backendUrl}
                    weeklyRows={data}
                    onApplied={handleBeatSetupApplied}
                    initialConfig={selectedConfigForEdit}
                />
            )}
            {showConfigListModal && (
                <BeatConfigListModal
                    open={showConfigListModal}
                    onClose={() => setShowConfigListModal(false)}
                    backendUrl={backendUrl}
                    weeklyRows={data}
                    onEditConfig={handleOpenConfigForEdit}
                />
            )}
            {
                expandedRow !== null && (
                    <EmployeeSchedule
                        schedule={expandedRowData}
                        isClose={() => setExpandedRow(null)}
                        selectedRoute={selectedRoute}
                        data={data}
                        expandedRow={expandedRow}
                    />
                )
            }
            {/* first part  */}

              </>

        </div>
    )
        ;
};

export default ViewBeatMappingStatus;
