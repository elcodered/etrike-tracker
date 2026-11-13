import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, TrendingUp, CalendarDays } from "lucide-react";
import { useResource } from "../hooks/useResource";
import { PageHeading, Loading, ErrorState, Empty } from "../components/UI";
import RentalChart from "../components/RentalChart";
import SummaryCards from "../components/SummaryCards";
import { money, dateLabel, manilaToday } from "../utils/format";
export default function AnalyticsPage() {
  const [month, setMonth] = useState(manilaToday().slice(0, 7));
  const { data, loading, error, reload } = useResource("analytics", { month });
  const { data: dashboard } = useResource("dashboard");
  return (
    <>
      <PageHeading
        eyebrow="INSIGHTS"
        title="Fleet analytics"
        description="Understand collections, availability, and the units that need attention."
      >
        <label className="month-picker">
          <CalendarDays size={17} />
          <input
            aria-label="Analytics month"
            type="month"
            value={month}
            onChange={(e) => {
              if (e.target.value) setMonth(e.target.value);
            }}
          />
        </label>
      </PageHeading>
      {dashboard?.latest_report?.report_date === dashboard?.today && (
        <SummaryCards
          summary={dashboard.latest_report.summary}
          rentalLabel="Rental today"
        />
      )}
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} retry={reload} />
      ) : (
        <>
          <div className="stat-grid">
            <div className="panel stat">
              <span>Monthly rental</span>
              <strong>{money(data.total_rental)}</strong>
              <small>{data.report_days} submitted reporting days</small>
            </div>
            <div className="panel stat">
              <span>Average daily rental</span>
              <strong>{money(data.average_daily_rental)}</strong>
              <small>Across submitted dates</small>
            </div>
            <div className="panel stat">
              <span>Highest rental day</span>
              <strong>{money(data.highest_rental)}</strong>
              <small>{dateLabel(data.highest_day)}</small>
            </div>
            <div className="panel stat">
              <span>Lowest rental day</span>
              <strong>{money(data.lowest_rental)}</strong>
              <small>{dateLabel(data.lowest_day)}</small>
            </div>
          </div>
          <div className="dashboard-middle">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Daily collection trend</h2>
                  <p>Rental amounts in Philippine pesos</p>
                </div>
              </div>
              <RentalChart data={data.daily} />
            </section>
            <section className="panel availability-panel">
              <div className="panel-heading">
                <div>
                  <h2>Fleet availability</h2>
                  <p>Operating time / expected time</p>
                </div>
              </div>
              <div className="availability-value">
                {data.availability}
                <span>%</span>
              </div>
              <div className="progress-track">
                <span style={{ width: `${data.availability}%` }} />
              </div>
              <p className="availability-description">
                {data.running_operational_days} operating unit-days /{" "}
                {data.expected_operational_days} recorded unit-days.
              </p>
              <div className="availability-bottom">
                Full days count as 1; half days as 0.5. Dates without a
                submitted report are excluded.
              </div>
            </section>
          </div>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Unit performance</h2>
                <p>Sorted by repair days. Identify recurring downtime.</p>
              </div>
            </div>
            {data.units.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Unit</th>
                      <th>Repair days</th>
                      <th>Standby days</th>
                      <th>No-driver days</th>
                      <th>Rental collected</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.units.map((u) => (
                      <tr key={u.etrike_id}>
                        <td>
                          <strong>{u.plate_number}</strong>
                        </td>
                        <td>{u.repair_days}</td>
                        <td>{u.standby_days}</td>
                        <td>{u.no_driver_days}</td>
                        <td className="rental-cell">{money(u.total_rental)}</td>
                        <td>
                          <Link
                            aria-label={`View ${u.plate_number} history`}
                            to={`/etrikes/${u.etrike_id}`}
                          >
                            <ArrowUpRight size={18} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                title="No data for this month"
                description="Choose another month or submit your first report."
              />
            )}
          </section>
          <section className="panel notes-panel">
            <h2>Daily rental figures</h2>
            <div className="daily-figures">
              {data.daily.map((d) => (
                <div key={d.date}>
                  <span>{dateLabel(d.date)}</span>
                  <strong>{money(d.rental)}</strong>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </>
  );
}
