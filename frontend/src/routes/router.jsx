import {
  createBrowserRouter,
  Navigate,
  Outlet,
  Link,
  useRouteError,
} from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loading, Empty } from "../components/UI";
import AppLayout from "../layouts/AppLayout";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import FleetStatusPage from "../pages/FleetStatusPage";
import DailyReportPage from "../pages/DailyReportPage";
import DailyReportsPage from "../pages/DailyReportsPage";
import ManagementPage from "../pages/ManagementPage";
import HistoryPage from "../pages/HistoryPage";
import AnalyticsPage from "../pages/AnalyticsPage";
import SettingsPage from "../pages/SettingsPage";
import AuditLogsPage from "../pages/AuditLogsPage";
import SharedReportPage from "../pages/SharedReportPage";
function Protected({ roles }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
function RouteError() {
  const error = useRouteError();
  return (
    <Empty
      title="We couldn’t open this page"
      description={
        error?.status === 404
          ? "That page could not be found."
          : "Please reload and try again."
      }
    >
      <a className="btn primary" href="/">
        Return to dashboard
      </a>
    </Empty>
  );
}
export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/report/share/:token",
    element: <SharedReportPage />,
    errorElement: <RouteError />,
  },
  {
    element: <Protected />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "fleet", element: <FleetStatusPage /> },
          { path: "reports", element: <DailyReportsPage /> },
          {
            element: <Protected roles={["admin", "operator"]} />,
            children: [{ path: "reports/today", element: <DailyReportPage /> }],
          },
          { path: "reports/:id", element: <DailyReportPage /> },
          {
            path: "etrikes",
            element: <ManagementPage key="etrikes" kind="etrikes" />,
          },
          {
            path: "drivers",
            element: <ManagementPage key="drivers" kind="drivers" />,
          },
          { path: "etrikes/:id", element: <HistoryPage kind="etrikes" /> },
          { path: "drivers/:id", element: <HistoryPage kind="drivers" /> },
          { path: "analytics", element: <AnalyticsPage /> },
          {
            element: <Protected roles={["admin"]} />,
            children: [
              {
                path: "users",
                element: <ManagementPage key="users" kind="users" />,
              },
              { path: "settings", element: <SettingsPage /> },
              { path: "audit-logs", element: <AuditLogsPage /> },
            ],
          },
          {
            path: "*",
            element: (
              <Empty title="Page not found">
                <Link className="btn" to="/">
                  Return to dashboard
                </Link>
              </Empty>
            ),
          },
        ],
      },
    ],
  },
]);
