import assert from "node:assert/strict";
import test from "node:test";
import { BOOK_PART_BYTES, importSubjectBook, parseBookRange, readSubjectBook } from "../lib/book-storage.ts";

const data = new TextEncoder().encode("%PDF-test-content");
const book = { subject: "maths", id: "sample", title: "Sample", key: "books/sample.pdf", bytes: data.length, sha256: "sample-hash", downloadName: "sample.pdf" };
const metadata = { size: data.length, httpEtag: '"sample-etag"', uploaded: new Date("2026-01-01T00:00:00Z"), customMetadata: { sha256: book.sha256 } };
const bucket = {
  async head() { return metadata; },
  async get(key, { range } = {}) { return { body: range ? data.slice(range.offset, range.offset + range.length) : data }; },
};

test("PDF ranges support suffixes and reject invalid or multiple ranges", () => {
  assert.deepEqual(parseBookRange("bytes=0-4", 100), { offset: 0, length: 5 });
  assert.deepEqual(parseBookRange("bytes=95-", 100), { offset: 95, length: 5 });
  assert.deepEqual(parseBookRange("bytes=-5", 100), { offset: 95, length: 5 });
  assert.deepEqual(parseBookRange("bytes=-200", 100), { offset: 0, length: 100 });
  for (const value of ["bytes=100-", "bytes=-0", "bytes=8-3", "bytes=0-1,4-5", "bytes=-", "bytes=9007199254740992-"]) assert.equal(parseBookRange(value, 100), null);
});

test("PDF reading streams the source bytes and supports download and HEAD", async () => {
  const response = await readSubjectBook(new Request("https://example.test/api/books?download=1"), bucket, book);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Disposition"), 'attachment; filename="sample.pdf"');
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), data);
  const head = await readSubjectBook(new Request("https://example.test/api/books", { method: "HEAD", headers: { Range: "bytes=0-4" } }), bucket, book);
  assert.equal(head.body, null);
  assert.equal(head.headers.get("Content-Length"), String(data.length));
});

test("PDF reading handles ranges, validators and unavailable uploads", async () => {
  const range = await readSubjectBook(new Request("https://example.test/api/books", { headers: { Range: "bytes=0-4" } }), bucket, book);
  assert.equal(range.status, 206);
  assert.equal(await range.text(), "%PDF-");
  assert.equal(range.headers.get("Content-Range"), `bytes 0-4/${data.length}`);
  const invalid = await readSubjectBook(new Request("https://example.test/api/books", { headers: { Range: "bytes=999-" } }), bucket, book);
  assert.equal(invalid.status, 416);
  const stale = await readSubjectBook(new Request("https://example.test/api/books", { headers: { Range: "bytes=0-4", "If-Range": '"older"' } }), bucket, book);
  assert.equal(stale.status, 200);
  const cached = await readSubjectBook(new Request("https://example.test/api/books", { headers: { "If-None-Match": metadata.httpEtag } }), bucket, book);
  assert.equal(cached.status, 304);
  const missing = await readSubjectBook(new Request("https://example.test/api/books"), { async head() { return null; } }, book);
  assert.equal(missing.status, 404);
});

test("imports stay disabled without the secret and do not call storage", async () => {
  const request = new Request("https://example.test/api/books?operation=begin", { method: "POST" });
  assert.equal((await importSubjectBook(request, {}, book)).status, 403);
  assert.equal((await importSubjectBook(request, {}, book, "test-secret")).status, 403);
});

test("multipart uploads enforce final part lengths and ordered completion", async () => {
  const largeBook = { ...book, bytes: BOOK_PART_BYTES + 3 };
  let completed = false;
  const multipartBucket = {
    resumeMultipartUpload() {
      return {
        async uploadPart(partNumber, bytes) { assert.equal(bytes.byteLength, 3); return { partNumber, etag: "part-two" }; },
        async complete(parts) { completed = true; assert.equal(parts.length, 2); return { size: largeBook.bytes }; },
      };
    },
  };
  const headers = { "X-Book-Import-Token": "test-secret", "Content-Length": "3" };
  const part = await importSubjectBook(new Request("https://example.test/api/books?uploadId=upload&partNumber=2", { method: "PUT", headers, body: "abc" }), multipartBucket, largeBook, "test-secret");
  assert.equal(part.status, 200);
  const incomplete = await importSubjectBook(new Request("https://example.test/api/books?uploadId=upload&operation=complete", { method: "POST", headers, body: JSON.stringify([{ partNumber: 2, etag: "two" }, { partNumber: 1, etag: "one" }]) }), multipartBucket, largeBook, "test-secret");
  assert.equal(incomplete.status, 400);
  assert.equal(completed, false);
  const complete = await importSubjectBook(new Request("https://example.test/api/books?uploadId=upload&operation=complete", { method: "POST", headers, body: JSON.stringify([{ partNumber: 1, etag: "one" }, { partNumber: 2, etag: "two" }]) }), multipartBucket, largeBook, "test-secret");
  assert.equal(complete.status, 200);
  assert.equal(completed, true);
});
