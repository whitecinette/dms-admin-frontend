import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import DefaultLayout from "./layout/DefaultLayout";
import Dashboard from "./pages/dashboard";
import LoginSignUpAdmin from "./pages/loginAdmin/loginSignUpAdmin";
import Page404 from "./pages/ErrorPage";
import { Suspense, useEffect, useState } from "react";
import Orders from "./pages/orders";
import SalesData from "./pages/SalesData";
import Extraction from "./pages/Extraction";
import Segment from "./pages/Segment";
import Dealer from "./pages/dealer";
import Products from "./pages/products";
import Employees from "./pages/employee";
import Mdd from "./pages/mdd";
import ViewBeatMappingStatus from "./pages/viewBeatMappingStatus";
import ActorTypeHierarchy from "./pages/actorTypeHierarchy";
import AddUser from "./pages/addUser";
import Attendance from "./pages/attendance";
import ViewAttendance from "./pages/viewAttendance";
import LatestAttendance from "./pages/latestAttendance";
import Hierarchy from "./pages/hierarchy";
import AlphaMessages from "./pages/alphaMessages";
import AdminPage from "./pages/admin";
import GeoTagging from "./pages/GeoTagging";
import FinanceDataUpload from "./pages/finance/dataUpload";
import FinanceData from "./pages/finance/financeData";
import FinanceVoucherUpload from "./pages/finance/voucherUpload";
import FinanceVouchers from "./pages/finance/financeVouchers";
import UpdateProducts from "./pages/inventory/updateProduct";
import RoutesPlan from "./pages/RoutesPlan";
import axios from "axios";
import config from "./config";

const backend_url = config.backend_url;

function PrivateRoute({ element }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  const isTokenExpired = () => {
    const token = localStorage.getItem("authToken");
    if (!token) return true;

    try {
      const tokenPayload = JSON.parse(atob(token.split(".")[1]));
      const expiryTime = tokenPayload.exp * 1000;
      return new Date(expiryTime) < Date.now();
    } catch (error) {
      console.error("Invalid token:", error);
      return true;
    }
  };

  const refreshToken = async () => {
    try {
      if (!localStorage.getItem("refreshToken")) {
        setIsAuthenticated(false);
        return;
      }
      const body = {
        refreshToken: localStorage.getItem("refreshToken"),
      };

      const res = await axios.post(`${backend_url}/user/Refresh-token`, body);
      localStorage.setItem("authToken", res.data.token); // Update token
      localStorage.setItem("refreshToken", res.data.refreshToken); // Update refresh token
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Error refreshing token:", error);
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    if (isTokenExpired()) {
      console.log("Token expired, refreshing...");
      refreshToken();
    } else {
      setIsAuthenticated(true);
    }
  }, []);

  if (isAuthenticated === null) {
    return <div>Loading...</div>; // Temporary loading state
  }

  return isAuthenticated ? element : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Router>
      <Suspense fallback={<div>Loading application...</div>}>
        <Routes>
          {/* Public Route - Login Page */}
          <Route path="/login" element={<LoginSignUpAdmin />} />

          {/* Redirect from root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Protected Routes: All using DefaultLayout */}
          <Route element={<PrivateRoute element={<DefaultLayout />} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/salesDashboard" element={<SalesData />} />
            <Route path="/extraction" element={<Extraction />} />
            <Route path="/segment" element={<Segment />} />
            <Route path="/dealer" element={<Dealer />} />
            <Route path="/employee" element={<Employees />} />
            <Route path="/mdd" element={<Mdd />} />
            <Route path="/product" element={<Products />} />
            <Route path="/update/products" element={<UpdateProducts />} />
            <Route
              path="/viewBeatMappingStatus"
              element={<ViewBeatMappingStatus />}
            />
            <Route
              path="/actorTypeHierarchy"
              element={<ActorTypeHierarchy />}
            />
            <Route path="/addUser" element={<AddUser />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/attendance/:code" element={<ViewAttendance />} />
            <Route
              path="/attendance/allAttendance"
              element={<LatestAttendance />}
            />
            <Route path="/hierarchy" element={<Hierarchy />} />
            <Route path="/alphaMessages" element={<AlphaMessages />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/geoTagging" element={<GeoTagging />} />
            <Route
              path="/finance/upload-data"
              element={<FinanceDataUpload />}
            />
            <Route path="/finance/data" element={<FinanceData />} />
            <Route
              path="/finance/upload-vouchers"
              element={<FinanceVoucherUpload />}
            />
            <Route path="/finance/vouchers" element={<FinanceVouchers />} />
            <Route path="/routePlan" element={<RoutesPlan />} />
          </Route>

          {/* 404 Route for unrecognized paths */}
          <Route path="*" element={<Page404 />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
