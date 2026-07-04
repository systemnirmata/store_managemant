import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { isValidPhone } from "../utils/validation";
import Header from "../components/Hader";
import Footer from "../components/Footer";
import "../style/billing.css";
import { printBill } from "../utils/printer";
import {  reconnectPrinter } from "../utils/printer";


function Billing() {
  const navigate = useNavigate();
  const [printing, setPrinting] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [paymentType, setPaymentType] = useState("Cash");
  const [cashPhone, setCashPhone] = useState("");
  const [quantities, setQuantities] = useState({});
  const [activeCategory, setActiveCategory] = useState(null);
  const [searches, setSearches] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [billDone, setBillDone] = useState(null);
  const [cashMethod, setCashMethod] = useState("Cash");

useEffect(() => {
    // Auto reconnect printer on page load
    reconnectPrinter()
        .then(connected => {
            if (connected) {
                console.log("Printer ready!");
            }
        })
        .catch(() => {});
}, []);
  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [productRes, customerRes, catRes] = await Promise.all([
        api.get("/products/get_products"),
        api.get("/customer/get_all_customer"),
        api.get("/categories/get_category"),
      ]);
      setProducts(productRes.data || []);
      setCustomers(customerRes.data || []);
      setCategories(catRes.data || []);
      if (catRes.data?.length) setActiveCategory(catRes.data[0].cid);
    } catch (err) {
      setNotice("Failed to load data");
    } finally { setLoading(false); }
  }

  const getProductsByCategory = (cid) =>
    products.filter(p => p.cid === cid);

  const getFiltered = (cid) => {
    const s = searches[cid] || "";
    return getProductsByCategory(cid).filter(p =>
      p.product_name.toLowerCase().includes(s.toLowerCase())
    );
  };

  const selectedItems = useMemo(() =>
    products
      .filter(p => (quantities[p.pid] || 0) > 0)
      .map(p => ({
        ...p,
        quantity: quantities[p.pid],
        subtotal: Number(p.price) * quantities[p.pid],
      })),
    [products, quantities]
  );

  const totalAmount = selectedItems.reduce((s, i) => s + i.subtotal, 0);

  const changeQty = (pid, next) =>
    setQuantities(prev => ({ ...prev, [pid]: Math.max(0, next) }));

  const canGenerate = selectedItems.length > 0 && !saving &&
    paymentType === "Cash" && isValidPhone(cashPhone);

  const canAddToAccount = selectedItems.length > 0 && !saving &&
    paymentType === "Monthly Account" && !!selectedCustomer;

  // ── CASH BILL ─────────────────────────────────────────────
  const generateBill = async () => {
    if (!canGenerate) return;
    try {
      setSaving(true);
      setNotice("");

      let cid;
      const found = customers.find(c => c.cphone === cashPhone);
      if (found) {
        cid = found.cid;
      } else {
        const newCust = await api.post("/customer/create_customer", {
          cname: "Cash Customer",
          cphone: cashPhone,
          cmail: "",
          currently_due_amount: 0,
          last_paid_amount: 0
        });
        cid = newCust.data.cid;
        const custRes = await api.get("/customer/get_all_customer");
        setCustomers(custRes.data);
      }

      const billRes = await api.post("/bill/create_bill", {
        cid: Number(cid),
        payment_type: cashMethod
      });
      const bid = billRes.data;

      await Promise.all(
        selectedItems.map(item =>
          api.post("/bill/create_billItems", {
            bid,
            pid: item.pid,
            quantity: item.quantity,
            unit_price: Number(item.price),
          })
        )
      );

      const billDetail = await api.get(`/bill/get_bill/${bid}`);

      setBillDone({
        ...billDetail.data,
        bid,
        items: selectedItems,
        paymentType: cashMethod,
        phone: cashPhone,
        email: "",
      });

      setQuantities({});
      setCashPhone("");

    } catch (err) {
      setNotice(err?.response?.data?.detail || "Failed to generate bill");
    } finally { setSaving(false); }
  };

  // ── MONTHLY ACCOUNT BILL ──────────────────────────────────
  const addToAccount = async () => {
    if (!canAddToAccount) return;
    try {
      setSaving(true);
      setNotice("");

      const billRes = await api.post("/bill/create_bill", {
        cid: Number(selectedCustomer),
        payment_type: "Monthly Account"
      });
      const bid = billRes.data;

      await Promise.all(
        selectedItems.map(item =>
          api.post("/bill/create_billItems", {
            bid,
            pid: item.pid,
            quantity: item.quantity,
            unit_price: Number(item.price),
          })
        )
      );

      const billDetail = await api.get(`/bill/get_bill/${bid}`);
      const custFound = customers.find(c => c.cid === parseInt(selectedCustomer));

      setBillDone({
        ...billDetail.data,
        bid,
        items: selectedItems,
        paymentType: "Monthly Account",
        phone: custFound?.cphone || "",
        email: custFound?.cmail || "",
      });

      setQuantities({});
      setSelectedCustomer("");

    } catch (err) {
      setNotice(err?.response?.data?.detail || "Failed to add to account");
    } finally { setSaving(false); }
  };

  // ── WHATSAPP ──────────────────────────────────────────────
  const handleWhatsApp = async () => {
    if (!billDone) return;

    const date = new Date(billDone.created_at).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric"
    });

    let msg = ``;
    msg += `🏪 *GANGADHAR PROVISION STORE*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `📋 *BILL RECEIPT*\n`;
    msg += `🔖 Bill No : *#${billDone.bid}*\n`;
    msg += `📅 Date    : *${date}*\n`;
    msg += `👤 Name    : *${billDone.cname}*\n`;
    msg += `💳 Payment : *${billDone.paymentType}*\n\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🛒 *ITEMS PURCHASED*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;

    billDone.items.forEach((item, index) => {
      msg += `${index + 1}. ${item.product_name}\n`;
      msg += `   ${item.quantity} x Rs.${Number(item.price).toFixed(2)} = *Rs.${item.subtotal.toFixed(2)}*\n`;
    });

    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💰 *TOTAL AMOUNT : Rs.${parseFloat(billDone.total_amount).toFixed(2)}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (billDone.paymentType === "Monthly Account") {
      msg += `📌 _Added to your Monthly Account_\n\n`;
    } else {
      msg += `✅ _Payment Received — Thank You!_\n\n`;
    }

    msg += `🙏 *Thank you for shopping with us!*\n`;
    msg += `📍 Gangadhar Provision Store\n`;
    msg += `📞 Visit us again!`;

    const waUrl = billDone.phone
      ? `https://wa.me/91${billDone.phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };


  const handleDownloadPDF = async () => {
    if (!billDone) return;
    try {
      const res = await api.post("/bill/generate_pdf", {
        bill_data: {
          bid: billDone.bid,
          cname: billDone.cname,
          phone: billDone.phone || "",
          total_amount: parseFloat(billDone.total_amount).toFixed(2),
          payment_type: billDone.paymentType,
          created_at: new Date(billDone.created_at).toLocaleDateString("en-IN"),
        },
        items: billDone.items.map(i => ({
          product_name: i.product_name,
          quantity: i.quantity,
          unit_price: Number(i.price).toFixed(2),
          subtotal: i.subtotal.toFixed(2),
        }))
      }, { responseType: "blob" });   // ← blob for binary PDF

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.setAttribute("download", `Bill_${billDone.bid}.pdf`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to generate PDF: " + (err?.response?.data?.detail || err.message));
    }
  };
  const activeCat = categories.find(c => c.cid === activeCategory);

  const handlePrint = async () => {
    if (!billDone) return;
    try {
      setPrinting(true);
      await printBill({
        bid: billDone.bid,
        cname: billDone.cname,
        phone: billDone.phone || "",
        total_amount: billDone.total_amount,
        created_at: billDone.created_at,
        paymentType: billDone.paymentType,
        items: billDone.items
      });
      alert("Bill printed successfully!");
    } catch (err) {
      alert("Printing failed. Make sure Bluetooth is on and printer is nearby.\n\nError: " + err.message);
    } finally {
      setPrinting(false);
    }
  };
  // ── JSX ───────────────────────────────────────────────────
  return (
    <div className="billing-page">
      <Header />
      <main className="billing-shell">

        {/* Top Bar */}
        <section className="billing-topbar">
          <div>
            <button className="ghost-btn" onClick={() => navigate("/Dashboard")}>
              Back
            </button>
            <h1>Billing</h1>
            <p>Select products, choose payment type, then generate the bill.</p>
          </div>
          <div className="billing-summary">
            <span>{selectedItems.length} items</span>
            <strong>Rs {totalAmount.toFixed(2)}</strong>
            {paymentType === "Cash" && (
              <button
                className="generate-btn"
                disabled={!canGenerate}
                onClick={generateBill}
              >
                {saving ? "Generating..." : "Generate Bill"}
              </button>
            )}
          </div>
        </section>

        {notice && <div className="billing-notice">{notice}</div>}

        <section className="billing-grid">

          {/* LEFT PANEL */}
          <aside className="billing-panel">

            {/* Payment Type */}
            <label>Payment Type</label>
            <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
              {["Cash", "Monthly Account"].map(type => (
                <button
                  key={type}
                  onClick={() => setPaymentType(type)}
                  style={{
                    flex: 1, padding: "9px",
                    backgroundColor: paymentType === type ? "#1e3a5f" : "#f1f5f9",
                    color: paymentType === type ? "white" : "#374151",
                    border: "none", borderRadius: "8px",
                    cursor: "pointer", fontWeight: "600", fontSize: "13px"
                  }}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Cash */}
            {paymentType === "Cash" && (
              <>
                <label>Customer Phone Number</label>
                <input
                  type="text"
                  placeholder="Enter 10 digit phone number"
                  value={cashPhone}
                  maxLength={10}
                  onChange={e => setCashPhone(e.target.value.replace(/\D/g, ""))}
                  style={{
                    width: "100%", padding: "9px 12px",
                    border: "1px solid #cbd5e1", borderRadius: "8px",
                    fontSize: "14px", marginBottom: "8px",
                    boxSizing: "border-box", outline: "none"
                  }}
                />

                {/* ADD THIS — Cash or UPI selection */}
                <label style={{
                  fontSize: "13px", fontWeight: "600",
                  color: "#374151", marginBottom: "6px", display: "block"
                }}>
                  Payment Method
                </label>
                <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
                  {["Cash", "UPI"].map(method => (
                    <button
                      key={method}
                      onClick={() => setCashMethod(method)}
                      style={{
                        flex: 1, padding: "8px",
                        backgroundColor: cashMethod === method ? "#15803d" : "#f1f5f9",
                        color: cashMethod === method ? "white" : "#374151",
                        border: "none", borderRadius: "8px",
                        cursor: "pointer", fontWeight: "600", fontSize: "13px"
                      }}
                    >
                      {method === "Cash" ? "💵 Cash" : "📱 UPI"}
                    </button>
                  ))}
                </div>

                <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "14px" }}>
                  Bill will be sent to this WhatsApp number
                </p>
              </>
            )}
            {/* Monthly Account */}
            {paymentType === "Monthly Account" && (
              <>
                <label>Select Customer</label>
                <select
                  value={selectedCustomer}
                  onChange={e => setSelectedCustomer(e.target.value)}
                  style={{
                    width: "100%", padding: "9px 12px",
                    border: "1px solid #cbd5e1", borderRadius: "8px",
                    fontSize: "14px", marginBottom: "10px",
                    boxSizing: "border-box", outline: "none"
                  }}
                >
                  <option value="">-- Select Customer --</option>
                  {customers
                    .filter(c => c.cname !== "Cash Customer")
                    .map(c => (
                      <option key={c.cid} value={c.cid}>
                        {c.cname} - {c.cphone}
                      </option>
                    ))}
                </select>

                {/* ADD TO ACCOUNT BUTTON */}
                <button
                  onClick={addToAccount}
                  disabled={!canAddToAccount}
                  style={{
                    width: "100%", padding: "11px 0",
                    backgroundColor: canAddToAccount ? "#b45309" : "#d1d5db",
                    color: "white", border: "none", borderRadius: "8px",
                    cursor: canAddToAccount ? "pointer" : "not-allowed",
                    fontWeight: "700", fontSize: "14px", marginBottom: "10px"
                  }}
                >
                  {saving ? "Adding..." : "➕ Add to Monthly Account"}
                </button>

                <p style={{
                  fontSize: "12px", color: "#b45309",
                  backgroundColor: "#fef3c7", padding: "8px 10px",
                  borderRadius: "6px", marginBottom: "14px"
                }}>
                  ✓ Bill will be added to customer's monthly account
                </p>
              </>
            )}

            {/* Cart */}
            <div className="receipt-preview">
              <div className="receipt-head">
                <span>Current Bill</span>
                <strong>Rs {totalAmount.toFixed(2)}</strong>
              </div>
              {selectedItems.length === 0 ? (
                <p className="muted">No products selected yet.</p>
              ) : (
                selectedItems.map(item => (
                  <div className="receipt-row" key={item.pid}>
                    <div>
                      <strong>{item.product_name}</strong>
                      <span>{item.quantity} x Rs {Number(item.price).toFixed(2)}</span>
                    </div>
                    <b>Rs {item.subtotal.toFixed(2)}</b>
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* RIGHT — Products */}
          <section className="product-picker">

            {/* Category Cards */}
            <div style={{
              display: "flex", flexWrap: "nowrap",
              gap: "10px", marginBottom: "18px",
              overflowX: "auto", paddingBottom: "6px"
            }}>
              {categories.map(cat => {
                const isActive = activeCategory === cat.cid;
                const selected = getProductsByCategory(cat.cid)
                  .reduce((s, p) => s + (quantities[p.pid] || 0), 0);
                return (
                  <div
                    key={cat.cid}
                    onClick={() => setActiveCategory(isActive ? null : cat.cid)}
                    style={{
                      padding: "10px 16px", borderRadius: "10px",
                      border: isActive ? "2px solid #1e3a5f" : "2px solid #e2e8f0",
                      backgroundColor: isActive ? "#eff6ff" : "white",
                      cursor: "pointer", textAlign: "center",
                      minWidth: "90px", position: "relative",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.05)"
                    }}
                  >
                    <div style={{
                      width: "36px", height: "36px", borderRadius: "50%",
                      backgroundColor: "#1e3a5f", color: "white",
                      fontSize: "16px", fontWeight: "700",
                      display: "flex", alignItems: "center",
                      justifyContent: "center", margin: "0 auto 6px"
                    }}>
                      {cat.cname.charAt(0).toUpperCase()}
                    </div>
                    <div style={{
                      fontSize: "12px", fontWeight: "700",
                      color: "#1e293b"
                    }}>{cat.cname}</div>
                    <div style={{ fontSize: "10px", color: "#64748b" }}>
                      {getProductsByCategory(cat.cid).length} items
                    </div>
                    {selected > 0 && (
                      <div style={{
                        position: "absolute", top: "-7px", right: "-7px",
                        backgroundColor: "#2563eb", color: "white",
                        fontSize: "10px", fontWeight: "700",
                        padding: "2px 7px", borderRadius: "20px"
                      }}>{selected}</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Active Category Products */}
            {activeCategory && activeCat && (
              <div style={{
                backgroundColor: "white", borderRadius: "12px",
                overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
                maxHeight: "calc(100vh - 320px)", overflowY: "auto"
              }}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", padding: "12px 16px",
                  backgroundColor: "#1e3a5f"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{
                      fontSize: "14px", fontWeight: "700",
                      color: "white"
                    }}>{activeCat.cname}</span>
                    <span style={{
                      fontSize: "11px", color: "#93c5fd",
                      backgroundColor: "rgba(255,255,255,0.15)",
                      padding: "2px 8px", borderRadius: "20px"
                    }}>
                      {getProductsByCategory(activeCategory).length} products
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder={`Search ${activeCat.cname}...`}
                    value={searches[activeCategory] || ""}
                    onChange={e => setSearches(prev => ({
                      ...prev, [activeCategory]: e.target.value
                    }))}
                    style={{
                      padding: "6px 10px",
                      border: "1px solid rgba(255,255,255,0.3)",
                      borderRadius: "6px", fontSize: "12px", width: "160px",
                      backgroundColor: "rgba(255,255,255,0.1)",
                      color: "white", outline: "none"
                    }}
                  />
                </div>

                {loading ? (
                  <div className="empty-state">Loading...</div>
                ) : (
                  <div className="billing-product-grid">
                    {getFiltered(activeCategory).map(product => {
                      const qty = quantities[product.pid] || 0;
                      return (
                        <article
                          className={`billing-product-card ${qty ? "selected" : ""}`}
                          key={product.pid}
                        >
                          <div className="billing-product-image">
                            {product.image_url ? (
                              <img
                                src={`${api.defaults.baseURL}${product.image_url}`}
                                alt={product.product_name}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  e.target.nextSibling.style.display = "flex";
                                }}
                              />
                            ) : null}
                            <span style={{
                              display: product.image_url ? "none" : "flex",
                              width: "100%", height: "100%",
                              alignItems: "center", justifyContent: "center",
                              fontSize: "28px", fontWeight: "800", color: "#0369a1"
                            }}>
                              {product.product_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="billing-product-body">
                            <h3>{product.product_name}</h3>
                            <p>{product.unit || ""}</p>
                            <strong>Rs {Number(product.price).toFixed(2)}</strong>
                          </div>
                          <div className="quantity-control">
                            <button
                              onClick={() => changeQty(product.pid, qty - 1)}
                              disabled={qty === 0}
                            >-</button>
                            <span>{qty}</span>
                            <button onClick={() => changeQty(product.pid, qty + 1)}>+</button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>
        </section>
      </main>
      <Footer />

      {/* SUCCESS POPUP */}
      {billDone && (
        <div style={{
          position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "white", borderRadius: "14px",
            padding: "28px", width: "100%", maxWidth: "400px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
            maxHeight: "90vh", overflowY: "auto"
          }}>
            <div style={{
              fontSize: "16px", fontWeight: "700",
              color: "#15803d", textAlign: "center", marginBottom: "4px"
            }}>
              ✓ {billDone.paymentType === "Monthly Account"
                ? "Added to Monthly Account!" : "Bill Generated Successfully!"}
            </div>
            <div style={{
              fontSize: "13px", color: "#64748b",
              textAlign: "center", marginBottom: "16px"
            }}>
              Bill #{billDone.bid}
            </div>

            {/* Info */}
            <div style={{
              backgroundColor: "#f8fafc", borderRadius: "8px",
              padding: "12px", marginBottom: "12px"
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between",
                fontSize: "13px", paddingBottom: "6px",
                marginBottom: "6px", borderBottom: "1px solid #e2e8f0"
              }}>
                <span>Customer</span>
                <span style={{ fontWeight: "700" }}>{billDone.cname}</span>
              </div>
              <div style={{
                display: "flex", justifyContent: "space-between",
                fontSize: "13px", paddingBottom: "6px",
                marginBottom: "6px", borderBottom: "1px solid #e2e8f0"
              }}>
                <span>Payment</span>
                <span style={{
                  fontWeight: "700",
                  color: billDone.paymentType === "Monthly Account"
                    ? "#b45309" : "#15803d"
                }}>
                  {billDone.paymentType}
                </span>
              </div>
              <div style={{
                display: "flex", justifyContent: "space-between",
                fontSize: "13px"
              }}>
                <span>Phone</span>
                <span>{billDone.phone || "—"}</span>
              </div>
            </div>

            {/* Items */}
            <div style={{ marginBottom: "12px" }}>
              {billDone.items.map((item, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between",
                  fontSize: "13px", padding: "4px 0",
                  borderBottom: "1px solid #f1f5f9"
                }}>
                  <span>{item.product_name} x{item.quantity}</span>
                  <span>₹{item.subtotal.toFixed(2)}</span>
                </div>
              ))}
              <div style={{
                display: "flex", justifyContent: "space-between",
                fontSize: "14px", fontWeight: "800",
                paddingTop: "8px", marginTop: "4px",
                borderTop: "2px solid #e2e8f0"
              }}>
                <span>Total</span>
                <span style={{ color: "#15803d" }}>
                  ₹{parseFloat(billDone.total_amount).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Monthly Account Note */}
            {billDone.paymentType === "Monthly Account" && (
              <div style={{
                backgroundColor: "#fef3c7", color: "#b45309",
                fontSize: "12px", fontWeight: "600",
                padding: "8px 12px", borderRadius: "6px",
                marginBottom: "14px", textAlign: "center"
              }}>
                ✓ Added to {billDone.cname}'s Monthly Account
              </div>
            )}

            {/* 3 Share Buttons */}
            {/* Replace your 3 bottom buttons with this */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <button onClick={handleWhatsApp} style={{
                flex: 1, padding: "10px 0", backgroundColor: "#16a34a",
                color: "white", border: "none", borderRadius: "8px",
                cursor: "pointer", fontSize: "13px", fontWeight: "700"
              }}>📱 WhatsApp</button>

              <button onClick={handleDownloadPDF} style={{
                flex: 1, padding: "10px 0", backgroundColor: "#dc2626",
                color: "white", border: "none", borderRadius: "8px",
                cursor: "pointer", fontSize: "13px", fontWeight: "700"
              }}>⬇ PDF</button>

              <button onClick={handlePrint} disabled={printing} style={{
                flex: 1, padding: "10px 0",
                backgroundColor: printing ? "#d1d5db" : "#0369a1",
                color: "white", border: "none", borderRadius: "8px",
                cursor: printing ? "not-allowed" : "pointer",
                fontSize: "13px", fontWeight: "700"
              }}>
                {printing ? "Printing..." : "🖨️ Print"}
              </button>
            </div>

            <button onClick={() => setBillDone(null)} style={{
              width: "100%", padding: "11px 0",
              backgroundColor: "#1e3a5f", color: "white",
              border: "none", borderRadius: "8px",
              cursor: "pointer", fontSize: "14px", fontWeight: "700"
            }}>+ New Bill</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Billing;