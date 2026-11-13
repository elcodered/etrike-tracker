import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, ArrowUpRight, CalendarDays } from "lucide-react";
import { useResource } from "../hooks/useResource";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { post, errorText } from "../api/client";
import {
  PageHeading,
  Loading,
  ErrorState,
  Empty,
  Badge,
  Pagination,
  Modal,
  Field,
} from "../components/UI";
import { dateLabel, money, timeLabel, manilaToday } from "../utils/format";
export default function DailyReportsPage() {
  const [page, setPage] = useState(1),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [status, setStatus] = useState(""),
    [create, setCreate] = useState(false),
    [date, setDate] = useState(manilaToday()),
    [busy, setBusy] = useState(false),
    [formError, setFormError] = useState("");
  const { isAdmin, canEdit } = useAuth(),
    notify = useToast(),
    navigate = useNavigate();
  const { data, loading, error, reload } = useResource("daily-reports", {
    page,
    from: from || undefined,
    to: to || undefined,
    status: status || undefined,
  });
  async function createReport(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await post("daily-reports", { report_date: date });
      notify("Report created with all active e-trikes.");
      navigate(`/reports/${r.data.id}`);
    } catch (e) {
      setFormError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="OPERATIONS"
        title="Report history"
        description="Every day documented. Every change traceable."
      >
        {isAdmin && (
          <button className="btn" onClick={() => setCreate(true)}>
            <Plus size={16} />
            Report for a date
          </button>
        )}
        {canEdit && (
          <Link className="btn primary" to="/reports/today">
            <CalendarDays size={17} />
            Today’s report
          </Link>
        )}
      </PageHeading>
      <section className="panel">
        <div className="filter-bar">
          <Field
            label="From date"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
          <Field
            label="To date"
            type="date"
            min={from}
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
          <Field label="Report status">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All reports</option>
              {canEdit && <option value="draft">Draft</option>}
              <option value="submitted">Submitted</option>
              <option value="locked">Locked</option>
            </select>
          </Field>
          <button
            className="btn small"
            onClick={() => {
              setFrom("");
              setTo("");
              setStatus("");
              setPage(1);
            }}
          >
            Reset filters
          </button>
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} retry={reload} />
        ) : data.data.length ? (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Report date</th>
                    <th>Status</th>
                    <th>Running</th>
                    <th>Repair / Standby</th>
                    <th>No driver</th>
                    <th>Rental collected</th>
                    <th>Reported by</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link
                          className="report-date-link"
                          to={`/reports/${r.id}`}
                        >
                          <CalendarDays size={17} />
                          <div>
                            <strong>{dateLabel(r.report_date)}</strong>
                            <small>
                              {dateLabel(r.report_date, { weekday: "long" })}
                            </small>
                          </div>
                        </Link>
                      </td>
                      <td>
                        <Badge code={r.status} />
                      </td>
                      <td>
                        {r.summary.running}
                        <small className="muted">
                          {" "}
                          / {r.summary.total_units}
                        </small>
                      </td>
                      <td>{r.summary.repair + r.summary.standby}</td>
                      <td>{r.summary.no_driver}</td>
                      <td className="rental-cell">
                        {money(r.summary.rental_total)}
                      </td>
                      <td>
                        {r.created_by}
                        <small className="cell-sub">
                          {r.submitted_at
                            ? `Submitted ${timeLabel(r.submitted_at)}`
                            : "Not yet submitted"}
                        </small>
                      </td>
                      <td>
                        <Link
                          aria-label={`Open report for ${r.report_date}`}
                          to={`/reports/${r.id}`}
                        >
                          <ArrowUpRight size={18} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={data.meta} onPage={setPage} />
          </>
        ) : (
          <Empty
            title="No reports in this view"
            description="Try another date range or create your first daily report."
          />
        )}
      </section>
      {create && (
        <Modal title="Create a daily report" onClose={() => setCreate(false)}>
          <form onSubmit={createReport}>
            <p>
              Create one official report for a selected date. Existing reports
              can be reopened for corrections.
            </p>
            {formError && <ErrorState message={formError} />}
            <Field
              label="Report date"
              type="date"
              max={manilaToday()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <div className="modal-actions">
              <button
                type="button"
                className="btn"
                onClick={() => setCreate(false)}
              >
                Cancel
              </button>
              <button className="btn primary" disabled={busy}>
                {busy ? "Creating…" : "Create report"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
