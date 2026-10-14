import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { open, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(await readFile(path.join(projectRoot, "lib/subject-books.json"), "utf8"));
const input = JSON.parse(await readHiddenInput());
if (!input.bypassToken || !input.importToken || !path.isAbsolute(input.sourceRoot || "")) throw new Error("Import credentials and source folder are required.");
const origin = new URL(input.siteUrl);
if (origin.protocol !== "https:" || !origin.hostname.endsWith(".chatgpt.site")) throw new Error("Use the published Site origin.");
let completed = 0;
let next = 0;
const failures = [];

async function request(book, method, query = {}, body, retry = true) {
  const url = new URL("/api/books", origin.origin);
  url.search = new URLSearchParams({ subject: book.subject, file: book.id, ...query }).toString();
  const headers = { "OAI-Sites-Authorization": `Bearer ${input.bypassToken}`, "X-Book-Import-Token": input.importToken };
  if (body !== undefined) headers["Content-Type"] = typeof body === "string" ? "application/json" : "application/octet-stream";
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url, { method, headers, body, redirect: "error", signal: AbortSignal.timeout(120_000) });
      if (!response.ok) {
        const status = response.status;
        await response.body?.cancel();
        if (retry && attempt < 3 && (status >= 500 || status === 429)) {
          await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** attempt));
          continue;
        }
        throw new Error(`Book request returned HTTP ${status}.`);
      }
      return response;
    } catch (error) {
      if (!retry || attempt >= 3 || error.message?.startsWith("Book request returned")) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** attempt));
    }
  }
}

async function verify(book) {
  const response = await request(book, "GET");
  const contentType = response.headers.get("Content-Type")?.split(";")[0].trim();
  const contentLength = response.headers.get("Content-Length");
  if (contentType !== "application/pdf" || (contentLength !== null && Number(contentLength) !== book.bytes)) {
    await response.body?.cancel();
    throw new Error(`Downloaded PDF has invalid metadata (${contentType}; length=${contentLength}).`);
  }
  const hash = createHash("sha256");
  let bytes = 0;
  for await (const chunk of response.body) { hash.update(chunk); bytes += chunk.length; }
  if (bytes !== book.bytes || hash.digest("hex") !== book.sha256) throw new Error("Downloaded PDF does not match the source file.");
  const range = await fetch(new URL(`/api/books?subject=${book.subject}&file=${book.id}`, origin.origin), {
    headers: { "OAI-Sites-Authorization": `Bearer ${input.bypassToken}`, Range: "bytes=0-4" },
    redirect: "error", signal: AbortSignal.timeout(30_000),
  });
  if (range.status !== 206 || await range.text() !== "%PDF-") throw new Error("The PDF range request failed.");
}

async function importBook(book) {
  const filename = path.join(input.sourceRoot, book.folder, book.sourceFilename);
  if ((await stat(filename)).size !== book.bytes) throw new Error("Source file size changed.");
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  if (hash.digest("hex") !== book.sha256) throw new Error("Source file changed after preparation.");
  const begin = await (await request(book, "POST", { operation: "begin" }, undefined, false)).json();
  if (!begin.existing) {
    const handle = await open(filename, "r");
    try {
      const parts = [];
      for (let offset = 0; offset < book.bytes; offset += begin.partBytes) {
        const length = Math.min(begin.partBytes, book.bytes - offset);
        const buffer = Buffer.allocUnsafe(length);
        const { bytesRead } = await handle.read(buffer, 0, length, offset);
        if (bytesRead !== length) throw new Error("Could not read a complete source chunk.");
        parts.push(await (await request(book, "PUT", { uploadId: begin.uploadId, partNumber: String(parts.length + 1) }, buffer)).json());
      }
      await request(book, "POST", { operation: "complete", uploadId: begin.uploadId }, JSON.stringify(parts), false);
    } catch (error) {
      try { await request(book, "POST", { operation: "abort", uploadId: begin.uploadId }, undefined, false); } catch {}
      throw error;
    } finally { await handle.close(); }
  }
  await verify(book);
  console.log(`Verified ${++completed}/${catalog.length}: ${book.folder} - ${book.title}`);
}

await Promise.all(Array.from({ length: 2 }, async () => {
  while (next < catalog.length) {
    const book = catalog[next++];
    try { await importBook(book); }
    catch (error) { failures.push(book.id); console.error(`Failed: ${book.folder} - ${book.title}: ${error.message}`); }
  }
}));
console.log(JSON.stringify({ verified: completed, expected: catalog.length, failed: failures }));
if (failures.length) process.exitCode = 1;

async function readHiddenInput() {
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  console.log("Ready for book import JSON on stdin (input is hidden).");
  return await new Promise((resolve, reject) => {
    let value = "";
    function finish(error) {
      process.stdin.removeListener("data", receive);
      process.stdin.removeListener("end", end);
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdin.pause();
      error ? reject(error) : resolve(value.trim());
    }
    function receive(chunk) {
      value += chunk;
      if (value.includes("\u0003")) finish(new Error("Book import cancelled."));
      else if (value.length > 65_536) finish(new Error("Import input is too large."));
      else if (value.includes("\n") || value.includes("\r")) finish();
    }
    function end() { finish(); }
    process.stdin.on("data", receive);
    process.stdin.on("end", end);
    process.stdin.resume();
  });
}
