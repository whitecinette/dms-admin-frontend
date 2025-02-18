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
import Users from "./pages/Users";

function App() {
  // Get the token from localStorage
  const token = localStorage.getItem('authToken');

  // PrivateRoute Component that checks if user is authenticated
  const PrivateRoute = ({ element }) => {
    return token ? element : <Navigate to="/login" replace />;
  };

  return (
    // <Router>
    //   <Suspense fallback={<div>Loading...</div>}      >
    //     <Routes>
    //       {/* Public Route - Login Page */}
    //       <Route path="/login" element={<LoginSignUpAdmin />} />

    //       {/* Private Routes - Only accessible with token */}
    //       <Route path="/dashboard" element={<PrivateRoute element={<DefaultLayout />} />}>
    //         <Route index element={<Dashboard />} />
    //       </Route>
    //       {/* orders */}
    //       <Route path="/orders" element={<PrivateRoute element={<DefaultLayout />} />}>
    //         <Route index element={<Dashboard />} />
    //       </Route>
    //       {/* sales report */}
    //       <Route path="/salesData" element={<PrivateRoute element={<DefaultLayout />} />}>
    //         <Route index element={<Dashboard />} />
    //       </Route>
    //       {/* Extraction */}
    //       <Route path="/extraction" element={<PrivateRoute element={<DefaultLayout />} />}>
    //         <Route index element={<Dashboard />} />
    //       </Route>
    //       {/* segment */}
    //       <Route path="/segment" element={<PrivateRoute element={<DefaultLayout />} />}>
    //         <Route index element={<Dashboard />} />
    //       </Route>
    //       {/* users */}
    //       <Route path="/users" element={<PrivateRoute element={<DefaultLayout />} />}>
    //         <Route index element={<Dashboard />} />
    //       </Route>
    //       {/* logout */}
    //       <Route path="/logout" element={<PrivateRoute element={<DefaultLayout />} />}>
    //         <Route index element={<Dashboard />} />
    //       </Route>

    //       {/* 404 Route for unrecognized paths */}
    //       <Route path="*" element={<Page404 />} />
    //     </Routes>
    //   </Suspense>
    // </Router>
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
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
            <Route path="/users" element={<Users />} />
            {/* <Route path="/logout" element={<Dashboard />} /> */}
          </Route>

          {/* 404 Route for unrecognized paths */}
          <Route path="*" element={<Page404 />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
