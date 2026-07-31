export interface InterviewScript {
	summary: string;
	problem: string;
	clarify: string;
	approach: string;
	code: string;
	walkthrough: string;
	time_complexity: string;
	space_complexity: string;
}

export type Effort = "low" | "medium" | "high" | "xhigh";

export interface PublicSettings {
	effort: Effort;
	opacity: number;
	language: string;
	hasKey: boolean;
	port: number;
}

export interface PageStatus {
	title: string;
	chars: number;
}

/**
 * Read-only by design: the panel ignores the mouse, so it observes state and
 * never drives it. Everything the user can do is a global shortcut.
 */
export interface OverlayApi {
	platform: string;
	getState(): Promise<{
		settings: PublicSettings;
		page: PageStatus | null;
	}>;
	onSettings(cb: (settings: PublicSettings) => void): () => void;
	onPageCaptured(cb: (page: PageStatus) => void): () => void;
	onPairingArmed(cb: (port: number) => void): () => void;
	onAnalysisStart(cb: () => void): () => void;
	onAnalysisResult(cb: (script: InterviewScript) => void): () => void;
	onAnalysisError(cb: (message: string) => void): () => void;
	onReset(cb: () => void): () => void;
	onToast(cb: (message: string) => void): () => void;
	onScroll(cb: (direction: number) => void): () => void;
	onToggleHelp(cb: () => void): () => void;
}

declare global {
	interface Window {
		api: OverlayApi;
	}
}
