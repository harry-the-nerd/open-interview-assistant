const status = document.getElementById("status");
const hint = document.getElementById("hint");
const shortcutButton = document.getElementById("shortcut");

function show(ok, message) {
	status.className = ok ? "ok" : "bad";
	status.textContent = message;
}

function ask(type) {
	return new Promise((resolve) =>
		chrome.runtime.sendMessage({ type }, resolve),
	);
}

function setHint(nodes) {
	hint.replaceChildren(...nodes);
}

/**
 * Chrome assigns a suggested_key only at install time and silently leaves the
 * shortcut blank if anything else already claims the combo — so an unbound
 * command looks identical to a broken extension. Say which it is.
 */
async function reportShortcut() {
	const commands = await chrome.commands.getAll();
	const send = commands.find((c) => c.name === "send-page");
	if (send && send.shortcut) {
		const kbd = document.createElement("kbd");
		kbd.textContent = send.shortcut;
		setHint([
			document.createTextNode("Press "),
			kbd,
			document.createTextNode(" to send this page."),
		]);
		shortcutButton.hidden = true;
	} else {
		const bold = document.createElement("b");
		bold.textContent = "No shortcut assigned.";
		setHint([
			bold,
			document.createTextNode(
				" Chrome could not claim the default — set one below.",
			),
		]);
		shortcutButton.hidden = false;
	}
}

shortcutButton.addEventListener("click", () => {
	chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});

reportShortcut();

async function refreshStatus() {
	const s = await ask("status");
	// A silent hotkey means a failed send leaves no trace on screen — this is
	// where you find out it happened.
	if (s?.lastError) {
		const ago = Math.round((Date.now() - s.lastError.at) / 1000);
		show(false, `Last send failed ${ago}s ago: ${s.lastError.error}`);
		return s;
	}
	show(
		!!s?.paired,
		s?.paired ? "Connected." : "Not connected yet — will auto-pair.",
	);
	return s;
}

// If the desktop app is already up, finish pairing the moment the popup opens.
refreshStatus().then(async (s) => {
	if (s?.paired || s?.lastError) return;
	show(true, "Connecting…");
	const r = await ask("pair");
	show(!!r?.ok, r?.ok ? "Connected." : r?.error || "Could not connect yet.");
});

document.getElementById("pair").addEventListener("click", async () => {
	show(true, "Re-pairing…");
	const r = await ask("pair");
	show(!!r?.ok, r?.ok ? "Connected." : r?.error || "Re-pair failed.");
});

document.getElementById("send").addEventListener("click", async () => {
	show(true, "Sending…");
	const r = await ask("send");
	show(
		!!r?.ok,
		r?.ok ? `Sent ${r.chars} characters.` : r?.error || "Send failed.",
	);
});
