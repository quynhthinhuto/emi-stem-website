const pagePath = window.location.pathname;
const pageSlug = (pagePath.split("/").pop() || "index").replace(/\.html$/, "") || "index";
const isModuleDirectory = pagePath.includes("/modules/");
const homeHref = isModuleDirectory ? "../index.html" : "index.html";
const moduleNames = {
  "1": "Introduction",
  "2": "Lesson Plan",
  "3": "Strategies in Classroom",
  "4": "Subject Resources",
  "5": "Resources",
};
const subjectNames = {
  maths: "Maths",
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
  engineering: "Engineering",
  it: "IT",
};
const subjectResourceLabels = {
  books: "Books",
  template: "Lesson Plan Template",
  example: "Example of Lesson Plan",
  practice: "Practice and Evaluate",
  vocabulary: "Vocabulary",
};
const module2Pages = [
  { key: "video", label: "Video", href: "module-2.html#video" },
  { key: "lesson-plans", label: "Format of Lesson Plan", href: "module-2.html#lesson-plan" },
  { key: "test", label: "Test", href: "module-2.html#test" },
];
const module3Pages = [
  { key: "video", label: "Video", href: "module-3-video.html" },
  { key: "instruction", label: "Instruction", href: "module-3-instruction.html" },
];
const module5Pages = [
  { key: "curriculum", label: "Curriculum", labelVi: "Ch\u01b0\u01a1ng tr\u00ecnh gi\u00e1o d\u1ee5c", href: "module-5-curriculum.html" },
  { key: "videos", label: "Videos for Teaching", labelVi: "Video gi\u1ea3ng d\u1ea1y", href: "module-5-videos.html" },
  { key: "policies", label: "Policies", labelVi: "Ch\u00ednh s\u00e1ch", href: "module-5-policies.html" },
];
const isModule5Page = /^module-5(?:-(curriculum|videos|policies))?$/.test(pageSlug);
const module5NameVi = "T\u00e0i nguy\u00ean";

function setBilingualLabel(element, english, vietnamese) {
  if (!vietnamese) {
    element.textContent = english;
    return;
  }
  const en = document.createElement("span");
  en.lang = "en";
  en.textContent = english;
  const vi = document.createElement("span");
  vi.lang = "vi";
  vi.className = "bilingual-secondary";
  vi.textContent = vietnamese;
  const copy = document.createElement("span");
  copy.className = "bilingual-label";
  copy.append(en, document.createTextNode(" "), vi);
  element.replaceChildren(copy);
}

function createBreadcrumb(items) {
  const pageHero = document.querySelector(".page-hero");
  if (!pageHero || !items.length) return;

  const nav = document.createElement("nav");
  nav.className = "breadcrumb-bar";
  nav.setAttribute("aria-label", "Breadcrumb");

  const inner = document.createElement("div");
  inner.className = "breadcrumb-inner";
  const list = document.createElement("ol");
  list.className = "breadcrumb-list";

  items.forEach((item, index) => {
    const listItem = document.createElement("li");
    if (item.href && index !== items.length - 1) {
      const link = document.createElement("a");
      link.href = item.href;
      setBilingualLabel(link, item.label, item.labelVi);
      listItem.append(link);
    } else {
      const current = document.createElement("span");
      setBilingualLabel(current, item.label, item.labelVi);
      if (index === items.length - 1) current.setAttribute("aria-current", "page");
      listItem.append(current);
    }
    list.append(listItem);
  });

  inner.append(list);
  nav.append(inner);
  pageHero.before(nav);
  document.body.classList.add("has-breadcrumb");
}

function createLocalNavigation(title, links, currentKey) {
  const pageHero = document.querySelector(".page-hero");
  if (!pageHero) return;

  const nav = document.createElement("nav");
  nav.className = "local-nav";
  nav.setAttribute("aria-label", `${title} pages`);

  const inner = document.createElement("div");
  inner.className = "local-nav-inner";
  const heading = document.createElement("span");
  heading.className = "local-nav-title";
  heading.textContent = title;

  const linkList = document.createElement("div");
  linkList.className = "local-nav-links";
  links.forEach((item) => {
    const link = document.createElement("a");
    link.href = item.href;
    setBilingualLabel(link, item.label, item.labelVi);
    if (item.key === currentKey) link.setAttribute("aria-current", "page");
    linkList.append(link);
  });

  inner.append(heading, linkList);
  nav.append(inner);
  pageHero.after(nav);
}

