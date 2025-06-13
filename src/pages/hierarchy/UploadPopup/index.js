import React, { useState } from "react";
import { FaUpload, FaTimes } from "react-icons/fa";
import "./style.scss";

function HierarchyUploadPopup({ firms, onClose, onUpload }) {
  const [selectedFirm, setSelectedFirm] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const renderError = () => {
    if (!error) return null;

    if (typeof error === "string") {
      return <p className="error-message">{error}</p>;
    }

    if (error.type === "invalidCodes") {
      return (
        <div className="invalid-codes">
          <h3>Invalid codes found. Please create their IDs first.</h3>
          {error.data.map((item, index) => (
            <div key={index} className="invalid-group">
              {Object.entries(item).map(([type, codes]) => (
                <div key={type} className="code-group">
                  <h4>{type.toUpperCase()}:</h4>
                  <ul>
                    {codes.map((code, i) => (
                      <li key={i}>{code}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }

    if (error.type === "headerMismatch") {
      return (
        <div className="header-mismatch">
          <h3>CSV Headers Do Not Match</h3>
          <div className="headers-comparison">
            <div className="expected-headers">
              <h4>Expected Headers:</h4>
              <ul>
                {error.expectedHeaders.map((header, i) => (
                  <li key={i}>{header}</li>
                ))}
              </ul>
            </div>
            <div className="received-headers">
              <h4>Received Headers:</h4>
              <ul>
                {error.receivedHeaders.map((header, i) => (
                  <li
                    key={i}
                    className={
                      error.expectedHeaders.includes(header)
                        ? "valid"
                        : "invalid"
                    }
                  >
                    {header}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return <p className="error-message">An unexpected error occurred</p>;
  };

  const handleUpload = async () => {
    if (!selectedFirm || !file) {
      setError("Please select both firm and file");
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(selectedFirm, file);
    } catch (error) {
      console.log("Error updating hierarchy", error);
      if (error.response?.data?.invalidCodes) {
        setError({
          type: "invalidCodes",
          data: error.response.data.invalidCodes,
        });
      } else if (error.response?.data?.expectedHeaders) {
        setError({
          type: "headerMismatch",
          expectedHeaders: error.response.data.expectedHeaders,
          receivedHeaders: error.response.data.receivedHeaders,
        });
      } else {
        setError(
          error.response?.data?.message || "Upload failed. Please try again."
        );
      }
    }
    setIsUploading(false);
  };

  return (
    <div className="hierarchy-upload-popup-overlay">
      <div className="hierarchy-upload-popup">
        <div className="hierarchy-upload-popup-header">
          <h2>Upload Hierarchy Data</h2>
          <button className="close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="hierarchy-upload-popup-content">
          <div className="form-group">
            <label>Select Firm</label>
            <select
              value={selectedFirm}
              onChange={(e) => setSelectedFirm(e.target.value)}
            >
              <option value="">Choose a firm</option>
              {firms.map((firm) => (
                <option key={firm.name} value={firm.name}>
                  {firm.name}
                </option>
              ))}
            </select>
          </div>

          <div className="file-upload-section">
            <input
              type="file"
              id="csv-file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files[0])}
              hidden
            />
            <label htmlFor="csv-file" className="file-upload-label">
              <FaUpload />
              <span>{file ? file.name : "Choose CSV file"}</span>
            </label>
          </div>

          {error && <div className="error-section">{renderError()}</div>}
        </div>

        <div className="hierarchy-upload-popup-footer">
          <button
            className="cancel-btn"
            onClick={onClose}
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            className="upload-btn"
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default HierarchyUploadPopup;
