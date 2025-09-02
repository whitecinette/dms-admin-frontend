import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import config from "../../../config";
import "./style.scss";

const backendUrl = config.backend_url;

const AttendanceMatrix = ({ selectedFirm, selectedMonthYear, handleMonthYearChange, selectedPosition }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingMode, setEditingMode] = useState(false); // global edit mode
  const [editedValues, setEditedValues] = useState({}); // track edits { code: { allowed_leaves, leaves_balance, leaves_adjustment } }

  const now = new Date();
  const defaultMonth = now.getMonth() + 1;
  const defaultYear = now.getFullYear();

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
      const [matrixRes, leavesRes] = await Promise.all([
        axios.get(`${backendUrl}/admin/attendance-matrix`, {
          params: {
            month: monthStr,
            year: yearStr,
            firm_code: Array.isArray(selectedFirm) && selectedFirm.length === 1 ? selectedFirm[0] : undefined,
            position: selectedPosition,
          },
        }),
        axios.get(`${backendUrl}/leaves-info`, {
          params: { month: monthStr, year: yearStr },
        }),
      ]);

      const leavesMap = new Map(leavesRes.data.data.map((l) => [l.code, l]));
      const merged = matrixRes.data.data.map((u) => ({
        ...u,
        allowed_leaves: Number(leavesMap.get(u.code)?.allowed_leaves || 0),
        leaves_balance: Number(leavesMap.get(u.code)?.leaves_balance || 0),
        leaves_adjustment: Number(leavesMap.get(u.code)?.leaves_adjustment || 0),
      }));

      setData(merged);
      setEditedValues({}); // reset edits
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

  // Handle edit cell
  const handleChange = (code, field, value) => {
    setEditedValues((prev) => ({
      ...prev,
      [code]: {
        ...prev[code],
        [field]: value,
      },
    }));
  };

  // Save all edits
  const saveAll = async () => {
    try {
      const updates = Object.entries(editedValues).map(([code, vals]) => ({
          code,
          month: Number(monthStr),
          year: Number(yearStr),
          ...Object.fromEntries(
            Object.entries(vals).map(([k, v]) => [k, Number(v) || 0]) // convert strings → numbers
          ),
        }));


      await axios.put(`${backendUrl}/leaves/bulk-update`, { updates });

      setEditingMode(false);
      getMatrixData();
    } catch (err) {
      console.error("Error saving updates:", err);
    }
  };

  const cancelEdit = () => {
    setEditedValues({});
    setEditingMode(false);
  };

  const getStatusCounts = (daysObj) => {
    let counts = { P: 0, L: 0, A: 0 };
    Object.values(daysObj).forEach((v) => {
      if (counts[v] !== undefined) counts[v]++;
    });
    return counts;
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
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {editingMode ? (
            <>
              <button className="save-btn" onClick={saveAll}>💾 Save</button>
              <button className="cancel-btn" onClick={cancelEdit}>✖ Cancel</button>
            </>
          ) : (
            <button className="edit-btn" onClick={() => setEditingMode(true)}>✏ Edit</button>
          )}
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
                <th>Allowed Leaves</th>
                <th>Leaves Balance</th>
                <th>Leave Adjustment</th>
                <th>Effective Leaves</th>
                {[...Array(daysInMonth)].map((_, i) => (
                  <th key={i}>{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((user, idx) => {
                const counts = getStatusCounts(user.days);
                const liveVals = editedValues[user.code] || {};

                const allowed = editingMode ? (liveVals.allowed_leaves ?? user.allowed_leaves) : user.allowed_leaves;
                const balance = editingMode ? (liveVals.leaves_balance ?? user.leaves_balance) : user.leaves_balance;
                const adjustment = editingMode ? (liveVals.leaves_adjustment ?? user.leaves_adjustment) : user.leaves_adjustment;

                const effectiveLeaves = (counts.L + counts.A) + Number(adjustment);

                return (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{user.name}</td>
                    <td>{user.code}</td>
                    <td>{user.firm}</td>
                    <td>{user.position || "N/A"}</td>
                    <td className="stats-cell">
                      <div className="badge-row">
                        <span className="badge badge-p">P: {counts.P}</span>
                        <span className="badge badge-tl">TL: {counts.L + counts.A}</span>
                      </div>
                      <div className="badge-row">
                        <span className="badge badge-l">L: {counts.L}</span>
                        <span className="badge badge-a">A: {counts.A}</span>
                      </div>
                    </td>

                    {/* Editable columns */}
                    <td>
                      {editingMode ? (
                        <input
                          type="number"
                          value={allowed}
                          min={-9999} 
                          onChange={(e) => handleChange(user.code, "allowed_leaves", e.target.value)}
                        />
                      ) : (
                        allowed
                      )}
                    </td>
                    <td>
                      {editingMode ? (
                        <input
                          type="number"
                          value={balance}
                          min={-9999} 
                          onChange={(e) => handleChange(user.code, "leaves_balance", e.target.value)}
                        />
                      ) : (
                        balance
                      )}
                    </td>
                    <td>
                      {editingMode ? (
                        <input
                          type="number"
                          value={adjustment}
                          min={-9999} 
                          onChange={(e) => handleChange(user.code, "leaves_adjustment", e.target.value)}
                        />
                      ) : (
                        adjustment
                      )}
                    </td>

                    <td>
                      <span className="badge badge-effective">{effectiveLeaves}</span>
                    </td>

                    {[...Array(daysInMonth)].map((_, i) => (
                      <td key={i} className={user.days[i + 1] || ""}>
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
