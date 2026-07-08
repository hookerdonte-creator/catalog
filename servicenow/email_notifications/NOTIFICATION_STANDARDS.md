# NVIDIA ServiceNow Notification Standards

Governance and UI/template standard for the Notification List project,
derived from UAT and Grace review comments. This is the working brief for
anyone (human or agent) applying UI fixes to NVIDIA ServiceNow email
notifications. It supersedes the design-token values in `README.md` where
the two disagree — see **Reconciliation with README.md** at the bottom.

## Scope of work

Apply UI/template improvements from UAT and Grace review comments while
preserving notification wording unless explicitly approved for content
changes.

- **Skill reference:** nvidia-notification-skill (layouts, mail scripts,
  brand standards, variable rules)
- **Governance:** follow the 11-step ServiceNow workflow — work item ID,
  DISCOVER, update set pre-flight, WRITE LOCAL → CONFIRM → DEPLOY, verify
  after each batch

### What you ARE allowed to change (242 UI pass)

- Email layout wiring
- Font sizes, spacing, padding
- Link color and styling
- Comment section formatting (mail script references)
- CTA/button structure (VML + HTML)
- 2-column record data layout
- Heading/greeting presence and formatting (structure only)
- Subscribe/unsubscribe footer rules by template type

### What you must NOT change without explicit SME approval

- Body verbiage / tone / sentence wording
- Removing or adding informational paragraphs
- Question/Answer block removal
- "On behalf" language rewrites
- Notification retirement decisions

If a fix requires wording changes, flag it as **Tier B (SME required)** and
apply only the UI fixes in the same pass.

## Layout assignment

Wire every notification to one of these — never OOB layouts:

| Use case | Layout |
|---|---|
| Status updates, comments, informational | NVIDIA Help Standard |
| Approvals, action required, RITM delivery, loaner pickup/overdue | NVIDIA Help Action Required |
| HR Lifecycle Event templates | NVIDIA Help HR Lifecycle |

Rules:
- Layout type = Advanced
- Action Required → footer must **not** include Unsubscribe
- Standard/Status → Unsubscribe per footer standard

## Apply these fixes on every notification you touch

### Typography

- Font stack: `'NVIDIA Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif`
  on all inline-styled elements
- Title/heading: 24px (fix 22px / 20px drift)
- Body text: 16px (fix 14px / 13px drift)
- Footer: 12px, color `#666666`
- Keep font size consistent across body, links, closing text, and survey
  blocks
- Section labels: same size as body, bold only — not all-caps, not green
- Body text should not be bolded unless it's a link. Section titles (e.g.
  "Instructions for access reinstatement:") are bold **black**, not green.
- If some links in a notification are bold and others aren't, bold **all**
  of them — no mixed treatment within one notification.
- Short description / heading text is **sentence case**, not Title Case.

### Spacing

- Major sections: 24px vertical blocks
- Data/table rows: 8px spacing
- Table row padding: 8px (not 6px)
- Standard padding: `24px 32px` | Action Required: `16px 24px`
- Remove thin divider lines after "Comments" / "Additional Comments"
- Fix excessive gap between "Action Required" eyebrow and approval text

### Links & brand color

- Primary green: `#76b900` | darker green: `#5a8c00`
- All record/content links: green, bold, underlined — never default blue
- RITM/INC numbers: use `${mail_script:nvidia_uri_ref_styled}` — not
  `${URI}` / `${URI_REF}`
- HR onboarding links: add underlines
- No mixed blue/green links in the same notification
- Do not color non-link text green

### Record data layout

- Replace bordered tables with borderless 2-column layout
- Label column: `17.2137%`, muted gray, not bold
- Value column: `82.7863%`, dark text `#333333`
- Remove empty label rows when field is blank (e.g. "Sensitive Loaner:")
- Do not bold metadata like "Request opened on"
- **Exception:** `DuplicateOnboardingRITMs` keeps the bordered table per
  project standard

### Comment sections

- IT comments: `${mail_script:it_single_comment_clean}`
- HR comments: `${mail_script:nvidia_hr_case_comments}`
- Script must: strip `<hr>`, remove `<strong>` on date/time/user, remove
  "(Additional comments)", convert `\n` to `<br />`
