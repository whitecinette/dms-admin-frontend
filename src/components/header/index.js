import { FaUserAlt } from "react-icons/fa";
import "./style.scss";

function Header({ isCollapsed }) {
    return (
        <header className={`header ${isCollapsed ? "collapsed" : ""}`}>
            <div className="profile">
                <FaUserAlt />
            </div>
        </header>
    );
}

export default Header;
