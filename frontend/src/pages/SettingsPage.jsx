import { useState, useEffect } from "react";
import { Save, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useResource } from "../hooks/useResource";
import { useToast } from "../context/ToastContext";
import { put, errorText } from "../api/client";
import { PageHeading, Field, Loading, ErrorState } from "../components/UI";
import ShareLinksPanel from "../components/ShareLinksPanel";
export default function SettingsPage() {
  const { data, loading, error, reload } = useResource("settings");
  const [form, setForm] = useState(null),
    [busy, setBusy] = useState(false);
  const notify = useToast();
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await put("settings", {
        organization_name: form.organization_name,
        full_day_rental: form.full_day_rental,
        half_day_rental: form.half_day_rental,
      });
      setForm(r);
      notify("Settings saved. Rental suggestions apply to future edits.");
    } catch (e) {
      notify(errorText(e), "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRATION"
        title="Settings"
        description="Configure daily reporting defaults and owner access."
      >
        <Link className="btn" to="/audit-logs">
          View audit log
        </Link>
      </PageHeading>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} retry={reload} />
      ) : (
        form && (
          <section className="panel settings-panel">
            <div className="panel-heading">
              <div>
                <h2>Workspace defaults</h2>
                <p>
                  Suggested rental amounts are always editable in a daily
                  report.
                </p>
              </div>
            </div>
            <form className="settings-form" onSubmit={save}>
              <Field
                label="Organization name"
                value={form.organization_name}
                onChange={(e) =>
                  setForm({ ...form, organization_name: e.target.value })
                }
                required
                maxLength={100}
              />
              <div className="form-grid">
                <Field
                  label="Full-day rental suggestion (₱)"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.full_day_rental}
                  onChange={(e) =>
                    setForm({ ...form, full_day_rental: e.target.value })
                  }
                />
                <Field
                  label="Half-day rental suggestion (₱)"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.half_day_rental}
                  onChange={(e) =>
                    setForm({ ...form, half_day_rental: e.target.value })
                  }
                />
              </div>
              <div className="timezone-setting">
                <strong>Application timezone</strong>
                <span>Asia/Manila (UTC+08:00)</span>
                <small>
                  All report dates and displayed times use Manila time.
                </small>
              </div>
              <button className="btn primary" disabled={busy}>
                <Save size={16} />
                {busy ? "Saving…" : "Save settings"}
              </button>
            </form>
          </section>
        )
      )}
      <ShareLinksPanel />
    </>
  );
}
