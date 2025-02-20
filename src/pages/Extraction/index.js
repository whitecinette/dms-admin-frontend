import React, { useEffect, useState } from "react";
import BarGraph from "../../components/barGraph";
import "./style.scss";
import { FaGripHorizontal } from "react-icons/fa";
import { VscGraph } from "react-icons/vsc";
import Table from "../../components/table";

function Extraction() {
  const [extractionData, setExtractionData] = useState([]);
  const [isGraphVisible, setIsGraphVisible] = useState(false);
  const extractionDataGraph = [
    {
      month: "Jan",
      iPhone: 320,
      Samsung: 290,
      OnePlus: 340,
      Realme: 270,
      "Google Pixel": 180,
      Motorola: 200,
      Oppo: 310,
      Vivo: 290,
      Xiaomi: 330,
    },
    {
      month: "Feb",
      iPhone: 300,
      Samsung: 260,
      OnePlus: 330,
      Realme: 280,
      "Google Pixel": 190,
      Motorola: 210,
      Oppo: 300,
      Vivo: 280,
      Xiaomi: 320,
    },
    {
      month: "Mar",
      iPhone: 280,
      Samsung: 230,
      OnePlus: 310,
      Realme: 290,
      "Google Pixel": 200,
      Motorola: 220,
      Oppo: 290,
      Vivo: 270,
      Xiaomi: 310,
    },
    {
      month: "Apr",
      iPhone: 260,
      Samsung: 220,
      OnePlus: 290,
      Realme: 300,
      "Google Pixel": 210,
      Motorola: 230,
      Oppo: 280,
      Vivo: 260,
      Xiaomi: 300,
    },
    {
      month: "May",
      iPhone: 250,
      Samsung: 300,
      OnePlus: 270,
      Realme: 310,
      "Google Pixel": 220,
      Motorola: 240,
      Oppo: 270,
      Vivo: 250,
      Xiaomi: 290,
    },
    {
      month: "Jun",
      iPhone: 290,
      Samsung: 350,
      OnePlus: 310,
      Realme: 320,
      "Google Pixel": 230,
      Motorola: 250,
      Oppo: 260,
      Vivo: 240,
      Xiaomi: 280,
    },
    {
      month: "Jul",
      iPhone: 320,
      Samsung: 400,
      OnePlus: 350,
      Realme: 330,
      "Google Pixel": 240,
      Motorola: 260,
      Oppo: 250,
      Vivo: 230,
      Xiaomi: 270,
    },
    {
      month: "Aug",
      iPhone: 330,
      Samsung: 370,
      OnePlus: 360,
      Realme: 340,
      "Google Pixel": 250,
      Motorola: 270,
      Oppo: 240,
      Vivo: 220,
      Xiaomi: 260,
    },
    {
      month: "Sep",
      iPhone: 310,
      Samsung: 340,
      OnePlus: 330,
      Realme: 350,
      "Google Pixel": 260,
      Motorola: 280,
      Oppo: 230,
      Vivo: 210,
      Xiaomi: 250,
    },
    {
      month: "Oct",
      iPhone: 290,
      Samsung: 310,
      OnePlus: 300,
      Realme: 360,
      "Google Pixel": 270,
      Motorola: 290,
      Oppo: 220,
      Vivo: 200,
      Xiaomi: 240,
    },
    {
      month: "Nov",
      iPhone: 270,
      Samsung: 280,
      OnePlus: 290,
      Realme: 370,
      "Google Pixel": 280,
      Motorola: 300,
      Oppo: 210,
      Vivo: 190,
      Xiaomi: 230,
    },
    {
      month: "Dec",
      iPhone: 250,
      Samsung: 260,
      OnePlus: 270,
      Realme: 380,
      "Google Pixel": 290,
      Motorola: 310,
      Oppo: 200,
      Vivo: 180,
      Xiaomi: 220,
    },
  ];

  const fetchExtractionData = (sort, order) => {
    console.log("sort:", sort);
    console.log("order:", order);
    console.log("search:", search);
  };
  const deleteExtractionData = (id) => {
    console.log("id:", id);
  }
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const headers = ["Dealer Code", "Brand", "Model", "Price", "Status"];

  useEffect(() => {
    // Setting the data inside useEffect to prevent infinite re-renders
    setExtractionData({
      data: [
        {
          ID: "67766cdd69cc4c2af284f5e2",
          "Dealer Code": "RAJD12580",
          "Shop Name": "ASTEL SYSTEM",
          Brand: "Apple",
          Model: "10.2-inch iPad Wi-Fi + Cellular 64GB - Space Grey",
          Category: "tab",
          Quantity: 1,
          Price: 45900,
          "Total Price": 45900,
          Segment: "Tab>40k",
          "Uploaded By": "SC-ZSM0001",
          "Employee Name": "Varun Bansal",
          Status: "active",
          Date: "2025-01-02",
          "Admin Note": "N/A",
        },
      ],
      totalRecords: 100,
      totalPages: 2,
      currentPage: 1,
    });
  }, [currentPage]);

  useEffect(() => {
    fetchExtractionData();
  },[search]);

  const totalPages = extractionData.totalPages || 1;

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
  extractionData.headers = headers;
  // console.log(extractionData);
  return (
    <div className="extraction-page">
      <div className="extraction-header">Extraction</div>
      <div className="toggle-container">
        <div
          className={`toggle-button ${!isGraphVisible ? "active" : ""}`}
          onClick={() => setIsGraphVisible(false)}
        >
          <FaGripHorizontal />
        </div>
        <div
          className={`toggle-button ${isGraphVisible ? "active" : ""}`}
          onClick={() => setIsGraphVisible(true)}
        >
          <VscGraph />
        </div>
      </div>

      {/* Conditional rendering of graph or table */}
      {isGraphVisible ? (
        <div className="graph-container">
          <BarGraph data={extractionDataGraph} />
        </div>
      ) : (
        <div className="table-container">
          <div className="extraction-filter">
            <div className="extraction-filter-date">
              <div className="date">
                <label>From:</label>
                <input type="date" />
              </div>
              <div className="date">
                <label>To:</label>
                <input type="date" />
              </div>
            </div>

            <div className="extraction-filter-brand">
              <div className="extraction-filter-search">
                <input type="text" placeholder="Search"  value={search} onChange={(e)=>setSearch(e.target.value)}/>
              </div>
              <div className="extraction-filter-Status">
                <select>
                  <option value="">Status</option>
                  <option className="green" value="active">
                    Active
                  </option>
                  <option className="red" value="inactive">
                    Inactive
                  </option>
                </select>
              </div>
            </div>
          </div>
          <Table data={extractionData} onSort={fetchExtractionData} deleteRow={deleteExtractionData}/>
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
      )}
    </div>
  );
}

export default Extraction;
