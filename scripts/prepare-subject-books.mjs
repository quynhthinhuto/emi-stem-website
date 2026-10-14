import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = process.argv[2];
if (!sourceRoot || !path.isAbsolute(sourceRoot)) throw new Error("Provide the absolute Module 4 folder path.");
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const subjects = {
  maths: ["Maths", [
    ["cambridge a level mathematics second edition_public.pdf", "Cambridge A Level Mathematics (Second Edition)", 50],
    ["cambridge igcse mathematics core and extended 3ed.pdf", "Cambridge IGCSE Mathematics Core and Extended (Third Edition)", 511],
    ["cambridge-igcse-mathematics.pdf", "Cambridge IGCSE Mathematics Core and Extended (Fourth Edition)", 560],
    ["cambridge igcse mathematics coursebook.pdf", "Cambridge IGCSE Mathematics Coursebook (Sample)", 30],
    ["igcsemathsproblem-solvingbook_sample.pdf", "Cambridge IGCSE Mathematics Extended Problem-solving Book (Sample)", 35],
    ["instant revision.pdf", "Instant Revision: GCSE Maths", 129],
    ["xtmaths.pdf", "Extended Mathematics for IGCSE - David Rayner", 340],
  ]],
  physics: ["Physics", [
    ["Cambridge-IGCSE-Physics-3rd-edition-Hodder-Education-2014.pdf", "Cambridge IGCSE Physics (Third Edition, Hodder Education)", 328],
    ["cambridge-igcse-physics-coursebook-by-david-sang-2nbsped_compress.pdf", "Cambridge IGCSE Physics Coursebook (Second Edition) - David Sang", 289],
    ["cambridge international as and a level physics coursebook - public.pdf", "Cambridge International AS and A Level Physics Coursebook", 117],
    ["dokumen.pub_cambridge-international-as-amp-a-level-physics-coursebook-with-digital-access-2-years-3nbsped-1108859038-9781108859035-9781108796521-9781108796552.pdf", "Cambridge International AS and A Level Physics Coursebook (Third Edition)", 907],
    ["physics.pdf", "Physics for Cambridge IGCSE (Multi-component Sample)", 139],
    ["cam-igcse-physics-answers.pdf", "Cambridge IGCSE Physics: Answers to the Student Book (Fourth Edition)", 77],
    ["grade-10-physics-studentx27s-book_compress.pdf", "Grade 10 Physics Student's Book", 142],
    ["Year-10-Physics-booklet.pdf", "Year 10 Physics Workbook: Forces and Motion", 74],
    ["Gr10_PhysicalSciences_Learner_Eng.pdf", "Everything Science: Grade 10 Physical Sciences", 512],
    ["physicalscience_gr10.pdf", "Free High School Science Texts: Grade 10 Physical Science", 354],
    ["Physical-Science_Gr10_SG.pdf", "Via Afrika Physical Science: Grade 10 Study Guide", 158],
    ["Year_10_Science_Portfolio_Satisfactory.pdf", "Year 10 Science: Satisfactory Work Sample Portfolio", 49],
  ]],
  chemistry: ["Chemistry", [
    ["cambridge igcse chemistry by bryan earl and doug wilford.pdf", "Cambridge IGCSE Chemistry (Third Edition) - Bryan Earl and Doug Wilford", 312],
    ["cambridge igcse chemistry coursebook _fourth edition_ - public - 20 .pdf", "Cambridge IGCSE Chemistry Coursebook (Fourth Edition)", 69],
    ["complete chemistry for cambridge igcse.pdf", "Complete Chemistry for Cambridge IGCSE (Second Edition)", 322],
    ["dokumen.pub_essential-chemistry-for-cambridge-igcse-2nbsped-0198355203-9780198355205.pdf", "Essential Chemistry for Cambridge IGCSE (Second Edition)", 286],
    ["Cambridge International AS and A Level Chemistry-Norris_Ryan_Acaster.pdf", "Cambridge International AS and A Level Chemistry Coursebook", 606],
    ["cambridge igcse chemistry workbook.pdf", "Cambridge IGCSE Chemistry Workbook", 33],
    ["igcse chemistry work book by richard harwood.pdf", "IGCSE Chemistry Workbook - Richard Harwood", 97],
    ["cambridge igcse chemistry practical workbook.pdf", "Cambridge IGCSE Chemistry Practical Workbook", 40],
    ["igcse chemistry maths skills workbook - sample.pdf", "Cambridge IGCSE Chemistry Maths Skills Workbook (Sample)", 37],
    ["Cambridge-IGCSE-chemistry-study-and-revision-guide-PDFDrive.com-1-3.pdf", "Cambridge IGCSE Chemistry Study and Revision Guide", 342],
    ["9781108951609-1632562.pdf", "Chemistry for Cambridge IGCSE (Multi-component Sample)", 121],
  ]],
  biology: ["Biology", [
    ["cambridge igcse biology coursebook.pdf", "Cambridge IGCSE Biology Coursebook (Third Edition)", 67],
    ["cambridge-igcse-biology-coursebook.pdf", "Cambridge IGCSE Biology Coursebook", 351],
    ["cambridge igcse biology practical workbook.pdf", "Cambridge IGCSE Biology Practical Workbook", 37],
    ["cam-igcse-biology-wb-answers.pdf", "Cambridge IGCSE Biology: Answers to the Workbook (Third Edition)", 47],
  ]],
  engineering: ["Engineering", [
    ["2024-2026-syllabus.pdf", "Cambridge IGCSE Design & Technology (0445): 2024-2026 Syllabus", 45],
    ["2027-syllabus.pdf", "Cambridge IGCSE Design & Technology (0445): 2027 Syllabus", 46],
    ["2028-2030-syllabus.pdf", "Cambridge IGCSE Design & Technology (0445): 2028-2030 Syllabus", 51],
  ]],
  it: ["IT", [
    ["Cambridge-IGCSE-ICT_Third-Edition.pdf", "Cambridge IGCSE Information and Communication Technology (Third Edition)", 571],
    ["information and communication technology _second edition_ by graham brown and david watson.pdf", "IGCSE Information and Communication Technology (Second Edition) - Graham Brown and David Watson", 439],
    ["information and communication technology by graham brown and david watson.pdf", "IGCSE Information and Communication Technology - Graham Brown and David Watson", 312],
    ["igcse-information-and-communication-technology.pdf", "IGCSE Information and Communication Technology", 313],
    ["cambridge igcse ict coursebook with cd-rom revised edition.pdf", "Cambridge IGCSE ICT Coursebook with CD-ROM (Revised Edition, Excerpt)", 10],
  ]],
};

const books = [];
for (const [subject, [folder, entries]] of Object.entries(subjects)) {
  const expected = new Set(entries.map(([filename]) => filename));
  const actual = (await readdir(path.join(sourceRoot, folder))).filter(filename => /\.pdf$/i.test(filename));
  if (actual.length !== expected.size || actual.some(filename => !expected.has(filename))) {
    throw new Error(`The ${folder} folder differs from the reviewed book list.`);
  }
  for (const [sourceFilename, title, pages] of entries) {
    const filename = path.join(sourceRoot, folder, sourceFilename);
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(filename)) hash.update(chunk);
    const sha256 = hash.digest("hex");
    const id = sha256.slice(0, 16);
    const downloadName = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120)}.pdf`;
    books.push({ subject, folder, id, title, pages, sourceFilename, downloadName, bytes: (await stat(filename)).size, sha256, key: `module-4/books/${subject}/${id}.pdf` });
  }
}
await writeFile(path.join(projectRoot, "lib/subject-books.json"), `${JSON.stringify(books, null, 2)}\n`);
console.log(`Prepared ${books.length} books (${books.reduce((total, book) => total + book.bytes, 0)} bytes).`);
