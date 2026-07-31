import { useEffect, useRef, useState } from "react";
import type { InterviewScript, PageStatus, PublicSettings } from "./types";

const MOD = window.api.platform === "darwin" ? "⌘" : "Ctrl";

const SHORTCUT_HINTS: [string, string][] = [
	["⌘⇧U", "In Chrome: send this page and answer"],
	[`${MOD} ↵`, "Answer again from what was captured"],
	[`${MOD} ↑↓`, "Scroll the answer"],
	[`${MOD} B`, "Hide or show this panel"],
	[`${MOD} ⇧ ← →`, "Dock left or right"],
	[`${MOD} ⇧ E`, "Cycle thinking effort"],
	[`${MOD} ⇧ O`, "Cycle opacity"],
	[`${MOD} ⇧ P`, "Re-arm pairing (recovery only)"],
	[`${MOD} ⇧ K`, "Show or hide this help"],
	[`${MOD} R`, "Clear everything"],
];

const CODE_SIZE = 13;

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="border-t border-white/10 px-4 py-3">
			<h2 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
				{title}
			</h2>
			{children}
		</section>
	);
}

function Spoken({ text }: { text: string }) {
	return (
		<p className="whitespace-pre-wrap text-[13px] leading-relaxed text-white/90">
			{text}
		</p>
	);
}

/**
 * The code the candidate retypes. Long lines wrap under their own number rather
 * than running off the edge — there is no mouse here to scroll sideways with.
 */
function Code({ text }: { text: string }) {
	const lines = text.replace(/\n$/, "").split("\n");
	const gutter = `${String(lines.length).length}ch`;
	return (
		<div
			className="rounded-lg border border-white/10 bg-black/55 px-3 py-2.5 font-mono text-emerald-100"
			style={{ fontSize: CODE_SIZE, lineHeight: 1.65 }}
		>
			{lines.map((line, index) => (
				<div key={index} className="flex">
					<span
						className="mr-3 shrink-0 select-none text-right text-white/25"
						style={{ width: gutter }}
					>
						{index + 1}
					</span>
					<span className="min-w-0 flex-1 whitespace-pre-wrap break-words">
						{line || " "}
					</span>
				</div>
			))}
		</div>
	);
}

