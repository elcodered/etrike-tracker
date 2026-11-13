import {
  Bike,
  CheckCircle2,
  Wrench,
  Clock3,
  UserRoundX,
  Wallet,
} from "lucide-react";
import { money } from "../utils/format";
export default function SummaryCards({
  summary = {},
  total,
  rentalLabel = "Rental collected",
}) {
  const cards = [
    ["Total e-trikes", total ?? summary.total_units ?? 0, Bike, "neutral"],
    ["Running", summary.running ?? 0, CheckCircle2, "green"],
    ["Under repair", summary.repair ?? 0, Wrench, "red"],
    ["Standby", summary.standby ?? 0, Clock3, "orange"],
    ["No driver", summary.no_driver ?? 0, UserRoundX, "gray"],
    [rentalLabel, money(summary.rental_total), Wallet, "rental"],
  ];
  return (
    <div className="summary-grid">
      {cards.map(([label, value, Icon, color]) => (
        <div className={`summary-card ${color}`} key={label}>
          <div className="summary-top">
            <span>{label}</span>
            <Icon size={18} />
          </div>
          <strong>{value}</strong>
          <span className="summary-caption">
            {color === "rental"
              ? "Philippine peso"
              : label === "Running"
                ? `${summary.half_day || 0} additional half-day`
                : "Fleet overview"}
          </span>
        </div>
      ))}
    </div>
  );
}
