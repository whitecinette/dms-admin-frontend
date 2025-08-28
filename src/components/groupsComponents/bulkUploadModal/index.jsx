import React, { useState } from "react";
import Papa from "papaparse";
import axios from "axios";
import config from "../../../config";

const BulkUploadModal = ({ isOpen, onClose }) => {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState(0);
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);

    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        setRows(res.data.length);
      },
    });
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a CSV file first");

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      const token = localStorage.getItem("authToken");
      const backendUrl = config?.backend_url;

      const res = await axios.put(
        `${backendUrl}/groups/add/upload/csv`,
        formData,
        {
          headers: {
            Authorization: token,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      alert("Upload successful!");
      console.log("Response:", res.data);
      onClose();
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed. Check console.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Bulk Upload Type Groups</h2>

        <input type="file" accept=".csv" onChange={handleFileChange} />
        {file && (
          <p>
            Selected: <b>{file.name}</b> ({rows} rows detected)
          </p>
        )}

        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary-button"
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkUploadModal;
