import React, { useState } from "react";
import "./style.scss";
import config from "../../config";
import axios from "axios";
const backend_url = config.backend_url;

const LoginAdmin = () => {
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Login form state
  const [loginData, setLoginData] = useState({
    code: "",
    password: "",
  });

  // Forgot password form state
  const [forgotPasswordData, setForgotPasswordData] = useState({
    code: "",
    oldPassword: "",
    newPassword: "",
    securityKey: "",
  });

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleForgotPasswordChange = (e) => {
    const { name, value } = e.target;
    setForgotPasswordData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Handle Login Submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Clear previous error

    try {
      const response = await axios.post(
        `${backend_url}/app/user/login`,
        loginData
      );

      if (response.status === 200) {
        console.log("Login successful:", response.data);

        // Store token and authentication state in localStorage
        localStorage.setItem("authToken", response.data.token);
        // localStorage.setItem('userRole', response.data.user.role);
        // localStorage.setItem('isAuthenticated', 'true');  // Setting the auth status

        // Redirect to the dashboard
        window.location.href = "/dashboard";
      }
    } catch (error) {
      setError(error.response?.data?.message || "Invalid email or password.");
    }
  };

  // Handle Forgot Password Submission
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    try {
      const response = await axios.post(
        `${backend_url}/user/change-password`,
        forgotPasswordData
      );

      if (response.status === 200) {
        setSuccessMsg(
          "Password reset successful. You can now login with your new password."
        );
        // Reset form
        setForgotPasswordData({
          code: "",
          oldPassword: "",
          newPassword: "",
          securityKey: "",
        });
        // Switch back to login after 3 seconds
        setTimeout(() => {
          setShowForgotPassword(false);
          setSuccessMsg("");
        }, 3000);
      }
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to reset password. Please try again."
      );
    }
  };

  const toggleForgotPassword = () => {
    setShowForgotPassword(!showForgotPassword);
    setError("");
    setSuccessMsg("");
  };

  return (
    <div className="login_container">
      <div className="main">
        <div className="logo-container">
          <div className="company-logo">
            <img src="./sc.jpg" alt="Company Logo" />
            <h2 style={{ fontFamily: "revert" }}>Welcome To Siddha Connect</h2>
          </div>
        </div>
        <div className="form-container login-active">
          {!showForgotPassword ? (
            <form onSubmit={handleLoginSubmit} className="login-form">
              <h2>Login</h2>
              <input
                className="form-input"
                type="text"
                name="code"
                placeholder="Code"
                required
                value={loginData.code}
                onChange={handleLoginChange}
              />
              <input
                className="form-input"
                type="password"
                name="password"
                placeholder="Password"
                required
                value={loginData.password}
                onChange={handleLoginChange}
              />
              <p className="forgot-password-link">
                <span onClick={toggleForgotPassword}>Forgot Password?</span>
              </p>
              {error && <p className="error">{error}</p>}
              <div>
                <button className="form-login-button" type="submit">
                  Login
                </button>
              </div>
              
            </form>
          ) : (
            <form
              onSubmit={handleForgotPasswordSubmit}
              className="forgot-password-form"
            >
              <h2>Reset Password</h2>
              <input
                className="form-input"
                type="text"
                name="code"
                placeholder="Code"
                required
                value={forgotPasswordData.code}
                onChange={handleForgotPasswordChange}
              />
              <input
                className="form-input"
                type="password"
                name="oldPassword"
                placeholder="Old Password"
                required
                value={forgotPasswordData.oldPassword}
                onChange={handleForgotPasswordChange}
              />
              <input
                className="form-input"
                type="password"
                name="newPassword"
                placeholder="New Password"
                required
                value={forgotPasswordData.newPassword}
                onChange={handleForgotPasswordChange}
              />
              <input
                className="form-input"
                type="text"
                name="securityKey"
                placeholder="Security Key"
                required
                value={forgotPasswordData.securityKey}
                onChange={handleForgotPasswordChange}
              />
              <p className="back-to-login-link">
                <span onClick={toggleForgotPassword}>Back to Login</span>
              </p>
              {error && <p className="error">{error}</p>}
              {successMsg && <p className="success">{successMsg}</p>}
              <div>
                <button className="form-login-button" type="submit">
                  Reset Password
                </button>
              </div>
              
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginAdmin;
