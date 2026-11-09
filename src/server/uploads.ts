import { MAX_IMPORT_BODY_BYTES, MAX_IMPORT_BYTES } from "../../lib/notes-import-limits.ts";
import { saveUpload } from "../store/uploads.ts";
import { subscriptionRequestOrigin } from "./web-subscription-http.ts";

const HEADERS = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
export const MAX_UPLOAD_FILES = 20;

function failure(error: string, status: number) {
	return Response.json({ error }, { status, headers: HEADERS });
}

/** Same-origin browser intent, as for the other web-mode controls — not user
 * authentication. The deployment's access boundary (the tailnet) is that. */
function sameOrigin(request: Request): boolean {
	const origin = request.headers.get("origin");
	if (!origin || origin === "null" || origin !== subscriptionRequestOrigin(request)) return false;
	const site = request.headers.get("sec-fetch-site");
	return site === null || site === "same-origin";
}

/** POST /api/uploads (web-pwa fork): multipart "files" in, absolute server
 * paths out, one per file in request order. Shares the notes import's byte
 * budget, which next.config.ts already lets through the proxy. */
export async function uploadsResponse(request: Request): Promise<Response> {
	if (request.method !== "POST") return failure("Unsupported method.", 405);
	if (!sameOrigin(request)) return failure("Uploads require a same-origin LearnHarness request.", 403);
	if (Number(request.headers.get("content-length")) > MAX_IMPORT_BODY_BYTES) {
		return failure(`Uploads are limited to ${MAX_IMPORT_BYTES / (1024 * 1024)} MB per request.`, 413);
	}
	let form: FormData;
	try { form = await request.formData(); }
	catch { return failure("Expected multipart form data.", 400); }
	const files = form.getAll("files").filter((entry): entry is File => typeof entry === "object" && entry !== null && "arrayBuffer" in entry);
	if (files.length === 0) return failure("No files were uploaded.", 400);
	if (files.length > MAX_UPLOAD_FILES) return failure(`Upload at most ${MAX_UPLOAD_FILES} files at a time.`, 400);
	const total = files.reduce((sum, file) => sum + file.size, 0);
	if (total > MAX_IMPORT_BYTES) return failure(`Uploads are limited to ${MAX_IMPORT_BYTES / (1024 * 1024)} MB per request.`, 413);
	try {
		const paths: string[] = [];
		for (const file of files) paths.push(saveUpload(file.name, new Uint8Array(await file.arrayBuffer())));
		return Response.json({ paths }, { headers: HEADERS });
	} catch {
		return failure("The server could not store the upload.", 500);
	}
}
