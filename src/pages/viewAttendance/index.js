import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import config from "../../config.js";
import axios from "axios";
import "./style.scss";
import { FaEdit } from "react-icons/fa";

const backendUrl = config.backend_url;

export default function ViewAttendance() {
  const { code } = useParams(); // Get employee code from URL params
  const [date, setDate] = useState(""); // Default: empty (fetch all records)
  const [attendance, setAttendance] = useState([]);
  const [name, setName] = useState("");
  const [attendanceCount, setAttendanceCount] = useState({});

  const getAttendance = async () => {
    console.log(date);
    try {
      const res = await axios.get(`${backendUrl}/get-attendance/${code}`, {
        params: { date }, // ✅ Ensure params is an object
      });
      setAttendance(res.data.attendance || []);
      setName(res.data.employeeName);
      setAttendanceCount(res.data.attendanceCount);
    } catch (error) {
      setAttendance({});
      console.error("Error fetching attendance:", error);
    }
  };

  // Fetch attendance when `code` or `date` changes
  useEffect(() => {
    if (code) getAttendance();
  }, [code, date]);

  return (
    <div className="ViewAttendance-page">
      <div className="ViewAttendance-header">{name}</div>
      <div className="ViewAttendance-container">
        <div className="ViewAttendance-page-firstLine">
          <div className="ViewAttendance-count">
            <div className="attendance-item yellow">
              <span className="label">Leave:</span>
              <span className="value">{attendanceCount.leave}</span>
            </div>
            <div className="attendance-item red">
              <span className="label">Absent:</span>
              <span className="value">{attendanceCount.absent}</span>
            </div>
            <div className="attendance-item green">
              <span className="label">Present:</span>
              <span className="value">{attendanceCount.present}</span>
            </div>
            <div className="attendance-item orange">
              <span className="label">Half Day:</span>
              <span className="value">{attendanceCount.halfday}</span>
            </div>
          </div>
          <div className="ViewAttendance-filter">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        <div className="ViewAttendance-table-container">
          <table>
            <thead>
              <tr className="main-header">
                <th colSpan={6}>Punch In</th>
                <th colSpan={6}>Punch Out</th>
              </tr>
              <tr>
                <th>SNo.</th>
                <th>Image</th>
                <th>Date</th>
                <th>Time</th>
                <th>Shop Name</th>
                <th>Image</th>
                <th>Time</th>
                <th>Shop Name</th>
                <th>Status</th>
                <th>Hours Worked</th>
                {/* <th>Action</th> */}
              </tr>
            </thead>

            <tbody>
              {attendance.length > 0 ? (
                attendance.map((record, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>
                      {record.punchInImage ? (
                        <img src={record.punchInImage} />
                      ) : (
                        "N/A"
                      )}
                    </td>
                    <td>{new Date(record.date).toLocaleDateString()}</td>
                    <td>
                      {new Date(record.punchIn).toLocaleTimeString("en-IN", {
                        timeZone: "Asia/Kolkata",
                      })}
                    </td>
                    <td>{record.punchInName || "N/A "}</td>
                    <td>
                      {record.punchOutImage ? (
                        <img src={record.punchOutImage} />
                      ) : (
                        "N/A"
                      )}
                    </td>
                    <td>
                      {record.punchOut
                        ? new Date(record.punchOut).toLocaleTimeString(
                            "en-IN",
                            { timeZone: "Asia/Kolkata" }
                          )
                        : "N/A"}
                    </td>

                    <td>{record.punchOutName || "N/A "}</td>
                    <td>{record.status}</td>
                    <td>{record.hoursWorked || "N/A"}</td>
                    {/* <td>
                      <FaEdit
                        color="#005bfe"
                        style={{ cursor: "pointer", marginRight: "10px" }}
                      />
                    </td> */}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" style={{ textAlign: "center" }}>
                    No attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
