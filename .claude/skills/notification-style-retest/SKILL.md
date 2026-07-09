---
name: notification-style-retest
description: Use when asked to retest, audit, or QA ServiceNow email notifications for style-guide compliance and hyperlink validity — e.g. "run a notification style retest", "audit these notifications", "compare prod vs dev notification rendering", "check notification hyperlinks". Renders each notification's CURRENT prod ("before") and dev ("after") versions via ServiceNow's Preview Notification simulator, scores them against the NVIDIA Notification Experience Design Style Guide, and produces an Excel PASS/FAIL findings sheet plus an HTML before/after screenshot gallery. Do NOT use for writing or editing notification templates themselves — only for testing/auditing existing ones.
---

# Notification style + hyperlink retest

Audits a list of ServiceNow email notifications by rendering their current PROD and DEV versions side by side, checking both against a visual style guide and against hyperlink correctness, and producing shareable deliverables.

## 0. Inputs required before starting

Confirm you have, or ask the user for, all of:

1. **The notification list** — names (or sys_ids) of the `sysevent_email_action` records to test. If not supplied in the invocation, ask for it before proceeding.
2. **The style guide** — a copy of the "NVIDIA Notification Experience Design Style Guide" PDF (or equivalent). If it isn't available, fall back to the baseline ruleset in `references/style-guide-baseline.md` in this skill and tell the user you're using the fallback.
3. **Environment / auth map** — which ServiceNow instances host which notification types, e.g.:
   - PROD `nvidia.service-now.com` (sn-auth profile `prod`)
   - DEV `nvidiadev.service-now.com` (profile `devlink`) — ITSM/RITM/HAM/incident/approval
   - DEV2 `nvidiadev2.service-now.com` (profile `dev`) — HR (`sn_hr_*`)

   Adjust instance/profile names to whatever the user's environment actually uses; don't assume these if the user's project config differs.
4. **A live authenticated browser session per instance.** Corporate SSO usually blocks headless login, so sessions are normally minted by connecting Playwright over CDP (`--remote-debugging-port=9222`) to a real Chrome the human has already logged into each instance with. **These sessions typically expire in ~15 minutes** — plan to re-mint mid-run and resume.
5. Check the project for existing reusable render/build scripts (e.g. an `sn-e2e/` directory with something like `df_render.mjs` / `prod_render.mjs` / `retest_render.mjs` / `retest_build*.py`) before writing new ones. Reuse what exists; only build fresh scripts per the mechanism in §3 if nothing suitable exists.

## 1. Resolve the list

For each requested notification, find its `sysevent_email_action` record in **both** the prod-side and dev-side instances (name may need normalizing — collapse whitespace, en-dashes, trailing punctuation; truncated names may need a distinctive substring match). Record per notification: sys_id (prod), sys_id (dev), `collection` (table), `template`, whether `message_html` is populated.

Report back: total count, which instance(s) each falls under, and any notifications that couldn't be resolved in one or both environments (flag these rather than silently skipping).

## 2. ETA + parallelization plan — report before running anything

Reason about this explicitly and tell the user before starting the long run:

- **Effective parallelism is one stream per ServiceNow instance**, not per notification. The Preview Notification simulator is a server-side session tied to one logged-in user, so concurrent previews *on the same instance* collide — running two agents against the same instance does not speed anything up and will corrupt results. Splitting PROD ‖ DEV (‖ DEV2 for HR) as separate concurrent background streams is what actually parallelizes.
- Estimate ~20–30s per render (navigate → open Preview → data-fill → screenshot → extract), **serial within a stream**.
- Wall-clock ETA ≈ `(notifications assigned to slowest stream × ~25s) / 1` + re-mint overhead (~1-2 min every ~15 min of stream runtime, since sessions expire).
- Compute and state: total notification count, count per instance/stream, ETA per stream, overall wall-clock ETA (bounded by the slowest stream), and how many re-mints to expect.
- Ask the user to confirm each required CDP Chrome is logged into the relevant instance(s) before proceeding. **Do not start rendering until confirmed.**

## 3. Render mechanism (per notification, per instance)

1. Navigate to `<origin>/now/nav/ui/classic/params/target/sysevent_email_action.do%3Fsys_id%3D<sysid>`, wait for `iframe#gsft_main`.
2. Click the Preview button: `button[onclick*='showSimulator']`. Retry a few times — it needs the form fully loaded. If it's absent, click a scope-switch `a:has-text('here')` first, then retry. This opens the `#notification_preview` modal.
3. Data-fill: type a sample record number for that table into `#sys_display.record_picker`, ArrowDown + Enter to select. Keep a small lookup of one known-good sample record per table per instance (e.g. RITM for `sc_req_item`, INC for `incident`, LAO/LAOTSK/ZTRTASK for `sn_hamp_*`, CHG for `change_request`, SCTASK for `sc_task`, HRC/HRT for HR tables). Some records (e.g. many approvals) can't be data-filled — render with `filled=false` and note it rather than blocking.
4. Read `iframe#simulated_html_iframe` → screenshot its **body element**, not the full page (avoids capturing a transient "Connection Restored" toast — dismiss any such modal first if present). Save the rendered HTML alongside the screenshot.
5. Extract from the rendered HTML: full text content, every `<a href>`, the badge label if present, and footer content (Manage Preferences / Unsubscribe presence).
6. **Serial within one instance.** If running multiple instances concurrently, that's one script/process per instance, each processing its notification queue serially. Never issue concurrent Preview calls against the same instance.

