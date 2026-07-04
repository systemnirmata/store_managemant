import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { isAllowedName, isNonNegativeNumber } from "../utils/validation";
import Header from "../components/Hader";
import Footer from "../components/Footer";
const API_BASE = api.defaults.baseURL || "";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

function Products() {
  const navigate = useNavigate();
  const [categories, setCategories]     = useState([]);
  const [allProducts, setAllProducts]   = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [searches, setSearches]         = useState({});
  const [quantities, setQuantities]     = useState({});
  const [showModal, setShowModal]       = useState(false);
  const [editItem, setEditItem]         = useState(null);
  const [loading, setLoading]           = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [showCamera, setShowCamera]     = useState(false);
  const [cameraError, setCameraError]   = useState("");
  const [form, setForm] = useState({
    product_name: "", cid: "", unit: "" || 0, price: ""
  });

  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => { fetchCategories(); fetchProducts(); }, []);

  // Attach the camera stream to the video element once it's mounted
  useEffect(() => {
    if (showCamera && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [showCamera]);

  // Make sure the camera always turns off if the page is left open
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get("/categories/get_category");
      setCategories(res.data);
      if (res.data.length > 0) setActiveCategory(res.data[0].cid);
    } catch { alert("Failed to load categories"); }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get("/products/get_products");
      setAllProducts(res.data);
    } catch { alert("Failed to load products"); }
  };

  const getProductsByCategory = (cid) =>
    allProducts.filter((p) => p.cid === cid);

  const getFiltered = (cid) => {
    const search = searches[cid] || "";
    return getProductsByCategory(cid).filter((p) =>
      p.product_name.toLowerCase().includes(search.toLowerCase())
    );
  };

  const getTotalSelected = (cid) =>
    getProductsByCategory(cid).reduce(
      (sum, p) => sum + (quantities[p.pid] || 0), 0
    );

  const increase = (pid) =>
    setQuantities((prev) => ({ ...prev, [pid]: (prev[pid] || 0) + 1 }));

  const decrease = (pid) =>
    setQuantities((prev) => ({
      ...prev, [pid]: Math.max(0, (prev[pid] || 0) - 1),
    }));

  // User picks a photo from their device's gallery/files
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      alert("Please choose a JPG, PNG, or WEBP image");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      alert("Image must be smaller than 2MB");
      return;
    }

    setSelectedFile(file);
    setPreviewImage(URL.createObjectURL(file));
  };

  // Opens the live camera so the owner can take a fresh photo
  const openCamera = async () => {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setShowCamera(true);
    } catch (err) {
      setCameraError(
        "Could not open the camera. Please allow camera access, or choose a photo from your gallery instead."
      );
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  // Takes a snapshot of the current camera frame and uses it as the product photo
  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `product-${Date.now()}.jpg`, { type: "image/jpeg" });
      setSelectedFile(file);
      setPreviewImage(URL.createObjectURL(file));
      closeCamera();
    }, "image/jpeg", 0.9);
  };

  // Removes the photo (clears local selection, and deletes saved one if editing)
  const handleRemoveImage = async () => {
    if (editItem) {
      try {
        await api.delete(`/products/delete_image/${editItem.pid}`);
      } catch {
        alert("Failed to remove image");
        return;
      }
    }
    setSelectedFile(null);
    setPreviewImage(null);
  };

  const openAdd = () => {
    setEditItem(null);
    setSelectedFile(null);
    setPreviewImage(null);
    setCameraError("");
    setForm({ product_name: "", cid: activeCategory || "", unit: "", price: "" });
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditItem(product);
    setSelectedFile(null);
    setCameraError("");
    setPreviewImage(product.image_url ? `${API_BASE}${product.image_url}` : null);
    setForm({
      product_name: product.product_name,
      cid: product.cid,
      unit: product.unit || "",
      price: product.price,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.product_name.trim()) { alert("Product name is required"); return; }
    if (!isAllowedName(form.product_name)) { alert("Product name must contain letters and may include numbers/spaces, but cannot be only numbers or special symbols."); return; }
    if (!form.cid) { alert("Please select a category"); return; }
    if (!isNonNegativeNumber(form.price) || Number(form.price) <= 0) { alert("Price must be a positive number"); return; }
    if (form.unit && !/^[A-Za-z0-9]+$/.test(form.unit)) { alert("Unit should contain letters and number only (e.g. 1kg, 10gm,3pcs)"); return; }
    try {
      setLoading(true);
      let pid;

      if (editItem) {
        await api.patch(`/products/update_product/${editItem.pid}`, {
          product_name: form.product_name,
          cid: parseInt(form.cid),
          unit: form.unit,
          price: parseFloat(form.price),
        });
        pid = editItem.pid;
      } else {
        const res = await api.post("/products/create_product", {
          product_name: form.product_name,
          cid: parseInt(form.cid),
          unit: form.unit,
          price: parseFloat(form.price),
        });
        pid = res.data.product_id;
      }

      // Upload the photo separately, only if the user picked or captured a new one
      if (selectedFile && pid) {
        const imageForm = new FormData();
        imageForm.append("file", selectedFile);
        await api.post(`/products/upload_image/${pid}`, imageForm, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      setShowModal(false);
      setSelectedFile(null);
      setPreviewImage(null);
      fetchProducts();
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to save");
    } finally { setLoading(false); }
  };

  const handleDelete = async (pid, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await api.delete(`/products/delete_product/${pid}`);
      fetchProducts();
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to delete");
    }
  };

  const activeCat = categories.find((c) => c.cid === activeCategory);

  return (
    <div style={styles.page}>
      <div><Header/></div>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Products</h2>
          <p style={styles.subtitle}>Click a category to view products</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button onClick={() => navigate("/Dashboard")} style={styles.backBtn}>← Back</button>
          <button onClick={openAdd} style={styles.addBtn}>+ Add Product</button>
        </div>
      </div>

      {/* Category Cards */}
      <div style={{ ...styles.cardGrid, overflowX: "auto", paddingBottom: "8px" }}>
        {categories.map((cat) => {
          const selected = getTotalSelected(cat.cid);
          const isActive = activeCategory === cat.cid;
          return (
            <div
              key={cat.cid}
              onClick={() => setActiveCategory(isActive ? null : cat.cid)}
              style={{ ...styles.catCard, ...(isActive ? styles.catCardActive : {}) }}
            >
              <div style={styles.catIcon}>
                {cat.cname.charAt(0).toUpperCase()}
              </div>
              <div style={styles.catCardName}>{cat.cname}</div>
              <div style={styles.catCardCount}>
                {getProductsByCategory(cat.cid).length} items
              </div>
              {selected > 0 && (
                <div style={styles.selectedBadge}>{selected}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Product Section */}
      {activeCategory && activeCat && (
        <div style={styles.productSection}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionLeft}>
              <span style={styles.sectionTitle}>{activeCat.cname}</span>
              <span style={styles.sectionCount}>
                {getProductsByCategory(activeCategory).length} products
              </span>
            </div>
            <input
              type="text"
              placeholder={`Search in ${activeCat.cname}...`}
              value={searches[activeCategory] || ""}
              onChange={(e) =>
                setSearches((prev) => ({ ...prev, [activeCategory]: e.target.value }))
              }
              style={styles.searchInput}
            />
          </div>

          {/* Product Cards */}
          <div style={{ ...styles.productGrid, overflowY: "auto", maxHeight: "calc(100vh - 420px)" }}>
            {getFiltered(activeCategory).length === 0 ? (
              <div style={styles.emptyMsg}>
                No products yet. Click "+ Add Product" to add.
              </div>
            ) : (
              getFiltered(activeCategory).map((product) => {
                const qty = quantities[product.pid] || 0;
                const imgSrc = product.image_url ? `${API_BASE}${product.image_url}` : null;
                return (
                  <div key={product.pid} style={styles.productCard}>

                    {/* Product Image */}
                    <div style={styles.imageBox}>
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={product.product_name}
                          style={styles.productImg}
                        />
                      ) : (
                        <div style={styles.imagePlaceholder}>
                          {product.product_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div style={styles.productInfo}>
                      <div style={styles.productName}>{product.product_name}</div>
                      {product.unit && (
                        <div style={styles.productUnit}>{product.unit}</div>
                      )}
                      <div style={styles.productPrice}>
                        ₹{parseFloat(product.price).toFixed(2)}
                      </div>
                    </div>

                    {/* Quantity */}
                    <div style={styles.qtyRow}>
                      {qty === 0 ? (
                        <button
                          onClick={() => increase(product.pid)}
                          style={styles.addToCartBtn}
                        >
                          + Add
                        </button>
                      ) : (
                        <div style={styles.qtyControls}>
                          <button onClick={() => decrease(product.pid)} style={styles.qtyBtn}>−</button>
                          <span style={styles.qtyNumber}>{qty}</span>
                          <button onClick={() => increase(product.pid)} style={styles.qtyBtn}>+</button>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={styles.actionRow}>
                      <button onClick={() => openEdit(product)} style={styles.editBtn}>Edit</button>
                      <button onClick={() => handleDelete(product.pid, product.product_name)} style={styles.deleteBtn}>Delete</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>
              {editItem ? "Edit Product" : "Add New Product"}
            </h3>

            {/* Image Preview + Upload inside modal */}
            <div style={styles.modalImageBox}>
              {previewImage ? (
                <img src={previewImage} alt="preview" style={styles.modalImg} />
              ) : (
                <div style={styles.imgPlaceholderText}>No photo selected</div>
              )}
            </div>
            <div style={styles.fileRow}>
              <button type="button" onClick={openCamera} style={styles.fileBtn}>
                Take Photo
              </button>
              <label style={styles.fileBtn}>
                Choose from Gallery
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </label>
              {previewImage && (
                <button type="button" onClick={handleRemoveImage} style={styles.removeImgBtn}>
                  Remove
                </button>
              )}
            </div>
            {cameraError && <div style={styles.cameraErrorText}>{cameraError}</div>}

            <label style={styles.label}>Product Name *</label>
            <input
              type="text"
              placeholder="e.g. Sting, Thums Up, Biscuit"
              value={form.product_name}
              onChange={(e) => setForm({ ...form, product_name: e.target.value })}
              style={styles.input}
            />

            <label style={styles.label}>Category *</label>
            <select
              value={form.cid}
              onChange={(e) => setForm({ ...form, cid: e.target.value })}
              style={styles.input}
            >
              <option value="">-- Select Category --</option>
              {categories.map((cat) => (
                <option key={cat.cid} value={cat.cid}>{cat.cname}</option>
              ))}
            </select>

            <label style={styles.label}>Unit / Size (optional)</label>
            <input
              type="text"
              placeholder="e.g. 250ml, 500g, piece"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              style={styles.input}
            />

            <label style={styles.label}>Price (₹) *</label>
            <input
              type="number"
              placeholder="e.g. 20"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              style={styles.input}
              min="0"
              step="0.01"
            />

            <div style={styles.modalActions}>
              <button onClick={() => setShowModal(false)} style={styles.cancelBtn}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={loading} style={styles.saveBtn}>
                {loading ? "Saving..." : editItem ? "Update" : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Camera Overlay */}
      {showCamera && (
        <div style={styles.overlay}>
          <div style={styles.cameraBox}>
            <video ref={videoRef} autoPlay playsInline style={styles.cameraVideo} />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <div style={styles.modalActions}>
              <button onClick={closeCamera} style={styles.cancelBtn}>Cancel</button>
              <button onClick={capturePhoto} style={styles.saveBtn}>Capture</button>
            </div>
          </div>
        </div>
      )}
      <div><Footer/></div>
    </div>
  );
}

const styles = {
  page:             { padding: "24px", backgroundColor: "#f8fafc", minHeight: "100vh" },
  header:           { display: "flex", justifyContent: "space-between",
                      alignItems: "flex-start", marginBottom: "24px" },
  title:            { margin: 0, fontSize: "22px", fontWeight: "700", color: "#1e293b" },
  subtitle:         { margin: "4px 0 0", fontSize: "13px", color: "#64748b" },
  addBtn:           { padding: "10px 20px", backgroundColor: "#2563eb", color: "white",
                      border: "none", borderRadius: "8px", cursor: "pointer",
                      fontSize: "14px", fontWeight: "600" },
  cardGrid:         { display: "flex", flexWrap: "nowrap", gap: "14px", marginBottom: "28px",
                      overflowX: "auto", overflowY: "hidden", WebkitOverflowScrolling: "touch",
                      paddingBottom: "8px", minWidth: 0 },
  catCard:          { width: "130px", padding: "16px 12px", backgroundColor: "white",
                      borderRadius: "12px", border: "2px solid #e2e8f0",
                      cursor: "pointer", textAlign: "center",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)", position: "relative" },
  catCardActive:    { border: "2px solid #2563eb", backgroundColor: "#eff6ff",
                      boxShadow: "0 4px 12px rgba(37,99,235,0.15)" },
  catIcon:          { width: "42px", height: "42px", borderRadius: "50%",
                      backgroundColor: "#1e3a5f", color: "white",
                      fontSize: "18px", fontWeight: "700",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      margin: "0 auto 8px" },
  catCardName:      { fontSize: "13px", fontWeight: "700", color: "#1e293b", marginBottom: "3px" },
  catCardCount:     { fontSize: "11px", color: "#64748b" },
  selectedBadge:    { position: "absolute", top: "-8px", right: "-8px",
                      backgroundColor: "#2563eb", color: "white",
                      fontSize: "11px", fontWeight: "700",
                      padding: "2px 8px", borderRadius: "20px" },
  productSection:   { backgroundColor: "white", borderRadius: "12px",
                      boxShadow: "0 1px 6px rgba(0,0,0,0.07)", overflow: "hidden" },
  sectionHeader:    { display: "flex", justifyContent: "space-between",
                      alignItems: "center", padding: "14px 20px",
                      backgroundColor: "#1e3a5f" },
  sectionLeft:      { display: "flex", alignItems: "center", gap: "10px" },
  sectionTitle:     { fontSize: "16px", fontWeight: "700", color: "white" },
  sectionCount:     { fontSize: "12px", color: "#93c5fd",
                      backgroundColor: "rgba(255,255,255,0.15)",
                      padding: "2px 10px", borderRadius: "20px" },
  searchInput:      { padding: "8px 12px", border: "1px solid rgba(255,255,255,0.3)",
                      borderRadius: "6px", fontSize: "13px", width: "200px",
                      backgroundColor: "rgba(255,255,255,0.1)", color: "white", outline: "none" },
  productGrid:      { display: "flex", flexWrap: "wrap", gap: "16px", padding: "20px",
                      overflowY: "auto", maxHeight: "calc(100vh - 420px)" },
  productCard:      { width: "170px", backgroundColor: "white", border: "1px solid #e2e8f0",
                      borderRadius: "12px", overflow: "hidden",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                      display: "flex", flexDirection: "column" },
  imageBox:         { width: "100%", height: "120px", overflow: "hidden",
                      backgroundColor: "#f1f5f9" },
  productImg:       { width: "100%", height: "100%", objectFit: "cover" },
  imagePlaceholder: { width: "100%", height: "100%", display: "flex",
                      alignItems: "center", justifyContent: "center",
                      fontSize: "36px", fontWeight: "700", color: "#94a3b8",
                      backgroundColor: "#f1f5f9" },
  productInfo:      { padding: "10px 12px 6px" },
  productName:      { fontSize: "13px", fontWeight: "700", color: "#1e293b", marginBottom: "2px" },
  productUnit:      { fontSize: "11px", color: "#64748b", marginBottom: "4px" },
  productPrice:     { fontSize: "15px", fontWeight: "700", color: "#15803d" },
  qtyRow:           { padding: "6px 12px" },
  addToCartBtn:     { width: "100%", padding: "7px 0", backgroundColor: "#2563eb",
                      color: "white", border: "none", borderRadius: "6px",
                      cursor: "pointer", fontSize: "13px", fontWeight: "600" },
  qtyControls:      { display: "flex", alignItems: "center", justifyContent: "space-between",
                      backgroundColor: "#2563eb", borderRadius: "6px", padding: "4px 10px" },
  qtyBtn:           { background: "none", border: "none", color: "white",
                      fontSize: "18px", fontWeight: "700", cursor: "pointer", lineHeight: 1 },
  qtyNumber:        { color: "white", fontWeight: "700", fontSize: "15px",
                      minWidth: "20px", textAlign: "center" },
  actionRow:        { display: "flex", gap: "6px", padding: "6px 12px 12px" },
  editBtn:          { flex: 1, padding: "5px 0", backgroundColor: "#dbeafe",
                      color: "#1d4ed8", border: "none", borderRadius: "6px",
                      cursor: "pointer", fontSize: "12px", fontWeight: "600" },
  deleteBtn:        { flex: 1, padding: "5px 0", backgroundColor: "#fee2e2",
                      color: "#dc2626", border: "none", borderRadius: "6px",
                      cursor: "pointer", fontSize: "12px", fontWeight: "600" },
  emptyMsg:         { padding: "40px", color: "#9ca3af", fontSize: "14px",
                      textAlign: "center", width: "100%" },
  overlay:          { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)",
                      display: "flex", alignItems: "center",
                      justifyContent: "center", zIndex: 1000 },
  modal:            { backgroundColor: "white", borderRadius: "12px", padding: "28px",
                      width: "100%", maxWidth: "440px",
                      boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
                      maxHeight: "90vh", overflowY: "auto" },
  modalTitle:       { margin: "0 0 16px", fontSize: "18px",
                      fontWeight: "700", color: "#1e293b" },
  modalImageBox:    { width: "100%", height: "140px", backgroundColor: "#f1f5f9",
                      borderRadius: "8px", marginBottom: "10px", overflow: "hidden",
                      display: "flex", alignItems: "center", justifyContent: "center" },
  modalImg:         { width: "100%", height: "100%", objectFit: "cover" },
  imgPlaceholderText: { color: "#94a3b8", fontSize: "12px",
                        textAlign: "center", padding: "0 20px" },
  fileRow:          { display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "8px" },
  fileBtn:          { padding: "8px 14px", backgroundColor: "#dbeafe", color: "#1d4ed8",
                      borderRadius: "6px", cursor: "pointer", fontSize: "12.5px",
                      fontWeight: "600", textAlign: "center", border: "none" },
  removeImgBtn:     { padding: "8px 14px", backgroundColor: "#fee2e2", color: "#dc2626",
                      border: "none", borderRadius: "6px", cursor: "pointer",
                      fontSize: "12.5px", fontWeight: "600" },
  cameraErrorText:  { color: "#dc2626", fontSize: "12px", marginBottom: "12px" },
  cameraBox:        { backgroundColor: "white", borderRadius: "12px", padding: "20px",
                      width: "100%", maxWidth: "440px",
                      boxShadow: "0 10px 40px rgba(0,0,0,0.15)" },
  cameraVideo:      { width: "100%", borderRadius: "8px", backgroundColor: "#000" },
  label:            { display: "block", fontSize: "13px", fontWeight: "600",
                      color: "#374151", marginBottom: "6px" },
  input:            { width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1",
                      borderRadius: "8px", fontSize: "14px", marginBottom: "14px",
                      boxSizing: "border-box", outline: "none" },
  modalActions:     { display: "flex", gap: "10px",
                      justifyContent: "flex-end", marginTop: "6px" },
  cancelBtn:        { padding: "9px 18px", backgroundColor: "#f1f5f9",
                      color: "#374151", border: "none", borderRadius: "8px",
                      cursor: "pointer", fontSize: "14px" },
  saveBtn:          { padding: "9px 20px", backgroundColor: "#2563eb", color: "white",
                      border: "none", borderRadius: "8px", cursor: "pointer",
                      fontSize: "14px", fontWeight: "600" },
  backBtn:          { padding: "10px 18px", backgroundColor: "#e2e8f0", color: "#1f2937",
                      border: "none", borderRadius: "8px", cursor: "pointer",
                      fontSize: "14px", fontWeight: "700" },
};

export default Products;