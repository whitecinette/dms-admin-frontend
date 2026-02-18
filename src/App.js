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
import PrivateRoute from "./components/PrivateRoute";
import LeaveApplication from "./pages/LeaveApplication";
import TravelExpenses from "./pages/TravelExpenses";
import Earth from "./pages/earth/main-page";
import Payroll from "./pages/payroll";
import AttendanceMatrix from "./pages/payrollCombined/attendanceMatrix";
import AttendanceGeoDashboard from "./pages/attendanceGeoDashboard";
import TypeGroupConfig from "./pages/groups";
import FirmsPage from "./pages/firms";
import MetadataPage from "./pages/metadata";
import ExpensesMatrix from "./pages/expense/expenseMatrix";
import MddWiseTargets from "./pages/mddWiseTarget";
import 'rsuite/dist/rsuite.min.css';
import SessionsViewer from "./pages/sessions/sessionViewer";
import DealerHierarchy from "./pages/dealerHierarchy";
import CombinedDataUpload from "./pages/combinedDataUpload";
import SalesReportV2 from "./pages/SalesReportV2";
import ProductMaster from "./pages/productMaster";
import DataPolice from "./pages/dataPolice";




function App() {
  return (
    <Router>
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
              path="/marketCoverage"
              element={<ViewBeatMappingStatus />}
            />
            <Route
              path="/actorTypeHierarchy"
              element={<ActorTypeHierarchy />}
            />
            <Route path="/addUser" element={<AddUser />} />
            {/* <Route path="/attendance" element={<Attendance />} />
              {/* nameera */}
            <Route path="/attendance/:code" element={<ViewAttendance />} />
            {/* <Route
              path="/attendance/allAttendance"
              element={<LatestAttendance />}
            /> */}
            {/* nameera */}
            <Route
              path="/attendance"
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
            <Route path="/leaveApplication" element={<LeaveApplication />} />
            <Route path="/travelExpenses" element={<TravelExpenses />} />
            <Route path="/super-admin/sessions" element={<SessionsViewer/>} />
            <Route path="/earth" element={<Earth />} />
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/attendance-matrix" element={<AttendanceMatrix />} />
            <Route path="/attendance-geo-dashboard" element={<AttendanceGeoDashboard />} />
            
            <Route path="/groups" element={<TypeGroupConfig />} />
            <Route path="/firms" element={<FirmsPage />} />
            <Route path="/metadata" element={<MetadataPage />} />
            <Route path="/expense" element={<ExpensesMatrix /> } />
            <Route path="/mdd-wise-targets" element={<MddWiseTargets/> } />

            {/* new  */}

            <Route path="/dealer-hierarchy" element={<DealerHierarchy/> } />
            <Route path="/combined-upload" element={<CombinedDataUpload />} />
            <Route path="/all-reports" element={<SalesReportV2 /> } />
            <Route path="/product-master" element={<ProductMaster /> } />
            <Route path="/data-police" element={<DataPolice /> } />

            
          </Route>

          {/* 404 Route for unrecognized paths */}
          <Route path="*" element={<Page404 />} />
        </Routes>
    </Router>
  );
}

export default App;
