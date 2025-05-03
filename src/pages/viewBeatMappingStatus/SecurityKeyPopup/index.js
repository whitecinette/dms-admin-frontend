import React, { useState } from "react";
import { FaTimes } from "react-icons/fa";
import axios from "axios";
import CustomAlert from "../../../components/CustomAlert";
import "./style.scss";
import config from "../../../config";

const backend_url = config.backend_url;

const SecurityKeyPopup = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    oldKey: "",
    newKey: "",
  });
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null);

    try {
      const token = localStorage.getItem("authToken");
      const response = await axios.post(
        `${backend_url}/admin/create-security-key`,
        {
          oldKey: formData.oldKey,
          newKey: formData.newKey,
        },
        {
          headers: {
            Authorization: token,
          },
        }
      );

      if (response.data.success) {
        if (onSuccess) {
          onSuccess("Security key updated successfully!");
        }
        setTimeout(() => {
          onClose();
        }, 2000);
        return;
      }
    } catch (error) {
      setAlert({
        type: "error",
        message:
          error.response?.data?.message || "Failed to update security key",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="security-key-popup">
      <div className="popup-content">
        <div className="popup-header">
          <h2>Edit Security Key</h2>
          <button className="close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="oldKey">Old Security Key</label>
            <input
              type="password"
              id="oldKey"
              name="oldKey"
              value={formData.oldKey}
              onChange={handleChange}
              required
              placeholder="Enter old security key"
            />
          </div>

          <div className="form-group">
            <label htmlFor="newKey">New Security Key</label>
            <input
              type="password"
              id="newKey"
              name="newKey"
              value={formData.newKey}
              onChange={handleChange}
              required
              placeholder="Enter new security key"
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Updating..." : "Update Security Key"}
          </button>
        </form>

        {alert && (
          <CustomAlert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}
      </div>
    </div>
  );
};

export default SecurityKeyPopup;
