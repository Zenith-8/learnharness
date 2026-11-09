/*
 * Service worker (web-pwa fork). LearnHarness is useless without its server,
 * so this caches only what makes the installed app start cleanly:
 *
 *   - /_next/static/* — content-hashed build assets, cache-first;
 *   - the offline page + icons — precached, shown when a navigation fails.
 *
 * API calls, SSE streams and pages always go to the network. Learning data
 * is never cached here. Bump VERSION to drop old caches on the next visit.
 */
const VERSION = "lh-pwa-1";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/pwa/icon-192.png", "/pwa/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
	event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches.keys()
			.then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
			.then(() => self.clients.claim()),
	);
});

self.addEventListener("fetch", (event) => {
	const request = event.request;
	if (request.method !== "GET") return;
	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;

	if (request.mode === "navigate") {
		event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
		return;
	}

	if (url.pathname.startsWith("/_next/static/")) {
		event.respondWith(
			caches.open(VERSION).then(async (cache) => {
				const hit = await cache.match(request);
				if (hit) return hit;
				const response = await fetch(request);
				if (response.ok) cache.put(request, response.clone());
				return response;
			}),
		);
	}
});
