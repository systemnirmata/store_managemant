import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import Header from "../components/Hader";
import Footer from "../components/Footer";
import "../style/accounts.css";


function Accounts() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCid, setSelectedCid] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  // ── MISSING STATES (now fixed) ─────────────────────────────
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ cname: "", cphone: "", cmail: "" });
  const [addLoading, setAddLoading] = useState(false);
  const [filterType, setFilterType] = useState("default");

  useEffect(() => { loadCustomers(); }, []);

  async function loadCustomers(type = filterType) {
    try {
      setLoading(true);
      if (type === "monthly") {
        const res = await api.get("/customer/get_monthly_customers");
        setCustomers(res.data || []);
      } else {
        const res = await api.get("/customer/get_all_customer");
        if (type === "cash") {
          setCustomers((res.data || []).filter(c => c.cname === "Cash Customer"));
        } else {
          // default: keep previous behaviour (hide Cash Customer)
          setCustomers((res.data || []).filter(c => c.cname !== "Cash Customer"));
        }
      }
    } catch {
      setNotice("Failed to load customers");
    } finally { setLoading(false); }
  }

  async function openCustomer(cid) {
    setSelectedCid(cid);
    setCustomerDetail(null);
    setPayAmount("");
    setNotice("");
    try {
      const res = await api.get(`/customer/get_customer/${cid}`);
      setCustomerDetail(res.data);
    } catch {
      setNotice("Failed to load customer details");
    }
  }

  async function handlePayment() {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return alert("Enter valid amount");
    if (amount > customerDetail.Customer.currently_due_amount)
      return alert("Amount exceeds due amount");

    setPayLoading(true);
    try {
      await api.post(`/customer/pay_customer/${selectedCid}`, { amount });
      await openCustomer(selectedCid);
      await loadCustomers();
      setPayAmount("");
      setNotice("✅ Payment recorded successfully!");
    } catch (err) {
      setNotice(err?.response?.data?.detail || "Payment failed");
    } finally { setPayLoading(false); }
  }

  // ── WHATSAPP BILL ─────────────────────────────────────────
