
const MAX_FILE_BYTES = 3 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  "pdf", "doc", "docx", "txt", "rtf", "odt"
]);

const ALLOWED_SUBJECTS = new Set([
  "Maths", "Physics", "Chemistry",
  "Biology", "Engineering", "IT"
]);

const ALLOWED_GRADES = new Set(["10", "11", "12"]);

const criteria = [
  ["Curriculum alignment and subject accuracy", 20],
  ["Content and language objectives", 15],
  ["Lesson sequence and learning activities", 15],
  ["EMI scaffolding, vocabulary, and language support", 15],
  ["Engagement, differentiation, and inclusion", 10],
  ["Assessment and checks for understanding", 10],
  ["Classroom management and STEM safety", 10],
  ["Feasibility and teacher reflection", 5]
] as const;

const itemSchema = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false
});

const evaluationSchema = itemSchema({
  overall_score: {
    type: "integer", minimum: 0, maximum: 100
  },
  summary: { type: "string" },
  strengths: {
    type: "array",
    minItems: 2,
    maxItems: 5,
    items: itemSchema({
      title: { type: "string" },
      evidence: { type: "string" }
    })
  },
  areas_to_improve: {
    type: "array",
    minItems: 2,
    maxItems: 5,
    items: itemSchema({
      title: { type: "string" },
      evidence: { type: "string" },
      recommendation: { type: "string" }
    })
  },
  priority_actions: {
    type: "array",
    minItems: 3,
    maxItems: 5,
    items: { type: "string" }
  },
  rubric_scores: {
    type: "array",
    minItems: 8,
    maxItems: 8,
    items: itemSchema({
      criterion: { type: "string" },
      score: { type: "integer" },
      max_score: { type: "integer" },
      rationale: { type: "string" }
    })
  }
});

function jsonError(message: string, status: number) {
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

export function GET() {
  return Response.json({
    status: "ok",
    message: "EMI-STEM AI Evaluation API is available"
  });
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return jsonError(
      "OpenAI API key is not configured.", 503
    );
  }

  try {
    const length = Number(
      request.headers.get("content-length") || 0
    );

    if (length > 4 * 1024 * 1024) {
      return jsonError(
        "Request is too large. Upload a file below 3 MB.",
        413
      );
    }

    const form = await request.formData();

    const file = form.get("lesson_plan");
    const subject = String(form.get("subject") || "");
    const grade = String(form.get("grade") || "");
    const notes = String(
      form.get("teacher_notes") || ""
    ).slice(0, 2000);

    if (!(file instanceof File)) {
      return jsonError("Please upload a lesson plan.", 400);
    }

    if (!ALLOWED_SUBJECTS.has(subject)) {
      return jsonError("Invalid subject.", 400);
    }

    if (grade && !ALLOWED_GRADES.has(grade)) {
      return jsonError("Invalid grade.", 400);
    }

    if (file.size === 0 || file.size > MAX_FILE_BYTES) {
      return jsonError(
        "Please upload a file smaller than 3 MB.", 400
      );
    }

    const extension = file.name
      .split(".").pop()?.toLowerCase() || "";

    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return jsonError("Unsupported file format.", 400);
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      doc: "application/msword",
      docx:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      txt: "text/plain",
      rtf: "application/rtf",
      odt: "application/vnd.oasis.opendocument.text"
    };

    const fileData = `data:${mimeTypes[extension]};base64,${bytes.toString("base64")}`;

    const rubric = criteria
      .map(([name, points], index) =>
        `${index + 1}. ${name}: ${points} points`
      )
      .join("\n");

    const prompt = [
      `Evaluate this ${subject} Grade ${grade || "10-12"} EMI lesson plan for STEM teachers in Vietnam.`,
      "Use the following 100-point rubric:",
      rubric,
      "Evaluate each of the eight criteria exactly once, in the order shown.",
      "Each maximum score must equal the rubric allocation.",
      "The overall score must equal the sum of the eight scores.",
      "Provide specific evidence from the uploaded document.",
      "Do not invent evidence. Identify missing information.",
      "Every narrative field must be bilingual: English first, then Vietnamese, separated by ' / '.",
      "For criterion labels use the English rubric names exactly.",
      "Provide strengths, areas for improvement, and priority actions.",
      `Teacher context: ${notes || "Not provided."}`
    ].join("\n\n");

    const upstream = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-5-mini",
          store: false,
          max_output_tokens: 5000,
          input: [{
            role: "user",
            content: [
              {
                type: "input_file",
                filename: file.name,
                file_data: fileData
              },
              {
                type: "input_text",
                text: prompt
              }
            ]
          }],
          text: {
            format: {
              type: "json_schema",
              name: "emi_lesson_plan_evaluation",
              strict: true,
              schema: evaluationSchema
            }
          }
        })
      }
    );

    const payload = await upstream.json();

    if (!upstream.ok) {
      console.error(
        "OpenAI error:",
        upstream.status,
        payload?.error?.message || "Unknown error"
      );

      if (upstream.status === 429) {
        return jsonError(
          "AI usage limit reached. Please try later.", 503
        );
      }

      return jsonError(
        "OpenAI could not evaluate this document. Check the file format and API configuration.",
        502
      );
    }

    const outputText =
      typeof payload.output_text === "string"
        ? payload.output_text
        : (payload.output || [])
            .flatMap((item: any) => item.content || [])
            .filter((part: any) =>
              part.type === "output_text"
            )
            .map((part: any) => part.text)
            .join("");

    if (!outputText) {
      return jsonError(
        "The AI returned no evaluation report.", 502
      );
    }

    let evaluation: any;

    try {
      evaluation = JSON.parse(outputText);
    } catch {
      return jsonError(
        "The AI returned an unreadable report.", 502
      );
    }

    if (
      !Array.isArray(evaluation.rubric_scores) ||
      evaluation.rubric_scores.length !== 8
    ) {
      return jsonError(
        "The AI returned an incomplete rubric.", 502
      );
    }

    let total = 0;

    for (let i = 0; i < criteria.length; i++) {
      const [criterion, maximum] = criteria[i];
      const result = evaluation.rubric_scores[i];

      if (
        result.criterion !== criterion ||
        result.max_score !== maximum ||
        !Number.isInteger(result.score) ||
        result.score < 0 ||
        result.score > maximum
      ) {
        return jsonError(
          "The AI returned inconsistent rubric scores.",
          502
        );
      }

      total += result.score;
    }

    evaluation.overall_score = total;

    return Response.json(
      { evaluation },
      { headers: { "Cache-Control": "no-store" } }
    );

  } catch (error) {
    console.error(
      "Evaluation failure:",
      error instanceof Error ? error.message : error
    );

    return jsonError(
      "Evaluation failed. Please try again.", 500
    );
  }
}
