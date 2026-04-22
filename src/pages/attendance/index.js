import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import config from "../../config.js";
import { Link, useNavigate } from "react-router-dom";
import "./style.scss";

const backendUrl = config.backend_url;

const Attendance = () => {
  const navigate = useNavigate();
  const todayIso = new Date().toISOString().split("T")[0];
  const now = new Date();
  const [error, setError] = useState("");
  const [counts, setCounts] = useState({});
  const [dateToFetch, setDateToFetch] = useState("");
  const [employee, setEmployee] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [latestAttendance, setLatestAttendance] = useState([]);
  const [firmList, setFirmList] = useState([]);
  const [firm, setFirm] = useState("");
  const [sliderValue, setSliderValue] = useState("All");
  const [viewMode, setViewMode] = useState("day");
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("");
  const [matrixRows, setMatrixRows] = useState([]);
  const [matrixDays, setMatrixDays] = useState([]);
  const [matrixPagination, setMatrixPagination] = useState({});
  const [matrixLoading, setMatrixLoading] = useState(true);
  const [matrixLoadingMore, setMatrixLoadingMore] = useState(false);
  const [matrixError, setMatrixError] = useState("");
  const [attendanceFirmOptions, setAttendanceFirmOptions] = useState([]);
  const [matrixFirmCode, setMatrixFirmCode] = useState("");
  const [matrixMonth, setMatrixMonth] = useState(now.getMonth() + 1);
  const [matrixYear, setMatrixYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    firm: "",
    sliderValue: "All",
    viewMode: "day",
    selectedDate: todayIso,
    selectedStatus: "",
    selectedPosition: "",
    selectedMonth: now.getMonth() + 1,
    selectedYear: now.getFullYear(),
  });
  const [attendancePositions, setAttendancePositions] = useState([]);
  const [attendanceStatuses, setAttendanceStatuses] = useState([]);
  const [attendanceTodayByCode, setAttendanceTodayByCode] = useState({});
  const [recentAttendanceByCode, setRecentAttendanceByCode] = useState({});
  const [isMonthlyDownloading, setIsMonthlyDownloading] = useState(false);
  const [isDailyDownloading, setIsDailyDownloading] = useState(false);
  const limit = 50;
  const matrixLimit = 12;

  const normalizeCodeKey = (value) => String(value || "").trim().toLowerCase();

  const hasPunchData = (record) => {
    if (!record || typeof record !== "object") return false;

    return Boolean(
      record?.punchIn ||
        record?.punchOut ||
        record?.punchInName ||
        record?.punchOutName ||
        record?.punchInCode ||
        record?.punchOutCode ||
        record?.punchInLatitude ||
        record?.punchInLongitude ||
        record?.punchOutLatitude ||
        record?.punchOutLongitude
    );
  };

  const getRecordTimestamp = (record) => {
    if (!record || typeof record !== "object") return 0;
    const nextTs = new Date(
      record?.punchOut || record?.punchIn || record?.updatedAt || record?.date || 0
    ).getTime();
    return Number.isFinite(nextTs) ? nextTs : 0;
  };

  const extractAttendanceRows = (payload) => {
    const rows = [];
    const seen = new Set();

    const visit = (node) => {
      if (!node) return;

      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }

      if (typeof node !== "object") return;

      if (seen.has(node)) return;
      seen.add(node);

      const codeCandidate =
        node?.code || node?.employeeCode || node?.empCode || node?.userCode;
      const hasAttendanceFields =
        node?.punchIn !== undefined ||
        node?.punchOut !== undefined ||
        node?.status !== undefined ||
        node?.date !== undefined ||
        node?.today !== undefined ||
        node?.selectedDay !== undefined ||
        node?.latestAttendance !== undefined;

      if (codeCandidate && hasAttendanceFields) {
        rows.push(node);
        return;
      }

      [
        "data",
        "rows",
        "records",
        "attendance",
        "items",
        "docs",
        "result",
        "today",
        "selectedDay",
        "latestAttendance",
      ].forEach((key) => {
        if (node[key] !== undefined) visit(node[key]);
      });
    };

    visit(payload);
    return rows;
  };

  const selectedFirmCodesForAttendance = useMemo(() => {
    const appliedFirm = appliedFilters.firm;
    if (!appliedFirm) return [];

    const directOptionMatch = attendanceFirmOptions.find(
      (item) => String(item?.code || "") === String(appliedFirm)
    );
    if (directOptionMatch?.code) return [String(directOptionMatch.code)];

    const selectedFirm = firmList.find(
      (item) => String(item?._id || "") === String(appliedFirm)
    );

    const directCode =
      selectedFirm?.code || selectedFirm?.firm_code || selectedFirm?.firmCode;
    if (directCode) return [String(directCode)];

    const selectedFirmName = String(selectedFirm?.name || "")
      .trim()
      .toLowerCase();

    if (!selectedFirmName) return [];

    const optionMatch = attendanceFirmOptions.find(
      (item) => String(item?.name || "").trim().toLowerCase() === selectedFirmName
    );

    return optionMatch?.code ? [String(optionMatch.code)] : [];
  }, [appliedFilters.firm, firmList, attendanceFirmOptions]);

  const attendanceRequestPayload = useMemo(() => {
    const payload = {
      viewMode: appliedFilters.viewMode,
      firmCodes: selectedFirmCodesForAttendance,
      positions: appliedFilters.selectedPosition ? [appliedFilters.selectedPosition] : [],
      statuses: appliedFilters.selectedStatus ? [appliedFilters.selectedStatus] : [],
      search: appliedFilters.search,
    };

    if (appliedFilters.viewMode === "day") {
      payload.date = appliedFilters.selectedDate;
    } else {
      payload.month = Number(appliedFilters.selectedMonth);
      payload.year = Number(appliedFilters.selectedYear);
    }

    return payload;
  }, [
    appliedFilters.viewMode,
    selectedFirmCodesForAttendance,
    appliedFilters.selectedPosition,
    appliedFilters.selectedStatus,
    appliedFilters.search,
    appliedFilters.selectedDate,
    appliedFilters.selectedMonth,
    appliedFilters.selectedYear,
  ]);

  const hasPendingFilterChanges = useMemo(
    () =>
      search !== appliedFilters.search ||
      firm !== appliedFilters.firm ||
      sliderValue !== appliedFilters.sliderValue ||
      viewMode !== appliedFilters.viewMode ||
      selectedDate !== appliedFilters.selectedDate ||
      selectedStatus !== appliedFilters.selectedStatus ||
      selectedPosition !== appliedFilters.selectedPosition ||
      Number(selectedMonth) !== Number(appliedFilters.selectedMonth) ||
      Number(selectedYear) !== Number(appliedFilters.selectedYear),
    [
      search,
      firm,
      sliderValue,
      viewMode,
      selectedDate,
      selectedStatus,
      selectedPosition,
      selectedMonth,
      selectedYear,
      appliedFilters,
    ]
  );

  const handleApplyFilters = () => {
    setCurrentPage(1);
    setAppliedFilters({
      search,
      firm,
      sliderValue,
      viewMode,
      selectedDate,
      selectedStatus,
      selectedPosition,
      selectedMonth: Number(selectedMonth),
      selectedYear: Number(selectedYear),
    });
  };

  const getAllActorTypes = async () => {
    try {
      const res = await axios.get(
        `${backendUrl}/actorTypesHierarchy/get-all-by-admin`
      );
      setFirmList(res.data.data || []);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await axios.post(
        `${backendUrl}/attendance-admin/overview`,
        {
          viewMode: attendanceRequestPayload.viewMode,
          firmCodes: attendanceRequestPayload.firmCodes,
          positions: attendanceRequestPayload.positions,
          search: attendanceRequestPayload.search,
          ...(attendanceRequestPayload.viewMode === "day"
            ? { date: attendanceRequestPayload.date }
            : {
                month: attendanceRequestPayload.month,
                year: attendanceRequestPayload.year,
              }),
        },
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );

      const today = res?.data?.data?.today || {};
      setCounts({
        present: Number(today?.present || 0),
        absent: Number(today?.absent || 0),
        leave: Number(today?.leave || 0),
        halfDay: Number(today?.halfDay || 0),
        pending: Number(today?.pending || 0),
        total: Number(today?.totalEligible || 0),
      });
      setDateToFetch(res?.data?.data?.selectedDate || attendanceRequestPayload.date || "");
      setError("");
    } catch (err) {
      console.error("Error fetching attendance overview:", err);
      setCounts({});
      setError("Failed to load attendance overview.");
    }
  };

  const getLatestAttendance = async (selectedDate) => {
    const dateParam = selectedDate || dateToFetch || new Date();

    try {
      const res = await axios.get(
        `${backendUrl}/get-latest-attendance-by-date`,
        {
          params: {
            date: dateParam,
            page: 1,
            limit: 5000,
          },
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );
      setLatestAttendance(res?.data?.data || []);
    } catch (error) {
      console.log(error);
    }
  };

  const getCodesByRole = async (role) => {
    const appliedFirm = appliedFilters.firm;
    const actorTypeFirmId = firmList.some(
      (item) => String(item?._id || "") === String(appliedFirm)
    )
      ? appliedFirm
      : "";

    try {
      const res = await axios.get(`${backendUrl}/get-emp-for-hr`, {
        params: {
          page: 1,
          limit: 5000,
          search: "",
          firm: actorTypeFirmId,
          role,
        },
      });

      const rows = Array.isArray(res?.data?.data) ? res.data.data : [];
      return new Set(
        rows
          .map((row) => normalizeCodeKey(row?.code))
          .filter((value) => Boolean(value))
      );
    } catch (error) {
      if (error?.response?.status === 404) {
        return new Set();
      }
      console.log(`Error fetching ${role} codes:`, error);
      return null;
    }
  };

  const getStatusSortPriority = (statusValue) => {
    const normalized = String(statusValue || "")
      .trim()
      .toLowerCase();

    if (normalized === "present") return 0;
    if (normalized === "half day" || normalized === "halfday") return 1;
    if (normalized === "pending") return 2;
    if (normalized === "leave") return 3;
    if (normalized === "absent") return 4;
    return 5;
  };

  const getTimingSortValue = (timeValue) => {
    if (!timeValue) return Number.POSITIVE_INFINITY;

    if (typeof timeValue === "string") {
      const trimmed = timeValue.trim();
      const meridianMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (meridianMatch) {
        const rawHour = Number(meridianMatch[1]);
        const minute = Number(meridianMatch[2]);
        const meridian = meridianMatch[3].toUpperCase();

        let hour24 = rawHour % 12;
        if (meridian === "PM") hour24 += 12;
        return hour24 * 60 + minute;
      }
    }

    const asDate = new Date(timeValue);
    const timestamp = asDate.getTime();
    return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
  };

  const getDateKeyIST = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  };

  const formatTimeForExport = (value) => {
    if (!value) return "N/A";

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(trimmed)) return trimmed.toUpperCase();
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";

    return date.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getExportLocationLabel = (record, type) => {
    if (!record) return "N/A";

    const byName =
      type === "in"
        ? record?.punchInName || record?.punchInCode
        : record?.punchOutName || record?.punchOutCode;
    if (byName) return byName;

    const lat =
      type === "in"
        ? toCoordNumber(record?.punchInLatitude)
        : toCoordNumber(record?.punchOutLatitude);
    const lng =
      type === "in"
        ? toCoordNumber(record?.punchInLongitude)
        : toCoordNumber(record?.punchOutLongitude);

    if (lat !== null && lng !== null) {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }

    return "N/A";
  };

  const getStatusShortCodeForExport = (statusValue) => {
    const status = String(statusValue || "")
      .trim()
      .toLowerCase();
    if (status === "present") return "P";
    if (status === "half day" || status === "halfday") return "HD";
    if (status === "leave") return "L";
    if (status === "pending") return "PN";
    return "A";
  };

  const getStatusDisplayForExport = (statusValue) => {
    const status = String(statusValue || "")
      .trim()
      .toLowerCase();
    if (status === "present") return "Present";
    if (status === "half day" || status === "halfday") return "Half Day";
    if (status === "leave") return "Leave";
    if (status === "pending") return "Pending";
    return "Absent";
  };

  const getStatusCellStyle = (statusValue) => {
    const status = String(statusValue || "")
      .trim()
      .toLowerCase();

    if (status === "present") {
      return {
        fill: { patternType: "solid", fgColor: { rgb: "DCFCE7" } },
        font: { color: { rgb: "166534" }, bold: true },
      };
    }
    if (status === "half day" || status === "halfday") {
      return {
        fill: { patternType: "solid", fgColor: { rgb: "FEF3C7" } },
        font: { color: { rgb: "92400E" }, bold: true },
      };
    }
    if (status === "leave") {
      return {
        fill: { patternType: "solid", fgColor: { rgb: "FFEDD5" } },
        font: { color: { rgb: "9A3412" }, bold: true },
      };
    }
    if (status === "pending") {
      return {
        fill: { patternType: "solid", fgColor: { rgb: "E2E8F0" } },
        font: { color: { rgb: "334155" }, bold: true },
      };
    }

    return {
      fill: { patternType: "solid", fgColor: { rgb: "FEE2E2" } },
      font: { color: { rgb: "991B1B" }, bold: true },
    };
  };

  const handleDailyAttendanceDownload = async () => {
    const downloadDate = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });

    try {
      setIsDailyDownloading(true);
      const XLSXModule = await import("xlsx-js-style");
      const XLSX = XLSXModule?.default || XLSXModule;

      const res = await axios.post(
        `${backendUrl}/attendance-admin/employees`,
        {
          viewMode: "day",
          date: downloadDate,
          firmCodes: selectedFirmCodesForAttendance,
          positions: appliedFilters.selectedPosition ? [appliedFilters.selectedPosition] : [],
          statuses: appliedFilters.selectedStatus ? [appliedFilters.selectedStatus] : [],
          search: appliedFilters.search || "",
          page: 1,
          limit: 10000,
        },
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );

      let rows = Array.isArray(res?.data?.data?.rows) ? res.data.data.rows : [];

      if (appliedFilters.sliderValue === "employee" || appliedFilters.sliderValue === "admin") {
        const roleSet = await getCodesByRole(appliedFilters.sliderValue);
        if (roleSet) {
          rows = rows.filter((row) => roleSet.has(normalizeCodeKey(row?.code)));
        }
      }

      const sortedRows = [...rows].sort((a, b) => {
        const attendanceA = a?.today || {};
        const attendanceB = b?.today || {};

        const statusRankA = getStatusSortPriority(attendanceA?.status);
        const statusRankB = getStatusSortPriority(attendanceB?.status);
        if (statusRankA !== statusRankB) return statusRankA - statusRankB;

        const timeRankA = getTimingSortValue(attendanceA?.punchIn || attendanceA?.punchOut);
        const timeRankB = getTimingSortValue(attendanceB?.punchIn || attendanceB?.punchOut);
        if (timeRankA !== timeRankB) return timeRankA - timeRankB;

        return String(a?.name || a?.code || "").localeCompare(
          String(b?.name || b?.code || "")
        );
      });

      if (sortedRows.length === 0) {
        window.alert("No attendance records found for today with selected filters.");
        return;
      }

      const header = [
        "S.No",
        "Date",
        "Code",
        "Name",
        "Position",
        "Firm",
        "Status",
        "Punch In Time",
        "Punch In Location",
        "Punch Out Time",
        "Punch Out Location",
      ];

      const exportRows = [header];

      sortedRows.forEach((row, index) => {
        const attendanceRecord = row?.today || {};
        exportRows.push([
          index + 1,
          downloadDate,
          row?.code || "",
          row?.name || "",
          row?.position || "",
          row?.firm_code || row?.firm_name || row?.firm || "",
          getStatusDisplayForExport(attendanceRecord?.status),
          formatTimeForExport(attendanceRecord?.punchIn),
          getExportLocationLabel(attendanceRecord, "in"),
          formatTimeForExport(attendanceRecord?.punchOut),
          getExportLocationLabel(attendanceRecord, "out"),
        ]);
      });

      const wb = XLSX.utils.book_new();
      const dailySheet = XLSX.utils.aoa_to_sheet(exportRows);

      dailySheet["!cols"] = [
        { wch: 7 },
        { wch: 12 },
        { wch: 14 },
        { wch: 24 },
        { wch: 14 },
        { wch: 18 },
        { wch: 12 },
        { wch: 14 },
        { wch: 32 },
        { wch: 14 },
        { wch: 32 },
      ];

      const headerStyle = {
        fill: { patternType: "solid", fgColor: { rgb: "DBEAFE" } },
        font: { bold: true, color: { rgb: "1E3A8A" } },
        alignment: { horizontal: "center", vertical: "center" },
      };

      const dailyRange = XLSX.utils.decode_range(dailySheet["!ref"]);
      for (let c = dailyRange.s.c; c <= dailyRange.e.c; c += 1) {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c });
        if (dailySheet[cellRef]) dailySheet[cellRef].s = headerStyle;
      }

      for (let r = 1; r <= dailyRange.e.r; r += 1) {
        const statusRef = XLSX.utils.encode_cell({ r, c: 6 });
        const statusCell = dailySheet[statusRef];
        if (statusCell) statusCell.s = getStatusCellStyle(statusCell.v);
      }

      XLSX.utils.book_append_sheet(wb, dailySheet, "Today Attendance");

      XLSX.writeFile(wb, `Attendance_Today_${downloadDate}.xlsx`, {
        cellStyles: true,
      });
    } catch (error) {
      console.error("Daily attendance download failed:", error);
      window.alert("Failed to download today's attendance. Please try again.");
    } finally {
      setIsDailyDownloading(false);
    }
  };

  const handleMonthlyAttendanceDownload = async () => {
    const sourceMonth =
      appliedFilters.viewMode === "month"
        ? Number(appliedFilters.selectedMonth)
        : new Date(appliedFilters.selectedDate || todayIso).getMonth() + 1;
    const sourceYear =
      appliedFilters.viewMode === "month"
        ? Number(appliedFilters.selectedYear)
        : new Date(appliedFilters.selectedDate || todayIso).getFullYear();

    const nowDate = new Date();
    const nowMonth = nowDate.getMonth() + 1;
    const nowYear = nowDate.getFullYear();
    const daysInMonth = new Date(sourceYear, sourceMonth, 0).getDate();
    const maxDay =
      sourceMonth === nowMonth && sourceYear === nowYear
        ? Math.min(nowDate.getDate(), daysInMonth)
        : daysInMonth;

    const dayKeys = Array.from({ length: maxDay }, (_, idx) => {
      const day = idx + 1;
      const dayKey = `${sourceYear}-${String(sourceMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return dayKey;
    });

    try {
      setIsMonthlyDownloading(true);
      const XLSXModule = await import("xlsx-js-style");
      const XLSX = XLSXModule?.default || XLSXModule;

      const res = await axios.get(`${backendUrl}/get-latest-attendance-by-date`, {
        params: {
          month: sourceMonth,
          year: sourceYear,
          page: 1,
          limit: 100000,
          search: appliedFilters.search || "",
          status: appliedFilters.selectedStatus || "",
          ...(selectedFirmCodesForAttendance.length > 0
            ? { firmCodes: selectedFirmCodesForAttendance.join(",") }
            : {}),
        },
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });

      let rows = extractAttendanceRows(res?.data?.data || res?.data).filter(
        (item) => item && typeof item === "object"
      );

      rows = rows.filter((row) => {
        const dateKey = getDateKeyIST(row?.date);
        return dayKeys.includes(dateKey);
      });

      if (appliedFilters.selectedPosition) {
        rows = rows.filter(
          (row) =>
            String(row?.position || "").trim() ===
            String(appliedFilters.selectedPosition).trim()
        );
      }

      if (appliedFilters.sliderValue === "employee" || appliedFilters.sliderValue === "admin") {
        const roleSet = await getCodesByRole(appliedFilters.sliderValue);
        if (roleSet) {
          rows = rows.filter((row) => roleSet.has(normalizeCodeKey(row?.code)));
        }
      }

      if (rows.length === 0) {
        window.alert("No attendance records available for selected month and filters.");
        return;
      }

      const recordMap = new Map();
      rows.forEach((row) => {
        const codeKey = normalizeCodeKey(row?.code);
        const dateKey = getDateKeyIST(row?.date);
        if (!codeKey || !dateKey) return;
        recordMap.set(`${codeKey}-${dateKey}`, row);
      });

      const employeeMap = new Map();
      rows.forEach((row) => {
        const codeKey = normalizeCodeKey(row?.code);
        if (!codeKey || employeeMap.has(codeKey)) return;
        employeeMap.set(codeKey, {
          code: row?.code || "",
          name: row?.name || row?.code || "",
          position: row?.position || "",
          firm: row?.firm_code || "",
        });
      });

      const employeesForExport = Array.from(employeeMap.values()).sort((a, b) =>
        String(a.name || a.code).localeCompare(String(b.name || b.code))
      );

      const matrixHeader = ["S.No", "Code", "Name", "Position", "Firm"];
      dayKeys.forEach((dayKey) => {
        const dayNumber = dayKey.split("-")[2];
        const dayLabel = new Date(dayKey).toLocaleDateString("en-IN", {
          weekday: "short",
          timeZone: "Asia/Kolkata",
        });
        matrixHeader.push(`${dayNumber} ${dayLabel}`);
      });

      const matrixRowsExport = [matrixHeader];

      employeesForExport.forEach((emp, index) => {
        const row = [index + 1, emp.code, emp.name, emp.position, emp.firm];
        dayKeys.forEach((dayKey) => {
          const record = recordMap.get(`${normalizeCodeKey(emp.code)}-${dayKey}`);
          row.push(getStatusShortCodeForExport(record?.status));
        });
        matrixRowsExport.push(row);
      });

      const detailHeader = [
        "Date",
        "Day",
        "Code",
        "Name",
        "Position",
        "Firm",
        "Status",
        "Punch In Time",
        "Punch In Location",
        "Punch Out Time",
        "Punch Out Location",
      ];

      const detailRowsExport = [detailHeader];
      employeesForExport.forEach((emp) => {
        dayKeys.forEach((dayKey) => {
          const record = recordMap.get(`${normalizeCodeKey(emp.code)}-${dayKey}`) || {};
          detailRowsExport.push([
            dayKey,
            new Date(dayKey).toLocaleDateString("en-IN", {
              weekday: "long",
              timeZone: "Asia/Kolkata",
            }),
            emp.code,
            emp.name,
            emp.position,
            emp.firm,
            getStatusDisplayForExport(record?.status),
            formatTimeForExport(record?.punchIn),
            getExportLocationLabel(record, "in"),
            formatTimeForExport(record?.punchOut),
            getExportLocationLabel(record, "out"),
          ]);
        });
      });

      const wb = XLSX.utils.book_new();
      const matrixSheet = XLSX.utils.aoa_to_sheet(matrixRowsExport);
      const detailSheet = XLSX.utils.aoa_to_sheet(detailRowsExport);

      matrixSheet["!cols"] = [
        { wch: 6 },
        { wch: 14 },
        { wch: 24 },
        { wch: 14 },
        { wch: 18 },
        ...dayKeys.map(() => ({ wch: 7 })),
      ];

      detailSheet["!cols"] = [
        { wch: 12 },
        { wch: 12 },
        { wch: 14 },
        { wch: 24 },
        { wch: 14 },
        { wch: 18 },
        { wch: 12 },
        { wch: 12 },
        { wch: 30 },
        { wch: 12 },
        { wch: 30 },
      ];

      const headerStyle = {
        fill: { patternType: "solid", fgColor: { rgb: "DBEAFE" } },
        font: { bold: true, color: { rgb: "1E3A8A" } },
        alignment: { horizontal: "center", vertical: "center" },
      };

      const matrixRange = XLSX.utils.decode_range(matrixSheet["!ref"]);
      for (let c = matrixRange.s.c; c <= matrixRange.e.c; c += 1) {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c });
        if (matrixSheet[cellRef]) matrixSheet[cellRef].s = headerStyle;
      }

      for (let r = 1; r <= matrixRange.e.r; r += 1) {
        for (let c = 5; c <= matrixRange.e.c; c += 1) {
          const cellRef = XLSX.utils.encode_cell({ r, c });
          const cell = matrixSheet[cellRef];
          if (!cell) continue;
          const value = String(cell.v || "").toUpperCase();
          if (value === "P") cell.s = getStatusCellStyle("present");
          else if (value === "HD") cell.s = getStatusCellStyle("half day");
          else if (value === "L") cell.s = getStatusCellStyle("leave");
          else if (value === "PN") cell.s = getStatusCellStyle("pending");
          else cell.s = getStatusCellStyle("absent");
        }
      }

      const detailRange = XLSX.utils.decode_range(detailSheet["!ref"]);
      for (let c = detailRange.s.c; c <= detailRange.e.c; c += 1) {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c });
        if (detailSheet[cellRef]) detailSheet[cellRef].s = headerStyle;
      }

      for (let r = 1; r <= detailRange.e.r; r += 1) {
        const statusRef = XLSX.utils.encode_cell({ r, c: 6 });
        const statusCell = detailSheet[statusRef];
        if (statusCell) statusCell.s = getStatusCellStyle(statusCell.v);
      }

      XLSX.utils.book_append_sheet(wb, matrixSheet, "Month Matrix");
      XLSX.utils.book_append_sheet(wb, detailSheet, "Daily Details");

      XLSX.writeFile(
        wb,
        `Attendance_${sourceYear}_${String(sourceMonth).padStart(2, "0")}.xlsx`,
        { cellStyles: true }
      );
    } catch (error) {
      console.error("Monthly attendance download failed:", error);
      window.alert("Failed to download monthly attendance. Please try again.");
    } finally {
      setIsMonthlyDownloading(false);
    }
  };

  const getAllEmployee = async () => {
    try {
      const res = await axios.post(
        `${backendUrl}/attendance-admin/employees`,
        {
          ...attendanceRequestPayload,
          page: 1,
          limit: 5000,
        },
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );

      const allRows = Array.isArray(res?.data?.data?.rows)
        ? res.data.data.rows
        : [];

      let filteredRows = allRows;

      if (appliedFilters.sliderValue === "employee" || appliedFilters.sliderValue === "admin") {
        const roleSet = await getCodesByRole(appliedFilters.sliderValue);
        if (roleSet) {
          filteredRows = allRows.filter((row) =>
            roleSet.has(normalizeCodeKey(row?.code))
          );
        }
      }

      const sortedRows = [...filteredRows].sort((a, b) => {
        const attendanceA = a?.today || {};
        const attendanceB = b?.today || {};

        const statusRankA = getStatusSortPriority(attendanceA?.status);
        const statusRankB = getStatusSortPriority(attendanceB?.status);
        if (statusRankA !== statusRankB) return statusRankA - statusRankB;

        const timeRankA = getTimingSortValue(attendanceA?.punchIn || attendanceA?.punchOut);
        const timeRankB = getTimingSortValue(attendanceB?.punchIn || attendanceB?.punchOut);
        if (timeRankA !== timeRankB) return timeRankA - timeRankB;

        return String(a?.name || a?.code || "").localeCompare(
          String(b?.name || b?.code || "")
        );
      });

      const startIndex = (currentPage - 1) * limit;
      const endIndex = currentPage * limit;
      const paginatedRows = sortedRows.slice(startIndex, endIndex);

      setEmployee(paginatedRows);
      setTotalRecords(Number(sortedRows.length || 0));

      const todayMap = paginatedRows.reduce((acc, row) => {
        const normalizedCode = normalizeCodeKey(row?.code);
        if (!normalizedCode) return acc;
        acc[normalizedCode] = row?.today || {};
        return acc;
      }, {});
      setAttendanceTodayByCode(todayMap);
    } catch (error) {
      console.log("Error fetching attendance admin employees:", error);
      setEmployee([]);
      setTotalRecords(0);
    }
  };

  const getAttendanceFirmOptions = async () => {
    try {
      const res = await axios.get(`${backendUrl}/attendance-firm-options`, {
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });

      setAttendanceFirmOptions(res?.data?.data || []);
    } catch (error) {
      console.log("error fetching attendance firm options", error);
      setAttendanceFirmOptions([]);
    }
  };

  const getAttendanceAdminFilters = async () => {
    try {
      const res = await axios.get(`${backendUrl}/attendance-admin/filters`, {
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });

      const data = res?.data?.data || {};
      setAttendancePositions(Array.isArray(data?.positions) ? data.positions : []);
      setAttendanceStatuses(Array.isArray(data?.statuses) ? data.statuses : []);
    } catch (error) {
      console.log("error fetching attendance admin filters", error);
      setAttendancePositions([]);
      setAttendanceStatuses([]);
    }
  };

  const getMatrixData = async ({ page = 1, append = false } = {}) => {
    if (append) {
      setMatrixLoadingMore(true);
    } else {
      setMatrixLoading(true);
      setMatrixError("");
    }

    try {
      const res = await axios.post(
        `${backendUrl}/attendance-admin/matrix`,
        {
          month: Number(matrixMonth),
          year: Number(matrixYear),
          firmCodes: matrixFirmCode ? [matrixFirmCode] : [],
          positions: attendanceRequestPayload.positions || [],
          statuses: attendanceRequestPayload.statuses || [],
          search: attendanceRequestPayload.search || "",
          page,
          limit: matrixLimit,
        },
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );

      const data = res?.data?.data || {};
      const rows = Array.isArray(data?.rows) ? data.rows : [];
      const days = Array.isArray(data?.days) ? data.days : [];
      const pagination = data?.pagination || {};

      setMatrixRows((prev) => (append ? [...prev, ...rows] : rows));
      setMatrixDays(days);
      setMatrixPagination(pagination);
      setMatrixError("");
    } catch (error) {
      console.log("Error fetching attendance matrix:", error);
      if (!append) {
        setMatrixRows([]);
        setMatrixDays([]);
      }
      setMatrixError("Failed to load attendance matrix.");
    } finally {
      setMatrixLoading(false);
      setMatrixLoadingMore(false);
    }
  };

  const getRecentAttendanceByCode = async () => {
    try {
      const limitForRecent = 5000;

      const firstPageRes = await axios.get(
        `${backendUrl}/get-latest-attendance-by-date`,
        {
          params: {
            page: 1,
            limit: limitForRecent,
            search: "",
            ...(selectedFirmCodesForAttendance.length > 0
              ? { firmCodes: selectedFirmCodesForAttendance.join(",") }
              : {}),
          },
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );

      const totalPagesRaw =
        firstPageRes?.data?.totalPages || firstPageRes?.data?.data?.pagination?.pages;
      const totalPages = Math.max(Number(totalPagesRaw) || 1, 1);
      const pagesToFetch = [...new Set([totalPages, Math.max(totalPages - 1, 1)])];

      const responses = await Promise.all(
        pagesToFetch.map((pageNo) =>
          axios.get(`${backendUrl}/get-latest-attendance-by-date`, {
            params: {
              page: pageNo,
              limit: limitForRecent,
              search: "",
              ...(selectedFirmCodesForAttendance.length > 0
                ? { firmCodes: selectedFirmCodesForAttendance.join(",") }
                : {}),
            },
            headers: {
              Authorization: localStorage.getItem("authToken"),
            },
          })
        )
      );

      const rows = responses
        .flatMap((response) => extractAttendanceRows(response?.data?.data || response?.data))
        .filter((item) => item && typeof item === "object");

      const rowsWithPunchData = rows.filter(hasPunchData);

      const map = rowsWithPunchData.reduce((acc, row) => {
        const normalizedCode = normalizeCodeKey(
          row?.code || row?.employeeCode || row?.empCode || row?.userCode
        );
        if (!normalizedCode) return acc;

        const existing = acc[normalizedCode];
        const existingTs = getRecordTimestamp(existing);
        const nextTs = getRecordTimestamp(row);

        if (!existing || nextTs >= existingTs) {
          acc[normalizedCode] = row;
        }

        return acc;
      }, {});

      setRecentAttendanceByCode(map);
    } catch (error) {
      console.log("Error fetching recent attendance fallback:", error);
      setRecentAttendanceByCode({});
    }
  };

  useEffect(() => {
    getAllActorTypes();
  }, []);

  useEffect(() => {
    fetchAttendance();
    getAllEmployee();
  }, [
    currentPage,
    attendanceRequestPayload,
    appliedFilters.sliderValue,
    selectedFirmCodesForAttendance,
  ]);

  useEffect(() => {
    getMatrixData({ page: 1, append: false });
  }, [
    matrixMonth,
    matrixYear,
    matrixFirmCode,
    attendanceRequestPayload.search,
    attendanceRequestPayload.positions,
    attendanceRequestPayload.statuses,
  ]);

  useEffect(() => {
    getAttendanceFirmOptions();
    getAttendanceAdminFilters();
  }, []);

  useEffect(() => {
    const recentDate =
      appliedFilters.viewMode === "day"
        ? appliedFilters.selectedDate
        : dateToFetch || new Date().toISOString().split("T")[0];

    getLatestAttendance(recentDate || new Date());
    getRecentAttendanceByCode();

    const interval = setInterval(() => {
      getLatestAttendance(recentDate || new Date());
      getRecentAttendanceByCode();
    }, 60000);

    return () => clearInterval(interval);
  }, [
    dateToFetch,
    selectedFirmCodesForAttendance,
    appliedFilters.viewMode,
    appliedFilters.selectedDate,
  ]);

  const toInt = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const matrixPage = toInt(matrixPagination?.page, 1);
  const matrixPages = toInt(matrixPagination?.pages, 1);
  const matrixTotal = toInt(matrixPagination?.total, matrixRows.length);
  const hasMoreMatrix = matrixPage < matrixPages;

  const loadMoreMatrix = () => {
    if (!hasMoreMatrix || matrixLoadingMore) return;
    getMatrixData({ page: matrixPage + 1, append: true });
  };

  const monthOptions = Array.from({ length: 12 }, (_, index) => {
    const monthNumber = index + 1;
    return {
      value: monthNumber,
      label: new Date(0, index).toLocaleString("default", { month: "long" }),
    };
  });

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 3 }, (_, index) => currentYear - 1 + index);

  const normalizeMatrixCode = (cell) => {
    if (typeof cell === "string") {
      return cell.toUpperCase();
    }

    if (cell && typeof cell === "object") {
      return String(cell.code || cell.status || cell.value || "A").toUpperCase();
    }

    return "A";
  };

  const matrixStatusClass = (code) => {
    switch (code) {
      case "P":
        return "present";
      case "L":
        return "leave";
      case "HD":
        return "halfday";
      case "PN":
        return "pending";
      case "A":
      default:
        return "absent";
    }
  };

  const latestAttendanceFlat = useMemo(() => {
    const rows = extractAttendanceRows(latestAttendance);
    if (rows.length > 0) return rows;

    if (!Array.isArray(latestAttendance)) return [];
    return latestAttendance.flat(Infinity).filter((item) => item && typeof item === "object");
  }, [latestAttendance]);

  const latestAttendanceByCode = useMemo(() => {
    const map = {};

    latestAttendanceFlat.forEach((record) => {
      const key = normalizeCodeKey(
        record?.code || record?.employeeCode || record?.empCode || record?.userCode
      );
      if (!key) return;

      const currentRecord = map[key];
      const currentStamp = getRecordTimestamp(currentRecord);
      const nextStamp = getRecordTimestamp(record);

      if (!currentRecord || nextStamp >= currentStamp) {
        map[key] = record;
      }
    });

    return map;
  }, [latestAttendanceFlat]);

  const toCoordNumber = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "object" && value?.$numberDecimal !== undefined) {
      const decimal = Number(value.$numberDecimal);
      return Number.isFinite(decimal) ? decimal : null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const formatAttendanceTime = (value) => {
    if (!value) return "N/A";

    const dateValue = new Date(value);
    if (Number.isNaN(dateValue.getTime())) {
      if (typeof value === "string" && value.trim()) return value;
      return "N/A";
    }

    return dateValue.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const getAttendanceForCode = (code) => {
    const normalizedCode = normalizeCodeKey(code);
    const todayRecord = attendanceTodayByCode[normalizedCode] || null;
    const recentRecord = recentAttendanceByCode[normalizedCode] || null;
    const latestRecord = latestAttendanceByCode[normalizedCode] || null;

    if (hasPunchData(todayRecord)) return todayRecord;
    if (hasPunchData(recentRecord)) return recentRecord;
    if (hasPunchData(latestRecord)) return latestRecord;

    return todayRecord || recentRecord || latestRecord || {};
  };

  const getDisplayAttendance = (item) => {
    const todayRecord = item?.today || null;
    if (hasPunchData(todayRecord)) return todayRecord;
    return getAttendanceForCode(item?.code);
  };

  const getRowStatusClass = (attendanceRecord) => {
    const status = String(attendanceRecord?.status || "")
      .trim()
      .toLowerCase();

    if (status === "present") return "status-present";
    if (status === "absent") return "status-absent";
    if (status === "half day" || status === "halfday") return "status-halfday";
    if (status === "leave") return "status-leave";
    if (status === "pending") return "status-pending";
    return "";
  };

  const formatLocationText = (record, type) => {
    if (!record) return "N/A";

    const locationName =
      type === "in"
        ? record?.punchInName || record?.punchInCode
        : record?.punchOutName || record?.punchOutCode;

    if (locationName) return locationName;

    const lat =
      type === "in"
        ? toCoordNumber(record?.punchInLatitude)
        : toCoordNumber(record?.punchOutLatitude);
    const lng =
      type === "in"
        ? toCoordNumber(record?.punchInLongitude)
        : toCoordNumber(record?.punchOutLongitude);

    if (lat !== null && lng !== null) {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }

    return "N/A";
  };

  const presentCount = (counts?.present || 0) + (counts?.pending || 0);
  const absentCount = counts?.absent || 0;
  const leaveCount = counts?.leave || 0;
  const halfDayCount = counts?.halfDay || 0;

  const totalAttendance =
    presentCount + absentCount + leaveCount + halfDayCount;

  const safePercent = (value) =>
    totalAttendance > 0 ? ((value / totalAttendance) * 100).toFixed(1) : "0.0";

  const attendanceStats = [
    {
      key: "present",
      label: "Present",
      value: presentCount,
      percent: safePercent(presentCount),
      className: "present",
      helper: "On duty / punched in",
    },
    {
      key: "absent",
      label: "Absent",
      value: absentCount,
      percent: safePercent(absentCount),
      className: "absent",
      helper: "Not marked present",
    },
    {
      key: "leave",
      label: "Leave",
      value: leaveCount,
      percent: safePercent(leaveCount),
      className: "leave",
      helper: "Approved leave",
    },
    {
      key: "halfday",
      label: "Half Day",
      value: halfDayCount,
      percent: safePercent(halfDayCount),
      className: "halfday",
      helper: "Partial working day",
    },
  ];

  const highestStatValue = Math.max(...attendanceStats.map((item) => item.value), 1);

  const totalPages = Math.ceil(totalRecords / limit) || 1;

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  return (
    <div className="attendance-page">
      <div className="page-title-row">
        <div>
          <h2 className="page-title">Attendance Dashboard</h2>
          <p className="page-subtitle">
            Clean overview of attendance, activity and employee records
          </p>
        </div>
      </div>

      <div className="attendance-page-container">
        <div className="attendance-page-firstLine">
          <div className="attendance-page-chart">
            <div className="attendance-summary-header">
              <div>
                <div className="attendance-page-chart-header">
                  Attendance Overview
                </div>
                <div className="attendance-page-chart-date">
                  Showing data for {dateToFetch || "latest available day"}
                </div>
              </div>

              <div className="attendance-total-pill">
                Total Employees: {totalAttendance}
              </div>
            </div>

            {error ? (
              <div className="no-data-box">{error}</div>
            ) : (
              <>
                <div className="attendance-stat-grid">
                  {attendanceStats.map((item) => (
                    <div
                      key={item.key}
                      className={`attendance-stat-card ${item.className}`}
                    >
                      <div className="stat-card-top">
                        <span className={`stat-dot ${item.className}`}></span>
                        <span className="stat-label">{item.label}</span>
                      </div>

                      <div className="stat-value">{item.value}</div>
                      <div className="stat-subtext">{item.percent}% of total</div>
                      <div className="stat-helper">{item.helper}</div>
                    </div>
                  ))}
                </div>

                <div className="attendance-composition-card">
                  <div className="section-title">Attendance Composition</div>

                  <div className="attendance-stacked-bar">
                    {attendanceStats.map((item) => (
                      <div
                        key={item.key}
                        className={`stack-segment ${item.className}`}
                        style={{ width: `${item.percent}%` }}
                        title={`${item.label}: ${item.value}`}
                      />
                    ))}
                  </div>

                  <div className="attendance-legend">
                    {attendanceStats.map((item) => (
                      <div key={item.key} className="legend-item">
                        <span className={`legend-dot ${item.className}`}></span>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="attendance-bar-list">
                  <div className="section-title">Status Comparison</div>

                  {attendanceStats.map((item) => {
                    const relativeWidth =
                      highestStatValue > 0
                        ? (item.value / highestStatValue) * 100
                        : 0;

                    return (
                      <div key={item.key} className="bar-row">
                        <div className="bar-row-top">
                          <span>{item.label}</span>
                          <strong>
                            {item.value} <small>({item.percent}%)</small>
                          </strong>
                        </div>
                        <div className="bar-track">
                          <div
                            className={`bar-fill ${item.className}`}
                            style={{ width: `${relativeWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="attendance-recent-activities">
            <div className="recent-activities-header-row">
              <div>
                <div className="recent-activities-header">Recent Activities</div>
                <div className="recent-activities-subtitle">
                  Latest attendance movement
                </div>
              </div>

              <Link to="/attendance/allAttendance" className="show-more-link">
                Show more
              </Link>
            </div>

            <div className="recent-activities-first-line">
              <div className="recent-activity-date">
                {new Date().toLocaleDateString()}
              </div>
              <div className="recent-activity-count">
                {latestAttendance?.length || 0} records
              </div>
            </div>

            <div className="recent-activities-content">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {latestAttendance.length > 0 ? (
                    latestAttendance
                      .flat()
                      .slice(0, 6)
                      .map((record, index) => (
                        <tr key={record._id || index}>
                          <td>{record.name || "N/A"}</td>
                          <td>
                            {record.punchIn
                              ? new Date(record.punchIn).toLocaleTimeString()
                              : "N/A"}
                          </td>
                          <td>
                            <span
                              className={`status-badge ${String(
                                record.status || ""
                              )
                                .toLowerCase()
                                .replace(/\s+/g, "")}`}
                            >
                              {record.status || "Unknown"}
                            </span>
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan="3" style={{ textAlign: "center" }}>
                        No recent activities
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="attendance-table-container">
          <div className="attendance-matrix-container">
            <div className="attendance-matrix-topbar">
              <div className="matrix-title-wrap">
                <div className="matrix-title">Attendance Matrix</div>
                <div className="matrix-subtitle">
                  P = Present • A = Absent • L = Leave • HD = Half Day
                </div>
              </div>

              <div className="matrix-filters">
                <select
                  value={matrixFirmCode}
                  onChange={(e) => setMatrixFirmCode(e.target.value)}
                >
                  <option value="">All Firms</option>
                  {attendanceFirmOptions.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </select>

                <select
                  value={matrixMonth}
                  onChange={(e) => setMatrixMonth(Number(e.target.value))}
                >
                  {monthOptions.map((monthItem) => (
                    <option key={monthItem.value} value={monthItem.value}>
                      {monthItem.label}
                    </option>
                  ))}
                </select>

                <select
                  value={matrixYear}
                  onChange={(e) => setMatrixYear(Number(e.target.value))}
                >
                  {yearOptions.map((yearItem) => (
                    <option key={yearItem} value={yearItem}>
                      {yearItem}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {matrixLoading ? (
              <div className="matrix-loading">Loading attendance matrix...</div>
            ) : matrixError ? (
              <div className="matrix-error">{matrixError}</div>
            ) : matrixRows.length === 0 || matrixDays.length === 0 ? (
              <div className="matrix-empty">
                No month-wise attendance matrix available for the selected filters.
              </div>
            ) : (
              <>
                <div className="matrix-table-scroll">
                  <table className="matrix-table">
                    <thead>
                      <tr>
                        <th>S.No</th>
                        <th>Name</th>
                        <th>Code</th>
                        <th>Position</th>
                        <th>Firm</th>
                        {matrixDays.map((day, index) => (
                          <th key={`${day?.day || index}-${index}`}>
                            <div className="matrix-day-number">{day?.day ?? "-"}</div>
                            <div className="matrix-day-label">
                              {day?.weekdayShort || ""}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {matrixRows.map((row, rowIndex) => {
                        const rowMatrix = Array.isArray(row?.matrix) ? row.matrix : [];
                        return (
                          <tr key={row?._id || row?.code || rowIndex}>
                            <td>{rowIndex + 1}</td>
                            <td>{row?.name || "N/A"}</td>
                            <td>{row?.code || "N/A"}</td>
                            <td>{row?.position || "N/A"}</td>
                            <td>{row?.firm_name || row?.firm || "N/A"}</td>
                            {matrixDays.map((_, cellIndex) => {
                              const code = normalizeMatrixCode(rowMatrix[cellIndex]);
                              return (
                                <td
                                  key={`${row?.code || rowIndex}-${cellIndex}`}
                                  className={`matrix-status ${matrixStatusClass(code)}`}
                                  title={code}
                                >
                                  {code}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="matrix-footer">
                  <span>
                    {matrixRows.length} of {matrixTotal} rows • Page {matrixPage} of{" "}
                    {matrixPages}
                  </span>
                  <button
                    className="matrix-load-more-btn"
                    onClick={loadMoreMatrix}
                    disabled={!hasMoreMatrix || matrixLoadingMore}
                  >
                    {matrixLoadingMore
                      ? "Loading..."
                      : hasMoreMatrix
                      ? "Load More"
                      : "All Loaded"}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="attendance-table-topbar">
            <div className="table-title-wrap">
              <div className="table-main-title">Employee Directory</div>
              <div className="table-subtitle">
                Browse employee attendance details
              </div>
            </div>

            <div className="slider-container">
              <div
                className={`slider-button ${sliderValue === "All" ? "active" : ""}`}
                onClick={() => {
                  setSliderValue("All");
                }}
              >
                All
              </div>
              <div
                className={`slider-button ${
                  sliderValue === "employee" ? "active" : ""
                }`}
                onClick={() => {
                  setSliderValue("employee");
                }}
              >
                Employee
              </div>
              <div
                className={`slider-button ${
                  sliderValue === "admin" ? "active" : ""
                }`}
                onClick={() => {
                  setSliderValue("admin");
                }}
              >
                Admin
              </div>
            </div>
          </div>

          <div className="attendance-table-filter">
            <div className="search-filter">
              <input
                name="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                }}
                placeholder="Search employee..."
              />
            </div>

            <div className="advanced-filter-row">
              <div className="firm-filter">
                <label>View:</label>
                <select
                  value={viewMode}
                  onChange={(e) => {
                    setViewMode(e.target.value);
                  }}
                >
                  <option value="day">Day</option>
                  <option value="month">Month</option>
                </select>
              </div>

              {viewMode === "day" ? (
                <div className="firm-filter">
                  <label>Date:</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                    }}
                  />
                </div>
              ) : (
                <>
                  <div className="firm-filter">
                    <label>Month:</label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => {
                        setSelectedMonth(Number(e.target.value));
                      }}
                    >
                      {monthOptions.map((monthItem) => (
                        <option key={monthItem.value} value={monthItem.value}>
                          {monthItem.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="firm-filter">
                    <label>Year:</label>
                    <select
                      value={selectedYear}
                      onChange={(e) => {
                        setSelectedYear(Number(e.target.value));
                      }}
                    >
                      {yearOptions.map((yearItem) => (
                        <option key={yearItem} value={yearItem}>
                          {yearItem}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="firm-filter">
                <label>Firm:</label>
                <select
                  value={firm || ""}
                  onChange={(e) => {
                    setFirm(e.target.value);
                  }}
                >
                  <option value="">All Firms</option>
                  {attendanceFirmOptions.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="firm-filter">
                <label>Position:</label>
                <select
                  value={selectedPosition}
                  onChange={(e) => {
                    setSelectedPosition(e.target.value);
                  }}
                >
                  <option value="">All Positions</option>
                  {attendancePositions.map((position) => (
                    <option key={position} value={position}>
                      {position}
                    </option>
                  ))}
                </select>
              </div>

              <div className="firm-filter">
                <label>Status:</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                  }}
                >
                  <option value="">All Statuses</option>
                  {attendanceStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="download-daily-btn"
                onClick={handleDailyAttendanceDownload}
                disabled={isDailyDownloading}
              >
                {isDailyDownloading ? "Preparing Today Excel..." : "Download Today Excel"}
              </button>

              <button
                type="button"
                className="download-filters-btn"
                onClick={handleMonthlyAttendanceDownload}
                disabled={isMonthlyDownloading}
              >
                {isMonthlyDownloading ? "Preparing Excel..." : "Download Month Excel"}
              </button>

              <button
                type="button"
                className="apply-filters-btn"
                onClick={handleApplyFilters}
                disabled={!hasPendingFilterChanges}
              >
                Apply Filters
              </button>
            </div>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>SNo.</th>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Position</th>
                  <th>Punch In</th>
                  <th>Punch In Location</th>
                  <th>Punch Out</th>
                  <th>Punch Out Location</th>
                  <th>View</th>
                </tr>
              </thead>
              <tbody>
                {employee.length > 0 ? (
                  employee.map((item, index) => {
                    const attendanceRecord = getDisplayAttendance(item);
                    const rowStatusClass = getRowStatusClass(attendanceRecord);

                    return (
                      <tr
                        key={item._id || item.code || index}
                        className={`employee-row ${rowStatusClass}`}
                      >
                        <td>{(currentPage - 1) * limit + index + 1}</td>
                        <td>{item.code}</td>
                        <td>{item.name}</td>
                        <td>
                          <span className="position-pill">{item.position}</span>
                        </td>
                        <td>{formatAttendanceTime(attendanceRecord?.punchIn)}</td>
                        <td className="location-cell">
                          {formatLocationText(attendanceRecord, "in")}
                        </td>
                        <td>{formatAttendanceTime(attendanceRecord?.punchOut)}</td>
                        <td className="location-cell">
                          {formatLocationText(attendanceRecord, "out")}
                        </td>
                        <td className="view-button">
                          <button
                            onClick={() => navigate(`/attendance/${item.code}`)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="9" style={{ textAlign: "center" }}>
                      No data found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="pagination">
        <button
          onClick={prevPage}
          className="page-btn"
          disabled={currentPage === 1}
        >
          &lt;
        </button>

        <span>
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={nextPage}
          className="page-btn"
          disabled={currentPage === totalPages}
        >
          &gt;
        </button>
      </div>
    </div>
  );
};

export default Attendance;
