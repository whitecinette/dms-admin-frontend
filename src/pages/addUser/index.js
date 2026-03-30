import "./style.scss";
import downloadCSVTemplate from "../../components/downloadCSVTemplate";
import { IoAddSharp } from "react-icons/io5";
import {
  FaDownload,
  FaFileUpload,
  FaUserCog,
  FaSearch,
  FaTimes,
} from "react-icons/fa";
import { useEffect, useState } from "react";
import axios from "axios";
import config from "../../config.js";
import Table from "../../components/table";
import { GoVerified } from "react-icons/go";

const backendUrl = config.backend_url;

export default function AddUser() {
  const [user, setUser] = useState({});
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [status, setStatus] = useState("");
  const [totalRecords, setTotalRecords] = useState(0);
  const [addBox, setAddBox] = useState(false);
  const [addData, setAddData] = useState({
    code: "",
    name: "",
    role: "",
    position: "",
    status: "",
    parent_code: "",
  });

  const role = localStorage.getItem("role");

  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(""), 3000);
  };

  const showError = (message) => {
    setError(message);
    setTimeout(() => setError(""), 3000);
  };

  const getActorCodes = async (sort = "createdAt", order) => {
    try {
      const res = await axios.get(`${backendUrl}/get-actorcode`, {
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
        params: {
          page: currentPage,
          limit: 50,
          sort: String(sort),
          order: order,
          search: search,
          status: status,
        },
      });

      if (res.data?.data?.length > 0) {
        res.data.headers = Object.keys(res.data.data[0]).filter(
          (key) => !["_id", "createdAt", "updatedAt", "__v"].includes(key)
        );
      } else {
        res.data.headers = [];
      }

      setUser(res.data);
      setTotalRecords(res.data.totalRecords || 0);
    } catch (error) {
      setUser({});
      console.log(error);
    }
  };

  const deleteActorCode = async (id) => {
    try {
      await axios.delete(`${backendUrl}/delete/actorcode/${id}`, {
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });
      showSuccess("User deleted successfully");
      getActorCodes();
    } catch (error) {
      console.log("err:", error);
      showError(
        error?.response?.data?.message ||
          error?.message ||
          "Something went wrong. Please try again."
      );
    }
  };

  const editActorCode = async (data, id) => {
    try {
      await axios.put(`${backendUrl}/edit-actorcode/${id}`, data, {
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });
      showSuccess("User updated successfully");
      getActorCodes();
    } catch (error) {
      console.log("err:", error);
      showError(
        error?.response?.data?.message ||
          error?.message ||
          "Something went wrong. Please try again."
      );
    }
  };

  const handleRegisterClick = async () => {
    try {
      const res = await axios.put(
        `${backendUrl}/admin/register-update-from-actor-codes`
      );
      showSuccess(res.data.message || "All users registered successfully");
    } catch (error) {
      console.error(error);
      showError(
        error?.response?.data?.message ||
          error?.message ||
          "Something went wrong. Please try again."
      );
    }
  };

  const handleVerifyClick = async () => {
    try {
      const res = await axios.put(
        `${backendUrl}/activate-all-users-in-all-cases`
      );
      showSuccess(res.data.message || "All users verified successfully");
    } catch (error) {
      console.error(error);
      showError(
        error?.response?.data?.message ||
          error?.message ||
          "Something went wrong. Please try again."
      );
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        `${backendUrl}/upload-actorcode-csv`,
        formData,
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
            "Content-Type": "multipart/form-data",
          },
        }
      );

      getActorCodes();
      showSuccess(response.data.message || "CSV uploaded successfully");
      event.target.value = "";
    } catch (error) {
      console.log("err:", error);
      showError(
        error?.response?.data?.message ||
          error?.message ||
          "Something went wrong. Please try again."
      );
    }
  };

  const addActorCode = async () => {
    try {
      await axios.post(`${backendUrl}/add-actorcode`, addData, {
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });

      setAddData({
        code: "",
        name: "",
        role: "",
        position: "",
        status: "",
        parent_code: "",
      });
      setAddBox(false);
      getActorCodes();
      showSuccess("User added successfully");
    } catch (error) {
      console.log("err:", error);
      showError(
        error?.response?.data?.message ||
          error?.message ||
          "Something went wrong. Please try again."
      );
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAddData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  useEffect(() => {
    getActorCodes();
  }, [currentPage, search, status]);

  const totalPages = Math.max(1, Math.ceil(totalRecords / 50));

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  return (
    <div className="addUser-page">
      <div className="page-topbar">
        <div>
          <h1>Add User</h1>
          <p>
            Manage actor codes, add users manually, bulk upload CSV, and run
            register or verify actions.
          </p>
        </div>
      </div>

      <div className="stats-strip">
        <div className="stat-card">
          <div className="stat-label">Total Records</div>
          <div className="stat-value">{totalRecords}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Current Page</div>
          <div className="stat-value">{currentPage}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Status Filter</div>
          <div className="stat-value small">{status || "All"}</div>
        </div>
      </div>

      <div className="content-card">
        <div className="toolbar">
          <div className="toolbar-left">
            <div className="search-box">
              <FaSearch />
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => {
                  setCurrentPage(1);
                  setSearch(e.target.value);
                }}
              />
            </div>

            <div className="field-group compact">
              <label>Status</label>
              <select
                value={status}
                onChange={(e) => {
                  setCurrentPage(1);
                  setStatus(e.target.value);
                }}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="toolbar-actions">
            <button className="primary-btn" onClick={() => setAddBox(true)}>
              <IoAddSharp />
              Add New
            </button>

            <button className="neutral-btn" onClick={handleRegisterClick}>
              <FaUserCog />
              Register All User
            </button>
 
            <button className="violet-btn" onClick={handleVerifyClick}>
              <GoVerified />
              Verify All User
            </button>

            <label className="secondary-btn file-upload-btn" htmlFor="file-upload">
              <FaFileUpload />
              Upload Bulk CSV
            </label>
            <input
              type="file"
              id="file-upload"
              hidden
              onChange={handleFileChange}
            />

            <button
              className="accent-btn"
              onClick={() =>
                downloadCSVTemplate(
                  (user.headers || []).filter(
                    (key) =>
                      !["_id", "createdAt", "updatedAt", "__v"].includes(key)
                  )
                )
              }
            >
              <FaDownload />
              Download CSV Format
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <Table
            data={user}
            onSort={getActorCodes}
            handleSave={editActorCode}
            deleteRow={deleteActorCode}
          />
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

      {(error || success) && (
        <div className="toast-stack">
          {error && <div className="toast error">{error}</div>}
          {success && <div className="toast success">{success}</div>}
        </div>
      )}

      {addBox && (
        <div className="modal-overlay" onClick={() => setAddBox(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3>Add User</h3>
                <p>Enter the actor code details to create a new user record.</p>
              </div>
              <button className="icon-btn" onClick={() => setAddBox(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="modal-body form-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Code</label>
                  <input
                    type="text"
                    name="code"
                    placeholder="Enter code"
                    value={addData.code}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Enter name"
                    value={addData.name}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Role</label>
                  <select
                    name="role"
                    value={addData.role}
                    onChange={handleChange}
                  >
                    {role === "super_admin" ? (
                      <>
                        <option value="">Select Role</option>
                        <option value="admin">Admin</option>
                        <option value="employee">Employee</option>
                        <option value="dealer">Dealer</option>
                        <option value="mdd">MDD</option>
                      </>
                    ) : (
                      <>
                        <option value="">Select Role</option>
                        <option value="employee">Employee</option>
                        <option value="dealer">Dealer</option>
                        <option value="mdd">MDD</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label>Position</label>
                  <input
                    type="text"
                    name="position"
                    placeholder="Enter position"
                    value={addData.position}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={addData.status}
                    onChange={handleChange}
                  >
                    <option value="">Select Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Parent Code</label>
                  <input
                    type="text"
                    name="parent_code"
                    placeholder="Enter parent code"
                    value={addData.parent_code}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="secondary-plain-btn" onClick={() => setAddBox(false)}>
                Cancel
              </button>
              <button className="primary-btn" onClick={addActorCode}>
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}