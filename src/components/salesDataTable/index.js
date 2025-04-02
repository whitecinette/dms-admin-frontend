import React, { useEffect, useState } from "react";
import { useFilters } from "../../context/filterContext";
import config from "../../config.js";
import axios from "axios";
import "./style.scss";

const backend_url = config.backend_url;

const SalesDataTable = () => {
  const { selectedValue, startDate, endDate, dropdownValue, loading } =
    useFilters(); // Use context values
  const [sliderValue, setSliderValue] = useState("segment");
  const [tableData, setTableData] = useState([]);

  //get table data from api
  const getTableData = async () => {
    try {
      const response = await axios.post(
        `${backend_url}/user/sales-data/report/self`,
        {
          subordinate_codes: dropdownValue.map((item) => item.code),
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
          filter_type: selectedValue,
          report_type: sliderValue,
        },
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );
      setTableData(response.data);
    } catch (error) {
      console.error("Error fetching table data:", error);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      getTableData();
    }
  }, [startDate, endDate, dropdownValue, selectedValue, sliderValue]); // Fetch data when startDate, endDate, or dropdownValue changes

  if (loading) return null;
  return (
    <div className="salesDataTable-page">
      <div className="salesDataTable-filter">
        <div className="slider-container">
          <div
            className={`slider-button ${
              sliderValue === "segment" ? "active" : ""
            }`}
            onClick={() => setSliderValue("segment")}
          >
            Segment
          </div>
          <div
            className={`slider-button ${
              sliderValue === "channel" ? "active" : ""
            }`}
            onClick={() => setSliderValue("channel")}
          >
            Channel
          </div>
        </div>
      </div>
      <div className="salesDataTable-table-container">
        <table className="salesDataTable-table">
          <thead>
            <tr>
              {tableData?.headers?.map((header, index) => (
                <th key={index}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData?.data?.length > 0 ? (
              tableData.data.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {tableData.headers.map((header, cellIndex) => (
                    <td key={cellIndex}>{row[header]}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={tableData?.headers?.length || 1}
                  style={{ textAlign: "center" }}
                >
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalesDataTable;
