import React, { useEffect, useState } from "react";
import { IoAddSharp } from "react-icons/io5";
import config from "../../config.js";
import "./style.scss";
import Table from "../../components/table";
import axios from "axios";

const backendUrl = config.backend_url;

function Users() {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [employee, setEmployee] = useState(0);
  const [dealer, setDealer] = useState(0);
  const [mdd, setMdd] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  //get users
  const fetchUsersData = async (sort = "createdAt", order) => {
    console.log("sort", sort);
    console.log("order", order);
    try {
      const response = await axios.get(`${backendUrl}/user/get-by-admins`, {
        params: {
          page: currentPage,
          limit: 50,
          sort: String(sort),
          order: order,
          search: search,
          role: role,
        },
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });
      response.data.headers = [
        "name",
        "code",
        "email",
        "role",
        "position",
        "status",
      ];
      setUsers(response.data);
      setEmployee(response.data.employees);
      setDealer(response.data.dealers);
      setMdd(response.data.mdds);
      setTotalRecords(response.data.totalRecords);
    } catch (error) {
      console.log("err:", error);
      setErrorMessage(error?.response?.data?.message || error?.message || "Something went wrong. Please try again.");
      setTimeout(() => {
        setErrorMessage("");
      }, 3000);
    }
  };
  //delete user
  const deleteUser = async (id) => {
    try {await axios.delete(
        `${backendUrl}/user/delete-by-admins/${id}`,
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );
      fetchUsersData();
    } catch (error) {
      console.log("err:", error);
      setErrorMessage(error?.response?.data?.message || error?.message || "Something went wrong. Please try again.");
      setTimeout(() => {
        setErrorMessage("");
      }, 3000);
    }
  };
  //edit user
  const editUser = async (data, id) => {
    try {
      console.log("data:", data);

      await axios.put(`${backendUrl}/user/edit-by-admins/${id}`, data, {
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });
      fetchUsersData();
    } catch (error) {
      console.log("err:", error);
      setErrorMessage(error?.response?.data?.message || error?.message || "Something went wrong. Please try again.");
      setTimeout(() => {
        setErrorMessage("");
      }, 3000);
    }
  };
  useEffect(() => {
    fetchUsersData();
  }, [currentPage, search, role]);

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
    <div className="User-page">
      <div className="user-page-header">Users</div>
      <div className="user-page-content">
        <div className="user-page-first-line">
          <div className="user-page-filter">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setCurrentPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Search Users"
            />
            <div className="user-page-user-count">
              <div className="user-count green" onClick={() => setRole("")}>
                Total Users: {totalRecords}
              </div>
              <div
                className="user-count orange"
                onClick={() => setRole("Employee")}
              >
                Employee: {employee}
              </div>
              <div
                className="user-count purple"
                onClick={() => setRole("Dealer")}
              >
                Dealer: {dealer}
              </div>
              <div className="user-count red" onClick={() => setRole("MDD")}>
                MDD: {mdd}
              </div>
            </div>
            <div className="user-page-add-button">
              <IoAddSharp />
              User
            </div>
          </div>
        </div>

        <Table
          data={users}
          onSort={fetchUsersData}
          deleteRow={deleteUser}
          handleSave={editUser}
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
      {errorMessage && <div className="error-message">{errorMessage}</div>}
    </div>
  );
}

export default Users;
