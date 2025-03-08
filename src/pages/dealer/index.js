import React, { useEffect, useState } from "react";
import { IoAddSharp } from "react-icons/io5";
import config from "../../config.js";
import "./style.scss";
import Table from "../../components/table/index.js";
import axios from "axios";

const backendUrl = config.backend_url;

function Dealers() {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [dealers, setDealers] = useState([]);
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // ✅ Fetch Dealers Data
  const fetchDealersData = async (sort = "createdAt", order) => {
    try {
      const response = await axios.get(`${backendUrl}/user/get-by-admins`, {
        params: {
          page: currentPage,
          limit: 50,
          sort: String(sort),
          order: order,
          search: search,
          role: "dealer",
        },
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });

      // ✅ Ensure Headers Are Set Correctly
      response.data.headers = [
        "name",
        "code",
        "owner_details.email",
        "role",
        "position",
        "status",
        "expand"
      ];

      setDealers(response.data); // ✅ Fix Incorrect State Setter
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

  
  // ✅ Delete Dealer
  const deleteDealer = async (id) => {
    try {
      await axios.delete(`${backendUrl}/user/delete-by-admins/${id}`, {
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });
      fetchDealersData();
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

  // ✅ Edit Dealer
  const editDealer = async (data, id) => {
    try {
      // console.log("data:", data);

      await axios.put(`${backendUrl}/user/edit-by-admins/${id}`, data, {
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });
      fetchDealersData();
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
    fetchDealersData();
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
    <div className="dealer-page">
      <div className="dealer-page-header">Dealer</div>
      <div className="dealer-page-content">
        <div className="dealer-page-first-line">
          <div className="dealer-page-filter">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setCurrentPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Search dealers"
            />
            <div className="dealer-page-add-button">
              <IoAddSharp />
              Dealer
            </div>
          </div>
        </div>

        {/* ✅ Pass Data Correctly to Table */}
        <Table
          data={dealers}
          onSort={fetchDealersData}
          deleteRow={deleteDealer}
          handleSave={editDealer}
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

export default Dealers; // ✅ Fix Component Name
