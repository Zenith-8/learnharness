"use client";

import { useEffect } from "react";

/** Registers public/sw.js for installed-app use (web-pwa fork). Browser
 *  builds only: the Electron window (window.lh) and `next dev` skip it, so
 *  dev never serves stale cached chunks. */
export default function RegisterServiceWorker() {
	useEffect(() => {
		if (process.env.NODE_ENV !== "production" || window.lh || !("serviceWorker" in navigator)) return;
		navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
	}, []);
	return null;
}
