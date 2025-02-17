import { NavLink } from "react-router-dom";
import { FaChartPie } from "react-icons/fa";
import { IoCartOutline } from "react-icons/io5";
import { GoGraph } from "react-icons/go";
import { LuPickaxe, LuTableColumnsSplit } from "react-icons/lu";
import { MdOutlineGroups2, MdLogout } from "react-icons/md";
import { IoMdCloseCircle } from "react-icons/io";
import { RxHamburgerMenu } from "react-icons/rx";
import logo from "../../assets/images/78abd575-1f96-4484-8e7f-189ac96ce2dc-removebg-preview.png";
import "./style.scss";

function Sidebar({ isCollapsed, toggleSidebar }) {
    const navItems = [
        { name: "Dashboard", to: "/dashboard", icon: <FaChartPie size={20} /> },
        { name: "Orders", to: "/orders", icon: <IoCartOutline size={20} /> },
        { name: "Sales Report", to: "/salesData", icon: <GoGraph size={20} /> },
        { name: "Extraction", to: "/extraction", icon: <LuPickaxe size={20} /> },
        { name: "Segment", to: "/segment", icon: <LuTableColumnsSplit size={20} /> },
        { name: "Users", to: "/users", icon: <MdOutlineGroups2 size={20} /> },
        { name: "Logout", to: "/logout", icon: <MdLogout size={20} /> },
    ];

    return (
        <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
            {/* Sidebar Header with Logo & Title */}
            <div className="sidebar-header">
                {!isCollapsed && (
                    <div className="sidebar-brand">
                        <img src={logo} alt="Logo" className="sidebar-logo" />
                        <span className="sidebar-title">Siddha Connect</span>
                    </div>
                )}
                <button onClick={toggleSidebar} className="toggle-button">
                    {isCollapsed ? <RxHamburgerMenu size={20} /> : <IoMdCloseCircle size={24} />}
                </button>
            </div>

            {/* Navigation Links */}
            <nav className="sidebar-nav">
                {navItems.map((item, index) => (
                    <NavLink key={index} to={item.to} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                        {item.icon}
                        {!isCollapsed && <span>{item.name}</span>}
                    </NavLink>
                ))}
            </nav>
        </div>
    );
}

export default Sidebar;
