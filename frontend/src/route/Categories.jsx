import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { isAllowedName } from "../utils/validation";
import Header from "../components/Hader";
import Footer from "../components/Footer";
import "../style/categories.css";

/* ── tiny presentational icons (no new dependency) ── */
const IconTag = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
    <circle cx="7.5" cy="7.5" r="1.5" fill="white" stroke="none" />
  </svg>
);
const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);
const IconRefresh = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M8 16H3v5" />
  </svg>
);
const IconLayers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 2 9 5-9 5-9-5z" /><path d="m3 12 9 5 9-5" /><path d="m3 17 9 5 9-5" />
  </svg>
);
const IconFileText = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z" /><path d="M14 2v6h6" />
  </svg>
);
const IconClock = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
  </svg>
);
const IconFolderOpen = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2" />
  </svg>
);
const IconInbox = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
  </svg>
);
const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
);
const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

/* Purely cosmetic count-up used only for the stat cards (no business logic involved) */
function useCountUp(target, durationMs = 600) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const from = 0;
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

function StatCard({ icon, value, label }) {
  const animated = useCountUp(value);
  return (
    <div className="cm-stat-card">
      <div className="cm-stat-icon">{icon}</div>
      <div className="cm-stat-value">{animated}</div>
      <div className="cm-stat-label">{label}</div>
    </div>
  );
}

