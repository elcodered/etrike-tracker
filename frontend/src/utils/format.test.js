import { describe, it, expect } from "vitest";
import { summarize, reportText, dateLabel } from "./format";
describe("report display and copy", () => {
  it("sums decimal rental in cents and counts distinct statuses", () => {
    expect(
      summarize([
        { operational_status: "RUNNING", rental_amount: "200.10" },
        { operational_status: "HALF_DAY", rental_amount: "150.20" },
        { operational_status: "REPAIR", rental_amount: 0 },
      ]),
    ).toMatchObject({
      total_units: 3,
      running: 1,
      half_day: 1,
      repair: 1,
      rental_total: 350.3,
    });
  });
  it("generates readable text with custom rentals and remarks", () => {
    const text = reportText({
      report_date: "2026-09-05",
      items: [
        {
          plate_number: "Z140VA",
          driver_name: "CALO",
          operational_status: "HALF_DAY",
          rental_amount: 200,
          remarks: "Driver attended meeting",
        },
      ],
    });
    expect(text).toContain("Saturday");
    expect(text).toContain(
      "Z140VA - CALO - ₱200 - Half Day — Driver attended meeting",
    );
    expect(text).toContain("Total Rental: ₱200");
  });
  it("formats dates in Manila at UTC midnight boundaries", () => {
    expect(dateLabel("2026-09-05T17:00:00Z")).toContain("September 6, 2026");
    expect(dateLabel("2026-09-05")).toContain("September 5, 2026");
  });
});
