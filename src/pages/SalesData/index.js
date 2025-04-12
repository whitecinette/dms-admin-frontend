import React from "react";
import "./style.scss";
import SalesGrowth from "./salesGrowth";
import SalesDataTable from "./salesDataTable";

function SalesData() {
  return (
    <div className="sales-page">
      <div className="sales-page-header">Sales Dashboard</div>
      <div className="sales-page-container">
          <SalesGrowth moreFilter/>
          <SalesDataTable/>
      </div>
    </div>
  );
}

export default SalesData;