## 4. Style + hyperlink checks

Evaluate the rendered **body only** — not the shared email layout wrapper (header/footer chrome, its `#f5f5f5`/`#f4f5f7` background, outer margins). The body is normally the notification's `message_html`; if that's empty, pull the body from the `sysevent_email_template` named in the `template` field instead.

Checklist (see `references/style-guide-baseline.md` for the full rule table if no PDF was supplied):

- Heading present, 24px, bold, `#000000`
- Body / field-label text 16px regular `#000000`
- Links / emphasis 16px bold, brand-green `#76B900`
- Footer 12px regular `#4B4B4B`
- Width 600px; block spacing 24px; data-row spacing 8px
- Data rendered in a borderless 2-column table (label left / value right) — comments blocks are the documented exception
- Badge (⚠ ACTION REQUIRED / ALERT) present **only** on Action-Required/Alert notifications; Status-update notifications must have **no badge**
- Footer variant correct: Status notifications get "Manage Preferences + Unsubscribe"; Action/Alert notifications get a footer **without** unsubscribe
- No body sign-off (anatomy ends at CTA/footer)
- Font family matches brand typeface (e.g. NVIDIA Sans) where inline styles make this checkable

**Known false positives to avoid:**
- If a body is mail-script-driven (styling lives inside `${mail_script:X}` output, so there's no inline `font-size`/heading markup to inspect), mark its typography checks **N/A — visual review (screenshot)** rather than FAIL.
- Badge/footer are **factual** columns (report what's rendered), not automatic fails — only flag a genuine inconsistency, e.g. a badge appearing together with an Unsubscribe link.
- "Brand-green present somewhere" is not evidence of a badge — badge = the literal ACTION REQUIRED/ALERT text label.

**Hyperlink validation — tier every link found:**
- **Broken** (real failure): empty `href`, an unresolved `${...}` token, or malformed URL.
- **Breaks-in-email** (real failure): a relative URL (e.g. `incident.do?...`, `esc?id=...`). Email clients strip the page's `<base>` tag, so relative links silently fail to resolve for recipients — links must be absolute (`https://instance/...`). The Preview simulator runs the real mail scripts, so what it renders is what recipients actually get.
- **Unverified** (not a failure): approval Accept/Reject buttons that are empty only because the preview record isn't data-filled.
- **Style** (minor, not a hard failure): a content link that isn't brand-green.

Only "Broken" and "Breaks-in-email" count toward the hyperlink-failure count / overall FAIL verdict.

## 5. Deliverables

Write both under `analysis-notifications/` (create the directory if it doesn't exist):

### `analysis-notifications/retest-style-findings.xlsx`
One row per notification with columns:
`Notification | Table | Type | Verdict | Greeting | Heading present | Heading 24px | Body 16px | NVIDIA Sans | Colors on-palette | Borderless 2-col | Spacing 24/8px | No sign-off | Hyperlinks OK | Badge (rendered) | Footer (rendered) | #Links | #Bad | Hyperlink issues | All gaps / comments`
- Each style rule column is PASS / FAIL / N/A.
- `Verdict` rolls up to FAIL if any hard-failing rule (style rule FAIL, or a Broken/Breaks-in-email hyperlink) fails; otherwise PASS.
- `All gaps / comments` is free text summarizing every deviation found, including N/A reasons.

### `analysis-notifications/retest-gallery.html`
- One card per notification: prod-before screenshot | dev-after screenshot, side by side.
- FLAG/PASS coloring per card matching the Excel verdict.
- A hyperlink-issue callout per card when Broken/Breaks-in-email links exist.
- Click-to-enlarge on screenshots.
- Also emit a self-contained portable copy (e.g. `retest-gallery.portable.html`) with images embedded as base64 — the relative-image-path version breaks once the file leaves its folder, so always ship both.

## 6. Execution order

1. Read the style guide (PDF or fallback).
2. Resolve the notification list against every relevant instance (§1).
3. Compute and report the ETA + parallelization plan (§2). **Stop and wait for the user to confirm sessions are live before rendering.**
4. Launch one background stream per instance, each processing its queue serially (§3), re-minting CDP sessions on expiry and resuming mid-queue.
5. Run checks (§4) as renders complete.
6. Build both deliverables (§5).
7. Report back: total pass/fail counts, notable gaps, and links to both output files.
