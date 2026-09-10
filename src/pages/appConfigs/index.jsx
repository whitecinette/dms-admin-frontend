import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { RiRefreshLine, RiSave3Line, RiSmartphoneLine } from "react-icons/ri";
import config from "../../config";
import "./style.scss";

const backendUrl = config.backend_url;

const DEFAULT_FORM = {
  forceUpdateEnabled: false,
  minimumVersion: "",
  updateMessage: "Please update your application to continue.",
  privileged: "SC-PNKJ\nSC-SH-01",
};

const normalizeConfig = (data = {}) => ({
  forceUpdateEnabled: data.forceUpdateEnabled === true,
  minimumVersion: data.minimumVersion || "",
  updateMessage: data.updateMessage || DEFAULT_FORM.updateMessage,
  privileged: Array.isArray(data.privileged)
    ? data.privileged.join("\n")
    : DEFAULT_FORM.privileged,
  updatedBy: data.updatedBy || "",
  updatedAt: data.updatedAt || "",
});

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

export default function AppConfigsPage() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const role = localStorage.getItem("role");
  const headers = useMemo(() => {
    const raw = localStorage.getItem("authToken") || "";
    return { Authorization: raw.startsWith("Bearer ") ? raw : `Bearer ${raw}` };
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setMessage("");
      const res = await axios.get(`${backendUrl}/admin/app-configs`, {
        headers,
      });
      const next = normalizeConfig(res.data?.data);
      setForm({
        forceUpdateEnabled: next.forceUpdateEnabled,
        minimumVersion: next.minimumVersion,
        updateMessage: next.updateMessage,
        privileged: next.privileged,
      });
      setMeta(next);
    } catch (error) {
      console.error("Error fetching app configs:", error);
      setMessage("Failed to load app configs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const saveConfig = async () => {
    const version = form.minimumVersion.trim();

    if (form.forceUpdateEnabled && !/^\d+\.\d+\.\d+$/.test(version)) {
      setMessage("Minimum version must be in x.y.z format, for example 1.0.17.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const payload = {
        forceUpdateEnabled: !!form.forceUpdateEnabled,
        minimumVersion: form.forceUpdateEnabled ? version : "",
        updateMessage:
          form.updateMessage.trim() ||
          "Please update your application to continue.",
        privileged: form.privileged
          .split(/[\n,]+/)
          .map((value) => value.trim().toUpperCase())
          .filter(Boolean),
      };

      const res = await axios.put(`${backendUrl}/admin/app-configs`, payload, {
        headers,
      });

      const next = normalizeConfig(res.data?.data);
      setForm({
        forceUpdateEnabled: next.forceUpdateEnabled,
        minimumVersion: next.minimumVersion,
        updateMessage: next.updateMessage,
        privileged: next.privileged,
      });
      setMeta(next);
      setMessage("App configs saved successfully.");
    } catch (error) {
      console.error("Error saving app configs:", error);
      setMessage(error.response?.data?.message || "Failed to save app configs.");
    } finally {
      setSaving(false);
    }
  };

  if (role !== "super_admin") {
    return (
      <div className="app-configs-page">
        <div className="app-configs-empty">
          <RiSmartphoneLine />
          <h2>Superadmin access required</h2>
          <p>App configs are visible only to superadmins.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-configs-page">
      <div className="app-configs-hero">
        <div>
          <span>Configuration</span>
          <h1>App Configs</h1>
          <p>
            Control minimum mobile app version before the dynamic dashboard and
            menu are allowed to load.
          </p>
        </div>
        <button type="button" onClick={fetchConfig} disabled={loading || saving}>
          <RiRefreshLine />
          Refresh
        </button>
      </div>

      <section className="app-config-card">
        <div className="app-config-card-header">
          <div>
            <h2>Mobile Version Enforcement</h2>
            <p>When enabled, users below the minimum version see an update screen.</p>
          </div>
          <label className="config-switch">
            <input
              type="checkbox"
              checked={form.forceUpdateEnabled}
              onChange={(e) =>
                updateField("forceUpdateEnabled", e.target.checked)
              }
            />
            <span />
          </label>
        </div>

        <div className="app-config-grid">
          <label>
            <span>Minimum App Version</span>
            <input
              value={form.minimumVersion}
              disabled={!form.forceUpdateEnabled}
              onChange={(e) => updateField("minimumVersion", e.target.value)}
              placeholder="1.0.17"
            />
          </label>

          <label>
            <span>Update Message</span>
            <input
              value={form.updateMessage}
              onChange={(e) => updateField("updateMessage", e.target.value)}
              placeholder="Please update your application to continue."
            />
          </label>

          <label className="app-config-wide">
            <span>Privileged User Codes</span>
            <textarea
              value={form.privileged}
              onChange={(e) => updateField("privileged", e.target.value)}
              placeholder={"SC-PNKJ\nSC-SH-01"}
              rows={4}
            />
          </label>
        </div>

        <div className="app-config-note">
          Sample for the current release: enable the checkbox and set minimum
          version to <strong>1.0.17</strong>. The app build has been bumped to{" "}
          <strong>1.0.17+17</strong>.
        </div>

        {message && <div className="app-config-message">{message}</div>}

        <div className="app-config-actions">
          <div className="app-config-meta">
            Last updated by {meta.updatedBy || "-"} on {formatDate(meta.updatedAt)}
          </div>
          <button type="button" onClick={saveConfig} disabled={loading || saving}>
            <RiSave3Line />
            {saving ? "Saving..." : "Save Config"}
          </button>
        </div>
      </section>
    </div>
  );
}
