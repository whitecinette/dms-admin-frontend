import React, { useEffect, useState } from "react";
import axios from "axios";
import config from "../../config";
import "./style.scss";
import { IoMdClose } from "react-icons/io";
import { MdNotificationsOff } from "react-icons/md";

const backendUrl = config.backend_url;

function Notification({ onClose, count }) {
  const [notifications, setNotifications] = useState([]);

  const getNotifications = async () => {
    try {
      const res = await axios.get(`${backendUrl}/get/notification`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });
      setNotifications(res.data.notifications);
    } catch (err) {
      console.log(err);
    }
  };

  const markNotificationsAsRead = async () => {
    
    try {
      const unreadNotifications = notifications
        .filter((_, index) => index < count)
        .map(notification => notification._id);

        console.log("Unread notifications:", unreadNotifications);
      if (unreadNotifications.length > 0) {
        await axios.put(
          `${backendUrl}/mark/notification`,
          {
            userId: localStorage.getItem("userId"),
            notificationIds: unreadNotifications
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            },
          }
        );
      }
    } catch (err) {
      console.log("Error marking notifications as read:", err);
    }
  };

  const handleClose = async () => {
    await markNotificationsAsRead();
    onClose();
  };

  useEffect(() => {
    getNotifications();
  }, []);

  return (
    <div className="Notification">
      <div className="notification-header">
        <div>Notifications</div>
        <span onClick={handleClose}>
          <IoMdClose />
        </span>
      </div>
      <div className="notification-body">
      {notifications.length>0?(
        <>
        {notifications.map((notification, index) => {
          return (
            <div
              className="notification-card"
              key={index}
              style={{
                borderLeft:
                  index < count ? "4px solid #007bff" : ""
              }}
            >
              <div className="notifications-header">
                <div>{notification.title}</div>
                <div>
                  {new Date(notification.createdAt).toISOString().split("T")[0]}
                </div>
              </div>
              <div className="notification-message">
                <div>{notification.message}</div>
              </div>
            </div>
          );
        })}
        </>

      ):(
        <div className="no-notification">
  <MdNotificationsOff size={40} style={{ color: "#ccc", marginBottom: "0.5rem" }} />
  <p>No notifications</p>
</div>
      )
    }
      </div>
    </div>
  );
}

export default Notification;
