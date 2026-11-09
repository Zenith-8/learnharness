/**
 * Uploaded learner files (web-pwa fork): a browser File has no local path,
 * so the server stores its bytes under <data>/uploads and hands back the
 * absolute path. From there it is an ordinary attachment — the same quoted
 * path chip a desktop pick produces, read by the same agent tools.
 *
 * One directory per file, so two uploads with the same name never collide
 * and the visible chip keeps the learner's own filename.
 */
import { randomBytes } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { PATHS } from "../../config.ts";

export const UPLOADS_DIR = path.join(PATHS.data, "uploads");

const MAX_NAME = 120;

/** A filename safe on every OS and inside a quoted path chip. */
export function safeUploadName(name: string): string {
	const base = name.split(/[\\/]/).pop() ?? "";
	const cleaned = base
		.normalize("NFC")
		.replace(/[\x00-\x1f\x7f<>:"|?*'`$]/g, "_")
		.replace(/\s+/g, " ")
		.trim()
		.replace(/^\.+/, "");
	if (!cleaned) return "upload";
	if (cleaned.length <= MAX_NAME) return cleaned;
	const ext = path.extname(cleaned).slice(0, 16);
	return cleaned.slice(0, MAX_NAME - ext.length) + ext;
}

/** Write one upload; returns its absolute path. Never overwrites. */
export function saveUpload(name: string, bytes: Uint8Array, now = new Date()): string {
	const stamp = now.toISOString().slice(0, 10).replaceAll("-", "");
	const dir = path.join(UPLOADS_DIR, `${stamp}-${randomBytes(6).toString("hex")}`);
	fs.mkdirSync(dir, { recursive: true });
	const file = path.join(dir, safeUploadName(name));
	fs.writeFileSync(file, bytes, { flag: "wx" });
	return file;
}
