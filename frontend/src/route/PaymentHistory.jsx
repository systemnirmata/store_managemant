import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import Header from "../components/Hader";
import Footer from "../components/Footer";

function PaymentHistory() {
  const navigate = useNavigate();
  const [customers, setCustomers]     = useState([]);
  const [selectedCid, setSelectedCid] = useState(null);
  const [selectedName, setSelectedName] = useState("");
  const [history, setHistory]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [histLoading, setHistLoading] = useState(false);

  useEffect(() => { loadCustomers(); }, []);

  async function loadCustomers() {
    try {
      setLoading(true);
      const res = await api.get("/history/get_all");
      setCustomers(res.data || []);
    } catch {
      alert("Failed to load history");
    } finally { setLoading(false); }
  }

  async function openHistory(cid, cname) {
    setSelectedCid(cid);
    setSelectedName(cname);
    setHistory([]);
    setHistLoading(true);
    try {
      const res = await api.get(`/history/get_customer/${cid}`);
      setHistory(res.data || []);
    } catch {
      alert("Failed to load customer history");
    } finally { setHistLoading(false); }
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f1f5f9" }}>
      <Header />
      <main style={{ maxWidth: "1000px", margin: "0 auto", padding: "24px 16px" }}>

        {/* Top */}
        <div style={{ display: "flex", alignItems: "center",
          gap: "14px", marginBottom: "24px" }}>
          <button onClick={() => navigate("/accounts")} style={{
            backgroundColor: "#f1f5f9", color: "#1e3a5f", border: "none",
            borderRadius: "8px", padding: "8px 14px",
            cursor: "pointer", fontWeight: "700", fontSize: "13px"
          }}>← Back</button>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: "800",
              color: "#1e3a5f", margin: 0 }}>Payment History</h1>
            <p style={{ color: "#64748b", margin: "2px 0 0", fontSize: "13px" }}>
              Permanent cleared bill records
            </p>
          </div>
        </div>

        {/* Customer Cards */}
        {loading ? (
          <p style={{ textAlign: "center", color: "#64748b" }}>Loading...</p>
        ) : customers.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8",
            padding: "60px", backgroundColor: "white", borderRadius: "12px" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>📭</div>
            <div style={{ fontWeight: "700", fontSize: "16px" }}>No history yet</div>
            <div style={{ fontSize: "13px", marginTop: "6px" }}>
              History is saved when you delete a month from Accounts page
            </div>
          </div>
        ) : (
          <>
            {/* Customer selector cards */}
            <div style={{ display: "flex", flexWrap: "wrap",
              gap: "12px", marginBottom: "24px" }}>
              {customers.map(c => (
                <div key={c.cid}
                  onClick={() => openHistory(c.cid, c.cname)}
                  style={{
                    backgroundColor: selectedCid === c.cid ? "#1e3a5f" : "white",
                    color: selectedCid === c.cid ? "white" : "#1e3a5f",
                    border: `2px solid ${selectedCid === c.cid ? "#1e3a5f" : "#e2e8f0"}`,
                    borderRadius: "10px", padding: "14px 20px",
                    cursor: "pointer", minWidth: "140px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    textAlign: "center"
                  }}>
                  <div style={{
                    width: "44px", height: "44px", borderRadius: "50%",
                    backgroundColor: selectedCid === c.cid
                      ? "rgba(255,255,255,0.2)" : "#eff6ff",
                    display: "flex", alignItems: "center",
                    justifyContent: "center", margin: "0 auto 8px",
                    fontSize: "20px", fontWeight: "800",
                    color: selectedCid === c.cid ? "white" : "#1e3a5f"
                  }}>
                    {c.cname.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ fontWeight: "700", fontSize: "13px" }}>{c.cname}</div>
                  <div style={{ fontSize: "11px", marginTop: "2px",
                    opacity: 0.7 }}>{c.cphone}</div>
                </div>
              ))}
            </div>

            {/* History Detail */}
            {selectedCid && (
              <div>
                <h2 style={{ fontSize: "16px", fontWeight: "800",
                  color: "#1e3a5f", marginBottom: "16px" }}>
                  📋 {selectedName}'s Cleared History
                </h2>

                {histLoading ? (
                  <p style={{ textAlign: "center", color: "#64748b" }}>Loading...</p>
                ) : history.length === 0 ? (
                  <p style={{ textAlign: "center", color: "#94a3b8" }}>
                    No history found.
                  </p>
                ) : (
                  history.map(month => (
                    <div key={month.month_key} style={{
                      border: "1px solid #e2e8f0", borderRadius: "12px",
                      marginBottom: "16px", overflow: "hidden"
                    }}>
                      {/* Month Header */}
                      <div style={{
                        backgroundColor: "#1e3a5f", padding: "12px 16px",
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontWeight: "800", color: "white", fontSize: "15px" }}>
                            📅 {month.month_label}
                          </span>
                          <span style={{
                            backgroundColor: "rgba(255,255,255,0.15)", color: "#93c5fd",
                            fontSize: "11px", fontWeight: "700",
                            padding: "2px 8px", borderRadius: "20px"
                          }}>{month.bills.length} bills</span>
                          <span style={{
                            backgroundColor: "#15803d", color: "white",
                            fontSize: "10px", fontWeight: "700",
                            padding: "2px 8px", borderRadius: "20px"
                          }}>✅ Cleared</span>
                        </div>
                        <span style={{ fontWeight: "800", color: "#fcd34d", fontSize: "15px" }}>
                          Rs {month.month_total.toFixed(2)}
                        </span>
                      </div>

                      {/* Bills */}
                      {month.bills.map((bill, billIdx) => {
                        const billDate = new Date(bill.created_at)
                          .toLocaleDateString("en-IN", {
                            day: "2-digit", month: "short"
                          });
                        return (
                          <div key={bill.bid} style={{
                            borderBottom: billIdx < month.bills.length - 1
                              ? "1px solid #f1f5f9" : "none"
                          }}>
                            <div style={{
                              display: "flex", justifyContent: "space-between",
                              alignItems: "center", padding: "10px 16px",
                              backgroundColor: "#f8fafc", flexWrap: "wrap", gap: "8px"
                            }}>
                              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                <span style={{
                                  width: "22px", height: "22px", borderRadius: "50%",
                                  backgroundColor: "#1e3a5f", color: "white",
                                  fontSize: "10px", fontWeight: "700",
                                  display: "flex", alignItems: "center", justifyContent: "center"
                                }}>{billIdx + 1}</span>
                                <span style={{ fontWeight: "700", color: "#1e3a5f",
                                  fontSize: "13px" }}>Bill #{bill.bid}</span>
                                <span style={{ fontSize: "12px", color: "#64748b" }}>
                                  {billDate}
                                </span>
                              </div>
                              <span style={{ fontWeight: "800", color: "#1e3a5f",
                                fontSize: "14px" }}>
                                Rs {bill.bill_total.toFixed(2)}
                              </span>
                            </div>
                            <div style={{ padding: "8px 16px 8px 48px" }}>
                              {bill.items.map((item, i) => (
                                <div key={i} style={{
                                  display: "flex", justifyContent: "space-between",
                                  fontSize: "12px", padding: "3px 0",
                                  borderBottom: "1px solid #f8fafc", color: "#64748b"
                                }}>
                                  <span>{item.product_name} x{item.quantity}</span>
                                  <span style={{ fontWeight: "600", color: "#475569" }}>
                                    Rs {item.subtotal.toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      {/* Month Footer */}
                      <div style={{
                        backgroundColor: "#f0fdf4", padding: "10px 16px",
                        borderTop: "1px solid #bbf7d0",
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <span style={{ fontWeight: "700", color: "#15803d", fontSize: "13px" }}>
                          ✅ Cleared Total: Rs {month.month_total.toFixed(2)}
                        </span>
                        <span style={{ fontSize: "12px", color: "#64748b" }}>
                          {month.bills.length} bills cleared
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default PaymentHistory;