function configurePageStructure() {
  if (pageSlug === "index") {
    document.body.classList.add("page-home");
    return;
  }

  const breadcrumbs = [{ label: "Home", labelVi: isModule5Page ? "Trang ch\u1ee7" : undefined, href: homeHref }];
  const moduleMatch = pageSlug.match(/^module-([1-5])$/);
  const subjectMatch = pageSlug.match(/^lesson-plan-(maths|physics|chemistry|biology|engineering|it)(?:-(instruction|template|example))?$/);
  const subjectResourceMatch = pageSlug.match(
    /^subject-resources-(maths|physics|chemistry|biology|engineering|it)(?:-(books|template|example|practice|vocabulary))?$/,
  );
  const classroomMatch = pageSlug.match(/^classroom-management-(strategies|instruction)$/);

  if (moduleMatch) {
    const moduleId = moduleMatch[1];
    document.body.classList.add("page-module-overview", `page-module-${moduleId}`);
    breadcrumbs.push({ label: `Module ${moduleId}: ${moduleNames[moduleId]}`, labelVi: isModule5Page ? module5NameVi : undefined });
  } else if (module2Pages.some(item => item.href === `${pageSlug}.html`)) {
    const current = module2Pages.find(item => item.href === `${pageSlug}.html`);
    breadcrumbs.push(
      { label: `Module 2: ${moduleNames["2"]}`, href: "module-2.html" },
      { label: current.label },
    );
    createLocalNavigation("Module 2", module2Pages, current.key);
  } else if (pageSlug === "module-2-pedagogies") {
    breadcrumbs.push(
      { label: `Module 2: ${moduleNames["2"]}`, href: "module-2.html" },
      { label: "Pedagogies" },
    );
    createLocalNavigation("Module 2", module2Pages);
  } else if (module3Pages.some(item => item.href === `${pageSlug}.html`)) {
    const current = module3Pages.find(item => item.href === `${pageSlug}.html`);
    breadcrumbs.push(
      { label: `Module 3: ${moduleNames["3"]}`, href: "module-3.html" },
      { label: current.label },
    );
    createLocalNavigation("Module 3", module3Pages, current.key);
  } else if (module5Pages.some(item => item.href === `${pageSlug}.html`)) {
    const current = module5Pages.find(item => item.href === `${pageSlug}.html`);
    document.body.classList.add("page-module-5");
    breadcrumbs.push(
      { label: `Module 5: ${moduleNames["5"]}`, labelVi: module5NameVi, href: "module-5.html" },
      { label: current.label, labelVi: current.labelVi },
    );
    createLocalNavigation("Module 5", module5Pages, current.key);
  } else if (pageSlug === "module-3-lesson-plans" || pageSlug === "module-3-pedagogies") {
    breadcrumbs.push(
      { label: `Module 3: ${moduleNames["3"]}`, href: "module-3.html" },
      { label: pageSlug === "module-3-lesson-plans" ? "Create Lesson Plans" : "Pedagogies" },
    );
    createLocalNavigation("Module 3", module3Pages);
  } else if (pageSlug === "module-test") {
    const moduleId = new URLSearchParams(window.location.search).get("module") || "1";
    const safeModuleId = moduleNames[moduleId] ? moduleId : "1";
    document.body.classList.add("page-quiz");
    breadcrumbs.push(
      { label: `Module ${safeModuleId}: ${moduleNames[safeModuleId]}`, href: `module-${safeModuleId}.html` },
      { label: "Quick Test" },
    );
  } else if (subjectResourceMatch) {
    const subjectKey = subjectResourceMatch[1];
    const resourceKey = subjectResourceMatch[2];
    const subject = subjectNames[subjectKey];

    document.body.classList.add(
      resourceKey ? "page-subject-resource-detail" : "page-subject-resource-hub",
    );
    breadcrumbs.push(
      { label: "Module 4: Subject Resources", href: "module-4.html" },
      { label: subject, href: resourceKey ? `subject-resources-${subjectKey}.html` : undefined },
    );

    if (resourceKey) {
      breadcrumbs.push({ label: subjectResourceLabels[resourceKey] });
      createLocalNavigation(
        `${subject} resources`,
        [
          { key: "overview", label: "Overview", href: `subject-resources-${subjectKey}.html` },
          { key: "books", label: "Books", href: `subject-resources-${subjectKey}-books.html` },
          { key: "template", label: "Lesson Plan Template", href: `subject-resources-${subjectKey}-template.html` },
          { key: "example", label: "Example of Lesson Plan", href: `subject-resources-${subjectKey}-example.html` },
          { key: "practice", label: "Practice and Evaluate", href: `subject-resources-${subjectKey}-practice.html` },
          { key: "vocabulary", label: "Vocabulary", href: `subject-resources-${subjectKey}-vocabulary.html` },
        ],
        resourceKey,
      );
    }
  } else if (subjectMatch) {
    const subjectKey = subjectMatch[1];
    const sectionKey = subjectMatch[2] || "overview";
    const subject = subjectNames[subjectKey];
    const fromModule3 = new URLSearchParams(window.location.search).get("module") === "3";
    const contextQuery = fromModule3 ? "?module=3" : "";
    const lessonPlanLabel = fromModule3 ? "Create Lesson Plans" : "Format of Lesson Plan";
    const sectionLabels = {
      instruction: "Instruction",
      template: "Template",
      example: "Example Lesson Plan",
    };

    document.body.classList.add(sectionKey === "overview" ? "page-subject-hub" : "page-subject-document");
    breadcrumbs.push(
      fromModule3
        ? { label: "Module 3: Strategies in Classroom", href: "module-3.html" }
        : { label: "Module 2: Lesson Plan", href: "module-2.html" },
    );
    breadcrumbs.push({ label: lessonPlanLabel, href: fromModule3 ? "module-3-lesson-plans.html" : "module-2-lesson-plans.html" });
    breadcrumbs.push({ label: subject, href: `lesson-plan-${subjectKey}.html${contextQuery}` });
    if (sectionKey !== "overview") {
      breadcrumbs.push({ label: sectionLabels[sectionKey] });
      createLocalNavigation(
        `${subject} lesson planning`,
        [
          { key: "overview", label: "Overview", href: `lesson-plan-${subjectKey}.html${contextQuery}` },
          { key: "instruction", label: "Instruction", href: `lesson-plan-${subjectKey}-instruction.html${contextQuery}` },
          { key: "template", label: "Template", href: `lesson-plan-${subjectKey}-template.html${contextQuery}` },
          { key: "example", label: "Example lesson plan", href: `lesson-plan-${subjectKey}-example.html${contextQuery}` },
        ],
        sectionKey,
      );
    }
    if (fromModule3) {
      const kicker = document.querySelector(".page-hero .kicker");
      if (kicker) kicker.textContent = kicker.textContent.replace(/^Module 2\b/, "Module 3");
      document.querySelectorAll("a[href]").forEach(link => {
        const url = new URL(link.href);
        if (url.origin !== window.location.origin) return;
        if (/\/lesson-plan-(maths|physics|chemistry|biology|engineering|it)(?:-(instruction|template|example))?(?:\.html)?$/.test(url.pathname)) {
          url.searchParams.set("module", "3");
          link.href = `${url.pathname}${url.search}${url.hash}`;
        }
      });
    }
    document.querySelectorAll(".page-actions a, footer a").forEach(link => {
      if (/\/module-2(?:\.html)?$/.test(new URL(link.href).pathname)) {
        link.href = fromModule3 ? "module-3-lesson-plans.html" : "module-2-lesson-plans.html";
        link.textContent = `Back to ${lessonPlanLabel}`;
      }
    });
  } else if (classroomMatch) {
    const sectionKey = classroomMatch[1];
    const sectionLabel = sectionKey === "strategies" ? "Classroom Management Strategies" : "Instruction to Manage the Classroom";
    document.body.classList.add("page-classroom-document");
    breadcrumbs.push(
      { label: "Module 3: Strategies in Classroom", href: "module-3.html" },
      { label: "Pedagogies", href: "module-3-pedagogies.html" },
      { label: sectionLabel },
    );
    createLocalNavigation(
      "Classroom management",
      [
        { key: "overview", label: "Pedagogies", href: "module-3-pedagogies.html" },
        { key: "strategies", label: "Strategies", href: "classroom-management-strategies.html" },
        { key: "instruction", label: "Instruction", href: "classroom-management-instruction.html" },
      ],
      sectionKey,
    );
  } else if (pageSlug === "resources") {
    document.body.classList.add("page-resources");
    breadcrumbs.push({ label: "Resources" });
  }

  createBreadcrumb(breadcrumbs);
}

