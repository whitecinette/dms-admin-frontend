import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import config from "../../../config";

const backendUrl = config.backend_url;

const monthLabel = (month, year) => {
  const d = new Date(Number(year), Number(month) - 1, 1);
  return `${d.toLocaleString("default", { month: "short" })} ${year}`;
};

const monthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 18; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      value: `${d.getMonth() + 1}-${d.getFullYear()}`,
      label: monthLabel(d.getMonth() + 1, d.getFullYear()),
    });
  }
  return options;
};

const downloadHtml = (filename, html) => {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const buildSlipHtml = (row) => {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Payslip ${row.code}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 32px; color: #0f172a; }
    .wrap { border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
    .h { display: flex; justify-content: space-between; margin-bottom: 16px; }
    .title { font-size: 24px; font-weight: 700; color: #0f766e; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    td, th { padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: left; }
    .amt { text-align: right; }
    .footer { margin-top: 16px; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="h">
      <div>
        <div class="title">Salary Slip</div>
        <div>${monthLabel(row.month, row.year)}</div>
      </div>
      <div>
        <div><strong>Firm:</strong> ${row.firmName || "N/A"}</div>
        <div><strong>Status:</strong> ${row.status || "N/A"}</div>
      </div>
    </div>

    <table>
      <tr><th>Employee Name</th><td>${row.employeeName || "N/A"}</td></tr>
      <tr><th>Code</th><td>${row.code || "N/A"}</td></tr>
      <tr><th>Position</th><td>${row.position || "N/A"}</td></tr>
      <tr><th>Working Days</th><td>${row.working_days || 0}</td></tr>
      <tr><th>Present Days</th><td>${row.days_present || 0}</td></tr>
    </table>

    <table>
      <tr><th>Earnings</th><th class="amt">Amount</th></tr>
      <tr><td>Gross Salary</td><td class="amt">${Number(row.gross_salary || 0).toLocaleString("en-IN")}</td></tr>
      <tr><td>Deductions & Adjustments</td><td class="amt">${Number((row.gross_salary || 0) - (row.net_salary || 0)).toLocaleString("en-IN")}</td></tr>
      <tr><th>Net Salary</th><th class="amt">${Number(row.net_salary || 0).toLocaleString("en-IN")}</th></tr>
    </table>

    <div class="footer">System generated slip. Generated at ${new Date().toLocaleString()}.</div>
  </div>
</body>
</html>`;
};

function PayslipsTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [firms, setFirms] = useState([]);
  const [selectedFirmCodes, setSelectedFirmCodes] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedMonthYear, setSelectedMonthYear] = useState(() => {
    const now = new Date();
    return `${now.getMonth() + 1}-${now.getFullYear()}`;
  });
  const [activeSlip, setActiveSlip] = useState(null);
  const [downloading3, setDownloading3] = useState({});

  const authHeaders = useMemo(
    () => ({ Authorization: localStorage.getItem("authToken") }),
    []
  );

  const fetchFirms = async () => {
    try {
      const res = await axios.get(`${backendUrl}/get-firms-for-dropdown`, {
        headers: authHeaders,
      });
      setFirms(res.data?.data || []);
    } catch (error) {
      console.error("Error fetching firms:", error);
      setFirms([]);
    }
  };

  const fetchRows = async () => {
    try {
      setLoading(true);
      const [month, year] = selectedMonthYear.split("-");
      const res = await axios.get(`${backendUrl}/get-all-payrolls`, {
        headers: authHeaders,
        params: {
          month,
          year,
          search,
          firmCodes: selectedFirmCodes.join(","),
          page: 1,
          limit: 300,
        },
      });
      setRows(res.data?.data || []);
    } catch (error) {
      console.error("Error fetching payslips:", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFirms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedFirmCodes, selectedMonthYear]);

  const handleFirmToggle = (code) => {
    setSelectedFirmCodes((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]
    );
  };

  const downloadOne = (row) => {
    const html = buildSlipHtml(row);
    downloadHtml(`Payslip_${row.code}_${row.month}_${row.year}.html`, html);
  };

  const previousMonths = () => {
    const [month, year] = selectedMonthYear.split("-").map(Number);
    const months = [];
    for (let i = 0; i < 3; i += 1) {
      const d = new Date(year, month - 1 - i, 1);
      months.push({ month: d.getMonth() + 1, year: d.getFullYear() });
    }
    return months;
  };

  const downloadLast3 = async (row) => {
    try {
      setDownloading3((prev) => ({ ...prev, [row._id]: true }));
      const months = previousMonths();

      for (const item of months) {
        const res = await axios.get(`${backendUrl}/get-all-payrolls`, {
          headers: authHeaders,
          params: {
            month: item.month,
            year: item.year,
            search: row.code,
            firmCodes: row.firmCode,
            page: 1,
            limit: 20,
          },
        });

        const match = (res.data?.data || []).find((x) => x.code === row.code);
        if (match) {
          downloadOne(match);
        }
      }
    } catch (error) {
      console.error("Error downloading last 3 payslips:", error);
    } finally {
      setDownloading3((prev) => ({ ...prev, [row._id]: false }));
    }
  };

  return (
    <div className="hr-tab-section">
      <div className="hr-filter-grid">
        <div className="hr-field">
          <label>Search</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name / code / position"
          />
        </div>

        <div className="hr-field">
          <label>Month</label>
          <select
            value={selectedMonthYear}
            onChange={(e) => setSelectedMonthYear(e.target.value)}
          >
            {monthOptions().map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="hr-field">
          <label>Firms</label>
          <details className="hr-multiselect">
            <summary>
              {selectedFirmCodes.length
                ? `${selectedFirmCodes.length} selected`
                : "Select firms"}
            </summary>
            <div className="hr-multiselect-list">
              {firms.map((f) => (
                <label key={f.code}>
                  <input
                    type="checkbox"
                    checked={selectedFirmCodes.includes(f.code)}
                    onChange={() => handleFirmToggle(f.code)}
                  />
                  {f.name} ({f.code})
                </label>
              ))}
            </div>
          </details>
        </div>
      </div>

      <div className="hr-table-wrap">
        <table className="hr-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>Position</th>
              <th>Firm</th>
              <th>Month</th>
              <th>Net Salary</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7">Loading payslips...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan="7">No payslip records found</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row._id}>
                  <td>{row.employeeName || "N/A"}</td>
                  <td>{row.code || "N/A"}</td>
                  <td>{row.position || "N/A"}</td>
                  <td>
                    {row.firmName || "N/A"} ({row.firmCode || "N/A"})
                  </td>
                  <td>{monthLabel(row.month, row.year)}</td>
                  <td>₹{Number(row.net_salary || 0).toLocaleString("en-IN")}</td>
                  <td className="hr-actions-cell">
                    <button onClick={() => setActiveSlip(row)}>View</button>
                    <button onClick={() => downloadOne(row)}>Download</button>
                    <button
                      onClick={() => downloadLast3(row)}
                      disabled={!!downloading3[row._id]}
                    >
                      {downloading3[row._id] ? "Please wait..." : "Last 3 Months"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {activeSlip ? (
        <div className="hr-modal-backdrop" onClick={() => setActiveSlip(null)}>
          <div className="hr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hr-modal-head">
              <h3>Salary Slip</h3>
              <button onClick={() => setActiveSlip(null)}>Close</button>
            </div>
            <div className="hr-slip-grid">
              <p>
                <strong>Employee:</strong> {activeSlip.employeeName}
              </p>
              <p>
                <strong>Code:</strong> {activeSlip.code}
              </p>
              <p>
                <strong>Position:</strong> {activeSlip.position || "N/A"}
              </p>
              <p>
                <strong>Firm:</strong> {activeSlip.firmName || "N/A"}
              </p>
              <p>
                <strong>Month:</strong> {monthLabel(activeSlip.month, activeSlip.year)}
              </p>
              <p>
                <strong>Status:</strong> {activeSlip.status || "N/A"}
              </p>
              <p>
                <strong>Gross:</strong> ₹{Number(activeSlip.gross_salary || 0).toLocaleString("en-IN")}
              </p>
              <p>
                <strong>Net:</strong> ₹{Number(activeSlip.net_salary || 0).toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default PayslipsTab;
