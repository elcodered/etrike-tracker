import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { money, dateLabel } from "../utils/format";
import { Empty } from "./UI";
export default function RentalChart({ data = [] }) {
  if (!data.length)
    return (
      <Empty
        title="Your rental trend starts here"
        description="Submit a daily report to begin tracking collections."
      />
    );
  return (
    <div
      className="rental-chart"
      role="img"
      aria-label={`Rental collection trend across ${data.length} submitted report dates`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 15, right: 15, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="#e9ede8"
            strokeDasharray="3 4"
          />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#859087", fontSize: 11 }}
            tickFormatter={(d) =>
              dateLabel(d, { month: "short", day: "numeric" })
            }
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={48}
            tick={{ fill: "#859087", fontSize: 11 }}
            tickFormatter={(n) => (n >= 1000 ? `${n / 1000}k` : n)}
          />
          <Tooltip
            formatter={(n) => [money(n), "Rental"]}
            labelFormatter={(d) => dateLabel(d)}
            contentStyle={{ borderRadius: 10, border: "1px solid #e4e9e2" }}
          />
          <Area
            type="monotone"
            dataKey="rental"
            stroke="#287858"
            fill="#edf5e9"
            strokeWidth={2.5}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
