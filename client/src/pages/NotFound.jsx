// Purpose: 404 Page Not Found component
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="status-page" role="alert">
      <div className="status-code">404</div>
      <h1>Page Not Found</h1>
      <p className="form-hint" style={{ maxWidth: "420px", margin: "0.5rem auto 1.5rem auto" }}>
        The page you are looking for does not exist, has been removed, or is temporarily unavailable.
      </p>
      <Link to="/" className="btn btn-primary">
        Return to Dashboard
      </Link>
    </div>
  );
}
