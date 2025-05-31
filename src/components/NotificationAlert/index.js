import React, { useState, useEffect } from "react";
import "./style.scss";
import config from "../../config";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import { FaRoute } from "react-icons/fa";
import { IoMdClose } from "react-icons/io";
import axios from "axios";

const backendSocketUrl = config.backend_url;

const NotificationAlert = () => {
  const [notifications, setNotifications] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const navigate = useNavigate();

  useEffect(() => {
    const socket = io(backendSocketUrl, {
      withCredentials: true,
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      setConnectionStatus("connected");
      const userId = localStorage.getItem("userId");
      if (userId) {
        socket.emit("join", userId);
      }
    });

    socket.on("disconnect", () => {
      setConnectionStatus("disconnected");
    });

    socket.on("connect_error", (err) => {
      setConnectionStatus("error");
    });

    socket.on("notification", (data) => {
      setNotifications((prev) => [...prev, data.notification]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleNotificationClick = (notification) => {
    if (notification.title === "Route Plan") {
      // Extract name, startDate, and endDate from notification.filters
      const [name, startDate, endDate] = notification.filters;

      // Navigate to /routePlan with query parameters
      navigate(`/routePlan?search=${encodeURIComponent(name)}&startDate=${startDate}&endDate=${endDate}`);
      handleClose(null, notification._id);
    }
  };

  const getNotificationIcon = (title) => {
    if (title === "Route Plan") {
      return <FaRoute className="icon" />;
    }
    return null;
  };

  const handleClose = async (e, id) => {
    e.stopPropagation();
    try {
      await axios.put(`${backendSocketUrl}/mark/notification`, {
        userId: localStorage.getItem("userId"),
        notificationIds: [id]
      });
      setNotifications((prev) => prev.filter((notification) => notification._id !== id));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };
  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    

  return (
    <div className="notification-container">
      {notifications.map((notification, index) => (
        <div
          className={`notification-item ${notification.title.toLowerCase()}`}
          key={notification._id || index}
          onClick={() => handleNotificationClick(notification)}
        >
          <div className="notification-content">
            <div className="notification-header">
              <h3>
                {getNotificationIcon(notification.title)}
                {notification.title}
              </h3>
              <button
                className="close-button"
                onClick={(e) => handleClose(e, notification._id)}
                title="Mark as read"
              >
                <IoMdClose />
              </button>
            </div>
            <p className="message">{notification.message}</p>
            <div className="notification-details">
              <span className="code">{notification.targetCodes?.join(", ")}</span>
              <span className="timestamp">
                {formatDate(notification.createdAt)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationAlert;
