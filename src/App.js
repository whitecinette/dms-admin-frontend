import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DefaultLayout from "./layout/DefaultLayout";
import Dashboard from "./pages/dashboard";
import LoginSignUpAdmin from "./pages/loginAdmin/loginSignUpAdmin";

function App() {
    return (
        <Router>
        <Routes>
          <Route path="/login" element={<LoginSignUpAdmin />} />
        </Routes>
            <Routes>
                <Route path="/dashboard" element={<DefaultLayout />}>
                    <Route index element={<Dashboard />} />
                </Route>
            </Routes>
        </Router>
    );
}

export default App;
