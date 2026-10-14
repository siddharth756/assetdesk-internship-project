// Purpose: Software License creation form with validation and seat controls
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createLicense } from "../api/licenses";
import { useToast } from "../context/ToastContext";
import FormField from "../components/FormField";

export default function LicenseForm() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    softwareName: "",
    vendor: "",
    licenseKey: "",
    totalSeats: "1",
    expiryDate: "",
    notes: ""
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.softwareName.trim()) {
      errs.softwareName = "Software name is required";
    }
    if (!formData.licenseKey.trim()) {
      errs.licenseKey = "License / product key is required";
    }
    const seats = parseInt(formData.totalSeats, 10);
    if (isNaN(seats) || seats < 1) {
      errs.totalSeats = "Total seats must be a positive integer (minimum 1)";
    }
    if (!formData.expiryDate) {
      errs.expiryDate = "License expiry date is required";
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
        softwareName: formData.softwareName.trim(),
        vendor: formData.vendor.trim(),
        licenseKey: formData.licenseKey.trim(),
        totalSeats: parseInt(formData.totalSeats, 10),
        expiryDate: formData.expiryDate,
        notes: formData.notes.trim()
      };

      const created = await createLicense(payload);
      showToast(`License for ${created.softwareName} added successfully`, "success");
      navigate(`/licenses/${created._id}`);
    } catch (err) {
      if (err.details && Array.isArray(err.details)) {
        const serverErrors = {};
        err.details.forEach((d) => {
          if (d.field) serverErrors[d.field] = d.message;
        });
        setErrors((prev) => ({ ...prev, ...serverErrors }));
      }
      showToast(err.message || "Failed to create license", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Add New Software License</h1>
          <p className="page-subtitle">Register a software license subscription and set seat capacity</p>
        </div>
        <div className="page-actions">
          <Link to="/licenses" className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </div>

      <div className="card" style={{ maxWidth: "720px" }}>
        <div className="card-body">
          <form onSubmit={handleSubmit} noValidate>
            <FormField label="Software Name" id="softwareName" required error={errors.softwareName}>
              <input
                type="text"
                id="softwareName"
                name="softwareName"
                className={`form-control ${errors.softwareName ? "error" : ""}`}
                placeholder="e.g. JetBrains IntelliJ IDEA Ultimate"
                value={formData.softwareName}
                onChange={handleChange}
                disabled={submitting}
              />
            </FormField>

            <FormField label="Vendor / Publisher" id="vendor" error={errors.vendor}>
              <input
                type="text"
                id="vendor"
                name="vendor"
                className="form-control"
                placeholder="e.g. JetBrains, Microsoft, Adobe"
                value={formData.vendor}
                onChange={handleChange}
                disabled={submitting}
              />
            </FormField>

            <FormField
              label="License / Product Key"
              id="licenseKey"
              required
              error={errors.licenseKey}
              hint="Only system administrators will have permission to reveal this key"
            >
              <input
                type="text"
                id="licenseKey"
                name="licenseKey"
                className={`form-control ${errors.licenseKey ? "error" : ""}`}
                placeholder="e.g. ABCD-EFGH-1234-5678"
                value={formData.licenseKey}
                onChange={handleChange}
                disabled={submitting}
              />
            </FormField>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <FormField
                label="Total Seat Capacity"
                id="totalSeats"
                required
                error={errors.totalSeats}
                hint="Total number of employees permitted"
              >
                <input
                  type="number"
                  id="totalSeats"
                  name="totalSeats"
                  min="1"
                  className={`form-control ${errors.totalSeats ? "error" : ""}`}
                  value={formData.totalSeats}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </FormField>

              <FormField
                label="Subscription Expiry Date"
                id="expiryDate"
                required
                error={errors.expiryDate}
              >
                <input
                  type="date"
                  id="expiryDate"
                  name="expiryDate"
                  className={`form-control ${errors.expiryDate ? "error" : ""}`}
                  value={formData.expiryDate}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </FormField>
            </div>

            <FormField label="Notes & Purchase Details" id="notes" error={errors.notes}>
              <textarea
                id="notes"
                name="notes"
                rows="3"
                className="form-control"
                placeholder="Order number, support contract, or license terms..."
                value={formData.notes}
                onChange={handleChange}
                disabled={submitting}
              />
            </FormField>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
              <Link to="/licenses" className="btn btn-secondary">
                Cancel
              </Link>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Saving..." : "Add License"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