configurePageStructure();

if (isModule5Page) {
  const labels = {
    "Home": "Trang ch\u1ee7",
    "Modules": "C\u00e1c m\u00f4-\u0111un",
    "Previous module": "M\u00f4-\u0111un tr\u01b0\u1edbc",
    "Open modules": "M\u1edf c\u00e1c m\u00f4-\u0111un",
    "Resource page": "Trang t\u00e0i nguy\u00ean",
    "Back to Module 5": "Quay l\u1ea1i Module 5",
    "Back to home": "V\u1ec1 trang ch\u1ee7",
  };
  document.querySelectorAll(".nav-links a, .nav-links button, .page-actions .button, footer a").forEach(control => {
    const english = control.textContent.trim();
    if (labels[english]) setBilingualLabel(control, english, labels[english]);
  });
}

if (isModuleDirectory && pageSlug !== "module-test") {
  document.body.classList.add("has-module-controls");
  import("./module-controls.js?v=68").catch(error => console.error("Module controls could not load", error));
}

const moduleDialog = document.querySelector("[data-module-dialog]");
const openButtons = document.querySelectorAll("[data-open-modules]");

if (moduleDialog) {
  const navigationIcons = {
    arrow: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-right" aria-hidden="true" focusable="false"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>',
    chevron: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6"></path></svg>',
    close: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x" aria-hidden="true" focusable="false"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>',
  };
  const currentModule = document.querySelector(".breadcrumb-list")?.textContent.match(/Module ([1-5]):/)?.[1];
  let lastOpener;
  let closeTimer;

  moduleDialog.id = "module-menu";
  moduleDialog.classList.add("module-menu");
  setBilingualLabel(moduleDialog.querySelector("h2"), "Modules", isModule5Page ? "C\u00e1c m\u00f4-\u0111un" : undefined);
  moduleDialog.querySelector(".dialog-header p")?.remove();
  moduleDialog.querySelectorAll("[data-close-dialog]").forEach(button => {
    button.innerHTML = navigationIcons.close;
    button.title = isModule5Page ? "Close modules / \u0110\u00f3ng c\u00e1c m\u00f4-\u0111un" : "Close modules";
    button.setAttribute("aria-label", button.title);
    button.addEventListener("click", closeModuleMenu);
  });
  const moduleNamesVi = {"1": "Gi\u1edbi thi\u1ec7u", "2": "K\u1ebf ho\u1ea1ch b\u00e0i d\u1ea1y", "3": "Chi\u1ebfn l\u01b0\u1ee3c qu\u1ea3n l\u00fd l\u1edbp h\u1ecdc", "4": "T\u00e0i nguy\u00ean theo m\u00f4n h\u1ecdc", "5": module5NameVi};
  moduleDialog.querySelectorAll(".course-map a").forEach((link, index) => {
    const id = new URL(link.href).pathname.match(/module-([1-5])(?:\.html)?$/)?.[1];
    if (!id) return;
    link.style.setProperty("--module-index", index);
    link.dataset.module = id;
    const number = document.createElement("span");
    number.className = "module-menu-number";
    number.textContent = id.padStart(2, "0");
    number.setAttribute("aria-hidden", "true");
    const copy = document.createElement("span");
    copy.className = "module-menu-copy";
    const label = document.createElement("span");
    label.className = "module-menu-label";
    label.textContent = `Module ${id}`;
    const title = document.createElement("b");
    setBilingualLabel(title, moduleNames[id], isModule5Page ? moduleNamesVi[id] : undefined);
    const arrow = document.createElement("span");
    arrow.className = "module-menu-arrow";
    arrow.innerHTML = navigationIcons.arrow;
    arrow.setAttribute("aria-hidden", "true");
    copy.append(label, title);
    link.replaceChildren(number, copy, arrow);
    if (id === currentModule) link.setAttribute("aria-current", pageSlug === `module-${id}` ? "page" : "location");
  });

  function setExpanded(expanded) {
    openButtons.forEach(button => button.setAttribute("aria-expanded", String(expanded)));
  }

  function finishClosing() {
    clearTimeout(closeTimer);
    if (typeof moduleDialog.close === "function") moduleDialog.close();
    else moduleDialog.removeAttribute("open");
    moduleDialog.classList.remove("is-closing");
    document.body.classList.remove("has-module-menu");
    setExpanded(false);
  }

  function closeModuleMenu() {
    if (!moduleDialog.open || moduleDialog.classList.contains("is-closing")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finishClosing();
      return;
    }
    moduleDialog.classList.add("is-closing");
    closeTimer = setTimeout(finishClosing, 160);
  }

  openButtons.forEach(button => {
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-controls", moduleDialog.id);
    button.setAttribute("aria-expanded", "false");
    if (button.classList.contains("nav-button")) button.insertAdjacentHTML("beforeend", navigationIcons.chevron);
    button.addEventListener("click", () => {
      if (moduleDialog.open) return;
      lastOpener = button;
      if (typeof moduleDialog.showModal === "function") moduleDialog.showModal();
      else moduleDialog.setAttribute("open", "");
      document.body.classList.add("has-module-menu");
      setExpanded(true);
    });
  });

  moduleDialog.addEventListener("cancel", event => {
    event.preventDefault();
    closeModuleMenu();
  });
  moduleDialog.addEventListener("close", () => {
    clearTimeout(closeTimer);
    moduleDialog.classList.remove("is-closing");
    document.body.classList.remove("has-module-menu");
    setExpanded(false);
    if (lastOpener?.isConnected) lastOpener.focus({preventScroll:true});
  });
  moduleDialog.addEventListener("click", (event) => {
    if (event.target !== moduleDialog) return;
    const bounds = moduleDialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeModuleMenu();
  });
  // A cached page must not return with the menu open or background scrolling locked.
  window.addEventListener("pagehide", finishClosing);
}

