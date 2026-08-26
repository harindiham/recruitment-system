import Login from "./pages/Login";
import HRDashboard from "./pages/HRDashboard";
import CandidateLogin from "./pages/CandidateLogin";
import CandidateDashboard from "./pages/CandidateDashboard";
import Home from "./pages/Home";
import Register from "./pages/Register";

import "./App.css";

function App() {
    const path = window.location.pathname;

    // =========================
    // HOME / LANDING PAGE
    // =========================
    if (path === "/") {
        return <Home />;
    }

    // =========================
    // HR
    // =========================
    if (path === "/hr-dashboard") {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        if (user?.role !== "HR Manager") {
            window.location.replace("/hr-login");
            return null;
        }
        return <HRDashboard />;
    }

    // HR login
    if (path === "/hr-login") {
        return <Login />;
    }

    if (path === "/register-hr") {
        return <Register accountType="hr" />;
    }

    // =========================
    // CANDIDATE
    // =========================
    if (path === "/candidate-login") {
        return <CandidateLogin />;
    }

    if (path === "/register-candidate") {
        return <Register accountType="candidate" />;
    }

    if (path === "/candidate-dashboard") {
        const user = JSON.parse(localStorage.getItem("candidate_user") || "null");
        if (user?.role !== "Candidate" || !user?.candidate_id) {
            window.location.replace("/candidate-login");
            return null;
        }
        return <CandidateDashboard />;
    }

    // =========================
    // DEFAULT
    // =========================
    return <Home />;
}

export default App;