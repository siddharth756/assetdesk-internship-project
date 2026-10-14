// Purpose: Support Ticket creation form with SLA priority selectors and optional asset picker for staff
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createTicket } from "../api/tickets";
import { getAssets } from "../api/assets";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import FormField from "../components/FormField";

const CATEGORIES = ["HARDWARE", "SOFTWARE", "NETWORK", "ACCESS", "OTHER"];
const PRIORITIES = [
  { value: "LOW", label: "LOW (72h SLA)" },
  { value: "MEDIUM", label: "MEDIUM (48h SLA)" },
  { value: "HIGH", label: "HIGH (24h SLA)" },
  { value: "CRITICAL", label: "CRITICAL (4h SLA)" }
];

export default function TicketForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [assetsList, setAssetsList] = useState([]);

  const isStaff = user?.role === "ADMIN" || user?.role === "IT_SUPPORT";

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "HARDWARE",
    priority: "MEDIUM",
    relatedAsset: ""
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isStaff) return;
    let isMounted = true;
    async function loadAssets() {
      try {
        const res = await getAssets({ limit: 100 });
        if (isMounted) setAssetsList(res.data || []);
      } catch (err) {
        console.error("Failed to load asset directory:", err.message);
      }
    }
    loadAssets();
    return () => {
      isMounted = false;
    };
  }, [isStaff]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.title.trim() || formData.title.trim().length < 5) {
      errs.title = "Title must be at least 5 characters";
    }
    if (!formData.description.trim()) {
      errs.description = "Detailed issue description is required";
    }
    if (!formData.category) {
      errs.category = "Category is required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        priority: formData.priority,
        relatedAsset: formData.relatedAsset || null
      };

      const created = await createTicket(payload);
      showToast(`Support ticket ${created.ticketCode} created successfully`, "success");
      navigate(`/tickets/${created._id}`);
    } catch (err) {
      if (err.details && Array.isArray(err.details)) {
        const serverErrors = {};
        err.details.forEach((d) => {
          if (d.field) serverErrors[d.field] = d.message;
        });
        setErrors((prev) => ({ ...prev, ...serverErrors }));
      }
      showToast(err.message || "Failed to submit ticket", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Create Support Ticket</h1>
          <p className="page-subtitle">Submit a technical support request or incident ticket</p>
        </div>
        <div className="page-actions">
          <Link to="/tickets" className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </div>

      <div className="card" style={{ maxWidth: "760px" }}>
        <div className="card-body">
          <form onSubmit={handleSubmit} noValidate>
            <FormField
              label="Issue Summary / Title"
              id="title"
              required
              error={errors.title}
              hint="Brief summary of the issue (5–150 characters)"
            >
              <input
                type="text"
                id="title"
                name="title"
                className={`form-control ${errors.title ? "error" : ""}`}
                placeholder="e.g. Laptop monitor flickering after docking"
                value={formData.title}
                onChange={handleChange}
                disabled={submitting}
                maxLength={150}
              />
            </FormField>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <FormField label="Category" id="category" required error={errors.category}>
                <select
                  id="category"
                  name="category"
                  className={`form-control ${errors.category ? "error" : ""}`}
                  value={formData.category}
                  onChange={handleChange}
                  disabled={submitting}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                label="Priority Level"
                id="priority"
                required
                error={errors.priority}
                hint="Target resolution SLA timeframe"
              >
                <select
                  id="priority"
                  name="priority"
                  className="form-control"
                  value={formData.priority}
                  onChange={handleChange}
                  disabled={submitting}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            {/* Optional related asset picker only for ADMIN/IT_SUPPORT */}
            {isStaff && (
              <FormField
                label="Related Hardware Asset (Optional)"
                id="relatedAsset"
                hint="Link an inventory device to this ticket for context"
              >
                <select
                  id="relatedAsset"
                  name="relatedAsset"
                  className="form-control"
                  value={formData.relatedAsset}
                  onChange={handleChange}
                  disabled={submitting}
                >
                  <option value="">-- None / Not Asset-Related --</option>
                  {assetsList.map((ast) => (
                    <option key={ast._id} value={ast._id}>
                      {ast.assetTag} - {ast.name} ({ast.serialNumber})
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            <FormField
              label="Detailed Description"
              id="description"
              required
              error={errors.description}
              hint="Describe steps to reproduce, errors observed, and urgency details (up to 2000 characters)"
            >
              <textarea
                id="description"
                name="description"
                rows="6"
                className={`form-control ${errors.description ? "error" : ""}`}
                placeholder="Provide complete details regarding the problem..."
                value={formData.description}
                onChange={handleChange}
                disabled={submitting}
                maxLength={2000}
              />
            </FormField>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
              <Link to="/tickets" className="btn btn-secondary">
                Cancel
              </Link>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Ticket"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
