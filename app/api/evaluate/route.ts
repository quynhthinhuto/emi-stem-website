const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["pdf", "doc", "docx", "txt", "rtf", "odt"]);
const ALLOWED_SUBJECTS = new Set([
  "Maths",
  "Physics",
  "Chemistry",
  "Biology",
  "Engineering",
  "IT",
]);
const ALLOWED_GRADES = new Set(["10", "11", "12"]);

const evaluationSchema = {
  type: "object",
  properties: {
    overall_score: { type: "integer", minimum: 0, maximum: 100 },
    summary: { type: "string" },
    strengths: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          evidence: { type: "string" },
        },
        required: ["title", "evidence"],
        additionalProperties: false,
      },
    },
    areas_to_improve: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          evidence: { type: "string" },
          recommendation: { type: "string" },
        },
        required: ["title", "evidence", "recommendation"],
        additionalProperties: false,
      },
    },
    priority_actions: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: { type: "string" },
    },
    rubric_scores: {
      type: "array",
      minItems: 8,
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          criterion: { type: "string" },
          score: { type: "integer" },
          max_score: { type: "integer" },
          rationale: { type: "string" },
        },
        required: ["criterion", "score", "max_score", "rationale"],
        additionalProperties: false,
      },
    },
  },
  required: [
    "overall_score",
    "summary",
    "strengths",
    "areas_to_improve",
    "priority_actions",
    "rubric_scores",
  ],
  additionalProperties: false,
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function extensionOf(filename: string) {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() || "" : "";
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function getOutputText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }
  if (!Array.isArray(payload.output)) return "";

  const textParts: string[] = [];
  for (const item of payload.output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const candidate = part as { type?: unknown; text?: unknown };
      if (candidate.type === "output_text" && typeof candidate.text === "string") {
        textParts.push(candidate.text);
      }
    }
  }
  return textParts.join("");
}

function parseEvaluation(outputText: string) {
  const trimmed = outputText.trim();
  if (!trimmed) return null;

  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const objectStart = withoutFence.indexOf("{");
  const objectEnd = withoutFence.lastIndexOf("}");
  const candidates = [
    trimmed,
    withoutFence,
    objectStart >= 0 && objectEnd > objectStart
      ? withoutFence.slice(objectStart, objectEnd + 1)
      : "",
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next safe representation before requesting a fresh report.
    }
  }
  return null;
}

async function requestEvaluation(
  apiKey: string,
  filename: string,
  fileData: string,
  extension: string,
  prompt: string,
) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-6-luna",
      store: false,
      reasoning: { effort: "none" },
      max_output_tokens: 8000,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_file",
              filename,
              file_data: fileData,
              ...(extension === "pdf" ? { detail: "low" } : {}),
            },
            { type: "input_text", text: prompt },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "emi_lesson_plan_evaluation",
          strict: true,
          schema: evaluationSchema,
        },
      },
    }),
  });

  let payload: Record<string, unknown> = {};
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    // The caller turns an unreadable upstream response into a safe user message.
  }
  return { response, payload };
}

function upstreamError(payload: Record<string, unknown>) {
  const error = payload.error as { message?: unknown } | undefined;
  return typeof error?.message === "string" ? error.message : "";
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonError("The lesson-plan evaluator is not configured yet.", 503);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("The uploaded form could not be read.", 400);
  }

  const fileValue = formData.get("lesson_plan");
  const subject = String(formData.get("subject") || "");
  const grade = String(formData.get("grade") || "");
  const teacherNotes = String(formData.get("teacher_notes") || "").slice(0, 2000);

  if (!(fileValue instanceof File)) {
    return jsonError("Please select a lesson-plan file.", 400);
  }
  if (!ALLOWED_SUBJECTS.has(subject) || (grade && !ALLOWED_GRADES.has(grade))) {
    return jsonError("The selected subject is not valid.", 400);
  }
  if (fileValue.size === 0 || fileValue.size > MAX_FILE_BYTES) {
    return jsonError("The file must be between 1 byte and 8 MB.", 400);
  }

  const extension = extensionOf(fileValue.name);
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return jsonError("Upload a PDF, Word, TXT, RTF, or ODT lesson plan.", 400);
  }

  const bytes = new Uint8Array(await fileValue.arrayBuffer());
  const mimeType = fileValue.type || "application/octet-stream";
  const fileData = `data:${mimeType};base64,${bytesToBase64(bytes)}`;
  const prompt = [
    `Evaluate the uploaded ${subject}${grade ? ` Grade ${grade}` : ""} EMI lesson plan for use in Vietnam.`,
    "Use this 100-point rubric: curriculum alignment and subject accuracy (20); content and language objectives (15); lesson sequence and learning activities (15); EMI scaffolding, vocabulary, and language support (15); engagement, differentiation, and inclusion (10); assessment and checks for understanding (10); classroom management and STEM safety (10); feasibility and teacher reflection (5).",
    "Base every finding on evidence in the document. If required information is missing, identify it as an area to improve rather than inventing it.",
    "For every narrative field, write concise English first and then a Vietnamese translation, separated by ' / '.",
    teacherNotes ? `Teacher context: ${teacherNotes}` : "No additional teacher context was supplied.",
  ].join("\n\n");

  let { response: openAIResponse, payload } = await requestEvaluation(
    apiKey,
    fileValue.name,
    fileData,
    extension,
    prompt,
  );

  if (!openAIResponse.ok) {
    const errorMessage = upstreamError(payload);
    console.error("OpenAI evaluation failed", openAIResponse.status, errorMessage);
    if (
      openAIResponse.status === 429 &&
      /no credits|insufficient_quota|quota|billing/i.test(errorMessage)
    ) {
      return jsonError(
        "AI evaluation is unavailable because the site API account has no remaining credits. Please contact the site administrator.",
        503,
      );
    }
    return jsonError("The AI evaluation service is temporarily unavailable. Please try again.", 502);
  }

  let outputText = getOutputText(payload);
  if (!outputText) {
    console.error("OpenAI evaluation returned no output text");
    return jsonError("The evaluator did not return a report. Please try again.", 502);
  }

  let evaluation = parseEvaluation(outputText);
  if (!evaluation) {
    console.warn("OpenAI evaluation output was incomplete; retrying once");
    const retryPrompt = [
      prompt,
      "Return one complete JSON report. Keep every bilingual evidence, recommendation, and rationale concise so the entire report fits within the response limit.",
    ].join("\n\n");
    ({ response: openAIResponse, payload } = await requestEvaluation(
      apiKey,
      fileValue.name,
      fileData,
      extension,
      retryPrompt,
    ));

    if (!openAIResponse.ok) {
      const errorMessage = upstreamError(payload);
      console.error("OpenAI evaluation retry failed", openAIResponse.status, errorMessage);
      return jsonError("The AI evaluation service is temporarily unavailable. Please try again.", 502);
    }
    outputText = getOutputText(payload);
    evaluation = parseEvaluation(outputText);
  }

  if (!evaluation) {
    console.error("OpenAI evaluation returned invalid structured output after retry");
    return jsonError("The evaluation report could not be read. Please try again.", 502);
  }

  return Response.json({ evaluation });
}