const quickTests = {
  "1": {
    title: "Module 1 Quick Test / Bài kiểm tra nhanh Module 1",
    moduleTitle: "Introduction / Giới thiệu",
    questions: [
      {
        prompt: "What is the main purpose of the EMI Training website? / Mục đích chính của website EMI Training là gì?",
        options: [
          "To support STEM teachers in teaching their subjects through English / Hỗ trợ giáo viên STEM dạy môn học bằng tiếng Anh",
          "To practise English pronunciation only / Chỉ luyện phát âm tiếng Anh",
          "To replace STEM content with grammar lessons / Thay thế nội dung STEM bằng bài học ngữ pháp",
        ],
        answer: 0,
        explanation: "The website helps STEM teachers develop knowledge and practical skills for teaching through English. / Website hỗ trợ giáo viên STEM phát triển kiến thức và kỹ năng thực tiễn để giảng dạy bằng tiếng Anh.",
      },
      {
        prompt: "What does EMI emphasize in this website? / EMI trong website này nhấn mạnh điều gì?",
        options: [
          "Using English as the medium for teaching subject content / Sử dụng tiếng Anh làm ngôn ngữ giảng dạy nội dung môn học",
          "Teaching English separately from STEM subjects / Dạy tiếng Anh tách rời khỏi các môn STEM",
          "Translating every lesson into Vietnamese only / Chỉ dịch toàn bộ bài học sang tiếng Việt",
        ],
        answer: 0,
        explanation: "EMI means English-Medium Instruction, so English is used to teach subject content. / EMI là English-Medium Instruction, nghĩa là dùng tiếng Anh để giảng dạy nội dung môn học.",
      },
      {
        prompt: "Which teachers does the website especially support? / Website đặc biệt hỗ trợ nhóm giáo viên nào?",
        options: [
          "Teachers with strong subject knowledge who need support using English for instruction / Giáo viên vững chuyên môn nhưng cần hỗ trợ dùng tiếng Anh để giảng dạy",
          "English teachers who do not teach STEM / Chỉ giáo viên tiếng Anh không dạy STEM",
          "Students studying alone at home / Chỉ học sinh tự học ở nhà",
        ],
        answer: 0,
        explanation: "The training is designed for STEM teachers who need more support using English in class. / Nội dung hướng đến giáo viên STEM cần thêm hỗ trợ để dùng tiếng Anh trong lớp học.",
      },
      {
        prompt: "Which teacher capacity is a key goal of the website? / Năng lực nào của giáo viên là mục tiêu quan trọng của website?",
        options: [
          "Confidence and pedagogical competence in teaching STEM through English / Sự tự tin và năng lực sư phạm khi dạy STEM bằng tiếng Anh",
          "The ability to skip classroom activities / Khả năng bỏ qua hoạt động lớp học",
          "The ability to use only one-way lecturing / Khả năng chỉ dùng bài giảng một chiều",
        ],
        answer: 0,
        explanation: "The website aims to increase teacher confidence, teaching competence, and learning quality. / Website hướng tới nâng cao sự tự tin, năng lực sư phạm và chất lượng trải nghiệm học tập.",
      },
      {
        prompt: "Which materials are included in the website? / Các tài liệu trong website bao gồm những nội dung nào?",
        options: [
          "Instructional videos, lesson-planning support, classroom strategies, and teaching resources / Video hướng dẫn, hỗ trợ lập kế hoạch bài dạy, chiến lược lớp học và tài nguyên giảng dạy",
          "Only vocabulary lists without activities / Chỉ danh sách từ vựng không có hoạt động",
          "Only a final test / Chỉ bài kiểm tra cuối khóa",
        ],
        answer: 0,
        explanation: "The website combines videos, practical guidance, lesson planning, classroom management, and resources. / Website kết hợp video, hướng dẫn thực hành, lập kế hoạch bài dạy, quản lý lớp học và tài nguyên.",
      },
    ],
  },
  "2": {
    title: "Module 2 Quick Test / Bài kiểm tra nhanh Module 2",
    moduleTitle: "Lesson Plan / Kế hoạch bài dạy",
    questions: [
      {
        prompt: "What is the first step in creating a lesson plan? / Bước đầu tiên khi xây dựng lesson plan là gì?",
        options: [
          "Identify the subject, grade, topic, lesson title, duration, and class profile / Xác định môn học, khối lớp, chủ đề, tên bài, thời lượng và đặc điểm lớp",
          "Grade students before teaching / Chấm điểm học sinh trước khi dạy",
          "Skip the lesson objectives / Bỏ qua mục tiêu bài học",
        ],
        answer: 0,
        explanation: "A lesson plan should begin with basic information and the class context. / Kế hoạch bài học nên bắt đầu bằng thông tin cơ bản và bối cảnh lớp học.",
      },
      {
        prompt: "Which objectives should teachers set in an EMI lesson plan? / Trong EMI lesson plan, giáo viên nên đặt loại mục tiêu nào?",
        options: [
          "Content objectives and language objectives / Mục tiêu nội dung và mục tiêu ngôn ngữ",
          "Only slide decoration objectives / Chỉ mục tiêu trang trí slide",
          "Only final-exam objectives / Chỉ mục tiêu kiểm tra cuối kỳ",
        ],
        answer: 0,
        explanation: "Students need to know both the STEM content and the English language they should use. / Học sinh cần biết cả nội dung STEM cần học và ngôn ngữ tiếng Anh cần sử dụng.",
      },
      {
        prompt: "What is the usual role of a warm-up activity? / Hoạt động warm-up thường có vai trò gì?",
        options: [
          "To activate students' prior knowledge / Kích hoạt kiến thức nền của học sinh",
          "To replace the whole main lesson / Thay thế toàn bộ phần học chính",
          "To end the lesson / Dùng để kết thúc bài học",
        ],
        answer: 0,
        explanation: "A warm-up helps students connect what they already know with the new content. / Warm-up giúp học sinh kết nối kiến thức đã có với nội dung mới.",
      },
      {
        prompt: "How can teachers check students' understanding during the lesson? / Giáo viên có thể kiểm tra mức độ hiểu bài bằng cách nào?",
        options: [
          "Questions, discussion, short tasks, or observation / Câu hỏi, thảo luận, nhiệm vụ ngắn hoặc quan sát",
          "Only by looking at the clock / Chỉ bằng cách nhìn đồng hồ",
          "There is no need to check during the lesson / Không cần kiểm tra trong giờ học",
        ],
        answer: 0,
        explanation: "Regular checks help teachers adjust support while the lesson is happening. / Kiểm tra thường xuyên giúp giáo viên điều chỉnh hỗ trợ kịp thời.",
      },
      {
        prompt: "What should the end of a lesson include? / Phần cuối bài học nên có nội dung gì?",
        options: [
          "Assessment, a short conclusion or exit ticket, and teacher reflection / Đánh giá, tổng kết ngắn hoặc exit ticket, và phản tư của giáo viên",
          "Only extra homework without a conclusion / Chỉ giao thêm bài mà không tổng kết",
          "Only moving to another topic / Chỉ chuyển sang chủ đề khác",
        ],
        answer: 0,
        explanation: "The ending consolidates learning and helps teachers reflect after teaching. / Phần kết giúp củng cố bài học và giúp giáo viên phản tư sau giờ dạy.",
      },
    ],
  },
  "3": {
    title: "Module 3 Quick Test / Bài kiểm tra nhanh Module 3",
    moduleTitle: "Strategies in Classroom / Chiến lược trong lớp học",
    questions: [
      {
        prompt: "What should teachers prepare before the lesson? / Trước giờ học, giáo viên nên chuẩn bị những gì?",
        options: [
          "Instructions, materials, seating, equipment, and possible language difficulties / Câu lệnh, tài liệu, chỗ ngồi, thiết bị và khó khăn ngôn ngữ có thể xảy ra",
          "Only a test paper / Chỉ chuẩn bị bài kiểm tra",
          "Nothing, because teachers can improvise everything / Không cần chuẩn bị vì có thể ứng biến hoàn toàn",
        ],
        answer: 0,
        explanation: "Preparation makes EMI lessons clearer and reduces confusion during activities. / Chuẩn bị trước giúp lớp học EMI rõ ràng hơn và giảm rối khi triển khai hoạt động.",
      },
      {
        prompt: "What is the best way to give instructions in an EMI classroom? / Khi đưa chỉ dẫn trong lớp EMI, cách nào phù hợp nhất?",
        options: [
          "Gain attention, use short sentences, explain step by step, and check understanding / Thu hút sự chú ý, dùng câu ngắn, hướng dẫn từng bước và kiểm tra học sinh đã hiểu",
          "Speak for a long time and ask students to guess / Nói thật dài rồi yêu cầu học sinh tự đoán",
          "Only write the task on the board and move on / Chỉ viết yêu cầu lên bảng rồi đi tiếp",
        ],
        answer: 0,
        explanation: "Short step-by-step instructions with checks help students follow the lesson in English. / Chỉ dẫn ngắn, từng bước và có kiểm tra hiểu giúp học sinh theo kịp bằng tiếng Anh.",
      },
      {
        prompt: "Which example is a consistent attention signal? / Ví dụ nào là tín hiệu thu hút sự chú ý nhất quán?",
        options: [
          "A countdown, raised hand, chime, or fixed phrase / Đếm ngược, giơ tay, chuông hoặc một câu lệnh cố định",
          "Changing the signal every lesson / Thay tín hiệu liên tục mỗi lần dạy",
          "Continuing to speak while students are still talking / Nói tiếp khi học sinh vẫn đang nói",
        ],
        answer: 0,
        explanation: "Consistent signals help students quickly know when to refocus. / Tín hiệu nhất quán giúp học sinh nhận biết nhanh khi cần tập trung lại.",
      },
      {
        prompt: "What does effective group work need? / Làm việc nhóm hiệu quả cần có yếu tố nào?",
        options: [
          "Clear roles, tasks, products, and time limits / Vai trò, nhiệm vụ, sản phẩm và thời gian rõ ràng",
          "Let students decide everything without structure / Chỉ cần để học sinh tự chọn mọi thứ",
          "No final product is needed / Không cần sản phẩm cuối cùng",
        ],
        answer: 0,
        explanation: "Clear structure gives group work a purpose and makes it easier to manage. / Cấu trúc rõ ràng giúp nhóm làm việc có mục tiêu và dễ quản lý hơn.",
      },
      {
        prompt: "How should teachers respond to inappropriate behaviour? / Khi có hành vi không phù hợp, giáo viên nên phản ứng thế nào?",
        options: [
          "Stay calm, focus on the behaviour, and use short reminders or clear choices / Bình tĩnh, tập trung vào hành vi và dùng nhắc nhở ngắn hoặc lựa chọn rõ ràng",
          "Criticise the student personally in front of the class / Chỉ trích cá nhân học sinh trước lớp",
          "Ignore every behaviour in every situation / Bỏ qua mọi hành vi trong mọi tình huống",
        ],
        answer: 0,
        explanation: "A calm response focused on behaviour helps protect a positive learning environment. / Phản ứng bình tĩnh và tập trung vào hành vi giúp giữ môi trường học tích cực.",
      },
    ],
  },
  "4": {
    title: "Module 4 Quick Test / Bài kiểm tra nhanh Module 4",
    moduleTitle: "Subject Resources / Tài nguyên môn học",
    questions: [
      {
        prompt: "What is the main focus of Module 4? / Module 4 tập trung vào nội dung chính nào?",
        options: [
          "Comparing similarities and differences across STEM subjects / So sánh điểm giống và khác nhau giữa các môn STEM",
          "Memorising vocabulary for only one subject / Chỉ học thuộc từ vựng của một môn",
          "Doing grammar tests only / Chỉ làm bài kiểm tra ngữ pháp",
        ],
        answer: 0,
        explanation: "Module 4 helps teachers identify shared and subject-specific features in STEM. / Module 4 giúp giáo viên nhận diện điểm chung và điểm riêng giữa các môn STEM.",
      },
      {
        prompt: "Why should teachers adapt lesson plans for each subject? / Vì sao giáo viên cần điều chỉnh lesson plan theo từng môn?",
        options: [
          "Each subject has different content, activities, language, and classroom management needs / Mỗi môn có nội dung, hoạt động, ngôn ngữ và cách quản lý lớp khác nhau",
          "So every subject has exactly the same activity / Để mọi môn có cùng một hoạt động giống hệt nhau",
          "To remove lesson objectives / Để bỏ phần mục tiêu bài học",
        ],
        answer: 0,
        explanation: "Effective EMI teaching should match the subject's content, activity type, and language demands. / EMI hiệu quả cần phù hợp với đặc thù nội dung, hoạt động và yêu cầu ngôn ngữ của từng môn.",
      },
      {
        prompt: "What common element can STEM subjects share? / Điểm chung nào có thể có giữa các môn STEM?",
        options: [
          "Problem solving, using evidence, and explaining ideas / Giải quyết vấn đề, sử dụng bằng chứng và diễn đạt ý tưởng",
          "Copying only from the textbook / Chỉ chép bài từ sách",
          "No discussion or practice / Không cần thảo luận hay thực hành",
        ],
        answer: 0,
        explanation: "STEM subjects often require thinking, evidence, explanation, and academic communication. / Các môn STEM thường cần tư duy, bằng chứng, giải thích và giao tiếp học thuật.",
      },
      {
        prompt: "How do subject-specific files in Module 4 help teachers? / Subject-specific file trong Module 4 giúp giáo viên làm gì?",
        options: [
          "Adapt lesson planning and classroom management for each subject / Điều chỉnh kế hoạch bài dạy và quản lý lớp học theo từng môn",
          "Remove all practical activities / Xóa toàn bộ phần thực hành",
          "Teach all subjects with one unchanged template / Dạy tất cả môn bằng một mẫu duy nhất không thay đổi",
        ],
        answer: 0,
        explanation: "Subject files help teachers choose teaching organization that fits each subject. / Tài liệu theo môn giúp giáo viên chọn cách tổ chức phù hợp với môn học cụ thể.",
      },
      {
        prompt: "When teaching EMI, what can teachers choose better by understanding subject differences? / Khi dạy EMI, hiểu sự khác nhau giữa các môn giúp giáo viên chọn tốt hơn điều gì?",
        options: [
          "Vocabulary, learning tasks, interaction, and language support / Từ vựng, nhiệm vụ học tập, tương tác và hỗ trợ ngôn ngữ",
          "The colour of the classroom board / Màu bảng trong lớp",
          "The number of lesson-plan pages without content / Số lượng trang của giáo án mà không cần nội dung",
        ],
        answer: 0,
        explanation: "Subject differences affect language, tasks, interaction, and student support. / Sự khác biệt giữa môn học ảnh hưởng đến ngôn ngữ, nhiệm vụ, tương tác và cách hỗ trợ học sinh.",
      },
    ],
  },
  "5": {
    title: "Module 5 Quick Test / Bài kiểm tra nhanh Module 5",
    moduleTitle: "Resources / Tài nguyên",
    questions: [
      {
        prompt: "Which main resource categories are included in Module 5? / Module 5 tập hợp những loại tài nguyên chính nào?",
        options: [
          "Curriculum, subject content, vocabulary, and other resources / Chương trình, nội dung môn học, từ vựng và các tài nguyên khác",
          "Entertainment videos only / Chỉ video giải trí",
          "Tests only, with no support materials / Chỉ bài kiểm tra không có tài liệu hỗ trợ",
        ],
        answer: 0,
        explanation: "Module 5 gathers resource groups that support EMI teaching. / Module 5 tập hợp các nhóm tài nguyên cần cho việc dạy EMI.",
      },
      {
        prompt: "How do curriculum resources help teachers? / Tài nguyên curriculum giúp giáo viên làm gì?",
        options: [
          "Align lessons with the curriculum and required content / Liên kết bài học với chương trình và nội dung cần dạy",
          "Ignore learning outcomes / Bỏ qua chuẩn đầu ra",
          "Choose random activities only / Chỉ chọn hoạt động ngẫu nhiên",
        ],
        answer: 0,
        explanation: "Curriculum resources help teachers keep lessons aligned with the program. / Curriculum giúp giáo viên đảm bảo bài học phù hợp với chương trình.",
      },
      {
        prompt: "Why are vocabulary resources useful? / Tài nguyên vocabulary hữu ích vì lý do nào?",
        options: [
          "They support language for concepts, instructions, questions, and classroom talk / Hỗ trợ ngôn ngữ cho khái niệm, chỉ dẫn, câu hỏi và giao tiếp lớp học",
          "They only decorate the lesson plan / Chỉ để trang trí giáo án",
          "They replace all STEM activities / Để thay thế hoàn toàn hoạt động STEM",
        ],
        answer: 0,
        explanation: "Vocabulary and sentence support help students participate in STEM lessons in English. / Từ vựng và mẫu câu giúp học sinh tham gia bài học STEM bằng tiếng Anh.",
      },
      {
        prompt: "What should subject content resources be used for? / Subject content resources nên được dùng để làm gì?",
        options: [
          "Preparing accurate subject content, examples, and materials / Chuẩn bị nội dung, ví dụ và tài liệu môn học chính xác",
          "Copying everything without checking / Sao chép nguyên văn mà không kiểm tra",
          "Using them only after the course ends / Chỉ dùng sau khi kết thúc khóa học",
        ],
        answer: 0,
        explanation: "Subject content resources help teachers prepare accurate and suitable lessons. / Tài nguyên nội dung môn học hỗ trợ giáo viên chuẩn bị bài chính xác và phù hợp.",
      },
      {
        prompt: "How can other resources support teachers? / Other resources có thể giúp giáo viên như thế nào?",
        options: [
          "They add materials, activities, or tools for teaching / Bổ sung tài liệu, hoạt động hoặc công cụ hỗ trợ bài dạy",
          "They remove the need to plan lessons / Loại bỏ nhu cầu lập kế hoạch",
          "They are only for personal storage / Chỉ dùng cho việc lưu trữ cá nhân",
        ],
        answer: 0,
        explanation: "Additional resources can enrich activities and learning experiences. / Nguồn bổ sung giúp mở rộng và làm phong phú trải nghiệm học tập.",
      },
    ],
  },
};

