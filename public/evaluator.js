function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function renderEvaluation(container, evaluation) {
  container.replaceChildren();

  const scoreHeader = document.createElement("div");
  scoreHeader.className = "evaluation-score-header";
  const score = createTextElement("strong", "evaluation-score", `${evaluation.overall_score}/100`);
  const scoreCopy = document.createElement("div");
  scoreCopy.append(
    createTextElement("span", "evaluation-label", "Overall evaluation / Đánh giá tổng quan"),
    createTextElement("p", "evaluation-summary", evaluation.summary),
  );
  scoreHeader.append(score, scoreCopy);
  container.append(scoreHeader);

  const columns = document.createElement("div");
  columns.className = "evaluation-columns";

  const strengths = document.createElement("section");
  strengths.className = "evaluation-section evaluation-strengths";
  strengths.append(createTextElement("h3", "", "Strengths / Điểm mạnh"));
  const strengthsList = document.createElement("ul");
  evaluation.strengths.forEach((item) => {
    const listItem = document.createElement("li");
    listItem.append(
      createTextElement("strong", "", item.title),
      createTextElement("p", "", item.evidence),
    );
    strengthsList.append(listItem);
  });
  strengths.append(strengthsList);

  const improvements = document.createElement("section");
  improvements.className = "evaluation-section evaluation-improvements";
  improvements.append(createTextElement("h3", "", "Areas to improve / Điểm cần cải thiện"));
  const improvementsList = document.createElement("ul");
  evaluation.areas_to_improve.forEach((item) => {
    const listItem = document.createElement("li");
    listItem.append(
      createTextElement("strong", "", item.title),
      createTextElement("p", "", item.evidence),
      createTextElement("p", "evaluation-recommendation", item.recommendation),
    );
    improvementsList.append(listItem);
  });
  improvements.append(improvementsList);
  columns.append(strengths, improvements);
  container.append(columns);

  const rubric = document.createElement("section");
  rubric.className = "evaluation-rubric";
  rubric.append(createTextElement("h3", "", "Rubric scores / Điểm theo tiêu chí"));
  const tableWrapper = document.createElement("div");
  tableWrapper.className = "evaluation-table-wrapper";
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["Criterion / Tiêu chí", "Score / Điểm", "Rationale / Nhận xét"].forEach((label) => {
    headerRow.append(createTextElement("th", "", label));
  });
  thead.append(headerRow);
  const tbody = document.createElement("tbody");
  evaluation.rubric_scores.forEach((item) => {
    const row = document.createElement("tr");
    row.append(
      createTextElement("td", "", item.criterion),
      createTextElement("td", "evaluation-table-score", `${item.score}/${item.max_score}`),
      createTextElement("td", "", item.rationale),
    );
    tbody.append(row);
  });
  table.append(thead, tbody);
  tableWrapper.append(table);
  rubric.append(tableWrapper);
  container.append(rubric);

  const actions = document.createElement("section");
  actions.className = "evaluation-actions";
  actions.append(createTextElement("h3", "", "Priority actions / Việc cần ưu tiên"));
  const actionsList = document.createElement("ol");
  evaluation.priority_actions.forEach((item) => {
    actionsList.append(createTextElement("li", "", item));
  });
  actions.append(actionsList);
  container.append(actions);
}

document.querySelectorAll("[data-evaluation-form]").forEach((form) => {
  const fileInput = form.querySelector("[data-lesson-plan-file]");
  const fileName = form.querySelector("[data-file-name]");
  const status = form.querySelector("[data-evaluation-status]");
  const submitButton = form.querySelector("button[type='submit']");
  const results = document.querySelector("[data-evaluation-results]");

  fileInput.addEventListener("change", () => {
    const selected = fileInput.files && fileInput.files[0];
    fileName.textContent = selected
      ? `${selected.name} (${(selected.size / 1024 / 1024).toFixed(2)} MB)`
      : "No file selected / Chưa chọn tệp";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const selected = fileInput.files && fileInput.files[0];
    if (!selected) {
      status.textContent = "Please select a lesson-plan file. / Vui lòng chọn tệp giáo án.";
      status.dataset.state = "error";
      return;
    }

    status.textContent = "ChatGPT is evaluating the lesson plan. This may take a moment. / ChatGPT đang đánh giá giáo án. Vui lòng chờ trong giây lát.";
    status.dataset.state = "loading";
    submitButton.disabled = true;
    submitButton.textContent = "Evaluating... / Đang đánh giá...";
    results.hidden = true;

    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        body: new FormData(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Evaluation failed.");

      renderEvaluation(results, payload.evaluation);
      results.hidden = false;
      status.textContent = "Evaluation complete. / Đánh giá đã hoàn tất.";
      status.dataset.state = "success";
      results.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      status.textContent = `${error.message || "Evaluation failed."} / Không thể hoàn tất đánh giá. Vui lòng thử lại.`;
      status.dataset.state = "error";
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Evaluate lesson plan / Đánh giá giáo án";
    }
  });
});
