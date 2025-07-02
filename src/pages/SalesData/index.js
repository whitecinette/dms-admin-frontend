import React, { useState } from "react";
import "./style.scss";
import SalesGrowth from "./salesGrowth";
import SalesDataTable from "./salesDataTable";
import { FaDownload, FaFileUpload, FaUserCog } from "react-icons/fa";
import downloadCSVTemplate from "../../components/downloadCSVTemplate";
import UploadPopup from "./uploadPopup";
import { SalesReport } from "./SalesReport";
import TextToggle from "../../components/toggle";

function SalesData() {
  const [isUpload, setIsUpload] = useState(false);
  const [view, setView] = useState("SalesReport");
  return (
    <div className="sales-page">
      <div className="sales-page-header">
        <div className="buttons">
          <div>
            <button className="upload-btn" onClick={() => setIsUpload(true)}>
              <FaFileUpload />
              Upload Bulk CSV
            </button>
          </div>
          <button
            className="download-btn"
            onClick={() =>
              downloadCSVTemplate([
                "spd",
                "mdd",
                "sales_type",
                "buyer_code",
                "buyer_type",
                "product_code",
                "model_code",
                "product_name",
                "product_category",
                "quantity",
                "total_amount",
                "channel",
                "date",
                "month",
                "year",
              ])
            }
          >
            <FaDownload />
            Download CSV Format
          </button>
        </div>
        <div className="Slider">
          <TextToggle
            textFirst="SalesReport"
            textSecond="SalesData"
            setText={setView}
            selectedText={view}
            classStyle={{ minWidth: "300px" }}
          />
        </div>
      </div>
      {view === "SalesReport" ? (
        <>
          <div className="sales-page-container">
            <SalesGrowth moreFilter />
            <SalesDataTable />
          </div>
        </>
      ) : (
        <SalesReport />
      )}
      {isUpload && <UploadPopup close={() => setIsUpload(false)} />}
    </div>
  );
}

export default SalesData;
