import React, { useEffect, useState } from "react";
import config from "../../../config.js";
import "./style.scss";
import axios from "axios";
import CustomAlert from "../../../components/CustomAlert";

const backendUrl = config.backend_url;

function FinanceData() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .substring(0, 10);
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .substring(0, 10);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(lastOfMonth);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showPopup, setShowPopup] = useState(false);
  const [popupData, setPopupData] = useState([]);
  const [popupSearch, setPopupSearch] = useState("");
  const [popupTitle, setPopupTitle] = useState("");
  const [deleteDate, setDeleteDate] = useState({
    show: false,
    label: null,
    startDate: null,
    endDate: null,
  });
  const [alert, setAlert] = useState(null);
  const limit = 50;

  const fetchData = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        search,
        type,
        startDate:
          new Date(startDate).toISOString().split("T")[0] + "T00:00:00.000Z",
        endDate:
          new Date(endDate).toISOString().split("T")[0] + "T23:59:59.999Z",
      });

      const res = await fetch(
        `${backendUrl}/finance/main-labels?${query.toString()}`
      );
      const json = await res.json();
      if (json.success) {
        const pagedData = json.data.slice((page - 1) * limit, page * limit);
        setData(pagedData);
        setTotalPages(Math.ceil(json.data.length / limit));
      }

    } catch (err) {
      console.error("Error fetching data", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPopupData = async (label, role) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${backendUrl}/finance/details/${label}?role=${role}`
      );
      const json = await res.json();
      if (json.success) {
        setPopupData(json.data);
        setPopupTitle(role === "main" ? "Details" : "Working");
        setShowPopup(true);
      }
    } catch (err) {
      console.error("Failed to fetch popup data", err);
    } finally {
      setLoading(false);
    }
  };

  const deleteRow = async () => {
    try {
      const res = await axios.delete(`${backendUrl}/finance/delete/${deleteDate.label}`, {
        params: {
          startDate: deleteDate.startDate,
          endDate: deleteDate.endDate,
        },
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });

      if (res.data.success) {
        setAlert({ type: "success", message: res.data.message });
        fetchData();
        return;
      }
      if (res.data.warning) {
        setAlert({ type: "warning", message: res.data.message });
        return;
      }
     
    } catch (err) {
      setAlert({ type: "error", message: "Failed to delete finance" });
      console.error("Failed to delete finance", err);
    } finally {
      setDeleteDate({
        show: false,
        label: null,
        startDate: null,
        endDate: null,
      })
      fetchData();
      setTimeout(() => {
        setAlert(null);
      }, 3000);
    }
  };

  const handelDeleteClick = (data) => {
    setDeleteDate({
      show: true,
      label: data.label,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    });
  };

  useEffect(() => {
    fetchData();
  }, [search, type, startDate, endDate, page]);

  const filteredPopupData = popupData.filter((entry) =>
    Object.values(entry).some((val) =>
      val?.toString().toLowerCase().includes(popupSearch.toLowerCase())
    )
  );

  return (
    <div className="finance-data-container">
      {alert && (
        <CustomAlert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
      <div className="filters">
        <input
          type="text"
          placeholder="Search Label..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All Types</option>
          <option value="Credit Note Voucher">Credit Note Voucher</option>
          <option value="Credit Note Working">Credit Note Working</option>
          <option value="Debit Note Voucher">Debit Note Voucher</option>
          <option value="Debit Note Working">Debit Note Working</option>
        </select>
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
              <th>Label</th>
              <th>Type</th>
              <th>Function</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index}>
                <td>{item.label}</td>
                <td>{item.type}</td>
                <td>{item.function}</td>
                <td>{new Date(item.startDate).toLocaleDateString()}</td>
                <td>{new Date(item.endDate).toLocaleDateString()}</td>
                <td>
                  <button
                    className="action-btn orange"
                    onClick={() => fetchPopupData(item.label, "main")}
                  >
                    View Details
                  </button>
                  <button
                    className="action-btn"
                    onClick={() => fetchPopupData(item.label, "sub")}
                  >
                    View Working
                  </button>
                  <button
                    className="delete-btn"
                    onClick={() => handelDeleteClick(item)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pagination">
        <button
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          disabled={page === 1}
        >
          Prev
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
          disabled={page === totalPages}
        >
          Next
        </button>
      </div>

      {showPopup && (
        <div className="popup-overlay">
          <div className="popup">
            <div className="popup-header">
              <h3>{popupTitle}</h3>
              <button onClick={() => setShowPopup(false)}>✖</button>
            </div>
            <input
              type="text"
              placeholder="Search in details..."
              className="popup-search"
              value={popupSearch}
              onChange={(e) => setPopupSearch(e.target.value)}
            />
            <div className="popup-content">
              <table>
                <thead>
                  <tr>
                    {popupData[0] &&
                      Object.keys(popupData[0]).map((key, i) => (
                        <th key={i}>{key}</th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPopupData.map((entry, i) => (
                    <tr key={i}>
                      {Object.values(entry).map((val, j) => (
                        <td key={j}>
                          {typeof val === "object" && val !== null
                            ? JSON.stringify(val)
                            : val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {deleteDate.show  && (
        <div className="delete-modal" onClick={() => setDeleteDate({ ...deleteDate, show: false })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-content">
              <div className="delete-model-header">
                Are you sure you want to delete {deleteDate.label} Finance?
              </div>
              <div className="delete-modal-buttons">
                <button
                  className="cancel-btn"
                  onClick={() =>setDeleteDate({ ...deleteDate, show: false })}
                >
                  Cancel
                </button>
                <button
                  className="delete-btn"
                  onClick={() => {
                    deleteRow();
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

export default FinanceData;
