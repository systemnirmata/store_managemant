import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Billing from "./route/Billing";
import Accounts from "./route/accounts";
import Products from "./route/products";
import Categories from "./route/Categories";
import Login from "./auth/Login";
import Signup from "./auth/Signup";
import Dashboard from "./route/Dashboard";
import VerifyOtp from "./auth/VerifyOtp";
import PaymentHistory from "./route/PaymentHistory";
import AddCustomer from "./route/AddCustomer";

// ✅ ProtectedRoute — redirects to /login if no token
function ProtectedRoute({ children }) {
  const token = sessionStorage.getItem("token");  // ← changed
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Public Routes (no login needed) ── */}
        <Route path="/"           element={<Login />} />
        <Route path="/login"      element={<Login />} />
        <Route path="/signup"     element={<Signup />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />

        {/* ── Protected Routes (login required) ── */}
        <Route path="/Dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/billing" element={
          <ProtectedRoute><Billing /></ProtectedRoute>
        } />
        <Route path="/accounts" element={
          <ProtectedRoute><Accounts /></ProtectedRoute>
        } />
        <Route path="/AddCustomer" element={
          <ProtectedRoute><AddCustomer /></ProtectedRoute>
        } />
        <Route path="/products" element={
          <ProtectedRoute><Products /></ProtectedRoute>
        } />
        <Route path="/categories" element={
          <ProtectedRoute><Categories /></ProtectedRoute>
        } />
        <Route path="/PaymentHistory/:cid" element={
          <ProtectedRoute><PaymentHistory /></ProtectedRoute>
        } />

      </Routes>
    </BrowserRouter>
  );
}

export default App;