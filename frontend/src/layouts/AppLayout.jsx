import { useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import {
  Bike,
  LayoutDashboard,
  Activity,
  ClipboardList,
  History,
  Users,
  ChartNoAxesCombined,
  Settings,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ArrowUpRight,
  Leaf,
} from "lucide-react";
import { useResource } from "../hooks/useResource";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { errorText } from "../api/client";
import { dateLabel, initials, manilaToday } from "../utils/format";
export default function AppLayout() {
  const { user, isAdmin, canEdit, logout } = useAuth();
  const { data: workspaceSettings } = useResource("settings");
  const notify = useToast();
  const [mobile, setMobile] = useState(false),
    [profile, setProfile] = useState(false);
  const groups = [
    ["", [["/", "Dashboard", LayoutDashboard]]],
    [
      "OPERATIONS",
      [
        ["/fleet", "Fleet status", Activity],
        ...(canEdit
          ? [["/reports/today", "Today’s report", ClipboardList]]
          : []),
        ["/reports", "Report history", History],
      ],
    ],
    [
      "MANAGEMENT",
      [
        ["/etrikes", "E-Trikes", Bike],
        ["/drivers", "Drivers", Users],
      ],
    ],
    ["INSIGHTS", [["/analytics", "Analytics", ChartNoAxesCombined]]],
    ...(isAdmin
      ? [
          [
            "ADMINISTRATION",
            [
              ["/users", "Users & access", ShieldCheck],
              ["/settings", "Settings", Settings],
            ],
          ],
        ]
      : []),
  ];
  async function signout() {
    try {
      await logout();
    } catch (e) {
      notify(errorText(e), "error");
    }
  }
  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="drawer-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <Link to="/" className="brand" onClick={() => setMobile(false)}>
          <span className="brand-symbol">
            <Bike size={26} />
          </span>
          <span>
            E-Trike<span className="brand-sub">FLEET OPERATIONS</span>
          </span>
        </Link>
        <button
          className="mobile-close icon-btn"
          aria-label="Close menu"
          onClick={() => setMobile(false)}
        >
          <X />
        </button>
        <div className="workspace-chip">
          <span className="workspace-avatar">ET</span>
          <div>
            Fleet workspace<small>Operations management</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <nav aria-label="Main navigation">
          {groups.map(([name, links]) => (
            <div className="nav-group" key={name}>
              {name && <div className="nav-label">{name}</div>}
              {links.map(([path, label, Icon]) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === "/" || path === "/reports"}
                  onClick={() => setMobile(false)}
                  className={({ isActive }) =>
                    isActive ? "nav-link active" : "nav-link"
                  }
                >
                  <Icon size={19} />
                  <span>{label}</span>
                  {path === "/reports/today" && <span className="nav-dot" />}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="fleet-note">
            <Leaf size={19} />
            <strong>Electric fleet. Clear insights.</strong>
            <p>
              Less paperwork.
              <br />
              More time moving forward.
            </p>
          </div>
          <div className="sidebar-profile">
            <span className="avatar">{initials(user.name)}</span>
            <div>
              <strong>{user.name}</strong>
              <small>
                {user.role === "admin"
                  ? "Administrator"
                  : user.role === "viewer"
                    ? "Owner / Viewer"
                    : "Operator"}
              </small>
            </div>
            <button aria-label="Log out" onClick={signout}>
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu icon-btn"
              onClick={() => setMobile(true)}
              aria-label="Open navigation"
            >
              <Menu />
            </button>
            <span className="breadcrumb">
              Workspace <span>/</span>{" "}
              <strong>
                {workspaceSettings?.organization_name || "Fleet operations"}
              </strong>
            </span>
          </div>
          <div className="topbar-right">
            <span className="timezone-label">Asia / Manila</span>
            <div className="profile-menu">
              <button
                className="profile-trigger"
                aria-expanded={profile}
                onClick={() => setProfile(!profile)}
              >
                <span className="avatar small-avatar">
                  {initials(user.name)}
                </span>
                <ChevronDown size={14} />
              </button>
              {profile && (
                <div className="dropdown">
                  <strong>{user.name}</strong>
                  <small>{user.email}</small>
                  <span className="role-label">{user.role}</span>
                  <button onClick={signout}>
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>E-Trike Rent & Status Tracking System</span>
          <span>Built for everyday operations</span>
        </footer>
      </div>
    </div>
  );
}
