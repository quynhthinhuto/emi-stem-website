import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Download, ExternalLink } from "lucide-react";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(projectRoot, "public", "modules");
const booksOnly = process.argv.includes("--books-only");
const vocabularyOnly = process.argv.includes("--vocabulary-only");
const lessonPlansOnly = process.argv.includes("--lesson-plans-only");
if ([booksOnly, vocabularyOnly, lessonPlansOnly].filter(Boolean).length > 1) throw new Error("Choose only one resource generation mode.");
const catalogPath = path.join(projectRoot, "lib", "subject-books.json");
const books = fs.existsSync(catalogPath) ? JSON.parse(fs.readFileSync(catalogPath, "utf8")) : [];
const lessonPlanCatalogPath = path.join(projectRoot, "lib", "subject-lesson-plans.json");
const lessonPlans = fs.existsSync(lessonPlanCatalogPath) ? JSON.parse(fs.readFileSync(lessonPlanCatalogPath, "utf8")) : [];
const pageStyleVersion = "68";
const pageScriptVersion = "68";

const subjects = [
  { key: "maths", name: "Maths", code: "M" },
  { key: "physics", name: "Physics", code: "P" },
  { key: "chemistry", name: "Chemistry", code: "C" },
  { key: "biology", name: "Biology", code: "B" },
  { key: "engineering", name: "Engineering", code: "E" },
  { key: "it", name: "IT", code: "IT" },
];
const resources = [
  {
    key: "books",
    title: "Books",
    description: "Subject books and supporting materials for EMI teaching.",
  },
  {
    key: "template",
    title: "Lesson Plan Template",
    description: "A structured lesson-plan template for subject and language objectives.",
  },
  {
    key: "example",
    title: "Example of Lesson Plan",
    description: "A subject-specific example showing the lesson structure in practice.",
  },
  {
    key: "practice",
    title: "Practice and Evaluate",
    description: "Upload a lesson plan and receive an automatic ChatGPT evaluation.",
  },
  {
    key: "vocabulary",
    title: "Vocabulary",
    description: "Subject terminology for EMI teaching.",
  },
];

function moduleDialog() {
  return `
    <dialog class="dialog" data-module-dialog aria-labelledby="module-dialog-title">
      <div class="dialog-header"><div><h2 id="module-dialog-title">Choose a module</h2><p>Select Module 1 to Module 5 to open its own page.</p></div><button class="icon-button" type="button" aria-label="Close module dialog" data-close-dialog>&times;</button></div>
      <div class="dialog-body"><div class="course-map"><a href="module-1.html"><span class="module-number">1</span><span><b>Module 1: Introduction</b><span>Video and short written introduction</span></span></a><a href="module-2.html"><span class="module-number">2</span><span><b>Module 2: Lesson Plan</b><span>Video and lesson plan structure file</span></span></a><a href="module-3.html"><span class="module-number">3</span><span><b>Module 3: Strategies in Classroom</b><span>Video and classroom management file</span></span></a><a href="module-4.html"><span class="module-number">4</span><span><b>Module 4: Subject Resources</b><span>Books, lesson planning, practice, and AI evaluation</span></span></a><a href="module-5.html"><span class="module-number">5</span><span><b>Module 5: Resources</b><span>Curriculum, subject content, vocabulary, and more</span></span></a></div></div>
    </dialog>`;
}

function page({ title, description, kicker, heading, copy, actions, body, extraScript = "", extraStyle = "" }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title} | EMI Training</title>
    <meta name="description" content="${description}">
    <link rel="icon" type="image/svg+xml" href="../favicon.svg">
    <link rel="stylesheet" href="../style.css?v=${pageStyleVersion}">${extraStyle}
  </head>
  <body>
    <div class="site-shell">
      <header class="topbar">
        <nav class="nav" aria-label="Primary navigation">
          <a class="brand" href="../index.html" aria-label="EMI Training home"><span class="brand-mark">EMI</span><span>STEM Teacher Training</span></a>
          <div class="nav-links" aria-label="Page navigation"><a href="../index.html">Home</a><button class="nav-button" type="button" data-open-modules>Modules</button></div>
        </nav>
      </header>

      <section class="page-hero">
        <div class="page-hero-inner single">
          <div>
            <p class="kicker">${kicker}</p>
            <h1>${heading}</h1>
            <p class="page-copy">${copy}</p>
            <div class="page-actions">${actions}</div>
          </div>
        </div>
      </section>

      <main>${body}</main>
      <footer><div class="footer-inner"><span>Module 4: Subject Resources</span><span><a href="module-4.html">Back to Subject Resources</a></span></div></footer>
    </div>
    ${moduleDialog()}
    <script src="../site.js?v=${pageScriptVersion}"></script>${extraScript}
  </body>
