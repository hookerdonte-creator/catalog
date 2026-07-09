# NVIDIA Notification Experience — style guide baseline

Fallback ruleset for use when the "NVIDIA Notification Experience Design Style Guide" PDF isn't
available in-session. If the PDF is available, treat it as the source of truth and use this only
as a quick-reference checklist / sanity check.

## Typography

| Element              | Size | Weight  | Color                |
|-----------------------|------|---------|-----------------------|
| Heading                | 24px | Bold    | `#000000`             |
| Body / field labels    | 16px | Regular | `#000000`             |
| Links / emphasis       | 16px | Bold    | brand-green `#76B900` |
| Footer                 | 12px | Regular | `#4B4B4B`              |

Font family: NVIDIA Sans (or the project's declared brand typeface) where inline styles make this
checkable. Mail-script-driven bodies (styling only present inside `${mail_script:X}` output) are
exempt from automated typography checks — mark N/A and rely on the screenshot for visual review.

## Layout

- Overall width: 600px
- Block spacing: 24px
- Data-row spacing: 8px
- Data fields render in a **borderless 2-column table** (label left / value right)
  - Exception: comment/notes blocks may render as free text instead of a 2-column row
- No body sign-off — the notification anatomy ends at the CTA / footer

## Badge

- The "⚠ ACTION REQUIRED" / "ALERT" label
- Present **only** on Action-Required or Alert notifications
- Status-update notifications must have **no badge**
- Presence of brand-green color elsewhere is not evidence of a badge — only the literal text
  label counts

## Footer variants

- Status notifications: "Manage Preferences + Unsubscribe"
- Action-Required / Alert notifications: footer text **without** an unsubscribe link

## Hyperlink tiers (severity)

| Tier | Definition | Counts as failure? |
|---|---|---|
| Broken | Empty `href`, unresolved `${...}` token, malformed URL | Yes |
| Breaks-in-email | Relative URL (e.g. `incident.do?...`) — email clients strip `<base>`, so it silently fails for recipients; must be absolute `https://instance/...` | Yes |
| Unverified | Approval Accept/Reject buttons empty only because the preview record isn't data-filled | No |
| Style | Content link present but not brand-green | No (minor) |
