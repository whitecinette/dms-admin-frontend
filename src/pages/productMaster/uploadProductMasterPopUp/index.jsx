import React, { useRef, useState } from "react";
import config from "../../../config";
import "./style.scss";

const backendUrl = config.backend_url;

function UploadProductMasterPopup({ close, refresh }) {
  const fileRef = useRef();
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    const file = fileRef.current.files[0];
    if (!file) return alert("Select file first");

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);

    try {
      const res = await fetch(
        `${backendUrl}/product-master/upload`,
        {
          method: "POST",
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
          body: formData,
        }
      );

      const result = await res.json();

      if (!res.ok) {
        alert(result.message);
      } else {
        alert("Upload successful");
        refresh();
        close();
      }
    } catch {
      alert("Upload failed");
    }

    setLoading(false);
  };

  return (
    <div className="upload-overlay" onClick={close}>
      <div
        className="upload-container"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Upload Product Master</h3>

        <input
          type="file"
          accept=".csv, .xlsx"
          ref={fileRef}
        />

        <button onClick={handleUpload}>
          {loading ? "Uploading..." : "Upload"}
        </button>
      </div>
    </div>
  );
}

export default UploadProductMasterPopup;
