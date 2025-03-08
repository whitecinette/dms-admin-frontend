import React, { useEffect, useState } from "react";
import { IoAddSharp } from "react-icons/io5";
import config from "../../config.js";
import "./style.scss";
import Table from "../../components/table/index.js";
import axios from "axios";

const backendUrl = config.backend_url;

function Mdd() {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [mdds, setmdds] = useState([]);
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // ✅ Fetch mdds Data
  const fetchmddsData = async (sort = "createdAt", order) => {
    try {
      const response = await axios.get(`${backendUrl}/user/get-by-admins`, {
        params: {
          page: currentPage,
          limit: 50,
          sort: String(sort),
          order: order,
          search: search,
          role: "mdd",
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
        "expand"
      ];

      setmdds(response.data); // ✅ Fix Incorrect State Setter
      setTotalRecords(response.data.totalRecords);
    } catch (error) {
      console.log("err:", error);
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Something went wrong. Please try again."
      );
      setTimeout(() => {
        setErrorMessage("");
      }, 3000);
    }
  };

  // ✅ Delete mdd
  const deletemdd = async (id) => {
    try {
      await axios.delete(`${backendUrl}/user/delete-by-admins/${id}`, {
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });
      fetchmddsData();
    } catch (error) {
      console.log("err:", error);
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Something went wrong. Please try again."
      );
      setTimeout(() => {
        setErrorMessage("");
      }, 3000);
    }
  };

  // ✅ Edit mdd
  const editmdd = async (data, id) => {
    try {
      // console.log("data:", data);

      await axios.put(`${backendUrl}/user/edit-by-admins/${id}`, data, {
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });
      fetchmddsData();
    } catch (error) {
      console.log("err:", error);
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Something went wrong. Please try again."
      );
      setTimeout(() => {
        setErrorMessage("");
      }, 3000);
    }
  };

  // ✅ Fetch Data on Component Mount & Update
  useEffect(() => {
    fetchmddsData();
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

  return (
    <div className="mdd-page">
      <div className="mdd-page-header">MDD</div>
      <div className="mdd-page-content">
        <div className="mdd-page-first-line">
          <div className="mdd-page-filter">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setCurrentPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Search mdds"
            />
            <div className="mdd-page-add-button">
              <IoAddSharp />
              mdd
            </div>
          </div>
        </div>

        {/* ✅ Pass Data Correctly to Table */}
        <Table
          data={mdds}
          onSort={fetchmddsData}
          deleteRow={deletemdd}
          handleSave={editmdd}
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
      {errorMessage && <div className="error-message">{errorMessage}</div>}
    </div>
  );
}

export default Mdd;
