import { useState, useEffect } from "react";
import Sidebar from "../components/sidebar";
import Header from "../components/header";
import { Outlet } from "react-router-dom";
import "./style.scss";

function DefaultLayout() {
    const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 1024);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024); // Track screen size

    const toggleSidebar = () => {
        setIsCollapsed(prevState => !prevState);
    };

    // Handle window resize to detect if it's mobile view
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (mobile) setIsCollapsed(true); // Auto-collapse sidebar on small screens
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <div className={`default-layout ${isCollapsed ? "collapsed" : isMobile ? "sidebar-open" : ""}`}>
            <Sidebar isCollapsed={isCollapsed} open={()=>setIsCollapsed(false)} toggleSidebar={toggleSidebar} />

            {/* Show overlay & blur ONLY on small screens */}
            {isMobile && !isCollapsed && <div className="overlay" onClick={() => setIsCollapsed(true)}></div>}

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
