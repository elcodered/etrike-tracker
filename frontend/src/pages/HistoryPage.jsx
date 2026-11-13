import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { useResource } from "../hooks/useResource";
import {
  PageHeading,
  Loading,
  ErrorState,
  Empty,
  Badge,
  Pagination,
} from "../components/UI";
import { money, dateLabel } from "../utils/format";
export default function HistoryPage({ kind }) {
  const { id } = useParams();
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useResource(
    `${kind}/${id}/history`,
    { page },
  );
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} retry={reload} />;
  const { profile, summary } = data;
  return (
    <>
      <Link className="back-link" to={`/${kind}`}>
        <ArrowLeft size={16} />
        All {kind === "etrikes" ? "e-trikes" : "drivers"}
      </Link>
      <PageHeading
        eyebrow={kind === "etrikes" ? "UNIT HISTORY" : "DRIVER PROFILE"}
        title={profile.plate_number || profile.display_name}
        description={
          kind === "etrikes"
            ? `${profile.unit_code} · ${profile.description || "Operational history across submitted reports"}`
            : `${profile.first_name} ${profile.middle_name || ""} ${profile.last_name} · ${profile.contact_number || "No contact number recorded"}`
        }
      >
        <Badge code={profile.is_active ? "active" : "inactive"}>
          {profile.is_active ? "Active" : "Archived"}
        </Badge>
      </PageHeading>
      <div className="stat-grid">
        <div className="panel stat">
          <span>Full days worked</span>
          <strong>{summary.days_worked}</strong>
        </div>
        <div className="panel stat">
          <span>Half days</span>
          <strong>{summary.half_days}</strong>
        </div>
        <div className="panel stat">
          <span>{kind === "etrikes" ? "Repair days" : "Unavailable days"}</span>
          <strong>
            {kind === "etrikes"
              ? summary.repair_days
              : summary.unavailable_days}
          </strong>
        </div>
        <div className="panel stat">
          <span>Rental collected</span>
          <strong>{money(summary.total_rental)}</strong>
        </div>
      </div>
      <div className="info-banner">
        <CalendarDays size={19} />
        <div>
          <strong>Latest assignment: </strong>
          {data.current.length
            ? data.current
                .map(
                  (i) =>
                    `${i.plate_number} · ${i.driver_name || "Unassigned"} (${dateLabel(i.report_date)})`,
                )
                .join("; ")
            : "No assignment in the latest submitted report."}
          {kind === "drivers" && (
            <small className="cell-sub">
              Previous units: {data.previous_units.join(", ") || "None yet"}.
              Rental figures describe collections, not payroll.
            </small>
          )}
        </div>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Operational timeline</h2>
            <p>Assignments and amounts as recorded on each report date.</p>
          </div>
        </div>
        {!data.items.length ? (
          <Empty
            title="No history yet"
            description="Submitted report entries will appear here."
          />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>{kind === "etrikes" ? "Driver" : "Unit"}</th>
                    <th>Status</th>
                    <th>Rental</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <strong>{dateLabel(i.report_date)}</strong>
                      </td>
                      <td>
                        {kind === "etrikes"
                          ? i.driver_name || "Unassigned"
                          : i.plate_number}
                      </td>
                      <td>
                        <Badge code={i.operational_status} />
                      </td>
                      <td className="rental-cell">{money(i.rental_amount)}</td>
                      <td>{i.remarks || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={data.pagination} onPage={setPage} />
          </>
        )}
      </section>
    </>
  );
}
