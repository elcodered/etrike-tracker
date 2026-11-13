import { useEffect, useState } from "react";
import { useParams, Link, useBlocker } from "react-router-dom";
import {
  Save,
  Send,
  Copy,
  Download,
  Plus,
  ArrowLeft,
  LockKeyhole,
  RotateCcw,
  ChevronDown,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { get, post, put, errorText } from "../api/client";
import { downloadReportPdf } from "../api/reports";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  PageHeading,
  Loading,
  ErrorState,
  Empty,
  Badge,
  Modal,
  Field,
} from "../components/UI";
import SummaryCards from "../components/SummaryCards";
import FleetTable from "../components/FleetTable";
import ReportEditorRow from "../components/ReportEditorRow";
import {
  dateLabel,
  manilaToday,
  summarize,
  reportText,
  copyText,
} from "../utils/format";
export default function DailyReportPage() {
  const { id } = useParams();
  const { isAdmin, canEdit } = useAuth();
  const notify = useToast();
  const [report, setReport] = useState(null),
    [drivers, setDrivers] = useState([]),
    [statuses, setStatuses] = useState([]),
    [settings, setSettings] = useState({
      full_day_rental: 300,
      half_day_rental: 150,
    }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [downloading, setDownloading] = useState(false),
    [dirty, setDirty] = useState(false),
    [confirm, setConfirm] = useState(null),
    [bulk, setBulk] = useState("");
  const today = manilaToday();
  const editable =
    report?.status === "draft" &&
    canEdit &&
    (isAdmin || report.report_date === today);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    const before = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);
  async function load() {
    setLoading(true);
    setError("");
    try {
      const [ds, ss, st] = await Promise.all([
        get("drivers", { per_page: 100 }),
        get("statuses"),
        get("settings"),
      ]);
      setDrivers(ds.data);
      setStatuses(ss.data);
      setSettings(st);
      let result;
      if (id) result = (await get(`daily-reports/${id}`)).data;
      else {
        const list = await get("daily-reports", { date: today });
        result = list.data[0]
          ? (await get(`daily-reports/${list.data[0].id}`)).data
          : null;
      }
      setReport(result);
      setDirty(false);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [id]);
  async function create() {
    setBusy(true);
    setError("");
    try {
      const r = await post("daily-reports", { report_date: today });
      setReport(r.data);
      notify(`${r.data.items.length} active e-trikes added to today’s report.`);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  function change(itemId, patch) {
    setReport((r) => ({
      ...r,
      items: r.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
    }));
    setDirty(true);
  }
  function validate() {
    for (const item of report.items) {
      if (!item.status_id)
        return `${item.plate_number}: choose an operational status.`;
      if (
        item.rental_amount === "" ||
        !Number.isFinite(Number(item.rental_amount)) ||
        Number(item.rental_amount) < 0
      )
        return `${item.plate_number}: enter a valid rental amount.`;
      if (
        ["RUNNING", "HALF_DAY"].includes(item.operational_status) &&
        !item.driver_id
      )
        return `${item.plate_number}: choose a driver for this operating unit.`;
      if (item.operational_status === "NO_DRIVER" && item.driver_id)
        return `${item.plate_number}: remove the assigned driver for No Driver status.`;
    }
    return null;
  }
  async function save() {
    const message = validate();
    if (message) {
      setError(message);
      throw new Error(message);
    }
    const r = await put(`daily-reports/${report.id}`, {
      version: report.version,
      notes: report.notes,
      items: report.items.map((i) => ({
        id: i.id,
        driver_id: i.driver_id,
        status_id: i.status_id,
        rental_amount: i.rental_amount,
        remarks: i.remarks,
      })),
    });
    setReport(r.data);
    setDirty(false);
    return r.data;
  }
  async function saveDraft() {
    setBusy(true);
    setError("");
    try {
      await save();
      notify("Draft saved. Your changes are secure.");
    } catch (e) {
      setError(e.response ? errorText(e) : e.message);
    } finally {
      setBusy(false);
    }
  }
  async function action(kind) {
    setBusy(true);
    setError("");
    try {
      let current = report;
      if (kind === "submit" && dirty) current = await save();
      const r = await post(`daily-reports/${report.id}/${kind}`, {
        version: current.version,
      });
      setReport(r.data);
      setDirty(false);
      setConfirm(null);
      notify(
        kind === "submit"
          ? "Report submitted. Owner views now show this report."
          : kind === "reopen"
            ? "Report reopened for editing."
            : kind === "sync"
              ? "Active units synchronized."
              : "Report locked.",
      );
    } catch (e) {
      setError(e.response ? errorText(e) : e.message);
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  }
  async function bulkAction(name, confirmed = false) {
    setBulk("");
    if (!name) return;
    if (dirty) {
      setError("Save your draft before applying a bulk action.");
      return;
    }
    if (name === "mark_running" && !confirmed) {
      setConfirm("mark_running");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await post(`daily-reports/${report.id}/bulk`, {
        version: report.version,
        action: name,
        confirmed,
      });
      setReport(r.data);
      setConfirm(null);
      notify("Bulk changes saved. Units without a driver remain unassigned.");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await copyText(reportText(report));
      notify("Report copied to clipboard.");
    } catch (e) {
      notify(e.message, "error");
    }
  }
  async function downloadPdf() {
    setDownloading(true);
    try {
      await downloadReportPdf(report);
      notify("PDF download started.");
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setDownloading(false);
    }
  }
  if (loading) return <Loading />;
  return (
    <>
      <Link className="back-link" to="/reports">
        <ArrowLeft size={15} />
        Report history
      </Link>
      <PageHeading
        eyebrow="OPERATIONS / DAILY REPORT"
        title={report ? dateLabel(report.report_date) : "Today’s report"}
        description={
          report
            ? `${dateLabel(report.report_date, { weekday: "long" })} · ${report.items.length} units · ${report.created_by}`
            : "Your active fleet, ready to update in just a few minutes."
        }
      >
        {report && (
          <>
            <Badge code={report.status} />
            <button className="btn" onClick={copy}>
              <Copy size={16} />
              Copy as text
            </button>
            <button
              className="btn"
              onClick={downloadPdf}
              disabled={downloading || busy || dirty}
              title={
                dirty
                  ? "Save your draft before downloading the PDF"
                  : "Download this saved daily report as PDF"
              }
              aria-busy={downloading}
            >
              <Download size={16} />
              {downloading ? "Downloading…" : "Download PDF"}
            </button>
            {editable && (
              <>
                <button
                  className="btn"
                  disabled={busy || !dirty}
                  onClick={saveDraft}
                >
                  <Save size={16} />
                  {busy ? "Saving…" : "Save draft"}
                </button>
                <button
                  className="btn primary"
                  disabled={busy}
                  onClick={() => {
                    const err = validate();
                    if (err) setError(err);
                    else setConfirm("submit");
                  }}
                >
                  <Send size={16} />
                  Submit report
                </button>
              </>
            )}
            {isAdmin && report.status !== "draft" && (
              <button
                className="btn"
                onClick={() => setConfirm("reopen")}
                disabled={busy}
              >
                <RotateCcw size={16} />
                Reopen
              </button>
            )}
            {isAdmin && report.status === "submitted" && (
              <button
                className="btn"
                onClick={() => setConfirm("lock")}
                disabled={busy}
              >
                <LockKeyhole size={16} />
                Lock
              </button>
            )}
          </>
        )}
      </PageHeading>
      {error && (
        <ErrorState message={error} retry={!dirty ? load : undefined} />
      )}
      {!report ? (
        <section className="panel">
          <Empty
            title="Let’s get today’s report started"
            description="All active e-trikes are added automatically with their latest driver assignment. Review each status before submitting."
          >
            <button className="btn primary" disabled={busy} onClick={create}>
              <Plus size={17} />
              {busy ? "Creating…" : "Create today’s report"}
            </button>
          </Empty>
        </section>
      ) : (
        <>
          <SummaryCards summary={summarize(report.items)} />
          {editable ? (
            <section className="panel editor-panel">
              <div className="panel-heading">
                <div>
                  <h2>Quick daily entry</h2>
                  <p>
                    Update a status, adjust the rental, and move to the next
                    unit.
                  </p>
                </div>
                <span className={`save-state ${dirty ? "unsaved" : ""}`}>
                  <span className="tiny-dot" />
                  {busy
                    ? "Saving…"
                    : dirty
                      ? "Unsaved changes"
                      : "All changes saved"}
                </span>
              </div>
              <div className="editor-toolbar">
                <span>
                  <strong>{report.items.length} units</strong> · Rental amounts
                  can be overridden
                </span>
                <div>
                  <select
                    aria-label="Bulk actions"
                    disabled={busy}
                    value={bulk}
                    onChange={(e) => bulkAction(e.target.value)}
                  >
                    <option value="">Bulk actions</option>
                    <option value="mark_running">
                      Mark assigned units Running
                    </option>
                    <option value="running_rental">
                      Set Running units to ₱{settings.full_day_rental}
                    </option>
                    <option value="copy_drivers">
                      Copy previous driver assignments
                    </option>
                    <option value="clear_remarks">Clear all remarks</option>
                  </select>
                  <button
                    className="btn small"
                    disabled={busy || dirty}
                    onClick={() => action("sync")}
                  >
                    <RefreshCw size={14} />
                    Sync active units
                  </button>
                </div>
              </div>
              <div className="table-wrap">
                <table className="editor-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Plate / updated</th>
                      <th>Driver</th>
                      <th>Operational status</th>
                      <th>Rental</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.items.map((item, i) => (
                      <ReportEditorRow
                        key={item.id}
                        item={item}
                        index={i}
                        drivers={drivers}
                        statuses={statuses}
                        settings={settings}
                        onChange={change}
                        disabled={busy}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="report-notes">
                <Field label="Report notes">
                  <textarea
                    rows={2}
                    maxLength={4000}
                    placeholder="Anything else the team should know?"
                    value={report.notes || ""}
                    onChange={(e) => {
                      setReport({ ...report, notes: e.target.value });
                      setDirty(true);
                    }}
                    disabled={busy}
                  />
                </Field>
              </div>
              <div className="editor-bottom">
                <span>
                  {dirty
                    ? "You have unsaved changes."
                    : "Draft saved. Submit when all units have been reviewed."}
                </span>
                <button
                  className="btn primary"
                  disabled={busy}
                  onClick={() => {
                    const err = validate();
                    if (err) setError(err);
                    else setConfirm("submit");
                  }}
                >
                  <Send size={16} />
                  Review & submit
                </button>
              </div>
            </section>
          ) : (
            <>
              <div className="info-banner">
                <CheckCircle2 size={18} />
                {report.status === "draft"
                  ? "This historical draft can be edited by an administrator."
                  : `This ${report.status} report is read-only. ${isAdmin ? "Reopen it to make an audited correction." : ""}`}
              </div>
              <FleetTable title="Daily fleet report" items={report.items} />
              {report.notes && (
                <section className="panel notes-panel">
                  <h2>Report notes</h2>
                  <p>{report.notes}</p>
                </section>
              )}
            </>
          )}
        </>
      )}
      {confirm && (
        <Modal
          title={
            confirm === "submit"
              ? "Ready to submit this report?"
              : confirm === "mark_running"
                ? "Replace operational statuses?"
                : confirm === "reopen"
                  ? "Reopen this report?"
                  : "Lock this report?"
          }
          onClose={() => {
            if (!busy) setConfirm(null);
          }}
        >
          {confirm === "submit" ? (
            <>
              <p>
                Review the totals below. Submitting makes this report
                immediately available in owner and shared views.
              </p>
              <div className="review-summary">
                <span>{report.items.length} total units</span>
                <span>{summarize(report.items).running} running</span>
                <span>{summarize(report.items).repair} under repair</span>
                <span>
                  {summarize(report.items).no_driver} without a driver
                </span>
                <strong>
                  Total rental: ₱
                  {summarize(report.items).rental_total.toLocaleString("en-PH")}
                </strong>
              </div>
            </>
          ) : (
            <p>
              {confirm === "mark_running"
                ? "This changes repair, standby, and unavailable units with assigned drivers to Running and applies the full-day rental. Units without a driver are preserved."
                : confirm === "reopen"
                  ? "The report will become a draft and temporarily leave owner and shared views until resubmitted. All corrections are audited."
                  : "This marks the report as locked. An administrator must reopen it before making corrections."}
            </p>
          )}
          <div className="modal-actions">
            <button
              className="btn"
              disabled={busy}
              onClick={() => setConfirm(null)}
            >
              Cancel
            </button>
            <button
              className="btn primary"
              disabled={busy}
              onClick={() =>
                confirm === "mark_running"
                  ? bulkAction(confirm, true)
                  : action(confirm)
              }
            >
              {busy
                ? "Working…"
                : confirm === "submit"
                  ? "Submit report"
                  : "Confirm"}
            </button>
          </div>
        </Modal>
      )}
      {blocker.state === "blocked" && (
        <Modal
          title="Leave with unsaved changes?"
          onClose={() => blocker.reset()}
        >
          <p>
            Your last saved draft is safe, but the changes on this screen have
            not been saved.
          </p>
          <div className="modal-actions">
            <button className="btn" onClick={() => blocker.reset()}>
              Keep editing
            </button>
            <button className="btn danger" onClick={() => blocker.proceed()}>
              Discard unsaved changes
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
