// DomServer.ts — the loopback endpoint the Chrome extension delivers page text to.
//
// Security posture, in order of what actually stops an attacker:
//   1. Bound to 127.0.0.1, so nothing off-box can reach it.
//   2. Every real request carries a token. This is the gate that matters: a web
//      page CAN fire a POST at localhost (CORS blocks reading the reply, not
//      sending the request), so the token — not CORS — is what keeps it out.
//   3. Origin must look like a Chrome extension. A web page cannot forge that.
//   4. Pairing is open until the first claim (zero-click setup). After that it
//      requires a deliberate keystroke, lives 60s, and burns on use.
//   5. Body cap and a request-rate cap.

import http from "node:http";
import { getSettings, updateSettings } from "./settings";

export interface DomPayload {
	title: string;
	url: string;
	text: string;
}

/** Where we start probing. The extension scans this range to find us. */
const BASE_PORT = 4123;
const PORT_TRIES = 12;
/** Raw body ceiling before we hang up. The text itself is capped separately. */
const MAX_BODY_BYTES = 512_000;
export const MAX_TEXT_CHARS = 25_000;
const PAIR_WINDOW_MS = 60_000;
const RATE_LIMIT = 120;
const RATE_WINDOW_MS = 60_000;

const EXTENSION_ORIGIN = /^chrome-extension:\/\/[a-p]{32}$/;

export class DomServer {
	private server: http.Server | null = null;
	private port = 0;
	private armedUntil = 0;
	private hits: number[] = [];

	constructor(
		private readonly onDom: (payload: DomPayload) => void,
		private readonly onPaired: () => void = () => {},
	) {}

	/** Binds the first free port in the range. Returns it, or 0 if none. */
	async start(): Promise<number> {
		for (let offset = 0; offset < PORT_TRIES; offset++) {
			const candidate = BASE_PORT + offset;
			const ok = await this.listen(candidate);
			if (ok) {
				this.port = candidate;
				console.log(`[dom] listening on 127.0.0.1:${candidate}`);
				return candidate;
			}
		}
		console.error("[dom] no free port in range — extension cannot connect");
		return 0;
	}

	private listen(port: number): Promise<boolean> {
		return new Promise((resolve) => {
			const server = http.createServer((req, res) => this.route(req, res));
			server.once("error", () => resolve(false));
			server.listen(port, "127.0.0.1", () => {
				this.server = server;
				resolve(true);
			});
		});
	}

	/** Opens a single-use 60s window in which the extension may claim the token. */
	armPairing(): void {
		this.armedUntil = Date.now() + PAIR_WINDOW_MS;
		console.log("[dom] pairing armed for 60s");
	}

	get isArmed(): boolean {
		return Date.now() < this.armedUntil;
	}

	/**
	 * First-run setup stays open until something claims the token. After that,
	 * only an explicit arm window accepts /pair (recovery / re-pair).
	 */
	get canPair(): boolean {
		return this.isArmed || !getSettings().extensionPaired;
	}

	get listeningPort(): number {
		return this.port;
	}

	stop(): void {
		this.server?.close();
		this.server = null;
	}

	private rateLimited(): boolean {
		const now = Date.now();
		this.hits = this.hits.filter((at) => now - at < RATE_WINDOW_MS);
		this.hits.push(now);
		return this.hits.length > RATE_LIMIT;
	}

	private route(req: http.IncomingMessage, res: http.ServerResponse): void {
		const origin = req.headers.origin;
		const fromExtension =
			typeof origin === "string" && EXTENSION_ORIGIN.test(origin);

		if (fromExtension) {
			res.setHeader("Access-Control-Allow-Origin", origin);
			res.setHeader("Access-Control-Allow-Headers", "content-type");
			res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
		}
		if (req.method === "OPTIONS") {
			end(res, 204, "");
			return;
		}

		const url = new URL(req.url ?? "/", "http://127.0.0.1");

		// Liveness probe. Deliberately unauthenticated and secret-free — it exists
		// only so the extension can find which port we landed on.
		if (url.pathname === "/healthz") {
			json(res, 200, { ok: true });
			return;
		}

		if (this.rateLimited()) {
			json(res, 429, { error: "rate_limited" });
			return;
		}

		if (url.pathname === "/pair" && req.method === "POST") {
			if (!fromExtension) {
				json(res, 403, { error: "bad_origin" });
				return;
			}
			if (!this.canPair) {
				json(res, 410, { error: "not_armed" });
				return;
			}
			const firstClaim = !getSettings().extensionPaired;
			this.armedUntil = 0; // arm window is single-use; first-run soft-open closes too
			updateSettings({ extensionPaired: true });
			console.log(
				`[dom] extension paired${firstClaim ? " (first claim)" : ""}`,
			);
			// Respond first so a slow UI handler cannot stall pairing.
			json(res, 200, { token: getSettings().extensionToken, port: this.port });
			this.onPaired();
			return;
		}

		if (url.pathname === "/dom" && req.method === "POST") {
			if (!fromExtension) {
				console.warn(`[dom] rejected /dom: bad origin (${origin ?? "none"})`);
				json(res, 403, { error: "bad_origin" });
				return;
			}
			if (url.searchParams.get("t") !== getSettings().extensionToken) {
				console.warn(
					"[dom] rejected /dom: token mismatch — re-pair the extension",
				);
				json(res, 401, { error: "bad_token" });
				return;
			}
			// An already-paired extension delivering successfully closes first-run soft-open
			// without requiring another /pair round-trip (upgrade path from pre-auto-pair).
			if (!getSettings().extensionPaired) {
				updateSettings({ extensionPaired: true });
			}
			this.readBody(req, res);
			return;
		}

		console.warn(`[dom] 404 ${req.method} ${url.pathname}`);
		json(res, 404, { error: "not_found" });
	}

	private readBody(req: http.IncomingMessage, res: http.ServerResponse): void {
		let size = 0;
		const chunks: Buffer[] = [];
		req.on("data", (chunk: Buffer) => {
			size += chunk.length;
			if (size > MAX_BODY_BYTES) {
				json(res, 413, { error: "too_large" });
				req.destroy();
				return;
			}
			chunks.push(chunk);
		});
		req.on("end", () => {
			if (res.writableEnded) return;
			try {
				const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
				const text = String(body.text ?? "").slice(0, MAX_TEXT_CHARS);
				if (!text.trim()) {
					console.warn("[dom] rejected /dom: page had no readable text");
					json(res, 400, { error: "empty_text" });
					return;
				}
				console.log(
					`[dom] received ${text.length} chars from ${String(body.url ?? "?")}`,
				);
				this.onDom({
					title: String(body.title ?? "").slice(0, 300),
					url: String(body.url ?? "").slice(0, 500),
					text,
				});
				json(res, 200, { ok: true });
			} catch {
				json(res, 400, { error: "bad_json" });
			}
		});
	}
}

function json(res: http.ServerResponse, status: number, body: unknown): void {
	end(res, status, JSON.stringify(body), "application/json");
}

function end(
	res: http.ServerResponse,
	status: number,
	body: string,
	type?: string,
): void {
	if (type) res.setHeader("Content-Type", type);
	res.writeHead(status);
	res.end(body);
}

/** Creates the persistent pairing token on first run. */
export function ensureExtensionToken(): string {
	const existing = getSettings().extensionToken;
	if (existing) return existing;
	const token = require("node:crypto").randomBytes(24).toString("base64url");
	updateSettings({ extensionToken: token });
	return token;
}
