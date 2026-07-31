# Open Interview Assistant

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Website](https://img.shields.io/badge/Website-darkinterview.com-0A0A0A)](https://darkinterview.com)
[![Landing](https://img.shields.io/badge/Landing-GitHub_Pages-0A0A0A)](https://harry-the-nerd.github.io/open-interview-assistant/)
[![GitHub stars](https://img.shields.io/github/stars/harry-the-nerd/open-interview-assistant?style=social)](https://github.com/harry-the-nerd/open-interview-assistant)

**Invisible open-source interview overlay** — reads the question on your page and gives you an answer you can say out loud. Hidden from screenshare. No mic or system recording permission. Yours to fork and tweak.

<p align="center">
  <a href="https://harry-the-nerd.github.io/open-interview-assistant/">
    <img src="docs/assets/hero.png" alt="Open Interview Assistant running on a MacBook — overlay over a coding interview problem" width="900" />
  </a>
</p>

<p align="center">
  <a href="https://harry-the-nerd.github.io/open-interview-assistant/"><strong>Landing page</strong></a>
  ·
  <a href="https://darkinterview.com"><strong>DarkInterview</strong></a>
  ·
  <a href="#setup"><strong>Setup</strong></a>
</p>

Open-source interview overlay from [DarkInterview](https://darkinterview.com) —
a translucent, always-on-top panel that reads the interview question you're
looking at and gives you an answer you can say out loud.

**Built to stay invisible in the room:**

- **Invisible on screenshare and capture** — the panel uses content protection,
  so it does not appear in Zoom, Meet, Teams, or screen recordings. Only you see it.
- **No mic or system recording permission** — it never listens and never asks to
  capture the screen or system audio, so the OS privacy indicator (orange/green
  light) does not turn on and make your interviewer suspicious.
- **Page text, not pixels** — a small Chrome extension reads the **text of the
  page**, which needs no screen-recording permission and is cleaner input than
  screenshots, so the answers are better too.
- **Mouse pass-through** — hovering and clicking fall straight through to your
  editor or browser. The panel can never steal focus. Every control is a keyboard
  shortcut.
- **It belongs to you** — small open-source codebase. Fork it, rebind shortcuts,
  restyle the panel, change the prompt, run it on your machine the way that works
  best for you.

## vs Interview Coder / UltraCode

Paid tools like **Interview Coder** and **UltraCode** often charge around
**$799**, require **mic + screen-recording permission**, and light up the OS
privacy indicator mid-call — which can make interviewers suspicious.

Open Interview Assistant is free, open source, and never asks for those
permissions. A Chrome extension reads the **HTML DOM text** from CodeSignal,
HackerRank, LeetCode, and similar pages, then talks to a local invisible
overlay that serves the answer.

| | **Open Interview Assistant** | **Interview Coder / UltraCode** |
| --- | --- | --- |
| **Price** | **Free** — bring your own API key | ~**$799** closed paid product |
| **Open source** | **Yes** — Apache 2.0, fork and tweak | No — closed binary |
| **Microphone permission** | **Never requested** | Required |
| **Screen recording permission** | **Never requested** | Required |
| **OS privacy indicator** | **Stays off** — no orange/green light | Lights up — can raise suspicion |
| **How it reads the question** | Chrome extension reads **HTML DOM text** from CodeSignal / HackerRank / LeetCode | Mic + screen capture / screenshots |
| **Answer input quality** | Clean page text | Noisy pixels / OCR-style capture |
| **Invisible overlay** | Local always-on-top panel with content protection; hidden from screenshare | Vendor-controlled closed overlay |
| **Customizable** | Change shortcuts, prompts, layout, opacity | Locked product surface |
| **Your keys / your machine** | Runs locally with your Anthropic key — no app account | Paid vendor stack |

Repo: [https://github.com/harry-the-nerd/open-interview-assistant](https://github.com/harry-the-nerd/open-interview-assistant)

## How you use it

Open the question in Chrome and press **`⌘⇧U`**. The extension reads the page,
hands it to the app, and the answer appears in the panel. Layout follows a real
interview arc so you can scroll as you speak:

1. **Summary** — pinned glance sheet (key insight + complexity)
2. **Restate the problem**
3. **Ask first** — clarifying questions
4. **Talk through the approach**
5. **Solution** — code to retype
6. **Walk through an example**

The panel docks left by default, sized for about 80 monospace columns of code,
so the editor keeps the rest of the screen.

## Setup

```bash
npm install
```

Put your key in `.env` (see `.env.example`):

```
ANTHROPIC_API_KEY=sk-ant-...
```

Then start the app:

```bash
npm run dev
```

Now load the extension, once:

1. Go to `chrome://extensions`, turn on **Developer mode**, click
   **Load unpacked**, and select this repo's `extension/` folder. It installs as
   **test-extension** — the name is deliberately generic.
2. With the app running, the extension pairs automatically (on install, on
   browser startup, or the first time you press **`⌘⇧U`**).

No popup click. No pairing shortcut. The token persists, so this is a one-time
setup. If `⌘⇧U` collides with something, rebind it at
`chrome://extensions/shortcuts`.

If pairing is ever revoked, press **`⌘⇧P`** in the overlay to open a 60-second
recovery window, then send a page again (or use **Re-pair** in the extension
popup).

## Shortcuts

The panel has no buttons, because it takes no mouse input. This list is the
complete set of controls.

| Shortcut | What it does |
| --- | --- |
| `⌘⇧U` *(in Chrome)* | **Send this page and answer** — the only key you need |
| `⌘↵` | Answer again from what was already captured |
| `⌘↑` `⌘↓` | Scroll the answer |
| `⌘B` | Hide or show the panel |
| `⌘⇧←` `⌘⇧→` | Dock left or right |
| `⌘⇧S` | Flip to the other side |
| `⌘⇧↑` `⌘⇧↓` | Nudge the panel up or down |
| `⌘⇧E` | Cycle thinking effort |
| `⌘⇧O` | Cycle opacity |
| `⌘⇧P` | Re-arm extension pairing (recovery only) |
| `⌘⇧K` | Show or hide the help |
| `⌘R` | Clear everything |

On Windows and Linux, `Ctrl` replaces `⌘`. The bindings live in one array at the
top of [`electron/main.ts`](electron/main.ts).

## Permissions & stealth

Two properties matter in a live interview:

1. **They can’t see the panel** — `setContentProtection(true)` keeps the overlay
   out of screen shares and recordings.
2. **They can’t see a recording light** — this app never requests microphone or
   system screen/audio capture, so the macOS (and similar) privacy indicator does
   not light up mid-call.

The extension route needs **no screen-recording permission** and **no microphone
permission**. It asks Chrome only for:

- `activeTab` + `scripting` — read the current tab when you press the shortcut
- `storage` — remember the pairing token
- `http://127.0.0.1/*` — talk to the local overlay app

There is no list of interview sites in the manifest, and no broad “read your
data on all websites” host access.

## How the pieces talk

The app listens on `127.0.0.1:4123` (probing upward if taken — the extension
rediscovers the port each time rather than trusting a stale one). The extension
POSTs page text to `/dom`.

That endpoint is defended in depth, because **any web page can fire a POST at
localhost** — CORS blocks reading the reply, not sending the request. So the
token is the real gate, not CORS: loopback-only binding, a token on every
request, an `Origin` check that the caller is a `chrome-extension://` ID, a body
cap, and a rate limit. Pairing stays open until the first successful claim so
setup needs no clicks; after that, re-pairing requires a deliberate keystroke
(`⌘⇧P`), lives 60 seconds, and burns on use.

## What is in here

| Path | Role |
| --- | --- |
| `electron/main.ts` | Lifecycle, global shortcuts, IPC |
| `electron/DomServer.ts` | The loopback endpoint the extension delivers to |
| `electron/OverlayWindow.ts` | The mouse-inert always-on-top panel |
| `electron/llm.ts` | One request, returns the interview script |
| `electron/settings.ts` | API key, effort, opacity, pairing token |
| `extension/` | The Chrome extension (plain JS, no build step) |
| `src/App.tsx` | The whole UI |

The panel sets `setContentProtection(true)`, so it does not appear in screen
shares or recordings — only on your local display. Settings (API key, pairing
token, effort, opacity) are saved under the Electron user-data directory; page
text and answers are not.

## Make it yours

This project is meant to be forked and changed. A few high-leverage places:

| Want to… | Start here |
| --- | --- |
| Remap shortcuts | `electron/main.ts` (one bindings array) |
| Restyle the panel / section order | `src/App.tsx` |
| Change opacity defaults or persistence | `electron/settings.ts`, `electron/OverlayWindow.ts` |
| Swap prompt, model, or answer shape | `electron/llm.ts` |
| Change what gets read from the page | `extension/` |

Apache 2.0 — use it, modify it, ship your own variant.

## The model

Claude Sonnet 5 (`claude-sonnet-5`) with adaptive thinking, so it decides how
long to reason about each question. `⌘⇧E` caps that:

| Effort | Answer time (measured) | Use it when |
| --- | --- | --- |
| Low | 10–13s | You want the answer fast and the question looks routine |
| **Medium (default)** | **14–17s** | Everything else |
| High | 14–19s | The question is genuinely unusual |
| Extra high (`xhigh`) | 13–30s | You have time and want maximum care |

Measured on a LeetCode Hard and a non-standard scheduling problem; every level
solved both correctly, so the default trades nothing away for the shorter wait.

The answer is requested as schema-validated JSON via Anthropic’s structured
output. If that validation path is unavailable, the request is retried without
the schema and parsed leniently, so a transient outage costs a few seconds
rather than the answer.

## License

Copyright 2026 [DarkInterview](https://darkinterview.com).

Licensed under the [Apache License, Version 2.0](LICENSE).
See also the [NOTICE](NOTICE) file for attribution.

```
Copyright 2026 DarkInterview (https://darkinterview.com)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0
```

## Links

- Landing page: [https://harry-the-nerd.github.io/open-interview-assistant/](https://harry-the-nerd.github.io/open-interview-assistant/)
- Website: [https://darkinterview.com](https://darkinterview.com)
- Issues and contributions welcome via the public repository
