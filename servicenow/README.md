# Business Role Training Validation

Validates a Multi Row Variable Set (MRVS) "Business Role" selection against
required-training and completed-training data, before letting the catalog
item be submitted.

## What it does

1. Each row of the MRVS lets the requester pick a **Business Role**.
2. For every role picked, the required trainings are looked up in
   `u_sap_role_to_curriculum` (`u_business_role` = the selected role) and
   displayed grouped by role in a read-only variable on the main form,
   outside the MRVS.
3. Completed trainings are looked up in `u_nvlearn_sap_trainning_data`
   (`state` = `Complete`) for the **Requested For** user. If Requested For
   is blank, the logged in user is validated instead.
4. If any required training hasn't been completed, the catalog item cannot
   be submitted - an inline error lists the missing trainings and the
   Submit action is blocked.

## Files

| File | ServiceNow artifact type | Notes |
|---|---|---|
| `script_includes/RoleTrainingValidatorAjax.js` | Script Include (Client callable = true) | Server-side lookups against both tables |
| `catalog_client_scripts/onload_business_role_training.js` | Catalog Client Script, type `onLoad` | Initializes state when the form loads (e.g. reopening a draft) |
| `catalog_client_scripts/onchange_business_roles_mrvs.js` | Catalog Client Script, type `onChange`, variable = MRVS variable | Recomputes on every row add/edit/remove |
| `catalog_client_scripts/onchange_requested_for.js` | Catalog Client Script, type `onChange`, variable = `requested_for` | Re-validates when Requested For changes |
| `catalog_client_scripts/onsubmit_block_incomplete_trainings.js` | Catalog Client Script, type `onSubmit` | Blocks submit if trainings are incomplete |

The three `onload`/`onchange_*` scripts each carry their own copy of the same
small helper functions (`parseBusinessRoles`, `formatRequiredTrainingsByRole`,
`runBusinessRoleTrainingValidation`) instead of sharing them through a UI
Script. Catalog client scripts can run with "Isolate script" on, and
Service Portal/Employee Center don't reliably guarantee a separate global
UI Script loads before the catalog form does — depending on one caused a
`ReferenceError` in testing. Keeping each script self-contained avoids that
entirely. If you change the matching logic, update all three copies.

## Required catalog variables

Create these on the catalog item/record producer (names match the scripts;
rename consistently in both places if your instance uses different names):

- `business_roles` - Multi Row Variable Set. Row variable: `business_role`
  (the Business Role selection already described in the requirements).
- `requested_for` - Reference to `sys_user`. Existing "Requested For"
  variable; if you already have one under a different name, update the
  three client scripts that reference `requested_for`.
- `required_trainings` - Multi Line Text, **read-only**. Displays required
  trainings grouped by role, outside the MRVS.
- `trainings_complete` - Single Line Text, **hidden**. Internal flag
  (`true` / `false` / `pending`) the onSubmit script checks. Default value
  `true` so an item with no roles selected yet isn't blocked.

## Schema assumptions to verify before go-live

The requirements didn't specify the field that identifies a specific
training/curriculum on either table, so both scripts assume a shared
`u_curriculum` field. Check the real schema and update the constants at the
top of `RoleTrainingValidatorAjax.js` if different:

- `CURRICULUM_TRAINING_FIELD` (on `u_sap_role_to_curriculum`)
- `COMPLETION_TRAINING_FIELD` (on `u_nvlearn_sap_trainning_data`)
- `COMPLETION_USER_FIELD` - assumed `u_user`, a reference to `sys_user`.
  Update if the table instead stores a plain user id/employee number.
- `COMPLETION_STATE_FIELD` / `COMPLETION_STATE_VALUE` - assumed field
  `state` with stored value `Complete`. If `State` is a choice field,
  confirm the underlying choice value matches (not just the display label).

Training names are matched between the two tables case-insensitively after
trimming whitespace, to reduce brittleness from minor formatting
differences.

## Setup steps

1. Create the Script Include `RoleTrainingValidatorAjax` (System Definition
   > Script Includes), client callable = true, paste in
   `script_includes/RoleTrainingValidatorAjax.js`.
2. Add the catalog variables listed above to the catalog item/record
   producer.
3. Create the four Catalog Client Scripts listed in the table above against
   that catalog item, matching type/variable/UI Type shown in each file's
   header comment.
4. Test: add a row with a business role that has required trainings, confirm
   `required_trainings` populates grouped by role, confirm Submit is blocked
   with an inline error until `u_nvlearn_sap_trainning_data` has matching
   `Complete` rows for the Requested For (or logged in) user.
