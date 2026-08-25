import Login from "./pages/Login";
import HRDashboard from "./pages/HRDashboard";
import CandidateLogin from "./pages/CandidateLogin";
import CandidateDashboard from "./pages/CandidateDashboard";
import Home from "./pages/Home";

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
        return <HRDashboard />;
    }

    // HR login
    if (path === "/hr-login") {
        return <Login />;
    }

    // =========================
    // CANDIDATE
    // =========================
    if (path === "/candidate-login") {
        return <CandidateLogin />;
    }

    if (path === "/candidate-dashboard") {
        return <CandidateDashboard />;
    }

    // =========================
    // DEFAULT
    // =========================
    return <Home />;
}

export default App;