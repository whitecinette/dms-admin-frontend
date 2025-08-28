// src/pages/components/AddFirmModal.jsx
import React, { useState } from "react";
import axios from "axios";
import config from "../../../config";
import './style.scss';

const AddFirmModal = ({ closeModal, onSaved }) => {
  const [form, setForm] = useState({
    code: "",
    name: "",
    orgName: "",
    description: "",
    gstNumber: "",
    status: "Active",
    owners: [{ name: "", phone: "", email: "" }],
    address: { street: "", city: "", state: "", zipCode: "" },
    contact: { phone: "", email: "" },
    accountDetails: {
      bankName: "",
      accountNumber: "",
      ifscCode: "",
      branchName: "",
      accountHolderName: "",
    },
    flowTypes: [],
    branding: { logoUrl: "", primaryColor: "", secondaryColor: "" },
  });

  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleNestedChange = (section, field, value) => {
    setForm({
      ...form,
      [section]: { ...form[section], [field]: value },
    });
  };

  const handleOwnerChange = (idx, field, value) => {
    const updated = [...form.owners];
    updated[idx][field] = value;
    setForm({ ...form, owners: updated });
  };

  const addOwner = () => {
    setForm({
      ...form,
      owners: [...form.owners, { name: "", phone: "", email: "" }],
    });
  };

  const handleSubmit = async () => {
    if (!form.code || !form.name || !form.orgName) {
      alert("Code, Name, and Organization Name are required");
      return;
    }

    try {
      setSaving(true);
      const backendUrl = config?.backend_url;
      const token = localStorage.getItem("authToken");

      const res = await axios.post(`${backendUrl}/create-firm`, form, {
        headers: { Authorization: token },
      });

      alert("Firm created successfully");
      console.log("✅ Created firm:", res.data);
      onSaved();
    } catch (err) {
      console.error("❌ Create firm failed:", err);
      alert(err.response?.data?.message || "Failed to create firm");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Add Firm</h2>

        <label>Code</label>
        <input type="text" name="code" value={form.code} onChange={handleChange} />

        <label>Name</label>
        <input type="text" name="name" value={form.name} onChange={handleChange} />

        <label>Organization Name</label>
        <input
          type="text"
          name="orgName"
          value={form.orgName}
          onChange={handleChange}
        />

        <label>Description</label>
        <input
          type="text"
          name="description"
          value={form.description}
          onChange={handleChange}
        />

        <label>GST Number</label>
        <input
          type="text"
          name="gstNumber"
          value={form.gstNumber}
          onChange={handleChange}
        />

        <label>Status</label>
        <select name="status" value={form.status} onChange={handleChange}>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>

        {/* Owners */}
        <h3>Owners</h3>
        {form.owners.map((owner, idx) => (
          <div key={idx} className="nested-row">
            <input
              type="text"
              placeholder="Name"
              value={owner.name}
              onChange={(e) => handleOwnerChange(idx, "name", e.target.value)}
            />
            <input
              type="text"
              placeholder="Phone"
              value={owner.phone}
              onChange={(e) => handleOwnerChange(idx, "phone", e.target.value)}
            />
            <input
              type="email"
              placeholder="Email"
              value={owner.email}
              onChange={(e) => handleOwnerChange(idx, "email", e.target.value)}
            />
          </div>
        ))}
        <button onClick={addOwner}>+ Add Owner</button>

        {/* Address */}
        <h3>Address</h3>
        <input
          type="text"
          placeholder="Street"
          value={form.address.street}
          onChange={(e) => handleNestedChange("address", "street", e.target.value)}
        />
        <input
          type="text"
          placeholder="City"
          value={form.address.city}
          onChange={(e) => handleNestedChange("address", "city", e.target.value)}
        />
        <input
          type="text"
          placeholder="State"
          value={form.address.state}
          onChange={(e) => handleNestedChange("address", "state", e.target.value)}
        />
        <input
          type="text"
          placeholder="Zip Code"
          value={form.address.zipCode}
          onChange={(e) => handleNestedChange("address", "zipCode", e.target.value)}
        />

        {/* Contact */}
        <h3>Contact</h3>
        <input
          type="text"
          placeholder="Phone"
          value={form.contact.phone}
          onChange={(e) => handleNestedChange("contact", "phone", e.target.value)}
        />
        <input
          type="email"
          placeholder="Email"
          value={form.contact.email}
          onChange={(e) => handleNestedChange("contact", "email", e.target.value)}
        />

        <div className="modal-actions">
          <button className="secondary-button" onClick={closeModal}>
            Cancel
          </button>
          <button
            className="primary-button"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddFirmModal;
