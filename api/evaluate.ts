
export function GET() {
  return Response.json({
    status: "ok",
    message: "EMI-STEM Evaluation API is working",
  });
}

export function POST() {
  return Response.json(
    {
      error: "AI evaluation is not configured yet.",
    },
    { status: 503 }
  );
}
