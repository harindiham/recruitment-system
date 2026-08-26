import { useState } from "react";
import "./Register.css";

const passwordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

function Register({ accountType }) {
    const isCandidate = accountType === "candidate";
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        if (!passwordRule.test(password)) {
            setError("Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character.");
            return;
        }
        if (password !== confirmation) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            const endpoint = isCandidate ? "/register-candidate" : "/register-hr";
            const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    password_confirmation: confirmation,
                }),
            });
            const data = await response.json();

            if (!response.ok) {
                const validationError = data.errors?.email?.[0] || data.errors?.password?.[0];
                throw new Error(validationError || data.message || "Unable to create your account.");
            }

            if (isCandidate) {
                localStorage.setItem("auth_token", data.token);
                localStorage.setItem("candidate_user", JSON.stringify(data.user));
                window.location.href = "/candidate-dashboard";
            } else {
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));
                window.location.href = "/hr-dashboard";
            }
        } catch (requestError) {
            setError(requestError.message || "Unable to connect to the server.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-page">
            <div className="register-card">
                <div className="register-intro">
                    <span>HIRETRACK</span>
                    <h1>{isCandidate ? "Start your next opportunity." : "Build your next team."}</h1>
                    <p>{isCandidate ? "Create a candidate account and keep your applications in one place." : "Create an HR account to manage vacancies and candidates."}</p>
                </div>
                <div className="register-form-panel">
                    <button className="register-back" type="button" onClick={() => window.location.href = "/"}>Back to home</button>
                    <p className="register-eyebrow">CREATE {isCandidate ? "CANDIDATE" : "HR"} ACCOUNT</p>
                    <h2>Join HireTrack</h2>
                    <form onSubmit={handleSubmit}>
                        <label>Name<input value={name} onChange={(event) => setName(event.target.value)} required /></label>
                        <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
                        <label>Password<input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
                        <label>Confirm password<input type={showPassword ? "text" : "password"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label>
                        <p className="register-password-hint">At least 8 characters, with uppercase, lowercase, number and special character.</p>
                        <label className="register-toggle"><input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} /> Show password</label>
                        {error && <div className="register-error">{error}</div>}
                        <button className="register-submit" type="submit" disabled={loading}>{loading ? "Creating account..." : "Create account"}</button>
                    </form>
                    <p className="register-login-link">Already registered? <button type="button" onClick={() => window.location.href = isCandidate ? "/candidate-login" : "/hr-login"}>Sign in</button></p>
                </div>
            </div>
        </div>
    );
}

export default Register;
