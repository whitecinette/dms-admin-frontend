import React, { useEffect, useState } from "react";
import config from "../../config.js";
import axios from "axios";
import "./style.scss";
import downloadCSVTemplate from "../../components/downloadCSVTemplate";
import { FaDownload, FaFileUpload } from "react-icons/fa";
import { FaEdit, FaSave, FaTimes } from "react-icons/fa";
import { RiDeleteBin6Line } from "react-icons/ri";
import CustomAlert from "../../components/CustomAlert";
import HierarchyUploadPopup from "./UploadPopup/index.js";

const backendUrl = config.backend_url;

function Hierarchy() {
  const [firmList, setFirmList] = useState([]);
  const [firm, setFirm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hierarchy, setHierarchy] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [editID, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [deleteId, setDeleteId] = useState(null);
  const limit = 50;
  const [alert, setAlert] = useState(null);
  const [showUploadPopup, setShowUploadPopup] = useState(false);

  const handleUpload = async (selectedFirm, file) => {
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

    if (response.data.success) {
      setAlert({
        type: "success",
        message: "File uploaded successfully",
      });
      getHierarchy();
      setShowUploadPopup(false);
    }
  };

  const getAllActorTypes = async () => {
    try {
      const res = await axios.get(
        `${backendUrl}/actorTypesHierarchy/get-all-by-admin`
      );
      setFirmList(res.data.data);
      if (res.data.data.length > 0) {
        setFirm(res.data.data[0].name);
      }
    } catch (error) {
      console.log(error);
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
      setHierarchy(res.data.data || []);
      setTotalRecords(res.data.totalRecords);
    } catch (error) {
      console.log(error);
    }
  };

  const handleEdit = (row) => {
    setEditId(row._id);
    setEditData(row);
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
      getHierarchy();
      setEditId(null);
    } catch (error) {
      console.log(error);
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
      getHierarchy();
    } catch (error) {
      console.log(error);
    }
  };

  const totalPages = Math.ceil(totalRecords / limit);
  // Handle Previous Page
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  // Handle Next Page
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  useEffect(() => {
    getAllActorTypes();
  }, []);

  useEffect(() => {
    getHierarchy();
  }, [firm, currentPage]);

  return (
    <div className="hierarchy-page">
      {alert && (
        <CustomAlert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
      <div className="hierarchy-page-header">Hierarchy</div>
      <div className="hierarchy-page-container">
        <div className="hierarchy-page-first-line">
          <div className="hierarchy-page-filter">
            <div className="firm-filter">
              <label>Firm:</label>
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
          </div>
          <div className="hierarchy-page-buttons">
            <button
              className="hierarchy-upload-btn"
              onClick={() => setShowUploadPopup(true)}
            >
              <FaFileUpload />
              Upload Bulk CSV
            </button>
            <div
              className="hierarchy-download-btn"
              onClick={() => downloadCSVTemplate(["hierarchy_name"])}
            >
              <FaDownload />
              Download CSV Format
            </div>
          </div>
        </div>
        <div className="hierarchy-page-table-container">
          <table>
            <thead>
              <tr>
                <th>S.No</th>
                {hierarchy.length > 0 &&
                  Object.keys(hierarchy[0])
                    .filter(
                      (key) =>
                        ![
                          "_id",
                          "hierarchy_name",
                          "__v",
                          "createdAt",
                          "updatedAt",
                        ].includes(key)
                    )
                    .map((key) => <th key={key}>{key}</th>)}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {hierarchy.map((row, index) => (
                <tr key={index}>
                  <td>{(currentPage - 1) * limit + index + 1}</td>
                  {Object.keys(row)
                    .filter(
                      (key) =>
                        ![
                          "_id",
                          "hierarchy_name",
                          "__v",
                          "createdAt",
                          "updatedAt",
                        ].includes(key)
                    )
                    .map((key) => (
                      <td key={key}>
                        {editID === row._id ? (
                          <input
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
                          row[key]
                        )}
                      </td>
                    ))}
                  <td>
                    {editID === row._id ? (
                      <>
                        <FaSave
                          color="green"
                          style={{ cursor: "pointer", marginRight: "10px" }}
                          onClick={() => {
                            handleSave();
                            setEditId(null);
                          }}
                        />
                        <FaTimes
                          color="red"
                          style={{ cursor: "pointer" }}
                          onClick={() => setEditId(null)}
                        />
                      </>
                    ) : (
                      <>
                        <FaEdit
                          color="#005bfe"
                          style={{ cursor: "pointer", marginRight: "10px" }}
                          onClick={() => handleEdit(row)}
                        />
                        <RiDeleteBin6Line
                          color="#F21E1E"
                          style={{ cursor: "pointer" }}
                          onClick={() => setDeleteId(row._id)}
                        />
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Pagination */}
      <div className="pagination">
        <button
          onClick={prevPage}
          className="page-btn"
          disabled={currentPage === 1}
        >
          &lt;
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={nextPage}
          className="page-btn"
          disabled={currentPage === totalPages}
        >
          &gt;
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId !== null && (
        <div className="delete-modal" onClick={() => setDeleteId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-content">
              <div className="delete-model-header">
                Are you sure you want to delete this row?
              </div>
              <div className="delete-modal-buttons">
                <button
                  className="cancel-btn"
                  onClick={() => setDeleteId(null)}
                >
                  Cancel
                </button>
                <button className="delete-btn" onClick={deleteRow}>
                  Delete
                </button>
              </div>
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
