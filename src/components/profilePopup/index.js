import React, { useState, useEffect } from "react";
import axios from "axios";
import config from "../../config";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaKey,
  FaIdCard,
  FaShieldAlt,
  FaUserShield,
} from "react-icons/fa";
import "./style.scss";

const backendUrl = config.backend_url;

function ProfilePopup({ onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({});
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    code: "",
    oldPassword: "",
    newPassword: "",
    securityKey: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${backendUrl}/user/get-profile`, {
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });
      setProfile(response.data.user);
      setEditedProfile(response.data.user);
      setPasswordData((prev) => ({ ...prev, code: response.data.user.code }));
      setLoading(false);
    } catch (error) {
      setError("Failed to fetch profile");
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError("");
    setSuccessMsg("");
  };

  const handleSave = async () => {
    try {
      console.log(editedProfile);
      setError("");
      setSuccessMsg("");

      const response = await axios.put(
        `${backendUrl}/edit-profile`,
        editedProfile,
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );

      if (response.status === 200) {
        setProfile(editedProfile);
        setSuccessMsg("Profile updated successfully");
        setTimeout(() => {
          setIsEditing(false);
          setSuccessMsg("");
        }, 3000);
      }
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update profile");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    try {
      const response = await axios.post(
        `${backendUrl}/user/change-password`,
        passwordData
      );

      if (response.status === 200) {
        setSuccessMsg("Password changed successfully");
        setPasswordData({
          code: profile.code,
          oldPassword: "",
          newPassword: "",
          securityKey: "",
        });
        setTimeout(() => {
          setShowChangePassword(false);
          setSuccessMsg("");
        }, 3000);
      }
    } catch (error) {
      setError(error.response?.data?.message || "Failed to change password");
    }
  };

  if (loading) {
    return (
      <div className="profile-popup">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="profile-popup">
      <div className="profile-header">
        <div className="user-avatar">
          <FaUser />
        </div>
        <h3>{profile.name}</h3>
        <button className="close-btn" onClick={onClose}>
          ×
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMsg && <div className="success-message">{successMsg}</div>}

      {!showChangePassword ? (
        <div className="profile-content">
          {isEditing ? (
            <div className="edit-form">
              <div className="form-group">
                <label>
                  <FaUser /> Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={editedProfile.name || ""}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>
                  <FaEnvelope /> Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={editedProfile.email || ""}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>
                  <FaPhone /> Phone
                </label>
                <input
                  type="text"
                  name="phone"
                  value={editedProfile.phone || ""}
                  onChange={handleChange}
                />
              </div>
              <div className="button-group">
                <button onClick={handleSave}>Save Changes</button>
                <button onClick={() => setIsEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="profile-info">
              <div className="info-item">
                <FaIdCard />
                <div className="info-content">
                  <span className="label">Code</span>
                  <span className="value">{profile.code}</span>
                </div>
              </div>
              <div className="info-item">
                <FaEnvelope />
                <div className="info-content">
                  <span className="label">Email</span>
                  <span className="value">{profile.email}</span>
                </div>
              </div>
              <div className="info-item">
                <FaPhone />
                <div className="info-content">
                  <span className="label">Phone</span>
                  <span className="value">{profile.phone}</span>
                </div>
              </div>
              <div className="info-item">
                <FaUserShield />
                <div className="info-content">
                  <span className="label">Role</span>
                  <span className="value">{profile.role}</span>
                </div>
              </div>
              <div className="info-item">
                <FaShieldAlt />
                <div className="info-content">
                  <span className="label">Position</span>
                  <span className="value">{profile.position}</span>
                </div>
              </div>
              <div className="info-item">
                <div className="status-badge">
                  <span className={`status ${profile.status}`}>
                    {profile.status}
                  </span>
                </div>
              </div>
              <div className="button-group">
                <button onClick={handleEdit}>Edit Profile</button>
                <button onClick={() => setShowChangePassword(true)}>
                  <FaKey /> Change Password
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="change-password">
          <h4>
            <FaKey /> Change Password
          </h4>
          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label>
                <FaKey /> Old Password
              </label>
              <input
                type="password"
                name="oldPassword"
                value={passwordData.oldPassword}
                onChange={handlePasswordChange}
                required
              />
            </div>
            <div className="form-group">
              <label>
                <FaKey /> New Password
              </label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                required
              />
            </div>
            <div className="form-group">
              <label>
                <FaKey /> Security Key
              </label>
              <input
                type="password"
                name="securityKey"
                value={passwordData.securityKey}
                onChange={handlePasswordChange}
                required
              />
            </div>
            <div className="button-group">
              <button type="submit">Update Password</button>
              <button
                type="button"
                onClick={() => setShowChangePassword(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default ProfilePopup;
