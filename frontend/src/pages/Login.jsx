import { useState } from "react";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();

        setError("");
        setLoading(true);

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/login/hr`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || "Login failed.");
                return;
            }

            // Store the authentication token
            localStorage.setItem("token", data.token);

            // Store logged-in user information
            localStorage.setItem("user", JSON.stringify(data.user));

            console.log("Logged in user:", data.user);

            // Temporary redirect
            if (data.user.role === "HR Manager") {
                window.location.href = "/hr-dashboard";
            } else {
                window.location.href = "/";
            }

        } catch (error) {
            console.error(error);
            setError("Unable to connect to the server.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">

            {/* Animated background */}
            <div className="login-background">
                <div className="orb orb-one"></div>
                <div className="orb orb-two"></div>
                <div className="orb orb-three"></div>
            </div>

            {/* Glass container */}
            <div className="login-container">

                {/* Left visual section */}
                <div className="login-visual">
                    <div className="visual-overlay"></div>

                    <div className="visual-content">
                        <p className="visual-label">
                            RECRUITMENT MANAGEMENT
                        </p>

                        <h2>
                            Find the right
                            <br />
                            people.
                        </h2>

                        <p>
                            Keep candidates, feedback and recruitment
                            decisions organised in one place.
                        </p>
                    </div>
                </div>

                {/* Right login section */}
                <div className="login-form-section">

                    <div className="login-form-wrapper">

                        <p className="eyebrow">
                            WELCOME BACK
                        </p>

                        <h1>
                            Sign in
                        </h1>

                        <p className="login-description">
                            Access your recruitment workspace and continue
                            managing your candidates.
                        </p>

                        <form onSubmit={handleLogin}>

                            <div className="input-group">
                                <label htmlFor="email">
                                    Work email
                                </label>

                                <input
                                    id="email"
                                    type="email"
                                    placeholder="you@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <div className="password-header">
                                    <label htmlFor="password">
                                        Password
                                    </label>

                                    <button
                                        type="button"
                                        className="forgot-password"
                                    >
                                        Forgot password?
                                    </button>
                                </div>

                                <input
                                    id="password"
                                    type="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            {error && (
                                <div className="login-error">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="login-button"
                                disabled={loading}
                            >
                                {loading ? "Signing in..." : "Sign In"}
                            </button>

                        </form>

                        <div className="login-footer">
                            <span>Don't have an account?</span>
                            <button type="button" onClick={() => window.location.href = "/register-hr"}>
                                Create account
                            </button>
                        </div>

                    </div>

                </div>

            </div>
        </div>
    );
}

export default Login;