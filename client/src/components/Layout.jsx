// Purpose: Main application layout wrapping navigation and page content
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <Topbar />
        <main className="page-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
