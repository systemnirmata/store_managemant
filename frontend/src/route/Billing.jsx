import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { isValidPhone } from "../utils/validation";
import Header from "../components/Hader";
import Footer from "../components/Footer";
import "../style/billing.css";
import { printBill } from "../utils/printer";
import { reconnectPrinter } from "../utils/printer";

/* ── tiny presentational icons (no new dependency) ── */
const IconReceipt = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2h16v20l-3-2-3 2-3-2-3 2-3-2-1 1z" />
    <path d="M8 7h8M8 11h8M8 15h5" />
  </svg>
);
const IconBack = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 18-6-6 6-6" />
  </svg>
);
const IconRefresh = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M8 16H3v5" />
  </svg>
);
const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);
const IconCheckCircle = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m22 4-10 10.01-3-3" />
  </svg>
);
const IconWhatsApp = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.6 6.32A7.85 7.85 0 0 0 12.05 4a7.94 7.94 0 0 0-6.9 11.9L4 20l4.24-1.11a7.9 7.9 0 0 0 3.8.97h.01a7.94 7.94 0 0 0 5.55-13.54ZM12.05 18.4a6.6 6.6 0 0 1-3.36-.92l-.24-.14-2.5.66.67-2.44-.16-.25a6.6 6.6 0 1 1 12.26-3.5 6.62 6.62 0 0 1-6.67 6.6Zm3.63-4.95c-.2-.1-1.17-.58-1.35-.64-.18-.07-.32-.1-.45.1-.13.2-.51.64-.63.77-.11.13-.23.15-.43.05-.2-.1-.83-.31-1.58-.98-.58-.52-.98-1.16-1.09-1.36-.11-.2-.01-.3.09-.4.09-.1.2-.23.3-.34.1-.12.13-.2.2-.33.07-.13.03-.25-.02-.35-.05-.1-.45-1.08-.61-1.48-.16-.38-.33-.33-.45-.34h-.38c-.13 0-.35.05-.53.25-.18.2-.7.68-.7 1.67s.72 1.94.82 2.07c.1.13 1.4 2.15 3.4 3.01.48.2.85.33 1.14.42.48.15.91.13 1.26.08.38-.06 1.17-.48 1.34-.94.16-.46.16-.86.11-.94-.05-.09-.18-.14-.38-.24Z" /></svg>
);
const IconDownload = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" />
  </svg>
);
const IconPrinter = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <path d="M6 14h12v8H6z" />
  </svg>
);

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

  // Cosmetic-only: spin animation on the refresh icon. Does not change data flow.
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

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
    <div className="bp-page">
      <Header />
      <main className="bp-shell">

        <div className="bp-breadcrumb">
          <button onClick={() => navigate("/Dashboard")}>Dashboard</button>
          <span>/</span>
          <span className="bp-crumb-current">Billing</span>
           <button className="bp-back-btn" onClick={() => navigate("/Dashboard")}>
                <IconBack /> Back
              </button>
        </div>

        {/* Sticky Top Bar */}
        <section className="bp-topbar">
          
          <div className="bp-topbar-left">
            <div className="bp-icon-badge"><IconReceipt /></div>
            <div>
             
              <h1 className="bp-title">Billing</h1>
            </div>
          </div>

          <div className="bp-summary">
            <div className="bp-summary-stat">
              <span>Items</span>
              <strong>{selectedItems.length}</strong>
            </div>
            <div className="bp-summary-stat">
              <span>Total</span>
              <strong>Rs {totalAmount.toFixed(2)}</strong>
            </div>
            <button
              className={`bp-icon-btn ${isRefreshing ? "bp-spin" : ""}`}
              onClick={handleRefresh}
              title="Refresh"
              aria-label="Refresh"
              style={{
                width: 40, height: 40, display: "flex", alignItems: "center",
                justifyContent: "center", background: "white", border: "1px solid var(--bp-green-soft)",
                borderRadius: 10, cursor: "pointer", color: "var(--bp-green)"
              }}
            >
              <IconRefresh />
            </button>
            {paymentType === "Cash" && (
              <button
                className="bp-generate-btn"
                disabled={!canGenerate}
                onClick={generateBill}
              >
                {saving ? "Generating..." : "Generate Bill"}
              </button>
            )}
          </div>
        </section>

        {notice && <div className="bp-notice">⚠️ {notice}</div>}

        <section className="bp-grid">

          {/* LEFT PANEL */}
          <aside className="bp-panel">

            {/* Payment Type */}
            <label>Payment Type</label>
            <div className="bp-segmented">
              {["Cash", "Monthly Account"].map(type => (
                <button
                  key={type}
                  onClick={() => setPaymentType(type)}
                  className={paymentType === type ? "active" : ""}
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
                  className="bp-input"
                />

                <label>Payment Method</label>
                <div className="bp-segmented" style={{ background: "var(--bp-green-xlight)" }}>
                  {["Cash", "UPI"].map(method => (
                    <button
                      key={method}
                      onClick={() => setCashMethod(method)}
                      className={cashMethod === method ? "active" : ""}
                    >
                      {method === "Cash" ? "💵 Cash" : "📱 UPI"}
                    </button>
                  ))}
                </div>

                <p className="bp-hint">Bill will be sent to this WhatsApp number</p>
              </>
            )}

            {/* Monthly Account */}
            {paymentType === "Monthly Account" && (
              <>
                <label>Select Customer</label>
                <select
                  value={selectedCustomer}
                  onChange={e => setSelectedCustomer(e.target.value)}
                  className="bp-input"
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

                <button
                  onClick={addToAccount}
                  disabled={!canAddToAccount}
                  className="bp-account-btn"
                >
                  {saving ? "Adding..." : "➕ Add to Monthly Account"}
                </button>

                <p className="bp-hint-warning">
                  ✓ Bill will be added to customer's monthly account
                </p>
              </>
            )}

            {/* Cart */}
            <div className="bp-receipt">
              <div className="bp-receipt-head">
                <span>Current Bill</span>
                <strong>Rs {totalAmount.toFixed(2)}</strong>
              </div>
              {selectedItems.length === 0 ? (
                <p className="bp-receipt-empty">No products selected yet.</p>
              ) : (
                selectedItems.map(item => (
                  <div className="bp-receipt-row" key={item.pid}>
                    <div>
                      <span className="bp-receipt-row-name">{item.product_name}</span>
                      <span className="bp-receipt-row-meta">{item.quantity} x Rs {Number(item.price).toFixed(2)}</span>
                    </div>
                    <span className="bp-receipt-row-amt">Rs {item.subtotal.toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* RIGHT — Products */}
          <section className="bp-picker">

            {/* Category Cards */}
            <div className="bp-cat-row">
              {categories.map(cat => {
                const isActive = activeCategory === cat.cid;
                const selected = getProductsByCategory(cat.cid)
                  .reduce((s, p) => s + (quantities[p.pid] || 0), 0);
                return (
                  <div
                    key={cat.cid}
                    onClick={() => setActiveCategory(isActive ? null : cat.cid)}
                    className={`bp-cat-card ${isActive ? "active" : ""}`}
                  >
                    <div className="bp-cat-icon">{cat.cname.charAt(0).toUpperCase()}</div>
                    <div className="bp-cat-name">{cat.cname}</div>
                    <div className="bp-cat-count">{getProductsByCategory(cat.cid).length} items</div>
                    {selected > 0 && <div className="bp-cat-badge">{selected}</div>}
                  </div>
                );
              })}
            </div>

            {/* Active Category Products */}
            {activeCategory && activeCat && (
              <div className="bp-section-card">
                <div className="bp-section-header">
                  <div className="bp-section-left">
                    <span className="bp-section-title">{activeCat.cname}</span>
                    <span className="bp-section-count">
                      {getProductsByCategory(activeCategory).length} products
                    </span>
                  </div>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      placeholder={`Search ${activeCat.cname}...`}
                      value={searches[activeCategory] || ""}
                      onChange={e => setSearches(prev => ({
                        ...prev, [activeCategory]: e.target.value
                      }))}
                      className="bp-section-search"
                    />
                  </div>
                </div>

                {loading ? (
                  <div className="bp-skeleton-grid">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div className="bp-skeleton-card" key={i} />
                    ))}
                  </div>
                ) : getFiltered(activeCategory).length === 0 ? (
                  <div className="bp-empty-state">No products found in this category.</div>
                ) : (
                  <div className="bp-product-grid">
                    {getFiltered(activeCategory).map(product => {
                      const qty = quantities[product.pid] || 0;
                      return (
                        <article
                          className={`bp-product-card ${qty ? "selected" : ""}`}
                          key={product.pid}
                        >
                          <div className="bp-product-image">
                            {product.image_url ? (
                              <img
                                src={`${api.defaults.baseURL}${product.image_url}`}
                                alt={product.product_name}
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
                              fontSize: "28px", fontWeight: "800", color: "var(--bp-green)"
                            }}>
                              {product.product_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="bp-product-body">
                            <h3>{product.product_name}</h3>
                            <p>{product.unit || ""}</p>
                            <div className="bp-product-price">Rs {Number(product.price).toFixed(2)}</div>
                          </div>
                          <div className="bp-qty-control">
                            <button
                              onClick={() => changeQty(product.pid, qty - 1)}
                              disabled={qty === 0}
                            >−</button>
                            <span className="bp-qty-value">{qty}</span>
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
        <div className="bp-modal-overlay">
          <div className="bp-modal">
            <div className="bp-modal-success">
              <div className="bp-check-circle"><IconCheckCircle /></div>
              <h3>
                {billDone.paymentType === "Monthly Account"
                  ? "Added to Monthly Account!" : "Bill Generated Successfully!"}
              </h3>
              <p>Bill #{billDone.bid}</p>
            </div>

            <div className="bp-modal-body">
              {/* Info */}
              <div className="bp-info-box">
                <div className="bp-info-row">
                  <span>Customer</span>
                  <span>{billDone.cname}</span>
                </div>
                <div className="bp-info-row">
                  <span>Payment</span>
                  <span className={billDone.paymentType === "Monthly Account" ? "bp-payment-account" : "bp-payment-cash"}>
                    {billDone.paymentType}
                  </span>
                </div>
                <div className="bp-info-row">
                  <span>Phone</span>
                  <span>{billDone.phone || "—"}</span>
                </div>
              </div>

              {/* Items */}
              <div className="bp-items-list">
                {billDone.items.map((item, i) => (
                  <div key={i} className="bp-item-line">
                    <span>{item.product_name} x{item.quantity}</span>
                    <b>₹{item.subtotal.toFixed(2)}</b>
                  </div>
                ))}
                <div className="bp-total-line">
                  <span>Total</span>
                  <strong>₹{parseFloat(billDone.total_amount).toFixed(2)}</strong>
                </div>
              </div>

              {/* Monthly Account Note */}
              {billDone.paymentType === "Monthly Account" && (
                <div className="bp-account-note">
                  ✓ Added to {billDone.cname}'s Monthly Account
                </div>
              )}
            </div>

            {/* 3 Share Buttons */}
            <div className="bp-share-row">
              <button onClick={handleWhatsApp} className="bp-share-btn whatsapp">
                <IconWhatsApp /> WhatsApp
              </button>
              <button onClick={handleDownloadPDF} className="bp-share-btn pdf">
                <IconDownload /> PDF
              </button>
              <button onClick={handlePrint} disabled={printing} className="bp-share-btn print">
                <IconPrinter /> {printing ? "Printing..." : "Print"}
              </button>
            </div>

            <button onClick={() => setBillDone(null)} className="bp-newbill-btn">
              + New Bill
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Billing;