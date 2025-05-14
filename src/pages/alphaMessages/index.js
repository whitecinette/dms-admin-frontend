import React, { useState } from "react";
import axios from "axios";
import Papa from "papaparse";
import "./style.scss"; // Import SCSS file for styling
import downloadCSVTemplate from "../../components/downloadCSVTemplate/index.jsx";
import config from "../../config.js";

const backendUrl = config.backend_url;
const headers = [
  "Dealer Code",
  "Dealer Name",
  "Phone Number",
  "10k SP Tgt May 25",
  "10k SP Ach May 25",
  "Black Box Tgt May 25",
  "Black Box Ach May 25",
  "10k SP Tgt Q2 25",
  "10k SP Ach Q2 25",
  "Black Box Tgt Q2 25",
  "Black Box Ach Q2 25",
];

export default function AlphaMessages() {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setPreviewData([]);
    setDownloadUrl("");
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a CSV file first");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(
        `${backendUrl}/upload/AlphaMessage`,
        formData,
        {
          responseType: "blob", // for successful CSV response
          validateStatus: (status) => true, // Let us handle status manually
        }
      );

      // Check if it's an error response (not a blob but JSON)
      const contentType = res.headers["content-type"];

      if (contentType && contentType.includes("application/json")) {
        // Convert blob to text to read the error message
        const errorText = await res.data.text();
        const errorJson = JSON.parse(errorText);

        setError(errorJson.message || "Invalid file format.");
        setTimeout(() => setError(""), 3000);
        return;
      }

      // If it's a CSV, proceed
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);

      const reader = new FileReader();
      reader.onload = () => {
        Papa.parse(reader.result, {
          header: true,
          skipEmptyLines: true,
          complete: (result) => {
            setPreviewData(result.data);
          },
        });
      };
      reader.readAsText(blob);

      setSuccess("File uploaded and processed successfully.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Upload failed:", error);
      setError(
        error?.response?.data?.message ||
          error?.message ||
          "Something went wrong. Please try again."
      );
      setTimeout(() => setError(""), 3000);
    }
  };

  return (
    <div className="uploader-container">
      <h2>Dealer CSV Upload & Message Preview</h2>
      <div className="upload-box">
        <div className="action-btn">
          <button className="upload-btn" onClick={handleUpload}>
            Upload and Process
          </button>
          <button
            className="download-btn"
            onClick={() => downloadCSVTemplate(headers)}
          >
            Download CSV Format
          </button>
        </div>
        <div className="file-input">
          <input type="file" accept=".csv" onChange={handleFileChange} />
        </div>
      </div>

      {previewData.length > 0 && (
        <div className="preview-box">
          <h3>Preview:</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  {Object.keys(previewData[0]).map((key) => (
                    <th key={key}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val, j) => (
                      <td key={j}>{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {downloadUrl && (
        <div className="download-box">
          <a href={downloadUrl} download="dealer_whatsapp_messages.csv">
            Download CSV
          </a>
        </div>
      )}
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
    </div>
  );
}
