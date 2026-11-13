import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, LayoutGrid, List, ArrowDownToLine } from "lucide-react";
import { Badge, Empty, SearchInput } from "./UI";
import { money, timeLabel } from "../utils/format";
export default function FleetTable({
  items = [],
  readonly = false,
  title = "Current fleet status",
}) {
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("ALL"),
    [view, setView] = useState("table");
  const tabs = [
    ["ALL", "All units"],
    ["RUNNING", "Running"],
    ["REPAIR", "Repair"],
    ["STANDBY_FOR_REPAIR", "Standby"],
    ["NO_DRIVER", "No driver"],
  ];
  const filtered = items.filter(
    (i) =>
      (filter === "ALL" || i.operational_status === filter) &&
      `${i.plate_number} ${i.driver_name || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>
            {title}
            <span className="count">{items.length}</span>
          </h2>
          <p>A clear view of every unit on the road and off.</p>
        </div>
        <div className="view-toggle">
          <button
            aria-label="Table view"
            aria-pressed={view === "table"}
            onClick={() => setView("table")}
          >
            <List size={18} />
          </button>
          <button
            aria-label="Card view"
            aria-pressed={view === "cards"}
            onClick={() => setView("cards")}
          >
            <LayoutGrid size={17} />
          </button>
        </div>
      </div>
      <div className="fleet-toolbar">
        <div className="tabs">
          {tabs.map(([code, label]) => (
            <button
              key={code}
              className={filter === code ? "active" : ""}
              aria-pressed={filter === code}
              onClick={() => setFilter(code)}
            >
              {label}
              {code === "ALL" && <span>{items.length}</span>}
            </button>
          ))}
        </div>
        <SearchInput value={query} onChange={setQuery} />
      </div>
      {!filtered.length ? (
        <Empty
          title="No matching units"
          description="Try another status or search term."
        />
      ) : view === "cards" ? (
        <div className="fleet-cards">
          {filtered.map((i) => (
            <article className="fleet-card" key={i.id}>
              <div className="flex-between">
                <strong>{i.plate_number}</strong>
                {!readonly && (
                  <Link
                    aria-label={`View ${i.plate_number}`}
                    to={`/etrikes/${i.etrike_id}`}
                  >
                    <ArrowUpRight size={18} />
                  </Link>
                )}
              </div>
              <p>{i.driver_name || "Unassigned"}</p>
              <Badge code={i.operational_status} />
              <div className="flex-between">
                <span>Rental</span>
                <strong>{money(i.rental_amount)}</strong>
              </div>
              <small>
                {i.remarks || "No remarks"} · {timeLabel(i.updated_at)}
              </small>
            </article>
          ))}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="fleet-table">
            <thead>
              <tr>
                <th>Unit / Plate no.</th>
                <th>Assigned driver</th>
                <th>Operational status</th>
                <th className="text-right">Rental</th>
                <th>Remarks</th>
                <th>Updated</th>
                {!readonly && <th />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id}>
                  <td data-label="Unit">
                    <div className="plate-cell">
                      <span className="unit-symbol">ET</span>
                      <strong>{i.plate_number}</strong>
                    </div>
                  </td>
                  <td data-label="Driver">
                    <span className={i.driver_name ? "driver-name" : "muted"}>
                      {i.driver_name || "No driver assigned"}
                    </span>
                  </td>
                  <td data-label="Status">
                    <Badge code={i.operational_status} />
                  </td>
                  <td className="text-right rental-cell" data-label="Rental">
                    {money(i.rental_amount)}
                  </td>
                  <td data-label="Remarks" className="remarks-cell">
                    {i.remarks || "—"}
                  </td>
                  <td data-label="Updated" className="muted nowrap">
                    {timeLabel(i.updated_at)}
                  </td>
                  {!readonly && (
                    <td>
                      <Link
                        className="row-link"
                        aria-label={`View ${i.plate_number} history`}
                        to={`/etrikes/${i.etrike_id}`}
                      >
                        <ArrowUpRight size={17} />
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="panel-footer">
        <span>
          Showing {filtered.length} of {items.length} units
        </span>
        <span>
          <span className="tiny-dot" /> Based on submitted reports
        </span>
      </div>
    </section>
  );
}
