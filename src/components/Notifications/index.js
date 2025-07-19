import React, { useEffect, useState } from "react";
import axios from "axios";
import config from "../../config";
import "./style.scss";
import { IoMdClose } from "react-icons/io";
import { MdNotificationsOff } from "react-icons/md";
import { useNavigate } from "react-router-dom";

const backendUrl = config.backend_url;

function Notification({ onClose, count }) {
  const navigate = useNavigate()
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

        // console.log("Unread notifications:", unreadNotifications);
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
  // Update handleNotificationClick to handle the event properly
  const handleNotificationClick = (notification) => {
    try {
      if (notification.title === "Route Plan") {
        const [name, startDate, endDate] = notification.filters;
        const queryParams = `?search=${encodeURIComponent(name)}&startDate=${startDate}&endDate=${endDate}`;
        
        // Check if we're already on the route plan page
        if (window.location.pathname === '/routePlan') {
          // Force a reload of the current page with new parameters
          window.location.href = `/routePlan${queryParams}`;
        } else {
          // Use normal navigation for different pages
          navigate(`/routePlan${queryParams}`);
        }
      } else if (notification.title === "Leave Request") {
        const [code, startDate, endDate] = notification.filters;
        const queryParams = `?search=${encodeURIComponent(code)}&startDate=${startDate}&endDate=${endDate}`;
        
        if (window.location.pathname === '/leaveApplication') {
          window.location.href = `/leaveApplication${queryParams}`;
        } else {
          navigate(`/leaveApplication${queryParams}`);
        }
      }else if (notification.title === "Route Request") {
       const [name, startDate, endDate] = notification.filters;
       const queryParams = `?search=${encodeURIComponent(name)}&startDate=${startDate}&endDate=${endDate}`;
 
       if (window.location.pathname === '/routePlan') {
         window.location.href = `/routePlan${queryParams}`;
       } else {
         navigate(`/routePlan${queryParams}`);
       }
     }
      handleClose();
    } catch (error) {
      console.error("Error in handleNotificationClick:", error);
    }finally {
      handleClose();
    }

  };

  // Update the handleClose function to work without requiring event
  const handleClose = async () => {
    try {
      await markNotificationsAsRead();
      onClose(); // Call the onClose prop passed from parent
    } catch (error) {
      console.error("Error in handleClose:", error);
    }
  };

  useEffect(() => {
    getNotifications();
  }, []);

  return (
    <div className="Notification">
      <div className="notification-header">
        <div>Notifications</div>
        {/* Update the JSX where close button is rendered */}
        <span onClick={(e) => handleClose(e)}>
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
              onClick={() => handleNotificationClick(notification)}
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
