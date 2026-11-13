import { Badge } from "./UI";
import { timeLabel } from "../utils/format";
const quick = [
  "RUNNING",
  "HALF_DAY",
  "REPAIR",
  "STANDBY_FOR_REPAIR",
  "NO_DRIVER",
  "OTHER",
];
const labels = {
  RUNNING: "Running",
  HALF_DAY: "Half day",
  REPAIR: "Repair",
  STANDBY_FOR_REPAIR: "Standby",
  NO_DRIVER: "No driver",
  OTHER: "Other",
};
export default function ReportEditorRow({
  item,
  index,
  drivers,
  statuses,
  settings,
  onChange,
  disabled,
}) {
  function statusChange(id) {
    const status = statuses.find((s) => s.id === Number(id));
    if (!status) return;
    const suggestion =
      status.code === "RUNNING"
        ? settings.full_day_rental
        : status.code === "HALF_DAY"
          ? settings.half_day_rental
          : 0;
    onChange(item.id, {
      status_id: status.id,
      operational_status: status.code,
      status_name: status.name,
      rental_amount: suggestion,
      ...(status.code === "NO_DRIVER"
        ? { driver_id: null, driver_name: null }
        : {}),
    });
  }
  return (
    <tr>
      <td className="row-number">{String(index + 1).padStart(2, "0")}</td>
      <td data-label="Unit">
        <strong className="editor-plate">{item.plate_number}</strong>
        <small className="muted">{timeLabel(item.updated_at)}</small>
      </td>
      <td data-label="Driver">
        <select
          aria-label={`${item.plate_number} driver`}
          value={item.driver_id || ""}
          disabled={disabled}
          onChange={(e) => {
            const d = drivers.find((d) => d.id === Number(e.target.value));
            onChange(item.id, {
              driver_id: d?.id || null,
              driver_name: d?.display_name || null,
            });
          }}
        >
          <option value="">No driver assigned</option>
          {drivers
            .filter((d) => d.is_active || d.id === item.driver_id)
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.display_name}
                {d.is_active ? "" : " (inactive)"}
              </option>
            ))}
        </select>
      </td>
      <td data-label="Status" className="status-editor">
        <select
          aria-label={`${item.plate_number} status`}
          value={item.status_id}
          disabled={disabled}
          onChange={(e) => statusChange(e.target.value)}
        >
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <div className="quick-status">
          {quick.map((code) => {
            const s = statuses.find((s) => s.code === code);
            return (
              s && (
                <button
                  type="button"
                  disabled={disabled}
                  className={item.operational_status === code ? "selected" : ""}
                  aria-pressed={item.operational_status === code}
                  aria-label={`Set ${item.plate_number} status to ${labels[code]}`}
                  onClick={() => statusChange(s.id)}
                  key={code}
                >
                  {labels[code]}
                </button>
              )
            );
          })}
        </div>
      </td>
      <td data-label="Rental" className="rental-editor">
        <div className="money-input">
          <span>₱</span>
          <input
            aria-label={`${item.plate_number} rental amount`}
            type="number"
            min="0"
            max="9999999999.99"
            step="0.01"
            disabled={disabled}
            value={item.rental_amount}
            onChange={(e) =>
              onChange(item.id, { rental_amount: e.target.value })
            }
          />
        </div>
        <div className="quick-rental">
          {[settings.full_day_rental, settings.half_day_rental, 0].map(
            (n, index) => (
              <button
                type="button"
                key={index}
                disabled={disabled}
                onClick={() => onChange(item.id, { rental_amount: n })}
              >
                ₱{n}
              </button>
            ),
          )}
        </div>
      </td>
      <td data-label="Remarks">
        <input
          aria-label={`${item.plate_number} remarks`}
          placeholder="Optional remarks…"
          maxLength={2000}
          disabled={disabled}
          value={item.remarks || ""}
          onChange={(e) => onChange(item.id, { remarks: e.target.value })}
        />
      </td>
    </tr>
  );
}
