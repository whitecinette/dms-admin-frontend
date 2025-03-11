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
  const [focusedPath, setFocusedPath] = useState(null); // ✅ Track the focused field
  const headers = data.headers || [];
  const rows = data.data || [];
  const currentPage = data.currentPage || 1;
  const limit = 50;

  const NestedCard = ({ title, data, path = "", hideTitle = false }) => {
    if (!data || typeof data !== "object") return null;

    return (
      <div className="nested-card">
        {!hideTitle && <h3 className="nested-title">{title}</h3>}
        <div className="nested-details">
          {Array.isArray(data) ? (
            data.length > 0 ? (
              data.map((item, index) => (
                <div key={index} className="array-card">
                  <h4 className="array-title">
                    {title} {index + 1}
                  </h4>
                  {Object.entries(item).map(([subKey, value]) => (
                    <NestedItem
                      key={subKey}
                      label={formatHeader(subKey)}
                      value={value}
                      path={`${path}[${index}].${subKey}`} // ✅ Correctly track array paths
                    />
                  ))}
                </div>
              ))
            ) : (
              <p>No records available</p>
            )
          ) : (
            Object.entries(data).map(([subKey, value]) => (
              <NestedItem
                key={subKey}
                label={formatHeader(subKey)}
                value={value}
                path={path ? `${path}.${subKey}` : subKey} // ✅ Generate correct nested path
                hideTitle={true}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  const NestedItem = ({ label, value, path, hideTitle = false }) => {
    const isEditing = editId === rows[expandedRow]?._id;
    const inputRef = useRef(null);

    useEffect(() => {
      if (focusedPath === path && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.selectionStart = inputRef.current.value.length;
      }
    }, [focusedPath, value]);

    return (
      <div className="nested-item">
        <span className="nested-label">{label}:</span>
        <span className="nested-value">
          {typeof value === "object" && value !== null ? (
            <NestedCard
              title={label}
              data={value}
              path={path}
              hideTitle={true}
            />
          ) : isEditing ? (
            typeof value === "boolean" ? (
              // ✅ Boolean Select Dropdown
              <select
                value={
                  getNestedValue(editData, path) === true ? "true" : "false"
                }
                onChange={(e) => {
                  const updatedData = JSON.parse(JSON.stringify(editData));
                  setNestedValue(updatedData, path, e.target.value === "true"); // Convert back to boolean
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
            value ? (
              "True"
            ) : (
              "False"
            )
          ) : (
            value || "N/A"
          )}
        </span>
      </div>
    );
  };

  const getNestedValue = (obj, path) => {
    if (!obj || !path) return "N/A";

    return path
      .replace(/\[(\d+)\]/g, ".$1") // Convert array index notation to dot notation
      .split(".")
      .reduce(
        (acc, key) => (acc && acc[key] !== undefined ? acc[key] : "N/A"),
        obj
      );
  };

  const setNestedValue = (obj, path, value) => {
    if (!obj || !path) return;

    const keys = path.replace(/\[(\d+)\]/g, ".$1").split("."); // Convert array index notation to dot notation
    let temp = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!temp[key] || typeof temp[key] !== "object") {
        temp[key] = isNaN(keys[i + 1]) ? {} : []; // Ensure object or array at each level
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

    let flattenedRow = JSON.parse(JSON.stringify(row)); // Deep clone to preserve all nested values

    setEditData(flattenedRow);
  };

  const handleSort = (header) => {
    let direction = 1;
    if (sortConfig.key === header && sortConfig.direction === 1) {
      direction = -1;
    }
    setSortConfig({ key: header, direction });
    onSort(header, direction);
  };

  return (
    <div className="table-component">
      <table>
        <thead>
          <tr>
            <th>SNo.</th>

            {headers.map((header, index) =>
              header !== "expand" ? (
                <th
                  key={index}
                  onClick={() => handleSort(header)}
                  style={{ cursor: "pointer" }}
                >
                  {formatHeader(header)}
                  {sortConfig.key === header ? (
                    sortConfig.direction === 1 ? (
                      <FaSortUp />
                    ) : (
                      <FaSortDown />
                    )
                  ) : (
                    <FaSort />
                  )}
                </th>
              ) : null
            )}
            {headers.includes("expand") && <th>Expand</th>}
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row, index) => (
              <>
                <tr key={index}>
                  <td>{(currentPage - 1) * limit + index + 1}</td>

                  {headers.map((header, idx) =>
                    header !== "expand" ? (
                      <td key={idx}>
                        {editId === row._id ? (
                          header === "status" ||
                          header === "Status" ||
                          header === "STATUS" ? (
                            <select
                              value={getNestedValue(editData, header)}
                              onChange={(e) => {
                                const updatedData = { ...editData };
                                setNestedValue(
                                  updatedData,
                                  header,
                                  e.target.value
                                );
                                setEditData(updatedData);
                              }}
                            >
                              <option value="active">active</option>
                              <option value="inactive">inactive</option>
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={getNestedValue(editData, header)}
                              onChange={(e) => {
                                const updatedData = { ...editData };
                                setNestedValue(
                                  updatedData,
                                  header,
                                  e.target.value
                                );
                                setEditData(updatedData);
                              }}
                            />
                          )
                        ) : (
                          <span
                            style={{
                              color:
                                header.toLowerCase() === "status"
                                  ? ["active", "done"].includes(
                                      getNestedValue(row, header).toLowerCase()
                                    )
                                    ? "green"
                                    : ["inactive", "pending"].includes(
                                        getNestedValue(
                                          row,
                                          header
                                        ).toLowerCase()
                                      )
                                    ? "red"
                                    : "black"
                                  : "inherit",
                            }}
                          >
                            {getNestedValue(row, header)}
                          </span>
                        )}
                      </td>
                    ) : null
                  )}
                  {headers.includes("expand") && (
                    <td className="expand-btn">
                      <button
                        onClick={() =>
                          setExpandedRow(expandedRow === index ? null : index)
                        }
                      >
                        {expandedRow === index ? (
                          <>
                            Expand
                            <FaChevronUp />
                          </>
                        ) : (
                          <>
                            Expand
                            <FaChevronDown />
                          </>
                        )}
                      </button>
                    </td>
                  )}
                  <td>
                    {editId === row._id ? (
                      <>
                        <FaSave
                          color="green"
                          style={{ cursor: "pointer", marginRight: "10px" }}
                          onClick={() => {
                            handleSave(editData, row._id);
                            setEditId(null); // Exit edit mode
                          }}
                        />
                        <FaTimes
                          color="red"
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            setEditId(null); // Exit edit mode without saving
                          }}
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

                {expandedRow === index && (
                  <tr className="expanded-row">
                    <td colSpan={headers.length + 3}>
                      <div className="expanded-content">
                        <motion.div
                          initial={{ height: 0, opacity: 0, scaleY: 0.8 }}
                          animate={{ height: "auto", opacity: 1, scaleY: 1 }}
                          exit={{ height: 0, opacity: 0, scaleY: 0.8 }}
                          transition={{
                            duration: 0.4,
                            ease: [0.25, 0.1, 0.25, 1],
                          }}
                          className="expanded-content"
                        >
                          {Object.entries(row)
                            .filter(
                              ([key]) =>
                                !headers.includes(key) &&
                                ![
                                  "_id",
                                  "password",
                                  "createdAt",
                                  "updatedAt",
                                  "__v",
                                ].includes(key)
                            ) // Exclude already visible columns
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
                                />
                              )
                            )}
                        </motion.div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))
          ) : (
            <tr>
              <td
                colSpan={headers.length + 2}
                style={{
                  textAlign: "center",
                  color: "rgb(240 28 28)",
                  fontWeight: "bold",
                }}
              >
                No records found
              </td>
            </tr>
          )}
        </tbody>
      </table>
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
                    deleteRow(deleteId);
                    setDeleteId(null);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Table;
