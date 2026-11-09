"use client";

/**
 * The phone layout (web-pwa fork): one breakpoint, below the 640px window
 * floor the desktop layout was designed for. Tablets and desktops keep the
 * upstream layout untouched; app/mobile.css holds the phone overrides.
 */
import { useSyncExternalStore } from "react";

export const PHONE_QUERY = "(max-width: 639px)";
/** A phone held in hand: on-screen keyboard, no Shift+Enter to reach for. */
const TOUCH_PHONE_QUERY = `${PHONE_QUERY} and (pointer: coarse)`;

function matches(query: string): boolean {
	return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches;
}

export function isPhone(): boolean {
	return matches(PHONE_QUERY);
}

function subscribe(onChange: () => void) {
	if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
	const media = window.matchMedia(PHONE_QUERY);
	media.addEventListener("change", onChange);
	return () => media.removeEventListener("change", onChange);
}

/** Server and first client render are the desktop case (no hydration mismatch). */
export function useIsPhone(): boolean {
	return useSyncExternalStore(subscribe, isPhone, () => false);
}

/** Plain Enter sends everywhere except on a touch phone, where the on-screen
 *  keyboard's Return is the only way to start a new line; the dock's own
 *  Submit/Send buttons send there. ⌘/Ctrl+Enter still sends on any device. */
export function plainEnterSubmits(): boolean {
	return !matches(TOUCH_PHONE_QUERY);
}