function Categories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [search, setSearch]         = useState("");
  const [showModal, setShowModal]   = useState(false);
  const [editItem, setEditItem]     = useState(null);
  const [form, setForm]             = useState({ cname: "", description: "" });
  const [loading, setLoading]       = useState(false);

  // Cosmetic-only UI state: first-load skeleton + refresh spin animation.
  // Neither affects data fetching, validation, or business logic.
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing]     = useState(false);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get("/categories/get_category");
      setCategories(res.data);
    } catch {
      alert("Failed to load categories");
    } finally {
      setInitialLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchCategories();
    setTimeout(() => setIsRefreshing(false), 500);
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

  // Derived-only stats — computed purely from existing `categories` data.
  // No new fields, endpoints, or stored state are introduced.
  const withDescription = categories.filter(c => c.description && c.description.trim()).length;
  const withoutDescription = categories.length - withDescription;
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const addedThisWeek = categories.filter(c => c.created_at && new Date(c.created_at).getTime() >= oneWeekAgo).length;

  return (
    <div className="cm-page">
      <div><Header /></div>

      <div className="cm-container">
        {/* Breadcrumb */}
        <div className="cm-breadcrumb">
          <button onClick={() => navigate("/Dashboard")}>Dashboard</button>
          <span>/</span>
          <span className="cm-crumb-current">Categories</span>
        </div>

        {/* Header card */}
        <div className="cm-header-card">
          <div className="cm-header-top">
            <div className="cm-title-row">
              <div className="cm-icon-badge"><IconTag /></div>
              <div>
                <h2 className="cm-title">Category Management</h2>
                <p className="cm-subtitle">Organize your products into categories for faster billing and cleaner stock tracking.</p>
              </div>
            </div>
            <div className="cm-header-actions">
              <button onClick={() => navigate("/Dashboard")} className="cm-back-btn">← Back</button>
            </div>
          </div>

          <div className="cm-chip-row">
            <div className="cm-chip"><span className="cm-chip-dot" />{categories.length} total categories</div>
            <div className="cm-chip"><span className="cm-chip-dot" />{withDescription} described</div>
            <div className="cm-chip"><span className="cm-chip-dot" />{addedThisWeek} added this week</div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="cm-stats-grid">
          <StatCard icon={<IconLayers />} value={categories.length} label="Total Categories" />
          <StatCard icon={<IconFileText />} value={withDescription} label="With Description" />
          <StatCard icon={<IconFolderOpen />} value={withoutDescription} label="Without Description" />
          <StatCard icon={<IconClock />} value={addedThisWeek} label="Added This Week" />
        </div>

        {/* Toolbar */}
        <div className="cm-toolbar">
          <div className="cm-search-wrap">
            <IconSearch />
            <input
              type="text"
              placeholder="Search categories..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="cm-search-input"
            />
          </div>
          <div className="cm-toolbar-right">
            <span className="cm-count-badge">{filtered.length} categories</span>
            <button
              onClick={handleRefresh}
              className={`cm-icon-btn ${isRefreshing ? "spinning" : ""}`}
              title="Refresh"
              aria-label="Refresh categories"
            >
              <IconRefresh />
            </button>
            <button onClick={openAdd} className="cm-add-btn">+ Add Category</button>
          </div>
        </div>

        {/* Table */}
        <div className="cm-table-card">
          <div className="cm-table-scroll">
            <table className="cm-table">
              <thead className="cm-thead">
                <tr>
                  <th className="cm-th">#</th>
                  <th className="cm-th">Category Name</th>
                  <th className="cm-th">Description</th>
                  <th className="cm-th">Created</th>
                  <th className="cm-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {initialLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr className="cm-skeleton-row" key={`sk-${i}`}>
                      <td><div className="cm-skeleton-bar" style={{ width: "16px" }} /></td>
                      <td><div className="cm-skeleton-bar" style={{ width: "140px" }} /></td>
                      <td><div className="cm-skeleton-bar" style={{ width: "220px" }} /></td>
                      <td><div className="cm-skeleton-bar" style={{ width: "90px" }} /></td>
                      <td><div className="cm-skeleton-bar" style={{ width: "110px" }} /></td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="cm-empty-state">
                        <IconInbox />
                        <h4>No categories found</h4>
                        <p>
                          {search
                            ? "Try a different search term, or clear the search to see all categories."
                            : "Create your first category to start organizing your products."}
                        </p>
                        <button onClick={openAdd} className="cm-add-btn">+ Add Category</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((cat, index) => (
                    <tr key={cat.cid} className="cm-row">
                      <td className="cm-td cm-td-index">{index + 1}</td>
                      <td className="cm-td">
                        <div className="cm-name-cell">
                          <div className="cm-avatar">{cat.cname.charAt(0).toUpperCase()}</div>
                          <span className="cm-cat-name">{cat.cname}</span>
                        </div>
                      </td>
                      <td className="cm-td cm-desc-cell">
                        {cat.description || <span className="cm-empty-value">—</span>}
                      </td>
                      <td className="cm-td cm-date-cell">
                        {new Date(cat.created_at).toLocaleDateString("en-IN")}
                      </td>
                      <td className="cm-td">
                        <div className="cm-actions">
                          <button onClick={() => openEdit(cat)} className="cm-action-btn cm-edit-btn" title="Edit category">
                            <IconEdit /> Edit
                          </button>
                          <button onClick={() => handleDelete(cat.cid, cat.cname)} className="cm-action-btn cm-delete-btn" title="Delete category">
                            <IconTrash /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="cm-modal-overlay">
          <div className="cm-modal">
            <div className="cm-modal-header">
              <h3>{editItem ? "Edit Category" : "Add New Category"}</h3>
              <p>{editItem ? "Update the details for this category." : "Create a category to group related products."}</p>
            </div>

            <div className="cm-modal-body">
              <div className="cm-field">
                <label>Category Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Drinks, Biscuits, Ice Cream"
                  value={form.cname}
                  onChange={e => setForm({ ...form, cname: e.target.value })}
                />
              </div>

              <div className="cm-field">
                <label>Description (optional)</label>
                <textarea
                  placeholder="Short description..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            <div className="cm-modal-actions">
              <button onClick={() => setShowModal(false)} className="cm-cancel-btn">
                Cancel
              </button>
              <button onClick={handleSave} disabled={loading} className="cm-save-btn">
                {loading ? "Saving..." : editItem ? "Update" : "Add Category"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div><Footer /></div>
    </div>
  );
}

export default Categories;