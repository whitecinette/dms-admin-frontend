// Outstanding data
import React, { useEffect, useState } from "react";
import config from "../../../config.js";
import "./style.scss";
import axios from "axios";

const backendUrl = config.backend_url;

function FinanceVouchers() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().substring(0, 10);
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().substring(0, 10);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(lastOfMonth);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 50;

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/finance-voucher/get`, {
        params: {
          startDate,
          endDate,
          page,
          limit,
        },
      });
      if (res.data.success) {
        setData(res.data.data);
        setTotalPages(Math.ceil(res.data.total / limit));
      }
    } catch (err) {
      console.error("Error fetching finance vouchers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, page]);

  return (
    <div className="finance-data-container">
      <div className="filters">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="loader">Loading...</p>
      ) : (
        <table className="finance-table">
          <thead>
            <tr>
              <th>MDD Code</th>
              <th>MDD Name</th>
              <th>Invoice Number</th>
              <th>Voucher Type</th>
              <th>Amount</th>
              <th>Pending</th>
              <th>Due Date</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index}>
                <td>{item.code}</td>
                <td>{item.name}</td>
                <td>{item.invoiceNumber}</td>
                <td>{item.voucherType}</td>
                <td>{item.invoiceAmount}</td>
                <td>{item.pendingAmount}</td>
                <td>{item.dueDate}</td>
                <td>{item.remarks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pagination">
        <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1}>Prev</button>
        <span>Page {page} of {totalPages}</span>
        <button onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages}>Next</button>
      </div>
    </div>
  );
}

export default FinanceVouchers;
