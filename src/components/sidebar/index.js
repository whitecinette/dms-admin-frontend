import { cloneElement, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FaChartPie,
  FaFileAlt,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import { GoGraph } from "react-icons/go";
import { LuPickaxe } from "react-icons/lu";
import {
  MdOutlineGroups2,
  MdLogout,
  MdMenuOpen,
  MdOutlineInventory2,
} from "react-icons/md";
import { BsCashCoin } from "react-icons/bs";
import { RxHamburgerMenu } from "react-icons/rx";
import { BsCloudUpload } from "react-icons/bs";
import { TbTargetArrow, TbHierarchy3 } from "react-icons/tb";
import { RiTimeLine, RiPinDistanceFill } from "react-icons/ri";
import logo from "../../assets/images/company-logo.png";
import "./style.scss";
import { FcGlobe } from "react-icons/fc";
import { FaUserCheck, FaCalendarAlt, FaPlane, FaMoneyCheckAlt } from "react-icons/fa";
import { MdGroups, MdOutlineRoute, MdManageAccounts } from "react-icons/md";
import { TbMapPinCheck } from "react-icons/tb";
import { RiFilePaper2Line } from "react-icons/ri";
import { TbBuildingSkyscraper } from "react-icons/tb";
import { TbIdBadge } from "react-icons/tb";
import { TbReportMoney } from "react-icons/tb";
import { MdOutlineTrackChanges } from "react-icons/md";
import { MdDevicesOther } from "react-icons/md"; // sleek device icon
// OR a cooler one if you prefer:
import { BiChip } from "react-icons/bi"; // gives a tech feel
import { RiWifiOffLine } from "react-icons/ri"; // network/sessions vibe
import { RiNodeTree } from "react-icons/ri";
import { RiUploadCloud2Line } from "react-icons/ri";
import { RiBarChartGroupedLine } from "react-icons/ri";
import { RiPriceTag3Line } from "react-icons/ri";


/** Helper: subtle professional colors for sub-item icons */
const SUB_ICON_COLORS = [
  "#6B7280", // gray-500
  "#4B5563", // gray-600
  "#64748B", // slate-500
  "#475569", // slate-600
  "#0F766E", // teal-700 (muted but distinct)
  "#334155", // slate-700
];

/** Helper: pick a subtle color for child icon by index */
const pickSubIconColor = (i) => SUB_ICON_COLORS[i % SUB_ICON_COLORS.length];

/** Helper: a small, consistent sub-item icon (defaults to FaFileAlt) */
const SubItemIcon = ({ index, icon }) => {
  const color = pickSubIconColor(index);
  const element = icon ? cloneElement(icon, { size: 16, color }) : <FaFileAlt size={16} color={color} />;
  return <span className="subitem-icon">{element}</span>;
};

function Sidebar({ isCollapsed, open, toggleSidebar }) {
  const navigate = useNavigate();
  const [openDropdowns, setOpenDropdowns] = useState({});
  const role = localStorage.getItem("role");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const toggleDropdown = (index) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const navItems = useMemo(() => ([
    {
      name: "Dashboard",
      to: "/dashboard",
      icon: <FaChartPie size={20} />,
    },
    {
      name: "Sales Dashboard",
      to: "/salesDashboard",
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 53 62"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M26.2083 2.90045L49.9167 16.8465V44.8201L26.2083 58.7662L2.5 44.8201V16.8465L26.2083 2.90045Z"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <path
            d="M26.2083 27.75V40.0834M38.5417 21.5834V40.0834M13.875 33.9167V40.0834"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    { name: "Extraction", to: "/extraction", icon: <LuPickaxe size={20} /> },
    { name: "GFK", to: "/", icon: <GoGraph size={20} /> },
    {
      name: "HR",
      to: "#",
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 60 42"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M58.7419 33.871H1.25806C0.580645 33.871 0 34.4516 0 35.129V39.8715C0 40.5484 0.580645 41.1295 1.25806 41.1295H58.7419C59.4189 41.1295 60 40.5489 60 39.8715V35.129C60 34.4516 59.4194 33.871 58.7419 33.871Z" fill="currentColor" />
          <path d="M1.30645 28.0645H7.06452C7.8871 28.0645 8.70968 27.2419 8.70968 26.4194V18C8.70968 17.1774 9.19355 16.4516 10.0161 16.4516H16.5968C17.4194 16.4516 17.9516 17.1774 17.9516 18V26.4677C17.9516 27.2903 18.7258 28.1124 19.5484 28.1124H25.3548C26.1774 28.1124 26.6613 27.2903 26.6613 26.4677V1.20968C26.6613 0.387097 26.1774 0 25.3548 0H19.5484C18.7258 0 17.9516 0.435484 17.9516 1.20968V8.12903C17.9516 8.95161 17.4194 9.67742 16.5968 9.67742H10.0161C9.19355 9.67742 8.70968 8.95161 8.70968 8.12903V1.20968C8.70968 0.387097 7.8871 0 7.06452 0H1.30645C0.483871 0 0 0.435484 0 1.20968V26.4194C0 27.2419 0.483871 28.0645 1.30645 28.0645Z" fill="currentColor" />
          <path d="M53.177 14.9032C53.612 14.7581 53.9512 14.5645 54.2899 14.371C55.4507 13.6452 56.3706 12.7258 57.048 11.6129C57.7249 10.5 58.0641 9.14516 58.0641 7.59677C58.0641 5.80645 57.6286 4.30645 56.7577 3.04839C55.8867 1.79032 54.7254 1.06452 53.3222 0.580646C51.9189 0.0967746 49.8383 0 47.177 0H33.4351C33.0001 0 32.4189 0.0967744 32.4189 0.532258V27.1452C32.4189 27.5806 32.9996 28.0645 33.4351 28.0645H40.6448C41.0802 28.0645 41.6609 27.5806 41.6609 27.1452V17.2258C41.6609 16.7903 41.9028 16.4516 42.2904 16.4516C43.0646 16.4516 43.742 16.6452 44.371 17.0806C44.8549 17.4194 45.3388 18.1452 45.9194 19.2581L50.3227 27.5806C50.4678 27.8226 50.7098 28.0645 51.0001 28.0645H59.1291C59.7097 28.0645 60.0968 27.3871 59.806 26.8548C58.548 24.3871 57.4356 21.7742 55.8388 19.4516C55.2093 18.5323 54.5323 17.4677 53.7098 16.7419C53.177 16.3064 52.1125 15.3387 53.177 14.9032ZM48.8706 9.72581C48.4351 10.3065 47.7577 10.6935 47.0318 10.8871C45.4835 11.3226 43.8378 11.1774 42.2415 11.1774C41.806 11.1774 41.6125 10.8387 41.6125 10.4032V6.19355C41.6125 5.75806 41.7093 5.32258 42.1448 5.32258H45.1931C46.548 5.32258 47.9996 5.41935 48.8706 6.67742C49.4996 7.54839 49.4996 8.85484 48.8706 9.72581Z" fill="currentColor" />
        </svg>
      ),
      onClick: () => open(),
      children: [
    { name: "Attendance", to: "/attendance", icon: <FaUserCheck /> },
    { name: "Attendance Matrix", to: "/attendance-matrix", icon: <FaCalendarAlt /> },
    { name: "Leave Application", to: "/leaveApplication", icon: <RiFilePaper2Line /> },
    { name: "Travel Expenses", to: "/travelExpenses", icon: <FaPlane /> },
    { name: "Payroll", to: "/payroll", icon: <FaMoneyCheckAlt /> },
    { name: "Route Plans", to: "/routePlan", icon: <MdOutlineRoute /> },
    { name: "Market Coverage", to: "/marketCoverage", icon: <TbTargetArrow /> },
    { name: "Employee Management", to: "/salesDate", icon: <MdManageAccounts /> },
    { name: "Voucher", to: "/salesDate", icon: <FaFileAlt /> },
    { name: "Attendance Geo Dashboard", to: "/attendance-geo-dashboard", icon: <TbMapPinCheck /> },
    { name: "Groups", to: "/groups", icon: <MdGroups /> },
    { name: "Firms", to: "/firms", icon: <TbBuildingSkyscraper /> },
    { name: "Metadata", to: "/metadata", icon: <TbIdBadge /> },
    { name: "Expense Matrix", to: "/expense", icon: <TbReportMoney  /> },

      ],
    },
    {
      name: "Users",
      to: "#",
      icon: <MdOutlineGroups2 size={20} />,
      children: [
        { name: "Dealer", to: "/dealer" },
        { name: "Employee", to: "/employee" },
        { name: "MDD", to: "/mdd" },
        ...(role === "super_admin" ? [{ name: "Admin", to: "/admin" }] : []),
      ],
      onClick: () => open(),
    },
    {
      name: "Inventory",
      to: "#",
      icon: <MdOutlineInventory2 size={20} />,
      onClick: () => open(),
      children: [
        { name: "Products", to: "/product" },
        { name: "Update Products", to: "/update/products" },
        { name: "Orders", to: "/orders" },
        { name: "Stock", to: "/" },
      ],
    },
    {
      name: "Finance",
      to: "#",
      icon: <BsCashCoin size={20} />,
      onClick: () => open(),
      children: [
        { name: "Upload Schemes", to: "/finance/upload-data", icon: <BsCloudUpload /> },
        { name: "View Schemes", to: "/finance/data", icon: <FaFileAlt /> },
        { name: "Upload Outstanding Data", to: "/finance/upload-vouchers", icon: <BsCloudUpload /> },
        { name: "View Outstanding Data", to: "/finance/vouchers", icon: <FaFileAlt /> },
      ],
    },
    { name: "Target", to: "/segment", icon: <TbTargetArrow size={20} /> },
    {
      name: "Employee Time Line",
      to: "/segment",
      icon: <RiTimeLine size={20} />,
    },
    {
      name: "Geo Tagging",
      to: "/geoTagging",
      icon: <RiPinDistanceFill size={20} />,
    },
    {
      name: "Configuration",
      to: "#",
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 60 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M58.1773 49.2858H50.8928V53.5714H58.1773C59.184 53.5714 60 52.7554 60 51.7487V51.1084C60 50.1019 59.184 49.2858 58.1773 49.2858Z" fill="currentColor" />
          <path d="M0 51.1084V51.7487C0 52.7554 0.816094 53.5714 1.82273 53.5714H35.8929V49.2858H1.82273C0.816094 49.2858 0 50.1019 0 51.1084Z" fill="currentColor" />
          <path d="M44.0342 42.8571H42.7515C40.7383 42.8571 39.1072 44.4893 39.1072 46.5014V56.3556C39.1072 58.3677 40.7383 59.9999 42.7515 59.9999H44.0342C46.0473 59.9999 47.6785 58.3677 47.6785 56.3556V46.5014C47.6785 44.4893 46.0473 42.8571 44.0342 42.8571Z" fill="currentColor" />
          <path d="M58.1773 27.855H25.0928V32.1408H58.1774C59.184 32.1408 60.0001 31.3247 60.0001 30.3182V29.6779C60 28.6712 59.1839 27.855 58.1773 27.855Z" fill="currentColor" />
          <path d="M1.82273 32.1408H10.0928V27.855H1.82273C0.816094 27.855 0 28.6712 0 29.6777V30.3181C0 31.3246 0.816094 32.1408 1.82273 32.1408Z" fill="currentColor" />
          <path d="M16.9514 21.4265C14.9384 21.4265 13.3071 23.0588 13.3071 25.0707V34.925C13.3071 36.9372 14.9384 38.5693 16.9514 38.5693H18.2342C20.2473 38.5693 21.8785 36.9372 21.8785 34.925V25.0707C21.8785 23.0588 20.2472 21.4265 18.2342 21.4265H16.9514Z" fill="currentColor" />
          <path d="M1.82273 10.7142H27.7629V6.42856H1.82273C0.816094 6.42856 0 7.24465 0 8.25129V8.89161C0 9.89813 0.816094 10.7142 1.82273 10.7142Z" fill="currentColor" />
          <path d="M58.1772 6.42856H42.7629V10.7142H58.1773C59.184 10.7142 60 9.89813 60 8.89149V8.25118C59.9999 7.24465 59.1838 6.42856 58.1772 6.42856Z" fill="currentColor" />
          <path d="M34.6216 17.1429H35.9043C37.9174 17.1429 39.5486 15.5107 39.5486 13.4986V3.6443C39.5486 1.63219 37.9174 0 35.9043 0H34.6216C32.6084 0 30.9773 1.63219 30.9773 3.6443V13.4985C30.9772 15.5107 32.6084 17.1429 34.6216 17.1429Z" fill="currentColor" />
        </svg>
      ),
      onClick: () => open(),
      children: [
        { name: "Hierarchy", to: "/hierarchy", icon: <TbHierarchy3 /> },
        { name: "Actor Type Hierarchy", to: "/actorTypeHierarchy", icon: <TbHierarchy3 /> },
        { name: "Add User", to: "/addUser", icon: <FaFileAlt /> },
        { name: "Alpha Messages", to: "/alphaMessages", icon: <FaFileAlt /> },
        { name: "MDD Wise Targets", to: "/mdd-wise-targets", icon: <MdOutlineTrackChanges /> },
      ],
    },

    // ✅ Add here
    ...(role === "super_admin"
      ? [
          {
            name: "Sessions",
            to: "/super-admin/sessions",
            icon: <MdDevicesOther size={20} />,
          },
        ]
      : []),
    { name: "Earth", to: "/earth", icon: <FcGlobe size={20} /> },
    {
      name: "Dealer Hierarchy",
      to: "/dealer-hierarchy",
      icon: <RiNodeTree size={20} />,
    },
      {
      name: "Upload Combined",
      to: "/combined-upload",
      icon: <RiUploadCloud2Line size={20} />,
    },
    {
      name: "Sales Report V2",
      to: "/all-reports",
      icon: <RiBarChartGroupedLine size={20} />,
    },
    {
      name: "Product Master",
      to: "/product-master",
      icon: <RiPriceTag3Line size={20} />,
    },
    {
      name: "Logout",
      to: "/",
      icon: <MdLogout size={20} />,
      onClick: () => {
        localStorage.clear();
        window.location.href = "/login";
      },
    },
  ]), [open, role]);

  return (
    <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        {!isCollapsed && (
          <div className="sidebar-brand">
            <img src={logo} alt="Logo" className="sidebar-logo" />
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="toggle-button"
          aria-label={isCollapsed ? "Open sidebar" : "Close sidebar"}
        >
          {isCollapsed ? <RxHamburgerMenu size={20} /> : <MdMenuOpen size={24} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item, index) => {
          const isOpen = !!openDropdowns[index];
          const iconEl = cloneElement(item.icon, {
            size: 20,
            style: { color: "rgba(249, 64, 8, 0.62)", flexShrink: 0 },
          });

          return (
            <div key={index} className="nav-item-container">
              {item.children ? (
                <>
                  <div
                    className={`nav-item dropdown-toggle ${isOpen ? "open" : ""}`}
                    onClick={() => toggleDropdown(index)}
                    role="button"
                    tabIndex={0}
                  >
                    {item.to !== "#" ? (
                      <NavLink
                        to={item.to}
                        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                        onClick={item.onClick}
                      >
                        {iconEl}
                        {!isCollapsed && <span className="nav-label">{item.name}</span>}
                        {!isCollapsed && (
                          <span className={`dropdown-arrow ${isOpen ? "rotated" : ""}`}>
                            {isOpen ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
                          </span>
                        )}
                      </NavLink>
                    ) : (
                      <div className="nav-item" onClick={item.onClick} style={{ cursor: "pointer" }}>
                        {iconEl}
                        {!isCollapsed && <span className="nav-label">{item.name}</span>}
                        {!isCollapsed && (
                          <span className={`dropdown-arrow ${isOpen ? "rotated" : ""}`}>
                            {isOpen ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {!isCollapsed && isOpen && (
                    <div className="dropdown-menu">
                      {item.children.map((child, childIndex) => (
                        <NavLink
                          key={childIndex}
                          to={child.to}
                          className="nav-item child-item"
                          onClick={isMobile ? toggleSidebar : undefined}
                        >
                          <SubItemIcon index={childIndex} icon={child.icon} />
                          <span className="child-label">{child.name}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <NavLink
                  to={item.to}
                  className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                  onClick={(event) => {
                    if (isMobile) toggleSidebar();
                    if (item.onClick) item.onClick(event);
                  }}
                >
                  {iconEl}
                  {!isCollapsed && <span className="nav-label">{item.name}</span>}
                </NavLink>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

export default Sidebar;
