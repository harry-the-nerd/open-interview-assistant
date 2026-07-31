# Promo drafts — Open Interview Assistant

Links:

- GitHub: <https://github.com/harry-the-nerd/open-interview-assistant>
- Landing: <https://harry-the-nerd.github.io/open-interview-assistant/>

---

## X / Twitter

Interview Coder / UltraCode want **$799**.

We open-sourced the alternative for **free** (bring your own API key).

Why this matters:
• They need mic + screen recording → OS privacy light turns on → interviewers get suspicious
• We never touch mic or screen capture
• Chrome extension reads the HTML DOM from CodeSignal / HackerRank
• Talks to an invisible local overlay that serves the answer
• Fully open source — fork it, tweak shortcuts/prompts/UI

GitHub: <https://github.com/harry-the-nerd/open-interview-assistant>

---

## LinkedIn

Paid “interview coder” tools are charging around **$799** — and many of them require **microphone + screen-recording permission**.

That lights up the OS privacy indicator (the orange/green dot). In a live interview, that can look exactly like what it is: something is recording.

I open-sourced an alternative:

**Open Interview Assistant** — free, local, bring your own API key.

How it’s different:

1. **No mic. No screen recording.** Ever.
2. A small **Chrome extension reads the HTML DOM** directly from CodeSignal, HackerRank, LeetCode, etc.
3. That extension talks to a **local invisible overlay** that serves a structured answer you can walk through out loud.
4. **Open source (Apache 2.0)** — fork it, rebind shortcuts, change the prompt, restyle the panel, run it your way.

If you’d rather not pay enterprise prices for a closed black box that trips privacy indicators, this is for you.

GitHub: <https://github.com/harry-the-nerd/open-interview-assistant>  
Landing: <https://harry-the-nerd.github.io/open-interview-assistant/>

---

## Reddit

**Title options:**

1. I open-sourced a free alternative to $799 Interview Coder / UltraCode tools (no mic, no screen recording)
2. Free open-source interview overlay — reads CodeSignal/HackerRank DOM instead of screen capture
3. Stop paying $799 for tools that light up the privacy indicator mid-interview

**Body:**

A bunch of “AI interview coder” products (Interview Coder, UltraCode, etc.) are charging around **$799**.

Worse: a lot of them rely on **mic + screen-recording permission**. On macOS that means the orange/green privacy light can turn on during the call — which is a great way to make your interviewer suspicious.

So I open-sourced something different:

### Open Interview Assistant
<https://github.com/harry-the-nerd/open-interview-assistant>

**What it does**

- Invisible local overlay (hidden from screenshare)
- Chrome extension reads the **HTML DOM text** from the page (CodeSignal, HackerRank, LeetCode, etc.)
- Extension talks to the overlay over localhost and serves a structured answer
- You bring your own Anthropic API key — no $799 subscription

**What it does NOT do**

- No microphone permission
- No screen-recording permission
- No privacy indicator lighting up mid-call
- No locked binary — Apache 2.0, fork and tweak it

**Why DOM > screenshots**
Page text is cleaner input than pixels/OCR, so answers tend to be better — and you never need system capture permissions.

If you want to customize shortcuts, prompts, layout, opacity, model behavior, etc., the whole thing is a small Electron app + plain Chrome extension.

Landing + comparison table:  
<https://harry-the-nerd.github.io/open-interview-assistant/>

Happy to take feedback / PRs.

---

## TeamBlind

**Title options:**

1. Open-sourced a free alternative to $799 Interview Coder / UltraCode
2. Why would you pay $799 for a tool that lights up the privacy dot in your interview?
3. Free OSS interview overlay — no mic, no screen record, reads CodeSignal/HR DOM

**Body:**

Hot take for anyone eyeing Interview Coder / UltraCode:

They’re charging ~**$799**, and a lot of these tools need **mic + screen recording**. That turns on the OS privacy indicator. Your interviewer can see that light. Not ideal.

I open-sourced a free alternative:

**Open Interview Assistant**  
<https://github.com/harry-the-nerd/open-interview-assistant>

How it works differently:

- **No mic, no screen capture** — privacy light stays off
- Chrome extension reads the **HTML DOM** from CodeSignal / HackerRank / LeetCode
- Extension talks to a local **invisible overlay** that gives you the answer walkthrough
- **BYOK** (your own API key) — free app, you only pay model usage
- **Open source** — fork it and make it work the way you want

Comparison table is on the landing page and README:  
<https://harry-the-nerd.github.io/open-interview-assistant/>

Not selling anything. Just tired of closed $799 tools that are worse on privacy.
