// Purpose: CSV export reports page allowing authorized staff to download data dumps
import { useState } from "react";
import { downloadReport } from "../api/reports";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Reports() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [downloading, setDownloading] = useState({});

  const isAdmin = user?.role === "ADMIN";

  const handleDownload = async (type, filenamePrefix) => {
    setDownloading((prev) => ({ ...prev, [type]: true }));
    try {
      const blob = await downloadReport(type);
      const url = window.URL.createObjectURL(new Blob([blob], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().split("T")[0];
      a.download = `${filenamePrefix}_${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast(`Downloaded ${filenamePrefix} CSV successfully`, "success");
    } catch (err) {
      showToast(err.message || `Failed to download ${type} report`, "error");
    } finally {
      setDownloading((prev) => ({ ...prev, [type]: false }));
    }
  };

  const reportsList = [
    {
      id: "assets",
      title: "Hardware Assets Inventory",
      filename: "hardware_assets_report",
      desc: "Complete inventory dump including asset tags, models, categories, statuses, serials, and current user assignments.",
      roleRestricted: false
    },
    {
      id: "licenses",
      title: "Software Licenses & Seats",
      filename: "software_licenses_report",
      desc: "Software subscription registry detailing vendor names, total capacities, allocated seat counts, and expiry dates.",
      roleRestricted: false
    },
    {
      id: "tickets",
      title: "Support Tickets & SLA Logs",
      filename: "support_tickets_report",
      desc: "Helpdesk ticket records containing priority levels, status progressions, SLA due times, and assigned technicians.",
      roleRestricted: false
    },
    {
      id: "audit",
      title: "System Compliance Audit Trail",
      filename: "system_audit_trail_report",
      desc: "Full immutable log of all authentication events, administrative actions, asset assignments, and ticket operations.",
      roleRestricted: true // ADMIN only
    }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">CSV Reports & Data Export</h1>
          <p className="page-subtitle">Export official inventory, licensing, support, and audit records as CSV files</p>
        </div>
      </div>

      <div className="reports-grid">
        {reportsList.map((rep) => {
          if (rep.roleRestricted && !isAdmin) return null;
          const isBusy = Boolean(downloading[rep.id]);

          return (
            <div key={rep.id} className="report-card">
              <div>
                <div className="report-card-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <h2 className="report-card-title">{rep.title}</h2>
                <p className="report-card-desc">{rep.desc}</p>
              </div>

              <div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: "100%" }}
                  onClick={() => handleDownload(rep.id, rep.filename)}
                  disabled={isBusy}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  {isBusy ? "Generating CSV..." : "Download CSV"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
