
export { POST } from "../app/api/evaluate/route";

export function GET() {
  return Response.json({
    status: "ok",
    message: "EMI-STEM evaluation API is available",
  });
}
