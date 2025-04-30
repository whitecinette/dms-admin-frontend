import { FaUserAlt } from "react-icons/fa";
import { useState, useEffect } from "react";
import ProfilePopup from "../profilePopup";
import "./style.scss";

function Header({ isCollapsed }) {
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    if (showProfile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showProfile]);

  return (
    <>
      <header className={`header ${isCollapsed ? "collapsed" : ""}`}>
        <div className="profile" onClick={() => setShowProfile(true)}>
          <FaUserAlt />
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
