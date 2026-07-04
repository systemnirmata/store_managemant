import { useState } from "react";
import api from "../api/api";
import { Link, useNavigate } from "react-router-dom";
import "./auth.css";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const loginAdmin = async (e) => {
    e.preventDefault();

    try {
      const response = await api.post("/admin/login", {
  username: username,
  password: password,
});
     sessionStorage.setItem("token", response.data.token);
    sessionStorage.setItem("admin", JSON.stringify(response.data.admin));

      navigate("/Dashboard");

    } catch (err) {
      alert(err?.response?.data?.detail || "Login Failed");
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-shell" aria-label="Admin login">
        <div className="auth-panel">
          <div className="auth-brand">
            <span className="auth-brand-mark">SS</span>
            <span>Smart Shop</span>
          </div>

          <div className="auth-panel-copy">
            <p className="auth-kicker">Store command center</p>
            <h1>Run billing, stock, and accounts from one clean desk.</h1>
            <p>
              Secure admin access for daily store operations, inventory checks,
              and customer billing.
            </p>
          </div>

          <div className="auth-stats" aria-label="Store management highlights">
            <div>
              <strong>Live</strong>
              <span>Inventory</span>
            </div>
            <div>
              <strong>Fast</strong>
              <span>Billing</span>
            </div>
            <div>
              <strong>Secure</strong>
              <span>Admin</span>
            </div>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-header">
            <p className="auth-kicker">Welcome back</p>
            <h2>Login to your account</h2>
            <p>Enter your admin credentials to continue.</p>
          </div>

          <form className="auth-form" onSubmit={loginAdmin}>
            <label>
              <span>UserName</span>
              <input
                type="text"
                placeholder="UserName"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </label>

            <label>
              <span>Password</span>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            <button type="submit" className="auth-submit">
              Login
            </button>
          </form>

          <p className="auth-switch">
            New to Smart Shop? <Link to="/signup">Create an account</Link>
          </p>
        </div>
      </section>
    </div>
  );
}

export default Login;