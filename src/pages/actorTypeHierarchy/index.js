import { useEffect, useMemo, useState } from "react";
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
  FaSearch,
} from "react-icons/fa";
import { RiDeleteBin6Line } from "react-icons/ri";
import { IoAddSharp } from "react-icons/io5";
import { HiOutlineUserGroup } from "react-icons/hi2";

const backendUrl = config.backend_url;

export default function ActorTypeHierarchy() {
  const [data, setData] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editId, setEditId] = useState("");
  const [editRow, setEditRow] = useState(null);
  const [expand, setExpand] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [addBox, setAddBox] = useState(false);
  const [search, setSearch] = useState("");
  const [actorTypes, setActorTypes] = useState({
    name: "",
    hierarchy: [""],
  });

  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(""), 3000);
  };

  const showError = (message) => {
    setError(message);
    setTimeout(() => setError(""), 3000);
  };

  const resetAddForm = () => {
    setActorTypes({
      name: "",
      hierarchy: [""],
    });
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const sanitizePayload = (payload) => ({
    ...payload,
    name: String(payload.name || "").trim(),
    hierarchy: (payload.hierarchy || [])
      .map((item) => String(item || "").trim())
      .filter(Boolean),
  });

  const getActorHierarchy = async () => {
    try {
      const res = await axios.get(
        `${backendUrl}/actorTypesHierarchy/get-by-admin`
      );
      setData(res?.data?.data || []);
    } catch (err) {
      showError(
        err?.response?.data?.message ||
          err?.message ||
          "Something went wrong. Please try again."
      );
      console.error(err);
    }
  };

  useEffect(() => {
    getActorHierarchy();
  }, []);

  const handleSubmit = async () => {
    try {
      const payload = sanitizePayload(actorTypes);

      if (!payload.name) {
        return showError("Actor type name is required");
      }

      if (!payload.hierarchy.length) {
        return showError("At least one hierarchy field is required");
      }

      const res = await axios.post(
        `${backendUrl}/actorTypesHierarchy/add-by-admin`,
        payload,
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );

      showSuccess(res?.data?.message || "Actor type hierarchy added");
      setAddBox(false);
      resetAddForm();
      getActorHierarchy();
    } catch (error) {
      console.log("err:", error);
      showError(
        error?.response?.data?.message ||
          error?.message ||
          "Something went wrong. Please try again."
      );
    }
  };

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

      showSuccess(res?.data?.message || "Actor type hierarchy deleted");
      setDeleteId(null);
      getActorHierarchy();
    } catch (error) {
      console.log("err:", error);
      showError(
        error?.response?.data?.message ||
          error?.message ||
          "Something went wrong. Please try again."
      );
    }
  };

  const editActorHierarchy = async () => {
    try {
      const payload = sanitizePayload(editRow || {});

      if (!payload.name) {
        return showError("Actor type name is required");
      }

      if (!payload.hierarchy.length) {
        return showError("At least one hierarchy field is required");
      }

      const res = await axios.put(
        `${backendUrl}/actorTypesHierarchy/edit-by-admin/${editId}`,
        payload,
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );

      showSuccess(res?.data?.message || "Actor type hierarchy updated");
      setEditId("");
      setEditRow(null);
      getActorHierarchy();
    } catch (error) {
      console.log("err:", error);
      showError(
        error?.response?.data?.message ||
          error?.message ||
          "Something went wrong. Please try again."
      );
    }
  };

  const handleEditClick = (row) => {
    setEditId(row._id);
    setEditRow({
      ...row,
      hierarchy: Array.isArray(row.hierarchy) && row.hierarchy.length
        ? row.hierarchy
        : [""],
    });
  };

  const handleChange = (e) => {
    setActorTypes((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleHierarchyChange = (index, value) => {
    setActorTypes((prev) => ({
      ...prev,
      hierarchy: prev.hierarchy.map((item, i) => (i === index ? value : item)),
    }));
  };

  const addHierarchyField = () => {
    setActorTypes((prev) => ({
      ...prev,
      hierarchy: [...(prev.hierarchy || []), ""],
    }));
  };

  const removeHierarchyField = (index) => {
    setActorTypes((prev) => {
      const updated = prev.hierarchy.filter((_, i) => i !== index);
      return {
        ...prev,
        hierarchy: updated.length ? updated : [""],
      };
    });
  };

  const updateHierarchyChange = (index, value) => {
    setEditRow((prev) => ({
      ...prev,
      hierarchy: prev.hierarchy.map((item, i) => (i === index ? value : item)),
    }));
  };

  const addHierarchyFieldInEdit = () => {
    setEditRow((prev) => ({
      ...prev,
      hierarchy: [...(prev?.hierarchy || []), ""],
    }));
  };

  const removeHierarchyFieldInEdit = (index) => {
    setEditRow((prev) => {
      const updated = prev.hierarchy.filter((_, i) => i !== index);
      return {
        ...prev,
        hierarchy: updated.length ? updated : [""],
      };
    });
  };

  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return data;

    return data.filter((item) => {
      const nameMatch = String(item?.name || "")
        .toLowerCase()
        .includes(q);

      const hierarchyMatch = (item?.hierarchy || []).some((h) =>
        String(h || "").toLowerCase().includes(q)
      );

      return nameMatch || hierarchyMatch;
    });
  }, [data, search]);

  const totalHierarchyLevels = useMemo(() => {
    return data.reduce((acc, item) => acc + (item?.hierarchy?.length || 0), 0);
  }, [data]);

  return (
    <div className="actorTypeHierarchy-page">
      <div className="page-topbar">
        <div>
          <h1>Actor Type Hierarchy</h1>
          <p>Manage actor types and their hierarchy flow in one place.</p>
        </div>

        <button className="primary-btn" onClick={() => setAddBox(true)}>
          <IoAddSharp />
          Add New
        </button>
      </div>

      <div className="stats-strip">
        <div className="stat-card">
          <div className="stat-label">Total Types</div>
          <div className="stat-value">{data.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Hierarchy Levels</div>
          <div className="stat-value">{totalHierarchyLevels}</div>
        </div>
      </div>

      <div className="content-card">
        <div className="toolbar">
          <div className="search-box">
            <FaSearch />
            <input
              type="text"
              placeholder="Search by type or hierarchy..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th style={{ width: "80px" }}>S.No</th>
                <th>Name</th>
                <th>Hierarchy</th>
                <th style={{ width: "140px" }}>Updated</th>
                <th style={{ width: "150px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <div className="empty-state">
                      <HiOutlineUserGroup size={40} />
                      <h3>No actor hierarchy found</h3>
                      <p>
                        {search
                          ? "Try a different search term."
                          : "Start by adding your first actor type hierarchy."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => {
                  const isExpanded = expand === item._id;
                  const isEditing = editId === item._id;

                  return (
                    <React.Fragment key={item._id}>
                      <tr className={isExpanded ? "row-expanded" : ""}>
                        <td>{index + 1}</td>

                        <td>
                          {isEditing ? (
                            <input
                              className="table-input"
                              name="name"
                              value={editRow?.name || ""}
                              onChange={(e) =>
                                setEditRow((prev) => ({
                                  ...prev,
                                  name: e.target.value,
                                }))
                              }
                              placeholder="Enter actor type name"
                            />
                          ) : (
                            <div className="name-cell">
                              <span className="name-title">{item.name}</span>
                            </div>
                          )}
                        </td>

                        <td>
                          {isEditing ? (
                            <div className="hierarchy-edit-list">
                              {(editRow?.hierarchy || []).map((hierarchy, i) => (
                                <div className="hierarchy-edit-item" key={i}>
                                  <input
                                    className="table-input"
                                    value={hierarchy}
                                    onChange={(e) =>
                                      updateHierarchyChange(i, e.target.value)
                                    }
                                    placeholder={`Hierarchy ${i + 1}`}
                                  />
                                  {(editRow?.hierarchy || []).length > 1 && (
                                    <button
                                      type="button"
                                      className="icon-btn danger"
                                      onClick={() =>
                                        removeHierarchyFieldInEdit(i)
                                      }
                                    >
                                      <RiDeleteBin6Line />
                                    </button>
                                  )}
                                </div>
                              ))}

                              <button
                                type="button"
                                className="text-btn"
                                onClick={addHierarchyFieldInEdit}
                              >
                                <IoAddSharp />
                                Add Hierarchy Level
                              </button>
                            </div>
                          ) : (
                            <div className="hierarchy-preview">
                              {(item.hierarchy || [])
                                .slice(0, isExpanded ? item.hierarchy.length : 3)
                                .map((hierarchy, i) => (
                                  <span className="hierarchy-chip" key={i}>
                                    {hierarchy}
                                  </span>
                                ))}

                              {(item.hierarchy || []).length > 3 && (
                                <button
                                  className="expand-toggle"
                                  onClick={() =>
                                    setExpand(isExpanded ? "" : item._id)
                                  }
                                >
                                  {isExpanded ? (
                                    <>
                                      Show Less <FaChevronUp />
                                    </>
                                  ) : (
                                    <>
                                      +{item.hierarchy.length - 3} more{" "}
                                      <FaChevronDown />
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        <td>{formatDate(item.updatedAt)}</td>

                        <td>
                          <div className="action-group">
                            {isEditing ? (
                              <>
                                <button
                                  className="icon-btn success"
                                  onClick={editActorHierarchy}
                                  title="Save"
                                >
                                  <FaSave />
                                </button>
                                <button
                                  className="icon-btn"
                                  onClick={() => {
                                    setEditId("");
                                    setEditRow(null);
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
                                  onClick={() => handleEditClick(item)}
                                  title="Edit"
                                >
                                  <FaEdit />
                                </button>
                                <button
                                  className="icon-btn danger"
                                  onClick={() => setDeleteId(item._id)}
                                  title="Delete"
                                >
                                  <RiDeleteBin6Line />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(error || success) && (
        <div className="toast-stack">
          {error && <div className="toast error">{error}</div>}
          {success && <div className="toast success">{success}</div>}
        </div>
      )}

      {deleteId !== null && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal-card small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Actor Type</h3>
              <button className="icon-btn" onClick={() => setDeleteId(null)}>
                <FaTimes />
              </button>
            </div>

            <div className="modal-body">
              <p>
                Are you sure you want to delete this actor type hierarchy? This
                action cannot be undone.
              </p>
            </div>

            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setDeleteId(null)}>
                Cancel
              </button>
              <button className="danger-btn" onClick={deleteActorHierarchy}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {addBox && (
        <div className="modal-overlay" onClick={() => setAddBox(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Add Actor Type Hierarchy</h3>
                <p>Create a new actor type and define its hierarchy levels.</p>
              </div>
              <button className="icon-btn" onClick={() => setAddBox(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="modal-body form-body">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter actor type"
                  value={actorTypes.name}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Hierarchy Levels</label>

                <div className="hierarchy-form-list">
                  {actorTypes.hierarchy.map((hierarchy, index) => (
                    <div key={index} className="hierarchy-edit-item">
                      <input
                        type="text"
                        placeholder={`Enter hierarchy level ${index + 1}`}
                        value={hierarchy}
                        onChange={(e) =>
                          handleHierarchyChange(index, e.target.value)
                        }
                      />
                      {index > 0 && (
                        <button
                          type="button"
                          className="icon-btn danger"
                          onClick={() => removeHierarchyField(index)}
                        >
                          <RiDeleteBin6Line />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="text-btn"
                  onClick={addHierarchyField}
                >
                  <IoAddSharp />
                  Add More Hierarchy
                </button>
              </div>
            </div>

            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setAddBox(false)}>
                Cancel
              </button>
              <button className="primary-btn" onClick={handleSubmit}>
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}