import React, { useEffect, useState } from "react";
import config from "../../config.js";
import axios from "axios";
import "./style.scss";
import downloadCSVTemplate from "../../components/downloadCSVTemplate";
import { FaDownload, FaFileUpload } from "react-icons/fa";

const backendUrl = config.backend_url;

function Hierarchy() {
  const [firmList, setFirmList] = useState([]);
  const [firm, setFirm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hierarchy, setHierarchy] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 50;

  const getAllActorTypes = async () => {
    try {
      const res = await axios.get(
        `${backendUrl}/actorTypesHierarchy/get-all-by-admin`
      );
      setFirmList(res.data.data);
      if (res.data.data.length > 0) {
        setFirm(res.data.data[0].name);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getHierarchy = async () => {
    if (!firm) return;
    try {
      const res = await axios.get(
        `${backendUrl}/hierarchy-entries/get-hierarchy-entries-for-admin`,
        {
          params: { page: currentPage, limit, hierarchy_name: firm },
        }
      );
      setHierarchy(res.data.data || []);
      setTotalRecords(res.data.totalRecords);
    } catch (error) {
      console.log(error);
    }
  };
  const totalPages = Math.ceil(totalRecords / limit);
  // Handle Previous Page
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  // Handle Next Page
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  useEffect(() => {
    getAllActorTypes();
  }, []);

  useEffect(() => {
    getHierarchy();
  }, [firm, currentPage]);

  return (
    <div className="hierarchy-page">
      <div className="hierarchy-page-header">Hierarchy</div>
      <div className="hierarchy-page-container">
        <div className="hierarchy-page-first-line">
          <div className="hierarchy-page-filter">
            <div className="firm-filter">
              <label>Firm:</label>
              <select
                value={firm || ""}
                onChange={(e) => {
                  setCurrentPage(1);
                  setFirm(e.target.value);
                }}
              >
                {firmList.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="hierarchy-page-buttons">
            <div className="hierarchy-upload-btn">
              <label htmlFor="file-upload" className="browse-btn">
                <FaFileUpload />
                Upload Bulk CSV
              </label>
              <input
                type="file"
                id="file-upload"
                hidden
                // onChange={handleFileChange}
              />
            </div>
            <div
              className="hierarchy-download-btn"
              onClick={() => downloadCSVTemplate(["hierarchy_name"])}
            >
              <FaDownload />
              Download CSV Format
            </div>
          </div>
        </div>
        <div className="hierarchy-page-table-container">
          <table>
            <thead>
              <tr>
                <th>S.No</th>
                {hierarchy.length > 0 &&
                  Object.keys(hierarchy[0])
                    .filter(
                      (key) =>
                        ![
                          "_id",
                          "hierarchy_name",
                          "__v",
                          "createdAt",
                          "updatedAt",
                        ].includes(key)
                    )
                    .map((key) => (
                      <th key={key}>{key}</th> // ✅ Displays only the required headers
                    ))}
              </tr>
            </thead>
            <tbody>
              {hierarchy.map((row, index) => (
                <tr key={index}>
                  <td>{(currentPage - 1) * limit + index + 1}</td>
                  {Object.keys(row)
                    .filter(
                      (key) =>
                        ![
                          "_id",
                          "hierarchy_name",
                          "__v",
                          "createdAt",
                          "updatedAt",
                        ].includes(key)
                    )
                    .map((key) => (
                      <td key={key}>{row[key]}</td> // ✅ Displays only the required values
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Pagination */}
      <div className="pagination">
        <button
          onClick={prevPage}
          className="page-btn"
          disabled={currentPage === 1}
        >
          &lt;
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={nextPage}
          className="page-btn"
          disabled={currentPage === totalPages}
        >
          &gt;
        </button>
      </div>
    </div>
  );
}

export default Hierarchy;
