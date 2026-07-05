import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import "../style/dashboard.css";
import Header from "../components/Hader";
import Footer from "../components/Footer";

function Dashboard() {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      setError("");
      const [billRes, customerRes] = await Promise.all([
        api.get("/bill/get_all_bills"),
        api.get("/customer/get_all_customer"),
      ]);
      setBills(billRes.data || []);
      setCustomers(customerRes.data || []);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  const totalDue = useMemo(
    () =>
      customers.reduce(
        (sum, customer) => sum + Number(customer.currently_due_amount || 0),
        0
      ),
    [customers]
  );

  const totalBillValue = useMemo(
    () => bills.reduce((sum, bill) => sum + Number(bill.total_amount || 0), 0),
    [bills]
  );

  const viewBill = async (billId) => {
    try {
      setDetailLoading(true);
      const res = await api.get(`/bill/get_bill/${billId}`);
      setSelectedBill(res.data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to load bill");
    } finally {
      setDetailLoading(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleString();
  };

  return (
    <div className="dashboard">
      <Header />

      <main className="dashboard-shell">
        <section className="dashboard-hero">
          <div>
            <h1>Dashboard</h1>
            <p>Fast billing, clean customer tracking, and live shop totals.</p>
          </div>
          <button className="refresh-btn" onClick={loadDashboardData}>
            Refresh
          </button>
        </section>

        <section className="dashboard-buttons">
          <button className="dashboard-btn bill" onClick={() => navigate("/billing")}>
            <span>Bill</span>
            <b>Create invoice</b>
          </button>

          <button className="dashboard-btn account" onClick={() => navigate("/accounts")}>
            <span>Account</span>
            <b>Owner tools</b>
          </button>

          <button className="dashboard-btn product" onClick={() => navigate("/products")}>
            <span>Add Product</span>
            <b>Manage stock</b>
          </button>

          <button className="dashboard-btn category" onClick={() => navigate("/categories")}>
            <span>Categories</span>
            <b>Organize items</b>
          </button>
        </section>

        <section className="dashboard-stats">
          <div className="stat-card">
            <h3>Total Bills</h3>
            <p>{bills.length}</p>
          </div>
          <div className="stat-card">
            <h3>Bill Value</h3>
            <p>Rs {totalBillValue.toFixed(2)}</p>
          </div>
          <div className="stat-card">
            <h3>Customers</h3>
            <p>{customers.length}</p>
          </div>
          <div className="stat-card">
            <h3>Pending Amount</h3>
            <p>Rs {totalDue.toFixed(2)}</p>
          </div>
        </section>

        <section className="records-section">
          {error && <div className="dashboard-error">{error}</div>}

          <div className="records-layout">
            <div className="records-table-wrap">
              {loading ? (
                <div className="empty-record">Loading records...</div>
              ) : (
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>Bill ID</th>
                      <th>Customer ID</th>
                      <th>Total</th>
                      <th>Created</th>
                      <th>View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map((bill) => (
                      <tr key={bill.bid}>
                        <td>#{bill.bid}</td>
                        <td>{bill.cid}</td>
                        <td>Rs {Number(bill.total_amount || 0).toFixed(2)}</td>
                        <td>{formatDate(bill.created_at)}</td>
                        <td>
                          <button className="eye-btn" onClick={() => viewBill(bill.bid)}>
                            Eye
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <aside className="detail-panel">
              {detailLoading ? (
                <div className="empty-record">Opening details...</div>
              ) : selectedBill ? (
                <>
                  <span className="panel-label">Bill Detail</span>
                  <h2>Bill #{selectedBill.bid}</h2>
                  <dl>
                    <div>
                      <dt>Customer</dt>
                      <dd>{selectedBill.cname}</dd>
                    </div>
                    <div>
                      <dt>Customer ID</dt>
                      <dd>{selectedBill.cid}</dd>
                    </div>
                    <div>
                      <dt>Total</dt>
                      <dd>Rs {Number(selectedBill.total_amount || 0).toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt>Created</dt>
                      <dd>{formatDate(selectedBill.created_at)}</dd>
                    </div>
                  </dl>
                </>
              ) : (
                <div className="empty-record">
                  Click an Eye button to open the selected record.
                </div>
              )}
            </aside>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Dashboard;
