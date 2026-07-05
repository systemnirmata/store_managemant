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
  // Calculates the REAL bill total by adding up all item subtotals
function getBillTotal(bill, allBillItems) {
  const items = allBillItems.filter(i => i.bid === bill.bid);
  return items.reduce((sum, item) => sum + item.subtotal, 0);
}

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

  const EMOJI = {
    store: "\u{1F3EA}",
    tag: "\u{1F516}",
    calendar: "\u{1F4C5}",
    person: "\u{1F464}",
    card: "\u{1F4B3}",
    money: "\u{1F4B0}",
    red: "\u{1F534}",
    pray: "\u{1F64F}",
  };
  const LINE = "\u2501".repeat(21);

  const billTotal = getBillTotal(bill, customerDetail.BillItems);

  const itemLines = items
    .map((item, i) => `${i + 1}. ${item.product_name} x${item.quantity} = Rs.${item.subtotal.toFixed(2)}`)
    .join("\n");

  const msg = [
    `${EMOJI.store} *GANGADHAR PROVISION STORE*`,
    LINE,
    `${EMOJI.tag} Bill #${bill.bid}  |  ${EMOJI.calendar} ${date}`,
    `${EMOJI.person} ${c.cname}  |  ${EMOJI.card} ${bill.payment_type}`,
    LINE,
    itemLines,
    LINE,
    `${EMOJI.money} *Total : Rs.${billTotal.toFixed(2)}*`,
    `${EMOJI.red} Due   : Rs.${c.currently_due_amount.toFixed(2)}`,
    LINE,
    `${EMOJI.pray} Gangadhar Provision Store`,
  ].join("\n");

  const phone = c.cphone ? `91${c.cphone}` : "";
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
};
  // ── PDF DOWNLOAD ──────────────────────────────────────────