- Do not bold date/time/user under "Comment:"
- Show "Comments" label only when comment content exists
- Hide the entire comment block when empty (no orphan label)
- Fix work-notes blocks styled as yellow "Additional Comments"

### Headings & greetings

- Every body needs a short description title/heading
- Title: sentence case, no trailing period
- Fix incorrect capitalization ("information", "Incident") in title/opening
  line
- Greeting: `Hi,` for multi-recipient; `Hi ${recipient.first_name},` only
  when single-recipient is guaranteed
- Add greeting where flagged "No greetings Hi.."

### CTA & buttons

- Border-radius 6px, VML `arcsize="8%"`, `mso-hide:all` on the HTML anchor
- Accept = filled `#76b900` | Reject = outlined white/green border
- Convert yes/no text links → Accept/Reject buttons on user-acceptance
  notifications
- Use `${mailto_url:mailto.approval}` / `${mailto_url:mailto.rejection}` in
  `href` — never `${mailto:...}`, `${URI}`, or `${URI_REF}` in `href`
- Fix reject button missing rounded corners
- Action Required must show the action badge — not render as Status-style

### Email anatomy

- `message_html` = inner body only — the layout handles the outer shell
- No body sign-offs beyond CTA/footer (remove extra sign-off lines)
- Inline critical CSS (Gmail strips `<style>` blocks)

## Variable rules (critical)

| Use in `href` | Do NOT use in `href` |
|---|---|
| `${mailto_url:mailto.approval}` | `${URI}` |
| `${mailto_url:mailto.rejection}` | `${URI_REF}` |
| | `${mailto:...}` |

Preserve existing `${mail_script:...}` references unless replacing with a
named script from the inventory.

## Update set & scope

Process in batches by scope — never mix in one update set:

1. Global — ITSM, Incident
2. HAM Pro (`sn_hamp`) — loaner/asset notifications
3. HR Lifecycle Events — LE templates (layout wrapper only; do not modify
   OOB LE templates)

Before each batch:
- Confirm named in-progress update set (not Default)
- Confirm application scope matches target notifications
- Re-verify after any scope switch

## UAT lint — must pass before marking green

- [ ] Heading 24px present
- [ ] Body 16px, consistent throughout
- [ ] Block spacing 24px / row spacing 8px
- [ ] No blue hyperlinks (green `#76b900` bold underlined)
- [ ] Borderless 2-column record data (except noted exceptions)
- [ ] Greeting present where required
- [ ] Comments clean (no hr/strong/"Additional comments" artifacts)
- [ ] Action template shows action badge; no Unsubscribe on Action
      notifications
- [ ] Buttons have VML fallback + 6px radius + correct `mailto_url`
- [ ] NVIDIA Sans declared
- [ ] No empty label rows

## Reconciliation with README.md

`README.md` documents the design system as built from the original NVIDIA
Notification Experience Design Style Guide PDF. This standards doc reflects
later UAT/Grace review feedback and takes precedence where the two
disagree. Known differences, not yet reconciled across already-committed
notification files:

| Item | README.md (PDF-derived) | This doc (UAT/Grace) |
|---|---|---|
| Font stack | `'NVIDIA Sans', Arial, Helvetica, sans-serif` | `'NVIDIA Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif` |
| Footer color | `#4B4B4B` (text-secondary) | `#666666` |
| Table value column color | `#000000` (text-primary) | `#333333` |
| Table label/value column width | auto width + `white-space:nowrap` | fixed `17.2137%` / `82.7863%` |
| Secondary/hover green | `#3F8500` (dark-green) | `#5a8c00` |
| CTA border-radius / VML arcsize | `4px` / `9%` | `6px` / `8%` |
| CTA button href variables | preserved as given in source | must be `${mailto_url:mailto.approval}` / `${mailto_url:mailto.rejection}` |
| RITM/INC link variable | preserved as given in source | must be `${mail_script:nvidia_uri_ref_styled}` |
| Body/section-area padding | `24px` uniformly | `24px 32px` (Standard) / `16px 24px` (Action Required) |

Every notification fixed so far under `templates/notifications/` used the
README.md values. They have not yet been re-passed against this standards
doc.
