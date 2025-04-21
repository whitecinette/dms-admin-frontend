import { useEffect, useState } from "react";
import React from "react";
import "./style.scss";
import axios from "axios";
import config from "../../config.js";
import {
  FaEdit,
  FaSave,
  FaTimes,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import { RiDeleteBin6Line } from "react-icons/ri";
import { IoAddSharp } from "react-icons/io5";

const backendUrl = config.backend_url;

export default function ActorTypeHierarchy() {
  const [data, setData] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editId, setEditId] = useState("");
  const [editRow, setEditRow] = useState({});
  const [expand, setExpand] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [addBox, setAddBox] = useState(false);
  const [ActorTypes, setActorTypes] = useState({
    name: "",
    hierarchy: [""],
  });

  // Add actor hierarchy
  const handleSubmit = async () => {
    try {
      const res = await axios.post(
        `${backendUrl}/actorTypesHierarchy/add-by-admin`,
        ActorTypes,
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );
      setSuccess(res.data.message);
      setTimeout(() => {
        setSuccess("");
      }, 3000);
      setAddBox(false);
      setActorTypes({
        name: "",
        hierarchy: [""],
      });
      getActorHierarchy();
    } catch (error) {
      setAddBox(false);
      console.log("err:", error);
      setError(
        error?.response?.data?.message ||
          error?.message ||
          "Something went wrong. Please try again."
      );
      setTimeout(() => {
        setError("");
      }, 3000);
    }
  };
  // delete actor hierarchy
  const deleteActorHierarchy = async () => {
    try {
      const res = await axios.delete(
        `${backendUrl}/actorTypesHierarchy/delete-by-admin/${deleteId}`,
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );
      setSuccess(res.data.message);
      setTimeout(() => {
        setSuccess("");
      }, 3000);
      setDeleteId(null);
      getActorHierarchy();
    } catch (error) {
      console.log("err:", error);
      setError(
        error?.response?.data?.message ||
          error?.message ||
          "Something went wrong. Please try again."
      );
      setTimeout(() => {
        setError("");
      }, 3000);
    }
  };
  //edit actor hierarchy
  const editActorHierarchy = async () => {
    try {
      const res = await axios.put(
        `${backendUrl}/actorTypesHierarchy/edit-by-admin/${editId}`,
        editRow,
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );
      setSuccess(res.data.message);
      setTimeout(() => {
        setSuccess("");
      }, 3000);
      setEditId("");
      setEditRow({});
      getActorHierarchy();
    } catch (error) {
      console.log("err:", error);
      setError(
        error?.response?.data?.message ||
          error?.message ||
          "Something went wrong. Please try again."
      );
      setTimeout(() => {
        setError("");
      }, 3000);
    }
  };

  // Fetch actor hierarchy
  const getActorHierarchy = async () => {
    try {
      const res = await axios.get(
        `${backendUrl}/actorTypesHierarchy/get-by-admin`
      );
      setData(res.data.data);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Something went wrong. Please try again."
      );
      setTimeout(() => {
        setError("");
      }, 3000);
      console.error(err);
    }
  };

  useEffect(() => {
    getActorHierarchy();
  }, []);

  const handleEditClick = (row) => {
    setEditId(row._id);
    setEditRow({ ...row });
  };
  const handleChange = (e) => {
    setActorTypes((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Handle hierarchy input change
  const handleHierarchyChange = (index, value) => {
    setActorTypes((prev) => ({
      ...prev,
      hierarchy: prev.hierarchy.map((item, i) => (i === index ? value : item)), // Properly updating the array
    }));
  };

  // Add new hierarchy input field
  const addHierarchyField = () => {
    setActorTypes((prev) => ({
      ...prev,
      hierarchy: [...(prev.hierarchy || []), ""], // Ensure hierarchy is an array before spreading
    }));
  };

  // Remove hierarchy input field
  const removeHierarchyField = (index) => {
    setActorTypes((prev) => ({
      ...prev,
      hierarchy: prev.hierarchy.filter((_, i) => i !== index),
    }));
  };

  const updateHierarchyChange = (index, e) => {
    setEditRow((prev) => ({
      ...prev,
      hierarchy: prev.hierarchy.map((item, i) =>
        i === index ? e.target.value : item
      ),
    }));
  };

  // Add a new hierarchy field in edit mode
  const addHierarchyFieldInEdit = () => {
    setEditRow((prev) => ({
      ...prev,
      hierarchy: [...prev.hierarchy, ""],
    }));
  };

  // Remove a hierarchy field in edit mode
  const removeHierarchyFieldInEdit = (index) => {
    setEditRow((prev) => ({
      ...prev,
      hierarchy: prev.hierarchy.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="actorTypeHierarchy-page">
      <div className="actorTypeHierarchy-page-header">Actor Type Hierarchy</div>
      <div className="actorTypeHierarchy-page-container">
        <div className="actorTypeHierarchy-page-first-line">
          <div className="actorTypeHierarchy-page-filter">
            <input type="text" placeholder="Search By Name" />
          </div>
          <div className="actorTypeHierarchy-page-buttons">
            <div
              className="actorTypeHierarchy-page-add-btn"
              onClick={() => setAddBox(true)}
            >
              <IoAddSharp />
              Add New
            </div>
          </div>
        </div>
        <div className="actorTypeHierarchy-page-table-container">
          <table>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Name</th>
                <th>Hierarchy</th>
                <th>Updated At</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: "center" }}>
                    No data available
                  </td>
                </tr>
              ) : (
                data.map((item, index) => {
                  const isExpanded = expand === item._id;

                  return (
                    <React.Fragment key={item._id}>
                      {editId === item._id ? (
                        <>
                          <tr>
                            <td rowSpan={editRow.hierarchy.length + 1}>
                              {index + 1}
                            </td>
                            <td rowSpan={editRow.hierarchy.length + 1}>
                              <input
                                name="name"
                                value={editRow.name}
                                onChange={(e) =>
                                  setEditRow({
                                    ...editRow,
                                    name: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td>
                              <div className="hierarchy-edit-item">
                                <input
                                  type="text"
                                  value={editRow.hierarchy[0] || ""}
                                  onChange={(e) => updateHierarchyChange(0, e)}
                                  placeholder="Enter hierarchy"
                                />
                                {editRow.hierarchy.length > 1 && (
                                  <button
                                    className="remove-hierarchy-btn"
                                    onClick={() =>
                                      removeHierarchyFieldInEdit(0)
                                    }
                                  >
                                    <RiDeleteBin6Line />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td rowSpan={editRow.hierarchy.length + 1}>
                              {new Date(item.updatedAt).toISOString().split("T")[0]}
                            </td>
                            <td rowSpan={editRow.hierarchy.length + 1}>
                              <FaSave
                                color="#005bfe"
                                style={{
                                  cursor: "pointer",
                                  marginRight: "10px",
                                }}
                                onClick={editActorHierarchy}
                              />
                              <FaTimes
                                color="#F21E1E"
                                style={{ cursor: "pointer" }}
                                onClick={() => {
                                  setEditId("");
                                  setEditRow(null);
                                }}
                              />
                            </td>
                          </tr>
                          {editRow.hierarchy.slice(1).map((hierarchy, i) => (
                            <tr key={i}>
                              <td className="hierarchy-edit-item">
                                <input
                                  value={hierarchy}
                                  onChange={(e) =>
                                    updateHierarchyChange(i + 1, e)
                                  }
                                />
                                <button
                                  className="remove-hierarchy-btn"
                                  onClick={() =>
                                    removeHierarchyFieldInEdit(i + 1)
                                  }
                                >
                                  <RiDeleteBin6Line />
                                </button>
                              </td>
                            </tr>
                          ))}
                          <tr>
                            <td className="hierarchy-actions">
                              <button
                                className="add-hierarchy-btn"
                                onClick={addHierarchyFieldInEdit}
                              >
                                <IoAddSharp color="blue" size={22} /> Add
                                Hierarchy Field
                              </button>
                            </td>
                          </tr>
                        </>
                      ) : (
                        <>
                          <tr>
                            <td>{index + 1}</td>
                            <td>{item.name}</td>
                            <td
                              colSpan="1"
                              className="expand-btn"
                              onClick={() =>
                                setExpand(isExpanded ? "" : item._id)
                              }
                            >
                              {isExpanded ? (
                                <button>
                                  Collapse <FaChevronUp />
                                </button>
                              ) : (
                                <button>
                                  Expand <FaChevronDown />
                                </button>
                              )}
                            </td>
                            <td> {new Date(item.updatedAt).toISOString().split("T")[0]}</td>
                            <td>
                              <FaEdit
                                color="#005bfe"
                                style={{
                                  cursor: "pointer",
                                  marginRight: "10px",
                                }}
                                onClick={() => handleEditClick(item)}
                              />
                              <RiDeleteBin6Line
                                color="#F21E1E"
                                style={{ cursor: "pointer" }}
                                onClick={() => setDeleteId(item._id)}
                              />
                            </td>
                          </tr>

                          {/* Show hierarchy only when expanded */}
                          {isExpanded &&
                            item.hierarchy.map((hierarchy, i) => (
                              <tr key={`${item._id}-hierarchy-${i}`}>
                                <td colSpan="2"></td>
                                {/* Empty columns to maintain alignment */}
                                <td>{hierarchy}</td>
                                <td colSpan="2"></td>
                              </tr>
                            ))}
                        </>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Delete box */}
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
                <button
                  className="delete-btn"
                  onClick={() => {
                    deleteActorHierarchy();
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Add box */}
      {addBox && (
        <div className="actorTypeHierarchy-page-add-box">
          <div className="actorTypeHierarchy-page-add-container">
            <div className="actorTypeHierarchy-page-add-content">
              <div className="actorTypeHierarchy-page-add-header">
                Add Actor Type Hierarchy
              </div>
              <div className="actorTypeHierarchy-page-add-form">
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter Actor Type"
                  value={ActorTypes.name}
                  onChange={handleChange}
                  required
                />

                <label htmlFor="hierarchy">Hierarchy</label>
                {ActorTypes.hierarchy.map((hierarchy, index) => (
                  <div key={index} className="hierarchy-input">
                    <input
                      type="text"
                      placeholder="Enter Hierarchy"
                      value={hierarchy}
                      onChange={(e) =>
                        handleHierarchyChange(index, e.target.value)
                      }
                    />
                    {index > 0 && (
                      <button
                        className="remove-hierarchy-btn"
                        onClick={() => removeHierarchyField(index)}
                      >
                      <RiDeleteBin6Line/>
                      </button>
                    )}
                  </div>
                ))}

                <button
                  className="add-hierarchy-btn"
                  onClick={addHierarchyField}
                >
                <IoAddSharp /> Add More Hierarchy
                </button>
              </div>

              <div className="actorTypeHierarchy-page-add-button">
                <button
                  className="actorTypeHierarchy-page-submit-btn"
                  onClick={handleSubmit}
                >
                  Submit
                </button>
                <button
                  className="actorTypeHierarchy-page-cancel-btn"
                  onClick={() => setAddBox(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
