# NVIDIA Help — Email Notification Templates

HTML foundation for ServiceNow email notifications, built from the
**NVIDIA Notification Experience Design Style Guide** (brand-green /
NVIDIA Sans design system, 600px email width). All markup is table-based
with fully inlined styles so it survives Outlook/Gmail CSS stripping.

## Files

```
email_notifications/
├── README.md
└── templates/
    ├── starter_template.html          ← copy this to build a new notification
    ├── partials/
    │   ├── header.html                ← reusable ServiceNow Email Template
    │   ├── footer_with_ctas.html       ← Status Update notifications
    │   └── footer_no_ctas.html         ← Action Required / Alert notifications
    └── examples/
        ├── action_required_example.html
        ├── alert_example.html
        └── status_update_example.html
```

## Design tokens

### Colors

| Token | Hex | Use case |
|---|---|---|
| `brand-green` | `#76B900` | CTAs, hyperlinks, header rule, logo accent |
| `dark-green` | `#3F8500` | Tertiary CTA (hover/pressed state) |
| `text-primary` | `#000000` | Headings, body copy, subject line |
| `text-secondary` | `#4B4B4B` | Footer text, muted secondary copy, table labels |
| `text-disabled` | `#7B7B7B` | Alert badge label, icon strokes |
| `surface-white` | `#FFFFFF` | Email body background, header fill, secondary button fill |
| `surface-secondary` | `#F5F5F5` | Header/footer section background |
| `border-default` | `#DADDE2` | Header divider, section borders, outer card border |
| `border-subtle` | `#E0E0E0` | Footer border stroke |

### Typography

Primary font: **NVIDIA Sans** (fallback stack: `Arial, Helvetica, sans-serif` —
NVIDIA Sans is not web-safe, so every template declares the fallback for
mail clients that can't load a custom font).

| Style | Size | Weight | Used for |
|---|---|---|---|
| Email Heading | 24px | Bold | Subject line / email title |
| Alert Badge | 14px | Bold, uppercase | "ACTION REQUIRED" / "ALERT" label |
| Body / Interface | 16px | Regular | Body copy, field labels |
| Link / Emphasis | 16px | Bold | Hyperlinks, key reference text (e.g. RITM number) |
| Footer | 12px | Regular | Footer text, legal copy |

### Spacing

- **24px** vertical rhythm between major blocks (heading → greeting →
  content → table → CTAs).
- **8px** between rows inside the 2-column tabular content / comment
  blocks.
- Card width is fixed at **600px**, centered, on a neutral canvas.

## Anatomy (per the style guide)

1. **Header** — NVIDIA logo + "NVIDIA Help" wordmark on `surface-secondary`,
   with a 4px `brand-green` rule underneath.
2. **Notification type label** (optional) — "⚠ ACTION REQUIRED" or
   "⚠ ALERT" badge. **Only** for Action Required / Alert notifications —
   Status Update notifications get no icon or label.
3. **Email heading** — 24px bold.
4. **Address client** — "Hello {name}," greeting.
5. **Email content** — body paragraph(s).
6. **2-column tabular content** — label (left) / value (right), used for
   any content pulled from a ServiceNow record (requests, incidents,
   etc.), except comments which render as a labeled block instead.
7. **CTAs**:
   - **Primary** (filled green) + **Secondary** (green outline) — for
     actions that resolve by email reply and don't leave the inbox
     (Accept/Reject, Confirm Receipt/Report an Issue).
   - **Tertiary** (green bold hyperlink) — for any action that sends the
     user back into the ServiceNow platform (e.g. "Take the survey").
8. **Footer**:
   - **With CTAs** ("Manage Preferences" / "Unsubscribe" pills) — used
     **only** on Status Update notifications, since those are the ones a
     user may reasonably want to opt out of.
   - **Without CTAs** (text only) — used on Action Required / Alert
     notifications, which should not offer an unsubscribe path.

## Using these in ServiceNow

Two ways to consume these templates in **Notification > Email > Templates**
and **Notification > Email > Notifications**:

1. **Shared partials (recommended):** create two Email Template records —
   one from `partials/header.html`, one each from
   `partials/footer_with_ctas.html` / `partials/footer_no_ctas.html` — then
   in each notification's HTML body, embed them with:
   ```
   ${template:nvidia_help_header}
   ... notification-specific content ...
   ${template:nvidia_help_footer_with_ctas}
   ```
   This keeps every notification visually in sync — update the shared
   template once and every notification that embeds it picks up the
   change.

2. **Fully inline:** copy `templates/starter_template.html` as-is into the
   notification's HTML body and fill in the marked placeholders. Use this
   if your instance's mail renderer doesn't reliably resolve
   `${template:...}` includes.

Replace `{{...}}` placeholders with ServiceNow record variables
(`${current.number}`, `${current.short_description}`, etc.) and swap the
`{{LOGO_URL}}` placeholder for your instance's hosted NVIDIA logo asset
URL (e.g. a `db_image` record or CDN link — inline `data:` URIs are
unreliable in Outlook).

## Adding a new notification

1. Copy `templates/starter_template.html` to a new file (or start a new
   ServiceNow notification record body).
2. Delete the badge block if this is a Status Update (no label/icon).
3. Fill in heading, greeting, content, and the 2-column table rows (delete
   the table entirely if the notification has no record data to show).
4. Pick the CTA row that matches the action: primary+secondary pair for
   reply-by-email actions, or a single tertiary link for platform
   round-trips. Delete the CTA row entirely if there's no action.
5. Use `footer_with_ctas` for Status Update, `footer_no_ctas` for
   everything else.
6. Keep the 24px/8px spacing and the color/type tokens above — that
   consistency is the point of using this foundation.
