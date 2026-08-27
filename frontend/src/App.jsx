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

    useEffect(() => {
        const handlePopState = () => {
            setPath(getPath());
        };

        window.addEventListener("popstate", handlePopState);

        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, []);

    // HOME
    if (path === "/") {
        return <Home />;
    }

    // HR DASHBOARD
    if (path === "/hr-dashboard") {
        const user = JSON.parse(localStorage.getItem("user") || "null");

        if (user?.role !== "HR Manager") {
            window.location.replace("/recruitment-system/hr-login");
            return null;
        }

        return <HRDashboard />;
    }

    // HR LOGIN
    if (path === "/hr-login") {
        return <Login />;
    }

    // HR REGISTER
    if (path === "/register-hr") {
        return <Register accountType="hr" />;
    }

    // CANDIDATE LOGIN
    if (path === "/candidate-login") {
        return <CandidateLogin />;
    }

    // CANDIDATE REGISTER
    if (path === "/register-candidate") {
        return <Register accountType="candidate" />;
    }

    // CANDIDATE DASHBOARD
    if (path === "/candidate-dashboard") {
        const user = JSON.parse(
            localStorage.getItem("candidate_user") || "null"
        );

        if (user?.role !== "Candidate" || !user?.candidate_id) {
            window.location.replace(
                "/recruitment-system/candidate-login"
            );
            return null;
        }

        return <CandidateDashboard />;
    }

    return <Home />;
}

export default App;