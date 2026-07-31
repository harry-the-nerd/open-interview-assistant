// settings.ts — tiny JSON-backed store for the few values the overlay persists.

import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

/**
 * How hard Claude thinks before answering. Higher is more accurate and slower —
 * the main quality/latency dial for the whole app.
 */
export type Effort = "low" | "medium" | "high" | "xhigh";

export interface Settings {
	anthropicApiKey: string;
	effort: Effort;
	/** Panel background alpha, 0.25–1. The overlay window itself stays fully transparent. */
	opacity: number;
	language: string;
	/** Shared secret the Chrome extension presents on every delivery. */
	extensionToken: string;
	/**
	 * True once any extension has successfully claimed the token. Until then,
	 * /pair stays open so first-run setup needs no keystroke or popup click.
	 * After the first claim, re-pairing requires arming via the shortcut.
	 */
	extensionPaired: boolean;
}

const DEFAULTS: Settings = {
	anthropicApiKey: "",
	effort: "medium",
	opacity: 0.72,
	language: "the language the problem is written in",
	extensionToken: "",
	extensionPaired: false,
};

let cache: Settings | null = null;

function filePath(): string {
	return path.join(app.getPath("userData"), "settings.json");
}

export function getSettings(): Settings {
	if (cache) return cache;
	let stored: Partial<Settings> = {};
	try {
		stored = JSON.parse(fs.readFileSync(filePath(), "utf-8"));
	} catch {
		// First run, or an unreadable/corrupt file — defaults are the right answer.
	}
	// Keep only known keys so leftover multi-provider fields from older installs
	// are dropped on the next save.
	cache = {
		anthropicApiKey: stored.anthropicApiKey ?? DEFAULTS.anthropicApiKey,
		effort: stored.effort ?? DEFAULTS.effort,
		opacity: stored.opacity ?? DEFAULTS.opacity,
		language: stored.language ?? DEFAULTS.language,
		extensionToken: stored.extensionToken ?? DEFAULTS.extensionToken,
		extensionPaired: stored.extensionPaired ?? DEFAULTS.extensionPaired,
	};
	// Environment key fills in when nothing is stored yet.
	if (!cache.anthropicApiKey && process.env.ANTHROPIC_API_KEY) {
		cache.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
	}
	return cache;
}

export function updateSettings(patch: Partial<Settings>): Settings {
	const next = { ...getSettings(), ...patch };
	if (typeof next.opacity === "number") {
		next.opacity = Math.min(1, Math.max(0.25, next.opacity));
	}
	cache = next;
	try {
		fs.writeFileSync(filePath(), JSON.stringify(next, null, 2));
	} catch (error) {
		console.error("[settings] failed to save:", error);
	}
	return next;
}

/** The Anthropic API key, or '' when the user still has to set one. */
export function getApiKey(s: Settings = getSettings()): string {
	return s.anthropicApiKey;
}
