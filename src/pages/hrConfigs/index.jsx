import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FaSave, FaSyncAlt } from "react-icons/fa";
import config from "../../config";
import "./style.scss";

const backendUrl = config.backend_url;

const DEFAULT_CONFIG = {
  timezone: "Asia/Kolkata",
  halfDayAfter: {
    enabled: false,
    afterTime: "",
  },
  absentAfter: {
    enabled: false,
    afterTime: "",
  },
};

const timeToMinutes = (value) => {
  if (!/^\d{2}:\d{2}$/.test(value || "")) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

function HrConfigsPage() {
  const [form, setForm] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const headers = useMemo(
    () => ({ Authorization: localStorage.getItem("authToken") }),
    []
  );

  const normalizeFromApi = (data = {}) => ({
    timezone: data.timezone || "Asia/Kolkata",
    halfDayAfter: {
      enabled: data.halfDayAfter?.enabled === true,
      afterTime: data.halfDayAfter?.afterTime || "",
    },
    absentAfter: {
      enabled: data.absentAfter?.enabled === true,
      afterTime: data.absentAfter?.afterTime || "",
    },
  });

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setMessage("");
      const res = await axios.get(`${backendUrl}/admin/hr-configs`, { headers });
      setForm(normalizeFromApi(res.data?.data));
    } catch (error) {
      console.error("Error fetching HR configs:", error);
      setMessage("Failed to load HR configs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateRule = (ruleKey, field, value) => {
    setForm((prev) => ({
      ...prev,
      [ruleKey]: {
        ...prev[ruleKey],
        [field]: value,
      },
    }));
  };

  const validate = () => {
    if (form.halfDayAfter.enabled && !form.halfDayAfter.afterTime) {
      return "Half-day cutoff time is required.";
    }
    if (form.absentAfter.enabled && !form.absentAfter.afterTime) {
      return "Absent cutoff time is required.";
    }

    const halfDayMinutes = timeToMinutes(form.halfDayAfter.afterTime);
    const absentMinutes = timeToMinutes(form.absentAfter.afterTime);

    if (form.halfDayAfter.enabled && halfDayMinutes === null) {
      return "Half-day cutoff must be a valid time.";
    }
    if (form.absentAfter.enabled && absentMinutes === null) {
      return "Absent cutoff must be a valid time.";
    }
    if (
      form.halfDayAfter.enabled &&
      form.absentAfter.enabled &&
      absentMinutes <= halfDayMinutes
    ) {
      return "Absent cutoff must be later than half-day cutoff.";
    }

    return "";
  };

  const saveConfig = async () => {
    const validationError = validate();
    if (validationError) {
      setMessage(validationError);
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      const payload = {
        halfDayAfter: {
          enabled: !!form.halfDayAfter.enabled,
          afterTime: form.halfDayAfter.enabled ? form.halfDayAfter.afterTime : null,
        },
        absentAfter: {
          enabled: !!form.absentAfter.enabled,
          afterTime: form.absentAfter.enabled ? form.absentAfter.afterTime : null,
        },
      };

      const res = await axios.put(`${backendUrl}/admin/hr-configs`, payload, {
        headers,
      });
      setForm(normalizeFromApi(res.data?.data));
      setMessage("HR configs saved successfully.");
    } catch (error) {
      console.error("Error saving HR configs:", error);
      setMessage(error.response?.data?.message || "Failed to save HR configs.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="hr-configs-page">
      <div className="hr-configs-header">
        <div>
          <p>HR</p>
          <h2>HR Configs</h2>
        </div>
        <button type="button" onClick={fetchConfig} disabled={loading || saving}>
          <FaSyncAlt />
          Refresh
        </button>
      </div>

      <div className="hr-configs-summary">
        <span>Attendance Rules</span>
        <strong>{form.timezone}</strong>
      </div>

      <div className="hr-configs-grid">
        <section className="hr-config-rule-card">
          <div className="rule-title-row">
            <div>
              <h3>Mark Half Day After</h3>
              <p>Late punch-in threshold</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={!!form.halfDayAfter.enabled}
                onChange={(e) =>
                  updateRule("halfDayAfter", "enabled", e.target.checked)
                }
              />
              <span />
            </label>
          </div>

          <label className="time-field">
            <span>Time</span>
            <input
              type="time"
              value={form.halfDayAfter.afterTime}
              disabled={!form.halfDayAfter.enabled}
              onChange={(e) =>
                updateRule("halfDayAfter", "afterTime", e.target.value)
              }
            />
          </label>
        </section>

        <section className="hr-config-rule-card">
          <div className="rule-title-row">
            <div>
              <h3>Mark Absent After</h3>
              <p>Final punch-in cutoff</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={!!form.absentAfter.enabled}
                onChange={(e) =>
                  updateRule("absentAfter", "enabled", e.target.checked)
                }
              />
              <span />
            </label>
          </div>

          <label className="time-field">
            <span>Time</span>
            <input
              type="time"
              value={form.absentAfter.afterTime}
              disabled={!form.absentAfter.enabled}
              onChange={(e) =>
                updateRule("absentAfter", "afterTime", e.target.value)
              }
            />
          </label>
        </section>
      </div>

      <div className="hr-configs-actions">
        <button type="button" onClick={saveConfig} disabled={loading || saving}>
          <FaSave />
          {saving ? "Saving..." : "Save Configs"}
        </button>
        {message ? <span>{message}</span> : null}
      </div>
    </div>
  );
}

export default HrConfigsPage;
