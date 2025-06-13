import React, { useEffect, useState } from "react";
import "./style.scss";
import axios from "axios";
import config from "../../../config";

const backend_url = config.backend_url;

const formatDate = (dateInput) => {
  // Get only the date part to avoid time zone shift
  const datePart = dateInput?.slice(0, 10); // "YYYY-MM-DD"
  if (!datePart) return "N/A";

  const [year, month, day] = datePart.split("-");
  const dateObj = new Date(year, month - 1, day); // month is 0-indexed

  const formattedDate = dateObj.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return formattedDate || "N/A";
};

export const SalesReport = () => {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [salesType, setSalesType] = useState("");
  const [salesReport, setSalesReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPage, setTotalPage] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  //get Sales Report
  const getSalesReport = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${backend_url}/admin/getSalesRecords`, {
        params: {
          startDate,
          endDate,
          search,
          salesType,
          page: currentPage,
          limit: 100,
        },
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });
      setSalesReport(res.data.data);
      setTotalPage(res.data.totalPages);
    } catch (err) {
      setSalesReport([]);
      setTotalPage(0);
      console.log("Error getting Sales Report: ", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getSalesReport();
  }, [search, startDate, endDate, salesType, currentPage]);

  // ✅ Handle Pagination
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPage) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  return (
    <div className="SalesReport-page">
      <div className="SalesReport-filter-container">
        <div className="SalesReport-filter">
          <div className="search-filter">
            <input
              value={search}
              name="search"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Product Code ..."
            />
          </div>
          <div className="date-filter">
            <label>From:</label>
            <input
              type="date"
              value={startDate}
              name="fromDate"
              onChange={(e) => setStartDate(e.target.value)}
            />
            <label>To:</label>
            <input
              type="date"
              value={endDate}
              name="toDate"
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="status-filter">
            <select
              name="salesType"
              value={salesType}
              onChange={(e) => setSalesType(e.target.value)}
            >
              <option value={""}>Select Sales Type</option>
              <option value={"Sell Out"}>Sell Out</option>
              <option value={"Sell Thru2"}>Sell Thru2</option>
            </select>
          </div>
        </div>
      </div>
      <div className="SalesReport-table-container">
        <table className="SalesReport-table">
          <thead>
            <tr>
              <th>SPD</th>
              <th>Mdd</th>
              <th>Sales Type</th>
              <th>Buyer Code</th>
              <th>Buyer Type</th>
              <th>Date</th>
              <th>Product Code</th>
              <th>Channel</th>
              <th>Quantity</th>
              <th>Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center" }}>
                  Loading ...
                </td>
              </tr>
            ) : salesReport.length > 0 ? (
              salesReport.map((row, rowIndex) => (
                <>
                  <tr key={rowIndex}>
                    <td>{row.spd}</td>
                    <td>{row.mdd}</td>
                    <td>{row.sales_type}</td>
                    <td>{row.buyer_code}</td>
                    <td>{row.buyer_type}</td>
                    <td>{formatDate(row.date)}</td>
                    <td>{row.product_code}</td>
                    <td>{row.channel}</td>
                    <td>{row.quantity}</td>
                    <td>{row.total_amount}</td>
                  </tr>
                </>
              ))
            ) : (
              <tr>
                <td colSpan={9} style={{ textAlign: "center" }}>
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
          Page {currentPage} of {totalPage}
        </span>
        <button
          onClick={nextPage}
          className="page-btn"
          disabled={currentPage === totalPage}
        >
          &gt;
        </button>
      </div>
    </div>
  );
};
