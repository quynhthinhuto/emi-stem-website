import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const sourceRoot = process.argv[2];
if (!sourceRoot || !path.isAbsolute(sourceRoot)) throw new Error("Provide the absolute Module 4 folder path.");
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const books = JSON.parse(fs.readFileSync(path.join(projectRoot, "lib", "subject-books.json"), "utf8"));
const renderer = process.env.PDFTOPPM || "pdftoppm";

for (const book of books) {
  const directory = path.join(projectRoot, "public", "assets", "book-covers", book.subject);
  fs.mkdirSync(directory, { recursive: true });
  const output = path.join(directory, book.id);
  const page = 1;
  const result = spawnSync(renderer, [
    "-q", "-f", String(page), "-l", String(page), "-singlefile", "-scale-to", "480",
    "-jpeg", "-jpegopt", "quality=82,optimize=y",
    path.join(sourceRoot, book.folder, book.sourceFilename), output,
  ], { encoding: "utf8", timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    throw new Error(`Could not render ${book.sourceFilename}: ${result.error?.message || result.stderr}`);
  }
  if (!fs.statSync(`${output}.jpg`).size) throw new Error(`Empty cover image for ${book.title}`);
  console.log(`Rendered ${book.subject}/${book.id}.jpg`);
}

console.log(`Rendered ${books.length} PDF cover previews.`);
