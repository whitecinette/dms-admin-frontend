import "./style.scss";
import downloadCSVTemplate from "../../components/downloadCSVTemplate";
import { IoAddSharp } from "react-icons/io5";
import { FaDownload, FaFileUpload, FaUserCog } from "react-icons/fa";
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
  const [selectedFile, setSelectedFile] = useState(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [addBox, setAddBox] = useState(false);
  const [addData, setAddData] = useState({});
  const role = localStorage.getItem("role");

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
      setTotalRecords(res.data.totalRecords);
    } catch (error) {
      setUser({});
      console.log(error);
      // setError(
      //   error?.response?.data?.message ||
      //     error?.message ||
      //     "Something went wrong. Please try again."
      // );
      // setTimeout(() => {
      //   setError("");
      // }, 3000);
    }
  };

  //delete addUsers
  const deleteActorCode = async (id) => {
    try {
      await axios.delete(`${backendUrl}/delete/actorcode/${id}`, {
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });
      getActorCodes();
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

  const editActorCode = async (data, id) => {
    try {
      await axios.put(`${backendUrl}/edit-actorcode/${id}`, data, {
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });
      getActorCodes();
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

  //register all user
  const handleRegisterClick = async () => {
    try {
      const res = await axios.put(
        `${backendUrl}/admin/register-update-from-actor-codes`
      );
      setSuccess(res.data.message);
      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (error) {
      console.error(error);
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

  //verify all user
  const handleVerifyClick = async () => {
    try {
      const res = await axios.put(
        `${backendUrl}/activate-all-users-in-all-cases`
      );
      setSuccess(res.data.message);
      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (error) {
      console.error(error);
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

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setSelectedFile(file);

    // Prepare FormData
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
      setSuccess(response.data.message);
      setTimeout(() => {
        setSuccess("");
      }, 3000);
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

  const addActorCode = async () => {
    try {
      const response = await axios.post(
        `${backendUrl}/add-actorcode`,
        addData,
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );
      setAddData({});
      setAddBox(false);
      getActorCodes();
      setSuccess(response.data.message);
      setTimeout(() => {
        setSuccess("");
      }, 3000);
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

  const totalPages = Math.ceil(totalRecords / 50);
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
  return (
    <div className="addUser-page">
      <div className="addUser-page-header">Add User</div>
      <div className="addUser-page-container">
        <div className="addUser-page-first-line">
          <div className="addUser-page-filter">
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => {
                setCurrentPage(1);
                setSearch(e.target.value);
              }}
            />
            <select
              value={status}
              onChange={(e) => {
                setCurrentPage(1);
                setStatus(e.target.value);
              }}
            >
              <option value="">Status</option>

              <option className="green" value="active">
                Active
              </option>
              <option className="red" value="inactive">
                Inactive
              </option>
            </select>
          </div>
          <div className="addUser-page-buttons">
            <div className="addUser-add-btn" onClick={() => setAddBox(true)}>
              <IoAddSharp />
              Add New
            </div>
            <div className="Register-use-btn" onClick={handleRegisterClick}>
              <FaUserCog />
              Register All User
            </div>
            <div className="verify-use-btn" onClick={handleVerifyClick}>
              <GoVerified />
              Verify All User
            </div>
            <div className="addUser-upload-btn">
              <label htmlFor="file-upload" className="browse-btn">
                <FaFileUpload />
                Upload Bulk CSV
              </label>
              <input
                type="file"
                id="file-upload"
                hidden
                onChange={handleFileChange}
              />
            </div>
            <div
              className="addUser-download-btn"
              onClick={() =>
                downloadCSVTemplate(
                  user.headers.filter(
                    (key) =>
                      !["_id", "createdAt", "updatedAt", "__v"].includes(key)
                  )
                )
              }
            >
              <FaDownload />
              Download CSV Format
            </div>
          </div>
        </div>
        <Table
          data={user}
          onSort={getActorCodes}
          handleSave={editActorCode}
          deleteRow={deleteActorCode}
        />

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
      </div>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      {addBox && (
        <div className="addUser-add-box"  onClick={() => setAddBox(false)}>
          <div className="addUser-add-container" onClick={(e)=> e.stopPropagation()}>
            <div className="addUser-add-content">
              <div className="addUser-add-header">Add addUser</div>
              <div className="addUser-add-form">
                <input
                  type="text"
                  name="code"
                  placeholder="Code"
                  value={addData.code}
                  onChange={handleChange}
                  required
                />
                <input
                  type="text"
                  name="name"
                  placeholder="Name"
                  value={addData.name}
                  onChange={handleChange}
                  required
                />
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
                <input
                  type="text"
                  name="position"
                  placeholder="Position"
                  value={addData.position}
                  onChange={handleChange}
                  required
                />
                <select
                  name="status"
                  value={addData.status}
                  onChange={handleChange}
                >
                  <option value="">Select Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <input
                  type="text"
                  name="parent_code"
                  placeholder="Parent Code"
                  value={addData.parent_code}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="addUser-add-button">
                <button className="addUser-submit-btn" onClick={addActorCode}>
                  Submit
                </button>
                <button
                  className="addUser-cancel-btn"
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
