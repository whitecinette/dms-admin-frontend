import React, { useEffect, useState } from "react";
import "./style.scss";
import { FaDownload, FaFileUpload } from "react-icons/fa";
import axios from "axios";
import DealerTable from "./DealerTable";
import dealerHeaders from "./dealerHeaders";
import downloadCSVTemplate from "../../components/downloadCSVTemplate";
import UploadDealerHierarchyPopup from "./uploadDealerHierarchyPopup";

function DealerHierarchy() {
  const [isUpload, setIsUpload] = useState(false);
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    const res = await axios.get(
      `/dealer-hierarchy?search=${search}`
    );
    setData(res.data.data || []);
  };

  useEffect(() => {
    const delay = setTimeout(fetchData, 400);
    return () => clearTimeout(delay);
  }, [search]);

  return (
    <div className="dealer-page">
      <div className="dealer-page-header">
        <div className="buttons">
          <button className="upload-btn" onClick={() => setIsUpload(true)}>
            <FaFileUpload />
            Upload Dealer Mapping
          </button>

          <button
            className="download-btn"
            onClick={() => downloadCSVTemplate(dealerHeaders)}
          >
            <FaDownload />
            Download CSV Format
          </button>
        </div>
      </div>

      <div className="dealer-search">
        <input
          type="text"
          placeholder="Search Dealer / ASM / TSE / Beat..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <DealerTable data={data} />

      {isUpload && <UploadDealerHierarchyPopup close={() => setIsUpload(false)} />}
    </div>
  );
}

export default DealerHierarchy;
