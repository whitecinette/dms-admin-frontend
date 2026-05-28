import { cloneElement, useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";

import {
  FaChartPie,
  FaFileAlt,
  FaChevronDown,
  FaUserCheck,
  FaCalendarAlt,
  FaPlane,
  FaMoneyCheckAlt,
  FaBoxOpen,
  FaClipboardList,
  FaWarehouse,
} from "react-icons/fa";

import {
  MdLogout,
  MdMenuOpen,
  MdOutlineInventory2,
  MdGroups,
  MdOutlineRoute,
  MdManageAccounts,
  MdDevices,
  MdOutlineSettings,
} from "react-icons/md";

import {
  RiPinDistanceFill,
  RiFilePaper2Line,
  RiUploadCloud2Line,
  RiBarChartGroupedLine,
  RiPriceTag3Line,
  RiShieldCheckLine,
  RiRefreshLine,
  RiTeamLine,
  RiMoneyRupeeCircleLine,
  RiDatabase2Line,
  RiBuilding4Line,
} from "react-icons/ri";

import {
  TbTargetArrow,
  TbHierarchy3,
  TbBuildingSkyscraper,
  TbIdBadge,
  TbReportMoney,
  TbMapPinCheck,
  TbUsersGroup,
} from "react-icons/tb";

import { LuTrophy, LuPackageSearch, LuChartColumnIncreasing } from "react-icons/lu";
import { BsCashCoin, BsCloudUpload } from "react-icons/bs";
import { RxHamburgerMenu } from "react-icons/rx";
import { FcGlobe } from "react-icons/fc";
import { PiTreeStructureFill } from "react-icons/pi";

import logo from "../../assets/images/company-logo.png";
import "./style.scss";

const SUB_ICON_COLORS = [
  "#2563eb",
  "#16a34a",
  "#db2777",
  "#0891b2",
  "#f97316",
  "#7c3aed",
  "#0f766e",
  "#475569",
];

const pickSubIconColor = (index) => SUB_ICON_COLORS[index % SUB_ICON_COLORS.length];

const SubItemIcon = ({ index, icon }) => {
  const color = pickSubIconColor(index);

  const element = icon
    ? cloneElement(icon, { size: 16, color })
    : <FaFileAlt size={16} color={color} />;

  return <span className="subitem-icon">{element}</span>;
};

function Sidebar({ isCollapsed, open, toggleSidebar }) {
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const role = localStorage.getItem("role");

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleDropdown = (key) => {
    if (isCollapsed && open) open();

    setOpenDropdowns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const closeOnMobile = () => {
    if (isMobile && toggleSidebar) toggleSidebar();
  };

  const navItems = useMemo(() => {
    const items = [
      {
        name: "Dashboard",
        to: "/dashboard",
        icon: <FaChartPie />,
        iconColor: "#2563eb",
      },
      {
        name: "Actor Dashboard",
        to: "/actor-dashboard",
        icon: <TbUsersGroup />,
        iconColor: "#0f766e",
      },
      {
        name: "Sales Report",
        to: "/all-reports",
        icon: <RiBarChartGroupedLine />,
        iconColor: "#16a34a",
      },
      {
        name: "Top Selling",
        to: "/self/top-selling",
        icon: <LuTrophy />,
        iconColor: "#ca8a04",
      },
      {
        name: "Extraction",
        to: "/extraction",
        icon: <LuPackageSearch />,
        iconColor: "#f97316",
      },
      {
        name: "Extraction Status",
        to: "/extraction-status-overview",
        icon: <LuChartColumnIncreasing />,
        iconColor: "#0f766e",
      },

      ...(role === "super_admin"
        ? [
            {
              name: "Sessions",
              to: "/sessions",
              icon: <MdDevices />,
              iconColor: "#7c3aed",
            },
            {
              name: "User Directory",
              to: "/user-directory",
              icon: <MdManageAccounts />,
              iconColor: "#db2777",
            },
            {
              name: "Hierarchy Manager",
              to: "/hierarchy-manager",
              icon: <PiTreeStructureFill />,
              iconColor: "#0891b2",
            },
          ]
        : []),

      {
        name: "HR",
        to: "#",
        icon: <TbUsersGroup />,
        iconColor: "#db2777",
        children: [
          { name: "Attendance", to: "/attendance", icon: <FaUserCheck /> },
          { name: "Attendance Matrix", to: "/attendance-matrix", icon: <FaCalendarAlt /> },
          { name: "Leave Application", to: "/leaveApplication", icon: <RiFilePaper2Line /> },
          { name: "Payroll", to: "/payroll", icon: <FaMoneyCheckAlt /> },
          { name: "Travel Expenses", to: "/travelExpenses", icon: <FaPlane /> },
          { name: "Expense Matrix", to: "/expense", icon: <TbReportMoney /> },
        ],
      },

      {
        name: "Field Ops",
        to: "#",
        icon: <TbMapPinCheck />,
        iconColor: "#0891b2",
        children: [
          { name: "Route Plans", to: "/routePlan", icon: <MdOutlineRoute /> },
          { name: "Market Coverage", to: "/marketCoverage", icon: <TbTargetArrow /> },
          { name: "Attendance Geo", to: "/attendance-geo-dashboard", icon: <TbMapPinCheck /> },
          { name: "Geo Tagging", to: "/geoTagging", icon: <RiPinDistanceFill /> },
        ],
      },

      {
        name: "Admin Setup",
        to: "#",
        icon: <RiTeamLine />,
        iconColor: "#7c3aed",
        children: [
          { name: "Groups", to: "/groups", icon: <MdGroups /> },
          { name: "Firms", to: "/firms", icon: <TbBuildingSkyscraper /> },
          { name: "Metadata", to: "/metadata", icon: <TbIdBadge /> },
        ],
      },

      {
        name: "Inventory",
        to: "#",
        icon: <MdOutlineInventory2 />,
        iconColor: "#0f766e",
        children: [
          { name: "Products", to: "/product", icon: <FaBoxOpen /> },
          { name: "Update Products", to: "/update/products", icon: <RiRefreshLine /> },
          { name: "Orders", to: "/orders", icon: <FaClipboardList /> },
          { name: "Stock", to: "/", icon: <FaWarehouse /> },
        ],
      },

      {
        name: "Finance",
        to: "#",
        icon: <BsCashCoin />,
        iconColor: "#ca8a04",
        children: [
          { name: "Upload Schemes", to: "/finance/upload-data", icon: <BsCloudUpload /> },
          { name: "View Schemes", to: "/finance/data", icon: <FaFileAlt /> },
          { name: "Upload Outstanding", to: "/finance/upload-vouchers", icon: <BsCloudUpload /> },
          { name: "View Outstanding", to: "/finance/vouchers", icon: <RiMoneyRupeeCircleLine /> },
        ],
      },

      {
        name: "Configuration",
        to: "#",
        icon: <MdOutlineSettings />,
        iconColor: "#475569",
        children: [
          { name: "Hierarchy", to: "/hierarchy", icon: <TbHierarchy3 /> },
          { name: "Actor Type Hierarchy", to: "/actorTypeHierarchy", icon: <PiTreeStructureFill /> },
          { name: "Add User", to: "/addUser", icon: <MdManageAccounts /> },
        ],
      },

      {
        name: "Data Tools",
        to: "#",
        icon: <RiDatabase2Line />,
        iconColor: "#334155",
        children: [
          { name: "Upload Combined", to: "/combined-upload", icon: <RiUploadCloud2Line /> },
          { name: "Product Master", to: "/product-master", icon: <RiPriceTag3Line /> },
          { name: "Sync Params", to: "/sync-dump-data", icon: <RiRefreshLine /> },
          { name: "Dealer Shop Profile", to: "/dealer-shop-profiles", icon: <RiBuilding4Line /> },
          ...(role === "super_admin"
            ? [{ name: "Data Manager", to: "/data-police", icon: <RiShieldCheckLine /> }]
            : []),
        ],
      },

      // {
      //   name: "Earth",
      //   to: "/earth",
      //   icon: <FcGlobe />,
      //   iconColor: "#16a34a",
      // },

      {
        name: "Logout",
        to: "/login",
        icon: <MdLogout />,
        iconColor: "#dc2626",
        danger: true,
        onClick: () => {
          localStorage.clear();
          window.location.href = "/login";
        },
      },
    ];

    return items;
  }, [role]);

  return (
    <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
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

      <nav className="sidebar-nav">
        {navItems.map((item, index) => {
          const isOpen = !!openDropdowns[index];

          const iconEl = cloneElement(item.icon, {
            size: 20,
            style: {
              color: item.iconColor || "#f97316",
              flexShrink: 0,
            },
          });

          if (item.children) {
            return (
              <div key={index} className="nav-item-container">
                <button
                  type="button"
                  className={`nav-item dropdown-toggle ${isOpen ? "open" : ""}`}
                  onClick={() => toggleDropdown(index)}
                  title={isCollapsed ? item.name : undefined}
                >
                  {iconEl}

                  {!isCollapsed && (
                    <>
                      <span className="nav-label">{item.name}</span>
                      <span className="dropdown-arrow">
                        <FaChevronDown size={13} />
                      </span>
                    </>
                  )}
                </button>

                {!isCollapsed && isOpen && (
                  <div className="dropdown-menu">
                    {item.children.map((child, childIndex) => (
                      <NavLink
                        key={childIndex}
                        to={child.to}
                        className={({ isActive }) =>
                          `nav-item child-item ${isActive ? "active" : ""}`
                        }
                        onClick={closeOnMobile}
                      >
                        <SubItemIcon index={childIndex} icon={child.icon} />
                        <span className="child-label">{child.name}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <div key={index} className="nav-item-container">
              <NavLink
                to={item.to}
                title={isCollapsed ? item.name : undefined}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""} ${item.danger ? "danger" : ""}`
                }
                onClick={(event) => {
                  closeOnMobile();
                  if (item.onClick) item.onClick(event);
                }}
              >
                {iconEl}
                {!isCollapsed && <span className="nav-label">{item.name}</span>}
              </NavLink>
            </div>
          );
        })}
      </nav>
    </div>
  );
}

export default Sidebar;
