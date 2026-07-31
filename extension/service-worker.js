// service-worker.js — the whole extension.
//
// Trigger: the user presses the Chrome command. That keystroke is a user
// gesture, which is what grants `activeTab` for the current page — so this
// extension needs no host permissions for any site, and Chrome asks for
// nothing scary at install. It also means the worker is woken by the
// keystroke itself, so none of the MV3 keep-alive machinery is needed.
//
// Pairing is automatic: on install/startup/worker wake, and again right before
// a send if storage has no token yet. The desktop keeps /pair open until the
// first claim; after that, ⌘⇧P re-arms a 60s recovery window.

const BASE_PORT = 4123;
const PORT_TRIES = 12;
const MAX_CHARS = 25000;

// ── pairing ────────────────────────────────────────────────────────────────

async function getPairing() {
	const { pairing } = await chrome.storage.local.get("pairing");
	return pairing ?? null;
}

/** The desktop port moves between launches, so never trust a stored one blindly. */
async function resolvePort(hint) {
	const candidates = [
		hint,
		...Array.from({ length: PORT_TRIES }, (_, i) => BASE_PORT + i),
	];
	for (const port of candidates) {
		if (!port) continue;
		try {
			const res = await fetch(`http://127.0.0.1:${port}/healthz`, {
				method: "GET",
			});
			if (res.ok) return port;
		} catch {
			// Nothing listening there; try the next.
		}
	}
	return null;
}

/**
 * Claims the token from the local app. First-run needs no arming; recovery
 * after a revoked token needs ⌘⇧P on the overlay.
 */
export async function pair() {
	const port = await resolvePort(null);
	if (port == null)
		return { ok: false, error: "Local endpoint is not running." };
	try {
		const res = await fetch(`http://127.0.0.1:${port}/pair`, {
			method: "POST",
		});
		if (res.status === 410) {
			return {
				ok: false,
				error:
					"Press ⌘⇧P (Ctrl+Shift+P) in the overlay to allow pairing, then retry.",
			};
		}
		if (!res.ok)
			return { ok: false, error: `Pairing refused (${res.status}).` };
		const { token } = await res.json();
		await chrome.storage.local.set({ pairing: { token, port } });
		return { ok: true };
	} catch (error) {
		return { ok: false, error: String(error) };
	}
}

/** No-op when already paired. Failures are silent — send surfaces them later. */
async function ensurePaired() {
	if (await getPairing()) return { ok: true, already: true };
	return pair();
}

// ── extraction ─────────────────────────────────────────────────────────────

/**
 * Runs inside the page. Must be self-contained — it is serialized across the
 * boundary, so it can close over nothing.
 */
function extractPage() {
	const SITE_HINTS = [
		'[data-track-load="description_content"]', // LeetCode
		".challenge-body-html", // HackerRank
		'[class*="question-description"]',
		'[class*="problem-statement"]',
		"#problem-statement",
		"main",
		"article",
	];

	const clean = (value) => (value || "").replace(/\n{3,}/g, "\n\n").trim();

	for (const selector of SITE_HINTS) {
		const node = document.querySelector(selector);
		const text = clean(node && node.innerText);
		// A real problem statement is never two words long.
		if (text.length > 200) {
			return { title: document.title, url: location.href, text };
		}
	}
	return {
		title: document.title,
		url: location.href,
		text: clean(document.body.innerText),
	};
}

// ── delivery ───────────────────────────────────────────────────────────────

async function deliver(pairing) {
	const [tab] = await chrome.tabs.query({
		active: true,
		lastFocusedWindow: true,
	});
	if (!tab || tab.id == null) return { ok: false, error: "No active tab." };
	if (/^(chrome|edge|about|devtools):/i.test(tab.url || "")) {
		return { ok: false, error: "Cannot read browser-internal pages." };
	}

	let page;
	try {
		const [result] = await chrome.scripting.executeScript({
			target: { tabId: tab.id },
			func: extractPage,
		});
		page = result && result.result;
	} catch (error) {
		return { ok: false, error: `Could not read the page: ${error.message}` };
	}
	if (!page || !page.text)
		return { ok: false, error: "Nothing readable on this page." };

	const port = await resolvePort(pairing.port);
	if (port == null)
		return { ok: false, error: "Local endpoint is not running." };
	if (port !== pairing.port) {
		await chrome.storage.local.set({ pairing: { ...pairing, port } });
	}

	try {
		const res = await fetch(
			`http://127.0.0.1:${port}/dom?t=${encodeURIComponent(pairing.token)}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: page.title,
					url: page.url,
					text: page.text.slice(0, MAX_CHARS),
				}),
			},
		);
		if (res.status === 401) return { ok: false, revoked: true };
		if (!res.ok)
			return { ok: false, error: `Endpoint refused delivery (${res.status}).` };
		return { ok: true, chars: page.text.length };
	} catch (error) {
		return { ok: false, error: String(error) };
	}
}

async function sendActiveTab() {
	// Zero-click path: claim the token on the way out if we never got one.
	let pairing = await getPairing();
	if (!pairing) {
		const claimed = await pair();
		if (!claimed.ok) return claimed;
		pairing = await getPairing();
		if (!pairing) return { ok: false, error: "Pairing did not stick." };
	}

	const result = await deliver(pairing);
	if (result.ok) return result;
	if (!result.revoked) return result;

	// Token rejected — drop it and try one automatic reclaim + retry.
	await chrome.storage.local.remove("pairing");
	const reclaimed = await pair();
	if (!reclaimed.ok) {
		return {
			ok: false,
			error: "Pairing was revoked. Press ⌘⇧P in the overlay, then try again.",
		};
	}
	const next = await getPairing();
	if (!next) return { ok: false, error: "Pairing did not stick." };

	const retry = await deliver(next);
	if (retry.revoked) {
		await chrome.storage.local.remove("pairing");
		return {
			ok: false,
			error: "Pairing was revoked. Press ⌘⇧P in the overlay, then try again.",
		};
	}
	return retry;
}

// The hotkey is deliberately silent: no badge, no icon change, nothing that
// moves on screen when you press it. Success is self-evident — the local app
// reacts within a second. Failures are recorded to session storage
// (memory only, never written to disk) and surfaced in the popup when you
// choose to look, so a failed send is diagnosable without ever being visible.
chrome.commands.onCommand.addListener(async (command) => {
	if (command !== "send-page") return;
	const result = await sendActiveTab();
	if (!result.ok) {
		await chrome.storage.session.set({
			lastError: { at: Date.now(), error: result.error },
		});
	} else {
		await chrome.storage.session.remove("lastError");
	}
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
	(async () => {
		if (msg?.type === "pair") sendResponse(await pair());
		else if (msg?.type === "send") sendResponse(await sendActiveTab());
		else if (msg?.type === "status") {
			const { lastError } = await chrome.storage.session.get("lastError");
			sendResponse({
				paired: !!(await getPairing()),
				lastError: lastError ?? null,
			});
		}
	})();
	return true; // keep the channel open for the async reply
});

// Claim as soon as we can. Worker wake, install, and browser startup all try;
// if the desktop app is not up yet, the next send will pair on the way out.
void ensurePaired();
chrome.runtime.onInstalled.addListener(() => {
	void ensurePaired();
});
chrome.runtime.onStartup.addListener(() => {
	void ensurePaired();
});
