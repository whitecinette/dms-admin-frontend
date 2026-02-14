import React, { useEffect, useState } from "react";
import config from "../../config";
import "./style.scss";
import UploadProductMasterPopup from "./uploadProductMasterPopUp";

const backendUrl = config.backend_url;

function ProductMaster() {
  const [products, setProducts] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${backendUrl}/product-master`,
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );

      const result = await res.json();
      if (res.ok) {
        setProducts(result.data);
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert("Network error");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const toggleFlag = async (id, field, value) => {
    try {
      const res = await fetch(
        `${backendUrl}/product-master/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: localStorage.getItem("authToken"),
          },
          body: JSON.stringify({ [field]: value }),
        }
      );

      if (res.ok) {
        fetchProducts();
      }
    } catch (err) {
      alert("Update failed");
    }
  };

  return (
    <div className="product-master-page">
      <div className="container">
        <div className="header">
          <h2>📦 Product Master</h2>
          <button onClick={() => setShowUpload(true)}>
            ⬆ Upload Product Master
          </button>
        </div>

        <div className="instructions">
          <h4>📘 Instructions</h4>
          <ul>
            <li>Upload CSV/XLSX with correct headers.</li>
            <li>SKU must be unique.</li>
            <li>Existing SKUs will update automatically.</li>
            <li>Flags can be edited manually below.</li>
          </ul>
        </div>

        {loading && <div className="loader">Loading...</div>}

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Brand</th>
                <th>SKU</th>
                <th>Model</th>
                <th>Segment</th>
                <th>Price Bucket</th>
                <th>Active</th>
                <th>Market Share</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p._id}>
                  <td>{p.brand}</td>
                  <td>{p.sku}</td>
                  <td>{p.model}</td>
                  <td>{p.segment}</td>
                  <td>{p.sub_segment}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={p.is_active}
                      onChange={(e) =>
                        toggleFlag(
                          p._id,
                          "is_active",
                          e.target.checked
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={p.market_share_active}
                      onChange={(e) =>
                        toggleFlag(
                          p._id,
                          "market_share_active",
                          e.target.checked
                        )
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showUpload && (
          <UploadProductMasterPopup
            close={() => setShowUpload(false)}
            refresh={fetchProducts}
          />
        )}
      </div>
    </div>
  );
}

export default ProductMaster;
