import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import config from "../../../config";

const backendUrl = config.backend_url;

const DEFAULT_FORM = {
  punchOutConsidered: false,
  halfDayThresholdHours: 4,
  fullDayThresholdHours: 8,
  gracePeriodMinutes: 10,
  overtimeEnabled: false,
  overtimeRateMultiplier: 1.5,
  leaveApprovalRequired: true,
  maxCasualLeaves: 1,
  maxSickLeaves: 0,
  maxAnnualLeaves: 0,
  defaultAllowedLeaves: 1,
  payrollCycle: "monthly",
  salaryCutoffDay: 25,
};

function PayrollConfigTab() {
  const [firms, setFirms] = useState([]);
  const [selectedFirmCode, setSelectedFirmCode] = useState("");
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [policyRows, setPolicyRows] = useState([]);
  const [policyForm, setPolicyForm] = useState({ state: "", pf: "", esi: "" });

  const headers = useMemo(
    () => ({ Authorization: localStorage.getItem("authToken") }),
    []
  );

  const fetchFirms = async () => {
    try {
      const res = await axios.get(`${backendUrl}/get-firms-for-dropdown`, { headers });
      const list = res.data?.data || [];
      setFirms(list);
      if (list.length > 0 && !selectedFirmCode) {
        setSelectedFirmCode(list[0].code);
      }
    } catch (error) {
      console.error("Error fetching firms:", error);
      setFirms([]);
    }
  };

  const fetchFirmConfig = async (firmCode) => {
    if (!firmCode) return;
    try {
      setLoading(true);
      setMessage("");
      const res = await axios.get(`${backendUrl}/firm-metadata/${firmCode}`, {
        headers,
      });
      const data = res.data?.data || {};
      setForm({ ...DEFAULT_FORM, ...data });
    } catch (error) {
      console.error("Error fetching firm config:", error);
      setForm(DEFAULT_FORM);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayrollPolicies = async () => {
    try {
      const res = await axios.get(`${backendUrl}/get-all-payroll-policy`, {
        headers,
      });
      setPolicyRows(res.data?.data || []);
    } catch (error) {
      console.error("Error fetching payroll policy:", error);
      setPolicyRows([]);
    }
  };

  useEffect(() => {
    fetchFirms();
    fetchPayrollPolicies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchFirmConfig(selectedFirmCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFirmCode]);

  const handleInput = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveConfig = async () => {
    if (!selectedFirmCode) return;
    try {
      setSaving(true);
      setMessage("");

      const payload = {
        firmCode: selectedFirmCode,
        punchOutConsidered: !!form.punchOutConsidered,
        halfDayThresholdHours: Number(form.halfDayThresholdHours || 0),
        fullDayThresholdHours: Number(form.fullDayThresholdHours || 0),
        gracePeriodMinutes: Number(form.gracePeriodMinutes || 0),
        overtimeEnabled: !!form.overtimeEnabled,
        overtimeRateMultiplier: Number(form.overtimeRateMultiplier || 0),
        leaveApprovalRequired: !!form.leaveApprovalRequired,
        maxCasualLeaves: Number(form.maxCasualLeaves || 0),
        maxSickLeaves: Number(form.maxSickLeaves || 0),
        maxAnnualLeaves: Number(form.maxAnnualLeaves || 0),
        defaultAllowedLeaves: Number(form.defaultAllowedLeaves || 1),
        payrollCycle: form.payrollCycle,
        salaryCutoffDay: Number(form.salaryCutoffDay || 25),
      };

      await axios.put(`${backendUrl}/upsert-firm-metadata`, payload, {
        headers,
      });

      setMessage("Firm payroll config saved successfully.");
    } catch (error) {
      console.error("Error saving config:", error);
      setMessage("Failed to save config.");
    } finally {
      setSaving(false);
    }
  };

  const savePolicy = async () => {
    if (!policyForm.state) {
      window.alert("State is required");
      return;
    }
    try {
      await axios.post(
        `${backendUrl}/add-payroll-policy`,
        {
          state: policyForm.state,
          pf: Number(policyForm.pf || 0),
          esi: Number(policyForm.esi || 0),
        },
        { headers }
      );
      setPolicyForm({ state: "", pf: "", esi: "" });
      fetchPayrollPolicies();
    } catch (error) {
      console.error("Error saving policy:", error);
      window.alert("Failed to save payroll policy");
    }
  };

  return (
    <div className="hr-tab-section">
      <div className="hr-filter-grid">
        <div className="hr-field">
          <label>Select Firm</label>
          <select
            value={selectedFirmCode}
            onChange={(e) => setSelectedFirmCode(e.target.value)}
          >
            {firms.map((firm) => (
              <option key={firm.code} value={firm.code}>
                {firm.name} ({firm.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? <p>Loading config...</p> : null}

      <div className="hr-config-grid">
        <div className="hr-config-card">
          <h3>Attendance Rules</h3>
          <label>
            <input
              type="checkbox"
              checked={!!form.punchOutConsidered}
              onChange={(e) => handleInput("punchOutConsidered", e.target.checked)}
            />
            Consider Punch-out for attendance mark
          </label>

          <div className="hr-inline-fields">
            <div>
              <span>Half-day threshold (hours)</span>
              <input
                type="number"
                value={form.halfDayThresholdHours}
                onChange={(e) => handleInput("halfDayThresholdHours", e.target.value)}
              />
            </div>
            <div>
              <span>Full-day threshold (hours)</span>
              <input
                type="number"
                value={form.fullDayThresholdHours}
                onChange={(e) => handleInput("fullDayThresholdHours", e.target.value)}
              />
            </div>
            <div>
              <span>Grace Period (minutes)</span>
              <input
                type="number"
                value={form.gracePeriodMinutes}
                onChange={(e) => handleInput("gracePeriodMinutes", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="hr-config-card">
          <h3>Leave Rules</h3>
          <label>
            <input
              type="checkbox"
              checked={!!form.leaveApprovalRequired}
              onChange={(e) => handleInput("leaveApprovalRequired", e.target.checked)}
            />
            Leave approval required
          </label>

          <div className="hr-inline-fields">
            <div>
              <span>Casual Leaves</span>
              <input
                type="number"
                value={form.maxCasualLeaves}
                onChange={(e) => handleInput("maxCasualLeaves", e.target.value)}
              />
            </div>
            <div>
              <span>Sick Leaves</span>
              <input
                type="number"
                value={form.maxSickLeaves}
                onChange={(e) => handleInput("maxSickLeaves", e.target.value)}
              />
            </div>
            <div>
              <span>Annual Leaves</span>
              <input
                type="number"
                value={form.maxAnnualLeaves}
                onChange={(e) => handleInput("maxAnnualLeaves", e.target.value)}
              />
            </div>
            <div>
              <span>Default Allowed Leaves</span>
              <input
                type="number"
                value={form.defaultAllowedLeaves}
                onChange={(e) => handleInput("defaultAllowedLeaves", e.target.value)}
              />
            </div>
          </div>
          <p className="hr-help-text">
            If a user metadata record has no `allowed_leaves`, system fallback should be this value (default 1).
          </p>
        </div>

        <div className="hr-config-card">
          <h3>Payroll Cycle</h3>
          <div className="hr-inline-fields">
            <div>
              <span>Cycle</span>
              <select
                value={form.payrollCycle}
                onChange={(e) => handleInput("payrollCycle", e.target.value)}
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div>
              <span>Salary Cutoff Day</span>
              <input
                type="number"
                min="1"
                max="31"
                value={form.salaryCutoffDay}
                onChange={(e) => handleInput("salaryCutoffDay", e.target.value)}
              />
            </div>
          </div>

          <div className="hr-inline-fields">
            <div>
              <span>Overtime Enabled</span>
              <select
                value={String(!!form.overtimeEnabled)}
                onChange={(e) => handleInput("overtimeEnabled", e.target.value === "true")}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
            <div>
              <span>Overtime Multiplier</span>
              <input
                type="number"
                step="0.1"
                value={form.overtimeRateMultiplier}
                onChange={(e) => handleInput("overtimeRateMultiplier", e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="hr-config-actions">
        <button onClick={saveConfig} disabled={saving}>
          {saving ? "Saving..." : "Save Firm Config"}
        </button>
        {message ? <span>{message}</span> : null}
      </div>

      <div className="hr-policy-block">
        <h3>Payroll Policy (PF / ESI)</h3>
        <div className="hr-inline-fields">
          <div>
            <span>State</span>
            <input
              value={policyForm.state}
              onChange={(e) =>
                setPolicyForm((prev) => ({ ...prev, state: e.target.value }))
              }
            />
          </div>
          <div>
            <span>PF %</span>
            <input
              type="number"
              value={policyForm.pf}
              onChange={(e) =>
                setPolicyForm((prev) => ({ ...prev, pf: e.target.value }))
              }
            />
          </div>
          <div>
            <span>ESI %</span>
            <input
              type="number"
              value={policyForm.esi}
              onChange={(e) =>
                setPolicyForm((prev) => ({ ...prev, esi: e.target.value }))
              }
            />
          </div>
          <div>
            <span>&nbsp;</span>
            <button onClick={savePolicy}>Save Policy</button>
          </div>
        </div>

        <div className="hr-table-wrap">
          <table className="hr-table">
            <thead>
              <tr>
                <th>State</th>
                <th>PF %</th>
                <th>ESI %</th>
              </tr>
            </thead>
            <tbody>
              {policyRows.length === 0 ? (
                <tr>
                  <td colSpan="3">No policy found</td>
                </tr>
              ) : (
                policyRows.map((row) => (
                  <tr key={row._id || row.state}>
                    <td>{row.state}</td>
                    <td>{row.pf}</td>
                    <td>{row.esi}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default PayrollConfigTab;
