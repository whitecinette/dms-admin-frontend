import axios from "axios";
import { useEffect, useState } from "react";
import config from "../../../config";
import TextToggle from "../../../components/toggle";
import "./style.scss";
import TableBodyLoading from "../../../components/tableLoading";

const backend_url = config.backend_url;

function ExtractionReport() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 2);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const [startDate, setStartDate] = useState(
    firstDay.toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(lastDay.toISOString().split("T")[0]);
  const [metric, setMetric] = useState("value");
  const [extractionReport, setExtractionReport] = useState({});
  const [header, setHeaders] = useState([]);
  const [ view, setView] = useState("default");
  const [isLoading, setIsLoading] = useState(false);

  //get extraction Report
  const getExtractionReport = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(
        `${backend_url}/get-extraction-report-for-admin`,
        {
          params: {
            startDate,
            endDate,
            metric,
            view
          },
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );

      setExtractionReport(res.data.data);
      setHeaders(Object.keys(res.data.data[0]));
    } catch (err) {
      console.error("Error fetching extraction report:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getExtractionReport();
  }, [startDate, endDate, metric, view]);

  return (
    <>
      <div className="extraction-header">Extraction Report</div>
      <div className="extraction-report-filter">
        <div className="first-line">
          <div className="filter">
            <div className="date-filter">
              <label htmlFor="startDate">From: </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                }}
              />
              <label htmlFor="endDate">To: </label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                }}
              />
            </div>
          </div>
        </div>
        <div className="second-line">
              
        </div>
        <div className="toggle">
        <TextToggle
            textFirst="default"
            textSecond="share"
            setText={setView}
            selectedText={view}/>
          <TextToggle
            textFirst="value"
            textSecond="volume"
            setText={setMetric}
            selectedText={metric}
          />
        </div>
      </div>
      <div className="extraction-report-table">
        <table>
          <thead>
            <tr>
              {header.map((key, index) => (
                <th key={key}>{key}</th>
              ))}
            </tr>
          </thead>
          {isLoading ? (
            <TableBodyLoading columnCount={13} />
          ) : (
            <tbody>
              {extractionReport.length > 0 ? (
                extractionReport.map((row, i) => (
                  <tr key={i}>
                    {header.map((header, j) => (
                      <td>{row[header]}</td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={header.length + 1}
                    style={{ textAlign: "center" }}
                  >
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          )}
        </table>
      </div>
    </>
  );
}

export default ExtractionReport;
