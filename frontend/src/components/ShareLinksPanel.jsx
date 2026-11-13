import { useState } from "react";
import { Link2, Plus, Copy, RotateCcw, Trash2 } from "lucide-react";
import { useResource } from "../hooks/useResource";
import { useToast } from "../context/ToastContext";
import { post, remove, errorText } from "../api/client";
import {
  Field,
  Loading,
  ErrorState,
  Empty,
  Modal,
  Badge,
  Pagination,
} from "./UI";
import { dateLabel, copyText } from "../utils/format";
export default function ShareLinksPanel() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useResource("share-links", { page });
  const [name, setName] = useState("Owner dashboard"),
    [expires, setExpires] = useState(""),
    [newLink, setNewLink] = useState(""),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(null);
  const notify = useToast();
  async function create(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await post("share-links", {
        name,
        expires_at: expires ? `${expires}T23:59:59+08:00` : null,
      });
      setNewLink(`${location.origin}${r.path}`);
      reload();
      notify("Secure read-only link created. Copy it now.");
    } catch (e) {
      notify(errorText(e), "error");
    } finally {
      setBusy(false);
    }
  }
  async function mutate() {
    setBusy(true);
    try {
      if (confirm.action === "revoke") {
        await remove(`share-links/${confirm.link.id}`);
        setNewLink("");
        notify("Share link revoked.");
      } else {
        const r = await post(`share-links/${confirm.link.id}/regenerate`);
        setNewLink(`${location.origin}${r.path}`);
        notify("New link generated. The previous link no longer works.");
      }
      reload();
      setConfirm(null);
    } catch (e) {
      notify(errorText(e), "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel settings-panel">
      <div className="panel-heading">
        <div>
          <h2>
            <Link2 size={20} />
            Owner sharing
          </h2>
          <p>
            Create a secure link to the latest submitted report. Anyone with the
            link can view that report.
          </p>
        </div>
      </div>
      <form className="share-form" onSubmit={create}>
        <Field
          label="Link name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
        />
        <Field
          label="Expiry date (optional)"
          type="date"
          value={expires}
          onChange={(e) => setExpires(e.target.value)}
        />
        <button className="btn primary" disabled={busy}>
          <Plus size={16} />
          Create link
        </button>
      </form>
      {newLink && (
        <div className="new-share">
          <strong>Copy your link now — the token is shown only once.</strong>
          <div>
            <input
              aria-label="New secure share link"
              readOnly
              value={newLink}
              onFocus={(e) => e.target.select()}
            />
            <button
              className="btn"
              onClick={async () => {
                try {
                  await copyText(newLink);
                  notify("Share link copied.");
                } catch (e) {
                  notify(e.message, "error");
                }
              }}
            >
              <Copy size={16} />
              Copy
            </button>
          </div>
        </div>
      )}
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
                  <th>Link name</th>
                  <th>Status</th>
                  <th>Expires</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((l) => {
                  const expired =
                    l.expires_at && new Date(l.expires_at) < new Date();
                  return (
                    <tr key={l.id}>
                      <td>
                        <strong>{l.name}</strong>
                      </td>
                      <td>
                        <Badge
                          code={l.revoked_at || expired ? "inactive" : "active"}
                        >
                          {l.revoked_at
                            ? "Revoked"
                            : expired
                              ? "Expired"
                              : "Active"}
                        </Badge>
                      </td>
                      <td>
                        {l.expires_at ? dateLabel(l.expires_at) : "No expiry"}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="btn small"
                            disabled={busy || expired}
                            onClick={() =>
                              setConfirm({ action: "regenerate", link: l })
                            }
                          >
                            <RotateCcw size={14} />
                            Regenerate
                          </button>
                          {!l.revoked_at && (
                            <button
                              className="btn small"
                              disabled={busy}
                              onClick={() =>
                                setConfirm({ action: "revoke", link: l })
                              }
                            >
                              <Trash2 size={14} />
                              Revoke
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination meta={data} onPage={setPage} />
        </>
      ) : (
        <Empty
          title="No sharing links yet"
          description="Create a read-only link for your fleet owner."
        />
      )}
      {confirm && (
        <Modal
          title={`${confirm.action === "revoke" ? "Revoke" : "Regenerate"} this link?`}
          onClose={() => setConfirm(null)}
        >
          <p>
            The current link for “{confirm.link.name}” will stop working
            immediately.
          </p>
          <div className="modal-actions">
            <button
              className="btn"
              onClick={() => setConfirm(null)}
              disabled={busy}
            >
              Cancel
            </button>
            <button className="btn primary" onClick={mutate} disabled={busy}>
              {busy ? "Updating…" : "Confirm"}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
