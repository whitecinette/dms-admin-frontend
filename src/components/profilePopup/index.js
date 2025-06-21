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
import { CiWarning } from "react-icons/ci";

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
  const [isEmailChanged, setIsEmailChanged] = useState(false);
  const [originalEmail, setOriginalEmail] = useState("");
  const [verificationPolling, setVerificationPolling] = useState(null);
  const POLLING_INTERVAL = 30000;
  const [isVerifying, setIsVerifying] = useState(false);

  // Fetch profile on mount
  // Update the fetchProfile function
  const fetchProfile = async (shouldUpdateForm = false) => {
    try {
      const response = await axios.get(`${backendUrl}/user/get-profile`, {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
      const user = response.data.user;

      // Only update profile state
      setProfile(user);

      // Update form only if explicitly requested
      if (shouldUpdateForm) {
        setEditedProfile(user);
        setOriginalEmail(user.email);
        setPasswordData((prev) => ({ ...prev, code: user.code }));
      }

      // Check if email is verified
      if (
        isEmailChanged &&
        user.VerifyMail &&
        user.email === editedProfile.email
      ) {
        setIsEmailChanged(false);
        setSuccessMsg("Email verified successfully!");
        // Clear polling interval
        if (verificationPolling) {
          clearInterval(verificationPolling);
          setVerificationPolling(null);
        }
      }

      setLoading(false);
    } catch (error) {
      setError("Failed to fetch profile");
      setLoading(false);
    } finally {
      setTimeout(() => {
        setError("");
        setSuccessMsg("");
      }, 3000);
    }
  };

  // Update handleSendVerificationEmail function
  const handleSendVerificationEmail = async (email) => {
    try {
      setIsVerifying(true);
      await axios.post(
        `${backendUrl}/user/verifyMail`,
        { email },
        { headers: { Authorization: localStorage.getItem("token") } }
      );

      setSuccessMsg("Verification email sent! Please check your mail.");

      // Clear any existing interval
      if (verificationPolling) {
        clearInterval(verificationPolling);
      }

      // Start new polling interval
      const polling = setInterval(() => {
        fetchProfile(false); // Don't update form on polling
      }, POLLING_INTERVAL);

      setVerificationPolling(polling);
    } catch (err) {
      setError("Error sending verification email");
      console.error("Error sending email:", err);
    } finally {
      setIsVerifying(false);
    }
  };

  // Update useEffect for cleanup
  useEffect(() => {
    fetchProfile(true); // Update form on initial load

    return () => {
      if (verificationPolling) {
        clearInterval(verificationPolling);
      }
    };
  }, []);

  const handleEdit = () => {
    setIsEditing(true);
    setError("");
    setSuccessMsg("");
  };

  const handleSave = async () => {
    try {
      if (isEmailChanged && !editedProfile.VerifyMail) {
        setError("Please verify your email before saving changes");
        return;
      }
      setError("");
      setSuccessMsg("");

      const response = await axios.put(
        `${backendUrl}/edit-profile`,
        editedProfile,
        {
          headers: {
            Authorization: localStorage.getItem("token"),
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
    // Check if email is changed
    if (name === "email" && value !== originalEmail) {
      setIsEmailChanged(true);
    } else if (name === "email" && value === originalEmail) {
      setIsEmailChanged(false);
    }
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

  // const handleSendVerificationEmail = async (email) => {
  //   try {
  //     await axios.post(
  //       `${backendUrl}/user/verifyMail`,
  //       { email },
  //       { headers: { Authorization: localStorage.getItem("token") } }
  //     );
  //     setSuccessMsg("Please Check Your Mail");
  //   } catch (err) {
  //     setError("Error sending email, please try again");
  //     console.log("error sending email: ", err);
  //   } finally {
  //     setTimeout(() => {
  //       setError("");
  //       setSuccessMsg("");
  //     }, 3000);
  //   }
  // };

  if (loading) {
    return (
      <div className="profile-overlay" onClick={onClose}>
        <div className="profile-popup" onClick={(e) => e.stopPropagation()}>
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-popup" onClick={(e) => e.stopPropagation()}>
        <div className="profile-header">
          <div className="user-avatar">
            <FaUser />
          </div>
          <h3>{profile?.name || "User Name"}</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        {!profile?.VerifyMail && (
          <div className="warning-message">
            <CiWarning />
            Please Verify Your Email
          </div>
        )}
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
                  <div className="email-input-group">
                    <input
                      type="email"
                      name="email"
                      value={editedProfile.email || ""}
                      onChange={handleChange}
                    />
                    {isEmailChanged && (
                      <button
                        type="button"
                        className="verify-email-btn"
                        onClick={() =>
                          handleSendVerificationEmail(editedProfile.email)
                        }
                      >
                        {isVerifying ? "Verify.." : "Verify"}
                      </button>
                    )}
                  </div>
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
                    <span className="value">{profile?.code || "Code"}</span>
                  </div>
                </div>
                <div className="info-item">
                  <FaEnvelope />
                  <div className="info-content">
                    <span className="label">Email</span>
                    <span className="value">{profile?.email || "Email"}</span>
                  </div>
                </div>
                <div className="info-item">
                  <FaPhone />
                  <div className="info-content">
                    <span className="label">Phone</span>
                    <span className="value">
                      {profile?.phone || "Phone Number"}
                    </span>
                  </div>
                </div>
                <div className="info-item">
                  <FaUserShield />
                  <div className="info-content">
                    <span className="label">Role</span>
                    <span className="value">{profile?.role || "Role"}</span>
                  </div>
                </div>
                <div className="info-item">
                  <FaShieldAlt />
                  <div className="info-content">
                    <span className="label">Position</span>
                    <span className="value">
                      {profile?.position || "Position"}
                    </span>
                  </div>
                </div>
                <div className="info-item">
                  <div className="status-badge">
                    <span
                      className={`status ${
                        profile?.status ? profile.status : ""
                      }`}
                    >
                      {profile?.status || "Status"}
                    </span>
                  </div>
                </div>
                <div className="button-group">
                  <button onClick={handleEdit}>Edit Profile</button>
                  {profile?.VerifyMail === true ? (
                    <button onClick={() => setShowChangePassword(true)}>
                      <FaKey /> Change Password
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSendVerificationEmail(profile.email)}
                    >
                      <FaKey /> Verify Mail
                    </button>
                  )}
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
    </div>
  );
}

export default ProfilePopup;
