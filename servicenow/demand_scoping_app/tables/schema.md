# Table Schema

Scoped application suggested name/scope: **Demand & Project Scoping** /
`x_scope_planning` (adjust the `x_scope_` prefix to whatever scope id your
instance assigns - it is used consistently below and in every script for
readability, not because it's a reserved value).

All tables below are new tables owned by this app, created under
**System Definition > Tables**. Reference fields use "Reference" type
pointing at the table named. Choice fields list their choice values as
`value = label`.

## Configuration tables (admin-maintained)

### x_scope_criteria_definition - "Scoping Criteria"
One row per question asked in the scoping wizard. This is what makes
t-shirt sizing "configurable" - add, retire, or reweight criteria here
without touching any script.

| Field | Type | Notes |
|---|---|---|
| `name` | String (100) | Question text / label |
| `description` | String (255) | Longer explanation shown under the label |
| `category` | Choice | `complexity`, `integration`, `data`, `user_impact`, `technical_risk`, `other` |
| `question_type` | Choice | `single_choice`, `boolean`, `scale`, `numeric` |
| `weight` | Decimal | Multiplier applied to the raw points this question contributes |
| `max_points` | Integer | Cap for `scale`/`numeric`; points awarded when `boolean` is checked |
| `active` | Boolean | Inactive criteria are hidden from the wizard and scoring |
| `order` | Integer | Display/scoring order |
| `help_text` | String (255) | Optional inline tooltip |

### x_scope_criteria_option - "Scoping Criteria Option"
Child rows for `question_type = single_choice`.

| Field | Type | Notes |
|---|---|---|
| `criteria` | Reference -> `x_scope_criteria_definition` | Parent question |
| `label` | String (100) | Option shown as a button in the wizard |
| `points` | Integer | Raw points if selected |
| `order` | Integer | Display order |

### x_scope_size_threshold - "T-Shirt Size Threshold"
Defines the size bands a total score maps to, and the default duration
for each size. The highest-`order` row should leave `max_score` blank to
catch any score above the configured ranges.

| Field | Type | Notes |
|---|---|---|
| `size` | Choice | `xs`, `s`, `m`, `l`, `xl` |
| `min_score` | Decimal | Inclusive lower bound |
| `max_score` | Decimal | Inclusive upper bound; blank = open-ended |
| `default_duration_weeks` | Integer | Baseline estimated project duration for this size |
| `color` | String (20) | Hex color used for the badge and Gantt bars |
| `order` | Integer | Evaluated ascending; also used as fallback (largest band) if a score exceeds every configured `max_score` |

### x_scope_phase_template - "Project Phase Template"
The high-level phases that make up the Gantt timeline for a given size.
Different sizes can have different phases entirely (e.g. XS skips a
dedicated Design phase).

| Field | Type | Notes |
|---|---|---|
| `size` | Reference -> `x_scope_size_threshold` | Which size this phase set applies to |
| `phase_name` | String (60) | e.g. Initiate, Plan, Design, Build, Test, Deploy |
| `sequence` | Integer | Order phases run in |
| `duration_percent` | Decimal | % of the total estimated duration this phase consumes (should sum to 100 across all phases for a given size) |
| `color` | String (20) | Hex color for the Gantt bar |

### x_scope_resource_role_template - "Resource Plan Template"
The roles/allocation needed per phase for a given size. This is what
drives automatic resource plan assignment.

| Field | Type | Notes |
|---|---|---|
| `size` | Reference -> `x_scope_size_threshold` | Which size this applies to |
| `phase_name` | String (60) | Must match a `phase_name` in `x_scope_phase_template` for the same size |
| `role` | String (80) | e.g. Project Manager, Business Analyst, Developer, QA Engineer, Solution Architect |
| `resource_group` | Reference -> `sys_user_group` | Optional; if set and PPM Resource Management (`resource_plan` table) is active, a real resource plan record is also created against this group |
| `allocation_percent` | Integer | % allocation during that phase |
| `fte_count` | Decimal | Number of resources of that role needed |
| `notes` | String (255) | Optional |

## Transactional tables

### x_scope_project_scope - "Project Scope"
One record per scoping pass on a demand (a demand can be rescoped; the
most recently scoped record is authoritative).

| Field | Type | Notes |
|---|---|---|
| `demand` | Reference -> `dm_demand` | The demand being scoped |
| `project` | Reference -> `pm_project` | Optional, once a project is created from the demand |
| `state` | Choice | `draft`, `scoped`, `archived` |
| `total_score` | Decimal | Computed weighted score |
| `t_shirt_size` | Reference -> `x_scope_size_threshold` | Resolved size |
| `estimated_duration_weeks` | Integer | From the resolved size's default, at scoping time |
| `estimated_start_date` | Date | Target start entered in the wizard |
| `estimated_end_date` | Date | Computed from the generated phase timeline |
| `scoped_by` | Reference -> `sys_user` | Who last submitted the scope |
| `scoped_on` | Date/Time | When it was last submitted |
| `notes` | String (4000) | Optional free text |

### x_scope_criteria_response - "Scoping Criteria Response"
One row per answered question, per scope.

| Field | Type | Notes |
|---|---|---|
| `project_scope` | Reference -> `x_scope_project_scope` | Parent scope |
| `criteria` | Reference -> `x_scope_criteria_definition` | Question answered |
| `selected_option` | Reference -> `x_scope_criteria_option` | For `single_choice` |
| `numeric_value` | Decimal | For `boolean`/`scale`/`numeric` |
| `points_awarded` | Decimal | Weighted points this answer contributed |

### x_scope_phase_line - "Scope Phase Line"
Materialized Gantt rows generated from the phase template at scoping time
(kept as its own table, rather than re-deriving on every read, so a scope's
timeline stays stable even if the template is edited later).

| Field | Type | Notes |
|---|---|---|
| `project_scope` | Reference -> `x_scope_project_scope` | Parent scope |
| `phase_name` | String (60) | |
| `sequence` | Integer | |
| `start_date` | Date | |
| `end_date` | Date | |
| `color` | String (20) | |

### x_scope_resource_plan_line - "Scope Resource Plan Line"
Materialized resource assignments generated from the resource template at
scoping time.

| Field | Type | Notes |
|---|---|---|
| `project_scope` | Reference -> `x_scope_project_scope` | Parent scope |
| `role` | String (80) | |
| `resource_group` | Reference -> `sys_user_group` | |
| `phase_name` | String (60) | |
| `allocation_percent` | Integer | |
| `fte_count` | Decimal | |
| `start_date` | Date | Aligned to the matching phase line |
| `end_date` | Date | Aligned to the matching phase line |
| `resource_plan_ref` | String (32) | `sys_id` of the real `resource_plan` record created for this line, if PPM Resource Management is active |

## New fields on `dm_demand`

Add these to the existing Demand table (System Definition > Tables >
`dm_demand`, or via a table extension in the scoped app):

| Field | Type | Notes |
|---|---|---|
| `u_t_shirt_size` | Reference -> `x_scope_size_threshold` | Kept in sync with the demand's latest scope |
| `u_project_scope` | Reference -> `x_scope_project_scope` | Latest scope record for this demand |
| `u_scoped` | Boolean | True once at least one scope has been submitted |
| `u_scoped_on` | Date/Time | Last time the demand was scoped |

## Roles and ACLs

Create two roles and lock the tables down accordingly (not scripted here -
ACLs are instance-specific; this is the recommended shape):

- `x_scope.scope_admin` - read/write on all six configuration and
  transactional tables above. Assign to whoever owns the scoping
  methodology.
- `x_scope.demand_scoper` - create/read on `x_scope_project_scope`,
  `x_scope_criteria_response`, `x_scope_phase_line`,
  `x_scope_resource_plan_line`; read-only on the configuration tables.
  Assign to demand managers/PMs who run the wizard. Also grant write on
  `dm_demand.u_t_shirt_size` / `u_project_scope` / `u_scoped` /
  `u_scoped_on` (or leave those to the Script Include, which runs in the
  interactive user's session and therefore still needs ACL access to
  write them).
