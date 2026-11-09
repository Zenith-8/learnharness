/** Browser uploads (web-pwa fork): files → server paths via POST /api/uploads.
 *  The returned paths enter drafts exactly like desktop-picked paths. */
export async function uploadFiles(files: readonly File[], fetchImpl: typeof fetch = fetch): Promise<string[]> {
	const form = new FormData();
	for (const file of files) form.append("files", file, file.name);
	let response: Response;
	try { response = await fetchImpl("/api/uploads", { method: "POST", body: form }); }
	catch { throw new Error("Upload failed: the server could not be reached."); }
	let body: unknown;
	try { body = await response.json(); }
	catch { throw new Error(`Upload failed (HTTP ${response.status}).`); }
	if (!response.ok) {
		const error = body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : `Upload failed (HTTP ${response.status}).`;
		throw new Error(error);
	}
	const paths = body && typeof body === "object" && "paths" in body ? body.paths : undefined;
	if (!Array.isArray(paths) || paths.length !== files.length || !paths.every((p) => typeof p === "string" && p.length > 0)) {
		throw new Error("Upload failed: the server sent an invalid response.");
	}
	return paths as string[];
}

export const uploadingNotice = (count: number) => `Uploading ${count} ${count === 1 ? "file" : "files"}…`;
