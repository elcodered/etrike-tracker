import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  CheckCircle2,
  Clock3,
  RefreshCw,
} from "lucide-react";
import { useResource } from "../hooks/useResource";
import { useAuth } from "../context/AuthContext";
import {
  PageHeading,
  Loading,
  ErrorState,
  Empty,
  Badge,
} from "../components/UI";
import SummaryCards from "../components/SummaryCards";
import FleetTable from "../components/FleetTable";
import RentalChart from "../components/RentalChart";
import { money, dateLabel } from "../utils/format";
export default function DashboardPage() {
  const { data, loading, error, reload } = useResource("dashboard", {}, 30000);
  const { canEdit, user } = useAuth();
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} retry={reload} />;
  const { latest_report: report, analytics, today } = data;
  const isToday = report?.report_date === today;
  return (
    <>
      <PageHeading
        eyebrow="YOUR DAILY OPERATIONS, AT A GLANCE"
        title="Fleet overview"
        description={`Welcome back, ${user.name.split(" ")[0]}. Here’s how your fleet is doing.`}
      >
        <div className="date-pill">
          <CalendarDays size={18} />
          <div>
            <small>{dateLabel(today, { weekday: "long" })}</small>
            <strong>{dateLabel(today)}</strong>
          </div>
        </div>
        {canEdit && (
          <Link className="btn primary" to="/reports/today">
            <ClipboardList size={17} />
            Today’s report
            <ArrowUpRight size={16} />
          </Link>
        )}
      </PageHeading>
      <div className="report-banner">
        <div>
          <span className={`banner-icon ${isToday ? "" : "pending"}`}>
            {isToday ? <CheckCircle2 size={19} /> : <Clock3 size={19} />}
          </span>
          <div>
            <strong>
              {isToday
                ? "Today’s report is published"
                : data.today_report?.status === "draft"
                  ? "Today’s report is in progress"
                  : "A new day, a fresh report"}
            </strong>
            <span>
              {report
                ? `Showing the latest submitted fleet status · ${dateLabel(report.report_date)}`
                : "Create your first daily report to start tracking your fleet."}
            </span>
          </div>
        </div>
        {canEdit ? (
          <Link to="/reports/today">
            {data.today_report ? "Open report" : "Create today’s report"}
            <ArrowRight size={16} />
          </Link>
        ) : (
          <span className="readonly-label">Read-only workspace</span>
        )}
      </div>
      <SummaryCards
        summary={report?.summary}
        total={data.total_active_units}
        rentalLabel={isToday ? "Rental today" : "Latest report rental"}
      />
      <div className="dashboard-middle">
        <section className="panel collection-panel">
          <div className="panel-heading">
            <div>
              <h2>Rental collections</h2>
              <p>
                {dateLabel(today, { month: "long", year: "numeric" })} ·
                Submitted reports
              </p>
            </div>
            <Link className="text-link" to="/analytics">
              View analytics
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="collection-metrics">
            <strong>{money(analytics.total_rental)}</strong>
            <span>
              <span className="tiny-dot" />
              {analytics.report_days} reporting days this month
            </span>
          </div>
          <RentalChart data={analytics.daily} />
        </section>
        <section className="panel availability-panel">
          <div className="panel-heading">
            <div>
              <h2>Fleet availability</h2>
              <p>This month’s operating time</p>
            </div>
            <span className="mini-icon">
              <CheckCircle2 size={19} />
            </span>
          </div>
          <div className="availability-value">
            {analytics.availability}
            <span>%</span>
          </div>
          <div className="progress-track">
            <span style={{ width: `${analytics.availability}%` }} />
          </div>
          <p className="availability-description">
            {analytics.running_operational_days} operating days out of{" "}
            {analytics.expected_operational_days} unit-days recorded.
          </p>
          <div className="availability-bottom">
            <span>Half-day operation counts as 0.5 day.</span>
            <Link to="/analytics">
              <ArrowUpRight size={20} />
            </Link>
          </div>
        </section>
      </div>
      {report ? (
        <FleetTable items={report.items} />
      ) : (
        <section className="panel">
          <Empty
            title="Your fleet is ready to report"
            description="Your active e-trikes will be added automatically when you create the first report."
          >
            {canEdit && (
              <Link to="/reports/today" className="btn primary">
                Create today’s report
              </Link>
            )}
          </Empty>
        </section>
      )}
    </>
  );
}