</html>
`;
}

function navigationLink(href, eyebrow, title, description, marker) {
  return `<a class="pathway-button" href="${href}"><span class="pathway-marker" aria-hidden="true">${marker}</span><span><span class="pathway-eyebrow">${eyebrow}</span><span class="pathway-title">${title}</span><span class="pathway-description">${description}</span></span></a>`;
}

function write(filename, content) {
  fs.writeFileSync(path.join(outputDirectory, filename), content, "utf8");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function booksBody(subject) {
  const subjectBooks = books.filter(book => book.subject === subject.key);
  if (!subjectBooks.length) return null;
  const icon = component => renderToStaticMarkup(createElement(component, { size: 20, "aria-hidden": true }));
  const rows = subjectBooks.map(book => {
    const href = `/api/books?subject=${encodeURIComponent(book.subject)}&file=${encodeURIComponent(book.id)}`;
    const title = escapeHtml(book.title);
    const cover = `/assets/book-covers/${book.subject}/${book.id}.jpg`;
    if (!fs.existsSync(path.join(projectRoot, "public", cover))) throw new Error(`Missing cover image: ${cover}`);
    const megabytes = (book.bytes / (1024 * 1024)).toFixed(1);
    return `<li class="resource-item pdf-resource-item book-row"><a class="book-cover" href="${escapeHtml(href)}" target="_blank" rel="noopener" aria-label="Open PDF: ${title}"><img src="${escapeHtml(cover)}" alt="Cover preview: ${title}" width="96" height="136" loading="lazy" decoding="async"></a><div class="resource-copy"><a class="resource-title resource-title-link" href="${escapeHtml(href)}" target="_blank" rel="noopener">${title}</a><span class="resource-description">PDF &middot; ${book.pages} pages &middot; ${megabytes} MB</span></div><div class="book-actions"><a class="button secondary" href="${escapeHtml(href)}" target="_blank" rel="noopener" aria-label="Open PDF: ${title}">${icon(ExternalLink)}<span>Open PDF</span></a><a class="book-download" href="${escapeHtml(href)}&amp;download=1" download="${escapeHtml(book.downloadName)}" aria-label="Download PDF: ${title}" title="Download PDF: ${title}">${icon(Download)}</a></div></li>`;
  }).join("\n");
  return `<section class="section resource-detail-section" aria-labelledby="books-title"><div class="section-heading"><div><h2 id="books-title">${subject.name} books</h2></div><p>${subjectBooks.length} PDF documents</p></div><ul class="resource-list book-library">${rows}</ul></section>`;
}

function lessonPlanBody(subject, resource) {
  const plan = lessonPlans.find(item => item.subject === subject.key && item.kind === resource.key);
  if (!plan) {
    if (lessonPlansOnly) throw new Error(`Missing lesson plan: ${subject.key}/${resource.key}`);
    return null;
  }
  const esc = escapeHtml;
  const icon = component => renderToStaticMarkup(createElement(component, { size: 20, "aria-hidden": true }));
  const label = resource.key === "template" ? "Lesson Plan Template / Mẫu kế hoạch bài dạy" : "Lesson Plan Example / Giáo án minh họa";
  const assetHref = file => esc(`${file.path}?v=${file.sha256.slice(0, 12)}`);
  const pdf = assetHref(plan.files.pdf);
  const docx = assetHref(plan.files.docx);
  const bookHref = `/api/books?subject=${encodeURIComponent(subject.key)}&file=${encodeURIComponent(plan.bookId)}`;
  for (const file of Object.values(plan.files)) {
    if (!fs.existsSync(path.join(projectRoot, "public", file.path))) throw new Error(`Missing lesson-plan asset: ${file.path}`);
  }
  const sourceNote = plan.syllabusBased
    ? "Cambridge IGCSE Design &amp; Technology syllabus 0445. / Dựa trên syllabus Design &amp; Technology 0445; chưa có sách giáo khoa Engineering đầy đủ trong thư viện."
    : `${esc(plan.book)}<br>${esc(plan.chapter)}`;
  return `<section class="section resource-detail-section" aria-labelledby="lesson-plan-title">
    <article class="instruction-file" data-lesson-plan="${esc(resource.key)}" data-subject="${esc(subject.key)}">
      <a class="instruction-file-cover" href="${pdf}" target="_blank" rel="noopener" aria-label="Open PDF / Mở PDF: ${esc(subject.name)} ${esc(label)}"><img src="${assetHref(plan.files.cover)}" alt="First page / Trang đầu: ${esc(subject.name)} ${esc(label)}" width="936" height="1210" decoding="async"></a>
      <div class="resource-copy"><p class="eyebrow">${esc(subject.name)} / ${esc(plan.vi)} &middot; English - Vietnamese</p><h2 id="lesson-plan-title">${esc(label)}</h2><p>${esc(plan.topic[0])}<br><span lang="vi">${esc(plan.topic[1])}</span></p><p class="resource-description">${plan.lessonMinutes} minutes / phút &middot; ${plan.pages} pages / trang &middot; PDF + Word</p></div>
      <div class="book-actions"><a class="button secondary" href="${pdf}" target="_blank" rel="noopener">${icon(ExternalLink)}<span>Open PDF / Mở PDF</span></a><a class="button secondary" href="${docx}" download>${icon(Download)}<span>Word</span></a><a class="book-download" href="${pdf}" download title="Download PDF / Tải PDF" aria-label="Download PDF / Tải PDF">${icon(Download)}</a></div>
    </article>
    <div class="section-heading"><div><h2>Reference / Nguồn tham chiếu</h2><p>${sourceNote}</p><p><a href="${esc(bookHref)}" target="_blank" rel="noopener">${plan.syllabusBased ? "Open syllabus / Mở syllabus" : "Open referenced book / Mở sách tham chiếu"}</a></p><p><a href="${esc(plan.guidance)}" target="_blank" rel="noopener">Cambridge lesson-planning guidance / Hướng dẫn lập kế hoạch bài dạy</a></p></div></div>
    <p class="resource-description">Independently prepared bilingual EMI resource, adapted from Cambridge planning guidance; not issued or endorsed by Cambridge. / Tài liệu EMI song ngữ biên soạn độc lập theo hướng dẫn lập kế hoạch của Cambridge; không do Cambridge phát hành hoặc chứng nhận.</p>
  </section>`;
}

for (const filename of fs.readdirSync(outputDirectory)) {
  if (
    !booksOnly && !vocabularyOnly && !lessonPlansOnly && /^subject-resources-(maths|physics|chemistry|biology|engineering|it)-grade-(10|11|12)(?:-(curriculum|template|example|practice))?\.html$/.test(
      filename,
    )
  ) {
    fs.unlinkSync(path.join(outputDirectory, filename));
  }
}

for (const subject of subjects) {
  const resourceLinks = resources
    .map((resource, index) =>
      navigationLink(
        `subject-resources-${subject.key}-${resource.key}.html`,
        subject.name,
        resource.title,
        resource.description,
        String(index + 1).padStart(2, "0"),
      ),
    )
    .join("\n");

  if (!booksOnly && !lessonPlansOnly) write(
    `subject-resources-${subject.key}.html`,
    page({
      title: `${subject.name} Subject Resources`,
      description: `${subject.name} books, lesson-planning resources, examples, AI evaluation, and vocabulary.`,
      kicker: "Subject Resources",
      heading: subject.name,
      copy: `Access books, lesson-plan templates, examples, AI-assisted evaluation, and vocabulary for ${subject.name}.`,
      actions: '<a class="button secondary" href="module-4.html">Back to Subject Resources</a>',
      body: `<section class="section subject-resource-section"><div class="section-heading"><div><p class="eyebrow">Choose a resource</p><h2>${subject.name} teaching resources</h2></div><p>Books, lesson planning, examples, AI-assisted evaluation, and vocabulary.</p></div><div class="resource-navigation material-navigation">${resourceLinks}</div></section>`,
    }),
  );

  for (const resource of resources) {
    if (booksOnly && resource.key !== "books") continue;
    if (vocabularyOnly && resource.key !== "vocabulary") continue;
    if (lessonPlansOnly && !["template", "example"].includes(resource.key)) continue;
    const filename = `subject-resources-${subject.key}-${resource.key}.html`;
    if (resource.key === "vocabulary") {
      write(filename, page({
        title: `${subject.name} Vocabulary`,
        description: `Vocabulary resources for ${subject.name} EMI teaching.`,
        kicker: subject.name,
        heading: "Vocabulary",
        copy: `${subject.name} terminology for EMI teaching.`,
        actions: `<a class="button secondary" href="subject-resources-${subject.key}.html">Back to ${subject.name}</a>`,
        body: `<section class="section resource-detail-section"><div class="resource-detail-empty"><span class="resource-detail-marker" aria-hidden="true">${subject.code}</span><div><p class="eyebrow">Vocabulary</p><h2>${subject.name}</h2><p>No vocabulary materials have been added yet.</p></div></div></section>`,
      }));
      continue;
    }
    if (resource.key === "practice") {
      write(
        filename,
        page({
          title: `${subject.name} Practice and Evaluate`,
          description: `Upload and evaluate a ${subject.name} EMI lesson plan with ChatGPT.`,
          kicker: subject.name,
          heading: "Practice and Evaluate",
          copy: "Upload your lesson plan to receive an automatic rubric-based evaluation with strengths, areas to improve, and priority actions.",
          actions: `<a class="button secondary" href="subject-resources-${subject.key}.html">Back to ${subject.name}</a>`,
          body: `<section class="section evaluation-workspace"><div class="evaluation-layout"><form class="evaluation-form" data-evaluation-form enctype="multipart/form-data"><input type="hidden" name="subject" value="${subject.name}"><div><p class="eyebrow">Upload lesson plan / Tải giáo án</p><h2>${subject.name}</h2><p class="evaluation-intro">Accepted formats: PDF, DOC, DOCX, TXT, RTF, and ODT. Maximum file size: 8 MB. / Định dạng được chấp nhận: PDF, Word, TXT, RTF và ODT. Dung lượng tối đa: 8 MB.</p></div><label class="file-drop"><span class="file-drop-title">Choose lesson-plan file / Chọn tệp giáo án</span><span class="file-drop-copy" data-file-name>No file selected / Chưa chọn tệp</span><input type="file" name="lesson_plan" accept=".pdf,.doc,.docx,.txt,.rtf,.odt" required data-lesson-plan-file></label><label class="evaluation-notes"><span>Teacher context, goals, or concerns (optional) / Bối cảnh, mục tiêu hoặc điều cần lưu ý (không bắt buộc)</span><textarea name="teacher_notes" rows="4" maxlength="2000" placeholder="Add any context that may help the evaluation..."></textarea></label><button class="button primary evaluation-submit" type="submit">Evaluate lesson plan / Đánh giá giáo án</button><p class="evaluation-status" role="status" aria-live="polite" data-evaluation-status></p><p class="evaluation-privacy">The file is sent securely to OpenAI for this evaluation and is not stored by this website. AI feedback may contain errors and should support, not replace, professional judgement. / Tệp được gửi bảo mật tới OpenAI để đánh giá và không được website lưu trữ. Phản hồi AI có thể có sai sót và không thay thế nhận định chuyên môn.</p></form><section class="evaluation-results" aria-live="polite" data-evaluation-results hidden></section></div></section>`,
          extraScript: '\n    <script src="../evaluator.js?v=43"></script>',
        }),
      );
      continue;
    }

    write(
      filename,
      page({
        title: `${subject.name} ${resource.title}`,
        description: `${resource.title} resources for ${subject.name}.`,
        kicker: subject.name,
        heading: resource.title,
        copy: resource.description,
        actions: `<a class="button secondary" href="subject-resources-${subject.key}.html">Back to ${subject.name}</a>`,
        extraStyle: ["template", "example"].includes(resource.key) ? '\n    <link rel="stylesheet" href="../lesson-plans.css?v=1">' : "",
        body: (resource.key === "books" ? booksBody(subject) : ["template", "example"].includes(resource.key) ? lessonPlanBody(subject, resource) : null) || `<section class="section resource-detail-section"><div class="resource-detail-empty"><span class="resource-detail-marker" aria-hidden="true">${subject.code}</span><div><p class="eyebrow">${resource.title}</p><h2>${subject.name}</h2><p>This page is ready for the relevant file and teaching content. / Trang này đã sẵn sàng để tải tệp và nội dung giảng dạy phù hợp.</p></div></div></section>`,
      }),
    );
  }
}

console.log(`Generated ${booksOnly ? subjects.length : lessonPlansOnly ? subjects.length * 2 : vocabularyOnly ? subjects.length * 2 : subjects.length * (1 + resources.length)} Subject Resources pages.`);