const handleWhatsApp = (bill, items) => {
  const c = customerDetail.Customer;
  const date = new Date(bill.created_at).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric"
  });

  const itemLines = items
    .map((item, i) => `${i + 1}. ${item.product_name} x${item.quantity} = Rs.${item.subtotal.toFixed(2)}`)
    .join("\n");

  const msg = [
    `🏪 *GANGADHAR PROVISION STORE*`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `🔖 Bill #${bill.bid}  |  📅 ${date}`,
    `👤 ${c.cname}  |  💳 ${bill.payment_type}`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    itemLines,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `💰 *Total : Rs.${bill.total_amount.toFixed(2)}*`,
    `🔴 Due   : Rs.${c.currently_due_amount.toFixed(2)}`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `🙏 Gangadhar Provision Store`,
  ].join("\n");

  const phone = c.cphone ? `91${c.cphone}` : "";
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
};
  // ── PDF DOWNLOAD ──────────────────────────────────────────
  const handlePDF = async (bill, items) => {
    const c = customerDetail.Customer;
    try {
      const res = await api.post("/bill/generate_pdf", {
        bill_data: {
          bid: bill.bid,
          cname: c.cname,
          phone: c.cphone || "",
          total_amount: bill.total_amount.toFixed(2),
          payment_type: bill.payment_type,
          created_at: new Date(bill.created_at).toLocaleDateString("en-IN"),
        },
        items: items.map(i => ({
          product_name: i.product_name,
          quantity: i.quantity,
          unit_price: i.unit_price.toFixed(2),
          subtotal: i.subtotal.toFixed(2),
        }))
      }, { responseType: "blob" });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.setAttribute("download", `Bill_${bill.bid}.pdf`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Failed to generate PDF");
    }
  };

  // ── MONTHLY STATEMENT WHATSAPP ────────────────────────────
const handleMonthlyWhatsApp = (key, monthData) => {
  const c = customerDetail.Customer;
  const { label, bills, total } = monthData;

  const billSummary = bills.map((bill, idx) => {
    const date = new Date(bill.created_at).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short"
    });
    return `${idx + 1}. Bill #${bill.bid} — ${date} — *Rs.${bill.total_amount.toFixed(2)}*`;
  }).join("\n");

  const msg = [
    `🏪 *GANGADHAR PROVISION STORE*`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `📊 *${label} Statement*`,
    `👤 ${c.cname}  |  📞 ${c.cphone}`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    billSummary,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `📦 Total Bills  : ${bills.length}`,
    `💰 Month Total  : *Rs.${total.toFixed(2)}*`,
    `🔴 Total Due    : *Rs.${c.currently_due_amount.toFixed(2)}*`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `🙏 Please clear dues.`,
    `📍 Gangadhar Provision Store`,
  ].join("\n");

  const phone = c.cphone ? `91${c.cphone}` : "";
  window.open(
    `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
    "_blank",
    "noopener,noreferrer"
  );
};
  // ── MONTHLY PDF ───────────────────────────────────────────
  const handleMonthlyPDF = async (key, monthData) => {
    const c = customerDetail.Customer;
    const { label, bills, total } = monthData;

    const allItems = [];
    bills.forEach(bill => {
      const date = new Date(bill.created_at).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short"
      });
      allItems.push({
        product_name: `── Bill #${bill.bid}  (${date}) ──`,
        quantity: "", unit_price: "", subtotal: "", is_header: true
      });
      const billItems = customerDetail.BillItems.filter(i => i.bid === bill.bid);
      billItems.forEach(item => {
        allItems.push({
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price.toFixed(2),
          subtotal: item.subtotal.toFixed(2),
        });
      });
      allItems.push({
        product_name: `Bill #${bill.bid} Total`,
        quantity: "", unit_price: "",
        subtotal: bill.total_amount.toFixed(2),
        is_total: true
      });
    });

    try {
      const res = await api.post("/bill/generate_monthly_pdf", {
        customer: {
          cname: c.cname, cphone: c.cphone, cmail: c.cmail || "",
          currently_due_amount: c.currently_due_amount.toFixed(2),
          last_paid_amount: c.last_paid_amount.toFixed(2),
        },
        bills, all_items: allItems,
        grand_total: total.toFixed(2),
        generated_date: label,
        total_bills: bills.length
      }, { responseType: "blob" });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.setAttribute("download", `Statement_${c.cname}_${label}.pdf`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Failed to generate PDF");
    }
  };

  const handleDeleteMonth = async (key, label) => {
    const confirm1 = window.confirm(
      `⚠️ Delete ALL bills for ${label}?\n\nThis will permanently remove all entries and reduce the due amount.`
    );
    if (!confirm1) return;

    try {
      await api.post(`/customer/delete_month_bills/${selectedCid}`, { month_key: key });
      await openCustomer(selectedCid);
      await loadCustomers();
      setNotice(`✅ ${label} bills deleted successfully.`);
    } catch (err) {
      alert("Failed to delete: " + (err?.response?.data?.detail || err.message));
    }
  };

  async function handleAddCustomer() {
    if (!newCustomer.cname.trim()) return alert("Enter customer name");
    if (newCustomer.cphone.length < 10) return alert("Enter valid 10 digit phone");

    setAddLoading(true);
    try {
      await api.post("/customer/create_customer", {
        cname: newCustomer.cname,
        cphone: newCustomer.cphone,
        cmail: newCustomer.cmail,
        currently_due_amount: 0,
        last_paid_amount: 0
      });
      await loadCustomers();
      setShowAddForm(false);
      setNewCustomer({ cname: "", cphone: "", cmail: "" });
      setNotice("✅ Customer added successfully!");
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to add customer");
    } finally { setAddLoading(false); }
  }

  // ── STATS ─────────────────────────────────────────────────
  const totalDue = customers.reduce((s, c) => s + (c.currently_due_amount || 0), 0);
  const totalPaid = customers.reduce((s, c) => s + (c.last_paid_amount || 0), 0);

  const filtered = customers.filter(c =>
    c.cname.toLowerCase().includes(search.toLowerCase()) ||
    c.cphone.includes(search) ||
    (c.cmail || "").toLowerCase().includes(search.toLowerCase())
  );

  // ── JSX ───────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f1f5f9" }}>
      <Header />

      {/* ── ADD CUSTOMER MODAL (moved to top level) ── */}
      {showAddForm && (
        <div style={{
          position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "white", borderRadius: "14px",
            padding: "28px", width: "100%", maxWidth: "400px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.2)"
          }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800",
              color: "#1e3a5f", margin: "0 0 20px" }}>
              + Add New Customer
            </h2>

            {[
              { label: "Customer Name *", key: "cname", placeholder: "Full name", type: "text" },
              { label: "Phone Number *", key: "cphone", placeholder: "10 digit number", type: "text", maxLength: 10 },
              { label: "Email (optional)", key: "cmail", placeholder: "email@example.com", type: "email" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12px", fontWeight: "700",
                  color: "#64748b", display: "block", marginBottom: "4px" }}>
                  {f.label}
                </label>
                <input
                  type={f.type}
                  placeholder={f.placeholder}
                  maxLength={f.maxLength}
                  value={newCustomer[f.key]}
                  onChange={e => setNewCustomer(prev => ({
                    ...prev,
                    [f.key]: f.key === "cphone"
                      ? e.target.value.replace(/\D/g, "")
                      : e.target.value
                  }))}
                  style={{
                    width: "100%", padding: "9px 12px",
                    border: "1px solid #e2e8f0", borderRadius: "8px",
                    fontSize: "14px", outline: "none", boxSizing: "border-box"
                  }}
                />
              </div>
            ))}

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button onClick={handleAddCustomer} disabled={addLoading} style={{
                flex: 1, padding: "11px 0", backgroundColor: "#1e3a5f",
                color: "white", border: "none", borderRadius: "8px",
                cursor: "pointer", fontWeight: "700", fontSize: "14px"
              }}>
                {addLoading ? "Adding..." : "✓ Add Customer"}
              </button>
              <button onClick={() => {
                setShowAddForm(false);
                setNewCustomer({ cname: "", cphone: "", cmail: "" });
              }} style={{
                flex: 1, padding: "11px 0", backgroundColor: "#f1f5f9",
                color: "#1e3a5f", border: "none", borderRadius: "8px",
                cursor: "pointer", fontWeight: "700", fontSize: "14px"
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 16px" }}>

        {/* Top */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: "24px"
        }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#1e3a5f", margin: 0 }}>
              Accounts
            </h1>
            <p style={{ color: "#64748b", margin: "4px 0 0" }}>
              Customer dues, payments, and bill history in one place.
            </p>
          </div>
          <button onClick={() => setShowAddForm(true)} style={{
            backgroundColor: "#1e3a5f", color: "white", border: "none",
            borderRadius: "8px", padding: "10px 20px",
            fontWeight: "700", fontSize: "14px", cursor: "pointer"
          }}>+ Add Customer</button>
        </div>

        {/* Stats */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3,1fr)",
          gap: "16px", marginBottom: "24px"
        }}>
          {[
            { label: "Customers", value: customers.length, plain: true },
            { label: "Total Due", value: `Rs ${totalDue.toFixed(2)}` },
            { label: "Total Paid", value: `Rs ${totalPaid.toFixed(2)}` },
          ].map((s, i) => (
            <div key={i} style={{
              backgroundColor: "white", borderRadius: "12px",
              padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)"
            }}>
              <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "8px" }}>
                {s.label}
              </div>
              <div style={{
                fontSize: s.plain ? "32px" : "22px",
                fontWeight: "800", color: "#1e3a5f"
              }}>{s.value}</div>
            </div>
          ))}
        </div>

        {notice && (
          <div style={{
            backgroundColor: "#f0fdf4", color: "#15803d",
            padding: "10px 14px", borderRadius: "8px", marginBottom: "16px",
            fontWeight: "600", fontSize: "13px"
          }}>{notice}</div>
        )}

        {/* Customer List */}
{/* Customer List */}
<div style={{
  backgroundColor: "white", borderRadius: "12px",
  padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  marginBottom: "24px"
}}>
  <div style={{
    display: "flex", justifyContent: "space-between",
    alignItems: "center", marginBottom: "16px", gap: "12px",
    flexWrap: "wrap"
  }}>
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#1e3a5f", margin: 0 }}>
        Customer Accounts
      </h2>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {[
          { key: 'default', label: 'All' },
          { key: 'monthly', label: 'Monthly' },
          { key: 'cash', label: 'Cash Customer' }
        ].map(b => (
          <button key={b.key} onClick={() => { setFilterType(b.key); loadCustomers(b.key); }}
            style={{
              padding: "6px 10px", borderRadius: "8px",
              border: filterType === b.key ? 'none' : '1px solid #e2e8f0',
              backgroundColor: filterType === b.key ? '#1e3a5f' : '#f8fafc',
              color: filterType === b.key ? 'white' : '#1e3a5f',
              fontWeight: 700, cursor: 'pointer', fontSize: '12px'
            }}>{b.label}</button>
        ))}
      </div>
    </div>
    <input
      type="text"
      placeholder="Search name, phone, email"
      value={search}
      onChange={e => setSearch(e.target.value)}
      style={{
        padding: "8px 14px", border: "1px solid #e2e8f0",
        borderRadius: "8px", fontSize: "13px",
        width: "100%", maxWidth: "240px",
        outline: "none", boxSizing: "border-box"
      }}
    />
  </div>

  {/* ── Scrollable table wrapper ── */}
  <div style={{
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
    scrollbarWidth: "thin",
    scrollbarColor: "#cbd5e1 transparent"
  }}>
    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
      <thead>
        <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
          {["NAME", "PHONE", "EMAIL", "DUE", "LAST PAID", "ACTION"].map(h => (
            <th key={h} style={{
              padding: "10px 12px", textAlign: "left",
              fontSize: "11px", color: "#64748b",
              fontWeight: "700", letterSpacing: "0.5px",
              whiteSpace: "nowrap"
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filtered.map(c => (
          <tr key={c.cid} style={{ borderBottom: "1px solid #f8fafc" }}>
            <td style={{ padding: "14px 12px", fontWeight: "700", color: "#1e293b" }}>
              {c.cname}
            </td>
            <td style={{ padding: "14px 12px", color: "#475569", whiteSpace: "nowrap" }}>
              {c.cphone}
            </td>
            <td style={{ padding: "14px 12px", color: "#475569" }}>
              {c.cmail || "-"}
            </td>
            <td style={{ padding: "14px 12px", whiteSpace: "nowrap" }}>
              <span style={{
                color: c.currently_due_amount > 0 ? "#dc2626" : "#15803d",
                fontWeight: "700"
              }}>
                Rs {parseFloat(c.currently_due_amount || 0).toFixed(2)}
              </span>
            </td>
            <td style={{ padding: "14px 12px", color: "#475569", whiteSpace: "nowrap" }}>
              Rs {parseFloat(c.last_paid_amount || 0).toFixed(2)}
            </td>
            <td style={{ padding: "14px 12px" }}>
              <button onClick={() => openCustomer(c.cid)} style={{
                backgroundColor: "#1e3a5f", color: "white",
                border: "none", borderRadius: "6px",
                padding: "6px 14px", cursor: "pointer",
                fontSize: "12px", fontWeight: "700",
                whiteSpace: "nowrap"
              }}>👁 View</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>{/* ← close scroll wrapper */}

</div>{/* ← close Customer List card */}
        {/* Customer Detail Panel */}
        {selectedCid && (
          <div style={{
            backgroundColor: "white", borderRadius: "12px",
            padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)"
          }}>
            {!customerDetail ? (
              <p style={{ color: "#64748b", textAlign: "center" }}>Loading...</p>
            ) : (
              <>
                {/* Customer Header */}
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "flex-start", marginBottom: "20px",
                  flexWrap: "wrap", gap: "12px"
                }}>
                  <div>
                    <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#1e3a5f", margin: "0 0 4px" }}>
                      {customerDetail.Customer.cname}
                    </h2>
                    <p style={{ color: "#64748b", margin: "0", fontSize: "13px" }}>
                      📞 {customerDetail.Customer.cphone}
                      {customerDetail.Customer.cmail && ` • 📧 ${customerDetail.Customer.cmail}`}
                    </p>
                  </div>

                  {/* Due + Pay */}
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{
                      backgroundColor: "#fef2f2", padding: "10px 16px",
                      borderRadius: "8px", textAlign: "center"
                    }}>
                      <div style={{ fontSize: "11px", color: "#dc2626", fontWeight: "700" }}>TOTAL DUE</div>
                      <div style={{ fontSize: "18px", fontWeight: "800", color: "#dc2626" }}>
                        Rs {customerDetail.Customer.currently_due_amount.toFixed(2)}
                      </div>
                    </div>
                    <div style={{
                      backgroundColor: "#f0fdf4", padding: "10px 16px",
                      borderRadius: "8px", textAlign: "center"
                    }}>
                      <div style={{ fontSize: "11px", color: "#15803d", fontWeight: "700" }}>LAST PAID</div>
                      <div style={{ fontSize: "18px", fontWeight: "800", color: "#15803d" }}>
                        Rs {customerDetail.Customer.last_paid_amount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Entry */}
                {customerDetail.Customer.currently_due_amount > 0 && (
                  <div style={{
                    backgroundColor: "#fffbeb",
                    border: "1px solid #fcd34d", borderRadius: "10px",
                    padding: "16px", marginBottom: "20px",
                    display: "flex", gap: "10px", alignItems: "center",
                    flexWrap: "wrap"
                  }}>
                    <span style={{ fontWeight: "700", color: "#b45309", fontSize: "13px" }}>
                      💰 Record Payment:
                    </span>
                    <input
                      type="number"
                      placeholder="Enter amount"
                      value={payAmount}
                      onChange={e => setPayAmount(e.target.value)}
                      style={{
                        padding: "8px 12px", border: "1px solid #fcd34d",
                        borderRadius: "6px", fontSize: "13px",
                        width: "160px", outline: "none"
                      }}
                    />
                    <button onClick={handlePayment} disabled={payLoading} style={{
                      backgroundColor: "#b45309", color: "white",
                      border: "none", borderRadius: "6px",
                      padding: "8px 18px", fontWeight: "700",
                      fontSize: "13px", cursor: "pointer"
                    }}>
                      {payLoading ? "Saving..." : "✓ Mark as Paid"}
                    </button>
                    <span style={{ fontSize: "12px", color: "#b45309" }}>
                      Max: Rs {customerDetail.Customer.currently_due_amount.toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Bill History */}
                <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#1e3a5f", marginBottom: "14px" }}>
                  Bill History ({(customerDetail.CustomerBills || []).filter(b => b.payment_type === (customerDetail.Customer.cname === "Cash Customer" ? "Cash" : "Monthly Account")).length || 0} bills)
                </h3>

                {(() => {
                  const isCashCustomer = customerDetail.Customer.cname === "Cash Customer";
                  const billType = isCashCustomer ? "Cash" : "Monthly Account";
                  const monthlyBills = (customerDetail.CustomerBills || []).filter(
                    b => b.payment_type === billType
                  );

                  if (monthlyBills.length === 0) return (
                    <p style={{ color: "#94a3b8", textAlign: "center", padding: "20px" }}>
                      {isCashCustomer ? "No cash bills found." : "No monthly account bills found."}
                    </p>
                  );

                  const grouped = {};
                  monthlyBills.forEach(bill => {
                    const date = new Date(bill.created_at);
                    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
                    const label = date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
                    if (!grouped[key]) grouped[key] = { label, bills: [], total: 0 };
                    grouped[key].bills.push(bill);
                    grouped[key].total += bill.total_amount;
                  });

                  const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

                  return sortedKeys.map(key => {
                    const { label, bills, total } = grouped[key];
                    return (
                      <div key={key} style={{
                        border: "1px solid #e2e8f0", borderRadius: "12px",
                        marginBottom: "16px", overflow: "hidden"
                      }}>
                        {/* Month Header */}
                        <div style={{
                          backgroundColor: "#1e3a5f", padding: "12px 16px",
                          display: "flex", justifyContent: "space-between", alignItems: "center"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ fontSize: "16px" }}>📅</span>
                            <span style={{ fontWeight: "800", color: "white", fontSize: "15px" }}>
                              {label}
                            </span>
                            <span style={{
                              backgroundColor: "rgba(255,255,255,0.15)", color: "#93c5fd",
                              fontSize: "11px", fontWeight: "700",
                              padding: "2px 8px", borderRadius: "20px"
                            }}>{bills.length} bills</span>
                          </div>
                          <span style={{ fontWeight: "800", color: "#fcd34d", fontSize: "15px" }}>
                            Rs {total.toFixed(2)}
                          </span>
                        </div>

                        {/* Bills inside month */}
                        {bills.map((bill, billIdx) => {
                          const billItems = customerDetail.BillItems.filter(i => i.bid === bill.bid);
                          const billDate = new Date(bill.created_at).toLocaleDateString("en-IN", {
                            day: "2-digit", month: "short"
                          });
                          return (
                            <div key={bill.bid} style={{
                              borderBottom: billIdx < bills.length - 1 ? "1px solid #f1f5f9" : "none"
                            }}>
                              <div style={{
                                display: "flex", justifyContent: "space-between",
                                alignItems: "center", padding: "10px 16px",
                                backgroundColor: "#f8fafc", flexWrap: "wrap", gap: "8px"
                              }}>
                                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                  <span style={{
                                    width: "24px", height: "24px", borderRadius: "50%",
                                    backgroundColor: "#1e3a5f", color: "white",
                                    fontSize: "10px", fontWeight: "700",
                                    display: "flex", alignItems: "center", justifyContent: "center"
                                  }}>{billIdx + 1}</span>
                                  <span style={{ fontWeight: "700", color: "#1e3a5f", fontSize: "13px" }}>
                                    Bill #{bill.bid}
                                  </span>
                                  <span style={{ fontSize: "12px", color: "#64748b" }}>{billDate}</span>
                                </div>
                                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                  <span style={{ fontWeight: "800", color: "#1e3a5f", fontSize: "14px" }}>
                                    Rs {bill.total_amount.toFixed(2)}
                                  </span>
                                  <button onClick={() => handleWhatsApp(bill, billItems)} style={{
                                    backgroundColor: "#16a34a", color: "white", border: "none",
                                    borderRadius: "6px", padding: "4px 8px",
                                    cursor: "pointer", fontSize: "11px", fontWeight: "700"
                                  }}>📱</button>
                                  <button onClick={() => handlePDF(bill, billItems)} style={{
                                    backgroundColor: "#dc2626", color: "white", border: "none",
                                    borderRadius: "6px", padding: "4px 8px",
                                    cursor: "pointer", fontSize: "11px", fontWeight: "700"
                                  }}>⬇</button>
                                </div>
                              </div>
                              <div style={{ padding: "8px 16px 8px 52px" }}>
                                {billItems.map((item, i) => (
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
                          backgroundColor: "#fffbeb", padding: "10px 16px",
                          display: "flex", justifyContent: "space-between",
                          alignItems: "center", flexWrap: "wrap", gap: "8px",
                          borderTop: "1px solid #fcd34d"
                        }}>
                          <span style={{ fontWeight: "700", color: "#b45309", fontSize: "13px" }}>
                            Month Total: Rs {total.toFixed(2)}
                          </span>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button onClick={() => handleMonthlyWhatsApp(key, grouped[key])} style={{
                              backgroundColor: "#16a34a", color: "white", border: "none",
                              borderRadius: "6px", padding: "6px 12px",
                              cursor: "pointer", fontSize: "12px", fontWeight: "700"
                            }}>📱 Share {label}</button>
                            <button onClick={() => handleMonthlyPDF(key, grouped[key])} style={{
                              backgroundColor: "#dc2626", color: "white", border: "none",
                              borderRadius: "6px", padding: "6px 12px",
                              cursor: "pointer", fontSize: "12px", fontWeight: "700"
                            }}>⬇ PDF {label}</button>
                            {!isCashCustomer && (
                              <button onClick={() => handleDeleteMonth(key, label)} style={{
                                backgroundColor: "#7f1d1d", color: "white", border: "none",
                                borderRadius: "6px", padding: "6px 12px",
                                cursor: "pointer", fontSize: "12px", fontWeight: "700"
                              }}>🗑 Delete {label}</button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}

                <button onClick={() => navigate(`/PaymentHistory/${selectedCid}`)}
 style={{
                  marginTop: "8px", marginLeft: "8px", padding: "8px 18px",
                  backgroundColor: "#1e3a5f", color: "white",
                  border: "none", borderRadius: "6px",
                  cursor: "pointer", fontWeight: "700", fontSize: "13px"
                }}>
                  📋 View Full History
                </button>
                <button onClick={() => { setSelectedCid(null); setCustomerDetail(null); }} style={{
                  marginTop: "8px", padding: "8px 18px",
                  backgroundColor: "#f1f5f9", color: "#1e3a5f",
                  border: "none", borderRadius: "6px",
                  cursor: "pointer", fontWeight: "700", fontSize: "13px"
                }}>
                  ✕ Close
                </button>
              </>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default Accounts;