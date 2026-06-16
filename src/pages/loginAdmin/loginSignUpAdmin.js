import React, { useState } from "react";
import "./style.scss";
import config from "../../config";
import axios from "axios";
import { UAParser } from "ua-parser-js";
import { LogIn, RotateCcw } from "lucide-react";

const backend_url = config.backend_url;

const getErrorMessage = (error, fallback) => {
  const genericLoginError = /invalid (email|code).*password/i;

  const collectMessages = (value) => {
    if (!value) return [];
    if (typeof value === "string") return [value];
    if (Array.isArray(value)) {
      return value.flatMap(collectMessages);
    }
    if (typeof value !== "object") return [];

    const messages = [];
    const seenKeys = new Set();
    const messageKeys = [
      "deviceMessage",
      "deviceError",
      "authorizationMessage",
      "authMessage",
      "detail",
      "reason",
      "message",
      "error",
      "msg",
      "data",
      "errors",
    ];
    for (const key of messageKeys) {
      seenKeys.add(key);
      messages.push(...collectMessages(value[key]));
    }

    for (const [key, nestedValue] of Object.entries(value)) {
      if (seenKeys.has(key)) continue;
      if (/message|error|reason|detail|device|auth/i.test(key)) {
        messages.push(...collectMessages(nestedValue));
      }
    }

    return messages;
  };

  const messages = collectMessages(error?.response?.data).filter(Boolean);
  return (
    messages.find((message) => !genericLoginError.test(message)) ||
    messages[0] ||
    fallback
  );
};

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
  // const handleLoginSubmit = async (e) => {
  //   e.preventDefault();
  //   setError(""); // Clear previous error

  //   try {
  //     const response = await axios.post(
  //       `${backend_url}/app/user/login`,
  //       loginData,
  //       { headers: { "X-Client-Type": "admin" } }
  //     );

  //     if (response.status === 200) {
  //       // Store token and authentication state in localStorage
  //       localStorage.setItem("authToken", response.data.token);
  //       localStorage.setItem("role", response.data.user.role);
  //       localStorage.setItem("userId", response.data.user.id);
  //       localStorage.setItem("refreshToken", response.data.refreshToken);
  //       // localStorage.setItem('isAuthenticated', 'true');  // Setting the auth status

  //       // Redirect to the dashboard
  //       window.location.href = "/dashboard";
  //     }
  //   } catch (error) {
  //     setError(error.response?.data?.message || "Invalid email or password.");
  //   }
  // };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(""); 
  
    try {
      const parser = new UAParser();
      const result = parser.getResult();
  
      // Create a pseudo deviceId for web
      const pseudoId = btoa(
        navigator.userAgent +
          navigator.platform +
          window.screen.width +
          "x" +
          window.screen.height
      );
      
  
      const deviceInfo = {
        brand: result.device.vendor || "Web",
        model: result.device.model || result.browser.name || "Browser",
        os: `${result.os.name} ${result.os.version}`,
        appVersion: config.appVersion || "web-1.0.0",
      };
  
      const response = await axios.post(
        `${backend_url}/app/user/login`,
        {
          ...loginData,
          androidId: pseudoId,
          deviceInfo,
        },
        { headers: { "X-Client-Type": "admin" } }
      );
  
      if (response.status === 200) {
        localStorage.setItem("authToken", response.data.token);
        localStorage.setItem("role", response.data.user.role);
        localStorage.setItem("userId", response.data.user.id);
        localStorage.setItem("refreshToken", response.data.refreshToken);
  
        window.location.href = "/dashboard";
      }
    } catch (error) {
      setError(getErrorMessage(error, "Invalid email or password."));
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
        getErrorMessage(error, "Failed to reset password. Please try again.")
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
            <div>
              <p className="brand-kicker">Siddha Connect</p>
              <h1>Admin Console</h1>
            </div>
          </div>
        </div>
        <div className="form-container login-active">
          {!showForgotPassword ? (
            <form onSubmit={handleLoginSubmit} className="login-form">
              <div className="form-heading">
                <p className="form-kicker">Welcome back</p>
                <h2>Login</h2>
              </div>
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
              {error && <p className="error-message">{error}</p>}
              <div className="form-actions">
                <button className="form-login-button" type="submit">
                  <LogIn size={18} />
                  Login
                </button>
              </div>
            </form>
          ) : (
            <form
              onSubmit={handleForgotPasswordSubmit}
              className="forgot-password-form"
            >
              <div className="form-heading">
                <p className="form-kicker">Account access</p>
                <h2>Reset Password</h2>
              </div>
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
              {error && <p className="error-message">{error}</p>}
              {successMsg && <p className="success">{successMsg}</p>}
              <div className="form-actions">
                <button className="form-login-button" type="submit">
                  <RotateCcw size={18} />
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
