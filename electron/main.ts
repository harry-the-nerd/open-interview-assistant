// main.ts — app lifecycle, global shortcuts and IPC for the interview overlay.

import { app, globalShortcut, ipcMain } from "electron";
import { DomServer, ensureExtensionToken, type DomPayload } from "./DomServer";
import { OverlayWindow } from "./OverlayWindow";
import { generateInterviewScript, type PageContext } from "./llm";
import {
	getApiKey,
	getSettings,
	updateSettings,
	type Effort,
	type Settings,
} from "./settings";

if (!app.isPackaged) {
	try {
		require("dotenv").config();
	} catch {
		// dotenv is a dev convenience; running without it is fine.
	}
}

const overlay = new OverlayWindow();
let page: PageContext | null = null;
let analysis: AbortController | null = null;

const EFFORTS: Effort[] = ["low", "medium", "high", "xhigh"];
const OPACITIES = [0.35, 0.5, 0.72, 0.9];

const domServer = new DomServer(
	(payload) => void onPageCaptured(payload),
	() => {
		overlay.show();
		overlay.send("toast", "Extension connected");
	},
);

/**
 * Every shortcut the app registers. The panel ignores the mouse entirely, so
 * this list is the complete set of controls — there are no buttons.
 */
const SHORTCUTS: { accelerator: string; run: () => void }[] = [
	// Answer from whatever page context we have. The browser extension normally
	// fires this for you the moment it delivers a page.
	{ accelerator: "CommandOrControl+Return", run: () => void analyze() },
	{ accelerator: "CommandOrControl+B", run: () => overlay.toggleVisibility() },
	{ accelerator: "CommandOrControl+Shift+S", run: () => overlay.toggleSide() },
	{
		accelerator: "CommandOrControl+Shift+Left",
		run: () => overlay.dock("left"),
	},
	{
		accelerator: "CommandOrControl+Shift+Right",
		run: () => overlay.dock("right"),
	},
	{ accelerator: "CommandOrControl+Up", run: () => overlay.send("scroll", -1) },
	{
		accelerator: "CommandOrControl+Down",
		run: () => overlay.send("scroll", 1),
	},
	{ accelerator: "CommandOrControl+Shift+Up", run: () => overlay.move(0, -1) },
	{ accelerator: "CommandOrControl+Shift+Down", run: () => overlay.move(0, 1) },
	{ accelerator: "CommandOrControl+R", run: () => reset() },
	{ accelerator: "CommandOrControl+Shift+E", run: () => cycle("effort") },
	{ accelerator: "CommandOrControl+Shift+O", run: () => cycle("opacity") },
	// Recovery only — first-run pairing is automatic once the extension loads.
	{ accelerator: "CommandOrControl+Shift+P", run: () => armPairing() },
	{
		accelerator: "CommandOrControl+Shift+K",
		run: () => overlay.send("toggle-help"),
	},
];

function registerShortcuts(): void {
	for (const { accelerator, run } of SHORTCUTS) {
		const ok = globalShortcut.register(accelerator, run);
		if (!ok)
			console.warn(`[main] ${accelerator} is already taken by another app`);
	}
}

function publicSettings(s: Settings = getSettings()) {
	// The renderer needs to know whether a key exists, never what it is.
	return {
		effort: s.effort,
		opacity: s.opacity,
		language: s.language,
		hasKey: !!getApiKey(s),
		port: domServer.listeningPort,
	};
}

function pushSettings(): void {
	overlay.send("settings-changed", publicSettings());
}

/** Step a setting to its next value — the keyboard stand-in for a control. */
function cycle(which: "effort" | "opacity"): void {
	const s = getSettings();
	if (which === "effort") {
		const next = EFFORTS[(EFFORTS.indexOf(s.effort) + 1) % EFFORTS.length];
		updateSettings({ effort: next });
		overlay.send("toast", `Thinking: ${next}`);
	} else {
		const index = OPACITIES.findIndex((value) => value >= s.opacity - 0.01);
		updateSettings({ opacity: OPACITIES[(index + 1) % OPACITIES.length] });
	}
	overlay.show();
	pushSettings();
}

/** Re-opens /pair for 60s when the extension lost its token or needs a fresh claim. */
function armPairing(): void {
	domServer.armPairing();
	overlay.show();
	overlay.send("pairing-armed", domServer.listeningPort);
	overlay.send("toast", "Pairing open for 60s");
}

/** The extension delivered a page: adopt it as context and answer immediately. */
async function onPageCaptured(payload: DomPayload): Promise<void> {
	page = payload;
	overlay.show();
	overlay.send("page-captured", {
		title: payload.title,
		chars: payload.text.length,
	});
	await analyze();
}

function reset(): void {
	analysis?.abort();
	analysis = null;
	page = null;
	overlay.send("reset");
}

async function analyze(): Promise<void> {
	if (!page) {
		overlay.send("toast", "Nothing captured yet.");
		return;
	}
	analysis?.abort();
	const controller = new AbortController();
	analysis = controller;
	overlay.show();
	overlay.send("analysis-start");
	try {
		const script = await generateInterviewScript({ page }, controller.signal);
		if (!controller.signal.aborted) overlay.send("analysis-result", script);
	} catch (error: unknown) {
		if (controller.signal.aborted) return;
		const message = error instanceof Error ? error.message : String(error);
		console.error("[main] analysis failed:", message);
		overlay.send("analysis-error", message);
	} finally {
		if (analysis === controller) analysis = null;
	}
}

function registerIpc(): void {
	ipcMain.handle("state:get", () => ({
		settings: publicSettings(),
		page: page ? { title: page.title, chars: page.text.length } : null,
	}));
}

// One overlay per machine — a second copy would fight over the shortcuts.
if (!app.requestSingleInstanceLock()) {
	app.quit();
} else {
	app.on("second-instance", () => overlay.show());

	app.whenReady().then(async () => {
		// No dock tile: the overlay is meant to be unobtrusive during an interview.
		if (process.platform === "darwin") app.dock?.hide();
		ensureExtensionToken();
		overlay.create();
		registerIpc();
		registerShortcuts();
		await domServer.start();
		pushSettings();
	});

	app.on("will-quit", () => {
		globalShortcut.unregisterAll();
		domServer.stop();
	});
	// The overlay is the whole app, so closing it means quitting.
	app.on("window-all-closed", () => app.quit());
}
