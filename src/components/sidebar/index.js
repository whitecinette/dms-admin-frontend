import { useState } from "react";
import { NavLink } from "react-router-dom";
import { FaChartPie, FaFileAlt, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { GoGraph } from "react-icons/go";
import { LuPickaxe, LuMapPinHouse } from "react-icons/lu";
import { MdOutlineGroups2, MdLogout, MdMenuOpen, MdOutlineInventory2 } from "react-icons/md";
import { RxHamburgerMenu } from "react-icons/rx";
import { BsCloudUpload } from "react-icons/bs";
import { TbTargetArrow, TbHierarchy3 } from "react-icons/tb";
import { RiTimeLine } from "react-icons/ri";
import logo from "../../assets/images/company-logo.png";
import "./style.scss";

function Sidebar({ isCollapsed, toggleSidebar }) {
  const [openDropdowns, setOpenDropdowns] = useState({});

  const toggleDropdown = (index) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [index]: !prev[index], // Toggle dropdown state
    }));
  };

  const navItems = [
    { name: "Sales Dashboard", to: "/dashboard", icon: <FaChartPie size={20} /> },
    { name: "Extraction", to: "/extraction", icon: <LuPickaxe size={20} /> },
    { name: "GFK", to: "/orders", icon: <GoGraph size={20} /> },
    { name: "HR", to: "/salesData", icon: <svg width="20" height="42" viewBox="0 0 60 42" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M58.7419 33.871H1.25806C0.580645 33.871 0 34.4516 0 35.129V39.8715C0 40.5484 0.580645 41.1295 1.25806 41.1295H58.7419C59.4189 41.1295 60 40.5489 60 39.8715V35.129C60 34.4516 59.4194 33.871 58.7419 33.871Z" fill="#F94008" fill-opacity="0.62"/>
        <path d="M1.30645 28.0645H7.06452C7.8871 28.0645 8.70968 27.2419 8.70968 26.4194V18C8.70968 17.1774 9.19355 16.4516 10.0161 16.4516H16.5968C17.4194 16.4516 17.9516 17.1774 17.9516 18V26.4677C17.9516 27.2903 18.7258 28.1124 19.5484 28.1124H25.3548C26.1774 28.1124 26.6613 27.2903 26.6613 26.4677V1.20968C26.6613 0.387097 26.1774 0 25.3548 0H19.5484C18.7258 0 17.9516 0.435484 17.9516 1.20968V8.12903C17.9516 8.95161 17.4194 9.67742 16.5968 9.67742H10.0161C9.19355 9.67742 8.70968 8.95161 8.70968 8.12903V1.20968C8.70968 0.387097 7.8871 0 7.06452 0H1.30645C0.483871 0 0 0.435484 0 1.20968V26.4194C0 27.2419 0.483871 28.0645 1.30645 28.0645Z" fill="#F94008" fill-opacity="0.62"/>
        <path d="M53.177 14.9032C53.612 14.7581 53.9512 14.5645 54.2899 14.371C55.4507 13.6452 56.3706 12.7258 57.048 11.6129C57.7249 10.5 58.0641 9.14516 58.0641 7.59677C58.0641 5.80645 57.6286 4.30645 56.7577 3.04839C55.8867 1.79032 54.7254 1.06452 53.3222 0.580646C51.9189 0.0967746 49.8383 0 47.177 0H33.4351C33.0001 0 32.4189 0.0967744 32.4189 0.532258V27.1452C32.4189 27.5806 32.9996 28.0645 33.4351 28.0645H40.6448C41.0802 28.0645 41.6609 27.5806 41.6609 27.1452V17.2258C41.6609 16.7903 41.9028 16.4516 42.2904 16.4516C43.0646 16.4516 43.742 16.6452 44.371 17.0806C44.8549 17.4194 45.3388 18.1452 45.9194 19.2581L50.3227 27.5806C50.4678 27.8226 50.7098 28.0645 51.0001 28.0645H59.1291C59.7097 28.0645 60.0968 27.3871 59.806 26.8548C58.548 24.3871 57.4356 21.7742 55.8388 19.4516C55.2093 18.5323 54.5323 17.4677 53.7098 16.7419C53.177 16.3064 52.1125 15.3387 53.177 14.9032ZM48.8706 9.72581C48.4351 10.3065 47.7577 10.6935 47.0318 10.8871C45.4835 11.3226 43.8378 11.1774 42.2415 11.1774C41.806 11.1774 41.6125 10.8387 41.6125 10.4032V6.19355C41.6125 5.75806 41.7093 5.32258 42.1448 5.32258H45.1931C46.548 5.32258 47.9996 5.41935 48.8706 6.67742C49.4996 7.54839 49.4996 8.85484 48.8706 9.72581Z" fill="#F94008" fill-opacity="0.62"/>
        </svg>,
        children:  [
            {name:"Dashboard", to:"/salesDate",},
            {name:"Attendance", to:"/salesDate",},
            {name:"Approval", to:"/salesDate",},
            {name:"Payroll", to:"/salesDate",},
            {name:"View Beat Mapping Status", to:"/salesDate",},
            {name:"Employee Management", to:"/salesDate",},
            {name:"Voucher Approve", to:"/salesDate",},
        ]
         },
    { name: "Users", to: "/users", icon: <MdOutlineGroups2 size={20} /> },
    { name: "Inventory", to: "/segment", icon: <MdOutlineInventory2 size={20} /> },
    { name: "Beat Mapping", to: "/segment", icon: <LuMapPinHouse size={20} /> },
    { name: "Upload", to: "/segment", icon: <BsCloudUpload size={20} /> },
    { name: "Format", to: "/segment", icon: <FaFileAlt  size={20} /> },
    { name: "Target", to: "/segment", icon: <TbTargetArrow size={20} /> },
    { name: "Hierarchy", to: "/segment", icon: <TbHierarchy3 size={20} /> },
    { name: "Employee Time Line", to: "/segment", icon: <RiTimeLine size={20} /> },
    { name: "Logout", to: "/", icon: <MdLogout size={20} /> ,onClick: () => {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }},
];

  return (
    <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        {!isCollapsed && (
          <div className="sidebar-brand">
            <img src={logo} alt="Logo" className="sidebar-logo" />
          </div>
        )}
        <button onClick={toggleSidebar} className="toggle-button">
          {isCollapsed ? <RxHamburgerMenu size={20} /> : <MdMenuOpen size={24} />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        {navItems.map((item, index) => (
          <div key={index} className="nav-item-container">
            {item.children ? (
              <>
                {/* Parent item with dropdown */}
                <div className="nav-item dropdown-toggle" onClick={() => toggleDropdown(index)}>
                  {item.icon}
                  {!isCollapsed && <span>{item.name}</span>}
                  {!isCollapsed && (
                    <span className="dropdown-arrow">
                      {openDropdowns[index] ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
                    </span>
                  )}
                </div>

                {/* Dropdown Children */}
                {!isCollapsed && openDropdowns[index] && (
                    <div className="dropdown-menu">
                      {item.children.map((child, childIndex) => (
                        <NavLink key={childIndex} to={child.to} className="nav-item child-item">
                          {child.icon}
                          {!isCollapsed && <span>{child.name}</span>}
                        </NavLink>
                      ))}
                    </div>
                )}
              </>
            ) : (
              /* Single-level nav item */
              <NavLink
                to={item.to}
                className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                onClick={item.onClick ? item.onClick : null}
              >
                {item.icon}
                {!isCollapsed && <span>{item.name}</span>}
              </NavLink>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}

export default Sidebar;
