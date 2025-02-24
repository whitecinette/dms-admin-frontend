import { useEffect, useState } from "react";
import { IoAddSharp } from "react-icons/io5";
import { FaFileUpload, FaDownload } from "react-icons/fa";
import config from "../../config.js";
import "./style.scss";
import Table from "../../components/table";
import axios from "axios";

const backendUrl = config.backend_url;

function Products() {
  const [category, setCategory] = useState("");
  const [categoryList, setCategoryList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [product, setProduct] = useState([]);
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [success, setSuccess] = useState("");
  const [addBox, setAddBox] = useState(false);
  const [productData, setProductData] =useState({})

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setSelectedFile(file);

    // Prepare FormData
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        `${backendUrl}/product/upload-csv-by-admin`,
        formData,
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );
      setSuccess(response.data.message);
      setTimeout(() => {
        setSuccess("");
      }, 3000);
      fetchProduct();
    } catch (error) {
      console.log("err:", error);
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Something went wrong. Please try again."
      );
      setTimeout(() => {
        setErrorMessage("");
      }, 3000);
    }
  };

  //edit products
  const editproduct = async (data, id) => {
    try {
      await axios.put(
        `${backendUrl}/product/edit-product-by-admin/${id}`,
        data,
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );
      fetchProduct();
    } catch (error) {
      console.log("err:", error);
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Something went wrong. Please try again."
      );
      setTimeout(() => {
        setErrorMessage("");
      }, 3000);
    }
  };

  //delete products
  const deleteproduct = async (id) => {
    try {
      await axios.delete(
        `${backendUrl}/product/delete-product-by-admin/${id}`,
        {
          headers: {
            Authorization: localStorage.getItem("authToken"),
          },
        }
      );
      fetchProduct();
    } catch (error) {
      console.log("err:", error);
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Something went wrong. Please try again."
      );
      setTimeout(() => {
        setErrorMessage("");
      }, 3000);
    }
  };

  //add product
  const addProduct = async () => {
    try {
      const response = await axios.post(
        `${backendUrl}/product/add-product-by-admin`,
        productData,{
          headers: {
            Authorization: localStorage.getItem("authToken"),
        }
      }
      );
      setAddBox(false);
      fetchProduct();
      setSuccess(response.data.message)
      setTimeout(()=>{
        setSuccess("")
      }, 3000)
    } catch (error) {
      setAddBox(false);
      console.log("err:", error);
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Something went wrong. Please try again."
      );
      setTimeout(() => {
        setErrorMessage("");
      }, 3000);
    }
  };

  //get products
  const fetchProduct = async (sort = "createdAt", order) => {
    try {
      const response = await axios.get(
        `${backendUrl}/product/get-product-by-admin`,
        {
          params: {
            page: currentPage,
            limit: 50,
            sort: String(sort),
            order: order,
            search: search,
            category: category,
          },
        }
      );
      response.data.headers = [
        "Brand",
        "Model",
        "Price",
        "Segment",
        "Category",
        "Status",
      ];
      setCategoryList(response.data.categories);
      setProduct(response.data);
      setTotalRecords(response.data.totalRecords);
    } catch (error) {
      console.log("err:", error);
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Something went wrong. Please try again."
      );
      setTimeout(() => {
        setErrorMessage("");
      }, 3000);
    }
  };
  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProductData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  //call get function
  useEffect(() => {
    fetchProduct();
  }, [currentPage, search, category]);

  const totalPages = Math.ceil(totalRecords / 50);
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

  return (
    <div className="Product-page">
      <div className="product-page-header">Product</div>
      <div className="product-page-content">
        <div className="product-page-first-line">
          <div className="search-filter">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setCurrentPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Search"
            />
          </div>
          <div className="category-filter">
            <select
              onChange={(e) => setCategory(e.target.value)}
              value={category}
            >
              <option value="">All Category</option>
              {categoryList.map((item, index) => (
                <option key={index} value={item}>
                  {item.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div className="product-page-buttons">
            <div
              className="product-add-btn green"
              onClick={() => setAddBox(true)}
            >
              <IoAddSharp />
              Add
            </div>
            <div className="product-upload-btn">
              <label htmlFor="file-upload" className="browse-btn">
                <FaFileUpload />
                Upload
              </label>
              <input
                type="file"
                id="file-upload"
                hidden
                onChange={handleFileChange}
              />
            </div>
            <div className="product-download-btn">
              <FaDownload />
              Download
            </div>
          </div>
        </div>
        <Table
          data={product}
          onSort={fetchProduct}
          handleSave={editproduct}
          deleteRow={deleteproduct}
        />
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
      {addBox && (
        <div className="product-add-box">
          <div className="product-add-container">
            <div className="product-add-content">
              <div className="product-add-header">Add Product</div>
              <div className="product-add-form">
              <input type="text" name="Brand" placeholder="Brand" value={productData.brand} onChange={handleChange} required/>
              <input type="text" name="Model" placeholder="Model" value={productData.model} onChange={handleChange} required/>
              <input type="number" name="Price" placeholder="Price" value={productData.price} onChange={handleChange} required/>
              <input type="text" name="Segment" placeholder="Segment" value={productData.segment} onChange={handleChange} required/>
              <input type="text" name="Category" placeholder="Category" value={productData.category} onChange={handleChange} required/>
              <select name="Status" value={productData.status} onChange={handleChange}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <input type="text" name="Specs" placeholder="Specs" value={productData.specs} onChange={handleChange} required/>
              </div>
              <div className="product-add-button">
                <button className="product-submit-btn" onClick={addProduct}>Submit</button>
                <button
                  className="product-cancel-btn"
                  onClick={() => setAddBox(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {errorMessage && <div className="error-message">{errorMessage}</div>}
      {success && <div className="success-message">{success}</div>}
    </div>
  );
}
export default Products;
