# Demand & Project Scoping

A scoped application that lets a demand be scoped from a Service Portal
page: answer a configurable set of criteria, get a t-shirt size, a
high-level phased timeline, and an auto-generated resource plan - all
written back onto the demand.

## What it does

1. From a demand record, click **Scope This Demand** to open a Service
   Portal page for that demand.
2. The page shows a questionnaire built entirely from configuration data
   (Scoping Criteria + their options) - no criteria, weights, or point
   values are hardcoded in script.
3. On submit, the answers are scored server-side and mapped to a t-shirt
   size band (also configuration data: T-Shirt Size Threshold).
4. That size resolves to:
   - an estimated duration and a high-level phase timeline (Project Phase
     Template), rendered as a Gantt chart on the same page, and
   - a resource plan (Resource Plan Template) - roles, allocation % and
     FTE count per phase, dated against the generated timeline. If
     ServiceNow's PPM Resource Management plugin is active, matching
     `resource_plan` records are created too.
5. The demand's `u_t_shirt_size`, `u_project_scope`, `u_scoped` and
   `u_scoped_on` fields are updated automatically.
6. Revisiting the page for an already-scoped demand shows the summary and
   Gantt directly; a **Rescope** button reopens the questionnaire
   (pre-filled with the previous answers) and resubmitting replaces the
   previous timeline/resource plan rather than duplicating it.

## Files

| File | ServiceNow artifact type | Notes |
|---|---|---|
| `tables/schema.md` | Table + field definitions | All 9 new tables, the 4 new fields on `dm_demand`, and recommended roles/ACLs |
| `script_includes/ScopeCriteriaEngine.js` | Script Include | Loads active criteria, scores answers, resolves t-shirt size |
| `script_includes/ScopeTimelineEngine.js` | Script Include | Builds dated phase lines (the Gantt data) from the phase template |
| `script_includes/ScopeResourcePlanner.js` | Script Include | Builds resource plan lines from the role template; optional PPM `resource_plan` integration |
| `script_includes/DemandScopeOrchestrator.js` | Script Include | Top-level API (`submitScope`, `getScopeSummary`, `getExistingResponses`) used by the widget |
| `business_rules/clear_demand_scope_on_archive.js` | Business Rule on `x_scope_project_scope`, before update | Keeps the demand in sync if a scope is archived outside the widget flow |
| `ui_actions/scope_this_demand.js` | UI Action on `dm_demand`, client, form button | Opens the portal page for the current demand |
| `sp_widgets/demand_scope_workspace/` | Service Portal Widget | `widget.html`, `widget.css`, `widget.client.js`, `widget.server.js`, `widget.json` (option schema) |
| `sp_pages/demand-scoping.md` | Service Portal Page (Portal Designer) | Page/layout config - not scriptable, documented as setup steps |
| `fix_scripts/seed_default_scope_config.js` | Fix Script | Seeds example criteria, thresholds, phase templates and resource templates so the app is usable out of the box |

## Architecture

```
dm_demand ──(UI Action: Scope This Demand)──> /sp?id=demand_scoping&sysparm_demand=<sys_id>
                                                           │
                                          sp_widget: demand_scope_workspace
                                                           │
                                          Script Include: DemandScopeOrchestrator
                                        ┌──────────────────┼──────────────────┐
                          ScopeCriteriaEngine   ScopeTimelineEngine   ScopeResourcePlanner
                          (score + size)         (Gantt phase lines)   (resource plan lines)
                                        └──────────────────┬──────────────────┘
                                                    writes back to
                                    x_scope_project_scope + dm_demand.u_t_shirt_size / u_project_scope
```

All business logic lives in the four Script Includes, not the widget - the
widget server script is a thin controller so the same scoring/timeline/
resource-plan logic can be reused from a UI Action, background script, or
Flow Designer action later without duplicating it.

## Setup steps

1. Create the scoped application (System Applications > Studio > Create
   Application), e.g. "Demand & Project Scoping". Note the scope prefix
   ServiceNow assigns and substitute it for `x_scope_` throughout if it
   differs (table names, field names, and every script's table constants
   must match exactly).
2. Create the 9 tables and their fields per `tables/schema.md`.
3. Add the 4 new fields to `dm_demand` per `tables/schema.md`.
4. Create the four Script Includes (System Definition > Script Includes),
   **client callable = false** for all of them, pasting in each file from
   `script_includes/`. Order doesn't matter for creation, but
   `DemandScopeOrchestrator` references the other three by class name.
5. Create the Business Rule from `business_rules/clear_demand_scope_on_archive.js`
   on table `x_scope_project_scope` with the When/Insert/Update/Filter
   settings in its header comment.
6. Create the UI Action from `ui_actions/scope_this_demand.js` on table
   `dm_demand` with the settings in its header comment.
7. Create two roles, `x_scope.scope_admin` and `x_scope.demand_scoper`,
   and lock down the new tables per the "Roles and ACLs" section of
   `tables/schema.md`.
8. Create the Service Portal widget `demand_scope_workspace` (Service
   Portal > Widgets), pasting in the four script/markup files from
   `sp_widgets/demand_scope_workspace/` and setting the option schema from
   `widget.json`.
9. Create the Service Portal page per `sp_pages/demand-scoping.md`.
10. Run `fix_scripts/seed_default_scope_config.js` (System Definition >
    Fix Scripts, or Scripts - Background in a sub-prod instance) to
    populate example criteria/thresholds/templates.
11. Test: open a demand, click **Scope This Demand**, answer the
    questionnaire, submit, and confirm the demand's t-shirt size field,
    the Gantt view, and the resource plan table all populate. Reopen the
    page and confirm it loads straight into summary mode.

## Configuration model

Everything that makes sizing "configurable" lives in four tables, edited
by admins with no script changes required:

- **Scoping Criteria** (`x_scope_criteria_definition` +
  `x_scope_criteria_option`) - the questions asked and how many points
  each answer is worth.
- **T-Shirt Size Threshold** (`x_scope_size_threshold`) - the score bands
  that map to XS-XL, and each size's default duration.
- **Project Phase Template** (`x_scope_phase_template`) - the phases and
  their share of the total duration, per size (sizes can have entirely
  different phase sets).
- **Resource Plan Template** (`x_scope_resource_role_template`) - the
  roles, allocation % and FTE count needed per phase, per size.

## Assumptions to verify before go-live

- **PPM Resource Management integration**: `ScopeResourcePlanner` guards
  every field write to the native `resource_plan` table with
  `isValidField()` and a try/catch, because the exact field set on that
  table varies by ServiceNow version/plugin configuration. Confirm the
  `table` / `document_id` / `group` / `start_date` / `end_date` /
  `percentage` field names against the target instance; without PPM
  Resource Management active, the app still works fully using its own
  `x_scope_resource_plan_line` table.
- **Portal path**: `ui_actions/scope_this_demand.js` opens `/sp?id=...`.
  Update the path if this instance uses a different portal (e.g. Employee
  Center) or a custom portal suffix.
- **`dm_demand` field names**: `u_t_shirt_size` / `u_project_scope` /
  `u_scoped` / `u_scoped_on` are suggested names; rename consistently in
  `tables/schema.md` and `DemandScopeOrchestrator._syncDemand` if this
  instance's naming convention differs.
