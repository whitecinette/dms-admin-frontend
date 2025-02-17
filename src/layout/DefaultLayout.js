import { useState } from "react";
import Sidebar from "../components/sidebar"; // Import the Sidebar component
import Header from "../components/header"; // Import the header component
import { Outlet } from "react-router-dom";
import "./style.scss"; // Import global styles

function DefaultLayout() {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed);
    };

    return (
        <div className={`default-layout ${isCollapsed ? "collapsed" : ""}`}>
            <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
            <div className="main-content">
                <Header isCollapsed={isCollapsed} />
                <div className="page-content">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

export default DefaultLayout;