export default function App() {
	const [settings, setSettings] = useState<PublicSettings | null>(null);
	const [pageStatus, setPageStatus] = useState<PageStatus | null>(null);
	const [script, setScript] = useState<InterviewScript | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [toast, setToast] = useState<string | null>(null);
	const [pairingPort, setPairingPort] = useState<number | null>(null);
	const [showHelp, setShowHelp] = useState(false);

	const bodyRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		window.api.getState().then((state) => {
			setSettings(state.settings);
			setPageStatus(state.page);
		});

		const offs = [
			window.api.onSettings(setSettings),
			window.api.onPageCaptured((next) => {
				setPageStatus(next);
			}),
			window.api.onPairingArmed((port) => {
				setPairingPort(port);
				setTimeout(() => setPairingPort(null), 60_000);
			}),
			window.api.onAnalysisStart(() => {
				setBusy(true);
				setError(null);
				setScript(null);
				bodyRef.current?.scrollTo({ top: 0 });
			}),
			window.api.onAnalysisResult((next) => {
				setScript(next);
				setBusy(false);
			}),
			window.api.onAnalysisError((message) => {
				setError(message);
				setBusy(false);
			}),
			window.api.onReset(() => {
				setScript(null);
				setError(null);
				setBusy(false);
				setPageStatus(null);
			}),
			window.api.onToast(setToast),
			window.api.onToggleHelp(() => setShowHelp((open) => !open)),
			window.api.onScroll((direction) => {
				bodyRef.current?.scrollBy({ top: direction * 220, behavior: "smooth" });
			}),
		];
		return () => offs.forEach((off) => off());
	}, []);

	useEffect(() => {
		if (!toast) return;
		const timer = setTimeout(() => setToast(null), 2600);
		return () => clearTimeout(timer);
	}, [toast]);

	const alpha = settings?.opacity ?? 0.72;
	const idle = !script && !busy && !error;

	return (
		<div className="flex h-screen font-sans">
			<div
				className="flex h-full w-full flex-col overflow-hidden border-x border-white/15 text-white shadow-2xl backdrop-blur-xl"
				style={{ backgroundColor: `rgba(14, 15, 19, ${alpha})` }}
			>
				<header className="flex shrink-0 items-center gap-2 px-3 py-2">
					<span className="text-[13px] font-semibold tracking-tight">
						Interview
					</span>
					{busy && (
						<span className="animate-pulse text-[11px] text-sky-300">
							thinking…
						</span>
					)}
					{!busy && pageStatus && (
						<span className="truncate text-[11px] text-white/45">
							{pageStatus.title || "page"} · {pageStatus.chars.toLocaleString()}{" "}
							chars
						</span>
					)}
					<span className="ml-auto shrink-0 text-[10px] uppercase tracking-wider text-white/30">
						{settings?.effort ?? ""}
					</span>
				</header>

				<div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto">
					{pairingPort !== null && (
						<section className="border-l-2 border-sky-400/70 bg-sky-400/[0.07] px-4 py-3">
							<h2 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200/80">
								Re-pairing open for 60 seconds
							</h2>
							<p className="text-[13px] leading-relaxed text-white/85">
								The extension will reconnect on its own, or open its popup and
								choose <b>Re-pair</b>. Listening on port {pairingPort}.
							</p>
						</section>
					)}

					{error && (
						<Section title="Error">
							<p className="text-[13px] leading-relaxed text-red-300">
								{error}
							</p>
						</Section>
					)}

					{(idle || showHelp) && (
						<Section title="How this works">
							<p className="mb-2 text-[13px] leading-relaxed text-white/75">
								Load the Chrome extension once, then open the question and press{" "}
								<b>⌘⇧U</b>. It pairs with this app automatically, reads the
								page, and the answer appears here. This panel ignores the mouse
								entirely — hovering and clicking go straight to the window
								underneath, so it can never take focus from your editor.
							</p>
							<ul className="space-y-1">
								{SHORTCUT_HINTS.map(([keys, what]) => (
									<li
										key={keys}
										className="flex gap-3 text-[12px] text-white/60"
									>
										<kbd className="w-20 shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-center text-[11px] text-white/80">
											{keys}
										</kbd>
										<span>{what}</span>
									</li>
								))}
							</ul>
							{settings && !settings.hasKey && (
								<p className="mt-2 text-[12px] text-amber-200">
									No API key found. Put ANTHROPIC_API_KEY in .env and restart.
								</p>
							)}
						</Section>
					)}

					{busy && !script && (
						<Section title="Working">
							<div className="space-y-2">
								{[3, 4, 2].map((width, index) => (
									<div
										key={index}
										className="h-3 animate-pulse rounded bg-white/10"
										style={{ width: `${width * 22}%` }}
									/>
								))}
							</div>
						</Section>
					)}

					{script && (
						<>
							{/*
							  Order matches a real interview arc so the candidate can scroll
							  down as they speak: orient → restate → clarify → approach →
							  code → walkthrough. Summary stays pinned at the top as the
							  mid-interview glance sheet.
							*/}
							<section className="border-l-2 border-sky-400/70 bg-sky-400/[0.07] px-4 py-3">
								<h2 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200/80">
									Summary
								</h2>
								<p className="whitespace-pre-wrap text-[14px] font-medium leading-relaxed text-white">
									{script.summary}
								</p>
								<p className="mt-2 text-[12px] text-white/60">
									Time {script.time_complexity} · Space{" "}
									{script.space_complexity}
								</p>
							</section>

							<Section title="Restate the problem">
								<Spoken text={script.problem} />
							</Section>
							<Section title="Ask first">
								<Spoken text={script.clarify} />
							</Section>
							<Section title="Talk through the approach">
								<Spoken text={script.approach} />
							</Section>
							<Section title="Solution">
								<Code text={script.code} />
							</Section>
							<Section title="Walk through an example">
								<Spoken text={script.walkthrough} />
							</Section>
						</>
					)}
				</div>

				{toast && (
					<div className="shrink-0 border-t border-white/10 px-4 py-2 text-[12px] text-amber-200">
						{toast}
					</div>
				)}
			</div>
		</div>
	);
}
