import React, { useEffect, useMemo, useState } from "react";
import config from "../../config.js";
import axios from "axios";
import "./style.scss";
import downloadCSVTemplate from "../../components/downloadCSVTemplate";
import {
  FaDownload,
  FaFileUpload,
  FaEdit,
  FaSave,
  FaTimes,
  FaSearch,
} from "react-icons/fa";
import { RiDeleteBin6Line } from "react-icons/ri";
import { HiOutlineTableCells } from "react-icons/hi2";
import CustomAlert from "../../components/CustomAlert";
import HierarchyUploadPopup from "./UploadPopup/index.js";

const backendUrl = config.backend_url;
const limit = 50;

function Hierarchy() {
  const [firmList, setFirmList] = useState([]);
  const [firm, setFirm] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hierarchy, setHierarchy] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [editID, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [deleteId, setDeleteId] = useState(null);
  const [alert, setAlert] = useState(null);
  const [showUploadPopup, setShowUploadPopup] = useState(false);

  const showAlert = (type, message) => {
    setAlert({ type, message });
  };

  const getAllActorTypes = async () => {
    try {
      const res = await axios.get(
        `${backendUrl}/actorTypesHierarchy/get-all-by-admin`
      );
      const firms = res?.data?.data || [];
      setFirmList(firms);

      if (firms.length > 0) {
        setFirm(firms[0].name);
      }
    } catch (error) {
      console.log(error);
      showAlert("error", "Failed to fetch hierarchy types");
    }
  };

  const getHierarchy = async () => {
    if (!firm) return;

    try {
      const res = await axios.get(
        `${backendUrl}/hierarchy-entries/get-hierarchy-entries-for-admin`,
        {
          params: { page: currentPage, limit, hierarchy_name: firm },
        }
      );

      setHierarchy(res?.data?.data || []);
      setTotalRecords(res?.data?.totalRecords || 0);
    } catch (error) {
      console.log(error);
      showAlert("error", "Failed to fetch hierarchy entries");
    }
  };

  const handleUpload = async (selectedFirm, file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("hierarchy_name", selectedFirm);

      const response = await axios.post(
        `${backendUrl}/hierarchy-entries/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );

      if (response?.data?.success) {
        showAlert("success", "File uploaded successfully");
        getHierarchy();
        setShowUploadPopup(false);
      }
    } catch (error) {
      console.log(error);
      showAlert(
        "error",
        error?.response?.data?.message || "Failed to upload file"
      );
    }
  };

  const handleEdit = (row) => {
    setEditId(row._id);
    setEditData({ ...row });
  };

  const handleSave = async () => {
    try {
      await axios.put(
        `${backendUrl}/hierarchy-entries/edit-hierarchy-entries-by-admin/${editID}`,
        editData,
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );

      showAlert("success", "Row updated successfully");
      setEditId(null);
      setEditData({});
      getHierarchy();
    } catch (error) {
      console.log(error);
      showAlert(
        "error",
        error?.response?.data?.message || "Failed to update row"
      );
    }
  };

  const deleteRow = async () => {
    try {
      await axios.delete(
        `${backendUrl}/hierarchy-entries/delete-hierarchy-entries-by-admin/${deleteId}`,
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );

      setDeleteId(null);
      showAlert("success", "Row deleted successfully");
      getHierarchy();
    } catch (error) {
      console.log(error);
      showAlert(
        "error",
        error?.response?.data?.message || "Failed to delete row"
      );
    }
  };

  useEffect(() => {
    getAllActorTypes();
  }, []);

  useEffect(() => {
    getHierarchy();
  }, [firm, currentPage]);

  const excludedKeys = ["_id", "hierarchy_name", "__v", "createdAt", "updatedAt"];

  const tableColumns = useMemo(() => {
    if (!hierarchy.length) return [];
    return Object.keys(hierarchy[0]).filter((key) => !excludedKeys.includes(key));
  }, [hierarchy]);

  const filteredHierarchy = useMemo(() => {
    if (!search.trim()) return hierarchy;

    const q = search.toLowerCase().trim();

    return hierarchy.filter((row) =>
      tableColumns.some((key) =>
        String(row[key] ?? "")
          .toLowerCase()
          .includes(q)
      )
    );
  }, [hierarchy, search, tableColumns]);

  const totalPages = Math.max(1, Math.ceil(totalRecords / limit));

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  return (
    <div className="hierarchy-page">
      {alert && (
        <CustomAlert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <div className="page-topbar">
        <div>
          <h1>Hierarchy</h1>
          <p>Manage uploaded hierarchy entries, edit records, and handle bulk imports.</p>
        </div>
      </div>

      <div className="stats-strip">
        <div className="stat-card">
          <div className="stat-label">Selected Type</div>
          <div className="stat-value small">{firm || "-"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Records</div>
          <div className="stat-value">{totalRecords}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Current Page</div>
          <div className="stat-value">{currentPage}</div>
        </div>
      </div>

      <div className="content-card">
        <div className="toolbar">
          <div className="toolbar-left">
            <div className="field-group compact">
              <label>Hierarchy Type</label>
              <select
                value={firm || ""}
                onChange={(e) => {
                  setCurrentPage(1);
                  setFirm(e.target.value);
                }}
              >
                {firmList.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="search-box">
              <FaSearch />
              <input
                type="text"
                placeholder="Search visible rows..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="toolbar-actions">
            <button
              className="secondary-btn"
              onClick={() => setShowUploadPopup(true)}
            >
              <FaFileUpload />
              Upload Bulk CSV
            </button>

            <button
              className="accent-btn"
              onClick={() => downloadCSVTemplate(["hierarchy_name"])}
            >
              <FaDownload />
              Download CSV Format
            </button>
          </div>
        </div>

        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th style={{ width: "90px" }}>S.No</th>
                {tableColumns.map((key) => (
                  <th key={key}>{key.replaceAll("_", " ")}</th>
                ))}
                <th style={{ width: "140px" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredHierarchy.length === 0 ? (
                <tr>
                  <td colSpan={tableColumns.length + 2}>
                    <div className="empty-state">
                      <HiOutlineTableCells size={42} />
                      <h3>No hierarchy data found</h3>
                      <p>
                        {search
                          ? "Try another search term."
                          : "No records available for the selected hierarchy type."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredHierarchy.map((row, index) => (
                  <tr key={row._id || index}>
                    <td>{(currentPage - 1) * limit + index + 1}</td>

                    {tableColumns.map((key) => (
                      <td key={key}>
                        {editID === row._id ? (
                          <input
                            className="table-input"
                            type="text"
                            value={editData[key] || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                [key]: e.target.value,
                              })
                            }
                          />
                        ) : (
                          <span className="cell-text">{row[key] || "-"}</span>
                        )}
                      </td>
                    ))}

                    <td>
                      <div className="action-group">
                        {editID === row._id ? (
                          <>
                            <button
                              className="icon-btn success"
                              onClick={handleSave}
                              title="Save"
                            >
                              <FaSave />
                            </button>
                            <button
                              className="icon-btn"
                              onClick={() => {
                                setEditId(null);
                                setEditData({});
                              }}
                              title="Cancel"
                            >
                              <FaTimes />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="icon-btn primary"
                              onClick={() => handleEdit(row)}
                              title="Edit"
                            >
                              <FaEdit />
                            </button>
                            <button
                              className="icon-btn danger"
                              onClick={() => setDeleteId(row._id)}
                              title="Delete"
                            >
                              <RiDeleteBin6Line />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar">
          <div className="pagination-info">
            Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
          </div>

          <div className="pagination-actions">
            <button
              onClick={prevPage}
              className="page-btn"
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <button
              onClick={nextPage}
              className="page-btn"
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {deleteId !== null && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal-card small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Row</h3>
              <button className="icon-btn" onClick={() => setDeleteId(null)}>
                <FaTimes />
              </button>
            </div>

            <div className="modal-body">
              <p>
                Are you sure you want to delete this hierarchy entry? This action
                cannot be undone.
              </p>
            </div>

            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setDeleteId(null)}>
                Cancel
              </button>
              <button className="danger-btn" onClick={deleteRow}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showUploadPopup && (
        <HierarchyUploadPopup
          firms={firmList}
          onClose={() => setShowUploadPopup(false)}
          onUpload={handleUpload}
        />
      )}
    </div>
  );
}

export default Hierarchy;