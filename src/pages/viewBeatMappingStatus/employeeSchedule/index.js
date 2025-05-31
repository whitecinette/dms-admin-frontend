import axios from "axios";
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import config from "../../config.js";
import { IoIosArrowBack } from "react-icons/io";
import "./style.scss";
import { FaEdit, FaSave, FaTimes } from "react-icons/fa";
import Select from "react-select";
import CustomAlert from "../../components/CustomAlert";
import { RiDeleteBin6Line } from "react-icons/ri";

const backendUrl = config.backend_url;

export default function EmployeesSchedules() {
  const { code } = useParams();
  const [employeeData, setEmployeeData] = useState([]);
  const [dealerData, setDealerData] = useState([]);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("");
  const [dealerList, setDealerList] = useState([]);
  const [editRowIndex, setEditRowIndex] = useState(null);
  const [editedDealer, setEditedDealer] = useState({});
  const [deleteId, setDeleteId] = useState(null);
  const [deleteDealerId, setDeleteDealerId] = useState(null);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [securityKey, setSecurityKey] = useState("");
  const [alert, setAlert] = useState({ show: false, type: "", message: "" });
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const getEmployeeSchedule = async () => {
    const reqBody = {
      startDate,
      endDate,
      search,
      status,
      code,
    };
    try {
      const res = await axios.get(
        `${backendUrl}/get-weekly-beat-mapping-schedule-for-admin-by-code`,
        {
          params: reqBody,
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );
      setEmployeeData(res.data.employee);
      setDealerData(res.data.dealers);
    } catch (err) {
      setDealerData([]);
      console.error("Error fetching employee schedule", err);
    }
  };

  //get all dealer and Mdd for
  const getAllDealerAndMdd = async () => {
    try {
      const res = await axios.get(`${backendUrl}/user/get-dealer-for-admin`, {
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });
      setDealerList(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  //handle edit row
  const dealerOptions = (dealerList || []).map((dealer) => ({
    value: dealer.dealer_code,
    label: dealer.dealer_name,
  }));

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedDealer((prev) => ({ ...prev, [name]: value }));
  };

  const handleDealerChange = (selectedOption) => {
    setEditedDealer({
      ...editedDealer,
      code: selectedOption.value,
      name: selectedOption.label,
    });
  };

  const handleEditRow = (row, index) => {
    setEditRowIndex(index);
    setEditedDealer({ ...row });
  };

  const handleSave = async () => {
    try {
      const response = await axios.put(
        `${backendUrl}/edit-weekly-beat-mapping-schedule-for-admin-by-code/${code}`,
        editedDealer,
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );

      setAlert({
        show: true,
        type: "success",
        message: response.data.message || "Schedule updated successfully",
      });
      setEditedDealer({});
      getEmployeeSchedule();
      setEditRowIndex(null); // exit edit mode
    } catch (err) {
      console.error("Error updating schedule:", err);
    }
  };

  const handleDeleteClick = (scheduleId, dealerId) => {
    setDeleteId(scheduleId);
    setDeleteDealerId(dealerId);
    setShowConfirmDelete(true);
    setShowDeletePopup(false);
    setSecurityKey("");
  };

  const handleConfirmDelete = () => {
    setShowConfirmDelete(false);
    setShowDeletePopup(true);
  };

  const handleCancelDelete = () => {
    setShowConfirmDelete(false);
    setShowDeletePopup(false);
    setDeleteId(null);
    setDeleteDealerId(null);
    setSecurityKey("");
  };

  const handleDeleteDealer = async () => {
    try {
      const res = await axios.delete(
        `${backendUrl}/delete-dealer-from-schedule/${deleteId}/${deleteDealerId}`,
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
          params: {
            securityKey,
          },          
        }
      );
      setAlert({
        show: true,
        type: "success",
        message: res.data.message || "Dealer deleted successfully",
      });
      setShowDeletePopup(false);
      setDeleteId(null);
      setDeleteDealerId(null);
      getEmployeeSchedule();
    } catch (err) {
      setAlert({
        show: true,
        type: "error",
        message: err.response?.data?.message || "Failed to delete dealer",
      });
    }
  };

  useEffect(() => {
    getEmployeeSchedule();
    getAllDealerAndMdd();
  }, [status, startDate, endDate, search]);

  return (
    <div className="employee-schedule">
      {alert.show && (
        <CustomAlert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ show: false, type: "", message: "" })}
        />
      )}
      <div className="employee-schedule-header">
        <Link className="header-link" to="/viewBeatMappingStatus">
          <IoIosArrowBack size={24} />
          Back{" "}
        </Link>
        <div>{employeeData.name}</div>
        <div>{employeeData.code}</div>
      </div>

      <div className="employee-schedule-container">
        <div className="employee-schedule-filter">
          <div className="search-filter">
            <input
              type="text"
              placeholder="Search by name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="employee-schedule-date">
            <div className="date">
              <label>From:</label>
              <input
                type="date"
                name="startDay"
                value={startDate ? startDate.toISOString().split("T")[0] : ""}
                onChange={(e) => setStartDate(new Date(e.target.value))}
              />
            </div>
            <div className="date">
              <label>To:</label>
              <input
                type="date"
                name="endDay"
                value={endDate ? endDate.toISOString().split("T")[0] : ""}
                onChange={(e) => setEndDate(new Date(e.target.value))}
              />
            </div>
          </div>
          <div className="employee-schedule-status">
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Select Status</option>
              <option value="done">Done</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
        <div className="employee-schedule-table">
          <table>
            <thead>
              <tr>
                <th>SNo.</th>
                <th>Dealer Code</th>
                <th>Dealer Name</th>
                <th>Position</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Distance</th>
                <th>District</th>
                <th>Taluka</th>
                <th>Zone</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {dealerData.length === 0 ? (
                <tr>
                  <td colSpan="12x" style={{ textAlign: "center" }}>
                    No data available
                  </td>
                </tr>
              ) : (
                <>
                  {dealerData.map((dealer, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>
                        {editRowIndex === index ? (
                          <input
                            type="text"
                            name="code"
                            value={editedDealer.code}
                            onChange={handleInputChange}
                            readOnly
                          />
                        ) : (
                          dealer.code
                        )}
                      </td>
                      <td>
                        {editRowIndex === index ? (
                          <Select
                            options={dealerOptions}
                            value={dealerOptions.find(
                              (opt) => opt.value === editedDealer.code
                            )}
                            onChange={handleDealerChange}
                            isSearchable
                            placeholder="Search dealer..."
                            styles={{
                              control: (provided) => ({
                                ...provided,
                                minWidth: "200px",
                                fontSize: "14px",
                              }),
                              menu: (provided) => ({
                                ...provided,
                                zIndex: 9999, // Boost menu z-index
                              }),
                              menuPortal: (base) => ({
                                ...base,
                                zIndex: 9999, // Boost portal z-index
                              }),
                            }}
                            menuPortalTarget={document.body} // important if using portals
                          />
                        ) : (
                          dealer.name
                        )}
                      </td>
                      <td>{dealer.position}</td>
                      <td>
                        {new Date(dealer.startDate).toISOString().split("T")[0]}
                      </td>
                      <td>
                        {new Date(dealer.endDate).toISOString().split("T")[0]}
                      </td>
                      <td>{dealer.distance ?? "N/A"}</td>
                      <td>{dealer.district || "N/A"}</td>
                      <td>{dealer.taluka || "N/A"}</td>
                      <td>{dealer.zone || "N/A"}</td>
                      <td>
                        {editRowIndex === index ? (
                          <select
                            name="status"
                            value={editedDealer.status}
                            onChange={handleInputChange}
                          >
                            <option value="done">Done</option>
                            <option value="pending">Pending</option>
                          </select>
                        ) : (
                          <span
                            style={{
                              color:
                                dealer.status === "done" ? "green" : "#f0b862",
                            }}
                          >
                            {dealer.status}
                          </span>
                        )}
                      </td>
                      <td>
                        {editRowIndex === index ? (
                          <>
                            <FaSave
                              color="green"
                              style={{ cursor: "pointer", marginRight: "10px" }}
                              onClick={handleSave}
                            />
                            <FaTimes
                              color="red"
                              style={{ cursor: "pointer" }}
                              onClick={() => setEditRowIndex(null)}
                            />
                          </>
                        ) : (
                          <>
                            <FaEdit
                              onClick={() => handleEditRow(dealer, index)}
                              color="#6666f2"
                              style={{ cursor: "pointer", marginRight: "10px" }}
                            />
                            <RiDeleteBin6Line
                              color="red"
                              style={{ cursor: "pointer" }}
                              onClick={() =>
                                handleDeleteClick(
                                  dealer.scheduleId,
                                  dealer.dealerId
                                )
                              }
                            />
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {showConfirmDelete && (
        <div className="security-key-popup">
          <div className="popup-content">
            <div className="popup-header">
              <div>Are you sure you want to delete this row?</div>
              <button className="close-btn" onClick={handleCancelDelete}>
                <FaTimes />
              </button>
            </div>
            <div className="popup-actions">
              <button className="cancel-btn" onClick={handleCancelDelete}>
                Cancel
              </button>
              <button className="delete-btn" onClick={handleConfirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {showDeletePopup && (
        <div className="security-key-popup">
          <div className="popup-content">
            <div className="popup-header">
              <h2>Enter Security Key to Delete</h2>
              <button className="close-btn" onClick={handleCancelDelete}>
                <FaTimes />
              </button>
            </div>
            <div className="form-group">
              <label htmlFor="securityKey">Security Key</label>
              <input
                type="password"
                id="securityKey"
                name="securityKey"
                className="security-key-input"
                value={securityKey}
                onChange={(e) => setSecurityKey(e.target.value)}
                placeholder="Enter security key"
                required
              />
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button
                className="submit-btn"
                onClick={handleDeleteDealer}
                disabled={!securityKey}
              >
                Delete
              </button>
              <button className="close-btn" onClick={handleCancelDelete}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
