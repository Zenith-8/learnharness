"use client";

import { useEffect, useState } from "react";
import { BookOpenIcon, DumbbellIcon, SettingsIcon, WaypointsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const NON_TEXT_INPUTS = new Set(["button", "checkbox", "color", "file", "hidden", "image", "radio", "range", "reset", "submit"]);

/** Elements that raise the on-screen keyboard. */
function raisesKeyboard(el: Element | null): boolean {
	if (!(el instanceof HTMLElement)) return false;
	if (el instanceof HTMLInputElement) return !NON_TEXT_INPUTS.has(el.type);
	return el instanceof HTMLTextAreaElement || el.isContentEditable;
}

export type PhoneTab = "learn" | "graph" | "practice" | "settings";

const TABS: { id: PhoneTab; label: string; Icon: typeof BookOpenIcon }[] = [
	{ id: "learn", label: "Learn", Icon: BookOpenIcon },
	{ id: "graph", label: "Graph", Icon: WaypointsIcon },
	{ id: "practice", label: "Practice", Icon: DumbbellIcon },
	{ id: "settings", label: "Settings", Icon: SettingsIcon },
];

/** While a text field has focus the on-screen keyboard is up: give its
 *  height back to the field instead of parking the tab bar above it. The
 *  class also drops the shell's tab-bar padding (app/mobile.css). */
function useTyping(): boolean {
	const [typing, setTyping] = useState(false);
	useEffect(() => {
		const update = () => setTyping(raisesKeyboard(document.activeElement));
		// focusout fires before focus lands on the next element.
		const afterBlur = () => requestAnimationFrame(update);
		document.addEventListener("focusin", update);
		document.addEventListener("focusout", afterBlur);
		return () => {
			document.removeEventListener("focusin", update);
			document.removeEventListener("focusout", afterBlur);
			document.documentElement.classList.remove("lh-typing");
		};
	}, []);
	useEffect(() => { document.documentElement.classList.toggle("lh-typing", typing); }, [typing]);
	return typing;
}

/** The phone's primary navigation (web-pwa fork): fixed to the bottom,
 *  thumb-reachable, above the home indicator. Rendered only on phones. */
export function PhoneTabBar({ active, onSelect }: { active: PhoneTab | null; onSelect: (tab: PhoneTab) => void }) {
	const typing = useTyping();
	return (
		<nav
			aria-label="Main"
			data-testid="phone-tab-bar"
			hidden={typing}
			className="fixed inset-x-0 bottom-0 z-50 border-t bg-background pb-[env(safe-area-inset-bottom)]"
		>
			<div className="flex h-14">
				{TABS.map(({ id, label, Icon }) => (
					<button
						key={id}
						type="button"
						data-testid={`phone-tab-${id}`}
						aria-current={active === id ? "page" : undefined}
						onClick={() => onSelect(id)}
						className={cn(
							"relative flex flex-1 flex-col items-center justify-center gap-1 text-[11px] uppercase tracking-wider transition-colors",
							active === id ? "text-foreground" : "text-muted-foreground/70",
						)}
					>
						{active === id && <span aria-hidden className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-primary" />}
						<Icon className="size-5" aria-hidden />
						{label}
					</button>
				))}
			</div>
		</nav>
	);
}
