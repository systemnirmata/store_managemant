import { useState } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";

function VerifyOtp() {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const verifyOtp = async () => {
    if (otp.length !== 6) {
      alert("Please enter a 6 digit OTP");
      return;
    }

    try {
      setLoading(true);
      const email = sessionStorage.getItem("email");

      await api.post("/admin/verify_signup_otp", {
        email,
        otp_code: otp,
      });

      sessionStorage.removeItem("email");
      alert("Account Created Successfully! Please login.");
      navigate("/");

    } catch (error) {
      alert(error?.response?.data?.detail || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    try {
const email = sessionStorage.getItem("email");
      await api.post("/admin/send-otp", { email });
      alert("New OTP sent to your email.");
    } catch (error) {
      alert(error?.response?.data?.detail || "Failed to resend OTP.");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Verify Your Email</h2>
        <p style={styles.subtitle}>
          Enter the 6-digit OTP sent to your email
        </p>

        <input
          type="text"
          placeholder="Enter 6-digit OTP"
          value={otp}
          maxLength={6}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          style={styles.input}
        />

        <button
          onClick={verifyOtp}
          disabled={loading}
          style={styles.button}
        >
          {loading ? "Verifying..." : "Verify OTP"}
        </button>

        <button
          onClick={resendOtp}
          style={styles.resendButton}
        >
          Resend OTP
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
  },
  card: {
    backgroundColor: "#ffffff",
    padding: "40px",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    width: "100%",
    maxWidth: "400px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  title: {
    margin: 0,
    fontSize: "24px",
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "center",
  },
  subtitle: {
    margin: 0,
    fontSize: "14px",
    color: "#64748b",
    textAlign: "center",
  },
  input: {
    padding: "12px 16px",
    fontSize: "20px",
    letterSpacing: "8px",
    textAlign: "center",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  button: {
    padding: "12px",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: "600",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    width: "100%",
  },
  resendButton: {
    padding: "10px",
    backgroundColor: "transparent",
    color: "#2563eb",
    fontSize: "14px",
    fontWeight: "500",
    border: "1px solid #2563eb",
    borderRadius: "8px",
    cursor: "pointer",
    width: "100%",
  },
};

export default VerifyOtp;