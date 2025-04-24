import axios from "axios";
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import config from "../../config.js";
import { IoIosArrowBack } from "react-icons/io";
import "./style.scss";
import { FaEdit, FaSave, FaTimes } from "react-icons/fa";
import Select from "react-select";

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

  const getEmployeeSchedule = async () => {
    console.log("Fetching employee schedule...");

    const reqBody = {
      startDate,
      endDate,
      search,
      status,
    };
    try {
      const res = await axios.get(
        `${backendUrl}/get-weekly-beat-mapping-schedule-for-admin-by-code/${code}`,
        {
          params: reqBody,
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

  const handleSave = () => {
    const updatedData = [...dealerData];
    updatedData[editRowIndex] = editedDealer;
    setDealerData(updatedData);
    setEditRowIndex(null); // exit edit mode
  };

  useEffect(() => {
    getEmployeeSchedule();
    getAllDealerAndMdd();
  }, [status, startDate, endDate, search]);

  return (
    <div className="employee-schedule">
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
                  <td colSpan="9" style={{ textAlign: "center" }}>
                    No data available
                  </td>
                </tr>
              ) : (
                <>
                  {dealerData.map((dealer, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>
                        {" "}
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
                            }}
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
                          <FaEdit
                            onClick={() => handleEditRow(dealer, index)}
                            color="#6666f2"
                            style={{ cursor: "pointer" }}
                          />
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
    </div>
  );
}
