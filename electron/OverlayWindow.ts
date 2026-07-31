// OverlayWindow.ts — the single always-on-top translucent panel.
//
// Frameless, transparent and excluded from screen capture, so it floats over the
// interview window without appearing in a screen share. The window itself is
// fully transparent; the visible translucency is the panel the renderer paints.

import { BrowserWindow, screen } from "electron";
import path from "node:path";

const isDev = process.env.NODE_ENV === "development";
const isMac = process.platform === "darwin";

/**
 * Content-sized for the code block in src/App.tsx: 80 monospace columns at
 * 13px, plus the line-number gutter and the padding/border/scrollbar chrome
 * around it. The panel docks flush to one side; the editor keeps the rest.
 */
const CODE_FONT_PX = 13;
const CODE_COLS = 80;
const GUTTER_COLS = 3;
/** Typical Menlo / SF Mono / Consolas advance width as a fraction of font-size. */
const MONO_ADVANCE = 0.6;
const GUTTER_GAP_PX = 12; // Tailwind mr-3 beside the gutter
const SECTION_PAD_X = 32; // px-4 on each side
const CODE_PAD_X = 24; // px-3 on each side
const BORDERS_PX = 4; // panel + code card
const SCROLLBAR_PX = 6;

const PANEL_WIDTH = Math.round(
	SECTION_PAD_X +
		CODE_PAD_X +
		BORDERS_PX +
		SCROLLBAR_PX +
		GUTTER_GAP_PX +
		(CODE_COLS + GUTTER_COLS) * CODE_FONT_PX * MONO_ADVANCE,
);

/** Pixels moved per window-nudge shortcut press. */
const STEP = 40;

type Side = "left" | "right";

function panelBounds(
	side: Side,
	displayBounds?: Electron.Rectangle,
): Electron.Rectangle {
	const { workArea } = displayBounds
		? screen.getDisplayMatching(displayBounds)
		: screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
	// Prefer the 80-col content width; shrink only if the display is too narrow.
	const width = Math.min(PANEL_WIDTH, workArea.width);
	return {
		x: side === "left" ? workArea.x : workArea.x + workArea.width - width,
		y: workArea.y,
		width,
		height: workArea.height,
	};
}

export class OverlayWindow {
	private window: BrowserWindow | null = null;
	private visible = false;
	private side: Side = "left";

	create(): BrowserWindow {
		this.window = new BrowserWindow({
			...panelBounds(this.side),
			frame: false,
			transparent: true,
			backgroundColor: "#00000000",
			hasShadow: false,
			resizable: false,
			movable: true,
			skipTaskbar: true,
			alwaysOnTop: true,
			show: false,
			// An NSPanel can take keystrokes without activating the app, so the
			// interview window keeps focus in the dock and in a screen share.
			...(isMac ? { type: "panel" as const } : {}),
			webPreferences: {
				preload: path.join(__dirname, "preload.js"),
				contextIsolation: true,
				nodeIntegration: false,
			},
		});

		// Keep the panel out of screen recordings and shares.
		this.window.setContentProtection(true);

		// The panel is inert to the mouse for its whole life: the pointer passes
		// straight through to the editor underneath, so hovering and clicking hit
		// the app below and the panel can never steal focus from it. Every control
		// is a global shortcut instead — see SHORTCUTS in main.ts.
		//
		// `forward: true` still delivers move events to the renderer, which is what
		// keeps CSS :hover and scroll position working for our own painting.
		this.window.setIgnoreMouseEvents(true, { forward: true });

		if (isMac) {
			this.window.setVisibleOnAllWorkspaces(true, {
				visibleOnFullScreen: true,
			});
			this.window.setHiddenInMissionControl(true);
			this.window.setAlwaysOnTop(true, "floating");
		} else {
			// 'screen-saver' is the level that still wins against fullscreen windows.
			this.window.setAlwaysOnTop(true, "screen-saver");
		}

		const url = isDev
			? "http://localhost:5180"
			: `file://${path.join(__dirname, "../../dist/index.html")}`;
		this.window.loadURL(url).catch((error) => {
			console.error("[OverlayWindow] failed to load renderer:", error);
		});

		this.window.once("ready-to-show", () => this.show());
		this.window.on("closed", () => {
			this.window = null;
			this.visible = false;
		});

		return this.window;
	}

	get browserWindow(): BrowserWindow | null {
		return this.window && !this.window.isDestroyed() ? this.window : null;
	}

	send(channel: string, payload?: unknown): void {
		this.browserWindow?.webContents.send(channel, payload);
	}

	show(): void {
		const win = this.browserWindow;
		if (!win) return;
		// showInactive keeps focus with whatever the candidate is actually using.
		win.showInactive();
		if (process.platform === "win32") win.setAlwaysOnTop(true, "screen-saver");
		this.visible = true;
	}

	hide(): void {
		this.browserWindow?.hide();
		this.visible = false;
	}

	toggleVisibility(): void {
		if (this.visible) this.hide();
		else this.show();
	}

	/** Snap to one side of the screen the cursor is on. */
	dock(side: Side): void {
		const win = this.browserWindow;
		if (!win) return;
		this.side = side;
		win.setBounds(panelBounds(side, win.getBounds()));
	}

	/** Flip to the other side — one key to get the panel out of the editor's way. */
	toggleSide(): Side {
		this.dock(this.side === "left" ? "right" : "left");
		return this.side;
	}

	move(dx: number, dy: number): void {
		const win = this.browserWindow;
		if (!win) return;
		const [x, y] = win.getPosition();
		win.setPosition(x + dx * STEP, y + dy * STEP);
	}
}
