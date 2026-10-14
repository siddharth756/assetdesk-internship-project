// Purpose: Employee view of personal assigned hardware assets
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getMyAssets } from "../api/assets";
import { useToast } from "../context/ToastContext";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";

export default function MyAssets() {
  const { showToast } = useToast();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const data = await getMyAssets();
        if (isMounted) setAssets(data || []);
      } catch (err) {
        showToast(err.message || "Failed to load assigned assets", "error");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [showToast]);

  const columns = [
    {
      header: "Asset Tag",
      key: "assetTag",
      render: (val) => <span style={{ fontWeight: 600, color: "var(--color-primary)" }}>{val}</span>
    },
    { header: "Device Name / Model", key: "name" },
    {
      header: "Category",
      key: "category",
      render: (val) => <span className="badge badge-neutral">{val}</span>
    },
    {
      header: "Status",
      key: "status",
      render: (val) => <StatusBadge status={val} />
    },
    {
      header: "Serial Number",
      key: "serialNumber"
    },
    {
      header: "Notes & Instructions",
      key: "notes",
      render: (val) => val || "-"
    }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Assigned Assets</h1>
          <p className="page-subtitle">Hardware devices currently assigned to your profile</p>
        </div>
        <div className="page-actions">
          <Link to="/tickets/new" className="btn btn-secondary btn-sm">
            Report an Issue
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <DataTable
            columns={columns}
            data={assets}
            loading={loading}
            emptyTitle="No assigned assets"
            emptyDescription="You do not currently have any hardware devices assigned to your profile."
          />
        </div>
      </div>
    </div>
  );
}
