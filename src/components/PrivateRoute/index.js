import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import config from "../../config";

const backend_url = config.backend_url;

function PrivateRoute({ element }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  const isTokenExpired = () => {
    const token = localStorage.getItem("authToken");
    if (!token) return true;

    try {
      const tokenPayload = JSON.parse(atob(token.split(".")[1]));
      const expiryTime = tokenPayload.exp * 1000;
      return new Date(expiryTime) < Date.now();
    } catch (error) {
      console.error("Invalid token:", error);
      return true;
    }
  };

  const refreshToken = async () => {
    try {
      if (!localStorage.getItem("refreshToken")) {
        setIsAuthenticated(false);
        return;
      }
      const body = {
        refreshToken: localStorage.getItem("refreshToken"),
        oldToken: localStorage.getItem("authToken")
      };

      const res = await axios.post(`${backend_url}/user/Refresh-token`, body);
      localStorage.setItem("authToken", res.data.token); // Update token
      localStorage.setItem("refreshToken", res.data.refreshToken); // Update refresh token
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Error refreshing token:", error);
      localStorage.clear(); // Clear localStorage on error
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    if (isTokenExpired()) {
      refreshToken();
    } else {
      setIsAuthenticated(true);
    }
  }, []);

  if (isAuthenticated === null) {
    return <div>Loading...</div>; // Temporary loading state
  }

  return isAuthenticated ? element : <Navigate to="/login" replace />;
}
export default PrivateRoute;