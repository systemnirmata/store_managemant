import { useState } from "react";
import { isAllowedName, isValidEmail } from "../utils/validation";
import { Link, useNavigate } from "react-router-dom";
import "./auth.css";
import api from "../api/api";


function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const registerAdmin = async (e) => {
    e.preventDefault();
    if (!isAllowedName(username)) {
      alert("Username must contain letters and may include numbers/spaces, but cannot be only numbers or special symbols.");
      return;
    }
    if (!isValidEmail(email)) {
      alert("Please enter a valid email address");
      return;
    }
    if (!password || password.length < 6) {
      alert("Password must be at least 6 characters long");
      return;
    }

    try {
      setLoading(true);
      await api.post("/admin/create_admin", {
        username,
        email,
        password,
      });

sessionStorage.setItem("email", email);

      alert("OTP sent to your email. Please verify.");
      navigate("/verify-otp");

    } catch (error) {
      alert(error?.response?.data?.detail || "Signup Failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-shell auth-shell-reverse" aria-label="Admin signup">
        <div className="auth-panel">
          <div className="auth-brand">
            <span className="auth-brand-mark">SS</span>
            <span>Smart Shop</span>
          </div>

          <div className="auth-panel-copy">
            <p className="auth-kicker">Start managing smarter</p>
            <h1>Create your admin workspace in minutes.</h1>
            <p>
              Sign up to manage products, accounts, billing, and day-to-day
              shop activity from a focused dashboard.
            </p>
          </div>

          <div className="auth-checklist">
            <span>OTP email verification</span>
            <span>Admin-only dashboard access</span>
            <span>Built for everyday store work</span>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-header">
            <p className="auth-kicker">Create account</p>
            <h2>Set up your admin login</h2>
            <p>Your email will be verified with a one-time password.</p>
          </div>

          <form className="auth-form" onSubmit={registerAdmin}>
            <label>
              <span>Username</span>
              <input
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </label>

            <label>
              <span>Email</span>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label>
              <span>Password</span>
              <input
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Creating account..." : "Sign up"}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/">Login here</Link>
          </p>
        </div>
      </section>
    </div>
  );
}

export default Signup;
