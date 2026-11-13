import { api, errorText } from "./client";

export async function downloadReportPdf(report) {
  let response;
  try {
    response = await api.get(`/api/daily-reports/${report.id}/pdf`, {
      responseType: "blob",
      params: { version: report.version },
      timeout: 60000,
    });
  } catch (error) {
    // Axios also returns JSON validation/authorization errors as blobs in this request.
    if (error.response?.data instanceof Blob) {
      try {
        error.response.data = JSON.parse(await error.response.data.text());
      } catch {
        // Preserve the ordinary connection error if the response was not JSON.
      }
    }
    throw new Error(errorText(error));
  }

  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `e-trike-daily-report-${report.report_date}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Allow the browser time to start consuming the PDF before releasing the blob.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
