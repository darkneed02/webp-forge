export class AppError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function errorResponse(error: unknown) {
  if (error instanceof AppError) return Response.json({ error: error.message }, { status: error.status });
  console.error("WebP Forge request failed", error);
  const code = (error as NodeJS.ErrnoException)?.code;
  const message = code === "EACCES" || code === "EPERM" ? "Cannot write to the output folder. Check folder permissions." : code === "ENOSPC" ? "The output disk is full. Free up space and try again." : "Something went wrong. Check that the output folder is available and try again.";
  return Response.json({ error: message }, { status: 500 });
}
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) throw new AppError("This request must come from WebP Forge.", 403);
  if (request.headers.get("sec-fetch-site") === "cross-site") throw new AppError("Cross-site requests are not allowed.", 403);
}
