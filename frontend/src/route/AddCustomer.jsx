import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { isAllowedName, isValidEmail, isValidPhone } from "../utils/validation";
import Header from "../components/Hader";
import Footer from "../components/Footer";
import "../style/addCustomer.css";

function AddCustomer() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    cname: "",
    cphone: "",
    cmail: "",
    currently_due_amount: 0,
    last_paid_amount: 0,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "cphone") {
      // Allow only numbers and max 10 digits
      if (value === "" || (/^\d+$/.test(value) && value.length <= 10)) {
        setForm((prev) => ({ ...prev, [name]: value }));
      }
    } else if (name === "currently_due_amount" || name === "last_paid_amount") {
      // Allow only positive numbers
      const numValue = parseFloat(value) || 0;
      if (numValue >= 0) {
        setForm((prev) => ({ ...prev, [name]: numValue }));
      }
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = () => {
    setError("");
    
    if (!form.cname.trim()) {
      setError("Customer name is required");
      return false;
    }
    if (!isAllowedName(form.cname)) {
      setError("Customer name must contain letters and may include numbers/spaces, but cannot be only numbers or special symbols.");
      return false;
    }
    
    if (!isValidPhone(form.cphone)) {
      setError("Phone number is required and must be 10 digits");
      return false;
    }
    
    if (!form.cmail.trim()) {
      setError("Email is required");
      return false;
    }
    
    if (!isValidEmail(form.cmail)) {
      setError("Please enter a valid email");
      return false;
    }
    
    if (form.currently_due_amount < 0) {
      setError("Currently due amount cannot be negative");
      return false;
    }
    
    if (form.last_paid_amount < 0) {
      setError("Last paid amount cannot be negative");
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      const response = await api.post("/customer/create_customer", {
        cname: form.cname.trim(),
        cphone: form.cphone,
        cmail: form.cmail.trim(),
        currently_due_amount: form.currently_due_amount,
        last_paid_amount: form.last_paid_amount,
      });
      
      setSuccess("✅ Customer added successfully!");
      
      // Reset form
      setForm({
        cname: "",
        cphone: "",
        cmail: "",
        currently_due_amount: 0,
        last_paid_amount: 0,
      });
      
      // Redirect to accounts page after 2 seconds
      setTimeout(() => {
        navigate("/accounts");
      }, 2000);
    } catch (err) {
      const errorMsg = err?.response?.data?.detail || err?.message || "Failed to add customer";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/accounts");
  };

  return (
    <div className="add-customer-page">
      <Header />
      
      <div className="add-customer-container">
        {/* Header Section */}
        <div className="add-customer-header">
          <div>
            <h2>Add New Customer</h2>
            <p>Create a new customer account</p>
          </div>
        </div>

        {/* Form Section */}
        <div className="add-customer-form-wrapper">
          <form onSubmit={handleSubmit} className="add-customer-form">
            
            {/* Error Message */}
            {error && (
              <div className="alert alert-error">
                <span>❌ {error}</span>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="alert alert-success">
                <span>{success}</span>
              </div>
            )}

            {/* Form Group - Customer Name */}
            <div className="form-group">
              <label htmlFor="cname" className="form-label">
                Customer Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="cname"
                name="cname"
                value={form.cname}
                onChange={handleChange}
                placeholder="Enter customer name"
                className="form-input"
                disabled={loading}
                required
              />
            </div>

            {/* Form Group - Phone Number */}
            <div className="form-group">
              <label htmlFor="cphone" className="form-label">
                Phone Number <span className="required">*</span>
              </label>
              <input
                type="text"
                id="cphone"
                name="cphone"
                value={form.cphone}
                onChange={handleChange}
                placeholder="10 digit mobile number"
                className="form-input"
                disabled={loading}
                maxLength="10"
                required
              />
              <small className="form-help">Enter a valid 10-digit phone number</small>
            </div>

            {/* Form Group - Email */}
            <div className="form-group">
              <label htmlFor="cmail" className="form-label">
                Email Address <span className="required">*</span>
              </label>
              <input
                type="email"
                id="cmail"
                name="cmail"
                value={form.cmail}
                onChange={handleChange}
                placeholder="customer@example.com"
                className="form-input"
                disabled={loading}
                required
              />
            </div>

            {/* Form Group - Currently Due Amount */}
            <div className="form-group">
              <label htmlFor="currently_due_amount" className="form-label">
                Currently Due Amount (₹)
              </label>
              <input
                type="number"
                id="currently_due_amount"
                name="currently_due_amount"
                value={form.currently_due_amount}
                onChange={handleChange}
                placeholder="0"
                className="form-input"
                disabled={loading}
                min="0"
                step="0.01"
              />
              <small className="form-help">Initial credit/due amount for this customer</small>
            </div>

            {/* Form Group - Last Paid Amount */}
            <div className="form-group">
              <label htmlFor="last_paid_amount" className="form-label">
                Last Paid Amount (₹)
              </label>
              <input
                type="number"
                id="last_paid_amount"
                name="last_paid_amount"
                value={form.last_paid_amount}
                onChange={handleChange}
                placeholder="0"
                className="form-input"
                disabled={loading}
                min="0"
                step="0.01"
              />
              <small className="form-help">Last amount paid by this customer</small>
            </div>

            {/* Form Actions */}
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? "Adding Customer..." : "Add Customer"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default AddCustomer;
