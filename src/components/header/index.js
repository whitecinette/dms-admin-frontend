import { FaUserAlt } from "react-icons/fa";
import { useState, useEffect } from "react";
import ProfilePopup from "../profilePopup";
import { IoIosNotifications } from "react-icons/io";
import "./style.scss";
import axios from "axios";
import config from "../../config";
import Notification from "../Notifications";

const backendUrl = config.backend_url;

function Header({ isCollapsed }) {
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsCounts, setNotificationsCounts] = useState(0);

  const getNotificationsCounts = async () => {
    try {
      const res = await axios.get(
        `${backendUrl}/get/notification/count`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        }
      );
      setNotificationsCounts(res.data.count);
    } catch (err) {
      console.log(err);
    }
  };
  useEffect(() => {
    getNotificationsCounts();
  },[showNotifications]);


  return (
    <>
      <header className={`header ${isCollapsed ? "collapsed" : ""}`}>
        <div className="icons">
          <div className="notifications" onClick={()=> setShowNotifications(true)
          }>
            <IoIosNotifications size={30} />
            {notificationsCounts > 0 && (
              <span className="count">{notificationsCounts}</span>
            )}
            </div>
            {showNotifications && (
              <div className="notification-content">
                <Notification onClose={() => setShowNotifications(false)} count={notificationsCounts} />
              </div>
            )}
          <div className="profile" onClick={() => setShowProfile(true)} >
            <FaUserAlt />
          </div>
        </div>
      </header>
      {showProfile && (
        <>
          <div className="overlay" onClick={() => setShowProfile(false)} />
          <ProfilePopup onClose={() => setShowProfile(false)} />
        </>
      )}
      
    </>
  );
}

export default Header;
