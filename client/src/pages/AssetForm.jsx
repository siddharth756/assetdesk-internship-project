// Purpose: Create and Edit form for Hardware Assets with inline validation and duplicate serial handling
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { createAsset, getAssetById, updateAsset } from "../api/assets";
import { useToast } from "../context/ToastContext";
import FormField from "../components/FormField";
import Loader from "../components/Loader";

const CATEGORIES = ["LAPTOP", "DESKTOP", "MONITOR", "PRINTER", "NETWORK", "MOBILE", "OTHER"];

export default function AssetForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [assetTag, setAssetTag] = useState("");
  const [assetStatus, setAssetStatus] = useState("AVAILABLE");

  // Form inputs
  const [formData, setFormData] = useState({
    name: "",
    serialNumber: "",
    category: "LAPTOP",
    purchaseDate: "",
    warrantyExpiry: "",
    notes: ""
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isEdit) return;
    let isMounted = true;

    async function loadAsset() {
      try {
        const data = await getAssetById(id);
        if (!isMounted) return;
        setAssetTag(data.assetTag || "");
        setAssetStatus(data.status || "AVAILABLE");
        setFormData({
          name: data.name || "",
          serialNumber: data.serialNumber || "",
          category: data.category || "LAPTOP",
          purchaseDate: data.purchaseDate ? data.purchaseDate.split("T")[0] : "",
          warrantyExpiry: data.warrantyExpiry ? data.warrantyExpiry.split("T")[0] : "",
          notes: data.notes || ""
        });
      } catch (err) {
        showToast(err.message || "Failed to load asset details", "error");
        navigate("/assets");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAsset();
    return () => {
      isMounted = false;
    };
  }, [id, isEdit, navigate, showToast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = "Device name and model is required";
    }
    if (!formData.serialNumber.trim()) {
      newErrors.serialNumber = "Serial number is required";
    }
    if (!formData.category) {
      newErrors.category = "Category is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        serialNumber: formData.serialNumber.trim(),
        category: formData.category,
        purchaseDate: formData.purchaseDate || null,
        warrantyExpiry: formData.warrantyExpiry || null,
        notes: formData.notes.trim()
      };

      if (isEdit) {
        // If retired, only notes can be edited
        if (assetStatus === "RETIRED") {
          await updateAsset(id, { notes: formData.notes.trim() });
        } else {
          await updateAsset(id, payload);
        }
        showToast("Asset updated successfully", "success");
        navigate(`/assets/${id}`);
      } else {
        const created = await createAsset(payload);
        showToast(`Asset ${created.assetTag} created successfully`, "success");
        navigate(`/assets/${created._id}`);
      }
    } catch (err) {
      // Check if duplicate serial error
      if (err.status === 409 || err.message?.toLowerCase().includes("serial")) {
        setErrors((prev) => ({
          ...prev,
          serialNumber: "Serial number is already registered in the system"
        }));
      } else if (err.details && Array.isArray(err.details)) {
        const serverErrors = {};
        err.details.forEach((d) => {
          if (d.field) serverErrors[d.field] = d.message;
        });
        setErrors((prev) => ({ ...prev, ...serverErrors }));
      }
      showToast(err.message || "Failed to save asset", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loader text="Loading asset details..." />;
  }

  const isRetired = isEdit && assetStatus === "RETIRED";

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEdit ? `Edit Asset: ${assetTag}` : "Add New Hardware Asset"}</h1>
          <p className="page-subtitle">
            {isEdit
              ? "Update asset specifications and inventory metadata"
              : "Register a new hardware device into the central inventory"}
          </p>
        </div>
        <div className="page-actions">
          <Link to={isEdit ? `/assets/${id}` : "/assets"} className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </div>

      {isRetired && (
        <div className="card" style={{ marginBottom: "1.25rem", borderLeft: "4px solid var(--color-warning)" }}>
          <div className="card-body">
            <strong>Note:</strong> This asset is <strong>RETIRED</strong>. Per policy, only the internal notes field can be modified.
          </div>
        </div>
      )}

      <div className="card" style={{ maxWidth: "720px" }}>
        <div className="card-body">
          <form onSubmit={handleSubmit} noValidate>
            <FormField label="Asset Name / Model" id="name" required error={errors.name}>
              <input
                type="text"
                id="name"
                name="name"
                className={`form-control ${errors.name ? "error" : ""}`}
                placeholder="e.g. Dell Latitude 5440"
                value={formData.name}
                onChange={handleChange}
                disabled={submitting || isRetired}
              />
            </FormField>

            <FormField
              label="Serial Number"
              id="serialNumber"
              required
              error={errors.serialNumber}
              hint="Must be unique across all inventory items"
            >
              <input
                type="text"
                id="serialNumber"
                name="serialNumber"
                className={`form-control ${errors.serialNumber ? "error" : ""}`}
                placeholder="e.g. SN-DELL-883920"
                value={formData.serialNumber}
                onChange={handleChange}
                disabled={submitting || isRetired}
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
                  disabled={submitting || isRetired}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Purchase Date" id="purchaseDate" error={errors.purchaseDate}>
                <input
                  type="date"
                  id="purchaseDate"
                  name="purchaseDate"
                  className="form-control"
                  value={formData.purchaseDate}
                  onChange={handleChange}
                  disabled={submitting || isRetired}
                />
              </FormField>
            </div>

            <FormField label="Warranty Expiry Date" id="warrantyExpiry" error={errors.warrantyExpiry}>
              <input
                type="date"
                id="warrantyExpiry"
                name="warrantyExpiry"
                className="form-control"
                value={formData.warrantyExpiry}
                onChange={handleChange}
                disabled={submitting || isRetired}
              />
            </FormField>

            <FormField label="Notes & Configuration Details" id="notes" error={errors.notes}>
              <textarea
                id="notes"
                name="notes"
                rows="4"
                className="form-control"
                placeholder="Include specs, accessories, purchase order, or location..."
                value={formData.notes}
                onChange={handleChange}
                disabled={submitting}
              />
            </FormField>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
              <Link to={isEdit ? `/assets/${id}` : "/assets"} className="btn btn-secondary">
                Cancel
              </Link>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Saving..." : isEdit ? "Update Asset" : "Register Asset"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
