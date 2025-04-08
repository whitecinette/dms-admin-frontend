import React, { useState, useEffect } from "react";
import {
  FaArrowLeft,
  FaArrowRight,
  FaDownload,
  FaFileUpload,
  FaEdit,
  FaSave,
  FaTimes,
  FaChevronDown,
  FaChevronUp,
  FaMinus,
} from "react-icons/fa";
import { FaPlus } from "react-icons/fa6";
import Select from "react-select";
import config from "../../config.js";
import axios from "axios";
import "./style.scss"; // Import SCSS file for styling
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const backendUrl = config.backend_url;

const ViewBeatMappingStatus = () => {
  const [employeesList, setEmployeesList] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [success, setSuccess] = useState("");
  const [search, setsearch] = useState("");
  const [status, setstatus] = useState("");
  const [data, setdata] = useState([]);
  const [expandedRow, setExpandedRow] = useState("");
  const [editRow, setEditRow] = useState({});
  const [editId, setEditId] = useState("");
  const [dealerList, setDealerList] = useState([]);

  // Get the Monday of the current week
  const getMonday = (date) => {
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Adjust when it's Sunday (0)
    return new Date(date.setDate(date.getDate() + diff));
  };

  // Get the dates of the current week (Monday - Sunday)
  const getWeekDates = (date) => {
    const startOfWeek = getMonday(new Date(date)); // Ensure it's Monday
    return [...Array(7)].map((_, i) => {
      const newDate = new Date(startOfWeek);
      newDate.setDate(startOfWeek.getDate() + i);
      return newDate;
    });
  };

  const [weekDates, setWeekDates] = useState(getWeekDates(new Date()));
  const [selectedDate, setSelectedDate] = useState(new Date()); // Default to today

  // Define start day and end day
  const startDay = weekDates[0];
  const endDay = weekDates[6];

  // Convert date to "Mon", "Tue", etc.
  const getShortDay = (date) => {
    if (!date) return "";
    return date.toLocaleString("en-US", { weekday: "short" });
  };

  // Function to format date as YYYY-MM-DD
  const formatDate = (date) => {
    if (!date) return "";
    return date.toISOString().split("T")[0]; // Extract YYYY-MM-DD
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
        `${backendUrl}/add-beat-mapping-using-csv`,
        formData,
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );
      setSuccess(response.data.message);
      setTimeout(() => {
        setSuccess("");
      }, 3000);
      getBeatMapping();
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
  //get all dealer
  const getDealer = async () => {
    try {
      const res = await axios.get(`${backendUrl}/user/get-dealer-for-admin`, {
        headers: {
          Authorization: localStorage.getItem("authToken"),
        },
      });

      if (Array.isArray(res.data)) {
        setDealerList(res.data);
      } else if (Array.isArray(res.data.dealers)) {
        setDealerList(res.data.dealers); // If dealers list is inside an object
      } else {
        setDealerList([]); // Fallback to an empty array
      }
    } catch (error) {
      console.log(error);
      setDealerList([]); // Ensure it's always an array
    }
  };

  //get beat mapping
  const getBeatMapping = async (selectedDate) => {
    try {
      const res = await axios.get(
        `${backendUrl}/get-weekly-beat-mapping-schedule-for-admin`,
        {
          params: {
            startDate: formatDate(startDay),
            endDate: formatDate(endDay),
            day: selectedDate ? getShortDay(selectedDate) : "",
            code: search,
            status,
          },
        }
      );

      if (res.data && res.data.data) {
        setdata(res.data.data);
      } else {
        setdata([]);
      }
    } catch (error) {
      console.log("Error fetching data:", error);
      setdata([]);
    }
  };
  const handleSaveData = async () => {
    try {
      const id = editId;
      const day = getShortDay(selectedDate);
      const response = await axios.put(
        `${backendUrl}/edit-weekly-beat-mapping-schedule-for-admin/${id}`,
        editRow,
        {
          params: {
            day,
          },
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );
      setSuccess(response.data.message);
      setTimeout(() => {
        setSuccess("");
      }, 3000);
      setEditRow("");
      setEditId("");
      getBeatMapping(selectedDate);
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

  //get employees and code
  const getEmployeeAndCode = async () => {
    try {
      const res = await axios.get(
        `${backendUrl}/actorCode/get-actorCode-for-admin`
      );
      setEmployeesList(res.data.employeeList);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    getBeatMapping(selectedDate); // Send default selected date (today)
    getEmployeeAndCode();
  }, [selectedDate, startDay, endDay, search, status]);

  // Auto-select today's date when switching weeks
  useEffect(() => {
    const today = new Date();
    const todayString = today.toDateString();

    // Check if today is in the new week
    const foundToday = weekDates.find(
      (date) => date.toDateString() === todayString
    );

    if (foundToday) {
      setSelectedDate(foundToday);
    } else {
      setSelectedDate(startDay); // If today is not in this week, select Monday
    }
  }, [weekDates]);

  // Change week
  const handlePrevWeek = () => {
    const prevMonday = new Date(weekDates[0]);
    prevMonday.setDate(prevMonday.getDate() - 7);
    setWeekDates(getWeekDates(prevMonday));
  };

  const handleNextWeek = () => {
    const nextMonday = new Date(weekDates[0]);
    nextMonday.setDate(nextMonday.getDate() + 7);
    setWeekDates(getWeekDates(nextMonday));
  };

  // Handle date selection
  const handleDateClick = (date) => {
    if (date === "all") {
      setSelectedDate(null);
    } else {
      setSelectedDate(date);
    }
    getBeatMapping(date === "all" ? null : date);
  };

  const handleStatusChange = (event, dayKey, idx) => {
    const newStatus = event.target.value;

    setEditRow((prevState) => ({
      ...prevState,
      schedule: {
        ...prevState.schedule,
        [dayKey]: prevState.schedule?.[dayKey]?.map((item, index) =>
          index === idx ? { ...item, status: newStatus } : item
        ),
      },
    }));
  };

  const handleEdit = (row) => {
    setEditId(row._id);

    // Ensure schedule exists and has the selected day's key
    const updatedSchedule = row.schedule || {};
    const selectedDay = selectedDate ? getShortDay(selectedDate) : "";

    if (!updatedSchedule[selectedDay]) {
      updatedSchedule[selectedDay] = []; // Initialize empty array if missing
    }

    setEditRow({
      ...row,
      schedule: updatedSchedule,
    });
    getDealer();
  };

  const handleShopChange = (selectedOption, dayKey, idx) => {
    setEditRow((prevEditRow) => {
      const updatedSchedule = {
        ...prevEditRow.schedule,
        [dayKey]: prevEditRow.schedule[dayKey]?.map((entry, index) =>
          index === idx
            ? {
                ...entry,
                name: selectedOption.label,
                code: selectedOption.value,
              }
            : entry
        ),
      };

      return {
        ...prevEditRow,
        schedule: updatedSchedule,
      };
    });
  };

  const handleAddDealer = (dayKey) => {
    setEditRow((prevEditRow) => {
      const updatedSchedule = {
        ...prevEditRow.schedule,
        [dayKey]: [
          ...(prevEditRow.schedule?.[dayKey] || []),
          { code: "", name: "", status: "pending" }, // Empty data for new dealer
        ],
      };

      return {
        ...prevEditRow,
        schedule: updatedSchedule,
      };
    });
  };

  const handleRemoveDealer = (dayKey, idx) => {
    setEditRow((prevEditRow) => {
      const updatedSchedule = {
        ...prevEditRow.schedule,
        [dayKey]: prevEditRow.schedule[dayKey]?.filter(
          (_, index) => index !== idx
        ),
      };

      return {
        ...prevEditRow,
        schedule: updatedSchedule,
      };
    });
  };
  const downloadCSV = () => {
    if (!data || data.length === 0) return;
  
    // CSV headers
    const headers = [
      'Employee Code',
      'Employee Name',
      'Done',
      'Pending',
      'Total',
      'Day',
      'Dealer Code',
      'Shop Name',
      'Status',
    ];
  
    const rows = [];
  
    data.forEach((item, index) => {
      const empName =
        employeesList.find((emp) => emp.employee_code === item.code)?.employee_name || 'N/A';
  
      const baseData = [
        item.code,
        empName,
        item.done,
        item.pending,
        item.total,
      ];
  
      const schedule = item.schedule || {};
  
      let hasSchedule = false;
  
      Object.entries(schedule).forEach(([day, schedules]) => {
        schedules.forEach((sched) => {
          hasSchedule = true;
          rows.push([
            ...baseData,
            day,
            sched.code,
            sched.name,
            sched.status,
          ]);
        });
      });
  
      if (!hasSchedule) {
        // If no schedule, just push the base row with empty schedule fields
        rows.push([...baseData, '', '', '', '']);
      }
    });
  
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  
    // Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'employee_schedule_full.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  

  return (
    <div className="viewBeatMappingStatus-page">
      <div className="viewBeatMappingStatus-page-header">
        View Beat Mapping Status
      </div>
      {data.length>0 && 
        <div className="viewBeatMapping-page-graph">
        <div className="viewBeatMappingStatus-calendar-header">
            <h2>
              {startDay.toDateString()} - {endDay.toDateString()}
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data}
              barCategoryGap="20%"
            >
              
              <XAxis dataKey="code" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="done" fill="#4CAF50" name="Done" />
              <Bar dataKey="pending" fill="#FFC107" name="Pending" />
              <Bar dataKey="total" fill="#2196F3" name="Total" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      }
      <div className="viewBeatMappingStatus-page-container">
        <div className="viewBeatMappingStatus-calendar-container">
          <div className="viewBeatMappingStatus-calendar-header">
            <FaArrowLeft className="icon" onClick={handlePrevWeek} />
            <h2>
              {startDay.toDateString()} - {endDay.toDateString()}
            </h2>
            <FaArrowRight className="icon" onClick={handleNextWeek} />
          </div>

          <div className="viewBeatMappingStatus-calendar-body">
            <div className="viewBeatMappingStatus-calendar-days">
              <div
                className={`day ${selectedDate === null ? "selected" : ""}`}
                onClick={() => handleDateClick(null)}
              >
                All
              </div>
              {weekDates.map((date) => (
                <div
                  key={date.toDateString()}
                  className={`day ${
                    selectedDate &&
                    date.toDateString() === selectedDate.toDateString()
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => handleDateClick(date)}
                >
                  {getShortDay(date)} {/* Show Mon, Tue, etc. */}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="viewBeatMapping-first-line">
          <div className="viewBeatMappingStatus-filter">
            <input
              type="text"
              placeholder="Search Employee Code"
              name="search"
              value={search}
              onChange={(e) => setsearch(e.target.value)}
            />
            <select value={status} onChange={(e) => setstatus(e.target.value)}>
              <option value="">Select Status</option>
              <option value="done">Done</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div className="viewBeatMapping-buttons">
            <div className="viewBeatMappingStatus-upload-btn">
              <label htmlFor="file-upload" className="browse-btn">
                <FaFileUpload />
                Upload Beat Mapping CSV
              </label>
              <input
                type="file"
                id="file-upload"
                hidden
                onChange={handleFileChange}
              />
            </div>
            <div className="viewBeatMappingStatus-download-btn">
              <div className="browse-btn" onClick={downloadCSV}>
                <FaDownload />
                Download CSV 
              </div>
            </div>
          </div>
        </div>
        <div className="viewBeatMapping-table-container">
          <table>
            <thead>
              <tr>
                <th>S.NO</th>
                <th>Employee Code</th>
                <th>Employee Name</th>
                <th>Done</th>
                <th>Pending</th>
                <th>Total</th>
                <th>Expand</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? ( // Check if data is empty
                <tr>
                  <td colSpan="9" style={{ textAlign: "center" }}>
                    No data available
                  </td>
                </tr>
              ) : (
                data.map((item, index) => (
                  <React.Fragment key={index}>
                    <tr>
                      <td>{index + 1}</td>
                      {editId === item._id ? (
                        <>
                          <td>
                            <input name="code" value={editRow.code} readOnly />
                          </td>
                          <td>
                            <Select
                              options={employeesList.map((employee) => ({
                                value: employee.employee_code,
                                label: employee.employee_name,
                              }))}
                              value={
                                editRow?.code
                                  ? {
                                      value: editRow?.code,
                                      label:
                                        employeesList?.find?.(
                                          (emp) =>
                                            emp.employee_code === editRow?.code
                                        )?.employee_name || editRow?.name,
                                    }
                                  : null
                              }
                              onChange={(selectedOption) =>
                                setEditRow((prevState) => ({
                                  ...prevState,
                                  code: selectedOption.value,
                                  name: selectedOption.label,
                                }))
                              }
                              menuPosition="absolute"
                              menuPlacement="bottom"
                              styles={{
                                menu: (base) => ({
                                  ...base,
                                  // position: 'fixed',
                                  zIndex: 100000,
                                  // width: 'fit-content',
                                  minWidth: "200px",
                                }),
                                control: (base) => ({
                                  ...base,
                                  minWidth: "200px",
                                  zIndex: 100000,
                                }),
                              }}
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{item.code}</td>
                          <td>
                            {employeesList?.find?.(
                              (emp) => emp.employee_code === item.code
                            )?.employee_name || "N/A"}
                          </td>
                        </>
                      )}

                      <td>{item.done}</td>
                      <td>{item.pending}</td>
                      <td>{item.total}</td>
                      <td className="expand-btn">
                        <button
                          onClick={() =>
                            setExpandedRow(expandedRow === index ? null : index)
                          }
                        >
                          {expandedRow === index ? (
                            <>
                              Collapse
                              <FaChevronUp />
                            </>
                          ) : (
                            <>
                              Expand
                              <FaChevronDown />
                            </>
                          )}
                        </button>
                      </td>
                      <td>
                        {editId === item._id ? (
                          <div>
                            <FaSave
                              color="#005bfe"
                              style={{ cursor: "pointer", marginRight: "10px" }}
                              onClick={() => handleSaveData()}
                            />
                            <FaTimes
                              color="#F21E1E"
                              style={{ cursor: "pointer" }}
                              onClick={() => {
                                setEditId("");
                                setEditRow({});
                              }}
                            />
                          </div>
                        ) : (
                          <div>
                            <FaEdit
                              color="#005bfe"
                              style={{ cursor: "pointer", marginRight: "10px" }}
                              onClick={() => {
                                handleEdit(item);
                                setExpandedRow(index);
                              }}
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                    {expandedRow === index && (
                      <>
                        {Object.keys(item.schedule || {}).map((dayKey) => (
                          <React.Fragment key={dayKey}>
                            <tr className="schedule">
                              {editId === item._id ? (
                                <>
                                  <td colSpan="7" className="schedule-title">
                                    {dayKey}
                                  </td>
                                  <td
                                    className="schedule-add-button"
                                    onClick={() => handleAddDealer(dayKey)}
                                  >
                                    <FaPlus />
                                    Add Schedule
                                  </td>
                                </>
                              ) : (
                                <td colSpan="8" className="schedule-title">
                                  {dayKey}
                                </td>
                              )}
                            </tr>

                            <tr>
                              <td colSpan="8">
                                <div className="expand-container">
                                  <table className="expanded-table">
                                    <thead>
                                      <tr>
                                        <th>S.NO</th>
                                        <th>Dealer Code</th>
                                        <th>Shop Name</th>
                                        <th>Status</th>
                                        {editId === item._id ? (
                                          <th>Action</th>
                                        ) : (
                                          ""
                                        )}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(editId === item._id
                                        ? editRow.schedule[dayKey]
                                        : item.schedule[dayKey]
                                      )?.map((scheduleItem, idx) => (
                                        <tr key={idx}>
                                          <td>{idx + 1}</td>
                                          {editId === item._id ? (
                                            <>
                                              {/* Dealer Code - ReadOnly */}
                                              <td>
                                                <input
                                                  type="text"
                                                  value={
                                                    scheduleItem.code || ""
                                                  }
                                                  readOnly
                                                />
                                              </td>

                                              {/* Shop Name - Editable Select Dropdown */}
                                              <td>
                                                <Select
                                                  options={dealerList.map(
                                                    (dealer) => ({
                                                      value: dealer.dealer_code,
                                                      label: dealer.dealer_name,
                                                    })
                                                  )}
                                                  value={
                                                    scheduleItem.code
                                                      ? {
                                                          value:
                                                            scheduleItem.code,
                                                          label:
                                                            scheduleItem.name,
                                                        }
                                                      : null
                                                  }
                                                  onChange={(selectedOption) =>
                                                    handleShopChange(
                                                      selectedOption,
                                                      dayKey,
                                                      idx
                                                    )
                                                  }
                                                  menuPosition="fixed"
                                                  menuPlacement="auto"
                                                  styles={{
                                                    menu: (base) => ({
                                                      ...base,
                                                      zIndex: 1000,
                                                    }),
                                                    control: (base) => ({
                                                      ...base,
                                                      minWidth: "100px",
                                                    }),
                                                  }}
                                                />
                                              </td>

                                              {/* Status (Editable) */}
                                              <td>
                                                <select
                                                  value={scheduleItem.status}
                                                  onChange={(e) =>
                                                    handleStatusChange(
                                                      e,
                                                      dayKey,
                                                      idx
                                                    )
                                                  }
                                                >
                                                  <option value="pending">
                                                    Pending
                                                  </option>
                                                  <option value="done">
                                                    Done
                                                  </option>
                                                </select>
                                              </td>
                                              <td>
                                                <div
                                                  className="remove-schedule-row"
                                                  onClick={() =>
                                                    handleRemoveDealer(
                                                      dayKey,
                                                      idx
                                                    )
                                                  }
                                                >
                                                  <FaMinus
                                                    style={{
                                                      cursor: "pointer",
                                                    }}
                                                  />
                                                  Remove Dealer
                                                </div>
                                              </td>
                                            </>
                                          ) : (
                                            <>
                                              <td>{scheduleItem.code}</td>
                                              <td>{scheduleItem.name}</td>
                                              <td
                                                style={{
                                                  color:
                                                    scheduleItem.status ===
                                                    "pending"
                                                      ? "#B76E00"
                                                      : "#118D57",
                                                }}
                                              >
                                                {scheduleItem.status}
                                              </td>
                                            </>
                                          )}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          </React.Fragment>
                        ))}
                      </>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {errorMessage && <div className="error-message">{errorMessage}</div>}
      {success && <div className="success-message">{success}</div>}
    </div>
  );
};

export default ViewBeatMappingStatus;
