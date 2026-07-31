// preload.ts — the only bridge between the overlay UI and the main process.
//
// The panel is inert to the mouse, so this surface is read-only: the renderer
// listens for state and never drives anything. All input arrives as global
// shortcuts in the main process.

import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";

type Unsubscribe = () => void;

function on(channel: string, handler: (payload: any) => void): Unsubscribe {
	const listener = (_event: IpcRendererEvent, payload: any) => handler(payload);
	ipcRenderer.on(channel, listener);
	return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld("api", {
	platform: process.platform,

	getState: () => ipcRenderer.invoke("state:get"),

	onSettings: (cb: (settings: unknown) => void) => on("settings-changed", cb),
	onPageCaptured: (cb: (page: { title: string; chars: number }) => void) =>
		on("page-captured", cb),
	onPairingArmed: (cb: (port: number) => void) => on("pairing-armed", cb),
	onAnalysisStart: (cb: () => void) => on("analysis-start", cb),
	onAnalysisResult: (cb: (script: unknown) => void) =>
		on("analysis-result", cb),
	onAnalysisError: (cb: (message: string) => void) => on("analysis-error", cb),
	onReset: (cb: () => void) => on("reset", cb),
	onToast: (cb: (message: string) => void) => on("toast", cb),
	onScroll: (cb: (direction: number) => void) => on("scroll", cb),
	onToggleHelp: (cb: () => void) => on("toggle-help", cb),
});
