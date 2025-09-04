import React, { useEffect, useState } from "react";
import "./style.scss";
import axios from "axios";
import config from "../../config";
import CustomAlert from "../../components/CustomAlert";

const backend_url = config.backend_url;

// Add this component inside TravelExpenses before the return statement
const DocumentViewer = ({ documents, onClose }) => {
  const [docIndex, setDocIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  const handleNext = (e) => {
    e.stopPropagation();
    if (docIndex < documents.length - 1) {
      setDocIndex(docIndex + 1);
    }
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    if (docIndex > 0) {
      setDocIndex(docIndex - 1);
    }
  };

  const getDocumentType = (url) => {
    const extension = url.split(".").pop().toLowerCase();
    return ["jpg", "jpeg", "png", "gif"].includes(extension) ? "image" : "pdf";
  };

  return (
    <div className="document-viewer-overlay" onClick={onClose}>
      <div
        className="document-viewer-content"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-button" onClick={onClose}>
          &times;
        </button>

        {getDocumentType(documents[docIndex]) === "image" ? (
          <div className="image-container">
            <img
              src={documents[docIndex]}
              alt={`Document ${docIndex + 1}`}
              onError={() => setImageError(true)}
              style={{ display: imageError ? "none" : "block" }}
            />
            {imageError && (
              <div className="error-document">
                There is an error loading this image. Please contact the Admin.
              </div>
            )}
          </div>
        ) : (
          <div className="pdf-container">
            <iframe
              src={`${documents[docIndex]}#toolbar=0`}
              title={`Document ${docIndex + 1}`}
              width="100%"
              height="100%"
              onError={() => setImageError(true)}
              style={{ display: imageError ? "none" : "block" }}
            />
            {imageError && (
              <div className="error-document">
                There is an error loading this document. Please contact the
                Admin.
              </div>
            )}
          </div>
        )}
        {documents.length > 1 && (
          <div className="navigation-buttons">
            <button
              className="nav-button prev"
              onClick={handlePrev}
              disabled={docIndex === 0}
            >
              &#8592;
            </button>
            <span className="document-counter">
              {docIndex + 1} / {documents.length}
            </span>
            <button
              className="nav-button next"
              onClick={handleNext}
              disabled={docIndex === documents.length - 1}
            >
              &#8594;
            </button>
          </div>
        )}
      </div>
       
    </div>
  );
};

const TravelExpenses = () => {
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [billType, setBillType] = useState("");
  const [billData, setBillData] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedImages, setSelectedImages] = useState([]);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "",
  });

  function formatAmount(amount) {
    if (isNaN(amount)) return "-";
    return "₹" + amount.toLocaleString("en-IN");
  }

  // Update the handleStatusChange function
  const handleStatusChange = async (billId, newStatus) => {
    // If status is being changed to "paid", show amount popup
    try {
      // Show loading state
      setLoading(true);

      // Make API call to update status
      const res = await axios.put(
        `${backend_url}/edit-travel-bill/${billId}`,
        {
          status: newStatus,
        },
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );
      // Refresh the data from server
      setAlert({
        show: true,
        message: res?.data?.message || "Successfully changed the bill status ",
        type: res?.data?.status || "success",
      });
    } catch (error) {
      console.error("Error updating status:", error);
      // Show error message to user
      setAlert({
        show: true,
        message: error.response?.data?.message || "Error updating status",
        type: error.response?.data?.status || error,
      });
    } finally {
      getBillsData();
      setTimeout(() => {
        setAlert({
          show: false,
          message: "",
          type: "",
        });
      }, 3000);

      setLoading(false);
    }
  };

  //handle Get Bills
  const getBillsData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${backend_url}/get-bills-for-admin`, {
        params: {
          search,
          page,
          fromDate,
          toDate,
          status,
          billType,
          limit: 20,
        },
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });
      setBillData(res.data.bills);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.log("error getting bills: ", err);
      setBillData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getBillsData();
  }, [search, page, FormData, toDate, status, billType]);

  // ✅ Handle Pagination
  const prevPage = () => {
    if (page > 1) {
      setPage((prev) => prev - 1);
    }
  };

  const nextPage = () => {
    if (page < totalPages) {
      setPage((prev) => prev + 1);
    }
  };

  const isEditable = (bill) => bill.status !== "paid";

  return (
    <div className="travelExpenses-page">
      {alert.show && (
        <CustomAlert
          message={alert.message}
          type={alert.type}
          onClose={() =>
            setAlert({
              show: false,
              message: "",
              type: "",
            })
          }
        />
      )}

      <div className="travelExpenses-header">Travel Expenses</div>
      <div className="travelExpanse-filter-container">
        <div className="travelExpanse-filter">
          <div className="search-filter">
            <input
              value={search}
              name="search"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
            />
          </div>
          <div className="date-filter">
            <label>From:</label>
            <input
              type="date"
              value={fromDate}
              name="fromDate"
              onChange={(e) => setFromDate(e.target.value)}
            />
            <label>To:</label>
            <input
              type="date"
              value={toDate}
              name="toDate"
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div className="status-filter">
            <select
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value={""}>Select Status</option>
              <option value={"pending"}>Pending</option>
              <option value={"approved"}>Approved</option>
              <option value={"rejected"}>Rejected</option>
              <option value={"paid"}>Paid</option>
            </select>
          </div>
          <div className="bill-filter">
            <select
              name="billType"
              value={billType}
              onChange={(e) => setBillType(e.target.value)}
            >
              <option value={""}>Select Bill Type</option>
              <option value={"Restaurant"}>Restaurant</option>
              <option value={"Travel"}>Travel</option>
              <option value={"Hotel"}>Hotel</option>
              <option value={"Transport"}>Transport</option>
              <option value={"Fuel"}>Fuel</option>
              <option value={"Other"}>Other</option>
            </select>
          </div>
        </div>
      </div>
      <div className="travelExpenses-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>System Code</th>
              <th>Firm Code</th>     {/* new */}
              <th>Firm Name</th>     {/* new */}
              <th>Bill Date</th> 
              <th>Remark</th>
              <th>Bill Type</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Images</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center" }}>
                  Loading...
                </td>
              </tr>
            ) : billData.length > 0 ? (
              billData.map((bill) => (
                <tr key={bill._id}>
                  <td>{bill.employeeName}</td>
                  <td>{bill.code}</td>
                  <td>{bill.system_code || "-"}</td>      {/* system_code */}
                  <td>{bill.firmCode || "-"}</td>        {/* firm_code */}
                  <td>{bill.firmName || "-"}</td>  
                  <td>
                    {bill.billDate
                      ? new Date(bill.billDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "-"}
                  </td> 
                  <td>{bill.remarks}</td>
                  <td>{bill.billType}</td>
                  <td>{formatAmount(bill.amount)}</td>
                  <td>
                    {isEditable(bill) ? (
                      <select
                        value={bill.status}
                        onChange={(e) =>
                          handleStatusChange(bill._id, e.target.value)
                        }
                        className={`status-select ${bill.status.toLowerCase()}`}
                        disabled={loading} // Disable while loading
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="paid">Paid</option>
                      </select>
                    ) : (
                      <span
                        className={`status-badge ${bill.status.toLowerCase()}`}
                      >
                        {bill.status}
                      </span>
                    )}
                  </td>
                  <td>
                    {bill.billImages && bill.billImages.length > 0 ? (
                      <button
                        className="view-bills-button"
                        onClick={() => {
                          setSelectedImages(bill.billImages);
                          setIsViewerOpen(true);
                        }}
                      >
                        View Bills ({bill.billImages.length})
                      </button>
                    ) : (
                      <span className="no-bills">No Bills</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: "center" }}>
                  No Data Found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* ✅ Pagination */}
      <div className="pagination">
        <button onClick={prevPage} className="page-btn" disabled={page === 1}>
          &lt;
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          onClick={nextPage}
          className="page-btn"
          disabled={page === totalPages}
        >
          &gt;
        </button>
      </div>
      {isViewerOpen && (
        <DocumentViewer
          documents={selectedImages}
          onClose={() => setIsViewerOpen(false)}
        />
      )}
    </div>
  );
};

export default TravelExpenses;
