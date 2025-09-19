import React, { useState } from "react";
import Papa from "papaparse"; // for CSV parsing
import axios from "axios";
import config from "../../config";
import { X, UploadCloud } from "lucide-react";
import "./style.scss";

const backendUrl = config.backend_url;

const MddWiseTargetsUploadModal = ({ isOpen, onClose, onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  // Handle file selection & preview
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    if (!selectedFile.name.endsWith(".csv")) {
      setErrors(["Only CSV files allowed"]);
      return;
    }
    setFile(selectedFile);
    setErrors([]);
    setResult(null);

    // Parse CSV locally
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        setPreview({
          rows: res.data.length,
          columns: res.meta.fields,
        });
      },
    });
  };

  // Upload to backend
  const handleUpload = async () => {
    if (!file) {
      setErrors(["Please select a file first"]);
      return;
    }

    setUploading(true);
    setErrors([]);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    const token = localStorage.getItem("authToken");

    try {
        
        const res = await axios.post(`${backendUrl}/upload/mdd-wise-targets`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: token,
          },
        });
        
      setResult({ success: true, message: res.data.message });
      onUploadSuccess?.(); // refresh table outside
    } catch (err) {
      const apiErrors = err.response?.data?.errors || [err.response?.data?.error || "Upload failed"];
      setErrors(apiErrors);
      setResult({ success: false, message: "Upload failed" });
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="upload-modal-overlay">
      <div className="upload-modal">
        <div className="modal-header">
          <h3>Upload MDD Wise Targets</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
          />

          {preview && (
            <div className="preview-box">
              <p><b>Rows:</b> {preview.rows}</p>
              <p><b>Columns:</b> {preview.columns.join(", ")}</p>
            </div>
          )}

          {uploading && <p className="loader">Uploading...</p>}

          {errors.length > 0 && (
            <div className="error-box">
              <h4>Errors:</h4>
              <ul>
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          {result && (
            <p className={result.success ? "success-msg" : "error-msg"}>
              {result.message}
            </p>
          )}
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button
            className="upload-btn"
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            <UploadCloud size={16} /> {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MddWiseTargetsUploadModal;
