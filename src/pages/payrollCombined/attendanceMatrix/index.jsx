import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import config from "../../../config";
import "./style.scss";

const backendUrl = config.backend_url;

const AttendanceMatrix = ({ selectedFirm, selectedMonthYear, handleMonthYearChange, selectedPosition, }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const defaultMonth = now.getMonth() + 1;
  const defaultYear = now.getFullYear();

  const effectiveMonthYear = selectedMonthYear || `${defaultMonth}-${defaultYear}`;

  const [monthStr, setMonthStr] = useState(defaultMonth.toString());
  const [yearStr, setYearStr] = useState(defaultYear.toString());

  // Sync when props change
  useEffect(() => {
    const [month, year] = (selectedMonthYear || `${defaultMonth}-${defaultYear}`).split("-");
    setMonthStr(month);
    setYearStr(year);
  }, [selectedMonthYear]);


  const daysInMonth = new Date(Number(yearStr), Number(monthStr), 0).getDate();

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(0, i).toLocaleString("default", { month: "long" }),
  }));
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - 1 + i);

  const getMatrixData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/admin/attendance-matrix`, {
        params: {
          month: monthStr,
          year: yearStr,
          firm_code:
            Array.isArray(selectedFirm) && selectedFirm.length === 1
              ? selectedFirm[0]
              : undefined,
          position: selectedPosition,
        },
      });
      setData(response.data.data);
    } catch (error) {
      console.error("Error fetching matrix:", error);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (monthStr && yearStr) {
      getMatrixData();
    }
  }, [selectedFirm, selectedMonthYear, monthStr, yearStr]);

  const getStatusCounts = (daysObj) => {
    let counts = { P: 0, L: 0, A: 0 };
    Object.values(daysObj).forEach((v) => {
      if (counts[v] !== undefined) counts[v]++;
    });
    return counts;
  };

  const downloadExcel = () => {
    const headers = ["S.No", "Name", "Code", "Firm", "Position", "P", "L", "A", ...Array.from({ length: daysInMonth }, (_, i) => `Day ${i + 1}`)];
    const rows = data.map((user, index) => {
      const counts = getStatusCounts(user.days);
      const dayValues = Array.from({ length: daysInMonth }, (_, i) => user.days[i + 1] || "-");
      return [
        index + 1,
        user.name,
        user.code,
        user.firm,
        user.position,
        counts.P,
        counts.L,
        counts.A,
        ...dayValues
      ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Matrix");

    XLSX.writeFile(workbook, `Attendance_Matrix_${monthStr}_${yearStr}.xlsx`);
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "P": return { backgroundColor: "#d4edda", color: "#155724" };
      case "A": return { backgroundColor: "#f8d7da", color: "#721c24" };
      case "L": return { backgroundColor: "#fff3cd", color: "#856404" };
      default: return {};
    }
  };

  return (
    <div className="attendance-matrix-wrapper">
      <div className="matrix-top-bar">
        <div className="left">
          <h3>Attendance Matrix</h3>
        </div>
        <div className="right">
        <select
          value={monthStr}
          onChange={(e) => {
            const newMonth = e.target.value;
            setMonthStr(newMonth);
            handleMonthYearChange?.(`${newMonth}-${yearStr}`);
          }}
        >
          {monthOptions.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        <select
          value={yearStr}
          onChange={(e) => {
            const newYear = e.target.value;
            setYearStr(newYear);
            handleMonthYearChange?.(`${monthStr}-${newYear}`);
          }}
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

          <button className="download-btn" onClick={downloadExcel}>⬇ Download Excel</button>
        </div>
      </div>

      {loading ? (
        <p className="loading-msg">Loading...</p>
      ) : (
        <div className="attendance-matrix-table-container">
          <table className="attendance-matrix-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Name</th>
                <th>Code</th>
                <th>Firm</th>
                 <th>Position</th>
                <th>Stats</th>
                {[...Array(daysInMonth)].map((_, i) => (
                  <th key={i}>{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((user, idx) => {
                const counts = getStatusCounts(user.days);
                return (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{user.name}</td>
                    <td>{user.code}</td>
                    <td>{user.firm}</td>
                    <td>{user.position || "N/A"}</td> {/* NEW */}
                    <td className="stats-cell">
                      {/* First row: P + TL */}
                      <div className="badge-row">
                        <span className="badge badge-p">P: {counts.P}</span>
                        <span className="badge badge-tl">TL: {counts.L + counts.A}</span>
                      </div>

                      {/* Second row: L + A */}
                      <div className="badge-row">
                        <span className="badge badge-l">L: {counts.L}</span>
                        <span className="badge badge-a">A: {counts.A}</span>
                      </div>
                    </td>



                    {[...Array(daysInMonth)].map((_, i) => (
                      <td key={i} style={getStatusStyle(user.days[i + 1])}>
                        {user.days[i + 1] || "-"}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AttendanceMatrix;
