import { useState } from "react";
import "./CandidateLogin.css";

function CandidateLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();

        setError("");
        setLoading(true);

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/login/candidate`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({
                        email,
                        password,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Invalid email or password."
                );
            }

            // Save authentication token
            localStorage.setItem(
                "auth_token",
                data.token
            );

            // Save logged-in candidate information
            localStorage.setItem(
                "candidate_user",
                JSON.stringify(data.user)
            );

            // Make sure this account belongs to a candidate
            if (data.user.role !== "Candidate" || !data.user.candidate_id) {
                setError(
                    "This account is not registered as a candidate."
                );

                localStorage.removeItem("auth_token");
                localStorage.removeItem("candidate_user");

                return;
            }

            // Login successful → Candidate Dashboard
            window.location.href = "/recruitment-system/candidate-dashboard";

        } catch (error) {
            console.error("Login error:", error);

            setError(
                error.message || "Unable to connect to the server."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="candidate-login-page">

            <div className="candidate-login-container">

                {/* LEFT SIDE */}
                <div className="candidate-login-left">

                    <div className="candidate-login-brand">
                        RECRUITMENT MANAGEMENT
                    </div>

                    <div className="candidate-login-heading">
                        Find the right
                        <br />
                        opportunity.
                    </div>

                    <p className="candidate-login-description">
                        Discover vacancies, apply with your CV,
                        and keep track of your recruitment journey
                        in one place.
                    </p>

                </div>

                {/* RIGHT SIDE */}
                <div className="candidate-login-right">

                    <div className="candidate-login-form-wrapper">

                        <div className="candidate-login-welcome">
                            WELCOME BACK
                        </div>

                        <h1>Sign in</h1>

                        <p className="candidate-login-subtitle">
                            Access your candidate account and
                            continue your application journey.
                        </p>

                        <form onSubmit={handleLogin}>

                            {/* EMAIL */}
                            <div className="candidate-input-group">

                                <label htmlFor="email">
                                    Email
                                </label>

                                <input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) =>
                                        setEmail(e.target.value)
                                    }
                                    required
                                />

                            </div>

                            {/* PASSWORD */}
                            <div className="candidate-input-group">

                                <div className="candidate-password-header">

                                    <label htmlFor="password">
                                        Password
                                    </label>

                                    <button
                                        type="button"
                                        className="forgot-password"
                                        onClick={() =>
                                            alert(
                                                "Password reset will be added later."
                                            )
                                        }
                                    >
                                        Forgot password?
                                    </button>

                                </div>

                                <input
                                    id="password"
                                    type="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    required
                                />

                            </div>

                            {/* ERROR */}
                            {error && (
                                <div className="candidate-login-error">
                                    {error}
                                </div>
                            )}

                            {/* LOGIN BUTTON */}
                            <button
                                type="submit"
                                className="candidate-login-button"
                                disabled={loading}
                            >
                                {loading
                                    ? "Signing in..."
                                    : "Sign In"}
                            </button>

                        </form>

                        {/* REGISTER */}
                        <div className="candidate-register-text">

                            Don't have an account?

                            <button
                                type="button"
                                onClick={() =>
                                    window.location.href =
                                        "/recruitment-system/register-candidate"
                                }
                            >
                                Create account
                            </button>

                        </div>

                    </div>

                </div>

            </div>

        </div>
    );
}

export default CandidateLogin;