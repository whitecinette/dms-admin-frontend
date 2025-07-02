import React, { useEffect, useState } from "react";
import { useFilters } from "../../../context/filterContext.js";
import config from "../../../config.js";
import axios from "axios";
import "./style.scss";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import TextToggle from "../../../components/toggle"
import TableBodyLoading from "../../../components/tableLoading/index.js";

const backend_url = config.backend_url;

const SalesDataTable = () => {
  const { selectedValue, startDate, endDate, dropdownValue, loading } =
    useFilters(); // Use context values
  const [sliderValue, setSliderValue] = useState("segment");
  const [tableData, setTableData] = useState([]);
  const [productData, setProductData] = useState([]);
  const [expandedRow, setExpandedRow] = useState("");
  const [isLoading, setIsLoading] = useState(false)

  //get table data from api
  const getTableData = async () => {
    try {
      setIsLoading(true)
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
    }finally{
      setIsLoading(false)
    }
  };

  useEffect(() => {
    const fetchProductData = async () => {
      if (!expandedRow) return; // Don't fetch if nothing is expanded

      console.log("Fetching for:", expandedRow);
      try {
        const res = await axios.post(
          `${backend_url}/user/sales-data/product-wise`,
          {
            selected_subord: dropdownValue.map((item) => item.code),
            start_date: startDate.toISOString().split("T")[0],
            end_date: endDate.toISOString().split("T")[0],
            filter_type: selectedValue,
            segment: expandedRow,
          },
          {
            headers: {
              Authorization: localStorage.getItem("authToken"),
            },
          }
        );
        setProductData(res.data);
      } catch (error) {
        console.log("Error fetching product data:", error);
        setProductData([]);
      }
    };

    fetchProductData();
  }, [expandedRow]);

  useEffect(() => {
    console.log(productData);
  }, [productData]);

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
          <TextToggle
          textFirst="segment"
          textSecond="channel"
          setText={setSliderValue}
          selectedText={sliderValue}
          classStyle={{ minWidth: "250px" }}
        />
        </div>
      </div>
      <div className="salesDataTable-table-container">
        <table className="salesDataTable-table">
          <thead>
            <tr>
              {tableData?.headers?.map((header, index) => (
                <th key={index}>{header}</th>
              ))}
              <th>Expand</th>
            </tr>
          </thead>
          {isLoading ? <TableBodyLoading columnCount = {11} /> : (

            <tbody>
              {tableData?.data?.length > 0 ? (
                tableData.data.map((row, rowIndex) => (
                  <>
                    <tr key={rowIndex}>
                      {tableData.headers.map((header, cellIndex) => (
                        <>
                          <td key={cellIndex}>{row[header]}</td>
                        </>
                      ))}
                      <td className="expand-btn">
                        <button
                          onClick={() => {
                            const newExpanded =
                              expandedRow === row["Segment/Channel"]
                                ? null
                                : row["Segment/Channel"];
                            setExpandedRow(newExpanded);
                          }}
                        >
                          {expandedRow === row["Segment/Channel"] ? (
                            <>
                              Collapse <FaChevronUp />
                            </>
                          ) : (
                            <>
                              Expand <FaChevronDown />
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                    {Array.isArray(productData?.headers) &&
                      Array.isArray(productData?.data) &&
                      productData?.data.length > 0 &&
                      expandedRow === row["Segment/Channel"] && (
                        <tr>
                          <td colSpan={tableData.headers.length + 1}>
                            <div className="products-table-container">
                              <table className="products-table">
                                <thead>
                                  <tr>
                                    {productData.headers.map((header, index) => (
                                      <th key={index}>{header}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {productData.data.map((rowData, index) => (
                                    <tr key={index}>
                                      {productData.headers.map(
                                        (header, cellIndex) => (
                                          <td key={cellIndex}>
                                            {rowData[header]}
                                          </td>
                                        )
                                      )}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                  </>
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
          )}
        </table>
      </div>
    </div>
  );
};

export default SalesDataTable;
