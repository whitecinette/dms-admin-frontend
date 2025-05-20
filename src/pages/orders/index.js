import React, { useEffect, useState } from "react";
import config from "../../config";
import axios from "axios";
import Select from "react-select";
import "./style.scss";

const backendUrl = config.backend_url;

function Orders() {
  const [orderData, setOrderData] = useState([]);
  const [dealer, setDealer] = useState("");
  const [dealerList, setDealerList] = useState([]);
  const [searchOrderId, setSearchOrderId] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, seterror] = useState("");
  const [dealerSearch, setDealerSearch] = useState("");
  const [productList, setProductList] = useState([]);
  const [editingOrder, setEditingOrder] = useState(null);
  const [deleteId, setDeleteId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDealersLoading, setIsDealersLoading] = useState(false);
  const [filteredDealers, setFilteredDealers] = useState([]);
  const [totalPendingCount, setTotalPendingCount] = useState(0);

  const fetchOrderData = async () => {
    if (!dealer) return; // Prevent API call if dealer is not set
    setIsLoading(true);
    try {
      const response = await axios.get(`${backendUrl}/order/get-order`, {
        params: {
          UserID: dealer,
          status,
          startDate,
          endDate,
          search: searchOrderId,
        },
      });
      setOrderData(response.data.orders);
    } catch (err) {
      console.log(err);
      setOrderData("");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(
        `${backendUrl}/product/get-all-products-for-admin`
      );
      setProductList(response.data.products);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const fetchAllDealers = async () => {
    try {
      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        console.error("No auth token found!");
        return;
      }

      const response = await axios.get(
        `${backendUrl}/order/get-order-by-dealer`,
        {
          headers: { Authorization: authToken },
        }
      );

      const dealers = response.data.data; // Store the fetched dealers
      setDealerList(dealers);
      setTotalPendingCount(response.data.totalDealersWithPendingOrders);

      if (dealers.length > 0) {
        setDealer(dealers[0]._id);
      } else {
        console.warn("No dealers found!");
      }
    } catch (err) {
      console.error("Error fetching dealers:", err);
    } finally {
      setIsDealersLoading(false);
    }
  };
  const handleModelChange = (index, productId) => {
    setEditingOrder((prevState) => {
      const selectedProduct = productList.find((p) => p._id === productId);

      const updatedProducts = prevState.Products.map((product, i) =>
        i === index
          ? {
              ...product,
              ProductId: selectedProduct, // Assign selected model
              quantity: 0, // Reset quantity
              price: selectedProduct?.price || 0, // Update price
            }
          : product
      );

      return { ...prevState, Products: updatedProducts };
    });
  };

  const handleQuantityChange = (productIndex, quantity) => {
    setEditingOrder((prevState) => {
      const updatedProducts = prevState.Products.map((product, idx) =>
        idx === productIndex
          ? { ...product, Quantity: quantity } // Only update quantity
          : product
      );

      return { ...prevState, Products: updatedProducts };
    });
  };

  const handleAddProduct = () => {
    setEditingOrder({
      ...editingOrder,
      Products: [
        ...editingOrder.Products,
        { ProductId: "", Quantity: 0, Price: 0 },
      ],
    });
    console.log(editingOrder);
  };

  const handleSaveChanges = async () => {
    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
      console.error("No auth token found!");
      return;
    }

    // ✅ Calculate new total price
    const newTotalPrice =
      editingOrder?.Products?.reduce(
        (sum, product) =>
          sum +
          (product.Quantity ?? 0) *
            (product.ProductId?.price ?? product?.price ?? 0),
        0
      ) ?? 0;

    // ✅ Create a local copy with updated total price
    const updatedOrder = {
      ...editingOrder,
      TotalPrice: newTotalPrice,
    };

    try {
      const response = await axios.put(
        `${backendUrl}/order/edit-order-by-admin/${editingOrder._id}`,
        updatedOrder, // ✅ Pass the updated object directly
        {
          headers: { Authorization: authToken },
        }
      );

      console.log("Order updated successfully:", response.data);

      // ✅ Reset editing state
      setEditingOrder(null);
      fetchOrderData();
    } catch (err) {
      console.error("Error updating order:", err.response?.data || err.message);
    }
  };

  // delete order
  const handleDeleteOrder = async (orderId) => {
    try {
      await axios.delete(
        `${backendUrl}/order/delete-order-by-admin/${orderId}`,
        {
          headers: { Authorization: localStorage.getItem("authToken") },
        }
      );
      setDeleteId("");
      fetchOrderData();
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchAllDealers();
    const interval = setInterval(() => {
      fetchAllDealers();
    }, 60000); // fetch every 60 seconds
  
    return () => clearInterval(interval); // cleanup on unmount
  }, []);
  

  useEffect(() => {
    fetchProducts();
    fetchOrderData();
  }, [dealer, searchOrderId, status]);

  useEffect(() => {
    if (startDate === "" && endDate === "") {
      fetchOrderData();
    }
  }, [startDate, endDate]); // Runs when startDate or endDate changes

  useEffect(() => {
    const filtered = dealerList.filter((dealer) =>
      dealer.name.toLowerCase().includes(dealerSearch.toLowerCase())
    );
    setFilteredDealers(filtered);
  }, [dealerSearch, dealerList]);

  // ✅ Apply Filter Handler
  const handleApplyFilter = () => {
    if (startDate && !endDate) {
      const today = new Date().toISOString().split("T")[0]; // Get today's date
      setEndDate(today);
    } else if (endDate && !startDate) {
      seterror("Set Start Date");
      setTimeout(() => {
        seterror("");
      }, 3000);
    } else {
      fetchOrderData();
    }
  };

  // ✅ Reset Filter Handler
  const handleResetFilter = () => {
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="order-page">
      <div className="order-page-filter">
        <input
          type="text"
          value={searchOrderId}
          placeholder="Search Order ID"
          onChange={(e) => setSearchOrderId(e.target.value)}
        />
        <div className="order-page-filter-date">
          <div className="date">
            <label>From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="date">
            <label>To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="order-page-button">
            <button
              className="order-page-apply-filter"
              onClick={handleApplyFilter}
            >
              Apply
            </button>
            <button
              className="order-page-Reset-filter"
              onClick={handleResetFilter}
            >
              Reset
            </button>
          </div>
          {error && <span style={{ color: "red" }}>{error}</span>}
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
          }}
        >
          <option value="">Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="order-page-cards">
        <div className="order-page-order-card">
          <div className="order-page-card-header">Order</div>
          <div className="order-page-order-card-body">
            {isLoading ? (
              <div className="loading-spinner">Loading orders...</div>
            ) : orderData.length > 0 ? (
              orderData.map((order, index) => {
                const isEditing =
                  editingOrder &&
                  editingOrder.OrderNumber === order.OrderNumber;

                return (
                  <div key={index} className="order-page-order-list">
                    <div className="order-page-action-buttons">
                      <div
                        className="order-list-edit-btn"
                        onClick={() => {
                          setEditingOrder(isEditing ? null : { ...order });
                        }}
                      >
                        {isEditing ? "Cancel" : "Edit"}
                      </div>
                      <div
                        className="order-list-delete-btn"
                        onClick={() => handleDeleteOrder(order._id)}
                      >
                        Delete
                      </div>
                    </div>

                    <div className="order-page-details">
                      <span>
                        <b>Dealer Name:</b> {order?.UserId?.name || "N/A"}
                      </span>
                      <span>
                        <b>Order Id: </b>
                        {order?.OrderNumber}
                      </span>
                      <span>
                        <b>Order Date:</b>{" "}
                        {order?.OrderDate?.split("T")[0] || "N/A"}
                      </span>
                      <span>
                        <b>Delivery Date:</b>
                        {isEditing ? (
                          <input
                            type="date"
                            value={
                              editingOrder.DeliveryDate?.split("T")[0] || ""
                            }
                            onChange={(e) =>
                              setEditingOrder({
                                ...editingOrder,
                                DeliveryDate: e.target.value,
                              })
                            }
                          />
                        ) : (
                          order?.DeliveryDate?.split("T")[0] || "N/A"
                        )}
                      </span>
                      <span>
                        <b>Status: </b>
                        {isEditing ? (
                          <select
                            value={editingOrder.OrderStatus}
                            onChange={(e) =>
                              setEditingOrder({
                                ...editingOrder,
                                OrderStatus: e.target.value,
                              })
                            }
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        ) : (
                          <span className={`status ${order.OrderStatus}`}>
                            {order?.OrderStatus?.toUpperCase()}
                          </span>
                        )}
                      </span>
                    </div>

                    <table className="product-page-table">
                      <thead>
                        <tr>
                          <th>Model</th>
                          <th>Quantity</th>
                          <th>Price</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isEditing
                          ? editingOrder.Products.map((product, idx) => (
                              <tr key={idx}>
                                {/* Model Selection Dropdown */}
                                <td>
                                  <select
                                    value={product.ProductId?._id || ""}
                                    onChange={(e) =>
                                      handleModelChange(idx, e.target.value)
                                    }
                                  >
                                    <option value="" disabled>
                                      Select Model
                                    </option>
                                    {productList.map((p) => (
                                      <option key={p._id} value={p._id}>
                                        {p.product_name}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                {/* Quantity Input */}
                                <td>
                                  <input
                                    type="number"
                                    value={product.Quantity}
                                    onChange={(e) =>
                                      handleQuantityChange(
                                        idx,
                                        Number(e.target.value)
                                      )
                                    }
                                  />
                                </td>

                                {/* Price Column */}
                                <td>
                                  ₹
                                  {product?.ProductId?.price ??
                                    product?.price ??
                                    0}
                                </td>

                                {/* Total Price Column */}
                                <td>
                                  ₹
                                  {(
                                    product.Quantity *
                                    (product?.ProductId?.price ?? 0)
                                  ).toLocaleString()}
                                </td>
                              </tr>
                            ))
                          : order?.Products?.map((product, idx) => (
                              <tr key={idx}>
                                <td>
                                  {product?.ProductId?.product_name || "N/A"}
                                </td>
                                <td>{product?.Quantity}</td>
                                <td>
                                  ₹
                                  {product?.ProductId?.price?.toLocaleString() ||
                                    "N/A"}
                                </td>
                                <td>
                                  ₹
                                  {(
                                    product.Quantity *
                                    (product?.ProductId?.price || 0)
                                  ).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                      </tbody>
                    </table>

                    <div className="product-total">
                      <div className="product-total">
                        <b>Total Price: </b>₹
                        {isEditing
                          ? (
                              editingOrder?.Products?.reduce(
                                (sum, product) =>
                                  sum +
                                  (product.Quantity ?? 0) *
                                    (product?.ProductId?.price ??
                                      product?.price ??
                                      0),
                                0
                              ) ?? 0
                            ).toLocaleString()
                          : order?.TotalPrice?.toLocaleString()}
                      </div>
                    </div>
                    <div className="product-remark">
                      <b>Remarks: </b>
                      {order?.Remarks || "No Remarks"}
                    </div>
                    {isEditing && (
                      <div className="order-page-action-buttons">
                        <button
                          className="order-page-add-product"
                          onClick={handleAddProduct}
                        >
                          Add Product
                        </button>
                        <button
                          className="order-page-save"
                          onClick={handleSaveChanges}
                        >
                          Save Changes
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div>No Orders Found</div>
            )}
          </div>
        </div>

        <div className="order-page-dealer-card">
          <div className="order-page-dealer-card-header-line">
            <div className="order-page-dealer-card-header">Dealer</div>
            <div className="order-page-dealer-card-pendings">Pending Orders: <span>{totalPendingCount}</span></div>
          </div>
          <div className="order-page-dealer-filter">
            <input
              type="text"
              value={dealerSearch}
              placeholder="Search Dealer"
              onChange={(e) => setDealerSearch(e.target.value)}
            />
          </div>
          <div className="order-page-dealer-list">
            {isDealersLoading ? (
              <div className="loading-spinner">Loading dealers...</div>
            ) : filteredDealers.length > 0 ? (
              filteredDealers.map((dealers) => (
                <div
                  key={dealers._id}
                  className={`order-page-dealer ${
                    dealer === dealers._id ? "active" : ""
                  }`}
                  onClick={() => setDealer(dealers._id)}
                >
                  <span>
                    <b>Dealer Code:</b> {dealers?.code || "N/A"}
                  </span>
                  <span>
                    <b>Dealer Name:</b> {dealers?.name || "N/A"}
                  </span>
                  {dealers?.pendingOrdersCount > 0 && (
                    <span className="pending-orders-count">
                      {dealers?.pendingOrdersCount || 0}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div>No Dealers Found</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Orders;
