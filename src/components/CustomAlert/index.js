import {
  FaCheckCircle,
  FaExclamationCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaTimes,
} from "react-icons/fa";
import "./style.scss";

const CustomAlert = ({ type, message, onClose }) => {
  const getIcon = () => {
    switch (type) {
      case "success":
        return <FaCheckCircle className="alert-icon success" />;
      case "error":
        return <FaExclamationCircle className="alert-icon error" />;
      case "warning":
        return <FaExclamationTriangle className="alert-icon warning" />;
      default:
        return <FaInfoCircle className="alert-icon info" />;
    }
  };

  return (
    <div className={`custom-alert ${type}`} role="alert">
      <div className="alert-content">
        <span className="alert-icon">{getIcon()}</span>
        <span className="alert-message">{message}</span>
        <button
          className="close-btn"
          onClick={onClose}
          aria-label="Close alert"
        >
          <FaTimes />
        </button>
      </div>
    </div>
  );
};

export default CustomAlert;
