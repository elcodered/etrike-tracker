export const money = (n) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: Number(n) % 1 ? 2 : 0,
  }).format(Number(n) || 0);
export const dateLabel = (
  date,
  options = { month: "long", day: "numeric", year: "numeric" },
) =>
  date
    ? new Intl.DateTimeFormat("en-PH", {
        ...options,
        timeZone: "Asia/Manila",
      }).format(new Date(date.length === 10 ? `${date}T12:00:00+08:00` : date))
    : "—";
export const timeLabel = (date) =>
  date ? dateLabel(date, { hour: "numeric", minute: "2-digit" }) : "—";
export const manilaToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const STATUS_LABELS = {
  RUNNING: "Running",
  HALF_DAY: "Half Day",
  REPAIR: "Under Repair",
  STANDBY_FOR_REPAIR: "Standby for Repair",
  NO_DRIVER: "No Driver",
  DRIVER_UNAVAILABLE: "Driver Unavailable",
  NO_OPERATION: "No Operation",
  OTHER: "Other",
};
export function summarize(items = []) {
  return {
    total_units: items.length,
    running: items.filter((i) => i.operational_status === "RUNNING").length,
    half_day: items.filter((i) => i.operational_status === "HALF_DAY").length,
    repair: items.filter((i) => i.operational_status === "REPAIR").length,
    standby: items.filter((i) => i.operational_status === "STANDBY_FOR_REPAIR")
      .length,
    no_driver: items.filter((i) => i.operational_status === "NO_DRIVER").length,
    rental_total:
      items.reduce(
        (s, i) => s + Math.round(Number(i.rental_amount || 0) * 100),
        0,
      ) / 100,
  };
}
export function reportText(report) {
  return `${dateLabel(report.report_date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}\n\n${report.items.map((i, n) => `${n + 1}. ${i.plate_number} - ${i.driver_name || "No driver"} - ${money(i.rental_amount)} - ${STATUS_LABELS[i.operational_status]}${i.remarks ? " — " + i.remarks : ""}`).join("\n")}\n\nTotal Rental: ${money(summarize(report.items).rental_total)}`;
}
export async function copyText(text) {
  if (!navigator.clipboard)
    throw new Error("Clipboard requires HTTPS or localhost.");
  await navigator.clipboard.writeText(text);
}
export const initials = (name) =>
  name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("") || "ET";
