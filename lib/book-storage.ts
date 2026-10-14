export const BOOK_PART_BYTES = 8 * 1024 * 1024;

export type SubjectBook = {
  subject: string;
  id: string;
  title: string;
  key: string;
  bytes: number;
  sha256: string;
  downloadName: string;
};

export function bookError(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export function parseBookRange(value: string, size: number) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2])) return null;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix < 1) return null;
    const length = Math.min(suffix, size);
    return { offset: size - length, length };
  }
  const offset = Number(match[1]);
  const end = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(end) || offset >= size || end < offset) return null;
  return { offset, length: Math.min(end, size - 1) - offset + 1 };
}

export async function readSubjectBook(request: Request, bucket: R2Bucket, book: SubjectBook) {
  const metadata = await bucket.head(book.key);
  if (!metadata || metadata.size !== book.bytes || metadata.customMetadata?.sha256 !== book.sha256) {
    return bookError("This PDF is not available yet. Please try again later.", 404);
  }
  const headers = new Headers({
    "Content-Type": "application/pdf",
    "Content-Disposition": `${new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline"}; filename="${book.downloadName}"`,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
    ETag: metadata.httpEtag,
    "Last-Modified": metadata.uploaded.toUTCString(),
  });
  if (request.headers.get("If-None-Match") === metadata.httpEtag) return new Response(null, { status: 304, headers });
  const requestedRange = request.method === "GET" ? request.headers.get("Range") : null;
  const ifRange = request.headers.get("If-Range");
  const useRange = requestedRange && (!ifRange || ifRange === metadata.httpEtag || ifRange === metadata.uploaded.toUTCString());
  const range = useRange ? parseBookRange(requestedRange, metadata.size) : undefined;
  if (range === null) {
    headers.set("Content-Range", `bytes */${metadata.size}`);
    return new Response(null, { status: 416, headers });
  }
  headers.set("Content-Length", String(range?.length ?? metadata.size));
  if (request.method === "HEAD") return new Response(null, { headers });
  const object = await bucket.get(book.key, range ? { range } : undefined);
  if (!object) return bookError("This PDF is temporarily unavailable. Please try again.", 404);
  if (range) headers.set("Content-Range", `bytes ${range.offset}-${range.offset + range.length - 1}/${metadata.size}`);
  return new Response(object.body, { status: range ? 206 : 200, headers });
}

export async function importSubjectBook(request: Request, bucket: R2Bucket, book: SubjectBook, importToken?: string) {
  if (!importToken || request.headers.get("X-Book-Import-Token") !== importToken) return bookError("Book import is not authorized.", 403);
  const url = new URL(request.url);
  const operation = url.searchParams.get("operation");
  if (request.method === "POST" && operation === "begin") {
    const existing = await bucket.head(book.key);
    if (existing?.size === book.bytes && existing.customMetadata?.sha256 === book.sha256) return Response.json({ existing: true });
    const upload = await bucket.createMultipartUpload(book.key, { httpMetadata: { contentType: "application/pdf" }, customMetadata: { sha256: book.sha256 } });
    return Response.json({ uploadId: upload.uploadId, partBytes: BOOK_PART_BYTES });
  }
  const uploadId = url.searchParams.get("uploadId");
  if (!uploadId || uploadId.length > 1024) return bookError("A valid upload ID is required.", 400);
  const upload = bucket.resumeMultipartUpload(book.key, uploadId);
  if (request.method === "PUT") {
    const partNumber = Number(url.searchParams.get("partNumber"));
    const count = Math.ceil(book.bytes / BOOK_PART_BYTES);
    if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > count) return bookError("Invalid part number.", 400);
    const expected = Math.min(BOOK_PART_BYTES, book.bytes - (partNumber - 1) * BOOK_PART_BYTES);
    if (Number(request.headers.get("Content-Length")) !== expected) return bookError("Invalid part length.", 400);
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength !== expected) return bookError("Incomplete upload part.", 400);
    return Response.json(await upload.uploadPart(partNumber, bytes));
  }
  if (request.method === "POST" && operation === "complete") {
    const payload = await request.text();
    if (payload.length > 16_384) return bookError("Upload completion is too large.", 400);
    let parts: R2UploadedPart[];
    try { parts = JSON.parse(payload); } catch { return bookError("Invalid completion data.", 400); }
    const count = Math.ceil(book.bytes / BOOK_PART_BYTES);
    if (!Array.isArray(parts) || parts.length !== count || parts.some((part, index) => part?.partNumber !== index + 1 || typeof part.etag !== "string" || !part.etag || part.etag.length > 512)) {
      return bookError("Upload parts are incomplete or out of order.", 400);
    }
    const object = await upload.complete(parts);
    if (object.size !== book.bytes) return bookError("The uploaded PDF has an incorrect size.", 409);
    return Response.json({ uploaded: true, bytes: object.size });
  }
  if (request.method === "POST" && operation === "abort") {
    await upload.abort();
    return Response.json({ aborted: true });
  }
  return bookError("Unsupported book import operation.", 400);
}
