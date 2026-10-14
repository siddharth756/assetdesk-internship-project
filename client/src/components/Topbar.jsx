// Purpose: Application header bar with user profile, role badge, and logout controls
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "./StatusBadge";

export default function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="topbar-title">IT Asset & Support Desk</span>
      </div>

      <div className="topbar-right">
        {user && (
          <div className="topbar-user">
            <span className="topbar-user-name">{user.name}</span>
            <StatusBadge status={user.role} />
            <Link to="/profile" className="btn btn-secondary btn-sm" aria-label="View user profile">
              Profile
            </Link>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={logout}
              aria-label="Log out of application"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
