import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { isAllowedName, isNonNegativeNumber } from "../utils/validation";
import Header from "../components/Hader";
import Footer from "../components/Footer";
import "../style/products.css";
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
    <div className="products-page">
      <div><Header/></div>
      {/* Header */}
      <div className="products-header">
        <div>
          <h2 className="products-title">Products</h2>
          <p className="products-subtitle">Click a category to view products</p>
        </div>
        <div className="header-actions">
          <button onClick={() => navigate("/Dashboard")} className="back-btn">← Back</button>
          <button onClick={openAdd} className="add-product-btn">+ Add Product</button>
        </div>
      </div>

      {/* Category Cards */}
      <div className="category-grid">
        {categories.map((cat) => {
          const selected = getTotalSelected(cat.cid);
          const isActive = activeCategory === cat.cid;
          return (
            <div
              key={cat.cid}
              onClick={() => setActiveCategory(isActive ? null : cat.cid)}
              className={`category-card ${isActive ? "active" : ""}`}
            >
              <div className="category-icon">
                {cat.cname.charAt(0).toUpperCase()}
              </div>
              <div className="category-name">{cat.cname}</div>
              <div className="category-count">
                {getProductsByCategory(cat.cid).length} items
              </div>
              {selected > 0 && (
                <div className="selected-badge">{selected}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Product Section */}
      {activeCategory && activeCat && (
        <div className="product-section">
          <div className="section-header">
            <div className="section-left">
              <span className="section-title">{activeCat.cname}</span>
              <span className="section-count">
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
              className="search-input"
            />
          </div>

          {/* Product Cards */}
          <div className="product-grid">
            {getFiltered(activeCategory).length === 0 ? (
              <div className="empty-msg">
                No products yet. Click "+ Add Product" to add.
              </div>
            ) : (
              getFiltered(activeCategory).map((product) => {
                const qty = quantities[product.pid] || 0;
                const imgSrc = product.image_url ? `${API_BASE}${product.image_url}` : null;
                return (
                  <div key={product.pid} className="product-card">

                    {/* Product Image */}
                    <div className="image-box">
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={product.product_name}
                          className="product-img"
                        />
                      ) : (
                        <div className="image-placeholder">
                          {product.product_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="product-info">
                      <div className="product-name">{product.product_name}</div>
                      {product.unit && (
                        <div className="product-unit">{product.unit}</div>
                      )}
                      <div className="product-price">
                        ₹{parseFloat(product.price).toFixed(2)}
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="qty-row">
                      {qty === 0 ? (
                        <button
                          onClick={() => increase(product.pid)}
                          className="add-to-cart-btn"
                        >
                          + Add
                        </button>
                      ) : (
                        <div className="qty-controls">
                          <button onClick={() => decrease(product.pid)} className="qty-btn">−</button>
                          <span className="qty-number">{qty}</span>
                          <button onClick={() => increase(product.pid)} className="qty-btn">+</button>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="action-row">
                      <button onClick={() => openEdit(product)} className="edit-btn">Edit</button>
                      <button onClick={() => handleDelete(product.pid, product.product_name)} className="delete-btn">Delete</button>
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
        <div className="modal-overlay">
          <div className="modal-box">
            <h3 className="modal-title">
              {editItem ? "Edit Product" : "Add New Product"}
            </h3>

            {/* Image Preview + Upload inside modal */}
            <div className="modal-image-box">
              {previewImage ? (
                <img src={previewImage} alt="preview" className="modal-img" />
              ) : (
                <div className="img-placeholder-text">No photo selected</div>
              )}
            </div>
            <div className="file-row">
              <button type="button" onClick={openCamera} className="file-btn">
                Take Photo
              </button>
              <label className="file-btn">
                Choose from Gallery
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </label>
              {previewImage && (
                <button type="button" onClick={handleRemoveImage} className="remove-img-btn">
                  Remove
                </button>
              )}
            </div>
            {cameraError && <div className="camera-error-text">{cameraError}</div>}

            <label className="form-label">Product Name *</label>
            <input
              type="text"
              placeholder="e.g. Sting, Thums Up, Biscuit"
              value={form.product_name}
              onChange={(e) => setForm({ ...form, product_name: e.target.value })}
              className="form-input"
            />

            <label className="form-label">Category *</label>
            <select
              value={form.cid}
              onChange={(e) => setForm({ ...form, cid: e.target.value })}
              className="form-input"
            >
              <option value="">-- Select Category --</option>
              {categories.map((cat) => (
                <option key={cat.cid} value={cat.cid}>{cat.cname}</option>
              ))}
            </select>

            <label className="form-label">Unit / Size (optional)</label>
            <input
              type="text"
              placeholder="e.g. 250ml, 500g, piece"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="form-input"
            />

            <label className="form-label">Price (₹) *</label>
            <input
              type="number"
              placeholder="e.g. 20"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="form-input"
              min="0"
              step="0.01"
            />

            <div className="modal-actions">
              <button onClick={() => setShowModal(false)} className="cancel-btn">
                Cancel
              </button>
              <button onClick={handleSave} disabled={loading} className="save-btn">
                {loading ? "Saving..." : editItem ? "Update" : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Camera Overlay */}
      {showCamera && (
        <div className="modal-overlay">
          <div className="camera-box">
            <video ref={videoRef} autoPlay playsInline className="camera-video" />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <div className="modal-actions">
              <button onClick={closeCamera} className="cancel-btn">Cancel</button>
              <button onClick={capturePhoto} className="save-btn">Capture</button>
            </div>
          </div>
        </div>
      )}
      <div><Footer/></div>
    </div>
  );
}

export default Products;