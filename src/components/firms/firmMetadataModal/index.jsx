import React, { useEffect, useState } from "react";
import axios from "axios";
import config from "../../../config";

const FirmMetadataModal = ({ firmCode, closeModal }) => {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newField, setNewField] = useState({ key: "", value: "" });

  const fetchMetadata = async () => {
    const backendUrl = config?.backend_url;
    const token = localStorage.getItem("authToken");
    try {
      setLoading(true);
      const res = await axios.get(`${backendUrl}/firm-metadata/${firmCode}`, {
        headers: { Authorization: token },
      });
      setMetadata(res.data.data || {});
    } catch (err) {
      console.error("❌ Error fetching metadata:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (key, value) => {
    setMetadata({ ...metadata, [key]: value });
  };

  const handleAddField = () => {
    if (!newField.key) return;
    setMetadata({ ...metadata, [newField.key]: newField.value });
    setNewField({ key: "", value: "" });
  };

  const handleSave = async () => {
    const backendUrl = config?.backend_url;
    const token = localStorage.getItem("authToken");
    try {
      await axios.put(`${backendUrl}/upsert-firm-metadata`, metadata, {
        headers: { Authorization: token },
      });
      alert("Metadata saved successfully");
      closeModal();
    } catch (err) {
      console.error("❌ Save error:", err);
      alert("Failed to save metadata");
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, [firmCode]);

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <h2>Firm Metadata - {firmCode}</h2>

        {loading && <p>Loading...</p>}
        {!loading && metadata && (
          <>
        {Object.entries(metadata)
        .filter(([key]) => !["_id", "__v", "firmCode"].includes(key))
        .map(([key, value]) => (
            <div key={key} className="field-row">
            <label>{key}</label>
            {key === "createdAt" || key === "updatedAt" ? (
                <input type="text" value={value} readOnly className="readonly-input" />
            ) : (
                <input
                type="text"
                value={value}
                onChange={(e) => handleFieldChange(key, e.target.value)}
                />
            )}
            </div>
        ))}



            <div className="new-field-row">
              <input
                type="text"
                placeholder="New Field Key"
                value={newField.key}
                onChange={(e) => setNewField({ ...newField, key: e.target.value })}
              />
              <input
                type="text"
                placeholder="Value"
                value={newField.value}
                onChange={(e) => setNewField({ ...newField, value: e.target.value })}
              />
              <button onClick={handleAddField}>+ Add Field</button>
            </div>

            <div className="modal-actions">
              <button className="secondary-button" onClick={closeModal}>
                Cancel
              </button>
              <button className="primary-button" onClick={handleSave}>
                Save
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FirmMetadataModal;
