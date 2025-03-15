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

function App() {
  // Get the token from localStorage
  const token = localStorage.getItem('authToken');

  // PrivateRoute Component that checks if user is authenticated
  const PrivateRoute = ({ element }) => {
    return token ? element : <Navigate to="/login" replace />;
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
            <Route path="/salesData" element={<SalesData />} />
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
          </Route>

          {/* 404 Route for unrecognized paths */}
          <Route path="*" element={<Page404 />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
