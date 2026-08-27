import { useState, useEffect } from "react";

import Login from "./pages/Login";
import HRDashboard from "./pages/HRDashboard";
import CandidateLogin from "./pages/CandidateLogin";
import CandidateDashboard from "./pages/CandidateDashboard";
import Home from "./pages/Home";
import Register from "./pages/Register";

import "./App.css";

function App() {
    const getPath = () =>
        window.location.pathname.replace("/recruitment-system", "") || "/";

    const [path, setPath] = useState(getPath());

    // Custom navigation event
    useEffect(() => {
        const handleNavigation = () => {
            setPath(getPath());
        };

        window.addEventListener("popstate", handleNavigation);
        window.addEventListener("navigate", handleNavigation);

        return () => {
            window.removeEventListener("popstate", handleNavigation);
            window.removeEventListener("navigate", handleNavigation);
        };
    }, []);

    // Navigation function
    const navigate = (to) => {
        window.history.pushState({}, "", `/recruitment-system${to}`);
        window.dispatchEvent(new Event("navigate"));
    };

    // HOME
    if (path === "/") {
        return <Home navigate={navigate} />;
    }

    // HR DASHBOARD
    if (path === "/hr-dashboard") {
        const user = JSON.parse(localStorage.getItem("user") || "null");

        if (user?.role !== "HR Manager") {
            navigate("/hr-login");
            return null;
        }

        return <HRDashboard navigate={navigate} />;
    }

    // HR LOGIN
    if (path === "/hr-login") {
        return <Login navigate={navigate} />;
    }

    // HR REGISTER
    if (path === "/register-hr") {
        return <Register accountType="hr" navigate={navigate} />;
    }

    // CANDIDATE LOGIN
    if (path === "/candidate-login") {
        return <CandidateLogin navigate={navigate} />;
    }

    // CANDIDATE REGISTER
    if (path === "/register-candidate") {
        return <Register accountType="candidate" navigate={navigate} />;
    }

    // CANDIDATE DASHBOARD
    if (path === "/candidate-dashboard") {
        const user = JSON.parse(
            localStorage.getItem("candidate_user") || "null"
        );

        if (user?.role !== "Candidate" || !user?.candidate_id) {
            navigate("/candidate-login");
            return null;
        }

        return <CandidateDashboard navigate={navigate} />;
    }

    return <Home navigate={navigate} />;
}

export default App;