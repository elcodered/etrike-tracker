import { Link } from "react-router-dom";
import { RefreshCw, ClipboardList } from "lucide-react";
import { useResource } from "../hooks/useResource";
import { useAuth } from "../context/AuthContext";
import { PageHeading, Loading, ErrorState, Empty } from "../components/UI";
import FleetTable from "../components/FleetTable";
import SummaryCards from "../components/SummaryCards";
import { dateLabel } from "../utils/format";
export default function FleetStatusPage() {
  const { data, loading, error, reload } = useResource(
    "fleet/current",
    {},
    15000,
  );
  const { canEdit } = useAuth();
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} retry={reload} />;
  const report = data.latest_report;
  return (
    <>
      <PageHeading
        eyebrow="OPERATIONS"
        title="Fleet status"
        description={
          report
            ? `Latest submitted status · ${dateLabel(report.report_date)} · Refreshes every 15 seconds`
            : "Current operational status for your entire fleet."
        }
      >
        <button className="btn" onClick={reload}>
          <RefreshCw size={16} /> Refresh
        </button>
        {canEdit && (
          <Link className="btn primary" to="/reports/today">
            <ClipboardList size={17} />
            Update today
          </Link>
        )}
      </PageHeading>
      {report ? (
        <>
          <SummaryCards summary={report.summary} />
          <FleetTable items={report.items} />
        </>
      ) : (
        <Empty
          title="No submitted reports"
          description="Fleet status will appear after the first report is submitted."
        />
      )}
    </>
  );
}
