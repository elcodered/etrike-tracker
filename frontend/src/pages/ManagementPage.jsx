import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Pencil,
  Archive,
  ArrowUpRight,
  Bike,
  Users,
  ShieldCheck,
} from "lucide-react";
import { useResource } from "../hooks/useResource";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { post, put, remove, errorText } from "../api/client";
import {
  PageHeading,
  Loading,
  ErrorState,
  Empty,
  SearchInput,
  Pagination,
  Modal,
  Field,
  Badge,
} from "../components/UI";
import { initials } from "../utils/format";
const configs = {
  etrikes: {
    title: "E-Trikes",
    singular: "e-trike",
    description: "Manage your fleet and default driver assignments.",
    initial: {
      plate_number: "",
      unit_code: "",
      description: "",
      default_driver_id: "",
      is_active: true,
    },
    fields: [
      ["plate_number", "Plate number", "text", true],
      ["unit_code", "Unit code", "text", true],
      ["default_driver_id", "Default driver", "driver"],
      ["description", "Description / notes", "textarea"],
    ],
  },
  drivers: {
    title: "Drivers",
    singular: "driver",
    description:
      "Your people behind the wheel, with a complete assignment history.",
    initial: {
      first_name: "",
      middle_name: "",
      last_name: "",
      display_name: "",
      contact_number: "",
      notes: "",
      is_active: true,
    },
    fields: [
      ["first_name", "First name", "text", true],
      ["middle_name", "Middle name", "text"],
      ["last_name", "Last name", "text", true],
      ["display_name", "Display name", "text", true],
      ["contact_number", "Contact number", "tel"],
      ["notes", "Notes", "textarea"],
    ],
  },
  users: {
    title: "Users & access",
    singular: "user",
    description: "Give your team the right access to fleet operations.",
    initial: {
      name: "",
      email: "",
      password: "",
      role: "viewer",
      is_active: true,
    },
    fields: [
      ["name", "Full name", "text", true],
      ["email", "Email address", "email", true],
      ["password", "Password", "password"],
      ["role", "Role", "role", true],
    ],
  },
};
export default function ManagementPage({ kind }) {
  const config = configs[kind];
  const { isAdmin } = useAuth();
  const notify = useToast();
  const [search, setSearch] = useState(""),
    [active, setActive] = useState(""),
    [page, setPage] = useState(1),
    [editing, setEditing] = useState(null),
    [form, setForm] = useState(config.initial),
    [formError, setFormError] = useState(""),
    [busy, setBusy] = useState(false),
    [archiving, setArchiving] = useState(null);
  const { data, loading, error, reload } = useResource(kind, {
    page,
    search,
    active: active || undefined,
  });
  const { data: driverData } = useResource("drivers", { per_page: 100 });
  function open(row) {
    setEditing(row || {});
    setForm(row ? { ...row, password: "" } : { ...config.initial });
    setFormError("");
  }
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      const payload = Object.fromEntries([
        ...config.fields.map(([key]) => [
          key,
          form[key] === "" ? null : form[key],
        ]),
        ["is_active", form.is_active],
      ]);
      if (kind === "etrikes" && payload.default_driver_id)
        payload.default_driver_id = Number(payload.default_driver_id);
      if (editing.id) await put(`${kind}/${editing.id}`, payload);
      else await post(kind, payload);
      setEditing(null);
      reload();
      notify(`${config.singular} ${editing.id ? "updated" : "created"}.`);
    } catch (e) {
      setFormError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function archive() {
    setBusy(true);
    try {
      await remove(`${kind}/${archiving.id}`);
      setArchiving(null);
      reload();
      notify(`${config.singular} archived. Historical reports are preserved.`);
    } catch (e) {
      notify(errorText(e), "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow={kind === "users" ? "ADMINISTRATION" : "MANAGEMENT"}
        title={config.title}
        description={config.description}
      >
        {isAdmin && (
          <button className="btn primary" onClick={() => open()}>
            <Plus size={18} />
            Add {config.singular}
          </button>
        )}
      </PageHeading>
      {kind === "users" && (
        <div className="role-cards">
          {[
            [
              "Administrator",
              "Full control over fleet, reports, users, and settings.",
            ],
            ["Operator", "Create and edit today’s draft; view report history."],
            [
              "Owner / Viewer",
              "Read-only access to submitted reports and collections.",
            ],
          ].map(([title, text]) => (
            <div className="panel role-card" key={title}>
              <ShieldCheck size={21} />
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      )}
      <section className="panel">
        <div className="management-toolbar">
          <SearchInput
            value={search}
            onChange={(s) => {
              setSearch(s);
              setPage(1);
            }}
            placeholder={`Search ${config.title.toLowerCase()}…`}
          />
          {kind !== "users" && (
            <select
              aria-label="Filter active status"
              value={active}
              onChange={(e) => {
                setActive(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Active & archived</option>
              <option value="1">Active only</option>
              <option value="0">Archived only</option>
            </select>
          )}
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} retry={reload} />
        ) : !data.data.length ? (
          <Empty
            title={`No ${config.title.toLowerCase()} found`}
            description="Adjust your search or add a record."
          />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{kind === "etrikes" ? "Plate number" : "Name"}</th>
                    <th>
                      {kind === "etrikes"
                        ? "Unit code"
                        : kind === "drivers"
                          ? "Contact number"
                          : "Email address"}
                    </th>
                    <th>
                      {kind === "etrikes"
                        ? "Default driver"
                        : kind === "drivers"
                          ? "Notes"
                          : "Role"}
                    </th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="plate-cell">
                          <span
                            className={
                              kind === "etrikes" ? "unit-symbol" : "avatar"
                            }
                          >
                            {kind === "etrikes" ? (
                              <Bike size={18} />
                            ) : (
                              initials(row.display_name || row.name)
                            )}
                          </span>
                          <strong>
                            {row.plate_number || row.display_name || row.name}
                          </strong>
                        </div>
                      </td>
                      <td>
                        {row.unit_code ||
                          row.contact_number ||
                          row.email ||
                          "—"}
                      </td>
                      <td className="remarks-cell">
                        {kind === "etrikes" ? (
                          row.default_driver?.display_name || "Unassigned"
                        ) : kind === "drivers" ? (
                          row.notes || "—"
                        ) : (
                          <span className="role-label">{row.role}</span>
                        )}
                      </td>
                      <td>
                        <Badge code={row.is_active ? "active" : "inactive"}>
                          {row.is_active
                            ? "Active"
                            : kind === "users"
                              ? "Disabled"
                              : "Archived"}
                        </Badge>
                      </td>
                      <td>
                        <div className="row-actions">
                          {isAdmin && (
                            <>
                              <button
                                className="icon-btn"
                                aria-label={`Edit ${row.plate_number || row.display_name || row.name}`}
                                onClick={() => open(row)}
                              >
                                <Pencil size={16} />
                              </button>
                              {row.is_active && kind !== "users" && (
                                <button
                                  className="icon-btn"
                                  aria-label={`Archive ${row.plate_number || row.display_name}`}
                                  onClick={() => setArchiving(row)}
                                >
                                  <Archive size={16} />
                                </button>
                              )}
                            </>
                          )}
                          {kind !== "users" && (
                            <Link
                              className="icon-btn"
                              aria-label={`View ${row.plate_number || row.display_name} history`}
                              to={`/${kind}/${row.id}`}
                            >
                              <ArrowUpRight size={18} />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={data} onPage={setPage} />
          </>
        )}
      </section>
      {editing && (
        <Modal
          title={`${editing.id ? "Edit" : "Add"} ${config.singular}`}
          onClose={() => {
            if (!busy) setEditing(null);
          }}
        >
          <form onSubmit={save}>
            {formError && <ErrorState message={formError} />}
            <div className="form-grid">
              {config.fields.map(([key, label, type, required]) => (
                <Field
                  key={key}
                  label={
                    label +
                    (key === "password" && editing.id
                      ? " (leave blank to keep current)"
                      : "")
                  }
                >
                  {type === "textarea" ? (
                    <textarea
                      rows={3}
                      value={form[key] || ""}
                      maxLength={2000}
                      onChange={(e) =>
                        setForm({ ...form, [key]: e.target.value })
                      }
                    />
                  ) : type === "driver" ? (
                    <select
                      value={form[key] || ""}
                      onChange={(e) =>
                        setForm({ ...form, [key]: e.target.value })
                      }
                    >
                      <option value="">No default driver</option>
                      {driverData?.data
                        .filter(
                          (d) => d.is_active || d.id === Number(form[key]),
                        )
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.display_name}
                          </option>
                        ))}
                    </select>
                  ) : type === "role" ? (
                    <select
                      value={form[key]}
                      onChange={(e) =>
                        setForm({ ...form, [key]: e.target.value })
                      }
                    >
                      <option value="admin">Administrator</option>
                      <option value="operator">Operator / Reporter</option>
                      <option value="viewer">Owner / Viewer</option>
                    </select>
                  ) : (
                    <input
                      type={type}
                      value={form[key] || ""}
                      required={required || (key === "password" && !editing.id)}
                      minLength={key === "password" ? 12 : undefined}
                      maxLength={
                        key === "password"
                          ? undefined
                          : key === "email"
                            ? 255
                            : 100
                      }
                      autoComplete={
                        key === "password" ? "new-password" : undefined
                      }
                      onChange={(e) =>
                        setForm({ ...form, [key]: e.target.value })
                      }
                    />
                  )}
                </Field>
              ))}
            </div>
            {kind === "users" && (
              <p className="muted small-text">
                Passwords require at least 12 characters, uppercase and
                lowercase letters, and a number.
              </p>
            )}
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
              />
              Active {config.singular}
            </label>
            <div className="modal-actions">
              <button
                className="btn"
                type="button"
                onClick={() => setEditing(null)}
                disabled={busy}
              >
                Cancel
              </button>
              <button className="btn primary" disabled={busy}>
                {busy ? "Saving…" : "Save " + config.singular}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {archiving && (
        <Modal
          title={`Archive ${archiving.plate_number || archiving.display_name}?`}
          onClose={() => setArchiving(null)}
        >
          <p>
            This record will be marked inactive. Existing reports and history
            stay intact.
          </p>
          <div className="modal-actions">
            <button
              className="btn"
              onClick={() => setArchiving(null)}
              disabled={busy}
            >
              Cancel
            </button>
            <button className="btn danger" onClick={archive} disabled={busy}>
              {busy ? "Archiving…" : "Archive"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
