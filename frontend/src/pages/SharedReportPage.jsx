import { useParams } from "react-router-dom";
import { Bike, LockKeyhole, Copy, RefreshCw } from "lucide-react";
import { useResource } from "../hooks/useResource";
import { useToast } from "../context/ToastContext";
import { PageHeading, Loading, ErrorState, Empty } from "../components/UI";
import FleetTable from "../components/FleetTable";
import SummaryCards from "../components/SummaryCards";
import { dateLabel, reportText, copyText } from "../utils/format";
export default function SharedReportPage() {
  const { token } = useParams();
  const notify = useToast();
  const { data, loading, error, reload } = useResource(
    `shared/${token}`,
    {},
    15000,
  );
  return (
    <div className="shared-page">
      <header>
        <div className="brand">
          <span className="brand-symbol">
            <Bike size={26} />
          </span>
          <span>
            E-Trike<span className="brand-sub">FLEET OPERATIONS</span>
          </span>
        </div>
        <span className="readonly-label">
          <LockKeyhole size={14} />
          Read-only owner dashboard
        </span>
      </header>
      <main>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState
            message="This sharing link is invalid, revoked, or expired, or the server is unavailable. Contact your fleet administrator if it persists."
            retry={reload}
          />
        ) : !data.report ? (
          <Empty
            title="No submitted report yet"
            description="The latest report will appear here once your operator submits it."
          />
        ) : (
          <>
            <PageHeading
              eyebrow="E-TRIKE DAILY STATUS"
              title={dateLabel(data.report.report_date)}
              description={`${dateLabel(data.report.report_date, { weekday: "long" })} · Latest submitted report · Refreshes every 15 seconds`}
            >
              <button className="btn" onClick={reload}>
                <RefreshCw size={16} />
                Refresh
              </button>
              <button
                className="btn"
                onClick={async () => {
                  try {
                    await copyText(reportText(data.report));
                    notify("Report copied.");
                  } catch (e) {
                    notify(e.message, "error");
                  }
                }}
              >
                <Copy size={16} />
                Copy report
              </button>
            </PageHeading>
            {data.report.report_date !== data.today && (
              <div className="info-banner">
                Today’s report has not been submitted. Showing the latest
                available report.
              </div>
            )}
            <SummaryCards summary={data.report.summary} />
            <FleetTable
              items={data.report.items}
              readonly
              title="Your fleet at a glance"
            />
          </>
        )}
      </main>
      <footer>
        E-Trike Rent & Status Tracking System · All times in Asia/Manila
      </footer>
    </div>
  );
}