const quizRoot = document.querySelector("[data-quiz]");

if (quizRoot) {
  const params = new URLSearchParams(window.location.search);
  const moduleId = quickTests[params.get("module")] ? params.get("module") : "1";
  const test = quickTests[moduleId];
  const title = document.querySelector("[data-quiz-title]");
  const kicker = document.querySelector("[data-quiz-kicker]");
  const intro = document.querySelector("[data-quiz-intro]");
  const back = document.querySelector("[data-quiz-back]");
  const form = quizRoot.querySelector("[data-quiz-form]");
  const result = quizRoot.querySelector("[data-quiz-result]");

  if (title) title.textContent = test.title;
  if (kicker) kicker.textContent = `Module ${moduleId}`;
  if (intro) intro.textContent = `${test.moduleTitle}: answer the 5 questions and choose the best option. / Trả lời 5 câu hỏi và chọn đáp án đúng nhất.`;
  if (back) {
    back.href = `module-${moduleId}.html`;
    back.textContent = `Back to Module ${moduleId} / Quay lại Module ${moduleId}`;
  }

  const getDisplayOptions = (options, questionIndex) => {
    const indexedOptions = options.map((option, optionIndex) => ({ option, optionIndex }));
    const patterns = [
      [0, 1, 2],
      [1, 2, 0],
      [2, 0, 1],
      [1, 0, 2],
      [2, 1, 0],
    ];
    return patterns[(Number(moduleId) + questionIndex) % patterns.length].map((index) => indexedOptions[index]);
  };

  form.innerHTML = `
    ${test.questions.map((question, questionIndex) => `
      <fieldset class="quiz-question" data-quiz-question="${questionIndex}">
        <legend>${questionIndex + 1}. ${question.prompt}</legend>
        <div class="quiz-options">
          ${getDisplayOptions(question.options, questionIndex).map(({ option, optionIndex }) => `
            <label class="quiz-option">
              <input type="radio" name="q${questionIndex}" value="${optionIndex}">
              <span>${option}</span>
            </label>
          `).join("")}
        </div>
        <div class="quiz-feedback" data-quiz-feedback hidden></div>
      </fieldset>
    `).join("")}
    <div class="quiz-actions">
      <button class="button primary" type="submit">Submit test / Nộp bài</button>
      <button class="button secondary" type="button" data-quiz-reset>Try again / Làm lại</button>
    </div>
  `;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    let score = 0;

    test.questions.forEach((question, questionIndex) => {
      const questionNode = form.querySelector(`[data-quiz-question="${questionIndex}"]`);
      const checked = form.querySelector(`input[name="q${questionIndex}"]:checked`);
      const feedback = questionNode.querySelector("[data-quiz-feedback]");
      const correct = checked && Number(checked.value) === question.answer;

      questionNode.classList.toggle("is-correct", Boolean(correct));
      questionNode.classList.toggle("is-incorrect", !correct);
      feedback.hidden = false;

      if (correct) {
        score += 1;
        feedback.textContent = `Correct / Đúng. ${question.explanation}`;
      } else {
        feedback.textContent = `Not correct / Chưa đúng. Correct answer / Đáp án đúng: ${question.options[question.answer]}. ${question.explanation}`;
      }
    });

    const message = score === test.questions.length
      ? "Excellent. You understand this module well. / Rất tốt. Bạn đã nắm chắc nội dung module này."
      : "You can review the module and try again. / Bạn có thể xem lại module rồi thử lại để củng cố thêm.";

    result.hidden = false;
    result.innerHTML = `<strong>Result / Kết quả: ${score}/${test.questions.length}</strong><p>${message}</p>`;
    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  form.querySelector("[data-quiz-reset]").addEventListener("click", () => {
    form.reset();
    form.querySelectorAll(".quiz-question").forEach((questionNode) => {
      questionNode.classList.remove("is-correct", "is-incorrect");
      const feedback = questionNode.querySelector("[data-quiz-feedback]");
      feedback.hidden = true;
      feedback.textContent = "";
    });
    result.hidden = true;
    result.textContent = "";
  });
}
