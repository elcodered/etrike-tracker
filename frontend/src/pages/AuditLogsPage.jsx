import { useState } from "react";
import { useResource } from "../hooks/useResource";
import {
  PageHeading,
  Loading,
  ErrorState,
  Empty,
  Pagination,
} from "../components/UI";
import { dateLabel, timeLabel } from "../utils/format";
export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useResource("audit-logs", { page });
  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRATION"
        title="Audit log"
        description="A permanent record of important fleet, report, and access changes."
      />
      <section className="panel">
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} retry={reload} />
        ) : !data.data.length ? (
          <Empty
            title="No changes recorded yet"
            description="Updates, submissions, and administrative actions will appear here."
          />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Record</th>
                    <th>Changes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((log) => (
                    <tr key={log.id}>
                      <td className="nowrap">
                        {dateLabel(log.created_at)}
                        <small className="cell-sub">
                          {timeLabel(log.created_at)}
                        </small>
                      </td>
                      <td>{log.user?.name || "System"}</td>
                      <td>
                        <strong>{log.action}</strong>
                      </td>
                      <td>
                        {log.entity_type} #{log.entity_id}
                      </td>
                      <td>
                        <details>
                          <summary>View details</summary>
                          <div className="audit-details">
                            {Object.entries(log.new_values || {})
                              .filter(
                                ([k, v]) =>
                                  JSON.stringify(v) !==
                                    JSON.stringify(log.old_values?.[k]) &&
                                  !["updated_at", "created_at"].includes(k),
                              )
                              .map(([k, v]) => (
                                <div key={k}>
                                  <strong>{k.replaceAll("_", " ")}</strong>
                                  <span>
                                    {log.old_values && (
                                      <>
                                        <del>
                                          {JSON.stringify(
                                            log.old_values[k] ?? "—",
                                          )}
                                        </del>{" "}
                                        →{" "}
                                      </>
                                    )}
                                    {JSON.stringify(v)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </details>
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
    </>
  );
}
