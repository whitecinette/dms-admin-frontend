import { useState, useEffect, useRef } from "react";
import {
  FaEdit,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaSave,
  FaTimes,
  FaChevronDown,
  FaChevronUp,
  FaPlus,
} from "react-icons/fa";
import { RiDeleteBin6Line } from "react-icons/ri";
import { motion } from "framer-motion";
import "./style.scss";

function Table({ data, onSort, handleSave, deleteRow }) {
  const [deleteId, setDeleteId] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 1 });
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [expandedRow, setExpandedRow] = useState(null);
  const [focusedPath, setFocusedPath] = useState(null);
  const [addFieldModal, setAddFieldModal] = useState(null);
  const [newFieldType, setNewFieldType] = useState("string");
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const [showNewField, setShowNewField] = useState(null);

  const headers = data.headers || [];
  const rows = data.data || [];
  const currentPage = data.currentPage || 1;
  const limit = 50;

  const fieldTypes = [
    { value: "string", label: "Text" },
    { value: "number", label: "Number" },
    { value: "boolean", label: "Boolean" },
    { value: "object", label: "Object" },
    { value: "array", label: "Array" },
  ];

  const handleAddField = (path, title) => {
    setAddFieldModal({ path, title });
    setNewFieldKey("");
    setNewFieldValue("");
    setNewFieldType("string");
  };

  const isTargetArray = () => {
    if (!addFieldModal) return false;
    const targetObj = getNestedValue(editData, addFieldModal.path);
    return Array.isArray(targetObj);
  };

  const addNewField = () => {
    const isArray = isTargetArray();

    if (!isArray && !newFieldKey.trim()) {
      alert("Field name cannot be empty");
      return;
    }

    const updatedData = JSON.parse(JSON.stringify(editData));
    let value = newFieldValue;
    let newPath = addFieldModal.path;

    switch (newFieldType) {
      case "number":
        value = Number(newFieldValue) || 0;
        break;
      case "boolean":
        value = newFieldValue === "true";
        break;
      case "object":
        value = {};
        break;
      case "array":
        value = [];
        break;
      default:
        break;
    }

    const targetObj = addFieldModal.path
      ? getNestedValue(updatedData, addFieldModal.path)
      : updatedData;

    if (Array.isArray(targetObj)) {
      targetObj.push(value);
      newPath = `${addFieldModal.path}[${targetObj.length - 1}]`;
    } else if (typeof targetObj === "object" && targetObj !== null) {
      targetObj[newFieldKey] = value;
      newPath = addFieldModal.path
        ? `${addFieldModal.path}.${newFieldKey}`
        : newFieldKey;
    }

    setEditData(updatedData);
    setAddFieldModal(null);
    setShowNewField(newPath);

    setTimeout(() => {
      setShowNewField(null);
    }, 3000);
  };

  const getNestedValue = (obj, path) => {
    if (!obj || !path) return "N/A";

    return path
      .replace(/\[(\d+)\]/g, ".$1")
      .split(".")
      .reduce(
        (acc, key) => (acc && acc[key] !== undefined ? acc[key] : "N/A"),
        obj
      );
  };

  const setNestedValue = (obj, path, value) => {
    if (!obj || !path) return;

    const keys = path.replace(/\[(\d+)\]/g, ".$1").split(".");
    let temp = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!temp[key] || typeof temp[key] !== "object") {
        temp[key] = isNaN(keys[i + 1]) ? {} : [];
      }
      temp = temp[key];
    }

    temp[keys[keys.length - 1]] = value;
  };

  const formatHeader = (header) => {
    return header
      .split(".")
      .pop()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const handleEdit = (row) => {
    setEditId(row._id);
    setEditData(JSON.parse(JSON.stringify(row)));
  };

  const handleSort = (header) => {
    let direction = 1;
    if (sortConfig.key === header && sortConfig.direction === 1) {
      direction = -1;
    }
    setSortConfig({ key: header, direction });
    onSort(header, direction);
  };

  const getStatusClass = (value) => {
    const v = String(value || "").toLowerCase();
    if (["active", "done", "verified"].includes(v)) return "success";
    if (["inactive", "pending", "failed"].includes(v)) return "danger";
    return "neutral";
  };

  const renderCellDisplay = (row, header) => {
    const value = getNestedValue(row, header);

    if (typeof value === "boolean") {
      return (
        <span className={`boolean-pill ${value ? "yes" : "no"}`}>
          {value ? "Yes" : "No"}
        </span>
      );
    }

    if (header.toLowerCase() === "status") {
      return <span className={`status-badge ${getStatusClass(value)}`}>{value}</span>;
    }

    return <span className="cell-text">{value}</span>;
  };

  const NestedCard = ({ title, data, path = "", hideTitle = false }) => {
    if (!data || typeof data !== "object") return null;
    const isEditing = editId === rows[expandedRow]?._id;

    return (
      <div className="nested-card">
        {!hideTitle && (
          <div className="nested-header">
            <h3 className="nested-title">{title}</h3>
            {isEditing && (
              <button
                onClick={() => handleAddField(path, title)}
                className="add-field-btn small"
                title={`Add field to ${title}`}
              >
                <FaPlus />
              </button>
            )}
          </div>
        )}

        <div className="nested-details">
          {Array.isArray(data) ? (
            data.length > 0 ? (
              typeof data[0] === "object" ? (
                data.map((item, index) => (
                  <div key={index} className="array-card">
                    <div className="array-header">
                      <h4 className="array-title">
                        {title} {index + 1}
                      </h4>
                      {isEditing && (
                        <button
                          onClick={() =>
                            handleAddField(
                              `${path}[${index}]`,
                              `${title} ${index + 1}`
                            )
                          }
                          className="add-field-btn small"
                          title={`Add field to ${title} ${index + 1}`}
                        >
                          <FaPlus />
                        </button>
                      )}
                    </div>

                    {Object.entries(item).map(([subKey, value]) => (
                      <NestedItem
                        key={subKey}
                        label={formatHeader(subKey)}
                        value={value}
                        path={`${path}[${index}].${subKey}`}
                        isNew={showNewField === `${path}[${index}].${subKey}`}
                      />
                    ))}
                  </div>
                ))
              ) : (
                <>
                  <div className="array-list-header">
                    <span>{title} Items</span>
                    {isEditing && (
                      <button
                        onClick={() => handleAddField(path, title)}
                        className="add-field-btn small"
                        title={`Add item to ${title} list`}
                      >
                        <FaPlus />
                      </button>
                    )}
                  </div>

                  <div className="array-list">
                    {data.map((item, index) => (
                      <NestedItem
                        key={index}
                        label={`${formatHeader(title)} ${index + 1}`}
                        value={item}
                        path={`${path}[${index}]`}
                        isNew={showNewField === `${path}[${index}]`}
                      />
                    ))}
                  </div>
                </>
              )
            ) : (
              <div className="empty-array">
                <p>No records available</p>
                {isEditing && (
                  <button
                    onClick={() => handleAddField(path, title)}
                    className="add-field-btn"
                    title={`Add first item to ${title}`}
                  >
                    <FaPlus /> Add First Item
                  </button>
                )}
              </div>
            )
          ) : (
            Object.entries(data).map(([subKey, value]) => (
              <NestedItem
                key={subKey}
                label={formatHeader(subKey)}
                value={value}
                path={path ? `${path}.${subKey}` : subKey}
                hideTitle={true}
                isNew={showNewField === (path ? `${path}.${subKey}` : subKey)}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  const NestedItem = ({
    label,
    value,
    path,
    hideTitle = false,
    isNew = false,
  }) => {
    const isEditing = editId === rows[expandedRow]?._id;
    const inputRef = useRef(null);

    useEffect(() => {
      if (focusedPath === path && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.selectionStart = inputRef.current.value.length;
      }
    }, [focusedPath, value, path]);

    return (
      <div className={`nested-item ${isNew ? "new-field" : ""}`}>
        {!hideTitle && <span className="nested-label">{label}</span>}

        <span className="nested-value">
          {typeof value === "object" && value !== null ? (
            <div className="nested-object-wrapper">
              <NestedCard
                title={label}
                data={value}
                path={path}
                hideTitle={true}
              />
              {isEditing && typeof value === "object" && (
                <button
                  onClick={() => handleAddField(path, label)}
                  className="add-field-btn small"
                  title={`Add field to ${label}`}
                >
                  <FaPlus />
                </button>
              )}
            </div>
          ) : isEditing ? (
            typeof value === "boolean" ? (
              <select
                value={
                  getNestedValue(editData, path) === true ? "true" : "false"
                }
                onChange={(e) => {
                  const updatedData = JSON.parse(JSON.stringify(editData));
                  setNestedValue(updatedData, path, e.target.value === "true");
                  setEditData(updatedData);
                }}
              >
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            ) : (
              <input
                ref={focusedPath === path ? inputRef : null}
                type="text"
                value={getNestedValue(editData, path) || ""}
                onFocus={() => setFocusedPath(path)}
                onChange={(e) => {
                  const updatedData = JSON.parse(JSON.stringify(editData));
                  setNestedValue(updatedData, path, e.target.value);
                  setEditData(updatedData);
                }}
              />
            )
          ) : typeof value === "boolean" ? (
            <span className={`boolean-pill ${value ? "yes" : "no"}`}>
              {value ? "Yes" : "No"}
            </span>
          ) : (
            value || "N/A"
          )}
        </span>
      </div>
    );
  };

  return (
    <div className="table-component">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>S.No</th>

              {headers.map((header, index) =>
                header !== "expand" ? (
                  <th
                    key={index}
                    onClick={() => handleSort(header)}
                    className="sortable-header"
                  >
                    <span>{formatHeader(header)}</span>
                    <span className="sort-icon">
                      {sortConfig.key === header ? (
                        sortConfig.direction === 1 ? (
                          <FaSortUp />
                        ) : (
                          <FaSortDown />
                        )
                      ) : (
                        <FaSort />
                      )}
                    </span>
                  </th>
                ) : null
              )}

              {headers.includes("expand") && <th>Details</th>}
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.length > 0 ? (
              rows.map((row, index) => (
                <FragmentRow
                  key={row._id || index}
                  row={row}
                  index={index}
                  headers={headers}
                  editId={editId}
                  editData={editData}
                  setEditData={setEditData}
                  setNestedValue={setNestedValue}
                  getNestedValue={getNestedValue}
                  handleEdit={handleEdit}
                  handleSave={handleSave}
                  setEditId={setEditId}
                  setDeleteId={setDeleteId}
                  expandedRow={expandedRow}
                  setExpandedRow={setExpandedRow}
                  currentPage={currentPage}
                  limit={limit}
                  renderCellDisplay={renderCellDisplay}
                  formatHeader={formatHeader}
                  NestedCard={NestedCard}
                  NestedItem={NestedItem}
                  showNewField={showNewField}
                />
              ))
            ) : (
              <tr>
                <td colSpan={headers.length + 2}>
                  <div className="table-empty-state">No records found</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
              Are you sure you want to delete this row?
            </div>
            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setDeleteId(null)}>
                Cancel
              </button>
              <button
                className="danger-btn"
                onClick={() => {
                  deleteRow(deleteId);
                  setDeleteId(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {addFieldModal !== null && (
        <div className="modal-overlay" onClick={() => setAddFieldModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Add New Field</h3>
                <p>
                  Add field to {addFieldModal.title || "Record"}
                  {isTargetArray() ? " (Array)" : ""}
                </p>
              </div>
              <button className="icon-btn" onClick={() => setAddFieldModal(null)}>
                <FaTimes />
              </button>
            </div>

            <div className="modal-body form-body">
              {!isTargetArray() && (
                <div className="form-group">
                  <label>Field Name</label>
                  <input
                    type="text"
                    value={newFieldKey}
                    onChange={(e) => setNewFieldKey(e.target.value)}
                    placeholder="Enter field name"
                  />
                </div>
              )}

              <div className="form-group">
                <label>Field Type</label>
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value)}
                >
                  {fieldTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {["string", "number", "boolean"].includes(newFieldType) && (
                <div className="form-group">
                  <label>Field Value</label>
                  {newFieldType === "boolean" ? (
                    <select
                      value={newFieldValue}
                      onChange={(e) => setNewFieldValue(e.target.value)}
                    >
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  ) : (
                    <input
                      type={newFieldType === "number" ? "number" : "text"}
                      value={newFieldValue}
                      onChange={(e) => setNewFieldValue(e.target.value)}
                      placeholder={`Enter ${newFieldType} value`}
                    />
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setAddFieldModal(null)}>
                Cancel
              </button>
              <button className="primary-btn" onClick={addNewField}>
                Add Field
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FragmentRow({
  row,
  index,
  headers,
  editId,
  editData,
  setEditData,
  setNestedValue,
  getNestedValue,
  handleEdit,
  handleSave,
  setEditId,
  setDeleteId,
  expandedRow,
  setExpandedRow,
  currentPage,
  limit,
  renderCellDisplay,
  formatHeader,
  NestedCard,
  NestedItem,
  showNewField,
}) {
  const isEditing = editId === row._id;
  const isExpanded = expandedRow === index;

  return (
    <>
      <tr className={isExpanded ? "row-expanded" : ""}>
        <td>{(currentPage - 1) * limit + index + 1}</td>

        {headers.map((header, idx) =>
          header !== "expand" ? (
            <td key={idx}>
              {isEditing ? (
                header.toLowerCase() === "status" ? (
                  <select
                    value={getNestedValue(editData, header)}
                    onChange={(e) => {
                      const updatedData = { ...editData };
                      setNestedValue(updatedData, header, e.target.value);
                      setEditData(updatedData);
                    }}
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                ) : header.toLowerCase() === "isavailable" ? (
                  <select
                    value={String(getNestedValue(editData, header))}
                    onChange={(e) => {
                      const updatedData = { ...editData };
                      const newValue = e.target.value === "true";
                      setNestedValue(updatedData, header, newValue);
                      setEditData(updatedData);
                    }}
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={getNestedValue(editData, header)}
                    onChange={(e) => {
                      const updatedData = { ...editData };
                      setNestedValue(updatedData, header, e.target.value);
                      setEditData(updatedData);
                    }}
                  />
                )
              ) : (
                renderCellDisplay(row, header)
              )}
            </td>
          ) : null
        )}

        {headers.includes("expand") && (
          <td className="expand-cell">
            <button
              className="expand-toggle-btn"
              onClick={() => setExpandedRow(isExpanded ? null : index)}
            >
              {isExpanded ? (
                <>
                  Hide <FaChevronUp />
                </>
              ) : (
                <>
                  View <FaChevronDown />
                </>
              )}
            </button>
          </td>
        )}

        <td>
          <div className="action-group">
            {isEditing ? (
              <>
                <button
                  className="icon-btn success"
                  onClick={() => {
                    handleSave(editData, row._id);
                    setEditId(null);
                  }}
                  title="Save"
                >
                  <FaSave />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => setEditId(null)}
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

      {isExpanded && (
        <tr className="expanded-row">
          <td colSpan={headers.length + 3}>
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
              className="expanded-content"
            >
              {isEditing && (
                <div className="root-level-controls">
                  <h4>Additional Properties</h4>
                </div>
              )}

              <div className="fields-container">
                {Object.entries(isEditing ? editData : row)
                  .filter(
                    ([key]) =>
                      !headers.includes(key) &&
                      ![
                        "_id",
                        "password",
                        "createdAt",
                        "updatedAt",
                        "__v",
                        "securityKey",
                      ].includes(key)
                  )
                  .map(([key, value]) =>
                    typeof value === "object" && value !== null ? (
                      <NestedCard
                        key={key}
                        title={formatHeader(key)}
                        data={value}
                        path={key}
                      />
                    ) : (
                      <NestedItem
                        key={key}
                        label={formatHeader(key)}
                        value={value}
                        path={key}
                        isNew={showNewField === key}
                      />
                    )
                  )}
              </div>
            </motion.div>
          </td>
        </tr>
      )}
    </>
  );
}

export default Table;