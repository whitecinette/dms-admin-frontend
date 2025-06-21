import React, { useEffect, useState } from "react";
import config from "../../config.js";
import "./style.scss";
import Table from "../../components/table/index.js";
import axios from "axios";
import { FaPlus } from "react-icons/fa";
import CustomAlert from "../../components/CustomAlert";

const backendUrl = config.backend_url;

function AdminPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [Admin, setAdmin] = useState([]);
  const [search, setSearch] = useState("");
  const [alert, setAlert] = useState(null);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [newAdminData, setNewAdminData] = useState({
    name: "",
    contact: "",
    email: "",
    password: "",
  });

  // ✅ Fetch Admin Data
  const fetchAdminData = async (sort = "createdAt", order) => {
    try {
      const response = await axios.get(`${backendUrl}/user/get-by-admins`, {
        params: {
          page: currentPage,
          limit: 50,
          sort: String(sort),
          order: order,
          search: search,
          role: ["admin"],
        },
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });

      // ✅ Ensure Headers Are Set Correctly
      response.data.headers = [
        "name",
        "code",
        "email",
        "role",
        "position",
        "status",
        "expand",
      ];

      setAdmin(response.data); // ✅ Fix Incorrect State Setter
      setTotalRecords(response.data.totalRecords);
    } catch (error) {
      console.log("err:", error);
      setAlert({
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Something went wrong. Please try again.",
      });
    }
  };

  // ✅ Delete Admin
  const deleteAdmin = async (id) => {
    try {
      await axios.delete(`${backendUrl}/user/delete-by-admins/${id}`, {
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });
      fetchAdminData();
    } catch (error) {
      console.log("err:", error);
      setAlert({
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Something went wrong. Please try again.",
      });
    }
  };

  // ✅ Edit Admin
  const editAdmin = async (data, id) => {
    try {
      // console.log("data:", data);

      await axios.put(`${backendUrl}/user/edit-by-admins/${id}`, data, {
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });
      fetchAdminData();
    } catch (error) {
      console.log("err:", error);
      setAlert({
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Something went wrong. Please try again.",
      });
    }
  };

  // ✅ Fetch Data on Component Mount & Update
  useEffect(() => {
    fetchAdminData();
  }, [currentPage, search]);

  const totalPages = Math.ceil(totalRecords / 50);

  // ✅ Handle Pagination
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

  // Add Admin
  const handleAddAdmin = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${backendUrl}/register-admin-by-super-admin`,
        newAdminData,
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );
      setShowAddAdminModal(false);
      setNewAdminData({
        name: "",
        contact: "",
        email: "",
        password: "",
      });
      setAlert({
        type: "success",
        message: "Admin added successfully!",
      });
      fetchAdminData();
    } catch (error) {
      console.log("err:", error);
      setAlert({
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Something went wrong. Please try again.",
      });
    }
  };

  const handleNewAdminChange = (e) => {
    const { name, value } = e.target;
    setNewAdminData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="Admin-page">
      <div className="Admin-page-header">Admin</div>
      <div className="Admin-page-content">
        <div className="Admin-page-first-line">
          <div className="Admin-page-filter">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setCurrentPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Search Admin"
            />
          </div>
          {/**
             
             */}
        </div>

        {/* ✅ Pass Data Correctly to Table */}
        <Table
          data={Admin}
          onSort={fetchAdminData}
          deleteRow={deleteAdmin}
          handleSave={editAdmin}
        />

        {/* ✅ Pagination */}
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
      </div>
      {alert && (
        <CustomAlert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
      {showAddAdminModal && (
        <div
          className="add-admin-modal"
          onClick={() => setShowAddAdminModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h3>Add New Admin</h3>
                <button
                  className="close-btn"
                  onClick={() => setShowAddAdminModal(false)}
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleAddAdmin}>
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    name="name"
                    value={newAdminData.name}
                    onChange={handleNewAdminChange}
                    required
                    placeholder="Enter name"
                  />
                </div>
                <div className="form-group">
                  <label>Contact</label>
                  <input
                    type="text"
                    name="contact"
                    value={newAdminData.contact}
                    onChange={handleNewAdminChange}
                    required
                    placeholder="Enter contact"
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={newAdminData.email}
                    onChange={handleNewAdminChange}
                    required
                    placeholder="Enter email"
                  />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    name="password"
                    value={newAdminData.password}
                    onChange={handleNewAdminChange}
                    required
                    placeholder="Enter password"
                  />
                </div>
                <div className="modal-buttons">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setShowAddAdminModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn">
                    Add Admin
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPage; // ✅ Fix Component Name
