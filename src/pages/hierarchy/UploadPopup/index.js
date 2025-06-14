import React, { useState } from "react";
import { FaUpload, FaTimes } from "react-icons/fa";
import { CSVLink } from "react-csv";
import "./style.scss";

function HierarchyUploadPopup({ firms, onClose, onUpload }) {
  const [selectedFirm, setSelectedFirm] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const prepareInvalidCodesCSV = (invalidCodes) => {
    const csvData = [];

    invalidCodes.forEach((item) => {
      Object.entries(item).forEach(([type, codes]) => {
        codes.forEach((code) => {
          const position = type.toLowerCase();
          const role =
            position === "dealer" || position === "mdd"
              ? position.toLowerCase()
              : "employee";

          csvData.push({
            code: code,
            name: "", // to be filled by user
            position: position,
            role: role,
            status: "active",
          });
        });
      });
    });

    return csvData;
  };

  const renderError = () => {
    if (!error) return null;

    if (typeof error === "string") {
      return <p className="error-message">{error}</p>;
    }

    if (error.type === "invalidCodes") {
      const csvData = prepareInvalidCodesCSV(error.data);
      const headers = [
        { label: "code", key: "code" },
        { label: "name", key: "name" },
        { label: "position", key: "position" },
        { label: "role", key: "role" },
        { label: "status", key: "status" },
      ];

      return (
        <div className="invalid-codes">
          <h3>Invalid codes found. Please create their IDs first.</h3>
          <div className="download-section">
            <p>
              Please download and fill this template to create the missing
              users:
            </p>
            <CSVLink
              data={csvData}
              headers={headers}
              filename={"missing-users-template.csv"}
              className="download-csv-btn"
            >
              Download Template CSV
            </CSVLink>
          </div>
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
    <div className="hierarchy-upload-popup-overlay" onClick={onClose}>
      <div className="hierarchy-upload-popup" onClick={(e)=>e.stopPropagation()}>
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
