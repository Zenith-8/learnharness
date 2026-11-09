/**
 * POST /api/uploads (web-pwa fork) — browser files become server paths under
 * <data>/uploads. Same-origin only, bounded like the notes import, and a
 * name can never escape its upload directory or overwrite another upload.
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { after, before, describe, it } from "node:test";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lh-uploads-route-"));
process.env.LH_DATA_DIR = dir;
process.env.LH_AUTH_FILE = path.join(dir, "auth.json");

after(() => {
	fs.rmSync(dir, { recursive: true, force: true });
	delete process.env.LH_DATA_DIR;
	delete process.env.LH_AUTH_FILE;
});

type Route = typeof import("../app/api/uploads/route.ts");
type Store = typeof import("../src/store/uploads.ts");
let route: Route;
let store: Store;
before(async () => {
	route = await import("../app/api/uploads/route.ts");
	store = await import("../src/store/uploads.ts");
});

const ORIGIN = "https://learnharness.example.ts.net";

function upload(files: File[], headers: Record<string, string> = { origin: ORIGIN, host: "learnharness.example.ts.net", "sec-fetch-site": "same-origin" }) {
	const form = new FormData();
	for (const file of files) form.append("files", file, file.name);
	return new Request("https://learnharness.example.ts.net/api/uploads", { method: "POST", body: form, headers });
}

describe("POST /api/uploads", () => {
	it("stores each file under the data dir and returns absolute paths in request order", async () => {
		const response = await route.POST(upload([new File(["first"], "board.jpg"), new File(["second"], "board.jpg")]));
		assert.equal(response.status, 200);
		const { paths } = await response.json() as { paths: string[] };
		assert.equal(paths.length, 2);
		assert.notEqual(paths[0], paths[1], "same names never collide");
		for (const [index, file] of paths.entries()) {
			assert.ok(path.isAbsolute(file));
			assert.ok(file.startsWith(path.join(dir, "uploads") + path.sep));
			assert.equal(path.basename(file), "board.jpg");
			assert.equal(fs.readFileSync(file, "utf8"), index === 0 ? "first" : "second");
		}
	});

	it("refuses cross-origin and origin-less requests", async () => {
		for (const headers of <Record<string, string>[]>[
			{ origin: "https://evil.example", host: "learnharness.example.ts.net" },
			{ host: "learnharness.example.ts.net" },
			{ origin: ORIGIN, host: "learnharness.example.ts.net", "sec-fetch-site": "cross-site" },
		]) {
			const response = await route.POST(upload([new File(["x"], "a.txt")], headers));
			assert.equal(response.status, 403);
		}
	});

	it("refuses an empty upload", async () => {
		assert.equal((await route.POST(upload([]))).status, 400);
	});
});

describe("safeUploadName", () => {
	it("keeps ordinary names and strips path parts, controls and shell-hostile characters", () => {
		assert.equal(store.safeUploadName("week 3.pdf"), "week 3.pdf");
		assert.equal(store.safeUploadName("../../etc/passwd"), "passwd");
		assert.equal(store.safeUploadName("C:\\Users\\me\\notes.md"), "notes.md");
		assert.equal(store.safeUploadName("a\u0000b`c$d.txt"), "a_b_c_d.txt");
		assert.equal(store.safeUploadName(".."), "upload");
		assert.equal(store.safeUploadName(""), "upload");
	});

	it("caps long names but keeps the extension", () => {
		const name = store.safeUploadName(`${"x".repeat(300)}.png`);
		assert.ok(name.length <= 120);
		assert.ok(name.endsWith(".png"));
	});
});