const handlePDF = async (bill, items) => {
  const c = customerDetail.Customer;
  const billTotal = getBillTotal(bill, customerDetail.BillItems);
  try {
    const res = await api.post("/bill/generate_pdf", {
      bill_data: {
        bid: bill.bid,
        cname: c.cname,
        phone: c.cphone || "",
        total_amount: billTotal.toFixed(2),
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
  const { label, bills } = monthData;

  const EMOJI = {
    store: "\u{1F3EA}",
    chart: "\u{1F4CA}",
    person: "\u{1F464}",
    phone: "\u{1F4DE}",
    box: "\u{1F4E6}",
    money: "\u{1F4B0}",
    red: "\u{1F534}",
    pray: "\u{1F64F}",
    pin: "\u{1F4CD}",
  };
  const LINE = "\u2501".repeat(21);

  // Recalculate real total from actual item prices, not saved total_amount
  const realTotal = bills.reduce(
    (sum, bill) => sum + getBillTotal(bill, customerDetail.BillItems),
    0
  );

  const billSummary = bills.map((bill, idx) => {
    const date = new Date(bill.created_at).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short"
    });
    const billTotal = getBillTotal(bill, customerDetail.BillItems);
    return `${idx + 1}. Bill #${bill.bid} - ${date} - *Rs.${billTotal.toFixed(2)}*`;
  }).join("\n");

  const msg = [
    `${EMOJI.store} *GANGADHAR PROVISION STORE*`,
    LINE,
    `${EMOJI.chart} *${label} Statement*`,
    `${EMOJI.person} ${c.cname}  |  ${EMOJI.phone} ${c.cphone}`,
    LINE,
    billSummary,
    LINE,
    `${EMOJI.box} Total Bills  : ${bills.length}`,
    `${EMOJI.money} Month Total  : *Rs.${realTotal.toFixed(2)}*`,
    `${EMOJI.red} Total Due    : *Rs.${c.currently_due_amount.toFixed(2)}*`,
    LINE,
    `${EMOJI.pray} Please clear dues.`,
    `${EMOJI.pin} Gangadhar Provision Store`,
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
  const { label, bills } = monthData;

  const allItems = [];
  let realTotal = 0;

  bills.forEach(bill => {
    const date = new Date(bill.created_at).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short"
    });
    const billTotal = getBillTotal(bill, customerDetail.BillItems);
    realTotal += billTotal;

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
      subtotal: billTotal.toFixed(2),
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
      grand_total: realTotal.toFixed(2),
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
    <div className="accounts-page">
      <Header />

      {/* ── ADD CUSTOMER MODAL (moved to top level) ── */}
      {showAddForm && (
        <div className="account-modal">
          <div className="account-form">
            <h2>+ Add New Customer</h2>

            {[
              { label: "Customer Name *", key: "cname", placeholder: "Full name", type: "text" },
              { label: "Phone Number *", key: "cphone", placeholder: "10 digit number", type: "text", maxLength: 10 },
              { label: "Email (optional)", key: "cmail", placeholder: "email@example.com", type: "email" },
            ].map(f => (
              <div key={f.key}>
                <label>{f.label}</label>
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
                />
              </div>
            ))}

            <div className="account-form-actions">
              <button onClick={() => {
                setShowAddForm(false);
                setNewCustomer({ cname: "", cphone: "", cmail: "" });
              }}>Cancel</button>
              <button onClick={handleAddCustomer} disabled={addLoading}>
                {addLoading ? "Adding..." : "✓ Add Customer"}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="accounts-shell">

        {/* Top */}
        <div className="accounts-topbar">
          <div>
            <h1>Accounts</h1>
            <p>Customer dues, payments, and bill history in one place.</p>
          </div>
          <button className="primary-account-btn" onClick={() => setShowAddForm(true)}>
            + Add Customer
          </button>
        </div>

        {/* Stats */}
        <div className="account-stats">
          {[
            { label: "Customers", value: customers.length, plain: true },
            { label: "Total Due", value: `Rs ${totalDue.toFixed(2)}` },
            { label: "Total Paid", value: `Rs ${totalPaid.toFixed(2)}` },
          ].map((s, i) => (
            <div key={i}>
              <span>{s.label}</span>
              <strong>{s.value}</strong>
            </div>
          ))}
        </div>

        {notice && <div className="accounts-notice">{notice}</div>}

        {/* Customer List */}
        <div className="accounts-card" style={{ marginBottom: "24px" }}>
          <div className="accounts-toolbar">
            <h2>Customer Accounts</h2>
            <div className="accounts-toolbar-actions">
              <div className="filter-btn-group">
                {[
                  { key: 'default', label: 'All' },
                  { key: 'monthly', label: 'Monthly' },
                  { key: 'cash', label: 'Cash Customer' }
                ].map(b => (
                  <button
                    key={b.key}
                    className={`filter-btn ${filterType === b.key ? "active" : ""}`}
                    onClick={() => { setFilterType(b.key); loadCustomers(b.key); }}
                  >{b.label}</button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Search name, phone, email"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* ── Scrollable table wrapper ── */}
          <div className="accounts-table-wrap">
            <table className="accounts-table">
              <thead>
                <tr>
                  {["NAME", "PHONE", "EMAIL", "DUE", "LAST PAID", "ACTION"].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.cid}>
                    <td>{c.cname}</td>
                    <td>{c.cphone}</td>
                    <td>{c.cmail || "-"}</td>
                    <td>
                      <span className={c.currently_due_amount > 0 ? "due-amount" : "paid-amount"}>
                        Rs {parseFloat(c.currently_due_amount || 0).toFixed(2)}
                      </span>
                    </td>
                    <td>Rs {parseFloat(c.last_paid_amount || 0).toFixed(2)}</td>
                    <td>
                      <button className="view-btn" onClick={() => openCustomer(c.cid)}>👁 View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && filtered.length === 0 && (
            <div className="accounts-empty">No customers found.</div>
          )}
        </div>

        {/* Customer Detail Panel */}
        {selectedCid && (
          <div className="accounts-card detail-card">
            {!customerDetail ? (
              <div className="accounts-empty">Loading...</div>
            ) : (
              <>
                {/* Customer Header */}
                <div className="detail-header">
                  <div className="detail-header-info">
                    <h2>{customerDetail.Customer.cname}</h2>
                    <p>
                      📞 {customerDetail.Customer.cphone}
                      {customerDetail.Customer.cmail && ` • 📧 ${customerDetail.Customer.cmail}`}
                    </p>
                  </div>

                  {/* Due + Pay */}
                  <div className="detail-balance-group">
                    <div className="balance-box due">
                      <div>TOTAL DUE</div>
                      <div>Rs {customerDetail.Customer.currently_due_amount.toFixed(2)}</div>
                    </div>
                    <div className="balance-box paid">
                      <div>LAST PAID</div>
                      <div>Rs {customerDetail.Customer.last_paid_amount.toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                {/* Payment Entry */}
                {customerDetail.Customer.currently_due_amount > 0 && (
                  <div className="payment-entry-box">
                    <span>💰 Record Payment:</span>
                    <input
                      type="number"
                      placeholder="Enter amount"
                      value={payAmount}
                      onChange={e => setPayAmount(e.target.value)}
                    />
                    <button onClick={handlePayment} disabled={payLoading}>
                      {payLoading ? "Saving..." : "✓ Mark as Paid"}
                    </button>
                    <span className="max-due-label">
                      Max: Rs {customerDetail.Customer.currently_due_amount.toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Bill History */}
                <h3 className="bill-history-title">
                  Bill History ({(customerDetail.CustomerBills || []).filter(b => b.payment_type === (customerDetail.Customer.cname === "Cash Customer" ? "Cash" : "Monthly Account")).length || 0} bills)
                </h3>

                {(() => {
                  const isCashCustomer = customerDetail.Customer.cname === "Cash Customer";
                  const billType = isCashCustomer ? "Cash" : "Monthly Account";
                  const monthlyBills = (customerDetail.CustomerBills || []).filter(
                    b => b.payment_type === billType
                  );

                  if (monthlyBills.length === 0) return (
                    <div className="accounts-empty">
                      {isCashCustomer ? "No cash bills found." : "No monthly account bills found."}
                    </div>
                  );

                  const grouped = {};
                  monthlyBills.forEach(bill => {
                    const date = new Date(bill.created_at);
                    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
                    const label = date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
                    if (!grouped[key]) grouped[key] = { label, bills: [], total: 0 };
                    grouped[key].bills.push(bill);
                    grouped[key].total += getBillTotal(bill, customerDetail.BillItems);
                  });

                  const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

                  return sortedKeys.map(key => {
                    const { label, bills, total } = grouped[key];
                    return (
                      <div key={key} className="month-group">
                        {/* Month Header */}
                        <div className="month-group-header">
                          <div>
                            <span>📅</span>
                            <span className="month-label">{label}</span>
                            <span className="month-badge">{bills.length} bills</span>
                          </div>
                          <span className="month-total">Rs {total.toFixed(2)}</span>
                        </div>

                        {/* Bills inside month */}
                        {bills.map((bill, billIdx) => {
                          const billItems = customerDetail.BillItems.filter(i => i.bid === bill.bid);
                          const billDate = new Date(bill.created_at).toLocaleDateString("en-IN", {
                            day: "2-digit", month: "short"
                          });
                          return (
                            <div key={bill.bid} className="bill-row-wrap">
                              <div className="bill-row-top">
                                <div className="bill-row-left">
                                  <span className="bill-row-index">{billIdx + 1}</span>
                                  <span className="bill-row-title">Bill #{bill.bid}</span>
                                  <span className="bill-row-date">{billDate}</span>
                                </div>
                                <div className="bill-row-right">
                                  <span className="bill-row-amount">
                                    Rs {getBillTotal(bill, customerDetail.BillItems).toFixed(2)}
                                  </span>
                                  <button className="action-btn whatsapp" onClick={() => handleWhatsApp(bill, billItems)}>📱</button>
                                  <button className="action-btn pdf" onClick={() => handlePDF(bill, billItems)}>⬇</button>
                                </div>
                              </div>
                              <div className="bill-items-list">
                                {billItems.map((item, i) => (
                                  <div key={i} className="bill-item-row">
                                    <span>{item.product_name} x{item.quantity}</span>
                                    <span>Rs {item.subtotal.toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}

                        {/* Month Footer */}
                        <div className="month-footer">
                          <span className="month-footer-total">Month Total: Rs {total.toFixed(2)}</span>
                          <div className="month-footer-actions">
                            <button className="footer-btn whatsapp" onClick={() => handleMonthlyWhatsApp(key, grouped[key])}>
                              📱 Share {label}
                            </button>
                            <button className="footer-btn pdf" onClick={() => handleMonthlyPDF(key, grouped[key])}>
                              ⬇ PDF {label}
                            </button>
                            {!isCashCustomer && (
                              <button className="footer-btn delete" onClick={() => handleDeleteMonth(key, label)}>
                                🗑 Delete {label}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}

                <div className="detail-footer-actions">
                  <button className="primary-account-btn" onClick={() => navigate(`/PaymentHistory/${selectedCid}`)}>
                    📋 View Full History
                  </button>
                  <button className="secondary-btn" onClick={() => { setSelectedCid(null); setCustomerDetail(null); }}>
                    ✕ Close
                  </button>
                </div>
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