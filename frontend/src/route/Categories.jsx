import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { isAllowedName } from "../utils/validation";
import Header from "../components/Hader";
import Footer from "../components/Footer";
function Categories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [search, setSearch]         = useState("");
  const [showModal, setShowModal]   = useState(false);
  const [editItem, setEditItem]     = useState(null);
  const [form, setForm]             = useState({ cname: "", description: "" });
  const [loading, setLoading]       = useState(false);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get("/categories/get_category");
      setCategories(res.data);
    } catch {
      alert("Failed to load categories");
    }
  };

  const openAdd = () => {
    setEditItem(null);
    setForm({ cname: "", description: "" });
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setEditItem(cat);
    setForm({ cname: cat.cname, description: cat.description || "" });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.cname.trim()) {
      alert("Category name is required");
      return;
    }
    if (!isAllowedName(form.cname)) {
      alert("Category name must contain letters and may include numbers/spaces, but cannot be only numbers or special symbols.");
      return;
    }
    try {
      setLoading(true);
      if (editItem) {
        await api.patch(`/categories/update_category/${editItem.cid}`, form);
      } else {
        await api.post("/categories/create_category", form);
      }
      setShowModal(false);
      fetchCategories();
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to save category");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cid, cname) => {
    const typed = window.prompt(
      `⚠️ To delete this category permanently, type the category name exactly:\n\n${cname}`
    );
    if (typed === null) return;
    if (typed.trim() !== cname.trim()) {
      alert("Category name did not match. Delete canceled.");
      return;
    }
    try {
      await api.delete(`/categories/delete_category/${cid}`);
      fetchCategories();
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to delete");
    }
  };

  const filtered = categories.filter(c =>
    c.cname.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={styles.page}>
        <div><Header/></div>
      {/* Header */}
      <div style={{ ...styles.header, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={() => navigate("/Dashboard")} style={styles.backBtn}>
          ← Back
        </button>
        <div style={{ flex: "1 1 auto", minWidth: "240px" }}>
          <h2 style={styles.title}>Categories</h2>
          <p style={styles.subtitle}>Manage your product categories</p>
        </div>
        <button onClick={openAdd} style={styles.addBtn}>+ Add Category</button>
      </div>

      {/* Search */}
      <div style={styles.searchRow}>
        <input
          type="text"
          placeholder="Search categories..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <span style={styles.countBadge}>{filtered.length} categories</span>
      </div>

      {/* Table */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.theadRow}>
              <th style={styles.th}>#</th>
              <th style={styles.th}>Category Name</th>
              <th style={styles.th}>Description</th>
              <th style={styles.th}>Created At</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={styles.emptyRow}>
                  No categories found. Click "+ Add Category" to create one.
                </td>
              </tr>
            ) : (
              filtered.map((cat, index) => (
                <tr key={cat.cid} style={styles.tbodyRow}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f8fafc"}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = "white"}
                >
                  <td style={styles.td}>{index + 1}</td>
                  <td style={styles.td}>
                    <span style={styles.catName}>{cat.cname}</span>
                  </td>
                  <td style={styles.td}>
                    {cat.description || <span style={{ color: "#9ca3af" }}>—</span>}
                  </td>
                  <td style={styles.td}>
                    {new Date(cat.created_at).toLocaleDateString("en-IN")}
                  </td>
                  <td style={styles.td}>
                    <button onClick={() => openEdit(cat)} style={styles.editBtn}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(cat.cid, cat.cname)}
                      style={styles.deleteBtn}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>
              {editItem ? "Edit Category" : "Add New Category"}
            </h3>

            <label style={styles.label}>Category Name *</label>
            <input
              type="text"
              placeholder="e.g. Drinks, Biscuits, Ice Cream"
              value={form.cname}
              onChange={e => setForm({ ...form, cname: e.target.value })}
              style={styles.input}
            />

            <label style={styles.label}>Description (optional)</label>
            <textarea
              placeholder="Short description..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              style={styles.textarea}
              rows={3}
            />

            <div style={styles.modalActions}>
              <button onClick={() => setShowModal(false)} style={styles.cancelBtn}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={loading} style={styles.saveBtn}>
                {loading ? "Saving..." : editItem ? "Update" : "Add Category"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div>
        <Footer/>
      </div>
    </div>
  );
}

const styles = {
  page:         { padding: "24px", backgroundColor: "#f8fafc", minHeight: "100vh" },
  header:       { display: "flex", justifyContent: "space-between",
                  alignItems: "flex-start", marginBottom: "20px" },
  title:        { margin: 0, fontSize: "22px", fontWeight: "700", color: "#1e293b" },
  subtitle:     { margin: "4px 0 0", fontSize: "13px", color: "#64748b" },
  addBtn:       { padding: "10px 20px", backgroundColor: "#2563eb", color: "white",
                  border: "none", borderRadius: "8px", cursor: "pointer",
                  fontSize: "14px", fontWeight: "600" },
  searchRow:    { display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" },
  searchInput:  { padding: "9px 14px", border: "1px solid #cbd5e1", borderRadius: "8px",
                  fontSize: "14px", width: "280px", outline: "none" },
  countBadge:   { fontSize: "13px", color: "#64748b", backgroundColor: "#e2e8f0",
                  padding: "4px 10px", borderRadius: "20px" },
  tableWrapper: { backgroundColor: "white", borderRadius: "10px",
                  boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
                  overflowX: "auto", overflowY: "auto",
                  maxHeight: "calc(100vh - 280px)" },
  table:        { width: "100%", borderCollapse: "collapse" },
  theadRow:     { backgroundColor: "#f1f5f9" },
  th:           { padding: "12px 16px", textAlign: "left", fontSize: "12px",
                  fontWeight: "700", color: "#475569", textTransform: "uppercase",
                  letterSpacing: "0.5px", borderBottom: "1px solid #e2e8f0" },
  tbodyRow:     { borderBottom: "1px solid #f1f5f9", backgroundColor: "white" },
  td:           { padding: "13px 16px", fontSize: "14px", color: "#374151" },
  catName:      { fontWeight: "600", color: "#1e293b" },
  emptyRow:     { padding: "40px", textAlign: "center",
                  color: "#9ca3af", fontSize: "14px" },
  editBtn:      { padding: "5px 14px", backgroundColor: "#dbeafe", color: "#1d4ed8",
                  border: "none", borderRadius: "6px", cursor: "pointer",
                  fontSize: "13px", fontWeight: "600", marginRight: "6px" },
  deleteBtn:    { padding: "5px 14px", backgroundColor: "#fee2e2", color: "#dc2626",
                  border: "none", borderRadius: "6px", cursor: "pointer",
                  fontSize: "13px", fontWeight: "600" },
  overlay:      { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  zIndex: 1000 },
  modal:        { backgroundColor: "white", borderRadius: "12px", padding: "28px",
                  width: "100%", maxWidth: "440px",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.15)" },
  modalTitle:   { margin: "0 0 20px", fontSize: "18px",
                  fontWeight: "700", color: "#1e293b" },
  label:        { display: "block", fontSize: "13px", fontWeight: "600",
                  color: "#374151", marginBottom: "6px" },
  input:        { width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1",
                  borderRadius: "8px", fontSize: "14px", marginBottom: "14px",
                  boxSizing: "border-box", outline: "none" },
  textarea:     { width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1",
                  borderRadius: "8px", fontSize: "14px", marginBottom: "20px",
                  boxSizing: "border-box", outline: "none", resize: "vertical" },
  modalActions: { display: "flex", gap: "10px", justifyContent: "flex-end" },
  cancelBtn:    { padding: "9px 18px", backgroundColor: "#f1f5f9", color: "#374151",
                  border: "none", borderRadius: "8px", cursor: "pointer",
                  fontSize: "14px" },
  saveBtn:      { padding: "9px 20px", backgroundColor: "#2563eb", color: "white",
                  border: "none", borderRadius: "8px", cursor: "pointer",
                  fontSize: "14px", fontWeight: "600" },
  backBtn:      { padding: "8px 16px", backgroundColor: "#e2e8f0", color: "#1f2937",
                  border: "none", borderRadius: "8px", cursor: "pointer",
                  fontSize: "13px", fontWeight: "700" },
};

export default Categories;