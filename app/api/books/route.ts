import catalog from "@/lib/subject-books.json";
import { bookError, importSubjectBook, readSubjectBook } from "@/lib/book-storage";

async function handle(request: Request) {
  const url = new URL(request.url);
  const book = catalog.find(entry => entry.subject === url.searchParams.get("subject") && entry.id === url.searchParams.get("file"));
  if (!book) return bookError("Book not found.", 404);
  try {
    const { env } = await import("cloudflare:workers");
    const bindings = env as { BUCKET?: R2Bucket; BOOK_IMPORT_TOKEN?: string };
    if (!bindings.BUCKET) return bookError("The book library is temporarily unavailable. Please try again.", 503);
    if (request.method === "GET" || request.method === "HEAD") return await readSubjectBook(request, bindings.BUCKET, book);
    return await importSubjectBook(request, bindings.BUCKET, book, bindings.BOOK_IMPORT_TOKEN);
  } catch (error) {
    console.error("Book storage request failed", book.subject, book.id, error instanceof Error ? error.message : "Unknown storage error");
    return bookError("The PDF could not be accessed. Please try again.", 503);
  }
}

export const GET = handle;
export const HEAD = handle;
export const POST = handle;
export const PUT = handle;
