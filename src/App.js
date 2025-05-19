import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import DefaultLayout from "./layout/DefaultLayout";
import Dashboard from "./pages/dashboard";
import LoginSignUpAdmin from "./pages/loginAdmin/loginSignUpAdmin";
import Page404 from "./pages/ErrorPage";  // Import the Page404 component
import { Suspense } from "react";
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
import EmployeesSchedules from "./pages/employeeSchedule";
import AdminPage from "./pages/admin";  
import GeoTagging  from "./pages/GeoTagging";
import FinanceDataUpload from "./pages/finance/dataUpload";
function App() {
  const token = localStorage.getItem("authToken");

  const isTokenExpired = () => {
    if (!token) return true; // No token means expired

    try {
      const tokenPayload = JSON.parse(atob(token.split(".")[1])); // Decode JWT
      const expiryTime = tokenPayload.exp * 1000; // Convert to milliseconds

      if (new Date(expiryTime) < Date.now()) {
        localStorage.removeItem("authToken"); // Remove expired token
        return true;
      }

      return false;
    } catch (error) {
      console.error("Invalid token:", error);
      localStorage.removeItem("authToken"); // Remove invalid token
      return true;
    }
  };

  // PrivateRoute to protect pages
  const PrivateRoute = ({ element }) => {
    return isTokenExpired() ? <Navigate to="/login" replace /> : element;
  };

  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          {/* Redirect from root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
           {/* Redirect from the root to the default page */}
           {/* <Route path="/" element={<Navigate to="/dashboard" />} /> */}
          {/* Public Route - Login Page */}
          <Route path="/login" element={<LoginSignUpAdmin />} />

          {/* Protected Routes: All using DefaultLayout */}
          <Route element={<PrivateRoute element={<DefaultLayout />} />}>
            {/* All these routes now use DefaultLayout but render different components */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/salesDashboard" element={<SalesData />} />
            <Route path="/extraction" element={<Extraction />} />
            <Route path="/segment" element={<Segment />} />
            <Route path="/dealer" element={<Dealer />} />
            <Route path="/employee" element={<Employees />} />
            <Route path="/mdd" element={<Mdd />} />
            <Route path="/product" element={<Products />} />
            <Route path="/viewBeatMappingStatus" element={<ViewBeatMappingStatus/>} />
            <Route path="/actorTypeHierarchy" element={<ActorTypeHierarchy/>} />
            <Route path="/addUser" element={<AddUser/>} />
            <Route path="/attendance" element={<Attendance/>} />
            <Route path="/attendance/:code" element={<ViewAttendance/>} />
            <Route path="/attendance/allAttendance" element={<LatestAttendance/>} />
            <Route path="/hierarchy" element={<Hierarchy/>} />
            <Route path="/alphaMessages" element={<AlphaMessages/>} />
            <Route path="/viewBeatMappingStatus/schedules/:code" element={<EmployeesSchedules/>} />
            <Route path="/admin" element={<AdminPage/>} />
            <Route path="/geoTagging" element={<GeoTagging/>} />
            <Route path="/finance/upload-data" element={<FinanceDataUpload /> } />
          </Route>

          {/* 404 Route for unrecognized paths */}
          <Route path="*" element={<Page404 />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
